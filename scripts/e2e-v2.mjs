import puppeteer from "puppeteer-core";
const URL = process.env.URL ?? "http://localhost:3111";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errs = []; p.on("pageerror", e => errs.push(String(e))); p.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = {};
const clickBtn = (re) => p.evaluate((s) => { const r = new RegExp(s, "i"); const el = [...document.querySelectorAll("button")].find(b => r.test(b.textContent.trim()) || r.test(b.getAttribute("aria-label")||"")); el?.click(); return !!el; }, re.source);
const rollInfo = () => p.evaluate(async () => new Promise((res) => { const rq = indexedDB.open("pixi"); rq.onsuccess = () => { const db = rq.result; if (!db.objectStoreNames.contains("roll")) return res([]); const all = db.transaction("roll").objectStore("roll").getAll(); all.onsuccess = async () => { const o = []; for (const it of all.result) { const bm = await createImageBitmap(it.blob); o.push({ kind: it.kind, w: bm.width, h: bm.height }); } res(o); }; }; rq.onerror = () => res([]); }));
await p.evaluateOnNewDocument(() => localStorage.setItem("pixi:onboarded", "1"));
await p.goto(URL, { waitUntil: "domcontentloaded" });
await sleep(6000);
out.live1 = await p.evaluate(() => { const v = document.querySelector("body > video"); return !!v && v.videoWidth > 0; });
await clickBtn(/take photo/); await sleep(9000);
out.afterPhoto = await rollInfo();
// persistence across reload
await p.reload({ waitUntil: "domcontentloaded" }); await sleep(6000);
await clickBtn(/open your roll/i); await sleep(1500);
out.rollTilesAfterReload = await p.evaluate(() => document.querySelectorAll("img").length);
await clickBtn(/^Camera$/); await sleep(1500);
// background / foreground cycle
await p.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
await sleep(800);
out.releasedInBackground = await p.evaluate(() => { const v = document.querySelector("body > video"); return !v || !v.srcObject; });
await p.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
await sleep(4000);
out.resumed = await p.evaluate(() => { const v = document.querySelector("body > video"); return !!v && !!v.srcObject && v.videoWidth > 0; });
// 0.1MP camera
await clickBtn(/NIBBLE|^NB-|▾/); await sleep(1200);
await clickBtn(/^Nibble$/); await sleep(1000);
await p.evaluate(() => { const t = [...document.querySelectorAll("button")].find(b => /Pixel Phone 0\.1MP/.test(b.textContent)); t?.click(); });
await sleep(2500);
out.lrName = await p.evaluate(() => document.body.innerText.includes("Pixel Phone 0.1MP"));
await clickBtn(/take photo/); await sleep(7000);
const afterLr = await rollInfo(); out.lrPhoto = afterLr[afterLr.length - 1] ?? null; out.rollCount = afterLr.length;
// booth
await clickBtn(/^Booth$/); await sleep(900);
await clickBtn(/take photo/);
await sleep(30000);
const afterBooth = await rollInfo(); out.boothCount = afterBooth.length; out.boothImg = afterBooth.find(i => i.h > i.w * 2) ?? null;
await p.screenshot({ path: "/tmp/e2e-v2.png" });
console.log(JSON.stringify(out, null, 1)); console.log("errors:", JSON.stringify(errs));
await b.close();
