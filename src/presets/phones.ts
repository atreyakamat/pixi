import { L, preset } from "./helpers";

// Early camera-phone feels. Original recipes: tiny sensors, hard sharpening, JPEG blocks, odd colour casts.
export const candyBar = [
  preset({
    id: "cb-brick-02",
    name: "Brick Phone '02",
    family: "Button Phone",
    blurb: "First camera-phone era: tiny, yellow-green cast, huge pixels, flat contrast.",
    layers: [
      L("lofi", { pixel: 6, levels: 0.45, noise: 0.5, chromaNoise: 0.4, blocks: 0.8, sharpen: 0.5, bayer: 0.7 }),
      L("channelMix", { rGain: 1.04, gGain: 1.08, bGain: 0.9 }),
      L("grade", { exposure: 0.08, contrast: -0.05, saturation: -0.25, temperature: 0.18, tint: -0.1, fade: 0.18 }),
      L("bloom", { threshold: 0.6, intensity: 0.7, radius: 24, warmth: 0.3 }),
      L("vignette", { amount: 0.3 }),
    ],
  }),
  preset({
    id: "cb-candy-day",
    name: "Candy Bar Daylight",
    family: "Button Phone",
    blurb: "Outdoor snapshot: blown sky, crunchy edges, slightly cyan shadows.",
    layers: [
      L("lofi", { pixel: 3.5, levels: 0.2, noise: 0.3, chromaNoise: 0.3, blocks: 0.55, sharpen: 0.65, bayer: 0.4 }),
      L("grade", { exposure: 0.2, contrast: 0.25, saturation: 0.05, temperature: -0.08, tint: 0.06, highlights: -0.1 }),
      L("bloom", { threshold: 0.5, intensity: 1.0, radius: 20 }),
      L("chromatic", { amount: 0.3 }),
      L("vignette", { amount: 0.35 }),
    ],
  }),
];

export const flipPhone = [
  preset({
    id: "fp-flip-04",
    name: "Flip Phone '04",
    family: "Flip Phone",
    blurb: "Slim flip-phone snapshot: soft glow, punchy cool blues, magenta-leaning skin.",
    layers: [
      L("lofi", { pixel: 3, levels: 0.15, noise: 0.3, chromaNoise: 0.35, blocks: 0.45, sharpen: 0.5, bayer: 0.35 }),
      L("diffuse", { radius: 7, amount: 0.3 }),
      L("grade", { exposure: 0.1, contrast: 0.18, saturation: 0.2, temperature: -0.12, tint: 0.14, skinProtect: 0.5 }),
      L("bloom", { threshold: 0.55, intensity: 0.9, radius: 22, warmth: -0.15 }),
      L("chromatic", { amount: 0.2 }),
      L("vignette", { amount: 0.3 }),
    ],
  }),
  preset({
    id: "fp-flip-night",
    name: "Flip Night Flash",
    family: "Flip Phone",
    blurb: "Tiny LED flash: hot centre, dark falloff, noisy purple shadows.",
    layers: [
      L("flash", { intensity: 0.7, falloff: 1.2 }),
      L("lofi", { pixel: 3, levels: 0.3, noise: 0.65, chromaNoise: 0.65, blocks: 0.5, sharpen: 0.4, bayer: 0.5 }),
      L("grade", { exposure: 0.15, contrast: 0.2, saturation: -0.05, temperature: -0.2, tint: 0.2, shadows: 0.15 }),
      L("bloom", { threshold: 0.5, intensity: 1.0, radius: 24, warmth: -0.2 }),
      L("vignette", { amount: 0.5 }),
    ],
  }),
  preset({
    id: "fp-selfie-mirror",
    name: "Flip Mirror Selfie",
    family: "Flip Phone",
    blurb: "Outer-screen selfie: smooth, low-res, warm pink skin, soft highlights.",
    layers: [
      L("lofi", { pixel: 4, levels: 0.2, noise: 0.3, chromaNoise: 0.3, blocks: 0.5, sharpen: 0.35, bayer: 0.4 }),
      L("diffuse", { radius: 9, amount: 0.4 }),
      L("grade", { exposure: 0.15, contrast: 0.05, saturation: 0.1, temperature: 0.08, tint: 0.16, fade: 0.1, skinProtect: 0.7 }),
      L("bloom", { threshold: 0.55, intensity: 0.8, radius: 20, warmth: 0.2 }),
      L("vignette", { amount: 0.25 }),
    ],
  }),
];
