// Regression test: a photo put through a real look must come out the right way up and unmirrored.
// (Two earlier bugs: ImageBitmap sources ignore WebGL's flip-Y, in Build's per-page looks and in
// the viewfinder's "use a photo" path.)
import { build } from "esbuild"; import puppeteer from "puppeteer-core"; import fs from "node:fs";
fs.writeFileSync("scripts/.orient-entry.ts", `import { applyLook } from "../src/ui/applyLook";
import { PRESETS } from "../src/presets";
(window as unknown as { t: unknown }).t = { applyLook, PRESETS };`);
try { await build({ entryPoints: ["scripts/.orient-entry.ts"], bundle: true, format: "iife", outfile: "/tmp/orient.js", alias: { "@": "./src" }, logLevel: "error", resolveExtensions: [".ts", ".tsx", ".js"] }); }
finally { fs.rmSync("scripts/.orient-entry.ts", { force: true }); }
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage(); await p.setContent("<body></body>"); await p.addScriptTag({ content: fs.readFileSync("/tmp/orient.js","utf8") });
const r = await p.evaluate(async () => {
  const { applyLook, PRESETS } = window.t;
  const c=document.createElement("canvas"); c.width=600;c.height=900; const g=c.getContext("2d");
  // Brightness pattern, so monochrome and tinted looks are judged too: light top, dark bottom,
  // and a dark bar down the left of the light band (catches mirroring).
  g.fillStyle="#f4f4f4"; g.fillRect(0,0,600,450); g.fillStyle="#0a0a0a"; g.fillRect(0,450,600,450); g.fillRect(0,0,270,450);
  const blob = await new Promise(r=>c.toBlob(r,"image/jpeg",0.95));
  const read=(bmp)=>{ const k=document.createElement("canvas"); k.width=bmp.width;k.height=bmp.height; const q=k.getContext("2d"); q.drawImage(bmp,0,0);
    const Y=(x,y)=>{ const d=q.getImageData(Math.round(k.width*x),Math.round(k.height*y),1,1).data; return d[0]*0.3+d[1]*0.59+d[2]*0.11; };
    // Samples sit near the centre so instant-print borders and fisheye corners do not get in the way.
    return Y(0.62,0.36) > Y(0.62,0.64) + 40 && Y(0.62,0.36) > Y(0.36,0.36) + 40; };
  const picks = PRESETS;
  const bad = [];
  for (const pr of picks) if (!read(await applyLook(blob, pr, 900))) bad.push(pr.id);
  return { checked: picks.length, upright: picks.length - bad.length, bad };
});
console.log(JSON.stringify(r)); await b.close();
if (r.bad.length) process.exit(1);
