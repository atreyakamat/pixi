import puppeteer from "puppeteer-core";
const URL = process.env.URL ?? "http://localhost:3111";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs = []; p.on("pageerror", e => errs.push(String(e))); p.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fresh = process.argv[2] === "fresh";
if (!fresh) await p.evaluateOnNewDocument(() => localStorage.setItem("pixi:onboarded", "1"));
await p.goto(URL, { waitUntil: "domcontentloaded" });
await sleep(900); await p.screenshot({ path: "/tmp/ui-splash.png" });
await sleep(3500);
await p.screenshot({ path: "/tmp/ui-1.png" });
if (fresh) {
  for (const n of [1,2]) { await p.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent.trim()==="Next")?.click()); await sleep(1600); await p.screenshot({ path: `/tmp/ui-ob${n}.png` }); }
  await p.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent.trim()==="Allow")?.click()); await sleep(1200);
  await p.screenshot({ path: "/tmp/ui-ob3.png" });
  await p.evaluate(() => [...document.querySelectorAll("button")].find(b => /Continue|Open camera/.test(b.textContent))?.click()); await sleep(4000);
  await p.screenshot({ path: "/tmp/ui-2.png" });
}
console.log("onboarded flag:", await p.evaluate(() => localStorage.getItem("pixi:onboarded")));
console.log("errors:", JSON.stringify(errs));
await b.close();
