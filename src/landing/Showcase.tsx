"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PRESETS } from "@/presets";
import { applyLook } from "@/ui/applyLook";
import { layoutById } from "@/ui/layoutTemplates";
import { renderLayout } from "@/ui/layouts";
import { reveal } from "@/ui/motion";
import { beach, cafe, concert, hills, neon } from "./scenes";

const SCENES = [beach, neon, cafe, hills, concert];

const PIECES: { id: string; label: string; note: string; w: string; tilt: number }[] = [
  { id: "st-classic", label: "Photobooth strip", note: "Four shots, one strip", w: "22%", tilt: -4 },
  { id: "ca-instant", label: "Carousel", note: "1080 × 1350, ready to post", w: "40%", tilt: 2 },
  { id: "pr-stickers", label: "Sticker sheet", note: "A4, 300 DPI, cut lines", w: "34%", tilt: -1.5 },
];
const LOOKS = ["gh-honey-hour", "mn-night-streak", "gh-kitchen-glow", "s8-warm", "dp-party"];

/** One roll poured into three layouts, drawn here by the app's layout engine the first time it scrolls into view. */
export function Showcase() {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false, started = false;
    const run = async () => {
      if (started) return; started = true;
      try {
        const photos: { src: ImageBitmap; w: number; h: number }[] = [];
        for (let i = 0; i < SCENES.length; i++) {
          const c = SCENES[i](720, 900);
          const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
          const bmp = await applyLook(blob, PRESETS.find((p) => p.id === LOOKS[i]) ?? null, 720);
          if (dead) return;
          photos.push({ src: bmp, w: bmp.width, h: bmp.height });
        }
        PIECES.forEach((p, k) => {
          const c = refs.current[k]; if (!c) return;
          const tpl = layoutById(p.id);
          const list = tpl.slots.map((_, i) => photos[i % photos.length]);
          if (tpl.kind === "carousel") renderLayout(c, { template: tpl, photos: [photos[0]], scale: 0.6, slide: { index: 0, total: 5, caption: "golden hour" } });
          else renderLayout(c, { template: tpl, photos: list, scale: tpl.kind === "print" ? 0.7 : 1 });
        });
        if (!dead) setReady(true);
      } catch { /* no WebGL: the section keeps its captions and empty frames */ }
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) void run(); }, { rootMargin: "300px" });
    if (box.current) io.observe(box.current);
    return () => { dead = true; io.disconnect(); };
  }, []);

  return (
    <div ref={box} className="flex items-end justify-center gap-[3%]">
      {PIECES.map((p, k) => (
        <motion.figure key={p.id} style={{ width: p.w }} initial={{ opacity: 0, y: 50, rotate: 0 }} whileInView={{ opacity: 1, y: 0, rotate: p.tilt }} viewport={{ once: true, margin: "-60px" }} transition={{ ...reveal, delay: k * 0.12 }}>
          <canvas ref={(el) => { refs.current[k] = el; }} role="img" aria-label={`${p.label} made from the sample roll`} className={`block h-auto w-full rounded-[3px] bg-[#1b1b1d] shadow-[0_24px_60px_rgba(0,0,0,.6)] transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-30"}`} width={300} height={400} />
          <figcaption className="mt-4 text-center">
            <div className="text-[0.8125rem] font-semibold">{p.label}</div>
            <div className="text-[0.6875rem] text-white/45">{p.note}</div>
          </figcaption>
        </motion.figure>
      ))}
    </div>
  );
}
