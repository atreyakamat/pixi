// Measures the camera loop's frame time. Software GL here, so this is a floor, not a phone number.
import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const s=ms=>new Promise(r=>setTimeout(r,ms));
await p.evaluateOnNewDocument(()=>localStorage.setItem("pixi:onboarded","1"));
await p.goto("http://localhost:3111",{waitUntil:"domcontentloaded"}); await s(8000);
const stat = await p.evaluate(()=>new Promise(res=>{
  const d=[]; let last=performance.now(); let n=0;
  const tick=()=>{const t=performance.now();d.push(t-last);last=t;
    if(++n<180)requestAnimationFrame(tick);
    else{const a=d.slice(20).sort((x,y)=>x-y);res({frames:a.length,median:+a[Math.floor(a.length/2)].toFixed(1),p95:+a[Math.floor(a.length*0.95)].toFixed(1),worst:+a[a.length-1].toFixed(1)});}};
  requestAnimationFrame(tick);
}));
console.log(JSON.stringify(stat));
await b.close();
