import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 420, height: 950 });
const errs=[]; p.on("pageerror", e=>errs.push("PE "+e)); p.on("console", m=>{ if(m.type()==="error") errs.push(m.text()); });
await p.goto("http://localhost:3111", { waitUntil: "domcontentloaded" });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); await sleep(3000);
const clickT = (t, sel="button")=>p.evaluate((t,sel)=>{ const el=[...document.querySelectorAll(sel)].find(b=>b.textContent.trim()===t||b.getAttribute("aria-label")===t); el?.click(); return !!el; },t,sel);
const R = {};
// Gallery
await clickT("Looks"); await sleep(6000);
R.tiles = await p.evaluate(()=>document.querySelectorAll("section .grid > div").length);
R.thumbsLoaded = await p.evaluate(()=>[...document.querySelectorAll("section .grid img")].filter(i=>i.src.startsWith("data:image")).length);
await p.screenshot({ path: "/tmp/m_gallery.png" });
// Edit a tile -> builder
await p.evaluate(()=>document.querySelector('button[aria-label^="Edit Birch Sun"]').click()); await sleep(1500);
R.builderLayers = await p.evaluate(()=>document.querySelectorAll('button[role="switch"]').length);
// add a layer
await clickT("+ Add layer"); await sleep(300);
await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>b.textContent.startsWith("Scanlines")).click()); await sleep(600);
R.afterAdd = await p.evaluate(()=>document.querySelectorAll('button[role="switch"]').length);
await clickT("Undo"); await sleep(400);
R.afterUndo = await p.evaluate(()=>document.querySelectorAll('button[role="switch"]').length);
await clickT("Redo"); await sleep(400);
R.afterRedo = await p.evaluate(()=>document.querySelectorAll('button[role="switch"]').length);
// slider tweak on open layer
await p.evaluate(()=>{ const r=document.querySelector('input[type="range"]'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; set.call(r, r.max); r.dispatchEvent(new Event("input",{bubbles:true})); }); await sleep(500);
// name + save
await p.evaluate(()=>{ const i=document.querySelector('input[placeholder="Name your look"]'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; set.call(i,"Goa Sunset"); i.dispatchEvent(new Event("input",{bubbles:true})); }); await sleep(300);
await clickT("Save to My Looks"); await sleep(800);
R.toast = await p.evaluate(()=>document.querySelector('[role="status"]')?.textContent);
await p.screenshot({ path: "/tmp/m_builder.png", fullPage: false });
// guide
await clickT("Guide"); await sleep(300); R.guide = await p.evaluate(()=>!!document.querySelector('[role="dialog"]')); await clickT("Got it");
// persisted
R.stored = await p.evaluate(()=>JSON.parse(localStorage.getItem("pixi:looks:v1")||"[]").map(l=>l.name));
// camera view shows My Looks + film carousel
await clickT("Camera"); await sleep(800);
R.myRow = await p.evaluate(()=>document.body.textContent.includes("My Looks") && document.body.textContent.includes("Goa Sunset"));
R.film = await p.evaluate(()=>document.body.textContent.includes("Film roll"));
// scroll the carousel to 3rd canister
await p.evaluate(()=>{ const c=document.querySelector('div.snap-x'); c.scrollTo({left: 3*124, behavior:"auto"}); }); await sleep(4000);
R.filmApplied = await p.evaluate(()=>JSON.parse(localStorage.getItem("pixi:v2")).filmId);
await p.evaluate(()=>document.querySelector('div.snap-x').scrollIntoView({block:"center"})); await sleep(300);
await p.screenshot({ path: "/tmp/m_film.png" });
// Share
await clickT("Share"); await sleep(9000);
R.qr = await p.evaluate(()=>!!document.querySelector('img[alt="QR code for this look"]'));
await p.screenshot({ path: "/tmp/m_share.png" });
// paste import of the code
const code = await p.evaluate(async()=>{ await new Promise(r=>setTimeout(r,200)); return null; });
console.log(JSON.stringify(R,null,1)); console.log("errors:", JSON.stringify(errs.slice(0,5)));
await b.close();
