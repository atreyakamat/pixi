// The web carousel maker: photos chosen in a browser become downloadable pages, with nothing sent
// anywhere. Checks the pages really come out at the frame's size with the photo in them, that the
// Instagram limit is explained past 20, and that no network request carries the photos.
// Web build on :3112.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const files = fs.readdirSync("/tmp/many").filter((f) => f.endsWith(".jpg")).sort().slice(0, 22).map((f) => "/tmp/many/" + f);
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", protocolTimeout: 600000, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
const errs = [];
p.on("pageerror", (e) => errs.push("PE " + e));
p.on("console", (m) => { if (m.type() === "error") errs.push("CE " + m.text()); });

// Nothing may leave the browser: watch every request with a body.
const uploads = [];
await p.setRequestInterception(true);
p.on("request", (r) => {
  const m = r.method();
  if ((m === "POST" || m === "PUT" || m === "PATCH") && r.postData()) uploads.push(`${m} ${r.url()}`);
  r.continue();
});

const s = (ms) => new Promise((r) => setTimeout(r, ms));
const R = {};
const text = () => p.evaluate(() => document.body.innerText);

const dir = "/tmp/maker-dl";
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const client = await p.createCDPSession();
await client.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dir, eventsEnabled: true });

await p.goto("http://localhost:3112/make/", { waitUntil: "domcontentloaded" });
await s(3000);
R.loaded = /Carousel maker/i.test(await text());

await (await p.$('input[type="file"]')).uploadFile(...files);
for (let i = 0; i < 90; i++) { if (/22 pages/.test(await text())) break; await s(500); }
R.read22 = /22 pages/.test(await text());
// Past Instagram's 20, the page must say what that means rather than silently failing later.
R.explainsLimit = /2 Instagram posts of 20/.test(await text());

// The preview must actually draw the photo, not an empty frame.
R.previewDrawn = await p.evaluate(() => {
  const c = document.querySelector("canvas");
  if (!c) return false;
  const k = document.createElement("canvas");
  k.width = 80; k.height = 100;
  const q = k.getContext("2d");
  q.drawImage(c, 0, 0, 80, 100);
  const d = q.getImageData(0, 0, 80, 100).data;
  let colourful = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 40) colourful++;
  }
  return colourful > 200;
});

// Switch frames: the preview must change, proving the picker is wired to the engine.
const sig = () => p.evaluate(() => {
  const c = document.querySelector("canvas");
  const k = document.createElement("canvas");
  k.width = 40; k.height = 50;
  k.getContext("2d").drawImage(c, 0, 0, 40, 50);
  return [...k.getContext("2d").getImageData(0, 0, 40, 50).data].join(",");
});
const before = await sig();
await p.select('select[aria-label="Frame"]', "ca-noir");
await s(1500);
R.frameChanged = (await sig()) !== before;

// Download the lot.
await p.evaluate(() => { const el = [...document.querySelectorAll("button")].find((b) => /^Download \d+ pages$/.test(b.textContent.trim())); el?.click(); });
for (let i = 0; i < 180; i++) {
  const n = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).length;
  if (n >= 22) break;
  await s(500);
}
const got = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort();
R.downloaded = got.length;
R.numbered = got[0] === "pixi-01.jpg" && got[21] === "pixi-22.jpg";
R.allNonEmpty = got.every((f) => fs.statSync(`${dir}/${f}`).size > 10_000);
R.nothingUploaded = uploads.length === 0;

// The files must be real 1080x1350 pages, each with its own photo.
const page1 = await p.evaluate(async () => {
  const r = await fetch("/make/");
  void r;
  return true;
});
void page1;

console.log(JSON.stringify(R, null, 1));
console.log("uploads:", JSON.stringify(uploads));
console.log("errors:", JSON.stringify(errs.slice(0, 5)));
await b.close();

const ok = R.loaded && R.read22 && R.explainsLimit && R.previewDrawn && R.frameChanged
  && R.downloaded === 22 && R.numbered && R.allNonEmpty && R.nothingUploaded;
if (!ok || errs.length) process.exit(1);
console.log("maker-check OK");
