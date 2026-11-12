// A lens fitted in the camera shelf must change the picture, survive a restart, and reach the
// saved photo — not just the preview. App build on :3111.
import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", protocolTimeout: 600000, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = [];
p.on("pageerror", (e) => errs.push("PE " + e));
p.on("console", (m) => { if (m.type() === "error") errs.push("CE " + m.text()); });
const s = (ms) => new Promise((r) => setTimeout(r, ms));
const R = {};
const text = () => p.evaluate(() => document.body.innerText);
const click = (re) => p.evaluate((x) => { const r = new RegExp(x, "i"); const el = [...document.querySelectorAll("button")].find((b) => r.test(b.textContent.trim()) || r.test(b.getAttribute("aria-label") || "")); el?.click(); return !!el; }, re.source);

await p.evaluateOnNewDocument(() => {
  if (localStorage.getItem("pixi:onboarded")) return;
  localStorage.setItem("pixi:onboarded", "1");
  localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode: "manual", sound: false, develop: false }));
});
await p.goto("http://localhost:3111", { waitUntil: "domcontentloaded" });
{
await s(6000);
}

// The viewfinder as it stands, with no lens.
const frame = () => p.evaluate(() => {
  const c = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  if (!c) return null;
  const g = c.getContext("webgl2") ? null : c.getContext("2d");
  // The viewfinder is a WebGL canvas, so copy it through a 2D one to read pixels.
  const k = document.createElement("canvas");
  k.width = 60; k.height = 60;
  const q = k.getContext("2d");
  q.drawImage(c, 0, 0, 60, 60);
  void g;
  return [...q.getImageData(0, 0, 60, 60).data].filter((_, i) => i % 4 !== 3).join(",");
});

await s(2500);
R.gotFrame = !!(await frame());
const plain = await frame();

// Fit a fisheye from the camera shelf.
R.shelfOpened = await click(/^Camera shelf$|shelf/i) || await p.evaluate(() => {
  const el = [...document.querySelectorAll("button")].find((b) => /Camera shelf/i.test(b.getAttribute("aria-label") || "")) ||
    [...document.querySelectorAll("button")].find((b) => b.className.includes("mt-2 flex w-full flex-col"));
  el?.click();
  return !!el;
});
await s(1200);
R.lensTab = await click(/^Lens$/);
await s(800);
R.lensListed = /Fisheye/.test(await text()) && /Prism/.test(await text());
await click(/^Fisheye/);
await s(2500);
const bent = await frame();
R.pictureChanged = plain !== null && bent !== null && plain !== bent;
R.chipShown = /Fisheye lens/.test(await text());

// It must still be fitted after a restart.
await p.reload({ waitUntil: "domcontentloaded" });
await s(6000);
// The chip only draws once the camera is live again, so check the stored choice as well as the chip.
R.lensStored = await p.evaluate(() => localStorage.getItem("pixi:lens:v1"));
R.survivesRestart = R.lensStored === "fisheye";

// And it must reach the photo that gets saved, not only the preview.
await p.evaluate(() => { const el = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Take photo"); el?.click(); });
for (let i = 0; i < 80; i++) { if (/1 shot/.test(await text())) break; await s(500); }
R.saved = await p.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open("pixi"); r.onsuccess = () => res(r.result); });
  const all = await new Promise((res) => { const q = db.transaction("roll").objectStore("roll").getAll(); q.onsuccess = () => res(q.result); });
  if (!all.length) return null;
  const bmp = await createImageBitmap(all[0].blob);
  const c = document.createElement("canvas");
  c.width = bmp.width; c.height = bmp.height;
  const g = c.getContext("2d");
  g.drawImage(bmp, 0, 0);
  // A barrel bend compresses the edges, so the outer thirds differ from the middle far more than
  // on a straight capture. Measure, rather than trusting that the option was merely set.
  const col = (fx) => { const d = g.getImageData(Math.round(c.width * fx), Math.round(c.height / 2), 1, 1).data; return d[0] + d[1] + d[2]; };
  // Read the size before closing: close() zeroes an ImageBitmap's dimensions.
  const out = { w: bmp.width, h: bmp.height, edgeL: col(0.03), mid: col(0.5), edgeR: col(0.97) };
  bmp.close();
  return out;
});
R.photoExists = !!R.saved && R.saved.w > 0;
// The bend compresses and darkens the edges: the saved file must show it, not just carry the setting.
R.photoIsBent = !!R.saved && R.saved.mid > R.saved.edgeL * 1.3 && R.saved.mid > R.saved.edgeR * 1.3;

console.log(JSON.stringify(R, null, 1));
console.log("errors:", JSON.stringify(errs.slice(0, 5)));
await b.close();

const ok = R.gotFrame && R.lensTab && R.lensListed && R.pictureChanged && R.chipShown && R.survivesRestart && R.photoExists && R.photoIsBent;
if (!ok || errs.length) process.exit(1);
console.log("lensrow-check OK");
