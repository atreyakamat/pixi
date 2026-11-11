import { layoutSize, renderLayout, isCarousel } from "../src/ui/layouts";
import { LAYOUTS as ALL } from "../src/ui/layoutTemplates";
import { sampleScene } from "../src/ui/sampleScene";
(async () => {
try {
  const scene = sampleScene(900, 700);
  const bmp = await createImageBitmap(scene);
  const photos = Array.from({ length: 12 }, () => ({ src: bmp, w: bmp.width, h: bmp.height }));
  const only = (window as unknown as { __only?: string }).__only;
  const LAYOUTS = only ? ALL.filter((t) => t.kind === only) : ALL;
  const out = document.getElementById("out") as HTMLCanvasElement;
  const COL = only ? 560 : 330, ROW = only ? 820 : 1000;
  out.width = COL * LAYOUTS.length; out.height = ROW;
  const g = out.getContext("2d")!;
  g.fillStyle = "#2a2a2e"; g.fillRect(0, 0, out.width, out.height);
  const tmp = document.createElement("canvas");
  LAYOUTS.forEach((t, i) => {
    renderLayout(tmp, {
      template: t, photos, scale: 1, placeholder: true,
      slide: { index: 2, total: 5, caption: "A good evening, and nobody wanted to go home" },
    });
    const s = layoutSize(t, 1);
    const k = Math.min((COL - 26) / s.w, (ROW - 80) / s.h);
    g.drawImage(tmp, i * COL + (COL - s.w * k) / 2, 22, s.w * k, s.h * k);
    g.fillStyle = "#fff"; g.font = "600 16px sans-serif"; g.textAlign = "center";
    g.fillText(t.name, i * COL + COL / 2, ROW - 40);
    g.fillStyle = "#9a9a9a"; g.font = "13px sans-serif";
    g.fillText(isCarousel(t) ? `carousel · ${t.w}×${t.h}` : `${t.kind} · ${t.slots.length} photos`, i * COL + COL / 2, ROW - 18);
  });
  (window as unknown as { __done: boolean }).__done = true;
} catch (e) { (window as unknown as { __err: string }).__err = String(e); }
})();
