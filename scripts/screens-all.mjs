// Every main screen of the app in one pass, for review. Writes /tmp/all-*.png. App build on :3111.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e));
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button,a")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source);
const shot=(n)=>p.screenshot({path:`/tmp/all-${n}.png`});
await p.evaluateOnNewDocument(()=>{ localStorage.setItem("pixi:onboarded","1"); localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode:"manual", sound:false })); });
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6000);
for (let i=0;i<5;i++){ await click(/^Take photo$/); await s(4500); }
await click(/^Looks$/); await s(6000); await shot("looks");
await click(/^Roll$/); await s(1500); await shot("roll");
await click(/^Looks$/); await s(1500); await click(/Share and receive looks/); await s(1500); await shot("share"); await click(/^Close$/); await s(700);
await click(/^Settings$/); await s(1000); await shot("settings");
await p.evaluate(()=>{ const el=[...document.querySelectorAll("h2")].find(x=>/Performance/i.test(x.textContent)); el?.scrollIntoView({block:"start"}); }); await s(600); await shot("settings-perf");
console.log("errors:",JSON.stringify(errs)); await b.close();
