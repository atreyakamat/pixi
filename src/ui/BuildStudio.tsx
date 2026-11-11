"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Preset } from "@/engine/types";
import { isCarousel, layoutSize, layoutToBlob, renderLayout, type Layout, type LayoutPhoto } from "./layouts";
import { LAYOUTS, layoutById } from "./layoutTemplates";
import { applyLook } from "./applyLook";
import { I } from "./icons";
import { fade, press, smooth, snappy, tap } from "./motion";
import { ext, mime, type Settings } from "./settings";

export interface BuildSource { id: string; url: string; blob: Blob; kind: "photo" | "video" }

/**
 * Everything the person has arranged, as plain data. Photos are referenced by id, never held here,
 * so a snapshot costs nothing — which is what makes undo possible.
 */
interface Doc {
  tplId: string;
  /** One entry per window. A carousel has no gaps: its list is simply the pages, in order. */
  srcs: (string | null)[];
  looks: (string | null)[];
  caps: string[];
  values: Record<string, string>;
}

interface Props {
  roll: BuildSource[];
  looks: { preset: Preset; maker: string }[];
  recentLookIds: string[];
  settings: Settings;
  setPair: (on: boolean) => void;
  /** Photos chosen in the Roll, filled in as soon as the screen opens. */
  seed?: string[];
  onOpenCamera: () => void;
  onImportPhotos: (files: FileList | null) => void;
  /** Saves the finished pages into the roll, and to the phone when the person has asked for that. */
  onExport: (blobs: Blob[], extension: string) => Promise<void>;
  onShare: (blobs: Blob[], extension: string) => Promise<void>;
}

type Tab = "frame" | "photos" | "look" | "text";
const TABS: [Tab, string][] = [["frame", "Frame"], ["photos", "Photos"], ["look", "Look"], ["text", "Text"]];
const FAMILY_ORDER = ["Carousel", "Booth", "Ticket", "Film", "Card", "Sheet", "Print", "Paper", "Vintage", "Modern"];

const bmpKey = (src: string, look: string | null) => `${src}|${look ?? "-"}`;
const blank = (tplId: string, n: number): Doc => ({ tplId, srcs: Array(n).fill(null), looks: Array(n).fill(null), caps: Array(n).fill(""), values: {} });

export function BuildStudio({ roll, looks, recentLookIds, settings, setPair, seed, onOpenCamera, onImportPhotos, onExport, onShare }: Props) {
  // History and position move together as one value. Kept apart, two edits in the same tick leave
  // the position pointing past the end of the list, and the screen has nothing to render.
  const [past, setPast] = useState<{ docs: Doc[]; at: number }>(() => ({ docs: [blank(LAYOUTS[0].id, LAYOUTS[0].slots.length)], at: 0 }));
  const [tab, setTab] = useState<Tab>("photos");
  const [slot, setSlot] = useState(0);
  const [busy, setBusy] = useState("");
  const [tick, setTick] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Rendered photos, keyed by source and look. Shared across undo steps, so going back is instant. */
  const cache = useRef(new Map<string, ImageBitmap>());

  const { docs, at } = past;
  const doc = docs[at];
  const tpl = useMemo(() => layoutById(doc.tplId), [doc.tplId]);
  const carousel = isCarousel(tpl);
  const maxPages = tpl.slides?.max ?? tpl.slots.length;
  const photos = useMemo(() => roll.filter((r) => r.kind === "photo"), [roll]);

  /** Every change goes through here, which is what gives the screen an undo stack. */
  const edit = useCallback((f: (d: Doc) => Doc) => {
    setPast((st) => {
      const made = f(st.docs[st.at]);
      if (made === st.docs[st.at]) return st; // a refused change is not a step to undo
      const next = [...st.docs.slice(0, st.at + 1), made].slice(-30);
      return { docs: next, at: next.length - 1 };
    });
  }, []);

  const undo = useCallback(() => setPast((s) => ({ ...s, at: Math.max(0, s.at - 1) })), []);
  const redo = useCallback(() => setPast((s) => ({ ...s, at: Math.min(s.docs.length - 1, s.at + 1) })), []);
  const canUndo = at > 0, canRedo = at < docs.length - 1;

  useEffect(() => () => { cache.current.forEach((b) => b.close()); cache.current.clear(); }, []);

  // Photos sent over from the Roll land in the windows straight away.
  const seedKey = seed?.join(",") ?? "";
  useEffect(() => {
    if (!seedKey) return;
    const ids = seedKey.split(",").filter(Boolean);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new seed from the Roll replaces the document
    setPast({ docs: [{ ...blank(LAYOUTS[0].id, LAYOUTS[0].slots.length), srcs: Array.from({ length: LAYOUTS[0].slots.length }, (_, i) => ids[i] ?? null) }], at: 0 });
    setSlot(0);
  }, [seedKey]);

  /** Renders anything the page needs but has not drawn yet, one photo at a time. */
  const wanted = doc.srcs.map((s, i) => (s ? bmpKey(s, doc.looks[i]) : "")).join("~");
  useEffect(() => {
    let dead = false;
    const missing = doc.srcs.map((s, i) => ({ s, k: s ? bmpKey(s, doc.looks[i]) : "", i })).filter((x) => x.s && !cache.current.has(x.k));
    if (!missing.length) return;
    (async () => {
      setBusy(missing.length > 1 ? "Applying…" : "Adding…");
      try {
        for (const m of missing) {
          const src = roll.find((r) => r.id === m.s);
          if (!src || dead) continue;
          const lk = doc.looks[m.i];
          const preset = lk ? looks.find((l) => l.preset.id === lk)?.preset ?? null : null;
          const bmp = await applyLook(src.blob, preset);
          if (dead) { bmp.close(); return; }
          if (cache.current.size > 36) { const first = cache.current.keys().next().value; if (first) { cache.current.get(first)?.close(); cache.current.delete(first); } }
          cache.current.set(m.k, bmp);
          setTick((t) => t + 1);
        }
      } finally { if (!dead) setBusy(""); }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, roll, looks]);

  const bmpAt = useCallback((i: number): LayoutPhoto | null => {
    const s = doc.srcs[i];
    if (!s) return null;
    const b = cache.current.get(bmpKey(s, doc.looks[i]));
    return b ? { src: b, w: b.width, h: b.height } : null;
  }, [doc]);

  const pages = doc.srcs.filter(Boolean).length;
  const cap = carousel ? Math.max(doc.srcs.length, 1) : tpl.slots.length;

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    if (carousel) {
      const i = Math.min(slot, Math.max(doc.srcs.length - 1, 0));
      renderLayout(c, { template: tpl, photos: [bmpAt(i)], values: doc.values, scale: 1, placeholder: true, slide: { index: i + 1, total: Math.max(doc.srcs.length, 1), caption: doc.caps[i] ?? "" } });
    } else {
      renderLayout(c, { template: tpl, photos: tpl.slots.map((_, i) => bmpAt(i)), values: doc.values, scale: 1, placeholder: true });
    }
  }, [tpl, carousel, slot, doc, bmpAt]);

  useEffect(() => { draw(); }, [draw, tick]);

  /* ---------- editing ---------- */

  const pickFrame = (id: string) => {
    const next = layoutById(id);
    edit((d) => {
      if (isCarousel(next)) {
        const keep = d.srcs.filter(Boolean) as string[];
        const take = keep.slice(0, next.slides?.max ?? 10);
        return { tplId: id, srcs: take.length ? take : [], looks: take.map((_, i) => d.looks[i] ?? null), caps: take.map((_, i) => d.caps[i] ?? ""), values: {} };
      }
      const n = next.slots.length;
      const keep = d.srcs.filter(Boolean) as string[];
      return { tplId: id, srcs: Array.from({ length: n }, (_, i) => keep[i] ?? null), looks: Array.from({ length: n }, (_, i) => d.looks[i] ?? null), caps: Array.from({ length: n }, (_, i) => d.caps[i] ?? ""), values: {} };
    });
    setSlot(0);
  };

  /**
   * Carousel: a tap adds the photo as a page, or takes it out again. Strip: it fills the chosen
   * window. Every check happens inside the update, so several quick taps cannot run past the cap.
   */
  const pickPhoto = (src: BuildSource) => {
    if (carousel) {
      edit((d) => {
        const i = d.srcs.indexOf(src.id);
        if (i >= 0) return { ...d, srcs: d.srcs.filter((_, k) => k !== i), looks: d.looks.filter((_, k) => k !== i), caps: d.caps.filter((_, k) => k !== i) };
        if (d.srcs.length >= maxPages) return d;
        const look = d.looks[d.looks.length - 1] ?? null; // a new page matches the ones before it
        return { ...d, srcs: [...d.srcs, src.id], looks: [...d.looks, look], caps: [...d.caps, ""] };
      });
      return;
    }
    edit((d) => { const a = [...d.srcs]; a[slot] = src.id; return { ...d, srcs: a }; });
    setSlot((s) => Math.min(s + 1, tpl.slots.length - 1));
  };

  // The page in view follows the one just added, and never points past the end after a removal.
  const len = doc.srcs.length;
  const prevLen = useRef(len);
  useEffect(() => {
    if (carousel && len > prevLen.current) setSlot(len - 1);
    else setSlot((s) => Math.min(s, Math.max(len - 1, 0)));
    prevLen.current = len;
  }, [len, carousel]);

  const clearSlot = (i: number) => edit((d) => {
    if (carousel) return { ...d, srcs: d.srcs.filter((_, k) => k !== i), looks: d.looks.filter((_, k) => k !== i), caps: d.caps.filter((_, k) => k !== i) };
    const a = [...d.srcs]; a[i] = null; return { ...d, srcs: a };
  });

  /** Moves the chosen window one place along, taking its look and caption with it. */
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cap) return;
    edit((d) => {
      const sw = <T,>(a: T[]) => { const b = [...a]; [b[i], b[j]] = [b[j], b[i]]; return b; };
      return { ...d, srcs: sw(d.srcs), looks: sw(d.looks), caps: sw(d.caps) };
    });
    setSlot(j);
  };

  const fillRest = () => {
    const used = new Set(doc.srcs.filter(Boolean));
    const pool = photos.filter((p) => !used.has(p.id));
    if (!pool.length) return;
    edit((d) => {
      if (carousel) {
        const room = maxPages - d.srcs.length;
        const take = pool.slice(0, Math.max(room, 0));
        const look = d.looks[d.looks.length - 1] ?? null;
        return { ...d, srcs: [...d.srcs, ...take.map((p) => p.id)], looks: [...d.looks, ...take.map(() => look)], caps: [...d.caps, ...take.map(() => "")] };
      }
      const a = [...d.srcs]; const lk = [...d.looks];
      let k = 0;
      for (let i = 0; i < a.length && k < pool.length; i++) if (!a[i]) { a[i] = pool[k++].id; lk[i] = lk[i] ?? d.looks.find(Boolean) ?? null; }
      return { ...d, srcs: a, looks: lk };
    });
  };

  /** A look lands on every page, or only the one in front of you. */
  const [lookScope, setLookScope] = useState<"all" | "one">("all");
  const setLook = (id: string | null) => edit((d) => ({
    ...d,
    looks: lookScope === "all" || !carousel ? d.looks.map(() => id) : d.looks.map((l, i) => (i === slot ? id : l)),
  }));
  const print = tpl.kind === "print";
  const currentLook = carousel && lookScope === "one" ? doc.looks[slot] ?? null : doc.looks.find((l) => l !== null) ?? null;

  /* ---------- output ---------- */

  const build = async (): Promise<Blob[]> => {
    const scale = tpl.exportScale ?? 2;
    const c = document.createElement("canvas");
    const out: Blob[] = [];
    if (carousel) {
      const live = doc.srcs.map((s, i) => ({ s, i })).filter((x) => x.s);
      for (let n = 0; n < live.length; n++) {
        renderLayout(c, { template: tpl, photos: [bmpAt(live[n].i)], values: doc.values, scale, slide: { index: n + 1, total: live.length, caption: doc.caps[live[n].i] ?? "" } });
        out.push(await layoutToBlob(c, mime(settings), settings.quality));
      }
    } else if (print) {
      // Prints are lossless so cut lines and crop marks stay crisp at 300 DPI.
      renderLayout(c, { template: tpl, photos: tpl.slots.map((_, i) => bmpAt(i)), values: doc.values, scale });
      out.push(await layoutToBlob(c, "image/png"));
    } else {
      renderLayout(c, { template: tpl, photos: tpl.slots.map((_, i) => bmpAt(i)), values: doc.values, scale, pair: settings.stripPair });
      out.push(await layoutToBlob(c, mime(settings), settings.quality));
    }
    return out;
  };

  const run = async (what: "export" | "share") => {
    setBusy(carousel ? "Making your carousel…" : print ? "Making your print at 300 DPI…" : "Making your strip…");
    try {
      const blobs = await build();
      if (!blobs.length) return;
      const e = print ? "png" : ext(settings);
      await (what === "export" ? onExport(blobs, e) : onShare(blobs, e));
    } catch { setBusy(""); }
    finally { setBusy(""); }
  };

  // Tap a window in the preview to choose which one you are filling.
  const pickSlot = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (carousel) return;
    const c = canvasRef.current; if (!c) return;
    const box = c.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * tpl.w;
    const y = ((e.clientY - box.top) / box.height) * tpl.h;
    const i = tpl.slots.findIndex((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) { tap(); setSlot(i); setTab("photos"); }
  };

  const size = layoutSize(tpl, 1);
  const ordered = useMemo(() => {
    const rank = new Map(recentLookIds.map((id, i) => [id, i]));
    return [...looks].sort((a, b) => (rank.get(a.preset.id) ?? 999) - (rank.get(b.preset.id) ?? 999));
  }, [looks, recentLookIds]);
  const frames = useMemo(() => [...LAYOUTS].sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family)), []);

  const chip = (on: boolean) => `shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${on ? "bg-white text-black" : "bg-white/[0.08] text-white/80"}`;
  const ready = carousel ? pages > 0 : doc.srcs.some(Boolean);
  const fieldList = (tpl.fields ?? []).filter((fd) => !(carousel && fd.key === "caption"));

  return (
    <div className="flex h-full flex-col">
      <header className="safe-t flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-none tracking-[-0.02em]">Build</h1>
          <p className="mt-1 truncate text-[12px] text-white/40">
            {carousel ? `${pages} ${pages === 1 ? "page" : "pages"} · 1080×1350` : `${tpl.name} · ${tpl.slots.length} photo${tpl.slots.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={() => { tap(); undo(); }} disabled={!canUndo} aria-label="Undo"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.09] disabled:opacity-30"><I n="undo" className="h-[18px] w-[18px]" /></button>
          <button onClick={() => { tap(); redo(); }} disabled={!canRedo} aria-label="Redo"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.09] disabled:opacity-30"><I n="redo" className="h-[18px] w-[18px]" /></button>
          {!carousel && !print && (
            <motion.button whileTap={press} transition={snappy} onClick={() => { tap(); setPair(!settings.stripPair); }} aria-pressed={settings.stripPair}
              className={`rounded-full px-3 py-2 text-[12px] font-medium ${settings.stripPair ? "bg-[var(--accent)] text-black" : "bg-white/[0.08] text-white/80"}`}>Pair</motion.button>
          )}
          <motion.button whileTap={press} transition={snappy} onClick={() => run("share")} disabled={!ready || !!busy} aria-label="Share"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.09] disabled:opacity-40"><I n="share" className="h-[18px] w-[18px]" /></motion.button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-2">
        <motion.canvas
          ref={canvasRef} width={size.w} height={size.h} onClick={pickSlot}
          drag={carousel && pages > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.35}
          onDragEnd={(_, info) => {
            if (!carousel) return;
            if (info.offset.x < -60 && slot < doc.srcs.length - 1) { tap(); setSlot(slot + 1); }
            else if (info.offset.x > 60 && slot > 0) { tap(); setSlot(slot - 1); }
          }}
          className={`max-h-full max-w-full rounded-[6px] object-contain shadow-[0_10px_40px_rgba(0,0,0,.6)] ${carousel ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`} />
        {carousel && pages > 1 && (
          <div className="pointer-events-none flex shrink-0 justify-center gap-1.5">
            {doc.srcs.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === slot ? "w-4 bg-white" : "w-1.5 bg-white/35"}`} />)}
          </div>
        )}
        <AnimatePresence>
          {busy && (
            <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}
              className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-black/75 px-4 py-2 text-[13px] font-medium backdrop-blur">{busy}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0">
        <div className="mx-4 mb-3 flex rounded-xl bg-white/[0.07] p-[3px]">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => { tap(); setTab(k); }} className="relative flex-1 rounded-[9px] py-1.5 text-[13px] font-medium">
              {tab === k && <motion.span layoutId="build-seg" className="absolute inset-0 rounded-[9px] bg-white/[0.14]" transition={smooth} />}
              <span className={`relative ${tab === k ? "text-white" : "text-white/55"}`}>{l}</span>
            </button>
          ))}
        </div>

        <div className="h-[186px] overflow-y-auto overscroll-contain pb-2">
          {tab === "frame" && (
            <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
              {frames.map((t) => (
                <button key={t.id} onClick={() => { tap(); pickFrame(t.id); }} className="w-[80px] shrink-0 text-center">
                  <div className={`flex h-[116px] items-center justify-center rounded-xl bg-white/[0.06] p-1.5 ${t.id === doc.tplId ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}>
                    <FramePreview id={t.id} />
                  </div>
                  <div className="mt-1 truncate text-[11px] font-medium">{t.name}</div>
                  <div className="truncate text-[10px] text-white/35">{t.kind === "carousel" ? "Carousel" : t.kind === "sheet" ? "12 photos" : t.kind === "print" ? `${t.paper} · ${t.slots.length} photo${t.slots.length > 1 ? "s" : ""}` : `${t.slots.length} photo${t.slots.length > 1 ? "s" : ""}`}</div>
                </button>
              ))}
            </div>
          )}

          {tab === "photos" && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                {Array.from({ length: cap }, (_, i) => (
                  <button key={i} onClick={() => { tap(); setSlot(i); }} aria-label={`${carousel ? "Page" : "Window"} ${i + 1}`}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/[0.07] text-[13px] font-semibold ${i === slot ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}>
                    {doc.srcs[i] ? <img src={roll.find((r) => r.id === doc.srcs[i])?.url} alt="" className="h-full w-full object-cover" /> : <span className="text-white/40">{i + 1}</span>}
                  </button>
                ))}
                {carousel && doc.srcs.length < maxPages && <span className="shrink-0 px-1 text-[11px] text-white/30">tap a photo to add</span>}
              </div>

              <div className="flex gap-2 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                <button onClick={() => { tap(); move(slot, -1); }} disabled={slot <= 0} aria-label="Move earlier" className={`${chip(false)} disabled:opacity-30`}>←</button>
                <button onClick={() => { tap(); move(slot, 1); }} disabled={slot >= cap - 1} aria-label="Move later" className={`${chip(false)} disabled:opacity-30`}>→</button>
                <button onClick={() => { tap(); fillRest(); }} disabled={!photos.length} className={chip(false)}>Fill the rest</button>
                {doc.srcs[slot] && <button onClick={() => { tap(); clearSlot(slot); }} className={chip(false)}>Remove</button>}
              </div>

              {photos.length === 0 ? (
                <div className="px-4 pt-2 text-center">
                  <p className="text-[13px] leading-relaxed text-white/45">Your roll is empty. Shoot something, or bring photos in from your phone.</p>
                  <div className="mt-2.5 flex justify-center gap-2">
                    <button onClick={onOpenCamera} className="rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black">Open the camera</button>
                    <button onClick={() => fileRef.current?.click()} className="rounded-full bg-white/[0.1] px-5 py-2.5 text-[13px] font-semibold">From phone</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                  <button onClick={onOpenCamera} className="flex h-[92px] w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-white/[0.07] text-[10px] font-medium text-white/70">
                    <I n="camera" className="h-5 w-5" /> Camera
                  </button>
                  <button onClick={() => fileRef.current?.click()} className="flex h-[92px] w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-white/[0.07] text-[10px] font-medium text-white/70">
                    <I n="plus" className="h-5 w-5" /> Phone
                  </button>
                  {photos.map((p) => {
                    const where = doc.srcs.indexOf(p.id);
                    return (
                      <button key={p.id} onClick={() => { tap(); pickPhoto(p); }} aria-label={where >= 0 ? "Remove this photo" : "Use this photo"}
                        className={`relative h-[92px] w-[70px] shrink-0 overflow-hidden rounded-xl bg-white/[0.05] ${where >= 0 ? "opacity-55" : ""}`}>
                        <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        {where >= 0 && (
                          <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-black">
                            {carousel ? where + 1 : <I n="check" className="h-3 w-3" w={3} />}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple hidden
                onChange={(e) => { onImportPhotos(e.target.files); e.target.value = ""; }} />
            </div>
          )}

          {tab === "look" && (
            <div className="space-y-2.5">
              {carousel && pages > 1 && (
                <div className="mx-4 flex rounded-xl bg-white/[0.07] p-[3px]">
                  {([["all", "Every page"], ["one", `Page ${slot + 1}`]] as const).map(([k, l]) => (
                    <button key={k} onClick={() => { tap(); setLookScope(k); }} className={`relative flex-1 rounded-[9px] py-1.5 text-[12px] font-medium ${lookScope === k ? "text-white" : "text-white/55"}`}>
                      {lookScope === k && <motion.span layoutId="scope-seg" className="absolute inset-0 rounded-[9px] bg-white/[0.14]" transition={smooth} />}
                      <span className="relative">{l}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                <button onClick={() => { tap(); setLook(null); }} className={chip(currentLook === null)}>As shot</button>
                {ordered.slice(0, 40).map((l) => (
                  <button key={l.preset.id} onClick={() => { tap(); setLook(l.preset.id); }} className={chip(currentLook === l.preset.id)}>{l.preset.name}</button>
                ))}
              </div>
            </div>
          )}

          {tab === "text" && (
            <div className="space-y-3 px-4 pb-2">
              {carousel && (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">Caption · page {slot + 1}</span>
                  <input value={doc.caps[slot] ?? ""} maxLength={60} placeholder="Say something about this one"
                    onChange={(e) => edit((d) => { const a = [...d.caps]; a[slot] = e.target.value; return { ...d, caps: a }; })}
                    className="w-full rounded-xl bg-white/[0.07] px-3.5 py-2.5 text-[15px] outline-none placeholder:text-white/25 focus:ring-2 focus:ring-[var(--accent)]" />
                </label>
              )}
              {fieldList.length === 0 && !carousel && <p className="text-[13px] text-white/45">This frame has no text to change.</p>}
              {fieldList.map((fd) => (
                <label key={fd.key} className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">{fd.label}</span>
                  <input value={doc.values[fd.key] ?? fd.def} maxLength={fd.max}
                    onChange={(e) => edit((d) => ({ ...d, values: { ...d.values, [fd.key]: e.target.value } }))}
                    className="w-full rounded-xl bg-white/[0.07] px-3.5 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-2">
          <motion.button whileTap={press} transition={snappy} onClick={() => run("export")} disabled={!ready || !!busy}
            className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-black disabled:opacity-35">
            {!ready ? "Add a photo to start"
              : carousel ? `Save ${pages} ${pages === 1 ? "page" : "pages"}${settings.saveMode === "auto" ? " to roll and phone" : " to roll"}`
                : settings.saveMode === "auto" ? "Save to roll and phone" : "Save to roll"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/** Small drawing of a frame, rendered once per layout so the picker stays cheap. */
function FramePreview({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const t: Layout = layoutById(id);
    const s = layoutSize(t, 1);
    const k = 108 / s.h;
    const tmp = document.createElement("canvas");
    renderLayout(tmp, { template: t, photos: t.slots.map(() => null), scale: 1, placeholder: false, slide: { index: 1, total: 3 } });
    c.width = Math.round(s.w * k); c.height = Math.round(s.h * k);
    const g = c.getContext("2d");
    if (!g) return;
    g.drawImage(tmp, 0, 0, c.width, c.height);
    g.fillStyle = "rgba(255,255,255,.22)";
    for (const sl of t.slots) g.fillRect(sl.x * k, sl.y * k, sl.w * k, sl.h * k);
  }, [id]);
  return <canvas ref={ref} className="max-h-full max-w-full rounded-[3px] object-contain" />;
}
