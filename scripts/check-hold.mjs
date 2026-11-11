// Press and hold a look tile should open a full-screen preview; a normal tap should not.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e));
const s=ms=>new Promise(r=>setTimeout(r,ms));
const out={};
await p.evaluateOnNewDocument(()=>localStorage.setItem("pixi:onboarded","1"));
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6500);
await p.evaluate(()=>{[...document.querySelectorAll("button")].find(x=>/^Looks$/.test(x.textContent.trim()))?.click();});
await s(3500);
const tile = await p.$('button[aria-label^="Use "]');
const box = await tile.boundingBox();
// hold
await p.mouse.move(box.x+box.width/2, box.y+box.height/2);
await p.mouse.down(); await s(900);
out.previewWhileHeld = await p.evaluate(()=>!!document.querySelector('[role="dialog"][aria-label$="preview"]'));
await p.mouse.up(); await s(400);
out.previewAfterRelease = await p.evaluate(()=>!!document.querySelector('[role="dialog"][aria-label$="preview"]'));
await p.screenshot({path:"/tmp/shot-10-hold.png"});
// tap anywhere closes it
await p.mouse.click(195, 400); await s(500);
out.closedOnTap = await p.evaluate(()=>!document.querySelector('[role="dialog"][aria-label$="preview"]'));
out.stillOnLooks = await p.evaluate(()=>document.body.innerText.includes("Looks"));
// a quick tap picks a look instead of previewing
await p.mouse.click(box.x+box.width/2, box.y+box.height/2); await s(1500);
out.quickTapPicks = await p.evaluate(()=>!document.querySelector('[role="dialog"][aria-label$="preview"]') && !!document.querySelector("body > video"));
console.log(JSON.stringify(out,null,1)); console.log("errors:",JSON.stringify(errs.slice(0,4)));
await b.close();
