"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Preset } from "@/engine/types";
import { thumbFor } from "./thumbs";
import { I } from "./icons";
import { press, smooth, snappy, tap } from "./motion";

export interface GalleryItem { preset: Preset; maker: string; mine: boolean }

function Tile({ it, selected, fav, onPick, onFav, onEdit }: { it: GalleryItem; selected: boolean; fav: boolean; onPick: () => void; onFav: () => void; onEdit: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let dead = false;
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) { io.disconnect(); thumbFor(it.preset).then((u) => !dead && setSrc(u)).catch(() => {}); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => { dead = true; io.disconnect(); };
  }, [it.preset]);

  return (
    <div ref={ref} className="relative">
      <motion.button whileTap={press} transition={snappy} onClick={() => { tap(); onPick(); }} aria-label={`Use ${it.preset.name}`}
        className="block w-full overflow-hidden rounded-[18px] bg-white/[0.05]">
        <div className="relative aspect-[3/4] w-full">
          {src
            ? <motion.img src={src} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-white/[0.04]" />}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 text-left">
            <div className="truncate text-[13px] font-semibold leading-tight">{it.preset.name}</div>
            <div className="truncate text-[10px] text-white/55">{it.maker}</div>
          </div>
          <motion.span animate={{ opacity: selected ? 1 : 0 }} transition={smooth} className="pointer-events-none absolute inset-0 rounded-[18px]" style={{ boxShadow: "inset 0 0 0 2px var(--accent)" }} />
        </div>
      </motion.button>
      <div className="absolute right-1.5 top-1.5 flex gap-1">
        <motion.button whileTap={press} transition={snappy} aria-label={`Edit ${it.preset.name}`} onClick={() => { tap(); onEdit(); }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md"><I n="pencil" className="h-[15px] w-[15px]" /></motion.button>
        <motion.button whileTap={press} transition={snappy} aria-label={fav ? "Remove from favourites" : "Add to favourites"} aria-pressed={fav} onClick={() => { tap(); onFav(); }}
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-md ${fav ? "text-[var(--accent)]" : "text-white/70"}`}>
          <I n="star" className="h-[15px] w-[15px]" w={fav ? 2.6 : 1.7} />
        </motion.button>
      </div>
    </div>
  );
}

export function Gallery({ items, selectedId, favs, onPick, onFav, onEdit, onNew, onShare }: {
  items: GalleryItem[]; selectedId: string; favs: string[];
  onPick: (id: string) => void; onFav: (id: string) => void; onEdit: (id: string) => void; onNew: () => void; onShare: () => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("All");
  const makers = useMemo(() => ["All", "Favourites", ...(items.some((i) => i.mine) ? ["My Looks"] : []), ...Array.from(new Set(items.filter((i) => !i.mine).map((i) => i.maker)))], [items]);
  const list = items.filter((i) => {
    if (tab === "Favourites" && !favs.includes(i.preset.id)) return false;
    if (tab === "My Looks" && !i.mine) return false;
    if (tab !== "All" && tab !== "Favourites" && tab !== "My Looks" && i.maker !== tab) return false;
    const s = q.trim().toLowerCase();
    return !s || i.preset.name.toLowerCase().includes(s) || i.preset.family.toLowerCase().includes(s) || i.preset.blurb.toLowerCase().includes(s);
  });

  return (
    <section className="pb-6">
      <header className="safe-t flex items-center justify-between px-4 pb-2 pt-3">
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Studio</h1>
        <div className="flex gap-2">
          <motion.button whileTap={press} transition={snappy} onClick={onShare} aria-label="Share and receive looks" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.09]"><I n="share" className="h-[18px] w-[18px]" /></motion.button>
          <motion.button whileTap={press} transition={snappy} onClick={() => { tap(); onNew(); }} aria-label="Create a new look" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black"><I n="plus" className="h-[18px] w-[18px]" w={2.2} /></motion.button>
        </div>
      </header>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-3">
          <I n="search" className="h-[17px] w-[17px] shrink-0 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search looks" className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-white/35" />
          {q && <button onClick={() => setQ("")} aria-label="Clear search" className="text-white/40"><I n="close" className="h-4 w-4" /></button>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-4" style={{ scrollbarWidth: "none" }}>
        {makers.map((m) => (
          <button key={m} onClick={() => { tap(); setTab(m); }} className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${tab === m ? "bg-white text-black" : "bg-white/[0.08] text-white/70"}`}>{m}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="px-10 py-16 text-center text-[15px] leading-relaxed text-white/40">{tab === "Favourites" ? "Tap the star on any look to keep it here." : "No looks match that search."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {list.map((it) => (
            <Tile key={it.preset.id} it={it} selected={it.preset.id === selectedId} fav={favs.includes(it.preset.id)}
              onPick={() => onPick(it.preset.id)} onFav={() => onFav(it.preset.id)} onEdit={() => onEdit(it.preset.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
