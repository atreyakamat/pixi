// Closing the share sheet must save nothing and say nothing.
//
// The old code treated a cancelled share as a failure and fell back to saving every page, so a
// person who changed their mind got surprise duplicates plus a "Saved" message. This stubs the
// platform share so it rejects the way Android does ("Share canceled") and asserts that no file is
// written and no toast appears — for one photo and for a multi-page carousel.
// App build on :3111.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const files = fs.readdirSync("/tmp/many").filter((f) => f.endsWith(".jpg")).sort().slice(0, 6).map((f) => "/tmp/many/" + f);
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", protocolTimeout: 600000, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = [];
p.on("pageerror", (e) => errs.push("PE " + e));
p.on("console", (m) => { if (m.type() === "error") errs.push("CE " + m.text()); });
const s = (ms) => new Promise((r) => setTimeout(r, ms));
const R = {};
const click = (re) => p.evaluate((x) => { const r = new RegExp(x, "i"); const el = [...document.querySelectorAll("button")].find((b) => r.test(b.textContent.trim()) || r.test(b.getAttribute("aria-label") || "")); el?.click(); return !!el; }, re.source);
const text = () => p.evaluate(() => document.body.innerText);

// A share sheet the person closes, and a count of every download the page starts.
await p.evaluateOnNewDocument(() => {
  window.__saves = 0;
  if (!localStorage.getItem("pixi:onboarded")) {
    localStorage.setItem("pixi:onboarded", "1");
    localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode: "manual", sound: false, format: "jpeg" }));
  }
  navigator.canShare = () => true;
  navigator.share = () => Promise.reject(new DOMException("Share canceled", "AbortError"));
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) { window.__saves++; return; } // count it, don't actually download
    return realClick.call(this);
  };
});
await p.goto("http://localhost:3111", { waitUntil: "domcontentloaded" });
await s(5000);

await click(/^Roll$/);
await s(800);
await (await p.$('input[type="file"][multiple]')).uploadFile(...files);
for (let i = 0; i < 120; i++) { if (/6 shots/.test(await text())) break; await s(500); }
R.imported = /6 shots/.test(await text());

// One photo: tap Share, close the sheet.
await p.evaluate(() => { const g = [...document.querySelectorAll("button")].find((b) => /^Open/.test(b.getAttribute("aria-label") || "") || b.querySelector("img")); g?.click(); });
await s(1200);
await click(/^Share$/);
await s(2500);
R.oneSaves = await p.evaluate(() => window.__saves);
R.oneQuiet = !/Saved|Downloaded|didn't let|couldn't/i.test(await text());

// A carousel: build pages, tap Share, close the sheet.
await click(/^Build$/);
await s(3000);
await click(/^Photos$/);
await s(600);
await click(/^Add all$/);
await s(2500);
await p.evaluate(() => { window.__saves = 0; });
const shared = await p.evaluate(() => {
  const el = [...document.querySelectorAll("button")].find((b) => /share/i.test(b.getAttribute("aria-label") || "") || /^Share/.test(b.textContent.trim()));
  el?.click();
  return !!el;
});
R.sharedCarousel = shared;
await s(6000);
R.manySaves = await p.evaluate(() => window.__saves);
R.manyQuiet = !/Saved|Downloaded|didn't let|couldn't/i.test(await text());

// Nothing may have landed in the roll either: 6 imports and nothing more.
R.rollCount = await p.evaluate(async () => {
  const db = await new Promise((res) => { const r = indexedDB.open("pixi"); r.onsuccess = () => res(r.result); });
  return await new Promise((res) => { const q = db.transaction("roll").objectStore("roll").count(); q.onsuccess = () => res(q.result); });
});

console.log(JSON.stringify(R, null, 1));
console.log("errors:", JSON.stringify(errs));
await b.close();

const ok = R.imported && R.oneSaves === 0 && R.oneQuiet && R.sharedCarousel && R.manySaves === 0 && R.manyQuiet && R.rollCount === 6;
if (!ok || errs.length) process.exit(1);
console.log("cancel-check OK");
