// Shoots photos, selects them in the Roll, builds a strip and checks it lands back in the roll.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button,label")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source??re);
const rollInfo=()=>p.evaluate(()=>new Promise(res=>{const q=indexedDB.open("pixi");q.onsuccess=()=>{const d=q.result;if(!d.objectStoreNames.contains("roll"))return res([]);const a=d.transaction("roll").objectStore("roll").getAll();a.onsuccess=async()=>{const o=[];for(const it of a.result){const bm=await createImageBitmap(it.blob);o.push({w:bm.width,h:bm.height,thumb:!!it.thumb,exported:!!it.exported});bm.close();}res(o);};};q.onerror=()=>res([]);}));
const out={};
await p.evaluateOnNewDocument(()=>localStorage.setItem("pixi:onboarded","1"));
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6000);
for (let i=0;i<3;i++){ await click(/^Take photo$/); await s(4500); }
out.shots = await rollInfo();
// Roll -> select -> make a strip
await click(/^Roll$/); await s(1500);
await click(/^Select$/); await s(600);
await p.evaluate(()=>{[...document.querySelectorAll('button[aria-label^="Select photo"]')].slice(0,3).forEach(b=>b.click());}); await s(700);
out.selected = await p.evaluate(()=>document.body.innerText.match(/(\d+) selected/)?.[1]);
await click(/^Make a strip$/); await s(5000);
out.onBuild = await p.evaluate(()=>document.body.innerText.includes("Build"));
out.filledChips = await p.evaluate(()=>[...document.querySelectorAll('button[aria-label^="Window"] img')].length);
// change frame
await click(/^Frame$/); await s(600);
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>/Theatre Ticket/.test(x.textContent));b?.click();}); await s(1200);
// text edit
await click(/^Text$/); await s(600);
await p.evaluate(()=>{const i=document.querySelector('section input, input'); });
out.fields = await p.evaluate(()=>[...document.querySelectorAll("input")].length);
// look
await click(/^Look$/); await s(600);
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Window Seat");b?.click();}); await s(6000);
// export
await click(/^Photos$/); await s(500);
await click(/Save to roll/i); await s(9000);
const after = await rollInfo();
out.rollCount = after.length;
out.strip = after.find(i=>i.h>i.w*2.5) ?? null;
await p.screenshot({path:"/tmp/e2e-build.png"});
console.log(JSON.stringify(out,null,1)); console.log("errors:",JSON.stringify(errs.slice(0,6)));
await b.close();
