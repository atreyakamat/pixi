import { renderStrip, stripSize } from "../src/ui/strips";
import { STRIP_TEMPLATES } from "../src/ui/stripTemplates";
import { sampleScene } from "../src/ui/sampleScene";
(async () => {
try {
  const scene = sampleScene(800, 600);
  const bmp = await createImageBitmap(scene);
  const photos = Array.from({ length: 4 }, () => ({ src: bmp, w: bmp.width, h: bmp.height }));
  const out = document.getElementById("out") as HTMLCanvasElement;
  const COL = 320, ROW = 980;
  out.width = COL * STRIP_TEMPLATES.length; out.height = ROW;
  const g = out.getContext("2d")!;
  g.fillStyle = "#2a2a2e"; g.fillRect(0, 0, out.width, out.height);
  const tmp = document.createElement("canvas");
  STRIP_TEMPLATES.forEach((t, i) => {
    renderStrip(tmp, { template: t, photos, scale: 1, placeholder: true });
    const s = stripSize(t, 1);
    const k = Math.min((COL - 24) / s.w, (ROW - 70) / s.h);
    g.drawImage(tmp, i * COL + (COL - s.w * k) / 2, 20, s.w * k, s.h * k);
    g.fillStyle = "#fff"; g.font = "16px sans-serif"; g.textAlign = "center";
    g.fillText(`${t.name} (${t.slots.length})`, i * COL + COL / 2, ROW - 24);
  });
  (window as unknown as { __done: boolean }).__done = true;
} catch (e) { (window as unknown as { __err: string }).__err = String(e); }
})();
