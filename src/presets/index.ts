import type { Preset } from "@/engine/types";
import { blownOut, buttonPhone, dateStamp, flashCompact, nightBlur } from "./digicam";
import { creative, instant, scan35, toyLens, vhs } from "./film";
import { goldenHour } from "./golden";
import { candyBar, flipPhone } from "./phones";

export const PRESETS: Preset[] = [
  ...goldenHour,
  ...dateStamp,
  ...blownOut,
  ...nightBlur,
  ...scan35,
  ...instant,
  ...vhs,
  ...toyLens,
  ...flashCompact,
  ...buttonPhone,
  ...candyBar,
  ...flipPhone,
  ...creative,
];

export const FAMILIES = Array.from(new Set(PRESETS.map((p) => p.family)));

export const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? null;
