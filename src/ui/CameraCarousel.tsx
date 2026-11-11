"use client";
import { useEffect, useRef } from "react";
import { CameraIcon } from "./CameraIcon";
import type { CameraDef } from "./cameras";

const W = 76, GAP = 10, STEP = W + GAP;

/** Swipe-to-switch camera strip. Items near the centre grow; the centred one is applied after the scroll settles. */
export function CameraCarousel({ items, value, onPick }: { items: CameraDef[]; value: string; onPick: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmatic = useRef(false);
  const raf = useRef(0);
  const idxOf = (id: string) => Math.max(0, items.findIndex((c) => c.preset.id === id));

  const paint = () => {
    const el = ref.current; if (!el) return;
    const c = el.scrollLeft / STEP;
    const kids = el.children;
    for (let i = Math.max(0, Math.floor(c) - 3); i <= Math.min(kids.length - 1, Math.ceil(c) + 3); i++) {
      const d = Math.min(1, Math.abs(i - c));
      const k = kids[i] as HTMLElement;
      k.style.transform = `scale(${1.12 - d * 0.36})`;
      k.style.opacity = String(1 - d * 0.5);
    }
  };

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const target = idxOf(value) * STEP;
    if (Math.abs(el.scrollLeft - target) < 4) { paint(); return; }
    programmatic.current = true;
    el.scrollTo({ left: target, behavior: "smooth" });
    const t = setTimeout(() => { programmatic.current = false; paint(); }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, items.length]);

  useEffect(() => { const el = ref.current; if (el) { el.scrollLeft = idxOf(value) * STEP; paint(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(paint);
    if (programmatic.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current; if (!el) return;
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / STEP)));
      if (items[i] && items[i].preset.id !== value) { if ("vibrate" in navigator) navigator.vibrate?.(8); onPick(items[i].preset.id); }
    }, 120);
  };

  return (
    <div ref={ref} onScroll={onScroll} className="flex snap-x snap-mandatory items-center overflow-x-auto py-2" style={{ gap: GAP, paddingLeft: `calc(50% - ${W / 2}px)`, paddingRight: `calc(50% - ${W / 2}px)`, scrollbarWidth: "none" }}>
      {items.map((c) => (
        <button key={c.preset.id} aria-label={`${c.brand} ${c.model}`} onClick={() => onPick(c.preset.id)} className="gpu h-[56px] shrink-0 snap-center rounded-xl bg-white/5 p-1 ring-1 ring-white/10" style={{ width: W, transform: "scale(.76)", opacity: 0.5 }}>
          <CameraIcon body={c.body} color={c.color} />
        </button>
      ))}
    </div>
  );
}
