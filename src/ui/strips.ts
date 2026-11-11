/**
 * Photobooth strips. A template is data, exactly like a look: a page size, photo windows and a
 * list of things to draw. Adding a new strip style means adding an entry here, never new drawing code.
 */

export type Paint = string | { grad: "v" | "h"; stops: [number, string][] };

export interface Slot { x: number; y: number; w: number; h: number; r?: number }

export type Decor =
  | { k: "rect"; x: number; y: number; w: number; h: number; r?: number; fill?: Paint; stroke?: string; lw?: number; dash?: number[] }
  | { k: "text"; x: number; y: number; t: string; size: number; color: string; font?: "serif" | "sans" | "mono" | "slab"; weight?: string; align?: "left" | "center" | "right"; track?: number; caps?: boolean; italic?: boolean }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; color: string; lw?: number; dash?: number[] }
  | { k: "stars"; x: number; y: number; n: number; size: number; gap: number; color: string; align?: "left" | "center" }
  | { k: "barcode"; x: number; y: number; w: number; h: number; color: string; seed?: number }
  | { k: "perf"; side: "left" | "right" | "both"; r: number; gap: number; color: string; from?: number; to?: number }
  | { k: "sprocket"; side: "left" | "right" | "both"; color: string; w?: number; h?: number; gap?: number }
  | { k: "checker"; x: number; y: number; w: number; h: number; cell: number; a: string; b: string }
  | { k: "scallop"; side: "left" | "right"; r: number; color: string }
  | { k: "notch"; y: number; r: number; color: string };

export interface StripField { key: string; label: string; def: string; max: number }

export interface StripTemplate {
  id: string;
  name: string;
  family: string;
  blurb: string;
  w: number;
  h: number;
  bg: Paint;
  /** How many photos this strip holds. */
  slots: Slot[];
  under: Decor[];
  over?: Decor[];
  fields?: StripField[];
  /** Paper colour for the gap between a printed pair. */
  cut?: string;
}

const FONTS = {
  serif: 'Georgia, "Times New Roman", Times, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  slab: '"Courier New", ui-monospace, monospace',
};

/* ---------- drawing ---------- */

function paint(g: CanvasRenderingContext2D, p: Paint, x: number, y: number, w: number, h: number): string | CanvasGradient {
  if (typeof p === "string") return p;
  const grad = p.grad === "v" ? g.createLinearGradient(x, y, x, y + h) : g.createLinearGradient(x, y, x + w, y);
  for (const [o, c] of p.stops) grad.addColorStop(o, c);
  return grad;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 0) {
  g.beginPath();
  if (r <= 0) g.rect(x, y, w, h);
  else g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 ? r * 0.44 : r;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}

/** Deterministic pseudo-random, so a barcode looks the same every time the same strip is drawn. */
const rnd = (s: number) => { let x = s * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };

function drawDecor(g: CanvasRenderingContext2D, d: Decor, t: StripTemplate, vals: Record<string, string>) {
  switch (d.k) {
    case "rect": {
      roundRect(g, d.x, d.y, d.w, d.h, d.r);
      if (d.fill) { g.fillStyle = paint(g, d.fill, d.x, d.y, d.w, d.h); g.fill(); }
      if (d.stroke) { g.strokeStyle = d.stroke; g.lineWidth = d.lw ?? 2; g.setLineDash(d.dash ?? []); g.stroke(); g.setLineDash([]); }
      break;
    }
    case "text": {
      const txt = subst(d.t, vals);
      if (!txt) break;
      g.fillStyle = d.color;
      g.font = `${d.italic ? "italic " : ""}${d.weight ?? "400"} ${d.size}px ${FONTS[d.font ?? "sans"]}`;
      g.textAlign = d.align ?? "left";
      g.textBaseline = "alphabetic";
      try { g.letterSpacing = `${d.track ?? 0}px`; } catch { /* older engines ignore tracking */ }
      g.fillText(d.caps ? txt.toUpperCase() : txt, d.x, d.y);
      try { g.letterSpacing = "0px"; } catch { /* ignore */ }
      break;
    }
    case "line": {
      g.strokeStyle = d.color; g.lineWidth = d.lw ?? 2; g.setLineDash(d.dash ?? []);
      g.beginPath(); g.moveTo(d.x1, d.y1); g.lineTo(d.x2, d.y2); g.stroke(); g.setLineDash([]);
      break;
    }
    case "stars": {
      g.fillStyle = d.color;
      const total = d.n * d.size * 2 + (d.n - 1) * d.gap;
      let x = d.align === "center" ? d.x - total / 2 + d.size : d.x + d.size;
      for (let i = 0; i < d.n; i++) { star(g, x, d.y, d.size); g.fill(); x += d.size * 2 + d.gap; }
      break;
    }
    case "barcode": {
      const r = rnd(d.seed ?? 7);
      g.fillStyle = d.color;
      let x = d.x;
      while (x < d.x + d.w - 2) {
        const bw = 1 + Math.floor(r() * 4);
        if (r() > 0.38) g.fillRect(x, d.y, bw, d.h);
        x += bw + 1 + Math.floor(r() * 3);
      }
      break;
    }
    case "perf": {
      g.fillStyle = d.color;
      const from = d.from ?? 0, to = d.to ?? t.h;
      for (let y = from + d.gap / 2; y < to; y += d.gap) {
        if (d.side !== "right") { g.beginPath(); g.arc(0, y, d.r, 0, Math.PI * 2); g.fill(); }
        if (d.side !== "left") { g.beginPath(); g.arc(t.w, y, d.r, 0, Math.PI * 2); g.fill(); }
      }
      break;
    }
    case "sprocket": {
      const w = d.w ?? 16, h = d.h ?? 22, gap = d.gap ?? 20, inset = 10;
      g.fillStyle = d.color;
      for (let y = gap; y < t.h - h; y += h + gap) {
        if (d.side !== "right") { roundRect(g, inset, y, w, h, 4); g.fill(); }
        if (d.side !== "left") { roundRect(g, t.w - inset - w, y, w, h, 4); g.fill(); }
      }
      break;
    }
    case "checker": {
      const cols = Math.ceil(d.w / d.cell), rows = Math.ceil(d.h / d.cell);
      g.save(); roundRect(g, d.x, d.y, d.w, d.h); g.clip();
      for (let r2 = 0; r2 < rows; r2++) for (let c = 0; c < cols; c++) {
        g.fillStyle = (r2 + c) % 2 ? d.b : d.a;
        g.fillRect(d.x + c * d.cell, d.y + r2 * d.cell, d.cell, d.cell);
      }
      g.restore();
      break;
    }
    case "scallop": {
      g.fillStyle = d.color;
      const x = d.side === "left" ? 0 : t.w;
      for (let y = 0; y <= t.h; y += d.r * 2.05) { g.beginPath(); g.arc(x, y, d.r, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case "notch": {
      g.fillStyle = d.color;
      g.beginPath(); g.arc(0, d.y, d.r, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(t.w, d.y, d.r, 0, Math.PI * 2); g.fill();
      break;
    }
  }
}

function subst(s: string, vals: Record<string, string>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? "");
}

/** Draws a source image into a slot, cropped to fill like CSS object-fit: cover. */
function cover(g: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, s: Slot) {
  const k = Math.max(s.w / iw, s.h / ih);
  const w = iw * k, h = ih * k;
  g.save();
  roundRect(g, s.x, s.y, s.w, s.h, s.r); g.clip();
  g.drawImage(img, s.x + (s.w - w) / 2, s.y + (s.h - h) / 2, w, h);
  g.restore();
}

export interface StripPhoto { src: CanvasImageSource; w: number; h: number }

export interface RenderStripOpts {
  template: StripTemplate;
  photos: (StripPhoto | null)[];
  values?: Record<string, string>;
  /** 1 draws at the template's own size; 2 doubles it for printing. */
  scale?: number;
  /** Draw the strip twice side by side, the way a booth prints a pair to cut apart. */
  pair?: boolean;
  /** Shown where a slot has no photo yet. */
  placeholder?: boolean;
}

export function stripSize(t: StripTemplate, scale = 1, pair = false) {
  const gap = pair ? Math.round(t.w * 0.05) : 0;
  return { w: Math.round((pair ? t.w * 2 + gap : t.w) * scale), h: Math.round(t.h * scale), gap: Math.round(gap * scale) };
}

export function renderStrip(canvas: HTMLCanvasElement, o: RenderStripOpts) {
  const t = o.template, scale = o.scale ?? 1;
  const size = stripSize(t, scale, o.pair);
  canvas.width = size.w; canvas.height = size.h;
  const g = canvas.getContext("2d")!;
  g.fillStyle = t.cut ?? "#ffffff";
  g.fillRect(0, 0, size.w, size.h);

  const vals: Record<string, string> = {
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ...Object.fromEntries((t.fields ?? []).map((f) => [f.key, f.def])),
    ...(o.values ?? {}),
  };

  const once = (dx: number) => {
    g.save();
    g.translate(dx, 0);
    g.scale(scale, scale);
    g.save(); roundRect(g, 0, 0, t.w, t.h); g.clip();
    g.fillStyle = paint(g, t.bg, 0, 0, t.w, t.h);
    g.fillRect(0, 0, t.w, t.h);
    for (const d of t.under) drawDecor(g, d, t, vals);
    t.slots.forEach((s, i) => {
      const p = o.photos[i];
      if (p) cover(g, p.src, p.w, p.h, s);
      else if (o.placeholder) {
        roundRect(g, s.x, s.y, s.w, s.h, s.r);
        g.fillStyle = "rgba(0,0,0,.30)"; g.fill();
        g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; g.setLineDash([9, 9]); g.stroke(); g.setLineDash([]);
        g.fillStyle = "rgba(255,255,255,.75)";
        g.font = `600 ${Math.round(s.h * 0.16)}px ${FONTS.sans}`;
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(String(i + 1), s.x + s.w / 2, s.y + s.h / 2);
      }
    });
    for (const d of t.over ?? []) drawDecor(g, d, t, vals);
    g.restore();
    g.restore();
  };

  once(0);
  if (o.pair) once((t.w * scale) + size.gap);
}

export function stripToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.94): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not build the strip"))), type, quality));
}
