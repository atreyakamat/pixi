// A 45-page carousel: more than Build used to be able to hold. Every exported page must be
// 1080×1350, carry its own photo (none blank, none repeated), and be numbered in order.
// Also: the new frames draw, and Instagram's 20-per-post limit is explained. App build on :3111.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const files = fs.readdirSync("/tmp/many").filter(f=>f.endsWith(".jpg")).sort().map(f=>"/tmp/many/"+f);
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", protocolTimeout: 600000, args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e)); p.on("console",m=>{ if(m.type()==="error") errs.push("CE "+m.text()); });
const s=ms=>new Promise(r=>setTimeout(r,ms)); const R={};
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source);
const text=()=>p.evaluate(()=>document.body.innerText);
await p.evaluateOnNewDocument(()=>{ if (localStorage.getItem("pixi:onboarded")) return; localStorage.setItem("pixi:onboarded","1"); localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode:"manual", sound:false, format:"jpeg" })); });
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(5000);
await click(/^Roll$/); await s(800);
await (await p.$('input[type="file"][multiple]')).uploadFile(...files);
for (let i=0;i<240;i++){ if (/45 shots/.test(await text())) break; await s(500); }
R.imported45 = /45 shots/.test(await text());

await click(/^Build$/); await s(3000);
await click(/^Frame$/); await s(600);
R.framesOffered = await p.evaluate(()=>["Glass","Noir"].every(n=>[...document.querySelectorAll("button")].some(b=>b.textContent.includes(n))));
await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>/^Glass/.test(b.textContent.trim())||b.textContent.includes("Glass"))?.click()); await s(1500);
await click(/^Photos$/); await s(600); await click(/^Add all$/); await s(2500);
R.subtitle = (await text()).match(/45 pages · [^\n]+/)?.[0];
R.counter = await p.evaluate(()=>/\d+ \/ 45/.test(document.body.innerText));
// flip through a few pages: previews load on demand
const canvasSig=()=>p.evaluate(()=>{ const c=[...document.querySelectorAll("main canvas")].sort((a,b)=>b.width*b.height-a.width*a.height)[0]; const d=c.getContext("2d").getImageData(c.width/2,c.height*0.35,1,1).data; return d[0]+","+d[1]+","+d[2]; });
await s(2500); const first = await canvasSig();
await p.screenshot({path:"/tmp/u-glass.png"});
R.saveLabel = await click(/^Save 45 pages to roll$/);
for (let i=0;i<600;i++){ if (/90 shots/.test(await text())) break; await s(500); }
R.exported45 = /90 shots/.test(await text());
await s(1500);
// Read the 45 newest roll items straight from storage and check each page.
R.pages = await p.evaluate(async()=>{
  const db = await new Promise((res,rej)=>{ const r=indexedDB.open("pixi"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  const all = await new Promise((res)=>{ const q=db.transaction("roll").objectStore("roll").getAll(); q.onsuccess=()=>res(q.result); });
  const pages = all.sort((a,b)=>b.created-a.created).slice(0,45).reverse();
  const out={ n:pages.length, wrongSize:0, blank:0, colours:new Set() };
  for (const it of pages) {
    const bmp = await createImageBitmap(it.blob);
    if (bmp.width!==1080||bmp.height!==1350) out.wrongSize++;
    const c=document.createElement("canvas"); c.width=bmp.width; c.height=bmp.height; const g=c.getContext("2d"); g.drawImage(bmp,0,0);
    const d=g.getImageData(540,330,1,1).data;           // inside the sharp photo, above the number
    const edge=g.getImageData(8,8,1,1).data;            // the blurred backdrop
    const sat=Math.max(d[0],d[1],d[2])-Math.min(d[0],d[1],d[2]);
    if (sat<40) out.blank++;
    out.colours.add((d[0]>>3)+","+(d[1]>>3)+","+(d[2]>>3));
    out.backdropDrawn = (out.backdropDrawn ?? true) && (edge[0]+edge[1]+edge[2] > 40);
    bmp.close();
  }
  return { n:out.n, wrongSize:out.wrongSize, blank:out.blank, distinct:out.colours.size, backdropDrawn:out.backdropDrawn };
});
// The roll-limit guard: a set that would push originals out is refused with a way to share instead.
await p.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("pixi:settings:v1")); v.rollLimit=100; localStorage.setItem("pixi:settings:v1",JSON.stringify(v)); });
await p.reload({waitUntil:"domcontentloaded"}); await s(6000);
await click(/^Build$/); await s(3000); await click(/^Photos$/); await s(500); await click(/^Add all$/); await s(2000);
await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>/^Save \d+ pages to roll$/.test(b.textContent.trim()))?.click());
for (let i=0;i<400;i++){ if (/oldest shots? out of the roll/.test(await text())) break; await s(500); }
R.guard = /oldest shots? out of the roll/.test(await text()) && await p.evaluate(()=>[...document.querySelectorAll('[role="status"] button')].some(b=>b.textContent.trim()==="To phone"));
R.nothingLost = await p.evaluate(async()=>{ const db=await new Promise((res)=>{ const r=indexedDB.open("pixi"); r.onsuccess=()=>res(r.result); }); return await new Promise((res)=>{ const q=db.transaction("roll").objectStore("roll").count(); q.onsuccess=()=>res(q.result); }); });
console.log(JSON.stringify(R,null,1)); console.log("errors:",JSON.stringify(errs)); await b.close();
const ok = R.imported45 && R.framesOffered && /3 Instagram posts of 20/.test(R.subtitle||"") && R.counter && R.saveLabel && R.exported45 && R.pages.n===45 && R.pages.wrongSize===0 && R.pages.blank===0 && R.pages.distinct>=40 && R.pages.backdropDrawn && R.guard && R.nothingLost===90;
if (!ok||errs.length) process.exit(1);
