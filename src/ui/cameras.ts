import type { LayerSpec, OverlaySpec, Preset } from "@/engine/types";
import { PRESETS } from "@/presets";

export type Body = "compact" | "slab" | "bridge" | "toy" | "phone" | "slider" | "camcorder" | "instant";
export interface CameraDef { preset: Preset; body: Body; color: string; model: string; row: "Digicam" | "Special" }

const COLORS = ["#c9ccd1", "#2b2d33", "#d9a441", "#b5474a", "#5b8fb9", "#8fae7e", "#e8e0d0", "#8a6bb0"];
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

const FAMILY_BODY: Record<string, Body[]> = {
  "Button Phone": ["phone", "slider"],
  "VHS & Camcorder": ["camcorder"],
  "Instant Print": ["instant"],
  "Toy Lens": ["toy"],
  "35mm Scan": ["bridge", "slab"],
};
const DIGI = new Set(["Date Stamp", "Blown-out", "Night Blur", "Flash & Compact", "Golden Hour", "Button Phone"]);

export const CAMERAS: CameraDef[] = PRESETS.map((p) => {
  const h = hash(p.id);
  const bodies = FAMILY_BODY[p.family] ?? ["compact", "slab"];
  const prefix = ["CCD", "DX", "PX", "LC", "MV"][h % 5];
  return {
    preset: p,
    body: bodies[h % bodies.length],
    color: COLORS[(h >> 3) % COLORS.length],
    model: `${prefix}-${10 + ((h >> 6) % 90)}`,
    row: DIGI.has(p.family) ? "Digicam" : "Special",
  };
});

export type EffectId = "date" | "sparkle" | "frame" | "light";
export const EFFECTS: { id: EffectId; label: string }[] = [
  { id: "date", label: "Date Stamp" },
  { id: "sparkle", label: "Sparkle" },
  { id: "frame", label: "Frame" },
  { id: "light", label: "Light" },
];

/** Returns a new preset with the chosen effects stacked on top. Looks stay pure data. */
export function withEffects(base: Preset, on: Set<EffectId>): Preset {
  const layers: LayerSpec[] = [...base.layers];
  const overlays: OverlaySpec[] = [...(base.overlays ?? [])];
  if (on.has("sparkle")) {
    layers.push({ kind: "bloom", params: { threshold: 0.7, intensity: 0.7, radius: 22, warmth: 0.1 } });
    layers.push({ kind: "flare", params: { x: 0.8, y: 0.2, intensity: 0.7, hue: 330, ghosts: 0.5, streakLen: 0.7, angle: 45 } });
  }
  if (on.has("light")) layers.push({ kind: "lightLeak", params: { hue: 20, intensity: 0.55, x: 1, y: 0.4 } });
  if (on.has("date") && !overlays.some((o) => o.kind === "stamp"))
    overlays.push({ kind: "stamp", style: "seg7", format: "'YY MM DD", color: "#ff9a2e", x: 0.94, y: 0.94, size: 0.028, glow: 0.35, align: "right" });
  if (on.has("frame") && !overlays.some((o) => o.kind === "frame")) overlays.push({ kind: "frame", style: "polaroid", color: "#f4efe6" });
  return { ...base, layers, overlays };
}
