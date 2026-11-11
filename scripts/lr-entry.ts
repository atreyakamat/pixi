import { RetroRenderer } from "../src/engine/renderer";
import { PRESETS } from "../src/presets";
import { sampleScene } from "../src/ui/sampleScene";
try {
  const lr = PRESETS.filter((p) => p.family === "0.1MP");
  const scene = sampleScene(600, 800);
  const gl = document.createElement("canvas");
  const r = new RetroRenderer(gl);
  r.setSource(scene, scene.width, scene.height); r.warmUp();
  const cw = 330, ch = 460;
  const out = document.getElementById("out") as HTMLCanvasElement; out.width = lr.length * cw; out.height = ch;
  const g = out.getContext("2d")!; g.fillStyle = "#111"; g.fillRect(0, 0, out.width, ch); g.imageSmoothingEnabled = false;
  lr.forEach((p, i) => {
    r.render({ preset: p, intensity: 1, mirror: false, lcd: "off", maxSide: p.captureSide ?? 1056, date: new Date(2026, 10, 10, 17, 6) }, 1);
    const ar = gl.width / gl.height; const dw = cw - 10, dh = dw / ar;
    g.drawImage(gl, i * cw + 5, 5, dw, dh); g.fillStyle = "#fff"; g.font = "13px sans-serif"; g.fillText(`${p.name}  ${gl.width}x${gl.height}`, i * cw + 6, ch - 8);
  });
  (window as unknown as { __done: boolean }).__done = true;
} catch (e) { (window as unknown as { __err: string }).__err = String(e); }
