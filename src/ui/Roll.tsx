"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { I } from "./icons";
import { fade, press, sheet, snappy, tap } from "./motion";

export interface RollShot { id: string; url: string; kind: "photo" | "video"; ext: string; blob: Blob; created: number; exported?: boolean }

const dayOf = (t: number) => {
  const d = new Date(t), now = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, now)) return "Today";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
};

export function Roll({ shots, onShare, onSave, onDelete, onCamera, onMakeStrip }: {
  shots: RollShot[]; onShare: (s: RollShot) => void; onSave: (s: RollShot) => void; onDelete: (s: RollShot) => void; onCamera: () => void; onMakeStrip: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const toggle = (id: string) => { tap(); setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])); };
  const stopPicking = () => { setPicking(false); setChosen([]); };
  const cur = shots.find((s) => s.id === open);

  // The grid holds small previews; the viewer loads the real photo only while it is open.
  const [full, setFull] = useState<string | null>(null);
  useEffect(() => {
    if (!cur) { setFull(null); return; }
    const u = URL.createObjectURL(cur.blob);
    setFull(u);
    return () => URL.revokeObjectURL(u);
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const idx = cur ? shots.indexOf(cur) : -1;

  const groups: { day: string; items: RollShot[] }[] = [];
  for (const s of shots) {
    const day = dayOf(s.created);
    if (groups[groups.length - 1]?.day !== day) groups.push({ day, items: [] });
    groups[groups.length - 1].items.push(s);
  }

  if (shots.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
        <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-white/[0.06] text-white/35"><I n="roll" className="h-8 w-8" w={1.5} /></div>
        <div>
          <h2 className="text-[19px] font-semibold">Nothing here yet</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-white/45">Everything you shoot is kept here, and stays after you close Pixi.</p>
        </div>
        <motion.button whileTap={press} transition={snappy} onClick={onCamera} className="mt-1 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-black">Open the camera</motion.button>
      </div>
    );
  }

  return (
    <>
      <header className="safe-t flex items-end justify-between px-4 pb-3 pt-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Roll</h1>
          <p className="text-[13px] text-white/40">{picking ? `${chosen.length} selected` : `${shots.length} ${shots.length === 1 ? "shot" : "shots"}`}</p>
        </div>
        <button onClick={() => { tap(); picking ? stopPicking() : setPicking(true); }} className="pb-1 text-[15px] font-medium text-[var(--accent)]">{picking ? "Cancel" : "Select"}</button>
      </header>

      {groups.map((g) => (
        <section key={g.day} className="pb-5">
          <h2 className="px-4 pb-1.5 text-[13px] font-semibold text-white/50">{g.day}</h2>
          <div className="grid grid-cols-3 gap-[3px]">
            {g.items.map((s, i) => (
              <motion.button key={s.id} layoutId={`shot-${s.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 9) * 0.02, duration: 0.25 }}
                onClick={() => (picking ? toggle(s.id) : (tap(), setOpen(s.id)))} aria-label={picking ? `Select ${s.kind}` : `Open ${s.kind} from ${g.day}`} aria-pressed={picking ? chosen.includes(s.id) : undefined}
                className="relative aspect-square overflow-hidden bg-white/[0.04]">
                {s.kind === "photo"
                  ? <img src={s.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  : <video src={s.url} muted playsInline className="h-full w-full object-cover" />}
                {s.kind === "video" && <span className="absolute bottom-1 right-1.5 text-[10px] font-semibold drop-shadow">VIDEO</span>}
                {picking && (
                  <span className={`absolute inset-0 transition-colors ${chosen.includes(s.id) ? "bg-black/35" : ""}`}>
                    <span className={`absolute bottom-1.5 right-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] ${chosen.includes(s.id) ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-white/80 bg-black/25"}`}>
                      {chosen.includes(s.id) && <I n="check" className="h-3.5 w-3.5" w={3} />}
                    </span>
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </section>
      ))}

      <AnimatePresence>
        {picking && chosen.length > 0 && (
          <motion.div key="bar" initial={{ y: 70 }} animate={{ y: 0 }} exit={{ y: 70 }} transition={snappy}
            className="fixed inset-x-0 bottom-[66px] z-30 mx-auto flex w-full max-w-md gap-2 px-4 pb-2">
            <button onClick={() => { onMakeStrip(chosen); stopPicking(); }} className="flex-1 rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-black shadow-[0_8px_30px_rgba(0,0,0,.7)]">
              Make a strip
            </button>
            <button aria-label="Delete selected" onClick={() => { chosen.forEach((id) => { const s2 = shots.find((x) => x.id === id); if (s2) onDelete(s2); }); stopPicking(); }}
              className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl bg-white/[0.12] text-[#ff453a] backdrop-blur"><I n="trash" className="h-[19px] w-[19px]" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cur && (
          <motion.div key="viewer" className="fixed inset-0 z-[60] flex flex-col bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
            <div className="safe-t flex items-center justify-between px-3 pt-2">
              <motion.button whileTap={press} transition={snappy} aria-label="Close" onClick={() => setOpen(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.09]"><I n="close" className="h-[19px] w-[19px]" /></motion.button>
              <span className="text-[13px] tabular-nums text-white/45">{idx + 1} of {shots.length}</span>
              <span className="w-10" />
            </div>

            <motion.div layoutId={`shot-${cur.id}`} transition={sheet} className="relative min-h-0 flex-1" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.45}
              onDragEnd={(_, i) => {
                if (i.offset.x < -70 && shots[idx + 1]) { tap(); setOpen(shots[idx + 1].id); }
                else if (i.offset.x > 70 && shots[idx - 1]) { tap(); setOpen(shots[idx - 1].id); }
              }}>
              {cur.kind === "photo"
                ? <img src={full ?? cur.url} alt="" className="h-full w-full object-contain" />
                : full && <video src={full} controls autoPlay loop playsInline className="h-full w-full object-contain" />}
            </motion.div>

            <div className="flex items-center justify-center gap-4 px-6 pb-5 pt-4 safe-b">
              <motion.button whileTap={press} transition={snappy} onClick={() => onSave(cur)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-black">
                <I n="save" className="h-[18px] w-[18px]" /> {cur.exported ? "Saved · save again" : "Save to phone"}
              </motion.button>
              <motion.button whileTap={press} transition={snappy} aria-label="Share" onClick={() => onShare(cur)} className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl bg-white/[0.09]"><I n="share" className="h-[19px] w-[19px]" /></motion.button>
              <motion.button whileTap={press} transition={snappy} aria-label="Delete" onClick={() => { const next = shots[idx + 1] ?? shots[idx - 1]; onDelete(cur); setOpen(next?.id ?? null); }}
                className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl bg-white/[0.09] text-[#ff453a]"><I n="trash" className="h-[19px] w-[19px]" /></motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
