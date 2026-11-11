import puppeteer from "puppeteer-core";
import fs from "node:fs";
const RES = "android/app/src/main/res";
const N = 12, R = 31;
const pts = Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2 - Math.PI / 2; return [48 + Math.cos(a) * R, 48 + Math.sin(a) * R]; });
const mark = (tile) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#232329"/><stop offset="1" stop-color="#0a0a0d"/></linearGradient>
<radialGradient id="l" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffb066"/><stop offset=".45" stop-color="#ff7a1a"/><stop offset="1" stop-color="#7a2a00"/></radialGradient></defs>
${tile ? '<rect width="96" height="96" rx="22" fill="url(#t)"/>' : ""}
${pts.map(([x, y], i) => `<rect x="${x - 3.2}" y="${y - 3.2}" width="6.4" height="6.4" rx="1.6" fill="${i === 2 ? "#ffd8a8" : "#f4efe6"}" opacity="${i === 2 ? 1 : 0.88}"/>`).join("")}
<circle cx="48" cy="48" r="19" fill="url(#l)"/><circle cx="48" cy="48" r="11" fill="#0b0b0e"/>
<circle cx="48" cy="48" r="11" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1.5"/><circle cx="43" cy="43" r="3.2" fill="#fff" opacity=".55"/></svg>`;
fs.writeFileSync("public/icon.svg", mark(true));
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
async function png(file, w, h, html) {
  await p.setViewport({ width: w, height: h });
  await p.setContent(`<body style="margin:0;background:transparent;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center">${html}</body>`);
  const buf = await p.screenshot({ omitBackground: true });
  fs.mkdirSync(file.replace(/\/[^/]+$/, ""), { recursive: true }); fs.writeFileSync(file, buf);
}
const img = (svg, size) => `<div style="width:${size}px;height:${size}px">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</div>`;
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  const s = 48 * k, f = 108 * k;
  await png(`${RES}/mipmap-${d}/ic_launcher.png`, s, s, img(mark(true), s));
  await png(`${RES}/mipmap-${d}/ic_launcher_round.png`, s, s, `<div style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden;background:#111">${img(mark(true), s)}</div>`);
  await png(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, f, f, img(mark(false), Math.round(f * 0.62)));
}
const ports = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
for (const [d, [w, h]] of Object.entries(ports)) {
  await png(`${RES}/drawable-port-${d}/splash.png`, w, h, `<div style="background:#000;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center">${img(mark(true), Math.round(w * 0.3))}</div>`);
  await png(`${RES}/drawable-land-${d}/splash.png`, h, w, `<div style="background:#000;width:${h}px;height:${w}px;display:flex;align-items:center;justify-content:center">${img(mark(true), Math.round(w * 0.3))}</div>`);
}
await png(`${RES}/drawable/splash.png`, 480, 800, `<div style="background:#000;width:480px;height:800px;display:flex;align-items:center;justify-content:center">${img(mark(true), 144)}</div>`);
await b.close();
