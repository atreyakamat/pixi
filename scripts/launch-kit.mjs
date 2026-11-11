// Launch kit: three App Store / Play screenshots and a 15-second promo film, made from the real app and its engine.
//
//   node scripts/launch-kit.mjs [photosDir]
//
// Pass a folder of your own photos (JPEG/PNG, portrait works best). Without one, built-in stand-in
// scenes are used — fine for checking the layout, not for the real store page.
// Needs the static export served on :3111 (see README) and ffmpeg.
// Output: docs/launch/  (store-1..3 at 1290×2796 for the App Store and 1080×1920 for Play, promo-1080x1920.mp4, promo-poster.jpg)
import { build } from "esbuild";
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const OUT = "docs/launch";
fs.mkdirSync(OUT, { recursive: true });
const photosDir = process.argv[2];
const mimeOf = (f) => (/\.png$/i.test(f) ? "image/png" : "image/jpeg");
const userPhotos = photosDir ? fs.readdirSync(photosDir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort().slice(0, 6).map((f) => `data:${mimeOf(f)};base64,${fs.readFileSync(path.join(photosDir, f)).toString("base64")}`) : [];

await build({ entryPoints: ["scripts/launch-entry.ts"], bundle: true, format: "iife", outfile: "/tmp/launch.js", alias: { "@": "./src" }, logLevel: "error", resolveExtensions: [".ts", ".tsx", ".js"] });
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", protocolTimeout: 600000, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
const s = (ms) => new Promise((r) => setTimeout(r, ms));
const errs = [];

/* 1. Photos with Pixi looks, and the stand-in scenes as files for the app to import. */
const kit = await browser.newPage();
kit.on("pageerror", (e) => errs.push("kit " + e));
await kit.setContent("<body style='margin:0;background:#000'></body>");
await kit.addScriptTag({ content: fs.readFileSync("/tmp/launch.js", "utf8") });
await kit.waitForFunction("window.kit");
const sources = userPhotos.length ? userPhotos : await kit.evaluate(() => window.kit.scenes());
const tmp = "/tmp/kit-photos"; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
const files = sources.map((u, i) => { const f = path.join(tmp, `p${i + 1}.${u.startsWith("data:image/png") ? "png" : "jpg"}`); fs.writeFileSync(f, Buffer.from(u.split(",")[1], "base64")); return f; });
console.log("photos:", files.length, userPhotos.length ? "(yours)" : "(stand-in scenes)");

/* 2. App screens at iPhone 6.9" size: 430×932 points at 3×. */
const app = await browser.newPage();
app.on("pageerror", (e) => errs.push("app " + e));
await app.setViewport({ width: 430, height: 932, deviceScaleFactor: 3 });
await app.evaluateOnNewDocument(() => { localStorage.setItem("pixi:onboarded", "1"); localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode: "manual", sound: false })); });
await app.goto("http://localhost:3111", { waitUntil: "domcontentloaded" }); await s(6000);
const click = (re) => app.evaluate((x) => { const r = new RegExp(x, "i"); const el = [...document.querySelectorAll("button")].find((b) => r.test(b.textContent.trim()) || r.test(b.getAttribute("aria-label") || "")); el?.click(); return !!el; }, re.source);

// Fill the roll from the photos.
await click(/^Roll$/); await s(800);
const rollInput = await app.$('input[type="file"][multiple]');
await rollInput.uploadFile(...files); await s(4000 + files.length * 1500);
await click(/^Camera$/); await s(1200);

// Point the viewfinder at the first photo (as if the camera were looking at it).
await click(/Show camera controls/); await s(500);
await app.evaluate(() => document.querySelector('[aria-label="Film: Edit"]')?.click()); await s(900);
const single = await app.$$('[role="dialog"] input[type="file"]:not([multiple])');
if (single[0]) { await single[0].uploadFile(files[0]); await s(2500); }
await app.keyboard.press("Escape").catch(() => {});
await app.evaluate(() => { const b = document.querySelector('[aria-label="Hide camera controls"]'); b?.click(); }); await s(800);
const dlg = await app.evaluate(() => !!document.querySelector('[role="dialog"]'));
if (dlg) { await app.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => /close|done/i.test(b.getAttribute("aria-label") || b.textContent))?.click()); await s(800); }
await s(2500);
await app.addStyleTag({ content: '[data-pixi="still-pill"]{display:none!important}' });
await app.screenshot({ path: "/tmp/kit-shoot.png" });

// The develop, caught mid-way.
await click(/^Take photo$/);
for (let i = 0; i < 80; i++) { if (await app.evaluate(() => !!document.querySelector('[data-pixi="develop"]'))) break; await s(100); }
await s(1300);
await app.screenshot({ path: "/tmp/kit-develop.png" });
await s(6000);

// Build opens on a filled carousel.
await click(/^Build$/); await s(5000);
await app.screenshot({ path: "/tmp/kit-carousel.png" });

/* 3. Compose the store screenshots. */
const shots = [
  ["/tmp/kit-shoot.png", "Shoot like it's 2003.", "Real camera and film looks, rendered live on your phone."],
  ["/tmp/kit-develop.png", "Every shot develops.", "Watch the picture come up, like an instant print."],
  ["/tmp/kit-carousel.png", "Pour it into a carousel.", "Strips, prints and 1080×1350 pages, made on-device."],
];
const compose = await browser.newPage();
for (const [size, W, H] of [["1290x2796", 1290, 2796], ["1080x1920", 1080, 1920]]) {
  await compose.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  for (let i = 0; i < shots.length; i++) {
    const [img, head, sub] = shots[i];
    const data = fs.readFileSync(img).toString("base64");
    const phoneH = Math.round(H * 0.7), phoneW = Math.round(phoneH * 430 / 932);
    await compose.setContent(`<!doctype html><html><body style="margin:0;width:${W}px;height:${H}px;background:radial-gradient(120% 70% at 50% 0%,#2a2118 0%,#0b0a09 60%);font-family:-apple-system,'SF Pro Display','Helvetica Neue',Inter,system-ui,sans-serif;color:#fff;overflow:hidden;display:flex;flex-direction:column;align-items:center">
      <div style="margin-top:${Math.round(H * 0.06)}px;text-align:center;padding:0 ${Math.round(W * 0.08)}px">
        <div style="font-size:${Math.round(W * 0.075)}px;font-weight:700;letter-spacing:-0.02em;line-height:1.08">${head}</div>
        <div style="margin-top:${Math.round(W * 0.022)}px;font-size:${Math.round(W * 0.036)}px;line-height:1.3;color:rgba(255,255,255,.62)">${sub}</div>
      </div>
      <div style="margin-top:${Math.round(H * 0.045)}px;width:${phoneW}px;height:${phoneH}px;border-radius:${Math.round(phoneW * 0.13)}px;padding:${Math.round(phoneW * 0.028)}px;background:#1b1b1d;box-shadow:0 40px 120px rgba(0,0,0,.7),inset 0 0 0 2px #333">
        <div style="width:100%;height:100%;border-radius:${Math.round(phoneW * 0.105)}px;overflow:hidden;background:#000"><img src="data:image/png;base64,${data}" style="width:100%;height:100%;object-fit:cover;object-position:top"></div>
      </div></body></html>`);
    await s(300);
    await compose.screenshot({ path: `${OUT}/store-${i + 1}-${size}.png` });
  }
}

/* 4. The 15-second promo film. Recorded in real time, so it takes 15 s plus processing. */
const dataUrl = await kit.evaluate((u) => window.kit.preview(u, 1080, 1920, 15), userPhotos);
const raw = "/tmp/kit-preview" + (dataUrl.startsWith("data:video/mp4") ? ".mp4" : ".webm");
fs.writeFileSync(raw, Buffer.from(dataUrl.split(",")[1], "base64"));
// Promo film for Product Hunt, the Play listing (via YouTube) and social. 1080×1920, 30 fps, H.264 + a silent AAC track
// so every uploader accepts it. (An App Store app preview must be a real screen recording: see docs/LAUNCH.md.)
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
ff(["-i", raw, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest", "-vf", "scale=1080:1920,fps=30,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-crf", "17", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", `${OUT}/promo-1080x1920.mp4`]);
ff(["-ss", "7.6", "-i", `${OUT}/promo-1080x1920.mp4`, "-frames:v", "1", "-q:v", "3", `${OUT}/promo-poster.jpg`]);

const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name", "-of", "compact", `${OUT}/promo-1080x1920.mp4`]).toString().trim();
console.log(probe);
console.log(fs.readdirSync(OUT).join("\n"));
console.log("errors:", JSON.stringify(errs));
await browser.close();
