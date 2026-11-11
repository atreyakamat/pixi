// Dynamic Type at the cap (135%) on a small phone. Fails if a screen scrolls sideways, the shutter
// or the tab bar leaves the screen, or any button's label is clipped.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 360, height: 740, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e));
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(re)=>p.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source);
await p.evaluateOnNewDocument(()=>{ localStorage.setItem("pixi:onboarded","1"); localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode: "manual", sound: false })); const set=()=>{ if(document.documentElement) document.documentElement.style.fontSize="21.6px"; }; set(); document.addEventListener("DOMContentLoaded", set); });
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6000);
const audit=(name)=>p.evaluate((name)=>{
  const W=innerWidth,H=innerHeight; const bad=[];
  if (document.documentElement.scrollWidth > W+1) bad.push("page scrolls sideways");
  const inView=(el)=>{ const r=el.getBoundingClientRect(); return r.width>0 && r.bottom<=H+1 && r.top>=-1 && r.left>=-1 && r.right<=W+1; };
  const nav=document.querySelector('nav[aria-label="Main"]'); if (nav && !inView(nav)) bad.push("tab bar off screen");
  const sh=document.querySelector('button[aria-label="Take photo"]'); if (sh && !inView(sh)) bad.push("shutter off screen");
  for (const el of document.querySelectorAll("button, h1, h2")) {
    const r=el.getBoundingClientRect(); if (!r.width || r.bottom<0 || r.top>H) continue;
    const cs=getComputedStyle(el);
    // inside a horizontal scroller is fine
    let sc=el.parentElement, scrolls=false; while(sc){ const o=getComputedStyle(sc).overflowX; if((o==="auto"||o==="scroll")&&sc.scrollWidth>sc.clientWidth){scrolls=true;break;} sc=sc.parentElement; }
    if (!scrolls && (r.right>W+2 || r.left<-2)) bad.push("off edge: "+(el.getAttribute("aria-label")||el.textContent.trim()).slice(0,30));
    if (el.scrollWidth>el.clientWidth+2 && cs.overflow!=="visible" && cs.textOverflow!=="ellipsis" && !el.querySelector("img,canvas,video")) bad.push("clipped: "+(el.getAttribute("aria-label")||el.textContent.trim()).slice(0,30));
  }
  // Text squeezed into a sliver (three or more lines in under 120 px) or a button label on 3+ lines.
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for (let n; (n=walker.nextNode());) {
    const txt=n.textContent.trim(); if (txt.length<8) continue;
    const el=n.parentElement; const r=el.getBoundingClientRect(); if (!r.width || r.bottom<0 || r.top>H) continue;
    const lh=parseFloat(getComputedStyle(el).lineHeight)||parseFloat(getComputedStyle(el).fontSize)*1.3;
    const range=document.createRange(); range.selectNodeContents(n); const lines=Math.round(range.getBoundingClientRect().height/lh);
    if (lines>=3 && (r.width<120 || el.closest("button"))) bad.push("squeezed ("+lines+" lines): "+txt.slice(0,30));
  }
  // Two controls drawn on top of each other.
  const ctl=[...document.querySelectorAll("main button, main [role=switch]")].filter(e=>{ if (e.closest("nav")) return false; /* content scrolls under the tab bar by design */const r=e.getBoundingClientRect();return r.width>0&&r.top<H&&r.bottom>0&&!e.closest('[class*="absolute"]');});
  const labels=[...document.querySelectorAll("main div, main span, main p")].filter(e=>e.children.length===0&&e.textContent.trim().length>3&&!e.closest("button"));
  for (const c of ctl) { const a=c.getBoundingClientRect(); for (const l of labels) { const range=document.createRange(); range.selectNodeContents(l); const q0=range.getBoundingClientRect(), e=l.getBoundingClientRect(); const q={left:Math.max(q0.left,e.left),right:Math.min(q0.right,e.right),top:q0.top,bottom:q0.bottom,width:q0.width}; /* a truncated label only occupies its own box */ if(!q.width||q.top>H||q.bottom<0) continue;
    { const top=document.elementFromPoint((q.left+q.right)/2,(q.top+q.bottom)/2); if (top && top!==l && !l.contains(top) && !top.contains(l) && top!==c && !c.contains(top)) continue; /* covered by a full-screen layer */ }
    const ox=Math.min(a.right,q.right)-Math.max(a.left,q.left), oy=Math.min(a.bottom,q.bottom)-Math.max(a.top,q.top);
    if (ox>6&&oy>6&&!c.contains(l)&&!l.closest('[class*="absolute"],[class*="pointer-events-none"]')) { bad.push("overlap: "+l.textContent.trim().slice(0,24)+" / "+(c.getAttribute("aria-label")||c.textContent.trim()).slice(0,20)); break; } } }
  return { name, bad:[...new Set(bad)] };
},name);
const R=[];
R.push(await audit("camera")); await p.screenshot({path:"/tmp/bt-camera.png"});
await click(/Show camera controls/); await s(700); R.push(await audit("controls")); await p.screenshot({path:"/tmp/bt-controls.png"}); await click(/Hide camera controls/); await s(500);
await click(/^Roll$/); await s(900); R.push(await audit("roll-empty")); await p.screenshot({path:"/tmp/bt-empty.png"});
await click(/^Take a photo$/); await s(1200);
for (let i=0;i<3;i++){ await click(/^Take photo$/); await s(5000); }
await click(/^Roll$/); await s(1200); R.push(await audit("roll")); 
await p.evaluate(()=>document.querySelector('button[aria-label^="Open photo"]')?.click()); await s(1200); R.push(await audit("viewer")); await p.screenshot({path:"/tmp/bt-viewer.png"}); await click(/^Close$/); await s(700);
await click(/^Build$/); await s(2500); R.push(await audit("build")); await p.screenshot({path:"/tmp/bt-build.png"});
for (const t of ["Frame","Look","Text"]) { await click(new RegExp("^"+t+"$")); await s(700); R.push(await audit("build-"+t.toLowerCase())); }
await click(/^Looks$/); await s(2500); R.push(await audit("looks")); await p.screenshot({path:"/tmp/bt-looks.png"});
await click(/^Your profile$/); await s(1500); R.push(await audit("profile")); await p.screenshot({path:"/tmp/bt-profile.png"}); await click(/^Close profile$/); await s(700);
await click(/^Settings$/); await s(900); R.push(await audit("settings")); await p.screenshot({path:"/tmp/bt-settings.png"});
const fails=R.filter(r=>r.bad.length);
console.log(JSON.stringify({ screens:R.length, failing:fails },null,1)); console.log("errors:",JSON.stringify(errs));
await b.close(); if (fails.length||errs.length) process.exit(1);
