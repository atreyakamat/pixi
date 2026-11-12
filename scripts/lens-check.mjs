// Regression test: no look may drag black wedges into the corners of a photo.
//
// The lens-distortion shader had the bend inverted — it multiplied the sampling radius instead of
// dividing it, which is the inverse map. That pinched the picture and sampled past the edge of the
// texture, so every fisheye look showed hard black corners with a stair-stepped border. This runs a
// flat mid-grey photo through all looks and fails on any corner that goes dark, plus checks that a
// fisheye look actually magnifies the middle (so a "fix" that merely turns the effect off fails).
import { build } from "esbuild";
import puppeteer from "puppeteer-core";
import fs from "node:fs";

fs.writeFileSync("scripts/.lens-entry.ts", `import { applyLook } from "../src/ui/applyLook";
import { PRESETS } from "../src/presets";
(window as unknown as { t: unknown }).t = { applyLook, PRESETS };`);
try {
  await build({ entryPoints: ["scripts/.lens-entry.ts"], bundle: true, format: "iife", outfile: "/tmp/lens.js", alias: { "@": "./src" }, logLevel: "error", resolveExtensions: [".ts", ".tsx", ".js"] });
} finally {
  fs.rmSync("scripts/.lens-entry.ts", { force: true });
}

const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", protocolTimeout: 600000, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setContent("<body></body>");
await p.addScriptTag({ content: fs.readFileSync("/tmp/lens.js", "utf8") });

const r = await p.evaluate(async () => {
  const { applyLook, PRESETS } = window.t;

  // A flat, evenly lit photo: anything dark in a corner of the result came from the lens maths,
  // not from the picture. Mid grey survives tinting and monochrome looks alike.
  const src = document.createElement("canvas");
  src.width = 900; src.height = 1200;
  const sg = src.getContext("2d");
  sg.fillStyle = "#8a8f94";
  sg.fillRect(0, 0, 900, 1200);
  // A ring of marks at a known radius, to measure whether the middle is magnified.
  sg.fillStyle = "#1b1b1b";
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    sg.beginPath();
    sg.arc(450 + Math.cos(a) * 200, 600 + Math.sin(a) * 200, 10, 0, Math.PI * 2);
    sg.fill();
  }
  const blob = await new Promise((res) => src.toBlob(res, "image/jpeg", 0.95));

  const look = async (pr) => {
    const bmp = await applyLook(blob, pr, 1200);
    const k = document.createElement("canvas");
    k.width = bmp.width; k.height = bmp.height;
    const q = k.getContext("2d");
    q.drawImage(bmp, 0, 0);
    bmp.close?.();
    return { q, w: k.width, h: k.height };
  };

  // Mean luma of a small patch, as a fraction of the frame.
  const patch = ({ q, w, h }, fx, fy, fs = 0.05) => {
    const x = Math.max(0, Math.round(w * fx - (w * fs) / 2));
    const y = Math.max(0, Math.round(h * fy - (h * fs) / 2));
    const d = q.getImageData(x, y, Math.max(1, Math.round(w * fs)), Math.max(1, Math.round(h * fs))).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    return sum / (d.length / 4);
  };

  // A look that asks for the round mask ("Peephole") is meant to have dark corners, and is checked
  // the other way round: it must be round.
  const roundMask = (pr) => (pr.layers || []).some((l) => l.kind === "distort" && (l.params?.circle ?? 0) >= 0.5);

  const dark = [];
  const notRound = [];
  for (const pr of PRESETS) {
    const im = await look(pr);
    const mid = patch(im, 0.5, 0.5, 0.08);
    if (roundMask(pr)) {
      // Closer to the true corner than the artefact test: a round mask only reaches black at the
      // very corner, while a lens artefact darkens a wide wedge.
      const corners = [[0.055, 0.05], [0.945, 0.05], [0.055, 0.95], [0.945, 0.95]].map(([x, y]) => patch(im, x, y, 0.03));
      if (Math.max(...corners) > 40 || mid < 40) notRound.push({ id: pr.id, corner: Math.round(Math.max(...corners)), mid: Math.round(mid) });
      continue;
    }
    // Inset from the true corner: instant-print borders and vignettes legitimately darken the rim.
    // A lens artefact is a corner far darker than the middle while the photo itself is flat.
    const corners = [[0.14, 0.12], [0.86, 0.12], [0.14, 0.88], [0.86, 0.88]].map(([x, y]) => patch(im, x, y));
    const worst = Math.min(...corners);
    // Black wedges read as near-zero luma. A vignette dims; it does not reach black.
    if (worst < 12 && mid > 40) dark.push({ id: pr.id, worst: Math.round(worst), mid: Math.round(mid) });
  }

  // The effect must still do something: a strong fisheye has to push the ring of marks outward
  // (the middle is magnified), or a "fix" that silently disabled the bend would pass.
  const flat = { id: "_probe_flat", layers: [{ kind: "distort", params: { fisheye: 0, zoom: 1, circle: 0 } }] };
  const bent = { id: "_probe_bent", layers: [{ kind: "distort", params: { fisheye: 1, zoom: 1, circle: 0 } }] };
  const ringRadius = async (pr) => {
    const im = await look(pr);
    // Walk out from the middle along +x and find where the dark ring sits.
    for (let f = 0.5; f < 0.98; f += 0.004) {
      if (patch(im, f, 0.5, 0.012) < patch(im, 0.5, 0.5, 0.03) - 25) return f;
    }
    return -1;
  };
  const rFlat = await ringRadius(flat);
  const rBent = await ringRadius(bent);
  const bentIm = await look(bent);
  const bentCorners = [[0.14, 0.12], [0.86, 0.12], [0.14, 0.88], [0.86, 0.88]].map(([x, y]) => patch(bentIm, x, y));

  return {
    checked: PRESETS.length,
    dark,
    notRound,
    rFlat: +rFlat.toFixed(3),
    rBent: +rBent.toFixed(3),
    bentWorstCorner: Math.round(Math.min(...bentCorners)),
    bentMid: Math.round(patch(bentIm, 0.5, 0.5, 0.08)),
  };
});

console.log(JSON.stringify(r, null, 1));
await b.close();

const bulges = r.rFlat > 0 && r.rBent > r.rFlat + 0.01;      // the middle really is magnified
const cleanCorners = r.dark.length === 0 && r.bentWorstCorner >= 12;
const masksRound = r.notRound.length === 0;
if (!bulges) console.error("FAIL: a strong fisheye does not magnify the middle (ring", r.rFlat, "->", r.rBent, ")");
if (!cleanCorners) console.error("FAIL: black corners —", JSON.stringify(r.dark), "probe corner", r.bentWorstCorner);
if (!masksRound) console.error("FAIL: a round-mask look is not round —", JSON.stringify(r.notRound));
if (!bulges || !cleanCorners || !masksRound) process.exit(1);
console.log("lens-check OK");
