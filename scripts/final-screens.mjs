// Fresh screenshots of the v12 build for review. App on :3111, web on :3112.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button,a")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source);
const shot=(n)=>p.screenshot({path:`/tmp/final-${n}.png`});

// 1) Fresh onboarding (no localStorage seeding)
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(2500);
await shot("01-onboard-promise");
await click(/^Continue$/); await s(500); await shot("02-onboard-camera");
await click(/^Allow camera$|^Continue$/); await s(800); await shot("03-onboard-mic");
await click(/^Skip, silent videos$|^Allow microphone$/); await s(800); await shot("04-onboard-folder");
await click(/^Use my gallery$/); await s(2500);

// 2) Camera + lens
await shot("05-camera");
await click(/^Take photo$/); await s(3000);
await p.evaluate(()=>{ const btns=[...document.querySelectorAll("button")]; const lens=btns.find(b=>/lens/i.test(b.textContent)); lens?.click(); });
await s(600); await shot("06-shelf-lens-tab");
await click(/fisheye/i); await s(1000); await shot("07-lens-fitted-chip");
await click(/^Take photo$/); await s(3000); await shot("08-photo-with-lens");

// 3) Learn
await click(/^Roll$/); await s(800);
await p.evaluate(()=>{ const el=[...document.querySelectorAll("button")].find(b=>/learn what pixi can do/i.test(b.getAttribute("aria-label")||"")); el?.click(); });
await s(600); await shot("09-learn");

// 4) Build with a carousel frame
await p.evaluate(()=>{ const btns=[...document.querySelectorAll("button")]; const close=btns.find(b=>/close/i.test(b.getAttribute("aria-label")||b.textContent)); close?.click(); });
await s(400);
await click(/^Build$/); await s(800); await shot("10-build-photos-tab");

// 5) Settings with Permissions + Where groups
await click(/^Looks$/); await s(800);
await click(/^Settings$/); await s(800); await shot("11-settings-top");
await p.evaluate(()=>{ const el=[...document.querySelectorAll("h2,h3")].find(x=>/permission/i.test(x.textContent)); el?.scrollIntoView({block:"start"}); }); await s(500); await shot("12-settings-permissions");
await p.evaluate(()=>{ const el=[...document.querySelectorAll("h2,h3")].find(x=>/where|folder|save/i.test(x.textContent)); el?.scrollIntoView({block:"start"}); }); await s(500); await shot("13-settings-where");

await b.close();

// 6) Web carousel maker
const b2 = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p2 = await b2.newPage(); await p2.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });
await p2.goto("http://localhost:3112/make/",{waitUntil:"domcontentloaded"}); await s(2000);
await p2.screenshot({path:"/tmp/final-14-maker.png"});
await b2.close();
console.log("done");
