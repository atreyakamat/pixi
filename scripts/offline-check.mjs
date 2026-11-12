// Offline: visit the hosted build once, stop the server, and the landing page, the app, a shared
// profile and the policy must all still open, and the camera must still take a photo. Web build on :3112.
import puppeteer from "puppeteer-core";
import { execSync, spawn } from "node:child_process";
// The browser's own "offline" switch does not apply to service workers, so the test takes the server away for real.
const WEB = process.env.PIXI_WEB_DIR || "/tmp/out-web";
const stopServer = () => { try { execSync('pkill -f "http.server 3112"'); } catch {} };
const startServer = () => spawn("python3", ["-m", "http.server", "3112", "-d", WEB], { detached: true, stdio: "ignore" }).unref();
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errs=[]; p.on("pageerror",e=>errs.push("PE "+e));
const s=ms=>new Promise(r=>setTimeout(r,ms)); const R={};
await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem("pixi:onboarded","1"); localStorage.setItem("pixi:settings:v1", JSON.stringify({ saveMode:"manual", sound:false })); }catch{} });
// One online visit to the landing page only: the app has never been opened.
await p.goto("http://localhost:3112/",{waitUntil:"domcontentloaded"});
R.registered = await p.evaluate(async()=>{ const reg=await navigator.serviceWorker.ready; return !!reg.active; });
await s(9000);
R.cached = await p.evaluate(async()=>{ const c=await caches.open("pixi-offline-v1"); const k=(await c.keys()).map(r=>new URL(r.url).pathname); return { total:k.length, pages:["/","/app/","/u/","/privacy/"].filter(x=>k.includes(x)).length, chunks:k.filter(x=>x.startsWith("/_next/static/")).length }; });
stopServer(); await s(800);
R.serverGone = await p.evaluate(async()=>{ try { await fetch("/sw.js?probe="+Date.now(),{cache:"no-store"}); return false; } catch { return true; } });
const open=async(path)=>{ try { await p.goto("http://localhost:3112"+path,{waitUntil:"domcontentloaded",timeout:20000}); await s(5000); return true; } catch(e){ return String(e).slice(0,80); } };
R.landing = (await open("/"))===true && await p.evaluate(()=>/Free\. On-device\. No account\./.test(document.querySelector("h1")?.innerText.replace(/\s+/g," ")||""));
R.app = (await open("/app/"))===true && await p.evaluate(()=>!!document.querySelector('nav[aria-label="Main"]') && !!document.querySelector('button[aria-label="Take photo"]'));
await p.evaluate(()=>document.querySelector('button[aria-label="Take photo"]')?.click());
for (let i=0;i<120;i++){ if (await p.evaluate(()=>!!document.querySelector('button[aria-label="Open your roll"] img'))) break; await s(250); }
R.shootsOffline = await p.evaluate(()=>!!document.querySelector('button[aria-label="Open your roll"] img'));
await p.screenshot({path:"/tmp/offline-app.png"});
R.privacy = (await open("/privacy/"))===true && await p.evaluate(()=>document.querySelector("h1")?.textContent==="Privacy");
R.profilePage = (await open("/u/"))===true && await p.evaluate(()=>/This profile link is incomplete|Opening profile/.test(document.body.innerText));
R.unknownPage = await p.evaluate(async()=>{ try { const r=await fetch("/nope/"); return r.status; } catch { return "threw"; } });
startServer(); await s(1200);
console.log(JSON.stringify(R,null,1)); console.log("errors:",JSON.stringify(errs)); await b.close();
if (!(R.serverGone&&R.registered&&R.cached.pages===4&&R.cached.chunks>5&&R.landing&&R.app&&R.shootsOffline&&R.privacy&&R.profilePage&&R.unknownPage===503)||errs.length) process.exit(1);
