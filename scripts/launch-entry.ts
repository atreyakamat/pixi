/**
 * Runs inside headless Chrome for the launch kit. Turns photos (the person's own, or the built-in
 * stand-in scenes) into Pixi-processed stills with the real look engine, and records the 15-second
 * App Store preview with MediaRecorder.
 */
import { applyLook } from "../src/ui/applyLook";
import { PRESETS } from "../src/presets";
import { SCENES } from "../src/landing/scenes";
import { renderLayout } from "../src/ui/layouts";
import { layoutById } from "../src/ui/layoutTemplates";

type W = Window & { kit?: unknown; __err?: string };

/* ------------------------------------------------------------------ */
/* Stand-in scenes. Only used when no photos are passed in; real photos  */
/* make a far better App Store page.                                     */
/* ------------------------------------------------------------------ */



function canvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}

async function toBlob(c: HTMLCanvasElement) { return new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.92)); }

/** Photos to use: the ones passed in (data URLs), or the stand-in scenes. */
async function sources(urls: string[]): Promise<Blob[]> {
  if (urls.length) return Promise.all(urls.map(async (u) => (await fetch(u)).blob()));
  return Promise.all(SCENES.map((f) => toBlob(f())));
}

const LOOKS = ["gh-honey-hour", "mn-night-streak", "gh-kitchen-glow", "ip-soft-glow", "dp-party", "s8-warm"];
const lookOf = (i: number) => {
  const p = PRESETS.find((x) => x.id === LOOKS[i % LOOKS.length]);
  if (!p) throw new Error(`launch kit: no look with id ${LOOKS[i % LOOKS.length]}`);
  return p;
};

async function bitmapToDataUrl(b: ImageBitmap) {
  const [c, g] = canvas(b.width, b.height); g.drawImage(b, 0, 0);
  return c.toDataURL("image/jpeg", 0.9);
}

/** Each source photo with a Pixi look applied, as data URLs, plus the raw originals. */
async function processed(urls: string[]) {
  const src = await sources(urls);
  const out: { raw: string; look: string; name: string }[] = [];
  for (let i = 0; i < src.length; i++) {
    const p = lookOf(i);
    const bmp = await applyLook(src[i], p, 1400);
    out.push({ raw: URL.createObjectURL(src[i]), look: await bitmapToDataUrl(bmp), name: p.name });
    bmp.close();
  }
  return out;
}

async function loadImg(u: string) { const i = new Image(); i.src = u; await i.decode(); return i; }

/* ------------------------------------------------------------------ */
/* The 15-second promo film (Product Hunt, Play promo, social).        */
/* Not an App Store app preview: Apple requires those to be real screen */
/* recordings of the app. See docs/LAUNCH.md.                           */
/* ------------------------------------------------------------------ */

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeIO = (t: number) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const chem = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t) ** 1; };

async function preview(urls: string[], W = 1080, H = 1920, seconds = 15): Promise<string> {
  const shots = await processed(urls);
  const looks = await Promise.all(shots.map((s) => loadImg(s.look)));
  const raws = await Promise.all(shots.map((s) => loadImg(s.raw)));
  // Carousel pages rendered by the real layout engine.
  const tpl = layoutById("ca-instant");
  const pages: HTMLCanvasElement[] = [];
  for (let i = 0; i < Math.min(5, looks.length); i++) {
    const c = document.createElement("canvas");
    renderLayout(c, { template: tpl, photos: [{ src: looks[i], w: looks[i].naturalWidth, h: looks[i].naturalHeight }], scale: 1, slide: { index: i, total: Math.min(5, looks.length), caption: ["golden hour", "", "", "", ""][i] } });
    pages.push(c);
  }

  const [c, g] = canvas(W, H);
  const FPS = 30;
  const stream = c.captureStream(FPS);
  const type = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t))!;
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => { rec.onstop = () => r(); });

  const font = (wt: number, px: number) => `${wt} ${px}px -apple-system, "SF Pro Display", "Helvetica Neue", Inter, system-ui, sans-serif`;
  const center = (txt: string, y: number, px: number, wt: number, col: string, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.font = font(wt, px); g.textAlign = "center"; g.fillText(txt, W / 2, y); g.globalAlpha = 1; };
  const cover = (img: CanvasImageSource, iw: number, ih: number, x: number, y: number, w: number, h: number) => { const k = Math.max(w / iw, h / ih); g.drawImage(img, x + (w - iw * k) / 2, y + (h - ih * k) / 2, iw * k, ih * k); };
  const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

  const frame = (t: number) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    // 0–2.6 s: the promise.
    if (t < 2.9) {
      const a = Math.min(ease(t / 0.6), 1 - ease((t - 2.3) / 0.6));
      center("Free. On-device.", H * 0.46, 92, 700, "#fff", a);
      center("No account.", H * 0.46 + 110, 92, 700, "#fff", a);
      center("Pixi", H * 0.46 + 230, 40, 600, "#ffc247", a * ease((t - 0.7) / 0.6));
      return;
    }
    // 2.9–5.2 s: a viewfinder with the look live, then the shutter.
    const vf = { x: 60, y: 240, w: W - 120, h: (W - 120) * 4 / 3 };
    if (t < 5.4) {
      const k = t - 2.9;
      g.save(); rr(vf.x, vf.y, vf.w, vf.h, 44); g.clip();
      const zoom = 1.06 - 0.06 * ease(k / 2.3);
      cover(looks[0], looks[0].naturalWidth * zoom, looks[0].naturalHeight * zoom, vf.x, vf.y, vf.w, vf.h);
      g.restore();
      center(shots[0].name, vf.y + vf.h + 80, 44, 600, "#fff", ease(k / 0.5));
      // shutter button
      const press = t > 4.4 && t < 4.6 ? 0.9 : 1;
      g.beginPath(); g.arc(W / 2, H - 150, 74, 0, 7); g.strokeStyle = "#fff"; g.lineWidth = 8; g.stroke();
      g.beginPath(); g.arc(W / 2, H - 150, 60 * press, 0, 7); g.fillStyle = "#fff"; g.fill();
      if (t > 4.45) { g.globalAlpha = Math.max(0, 1 - (t - 4.45) / 0.45); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      return;
    }
    // 5.4–9.6 s: the develop. The print rises and the picture comes up.
    if (t < 9.8) {
      const k = t - 5.4;
      g.fillStyle = "#0e0d0c"; g.fillRect(0, 0, W, H);
      const pool = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 1000); pool.addColorStop(0, "rgba(255,236,205,.16)"); pool.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = pool; g.fillRect(0, 0, W, H);
      const enter = ease(k / 0.9);
      const cw = 720, ch = 880, cx = (W - cw) / 2, cy = (H - ch) / 2 - 40 + (1 - enter) * 260;
      g.save(); g.translate(W / 2, cy + ch / 2); g.rotate((1 - enter) * -0.1 - 0.02); g.translate(-W / 2, -(cy + ch / 2));
      g.shadowColor = "rgba(0,0,0,.7)"; g.shadowBlur = 70; g.shadowOffsetY = 30;
      g.fillStyle = "#FBF8F2"; rr(cx, cy, cw, ch, 12); g.fill(); g.shadowColor = "transparent";
      const win = { x: cx + 36, y: cy + 36, w: cw - 72, h: cw - 72 };
      g.fillStyle = "#EFEAE0"; g.fillRect(win.x, win.y, win.w, win.h);
      const d = chem((k - 0.5) / 3.2);
      g.save(); g.beginPath(); g.rect(win.x, win.y, win.w, win.h); g.clip();
      g.globalAlpha = 0.08 + 0.92 * d;
      g.filter = `brightness(${(2.1 - 1.1 * d).toFixed(3)}) contrast(${(0.18 + 0.82 * d).toFixed(3)}) saturate(${(0.05 + 0.95 * d).toFixed(3)}) sepia(${(0.6 * (1 - d)).toFixed(3)})`;
      cover(looks[0], looks[0].naturalWidth, looks[0].naturalHeight, win.x, win.y, win.w, win.h);
      g.filter = "none"; g.globalAlpha = 1; g.restore();
      g.fillStyle = "#9a9185"; g.font = font(500, 26); g.textAlign = "center"; g.globalAlpha = ease((k - 3.4) / 0.5); g.fillText("PIXI", W / 2, cy + ch - 70); g.globalAlpha = 1;
      g.restore();
      center("Every shot develops.", H - 260, 58, 700, "#fff", ease((k - 0.6) / 0.6) * (1 - ease((k - 3.9) / 0.4)));
      return;
    }
    // 9.8–13.2 s: the roll pours into a carousel.
    if (t < 13.2) {
      const k = t - 9.8;
      g.fillStyle = "#0b0b0c"; g.fillRect(0, 0, W, H);
      center("Pour a roll into a carousel.", 300, 58, 700, "#fff", ease(k / 0.5));
      const pw = 620, ph = pw * 1350 / 1080, gap = 50;
      const scroll = easeIO((k - 0.6) / 2.4) * (pw + gap) * (pages.length - 1.4);
      pages.forEach((p, i) => {
        const x = (W - pw) / 2 + i * (pw + gap) - scroll;
        const arrive = ease((k - i * 0.12) / 0.6);
        const y = 460 + (1 - arrive) * 140;
        g.globalAlpha = arrive;
        g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 40; g.shadowOffsetY = 18;
        g.drawImage(p, x, y, pw, ph);
        g.shadowColor = "transparent"; g.globalAlpha = 1;
      });
      center("1080 × 1350 · ready for your feed", 460 + ph + 110, 34, 500, "rgba(255,255,255,.55)", ease((k - 1) / 0.5));
      return;
    }
    // 13.2–15 s: the end card.
    const k = t - 13.2;
    const a = ease(k / 0.5);
    g.globalAlpha = a;
    // a strip of the processed shots
    const n = Math.min(4, raws.length), sw = 190, sh = 250;
    for (let i = 0; i < n; i++) { const x = W / 2 - (n * (sw + 16)) / 2 + i * (sw + 16); g.save(); rr(x, H * 0.24, sw, sh, 18); g.clip(); cover(looks[i], looks[i].naturalWidth, looks[i].naturalHeight, x, H * 0.24, sw, sh); g.restore(); }
    g.globalAlpha = 1;
    center("Pixi", H * 0.52, 120, 800, "#fff", a);
    center("Free. On-device. No account.", H * 0.52 + 100, 46, 500, "rgba(255,255,255,.7)", a);
    center("Your photos never leave the phone.", H * 0.52 + 170, 34, 500, "#ffc247", ease((k - 0.4) / 0.5));
  };

  frame(0); rec.start(250);
  const t0 = performance.now();
  // Draw on a timer rather than rAF so a slow headless renderer cannot speed the film up or slow it down.
  await new Promise<void>((res) => {
    const tick = () => { const t = (performance.now() - t0) / 1000; frame(Math.min(t, seconds)); if (t < seconds) setTimeout(tick, 1000 / FPS / 2); else res(); };
    tick();
  });
  rec.stop(); await done;
  const blob = new Blob(chunks, { type: rec.mimeType });
  return await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(blob); });
}

(window as W).kit = { applyLook, PRESETS, sources, bitmapToDataUrl, lookOf, processed, preview, scenes: async () => Promise.all(SCENES.map(async (f) => f().toDataURL("image/jpeg", 0.92))) };
