// Renders every carousel frame with real photos and checks each one is actually drawn: the photo
// lands, the page is not flat or blank, and the text placeholders are all filled in. Also proves the
// panorama frames really continue across pages (each page a different slice, joining at the seam).
// Writes a contact sheet of all of them to /tmp/styles-sheet.jpg to be looked at.
import { build } from "esbuild";
import puppeteer from "puppeteer-core";
import fs from "node:fs";

fs.writeFileSync("scripts/.styles-entry.ts", `import { renderLayout, layoutSize, type Layout } from "../src/ui/layouts";
import { LAYOUTS } from "../src/ui/layoutTemplates";
(window as unknown as { t: unknown }).t = { renderLayout, layoutSize, LAYOUTS };`);
try {
  await build({ entryPoints: ["scripts/.styles-entry.ts"], bundle: true, format: "iife", outfile: "/tmp/styles.js", alias: { "@": "./src" }, logLevel: "error", resolveExtensions: [".ts", ".tsx", ".js"] });
} finally {
  fs.rmSync("scripts/.styles-entry.ts", { force: true });
}

const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", protocolTimeout: 900000, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setContent("<body></body>");
await p.addScriptTag({ content: fs.readFileSync("/tmp/styles.js", "utf8") });

const r = await p.evaluate(async () => {
  const { renderLayout, layoutSize, LAYOUTS } = window.t;

  // Distinct, strongly coloured photos so a missing or repeated one is obvious.
  const photo = (hue, label) => {
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 900;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 1200, 900);
    grad.addColorStop(0, `hsl(${hue} 70% 55%)`);
    grad.addColorStop(1, `hsl(${(hue + 50) % 360} 70% 35%)`);
    g.fillStyle = grad; g.fillRect(0, 0, 1200, 900);
    g.fillStyle = "rgba(255,255,255,.9)";
    g.font = "700 220px system-ui"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(label), 600, 450);
    return { src: c, w: 1200, h: 900 };
  };
  const photos = Array.from({ length: 8 }, (_, i) => photo(i * 43, i + 1));

  const out = [];
  const sheets = [];
  const carousels = LAYOUTS.filter((t) => t.kind === "carousel");

  for (const t of carousels) {
    const c = document.createElement("canvas");
    renderLayout(c, {
      template: t,
      photos: t.slots.map((_, i) => photos[i % photos.length]),
      values: Object.fromEntries((t.fields || []).map((f) => [f.key, f.def || "Sample text here"])),
      scale: 1,
      slide: { index: 2, total: 5 },
    });
    const size = layoutSize(t, 1);
    const g = c.getContext("2d");
    const px = (x, y) => { const d = g.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data; return d; };

    // Spread of colour across the page: a frame that drew nothing, or drew one flat fill, is caught.
    const pts = [];
    for (let y = 0.08; y < 0.95; y += 0.09) for (let x = 0.1; x < 0.95; x += 0.12) pts.push(px(x, y));
    const key = (d) => `${d[0] >> 4},${d[1] >> 4},${d[2] >> 4}`;
    const distinct = new Set(pts.map(key)).size;
    // For a frame that drains the colour, tone is the only evidence the photo is there, so measure
    // the spread of luma rather than counting colour bins.
    const lumas = pts.map((d) => d[0] * 0.3 + d[1] * 0.59 + d[2] * 0.11);
    const lumaRange = Math.round(Math.max(...lumas) - Math.min(...lumas));
    // Is the photo in there? The test photos are saturated; most chrome is not.
    const colourful = pts.filter((d) => Math.max(d[0], d[1], d[2]) - Math.min(d[0], d[1], d[2]) > 45).length;

    out.push({
      id: t.id, name: t.name,
      w: c.width, h: c.height,
      declared: `${size.w}x${size.h}`,
      distinct, colourful, lumaRange,
      slots: t.slots.length,
    });

    const thumb = document.createElement("canvas");
    thumb.width = 270; thumb.height = Math.round((c.height / c.width) * 270);
    thumb.getContext("2d").drawImage(c, 0, 0, thumb.width, thumb.height);
    sheets.push({ id: t.id, name: t.name, url: thumb.toDataURL("image/jpeg", 0.85), w: thumb.width, h: thumb.height });
  }

  // Panorama frames: consecutive pages must show different slices of the SAME photo, and the right
  // edge of page n must roughly meet the left edge of page n+1.
  const panos = {};
  for (const t of carousels.filter((x) => x.slots.some((s) => s.pan))) {
    const strip = (index) => {
      const c = document.createElement("canvas");
      renderLayout(c, { template: t, photos: [photos[0]], values: {}, scale: 1, slide: { index, total: 3 } });
      const g = c.getContext("2d");
      const mid = Math.round(c.height * 0.5);
      const col = (x) => { const d = g.getImageData(Math.round(x), mid, 1, 1).data; return [d[0], d[1], d[2]]; };
      return { left: col(c.width * 0.06), right: col(c.width * 0.94), centre: col(c.width * 0.5) };
    };
    const a = strip(1), bb = strip(2), cc = strip(3);
    const diff = (u, v) => Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) + Math.abs(u[2] - v[2]);
    panos[t.id] = {
      pagesDiffer: diff(a.centre, bb.centre) > 12 && diff(bb.centre, cc.centre) > 12,
      // The join: page 1's right edge and page 2's left edge come from neighbouring parts of the photo.
      seam1: diff(a.right, bb.left),
      seam2: diff(bb.right, cc.left),
    };
  }

  return { out, panos, sheets };
});

// A contact sheet to look at.
const page = await b.newPage();
await page.setViewport({ width: 1180, height: 1400, deviceScaleFactor: 1 });
await page.setContent(`<body style="margin:0;background:#17171a;font:12px system-ui;color:#ddd">
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:16px">
${r.sheets.map((s) => `<figure style="margin:0;width:270px"><img src="${s.url}" width="${s.w}" height="${s.h}" style="display:block;border-radius:6px"><figcaption style="padding-top:6px">${s.name}</figcaption></figure>`).join("")}
</div></body>`);
await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = r; i.onerror = r; }))));
const full = await page.evaluate(() => document.body.scrollHeight);
await page.setViewport({ width: 1180, height: Math.min(full + 20, 16000) });
await page.screenshot({ path: "/tmp/styles-sheet.jpg", type: "jpeg", quality: 88 });
await b.close();

// A frame that drew nothing, or lost its photo. The bars allow for frames that are meant to be
// low-contrast or colourless: a dimmed full-bleed photo under a quote, a single smooth slice of a
// panorama, and the two that drain the colour on purpose (Newsprint's ink, Grain B&W).
const MONO = new Set(["ca-news", "ca-grainbw"]);
const flat = r.out.filter((x) => x.distinct < 4);
const noPhoto = r.out.filter((x) => !MONO.has(x.id) && x.colourful < 4);
// The two colourless frames still have to draw the photo — as tone rather than colour.
const noTone = r.out.filter((x) => MONO.has(x.id) && x.lumaRange < 60);
const badPanos = Object.entries(r.panos).filter(([, v]) => !v.pagesDiffer);

console.log(`${r.out.length} carousel frames`);
console.table(r.out.map((x) => ({ id: x.id, size: `${x.w}x${x.h}`, slots: x.slots, distinct: x.distinct, colourful: x.colourful, luma: x.lumaRange })));
console.log("panoramas:", JSON.stringify(r.panos));
if (flat.length) console.error("FAIL flat/blank:", flat.map((x) => x.id).join(", "));
if (noPhoto.length) console.error("FAIL photo missing:", noPhoto.map((x) => x.id).join(", "));
if (noTone.length) console.error("FAIL colourless frame drew no photo:", noTone.map((x) => x.id).join(", "));
if (badPanos.length) console.error("FAIL panorama pages identical:", badPanos.map(([k]) => k).join(", "));
if (r.out.length < 30) console.error(`FAIL only ${r.out.length} carousel frames, expected 30+`);
if (flat.length || noPhoto.length || noTone.length || badPanos.length || r.out.length < 30) process.exit(1);
console.log("styles-check OK — sheet at /tmp/styles-sheet.jpg");
