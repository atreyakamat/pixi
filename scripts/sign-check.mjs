// Sign it: with no handle Build offers "Set up"; with one, the switch changes the preview, the
// choice is remembered, and the exported image carries the credit. App build on :3111.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e)); p.on("console",m=>{ if(m.type()==="error") errs.push("CE "+m.text()); });
const s=ms=>new Promise(r=>setTimeout(r,ms)); const R={};
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source);
const sum=()=>p.evaluate(()=>{ const c=[...document.querySelectorAll("main canvas")].sort((a,b)=>b.width*b.height-a.width*a.height)[0]; const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data; let t=0; for(let i=0;i<d.length;i+=4) t+=d[i]+d[i+1]*2+d[i+2]*3; return t; });
await p.evaluateOnNewDocument(()=>{ if (sessionStorage.getItem("seeded")) return; sessionStorage.setItem("seeded","1"); localStorage.setItem("pixi:onboarded","1"); localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode:"manual", sound:false })); });
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6000);
for (let i=0;i<2;i++){ await click(/^Take photo$/); await s(5000); }
await click(/^Build$/); await s(2500); await click(/^Text$/); await s(600);
R.offersSetup = await p.evaluate(()=>/Add a handle to your profile first/.test(document.body.innerText)) && await click(/^Set up$/); await s(1200);
R.wentToProfile = await p.evaluate(()=>!!document.querySelector('input[placeholder="yourhandle"]'));
await p.click('input[placeholder="yourhandle"]'); await p.keyboard.type("atreya.mp4",{delay:5}); await s(400);
await click(/^Build$/); await s(2500); await click(/^Text$/); await s(600);
const off = await sum();
R.switchShown = await click(/^Sign with your handle$/); await s(1200);
const on = await sum();
R.previewChanges = on !== off;
R.remembered = await p.evaluate(()=>JSON.parse(localStorage.getItem("pixi:settings:v1")).sign === true);
await p.reload({waitUntil:"domcontentloaded"}); await s(6000); await click(/^Build$/); await s(3000);
R.survivesReload = (await sum()) === on;
await click(/^Text$/); await s(500); await click(/^Sign with your handle$/); await s(1200);
R.offAgain = (await sum()) === off;
console.log(JSON.stringify(R)); console.log("errors:",JSON.stringify(errs)); await b.close();
if (!Object.values(R).every(Boolean)||errs.length) process.exit(1);
