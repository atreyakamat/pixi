// The landing page on the web build (:3112): it loads clean, the live demo really renders and
// reacts, the layout showcase draws, links go where they say, and it fits a phone and a desktop.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const errs=[]; const s=ms=>new Promise(r=>setTimeout(r,ms)); const R={};
const sig=(pg,sel)=>pg.evaluate((sel)=>{ const c=document.querySelector(sel); if(!c||!c.width) return null; const k=document.createElement("canvas"); k.width=32;k.height=32; const g=k.getContext("2d"); g.drawImage(c,0,0,32,32); const d=g.getImageData(0,0,32,32).data; let sum=0; const seen=new Set(); for(let i=0;i<d.length;i+=4){ sum+=d[i]*3+d[i+1]*5+d[i+2]*7; seen.add((d[i]>>5)+","+(d[i+1]>>5)+","+(d[i+2]>>5)); } return { sum, colours:seen.size }; },sel);
for (const [name,w,h] of [["phone",390,844],["desktop",1440,900]]) {
  const p = await b.newPage(); await p.setViewport({ width:w, height:h, deviceScaleFactor: name==="phone"?2:1 });
  p.on("pageerror",e=>errs.push(name+" PE "+e)); p.on("console",m=>{ if(m.type()==="error") errs.push(name+" CE "+m.text()); });
  p.on("requestfailed",r=>errs.push(name+" REQ "+r.url()));
  const external=[]; p.on("request",r=>{ const u=new URL(r.url()); if(u.hostname!=="localhost"&&u.protocol.startsWith("http")) external.push(r.url()); });
  await p.goto("http://localhost:3112/",{waitUntil:"domcontentloaded"}); await s(5000);
  const r={};
  r.h1 = await p.evaluate(()=>document.querySelector("h1")?.innerText.replace(/\s+/g," "));
  r.noSidewaysScroll = await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  const demo='canvas[aria-label^="A sample scene through"]';
  const a=await sig(p,demo); r.demoDraws = !!a && a.colours>12;
  await p.evaluate(()=>[...document.querySelectorAll('[aria-label="Looks"] button')][4]?.click()); await s(2500);
  const c=await sig(p,demo); r.lookChanges = !!a&&!!c&&Math.abs(a.sum-c.sum)>2000;
  await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>/Change scene/.test(x.textContent))?.click()); await s(2500);
  const d=await sig(p,demo); r.sceneChanges = !!d&&Math.abs(d.sum-c.sum)>2000;
  await p.screenshot({path:`/tmp/l-${name}-hero.png`});
  await p.evaluate(()=>document.querySelector('button[aria-label="Take a photo in the demo"]').click()); await s(1500);
  r.printAppears = await p.evaluate(()=>!!document.querySelector('img[alt="The photo you just took, developing"]')?.src.startsWith("data:image/jpeg"));
  // scroll through so the in-view animations and the showcase run
  const H=await p.evaluate(()=>document.documentElement.scrollHeight);
  for (let y=0;y<H;y+=Math.round(h*0.7)){ await p.evaluate((y)=>scrollTo(0,y),y); await s(700); }
  await s(9000);
  r.showcase = await p.evaluate(()=>[...document.querySelectorAll("figure canvas")].map(c=>{ const g=c.getContext("2d"); const dt=g.getImageData(0,0,c.width,c.height).data; const seen=new Set(); for(let i=0;i<dt.length;i+=4*503) seen.add((dt[i]>>4)+","+(dt[i+1]>>4)+","+(dt[i+2]>>4)); return seen.size; }));
  r.links = await p.evaluate(()=>({ app:[...document.querySelectorAll('a[href="/app/"]')].length, privacy:[...document.querySelectorAll('a[href="/privacy/"]')].length }));
  r.stillHidden = await p.evaluate(()=>[...document.querySelectorAll("main h2, main h3, main p")].filter(e=>parseFloat(getComputedStyle(e).opacity)<0.05 || (e.parentElement && parseFloat(getComputedStyle(e.parentElement).opacity)<0.05)).length);
  r.external = external;
  await p.evaluate(()=>scrollTo(0,0)); await s(600);
  await p.screenshot({path:`/tmp/l-${name}-full.png`, fullPage:true});
  if (name==="phone") { await Promise.all([p.waitForNavigation({waitUntil:"domcontentloaded"}), p.evaluate(()=>document.querySelector('a[href="/app/"]').click())]); await s(4000); r.appOpens = await p.evaluate(()=>location.pathname==="/app/" && (/Free\. On-device/.test(document.body.innerText) || !!document.querySelector('nav[aria-label="Main"]'))); }
  R[name]=r; await p.close();
}
console.log(JSON.stringify(R,null,1)); console.log("errors:",JSON.stringify(errs)); await b.close();
const ok = Object.values(R).every(r=>/Free\. On-device\. No account\./.test(r.h1)&&r.noSidewaysScroll&&r.demoDraws&&r.lookChanges&&r.sceneChanges&&r.printAppears&&r.showcase.length===3&&r.showcase.every(n=>n>12)&&r.links.app>=3&&r.stillHidden===0&&r.external.length===0) && R.phone.appOpens;
if (!ok||errs.length) process.exit(1);
