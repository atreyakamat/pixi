import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage(); await p.setViewport({ width: 420, height: 1000, deviceScaleFactor: 1 });
const errs=[]; p.on("pageerror", e=>errs.push(String(e))); p.on("console", m=>{ if(m.type()==="error") errs.push(m.text()); });
await p.goto("http://localhost:3111", { waitUntil: "domcontentloaded" });
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
await sleep(2500);
const click = async (t, exact=false) => { const ok = await p.evaluate((t,exact)=>{ const el=[...document.querySelectorAll("button,label")].find(b=>exact? b.textContent.trim()===t : b.textContent.trim().startsWith(t)); if(!el) return false; el.click(); return true; },t,exact); if(!ok) console.log("  (no button:",t,")"); await sleep(500); return ok; };
const dims = () => p.evaluate(()=>{ const c=document.querySelector("canvas"); return c.width+"x"+c.height; });
const shotCount = () => p.evaluate(()=>document.querySelectorAll("section img, section video").length);
const res = {};
await click("Start camera"); await sleep(1500);
res.camLive = await p.evaluate(()=>!document.body.textContent.includes("Start camera") && !document.body.textContent.includes("Try again"));
// aspect ratios
res.aspects = {};
for (let i=0;i<5;i++){ await click("Ratio"); res.aspects[await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>b.textContent.startsWith("Ratio")).textContent)] = await dims(); }
await click("Ratio"); // back to Auto
// grid + zoom + flash toggle
await click("Thirds"); await click("Grid off"); // cycle
await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>b.textContent.startsWith("Grid")||b.textContent==="Thirds")?.click());
await click("2×", true); 
await click("Flash"); await click("Flash");
// photo
const before = await shotCount();
await p.click('button[aria-label="Take photo"]'); await sleep(7000);
res.photo = (await shotCount()) - before;
// portrait
await click("PORTRAIT"); await p.mouse.click(210, 330); await sleep(500);
await p.screenshot({ path: "/tmp/e_portrait.png" });
let c = await shotCount(); await p.click('button[aria-label="Take photo"]'); await sleep(7000); res.portrait = (await shotCount()) - c;
// night
await click("NIGHT"); c = await shotCount(); await p.click('button[aria-label="Take photo"]'); await sleep(10000); res.night = (await shotCount()) - c;
await p.screenshot({ path: "/tmp/e_night.png" });
// pro
await click("PRO"); await p.screenshot({ path: "/tmp/e_pro.png", fullPage: false });
c = await shotCount(); await p.click('button[aria-label="Take photo"]'); await sleep(7000); res.pro = (await shotCount()) - c;
// timer
await click("PHOTO"); await click("Timer"); // 3s
c = await shotCount(); await p.click('button[aria-label="Take photo"]'); await sleep(1200);
res.countdownShown = await p.evaluate(()=>/\b[123]\b/.test(document.querySelector(".text-8xl")?.textContent||""));
await sleep(9000); res.timerPhoto = (await shotCount()) - c;
await click("Timer"); await click("Timer"); await click("Timer"); // back to off
// video
await click("VIDEO"); c = await shotCount(); await p.click('button[aria-label="Start recording"]'); await sleep(2500); await p.click('button[aria-label="Stop recording"]'); await sleep(1500); res.video = (await shotCount()) - c;
// timelapse (1s interval)
await click("TIMELAPSE"); await click("1s", true); c = await shotCount(); await p.click('button[aria-label="Start recording"]'); await sleep(14000);
res.tlBadge = await p.evaluate(()=>document.body.textContent.match(/(\d+) frames/)?.[1]);
await p.click('button[aria-label="Stop recording"]'); await sleep(25000); res.timelapse = (await shotCount()) - c;
// watermark
await click("PHOTO"); await click("No mark"); await p.screenshot({ path: "/tmp/e_wm.png" });
console.log(JSON.stringify(res,null,1)); console.log("errors:", JSON.stringify(errs.slice(0,5)));
await b.close();
