// The looks a studio can set as defaults, copied from the wed-idea looks list (LOOKS in
// src/lib/looks/data.ts, which is exported from engine-data.json). Only id, name and the lighting
// group are copied. Keep this list in step with wed-idea when looks change. Pixi never imports
// from wed-idea.
import type { Lighting } from "./validate";

export type LookEntry = { id: string; name: string; group: Lighting };

export const LOOKS: readonly LookEntry[] = [
  { id: "clean-daylight", name: "Clean Daylight", group: "daylight" },
  { id: "soft-pastel", name: "Soft Pastel", group: "daylight" },
  { id: "bright-airy", name: "Bright & Airy", group: "daylight" },
  { id: "garden-green", name: "Garden Green", group: "daylight" },
  { id: "coastal-blue", name: "Coastal Blue", group: "daylight" },
  { id: "golden-glow", name: "Golden Glow", group: "golden" },
  { id: "honey-film", name: "Honey Film", group: "golden" },
  { id: "warm-haze", name: "Warm Haze", group: "golden" },
  { id: "sunset-pop", name: "Sunset Pop", group: "golden" },
  { id: "dreamy-bloom", name: "Dreamy Bloom", group: "golden" },
  { id: "candlelight", name: "Candlelight", group: "indoor" },
  { id: "warm-ivory", name: "Warm Ivory", group: "indoor" },
  { id: "moody-amber", name: "Moody Amber", group: "indoor" },
  { id: "clean-indoor", name: "Clean Indoor", group: "indoor" },
  { id: "soft-skin", name: "Soft Skin", group: "indoor" },
  { id: "neon-night", name: "Neon Night", group: "stage" },
  { id: "concert-pop", name: "Concert Pop", group: "stage" },
  { id: "club-glow", name: "Club Glow", group: "stage" },
  { id: "tamed-colour", name: "Tamed Colour", group: "stage" },
  { id: "mono-punch", name: "Mono Punch", group: "stage" },
  { id: "night-glow", name: "Night Glow", group: "night" },
  { id: "flash-film", name: "Flash Film", group: "night" },
  { id: "dark-rich", name: "Dark & Rich", group: "night" },
  { id: "vintage-grain", name: "Vintage Grain", group: "night" },
  { id: "classic-bw", name: "Classic B&W", group: "night" },
];

export const LOOKS_BY_ID: ReadonlyMap<string, LookEntry> = new Map(LOOKS.map((l) => [l.id, l]));

export function looksIn(group: Lighting): LookEntry[] {
  return LOOKS.filter((l) => l.group === group);
}
