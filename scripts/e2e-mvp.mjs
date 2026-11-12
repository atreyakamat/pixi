// Walks the whole app the way a person would: Studio -> Build -> save -> shelf -> film -> Share.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 420, height: 950 });
const errs=[]; p.on("pageerror", e=>errs.push("PE "+e)); p.on("console", m=>{ if(m.type()==="error") errs.push(m.text()); });
await p.evaluateOnNewDocument(()=>{ localStorage.setItem("pixi:onboarded","1"); localStorage.setItem("pixi:settings:v1", JSON.stringify({ advanced: true })); });
await p.goto("http://localhost:3111", { waitUntil: "domcontentloaded" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); await sleep(4000);
const clickT=(t)=>p.evaluate((t)=>{const el=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()===t||b.getAttribute("aria-label")===t); el?.click(); return !!el;},t);
const clickS=(t)=>p.evaluate((t)=>{const el=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith(t)); el?.click(); return !!el;},t);
const switches=()=>p.evaluate(()=>document.querySelectorAll('button[role="switch"]').length);
const setVal=(sel,v)=>p.evaluate((sel,v)=>{const i=document.querySelector(sel); const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; s.call(i,v); i.dispatchEvent(new Event("input",{bubbles:true}));},sel,v);
const R = {};

await clickT("Looks"); await sleep(6000);
R.tiles = await p.evaluate(()=>document.querySelectorAll("section .grid > div").length);
R.thumbs = await p.evaluate(()=>[...document.querySelectorAll("section .grid img")].filter(i=>i.src.startsWith("data:image")).length);
await p.screenshot({ path: "/tmp/m_studio.png" });

await p.evaluate(()=>document.querySelector('button[aria-label^="Edit Birch Sun"]').click()); await sleep(1800);
R.builderLayers = await switches();
await clickT("Add a layer"); await sleep(500);
await clickS("Scanlines"); await sleep(700);
R.afterAdd = await switches();
await clickT("Undo"); await sleep(500); R.afterUndo = await switches();
await clickT("Redo"); await sleep(500); R.afterRedo = await switches();
await p.evaluate(()=>{const r=document.querySelector('section input[type="range"]'); const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; s.call(r,r.max); r.dispatchEvent(new Event("input",{bubbles:true}));}); await sleep(500);
await setVal('input[placeholder="Name your look"]',"Goa Sunset"); await sleep(400);
await clickT("Save to My Looks"); await sleep(1000);
R.toast = await p.evaluate(()=>document.querySelector('[role="status"]')?.textContent);
await p.screenshot({ path: "/tmp/m_build.png" });
await clickT("Guide"); await sleep(600); R.guide = await p.evaluate(()=>!!document.querySelector('[role="dialog"]')); await clickT("Got it"); await sleep(500);
R.stored = await p.evaluate(()=>JSON.parse(localStorage.getItem("pixi:looks:v1")||"[]").map(l=>l.name));

await clickT("Close"); await sleep(600); await clickT("Camera"); await sleep(1200);
await clickT("Show camera controls"); await sleep(600);
await p.evaluate(()=>document.querySelector('[aria-label="Film: Edit"]').click()); await sleep(900);
await clickT("Cameras"); await sleep(900);
R.myRow = await p.evaluate(()=>{const d=document.querySelector('[role="dialog"]').innerText; return d.includes("My Looks") && d.includes("Goa Sunset");});
await clickT("Film"); await sleep(900);
await p.evaluate(()=>{const c=[...document.querySelectorAll('[role="dialog"] div.snap-x')].pop(); c.scrollTo({left:3*124,behavior:"auto"});}); await sleep(3000);
R.filmApplied = await p.evaluate(()=>JSON.parse(localStorage.getItem("pixi:v2")).filmId);
await p.screenshot({ path: "/tmp/m_film.png" });
await p.keyboard.press("Escape"); await clickT("Camera"); await sleep(600);

await clickT("Looks"); await sleep(1500);
await clickT("Share and receive looks"); await sleep(3000);
R.qr = await p.evaluate(()=>!!document.querySelector('img[alt="QR code for this look"]'));
R.nearby = await p.evaluate(()=>document.body.innerText.includes("Send photos nearby"));
await p.screenshot({ path: "/tmp/m_share.png" });

console.log(JSON.stringify(R,null,1));
console.log("errors:", JSON.stringify(errs));
await b.close();
