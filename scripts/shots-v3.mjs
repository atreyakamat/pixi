// Captures the screens that changed in this round, for review.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e));
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button,label")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source??re);
const shot=(n)=>p.screenshot({path:`/tmp/shot-${n}.png`});

await p.evaluateOnNewDocument(()=>localStorage.setItem("pixi:onboarded","1"));
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6500);

// 1. the develop card, caught part-way through
// Capture is slow under software GL, so wait for the card itself rather than guessing a delay.
await click(/^Take photo$/);
await p.waitForSelector('[data-pixi="develop"]', { timeout: 30000 });
await s(850);
await shot("1-develop");
await s(9000);
for (let i=0;i<3;i++){ await click(/^Take photo$/); await s(9000); }

// 2. booth mode, mid countdown
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>/^Booth$/i.test(x.textContent.trim()));b?.click();}); await s(900);
await shot("2-booth-frames");

// 3. Build: the frame picker
await click(/^Build$/); await s(1800);
await click(/^Frame$/); await s(900);
await shot("3-frames");

// 4. Build: a carousel being arranged
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim().startsWith("Instant")&&/Carousel/.test(x.textContent));b?.click();}); await s(1200);
await click(/^Photos$/); await s(600);
await p.evaluate(()=>{[...document.querySelectorAll('button[aria-label="Use this photo"]')].slice(0,3).forEach(b=>b.click());}); await s(8000);
await shot("4-carousel");

// 5. the per-page caption
await click(/^Text$/); await s(700);
await p.evaluate(()=>{const i=document.querySelector('input[placeholder^="Say something"]');if(!i)return;const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;set.call(i,"nobody wanted to go home");i.dispatchEvent(new Event("input",{bubbles:true}));});
await s(1200); await shot("5-caption");

// 6. looks across the carousel
await click(/^Look$/); await s(800); await shot("6-look");

// 7. a strip, for contrast
await click(/^Frame$/); await s(600);
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>/Theatre Ticket/.test(x.textContent));b?.click();}); await s(5000);
await shot("7-strip");

// 8. the roll, with something in the bin
await click(/^Roll$/); await s(1800);
// put one shot in the bin so the screen shows what recovery looks like
await p.evaluate(()=>{const b=[...document.querySelectorAll('button[aria-label^="Open photo"]')][0];b?.click();}); await s(1200);
await click(/^Delete$/); await s(1200);
await click(/^Close$/); await s(1000);
await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].find(x=>/Recently deleted/.test(x.textContent));b?.click();}); await s(1200);
await shot("8-roll");

// 9. settings
await click(/^Looks$/); await s(900);
await click(/^Settings$/); await s(900);
await shot("9-settings");

console.log("errors:",JSON.stringify(errs.slice(0,5)));
console.log("files:",fs.readdirSync("/tmp").filter(f=>f.startsWith("shot-")).sort().join(" "));
await b.close();
