// Screens for feat/pixi-viewer: onboarding location step, like heart-burst, grid badge, Details panel.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e)); p.on("console",m=>{ if (m.type()==="error") errs.push("CE "+m.text()); });
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button,label")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source??re);
const shot=(n)=>p.screenshot({path:`/tmp/vw-${n}.png`});

// Pass 1: fresh onboarding, walk to the Location step.
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(2500);
await click(/^Continue$/); await s(500); // promise -> camera
await click(/^(Allow camera|Skip)/); await s(700); // camera -> mic
await click(/^(Allow mic|Skip)/); await s(700); // mic -> location
await shot("1-onboard-location");
await click(/^Skip, no location tag$/); await s(600); // location -> folder/done
console.log("onboarding location step shot taken");

// Pass 2: skip onboarding, take two photos, like one via double-tap, check Details panel.
await p.evaluateOnNewDocument(()=>localStorage.setItem("pixi:onboarded","1"));
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6500);
for (let i=0;i<2;i++){ await click(/^Take photo$/); await s(9000); }

await click(/^Roll$/); await s(1200);
await p.evaluate(()=>{ const el=[...document.querySelectorAll('button[aria-label^="Open photo"]')][0]; el?.click(); }); await s(900);

// Double-tap the image to like + trigger the heart-burst animation.
const imgBox = await p.evaluate(() => {
  const el = document.querySelector('[data-roll-image], img, [class*="object-"]');
  const r = el?.getBoundingClientRect();
  return r ? { x: r.x + r.width/2, y: r.y + r.height/2 } : null;
});
if (imgBox) {
  await p.mouse.click(imgBox.x, imgBox.y);
  await s(80);
  await p.mouse.click(imgBox.x, imgBox.y);
  await s(250);
  await shot("2-heart-burst");
  await s(500);
}

// Verify the liked heart is now shown filled in the header.
await shot("3-liked-header");

// Open the Details panel.
await click(/^Details$/); await s(500);
if (!errs.some(e=>/Details/.test(e))) {
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('[aria-label],button,div')].find(x => /details/i.test(x.getAttribute?.("aria-label")||"") || /details/i.test(x.textContent||""));
  });
}
await shot("4-details-panel");

await click(/^Close$/); await s(400);
await click(/^Roll$/); await s(800);
await shot("5-grid-liked-badge");

console.log("errors:", JSON.stringify(errs));
await b.close();
