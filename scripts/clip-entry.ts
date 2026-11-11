import { makeDevelopClip, canMakeClip } from "../src/ui/developClip";
import { sampleScene } from "../src/ui/sampleScene";
(async () => {
  try {
    const w = window as unknown as { __done?: unknown; __err?: string };
    if (!canMakeClip()) { w.__done = { ok: false, why: "no recorder" }; return; }
    const scene = sampleScene(900, 1200);
    const blob: Blob = await new Promise((r) => scene.toBlob((b) => r(b!), "image/jpeg", 0.9));
    const t0 = performance.now();
    const r = await makeDevelopClip(blob);
    w.__done = r ? { ok: true, size: r.blob.size, ext: r.ext, type: r.blob.type, ms: Math.round(performance.now() - t0) } : { ok: false };
  } catch (e) { (window as unknown as { __err: string }).__err = String(e); }
})();
