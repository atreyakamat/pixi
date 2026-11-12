// Profile: fill it in, feature photos and looks, the card draws, the link round-trips through /u/
// on the web build and adds the looks to that browser's Pixi. Needs the app build on :3111 and the web build on :3112.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; const watch=(pg,tag)=>{ pg.on("pageerror",e=>errs.push(tag+" PE "+e)); pg.on("console",m=>{ if(m.type()==="error") errs.push(tag+" CE "+m.text()); }); }; watch(p,"app");
const s=ms=>new Promise(r=>setTimeout(r,ms));
const click=(pg,re)=>pg.evaluate(x=>{const r=new RegExp(x,"i");const el=[...document.querySelectorAll("button,a")].find(b=>r.test(b.textContent.trim())||r.test(b.getAttribute("aria-label")||""));el?.click();return !!el;},re.source);
const type=async(ph,v)=>{ await p.click(`input[placeholder="${ph}"]`); await p.keyboard.type(v,{delay:5}); };
await p.evaluateOnNewDocument(()=>{ localStorage.setItem("pixi:onboarded","1"); localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode:"manual", sound:false, advanced:true })); navigator.share=undefined; window.__clip=""; Object.defineProperty(navigator,"clipboard",{value:{writeText:async(t)=>{window.__clip=t;}},configurable:true}); });
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(6000);
for (let i=0;i<3;i++){ await click(p,/^Take photo$/); await s(5000); }
const R={};
await click(p,/^Looks$/); await s(2500);
// make one custom look so the link carries a whole look, not just ids
await p.evaluate(()=>document.querySelector('button[aria-label^="Edit Birch Sun"]')?.click()); await s(1800);
await click(p,/^Save to My Looks$/); await s(900); await click(p,/^Close$/); await s(900);
R.entry = await click(p,/^Your profile$/); await s(1200);
await p.screenshot({path:"/tmp/s-profile-empty.png"});
R.disabledUntilNamed = await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>/Share card/.test(b.textContent)).disabled);
await type("Your name","Atreya Kamat"); await type("yourhandle","@Atreya.MP4 !!"); await type("One line about how you shoot","Goa, golden hour, cheap cameras");
R.handle = await p.evaluate(()=>document.querySelector('input[placeholder="yourhandle"]').value);
await p.evaluate(()=>document.querySelector('button[aria-label="Use this photo as your picture"]')?.click()); await s(900);
await p.evaluate(()=>[...document.querySelectorAll('button[aria-label="Add this photo to your card"]')].slice(0,3).forEach(b=>b.click())); await s(1500);
R.looksOffered = await p.evaluate(()=>[...document.querySelectorAll("button[aria-pressed]")].filter(b=>b.className.includes("rounded-full")&&b.className.includes("px-3.5")).length);
await p.evaluate(()=>{ const chips=[...document.querySelectorAll("button[aria-pressed]")].filter(b=>b.className.includes("px-3.5")); const mine=chips.find(c=>/yours/.test(c.textContent)); mine?.click(); chips.filter(c=>c!==mine).slice(0,2).forEach(c=>c.click()); }); await s(2500);
R.card = await p.evaluate(()=>{ const c=document.querySelector('canvas[aria-label="Your profile card"]'); const g=c.getContext("2d"); const d=g.getImageData(0,0,c.width,c.height).data; const seen=new Set(); for(let i=0;i<d.length;i+=4*997) seen.add((d[i]>>4)+","+(d[i+1]>>4)+","+(d[i+2]>>4)); return { w:c.width, h:c.height, colours:seen.size }; });
await p.evaluate(()=>document.querySelector("main .overflow-y-auto")?.scrollTo(0,0)); await s(400);
await p.screenshot({path:"/tmp/s-profile.png"});
await click(p,/Show your profile QR code/); await s(900);
R.qr = await p.evaluate(()=>!!document.querySelector('[role="dialog"][aria-label="Your profile QR code"] img'));
await p.screenshot({path:"/tmp/s-profile-qr.png"});
await p.evaluate(()=>document.querySelector('[role="dialog"][aria-label="Your profile QR code"]')?.click()); await s(600);
await click(p,/Share your profile link/); await s(900);
const link = await p.evaluate(()=>window.__clip);
R.link = /^http:\/\/localhost:3111\/u\/#p=PIXIU1\./.test(link); R.linkLength = link.length;
await click(p,/Keep the card in your roll/); await s(3500);
R.kept = await p.evaluate(()=>/Card added to your roll/.test(document.querySelector('[role="status"]')?.textContent||""));
R.persisted = await p.evaluate(()=>{ const v=JSON.parse(localStorage.getItem("pixi:profile:v1")||"{}"); return v.handle==="atreya.mp4" && v.photoIds.length===3 && v.lookIds.length===3 && (v.avatar||"").startsWith("data:image/jpeg"); });

// Someone else opens the link on the hosted site, in a clean browser.
const ctx = await b.createBrowserContext(); const q = await ctx.newPage(); watch(q,"web"); await q.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await q.goto(link.replace("localhost:3111","localhost:3112"),{waitUntil:"domcontentloaded"}); await s(9000);
R.view = await q.evaluate(()=>({ name: document.querySelector("h1")?.textContent, handle: /@atreya\.mp4/.test(document.body.innerText), bio: /golden hour/.test(document.body.innerText), tiles: document.querySelectorAll("figure").length, rendered: [...document.querySelectorAll("figure img")].length }));
await q.screenshot({path:"/tmp/s-u.png", fullPage:true});
await click(q,/^Add these 3 looks to my Pixi$/); await s(600);
R.added = await q.evaluate(()=>({ said: /Added\. They are waiting/.test(document.body.innerText), mine: JSON.parse(localStorage.getItem("pixi:looks:v1")||"[]").length, favs: JSON.parse(localStorage.getItem("pixi:favs:v1")||"[]").length }));
// A mangled link is refused politely, and a hostile one cannot inject markup.
await q.goto("http://localhost:3112/u/#p=PIXIU1.AAAA",{waitUntil:"domcontentloaded"}); await q.reload(); await s(2500);
R.badLink = await q.evaluate(()=>/This profile link is incomplete/.test(document.body.innerText));
const evil = await p.evaluate(async()=>{ const raw=new TextEncoder().encode(JSON.stringify({v:1,n:'<img src=x onerror="window.__xss=1">',h:'<script>',b:'x'.repeat(5000),k:["nope",{l:[{kind:"evil",params:{}}]},"gh-honey-hour"]})); return "PIXIU0."+btoa(String.fromCharCode(...raw)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); });
await q.goto("http://localhost:3112/u/#p="+evil,{waitUntil:"domcontentloaded"}); await q.reload(); await s(4000);
R.hostile = await q.evaluate(()=>({ xss: !!window.__xss, imgInjected: !!document.querySelector('h1 img'), handle: (document.body.innerText.match(/@\S+/)||[""])[0], bioLen: [...document.querySelectorAll("p")].map(e=>e.textContent.length).reduce((a,b)=>Math.max(a,b),0), tiles: document.querySelectorAll("figure").length }));

// Back in the app, pasting the code on the Share screen imports it too.
await click(p,/^Close profile$/); await s(700); await click(p,/Share and receive looks/); await s(1200);
const before = await p.evaluate(()=>JSON.parse(localStorage.getItem("pixi:looks:v1")||"[]").length);
await p.evaluate((code)=>{ const i=document.querySelector('input[placeholder="A look or profile code"]'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; set.call(i,code); i.dispatchEvent(new Event("input",{bubbles:true})); }, link); await s(300);
await p.evaluate(()=>{ const i=document.querySelector('input[placeholder="A look or profile code"]'); [...i.parentElement.querySelectorAll("button")].pop()?.click(); }); await s(1500);
R.pasteImport = await p.evaluate((before)=>({ msg: /Added 3 looks from @atreya\.mp4/.test(document.body.innerText), grew: JSON.parse(localStorage.getItem("pixi:looks:v1")||"[]").length - before }), before);

console.log(JSON.stringify(R,null,1)); console.log("errors:",JSON.stringify(errs)); await b.close();
const ok = R.entry && R.disabledUntilNamed && R.handle==="atreya.mp4" && R.card.colours>20 && R.qr && R.link && R.kept && R.persisted && R.view.name==="Atreya Kamat" && R.view.handle && R.view.bio && R.view.tiles===3 && R.added.said && R.added.mine===1 && R.added.favs===2 && R.badLink && !R.hostile.xss && !R.hostile.imgInjected && R.hostile.bioLen<=200 && R.hostile.tiles===1 && R.pasteImport.msg && R.pasteImport.grew===1;
if (!ok || errs.length) process.exit(1);
