// Screens for this round: Build print frames, sticker sheet, Settings "Keep it safe", Roll viewer with clip button.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e)); p.on("console",m=>{ if (m.type()==="error") errs.push("CE "+m.text()); });
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button,label")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source??re);
const shot=(n)=>p.screenshot({path:`/tmp/v4-${n}.png`});
await p.evaluateOnNewDocument(()=>localStorage.setItem("pixi:onboarded","1"));
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6500);
for (let i=0;i<2;i++){ await click(/^Take photo$/); await s(9000); }

await click(/^Build$/); await s(1800);
await click(/^Frame$/); await s(600);
await p.evaluate(()=>{ const el=[...document.querySelectorAll("button")].find(x=>/Sticker Sheet/.test(x.textContent)); el?.scrollIntoView({block:"center"}); el?.click(); }); await s(800);
await click(/^Photos$/); await s(500);
for (let i=0;i<12;i++){ await p.evaluate(()=>{ const el=[...document.querySelectorAll('button[aria-label="Use this photo"]')][0]; el?.click(); }); await s(350); }
await s(1200); await shot("1-stickers");
await click(/^Frame$/); await s(500);
await p.evaluate(()=>{ const el=[...document.querySelectorAll("button")].find(x=>/4 × 6 Print/.test(x.textContent)); el?.scrollIntoView({block:"center"}); el?.click(); }); await s(1200);
await shot("2-print46");

await click(/^Roll$/); await s(1200);
await p.evaluate(()=>{ const el=[...document.querySelectorAll('button[aria-label^="Open photo"]')][0]; el?.click(); }); await s(1000);
await shot("3-viewer-clip");
await click(/^Close$/); await s(400);

await click(/^Looks$/); await s(800);
await click(/^Settings$/); await s(900);
await p.evaluate(()=>{ const h=[...document.querySelectorAll("h2,h3,div")].find(x=>/Keep it safe/.test(x.textContent||"") && x.children.length<3); h?.scrollIntoView({block:"start"}); }); await s(600);
await shot("4-keep-safe");
console.log("errors:", JSON.stringify(errs));
await b.close();
