import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 420, height: 1000 });
const errs=[]; p.on("pageerror", e=>errs.push("PE "+e)); p.on("console", m=>{ if(!m.text().includes("GL Driver")) errs.push(m.type()+": "+m.text()); });
await p.goto("http://localhost:3111", { waitUntil: "domcontentloaded" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); await sleep(2500);
const click = (t)=>p.evaluate((t)=>{ const el=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith(t)); el?.click(); return !!el; },t);
await click("Start camera"); await sleep(1500); await click("TIMELAPSE"); await sleep(300); await click("1s");
await p.evaluate(()=>document.querySelector('button[aria-label="Start recording"]').click()); await sleep(6000);
console.log("badge:", await p.evaluate(()=>document.body.textContent.match(/\d+ frames[^A-Z]*/)?.[0]));
await p.evaluate(()=>document.querySelector('button[aria-label="Stop recording"]').click());
for (let i=0;i<8;i++){ await sleep(2500); console.log(i, await p.evaluate(()=>({busy: document.body.textContent.includes("Encoding"), shots: document.querySelectorAll("section video").length, err:[...document.querySelectorAll(".text-amber-200")].map(e=>e.textContent)}))); }
console.log(errs.join("\n")); await b.close();
