"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Preset } from "@/engine/types";
import { thumbFor } from "./thumbs";

export interface GalleryItem { preset: Preset; maker: string; mine: boolean }

function Tile({ it, selected, fav, onPick, onFav, onEdit }: { it: GalleryItem; selected: boolean; fav: boolean; onPick: () => void; onFav: () => void; onEdit: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let dead = false;
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) { io.disconnect(); thumbFor(it.preset).then((u) => !dead && setSrc(u)).catch(() => {}); }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { dead = true; io.disconnect(); };
  }, [it.preset]);
  return (
    <div ref={ref} className={`overflow-hidden rounded-xl bg-neutral-900 ring-1 ${selected ? "ring-orange-500" : "ring-white/10"}`}>
      <button className="relative block aspect-[3/4] w-full bg-neutral-800" onClick={onPick} aria-label={`Use ${it.preset.name}`}>
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-neutral-800" />}
      </button>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{it.preset.name}</div><div className="truncate text-[10px] text-neutral-500">{it.maker}</div></div>
        <button aria-label={fav ? "Remove favourite" : "Favourite"} aria-pressed={fav} onClick={onFav} className={`px-1 text-base ${fav ? "text-orange-400" : "text-neutral-600"}`}>★</button>
        <button aria-label={`Edit ${it.preset.name} in builder`} onClick={onEdit} className="rounded-full bg-neutral-800 px-2 py-1 text-[10px] text-neutral-300">Edit</button>
      </div>
    </div>
  );
}

export function Gallery({ items, selectedId, favs, onPick, onFav, onEdit, onNew }: {
  items: GalleryItem[]; selectedId: string; favs: string[]; onPick: (id: string) => void; onFav: (id: string) => void; onEdit: (id: string) => void; onNew: () => void;
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
    <section className="space-y-3 px-3 pb-6 pt-1">
      <div className="flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search looks" className="min-w-0 flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-orange-500" />
        <button onClick={onNew} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black">+ New look</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {makers.map((m) => <button key={m} onClick={() => setTab(m)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${tab === m ? "bg-orange-500 text-black" : "bg-neutral-800 text-neutral-300"}`}>{m}</button>)}
      </div>
      {list.length === 0 ? <p className="py-10 text-center text-sm text-neutral-500">{tab === "Favourites" ? "Tap the star on a look to keep it here." : "Nothing matches."}</p> : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((it) => <Tile key={it.preset.id} it={it} selected={it.preset.id === selectedId} fav={favs.includes(it.preset.id)} onPick={() => onPick(it.preset.id)} onFav={() => onFav(it.preset.id)} onEdit={() => onEdit(it.preset.id)} />)}
        </div>
      )}
    </section>
  );
}
