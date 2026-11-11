// Builds a carousel from the roll and checks every page comes out at exactly 1080x1350,
// which is what Instagram shows at full width without cropping.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button,label")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source??re);
const roll=()=>p.evaluate(()=>new Promise(res=>{const q=indexedDB.open("pixi");q.onsuccess=()=>{const d=q.result;if(!d.objectStoreNames.contains("roll"))return res([]);const a=d.transaction("roll").objectStore("roll").getAll();a.onsuccess=async()=>{const o=[];for(const it of a.result){const bm=await createImageBitmap(it.blob);o.push({w:bm.width,h:bm.height});bm.close();}res(o);};};q.onerror=()=>res([]);}));
const out={};
await p.evaluateOnNewDocument(()=>localStorage.setItem("pixi:onboarded","1"));
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6000);
for (let i=0;i<3;i++){ await click(/^Take photo$/); await s(5200); }
out.before = (await roll()).length;

await click(/^Build$/); await s(1800);
await click(/^Frame$/); await s(600);
out.pickedFrame = await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim().startsWith("Instant")&&/Carousel/.test(x.textContent));b?.click();return !!b;});
await s(1500);
await click(/^Photos$/); await s(600);
// three taps on roll thumbnails add three pages, in order
await p.evaluate(()=>{[...document.querySelectorAll('button[aria-label="Use this photo"]')].slice(0,3).forEach(b=>b.click());});
await s(7000);
out.pages = await p.evaluate(()=>document.body.innerText.match(/(\d+) pages/)?.[1] ?? null);
out.undoEnabled = await p.evaluate(()=>!document.querySelector('button[aria-label="Undo"]')?.disabled);

// a caption on page 1
await click(/^Text$/); await s(600);
out.captionBox = await p.evaluate(()=>!!document.querySelector('input[placeholder^="Say something"]'));
await p.evaluate(()=>{const i=document.querySelector('input[placeholder^="Say something"]');if(!i)return;const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;set.call(i,"the last good evening");i.dispatchEvent(new Event("input",{bubbles:true}));});
await s(900);

await click(/^Save \d+ pages/); await s(12000);
const after = await roll();
// Pages land at the end of the store, after whatever the camera put there.
const last3 = after.slice(-3);
out.total = after.length;
out.sizes = last3.map(x=>`${x.w}x${x.h}`);
out.allCorrect = last3.length===3 && last3.every(x=>x.w===1080 && x.h===1350);
await p.screenshot({path:"/tmp/e2e-carousel.png"});
// Lay the exported pages side by side so the result can be looked at, not just measured.
const sheet = await p.evaluate(()=>new Promise(res=>{const q=indexedDB.open("pixi");q.onsuccess=()=>{const a=q.result.transaction("roll").objectStore("roll").getAll();a.onsuccess=async()=>{const items=a.result.slice(-3);const c=document.createElement("canvas");c.width=items.length*372;c.height=466;const g=c.getContext("2d");g.fillStyle="#2a2a2e";g.fillRect(0,0,c.width,c.height);for(let i=0;i<items.length;i++){const bm=await createImageBitmap(items[i].blob);g.drawImage(bm,i*372+6,8,360,450);bm.close();}res(c.toDataURL("image/jpeg",0.92));};};}));
(await import("node:fs")).writeFileSync("/tmp/carousel-pages.jpg", Buffer.from(sheet.split(",")[1],"base64"));
console.log(JSON.stringify(out,null,1)); console.log("errors:",JSON.stringify(errs.slice(0,6)));
await b.close();
