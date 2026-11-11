"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { I } from "./icons";

export interface RollShot { id: string; url: string; kind: "photo" | "video"; ext: string; blob: Blob; created: number }

export function Roll({ shots, onShare, onDelete, onCamera }: { shots: RollShot[]; onShare: (s: RollShot) => void; onDelete: (s: RollShot) => void; onCamera: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const cur = shots.find((s) => s.id === open);
  const idx = cur ? shots.indexOf(cur) : -1;

  if (shots.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-neutral-500"><I n="roll" className="h-8 w-8" /></div>
        <h2 className="text-lg font-semibold">Your roll is empty</h2>
        <p className="text-sm text-neutral-400">Everything you shoot is saved here, even after you close the app.</p>
        <button onClick={onCamera} className="mt-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black">Take a photo</button>
      </div>
    );
  }
  return (
    <>
      <div className="px-4 pb-2 pt-4"><h1 className="text-xl font-semibold">Roll</h1><p className="text-xs text-neutral-500">{shots.length} saved</p></div>
      <div className="grid grid-cols-3 gap-1 px-1">
        {shots.map((s, i) => (
          <motion.button key={s.id} layoutId={`shot-${s.id}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 12) * 0.025, type: "spring", stiffness: 320, damping: 28 }}
            onClick={() => setOpen(s.id)} className="relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-900">
            {s.kind === "photo" ? <img src={s.url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <video src={s.url} muted playsInline className="h-full w-full object-cover" />}
            {s.kind === "video" && <span className="lcd absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px]">VID</span>}
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {cur && (
          <motion.div key="viewer" className="fixed inset-0 z-[60] flex flex-col bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div layoutId={`shot-${cur.id}`} className="relative min-h-0 flex-1" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5}
              onDragEnd={(_, i) => { if (i.offset.x < -80 && shots[idx + 1]) setOpen(shots[idx + 1].id); else if (i.offset.x > 80 && shots[idx - 1]) setOpen(shots[idx - 1].id); }}>
              {cur.kind === "photo" ? <img src={cur.url} alt="" className="h-full w-full object-contain" /> : <video src={cur.url} controls autoPlay loop playsInline className="h-full w-full object-contain" />}
            </motion.div>
            <div className="flex items-center justify-between px-6 py-4 safe-b">
              <button aria-label="Close" onClick={() => setOpen(null)} className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800"><I n="close" /></button>
              <span className="lcd text-[11px] text-neutral-400">{idx + 1} / {shots.length}</span>
              <div className="flex gap-3">
                <button aria-label="Share or save" onClick={() => onShare(cur)} className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-black"><I n="share" /></button>
                <button aria-label="Delete" onClick={() => { const next = shots[idx + 1] ?? shots[idx - 1]; onDelete(cur); setOpen(next?.id ?? null); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-red-400"><I n="trash" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
