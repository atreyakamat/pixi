import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844 });
await p.evaluateOnNewDocument(() => localStorage.setItem("pixi:onboarded", "1"));
await p.goto("http://localhost:3111", { waitUntil: "domcontentloaded" });
for (const t of [3000, 6000, 10000, 15000]) { await new Promise(r => setTimeout(r, t === 3000 ? 3000 : t - [3000,6000,10000,15000][[3000,6000,10000,15000].indexOf(t)-1])); console.log(t, await p.evaluate(() => { const v = document.querySelector("body > video"); return { has: !!v, src: !!v?.srcObject, w: v?.videoWidth, start: [...document.querySelectorAll("button")].some(b => /Start camera/.test(b.textContent)) }; })); }
await b.close();
