import { RetroRenderer } from "../src/engine/renderer";
import { PRESETS } from "../src/presets";
import { sampleScene } from "../src/ui/sampleScene";
try {
  const scene = sampleScene(600, 800);
  const gl = document.createElement("canvas");
  const r = new RetroRenderer(gl);
  r.setSource(scene, scene.width, scene.height);
  r.warmUp();
  const cols = 8, cw = 150, ch = 200, rows = Math.ceil(PRESETS.length / cols);
  const out = document.getElementById("out") as HTMLCanvasElement;
  out.width = cols * cw; out.height = rows * ch;
  const g = out.getContext("2d")!;
  g.fillStyle = "#111"; g.fillRect(0, 0, out.width, out.height);
  PRESETS.forEach((p, i) => {
    r.render({ preset: p, intensity: 1, mirror: false, lcd: "off", maxSide: 400, date: new Date(2026, 10, 10, 17, 6) }, 1);
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    const ar = gl.width / gl.height; let dw = cw - 6, dh = dw / ar; if (dh > ch - 22) { dh = ch - 22; dw = dh * ar; }
    g.drawImage(gl, x + (cw - dw) / 2, y + 3, dw, dh);
    g.fillStyle = "#fff"; g.font = "10px sans-serif"; g.fillText(p.name.slice(0, 22), x + 4, y + ch - 6);
  });
  // Distinctness metric: 12x16 colour signature per look (stamps/frames excluded), mean abs RGB distance.
  const sig: number[][] = [];
  const sm = document.createElement("canvas"); sm.width = 12; sm.height = 16; const sg = sm.getContext("2d", { willReadFrequently: true })!;
  PRESETS.forEach((p) => {
    r.render({ preset: { ...p, overlays: [] }, intensity: 1, mirror: false, lcd: "off", maxSide: 240, date: new Date() }, 1);
    sg.fillStyle = "#000"; sg.fillRect(0, 0, 12, 16); sg.drawImage(gl, 0, 0, 12, 16);
    sig.push(Array.from(sg.getImageData(0, 0, 12, 16).data).filter((_, i) => i % 4 !== 3));
  });
  const pairs: [number, string, string][] = [];
  for (let i = 0; i < sig.length; i++) for (let j = i + 1; j < sig.length; j++) {
    let d = 0; for (let k = 0; k < sig[i].length; k++) d += Math.abs(sig[i][k] - sig[j][k]);
    pairs.push([d / sig[i].length, PRESETS[i].id, PRESETS[j].id]);
  }
  pairs.sort((a, b) => a[0] - b[0]);
  (window as any).__pairs = pairs.slice(0, 40).map((x) => x[0].toFixed(1) + " " + x[1] + " ~ " + x[2]);
  (window as any).__n = PRESETS.length; (window as any).__done = true;
} catch (e) { (window as any).__err = String(e) + " " + (e as Error).stack; }
