import { RetroRenderer } from "@/engine/renderer";
import type { Preset } from "@/engine/types";

let r: RetroRenderer | null = null;
let canvas: HTMLCanvasElement | null = null;
let chain: Promise<unknown> = Promise.resolve();

/**
 * Puts a look through the same engine the camera uses, on a photo that already exists.
 * Work is queued so filling a whole strip never blocks the interface.
 */
export function applyLook(blob: Blob, preset: Preset | null, maxSide = 1000): Promise<ImageBitmap> {
  const job = chain.then(async () => {
    const src = await createImageBitmap(blob);
    if (!preset) return src;
    try {
      if (!canvas) { canvas = document.createElement("canvas"); r = new RetroRenderer(canvas); r.warmUp(); }
      r!.setSource(src, src.width, src.height);
      r!.render({ preset: { ...preset, overlays: preset.overlays ?? [] }, intensity: 1, mirror: false, lcd: "off", maxSide, aspect: src.width / src.height, date: new Date() }, 1);
      const out = await createImageBitmap(canvas);
      src.close();
      return out;
    } catch {
      return src; // a GL failure must still give the strip a photo to show
    }
  });
  chain = job.catch(() => null);
  return job;
}
