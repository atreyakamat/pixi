"use client";
import { motion } from "framer-motion";
import { I, type IconName } from "./icons";
import { smooth, tap } from "./motion";

export type View = "camera" | "studio" | "builder" | "roll" | "share";
const TABS: [View, string, IconName][] = [["camera", "Camera", "camera"], ["studio", "Studio", "looks"], ["roll", "Roll", "roll"]];

export function Nav({ view, onChange, disabled }: { view: View; onChange: (v: View) => void; disabled?: boolean }) {
  const on = (v: View) => view === v || (v === "studio" && (view === "builder" || view === "share"));
  return (
    <nav aria-label="Main" className="relative z-30 flex shrink-0 justify-center gap-2 border-t border-white/[0.07] bg-black/80 px-6 pt-1.5 backdrop-blur-xl safe-b">
      {TABS.map(([v, label, icon]) => (
        <button key={v} aria-current={on(v) ? "page" : undefined} disabled={disabled}
          onClick={() => { tap(); onChange(v); }}
          className="group flex flex-1 flex-col items-center gap-[3px] pb-1.5 pt-1 disabled:opacity-40">
          <motion.span animate={{ scale: on(v) ? 1 : 0.94 }} transition={smooth} className={on(v) ? "text-[var(--accent)]" : "text-white/40"}>
            <I n={icon} className="h-[23px] w-[23px]" w={1.7} />
          </motion.span>
          <span className={`text-[10px] font-medium tracking-[0.01em] ${on(v) ? "text-[var(--accent)]" : "text-white/40"}`}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
