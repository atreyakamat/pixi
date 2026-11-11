"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MODES, type ModeId } from "./modes";

export function ModeDial({ mode, onChange, disabled }: { mode: ModeId; onChange: (m: ModeId) => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-m="${mode}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [mode]);
  return (
    <div ref={ref} className="flex gap-1 overflow-x-auto px-[calc(50%-40px)]" style={{ scrollbarWidth: "none" }}>
      {MODES.map((m) => (
        <button key={m.id} data-m={m.id} disabled={disabled} onClick={() => onChange(m.id)} className="relative shrink-0 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em]">
          {mode === m.id && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
          <span className={`relative transition-colors ${mode === m.id ? "text-black" : "text-neutral-400"}`}>{m.label.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
