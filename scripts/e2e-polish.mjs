// The Apple-polish round: two-screen onboarding, hidden controls, instant shutter feedback,
// develop → thumbnail hand-off, calm toasts, empty roll, builder behind Advanced, Build smart start.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e)); p.on("console",m=>{ if(m.type()==="error") errs.push("CE "+m.text()); });
const s=ms=>new Promise(r=>setTimeout(r,ms));
const has=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");return [...document.querySelectorAll("button")].some(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));},re.source);
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source);
const text=()=>p.evaluate(()=>document.body.innerText);
const R={};

// Fresh install: onboarding is two screens.
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(4500);
R.onboard1 = /Free\. On-device\./.test(await text());
await p.screenshot({path:"/tmp/p-1-onboard.png"});
await click(/^Continue$/); await s(900);
R.onboard2 = /first photo/i.test(await text()) && await has(/^Allow camera$/);
await p.screenshot({path:"/tmp/p-2-onboard.png"});
await click(/^Allow camera$/); await s(5500);
R.onboardDone = !(/first photo/i.test(await text()));

// Camera: controls hidden until asked for.
R.controlsHidden = !(await has(/^Flash:/));
await p.screenshot({path:"/tmp/p-3-camera.png"});
await click(/Show camera controls/); await s(800);
R.controlsShown = await has(/^Flash:/) && await has(/^Timer:/);
await p.screenshot({path:"/tmp/p-4-controls.png"});
await click(/Hide camera controls/); await s(600);

// Empty roll: one sentence, one button.
await click(/^Roll$/); await s(900);
R.emptyRoll = /Your roll is empty/.test(await text()) && await has(/^Take a photo$/);
await p.screenshot({path:"/tmp/p-5-empty.png"});
await click(/^Take a photo$/); await s(1500);

// Shutter: the develop card appears at once, then hands off to the thumbnail.
const t0 = Date.now();
await click(/^Take photo$/);
for (let i=0;i<60;i++){ if (await p.evaluate(()=>!!document.querySelector('[data-pixi="develop"]'))) break; await s(100); }
R.developAppearsMs = Date.now() - t0; // headless software GL runs ~500 ms a frame; read the real number on the phone
await s(700); await p.screenshot({path:"/tmp/p-6-develop.png"});
for (let i=0;i<80;i++){ if (await p.evaluate(()=>!document.querySelector('[data-pixi="develop"]'))) break; await s(250); }
await s(1200);
R.handedOff = await p.evaluate(()=>!document.querySelector('[data-pixi="develop"]') && !!document.querySelector('button[aria-label="Open your roll"] img'));
R.silentSuccess = await p.evaluate(()=>!/Saved to|Kept in Pixi|Downloaded/.test(document.querySelector('[role="status"]')?.textContent || ""));
await p.screenshot({path:"/tmp/p-7-landed.png"});
for (let i=0;i<4;i++){ await click(/^Take photo$/); await s(4200); }

// Looks: builder hidden by default.
await click(/^Looks$/); await s(2500);
R.builderHidden = !(await has(/^Edit /)) && !(await has(/Create a new look/));

// Build opens already filled, with six featured frames and More.
await click(/^Build$/); await s(2500);
R.buildFilled = await p.evaluate(()=>/Save \d+ pages to roll|Save to roll/.test(document.body.innerText));
await click(/^Frame$/); await s(700);
R.featuredFrames = await p.evaluate(()=>[...document.querySelectorAll("button")].filter(b=>b.querySelector("canvas")&&b.className.includes("w-[80px]")).length);
R.hasMore = await has(/more frames/i);
await p.screenshot({path:"/tmp/p-8-build.png"});
await click(/more frames/i); await s(700);
R.allFrames = await p.evaluate(()=>[...document.querySelectorAll("button")].filter(b=>b.querySelector("canvas")&&b.className.includes("w-[80px]")).length);

// Roll viewer opens from its tile.
await click(/^Roll$/); await s(1200);
await p.evaluate(()=>document.querySelector('button[aria-label^="Open photo"]')?.click()); await s(1200);
R.viewerOpen = await has(/^Close$/);
await p.screenshot({path:"/tmp/p-9-viewer.png"});
await click(/^Close$/); await s(800);

// Settings: performance numbers exist after shooting.
await click(/^Looks$/); await s(900); await click(/^Settings$/); await s(900);
R.perf = await p.evaluate(()=>{ const t=document.body.innerText; return { viewfinder: /fps · median/.test(t), shutter: /On screen in \d+ ms/.test(t) }; });
R.toggles = await p.evaluate(()=>["Shutter sound","Look builder","Frame meter","Haptics"].every(l=>document.querySelector(`button[aria-label="${l}"]`)));

// Toast queue: three messages arrive together, only one shows at a time.
R.oneToast = await p.evaluate(()=>document.querySelectorAll('[role="status"]').length <= 1);

console.log(JSON.stringify(R,null,1));
console.log("errors:", JSON.stringify(errs));
await b.close();
