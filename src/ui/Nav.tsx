"use client";
import { motion } from "framer-motion";
import { I, type IconName } from "./icons";

export type View = "camera" | "gallery" | "builder" | "roll" | "share";
const TABS: [View, string, IconName][] = [["camera", "Camera", "camera"], ["gallery", "Looks", "looks"], ["builder", "Build", "build"], ["roll", "Roll", "roll"], ["share", "Share", "share"]];

export function Nav({ view, onChange, disabled }: { view: View; onChange: (v: View) => void; disabled?: boolean }) {
  return (
    <nav aria-label="Main" className="relative z-30 flex shrink-0 border-t border-white/10 bg-black/90 safe-b backdrop-blur">
      {TABS.map(([v, label, icon]) => (
        <button key={v} aria-current={view === v ? "page" : undefined} disabled={disabled} onClick={() => onChange(v)} className="relative flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5">
          {view === v && <motion.span layoutId="nav-dot" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-orange-500" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
          <motion.span animate={{ scale: view === v ? 1.1 : 1, y: view === v ? -1 : 0 }} className={view === v ? "text-orange-400" : "text-neutral-500"}><I n={icon} className="h-[22px] w-[22px]" /></motion.span>
          <span className={`text-[10px] font-medium ${view === v ? "text-orange-400" : "text-neutral-500"}`}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
