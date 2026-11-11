"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Preset } from "@/engine/types";
import { renderStrip, stripSize, stripToBlob, type StripPhoto } from "./strips";
import { STRIP_TEMPLATES, stripById } from "./stripTemplates";
import { applyLook } from "./applyLook";
import { I } from "./icons";
import { fade, press, smooth, snappy, tap } from "./motion";
import { ext, mime, type Settings } from "./settings";

export interface StripSource { id: string; url: string; blob: Blob; kind: "photo" | "video" }

interface Fill { srcId: string; blob: Blob; bmp: ImageBitmap | null }

interface Props {
  roll: StripSource[];
  looks: { preset: Preset; maker: string }[];
  recentLookIds: string[];
  settings: Settings;
  setPair: (on: boolean) => void;
  /** Photos chosen in the Roll, filled in as soon as the screen opens. */
  seed?: string[];
  onOpenCamera: () => void;
  /** Saves the finished strip into the roll, and to the phone when the person has asked for that. */
  onExport: (blob: Blob, extension: string) => Promise<void>;
  onShare: (blob: Blob, name: string) => Promise<void>;
}

type Tab = "frame" | "photos" | "look" | "text";
const TABS: [Tab, string][] = [["frame", "Frame"], ["photos", "Photos"], ["look", "Look"], ["text", "Text"]];

export function StripStudio({ roll, looks, recentLookIds, settings, setPair, seed, onOpenCamera, onExport, onShare }: Props) {
  const [tplId, setTplId] = useState(STRIP_TEMPLATES[0].id);
  const [tab, setTab] = useState<Tab>("photos");
  const [fills, setFills] = useState<(Fill | null)[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [lookId, setLookId] = useState<string | null>(null);
  const [slot, setSlot] = useState(0);
  const [busy, setBusy] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tpl = useMemo(() => stripById(tplId), [tplId]);
  const look = useMemo(() => looks.find((l) => l.preset.id === lookId)?.preset ?? null, [looks, lookId]);
  const photos = roll.filter((r) => r.kind === "photo");

  // Keep one slot per window when the frame changes; extra photos are remembered, not thrown away.
  useEffect(() => {
    setFills((f) => Array.from({ length: tpl.slots.length }, (_, i) => f[i] ?? null));
    setSlot((s) => Math.min(s, tpl.slots.length - 1));
  }, [tpl]);

  useEffect(() => () => { fills.forEach((f) => f?.bmp?.close()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Photos sent over from the Roll land in the windows straight away.
  const seedKey = seed?.join(",") ?? "";
  useEffect(() => {
    if (!seedKey) return;
    const ids = seedKey.split(",");
    let dead = false;
    (async () => {
      for (let i = 0; i < Math.min(ids.length, tpl.slots.length); i++) {
        const src = roll.find((r) => r.id === ids[i]);
        if (!src || dead) continue;
        const bmp = await applyLook(src.blob, null);
        if (dead) { bmp.close(); return; }
        setFills((f) => { const a = [...f]; a[i]?.bmp?.close(); a[i] = { srcId: src.id, blob: src.blob, bmp }; return a; });
      }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const list: (StripPhoto | null)[] = fills.map((f) => (f?.bmp ? { src: f.bmp, w: f.bmp.width, h: f.bmp.height } : null));
    renderStrip(c, { template: tpl, photos: list, values, scale: 1, placeholder: true });
  }, [tpl, fills, values]);

  useEffect(() => { draw(); }, [draw]);

  const put = async (src: StripSource, index: number) => {
    setBusy("Adding…");
    try {
      const bmp = await applyLook(src.blob, look);
      setFills((f) => {
        const a = [...f]; a[index]?.bmp?.close();
        a[index] = { srcId: src.id, blob: src.blob, bmp };
        return a;
      });
      setSlot((s) => (s === index ? Math.min(index + 1, tpl.slots.length - 1) : s));
    } finally { setBusy(""); }
  };

  const clearSlot = (i: number) => setFills((f) => { const a = [...f]; a[i]?.bmp?.close(); a[i] = null; return a; });

  const fillAll = async () => {
    const empty = fills.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
    const pool = photos.filter((p) => !fills.some((f) => f?.srcId === p.id)).slice(0, empty.length);
    if (!pool.length) return;
    setBusy("Filling…");
    try {
      for (let k = 0; k < pool.length; k++) {
        const bmp = await applyLook(pool[k].blob, look);
        const at = empty[k];
        setFills((f) => { const a = [...f]; a[at]?.bmp?.close(); a[at] = { srcId: pool[k].id, blob: pool[k].blob, bmp }; return a; });
      }
    } finally { setBusy(""); }
  };

  const changeLook = async (id: string | null) => {
    setLookId(id);
    const p = id ? looks.find((l) => l.preset.id === id)?.preset ?? null : null;
    const current = fills;
    if (!current.some(Boolean)) return;
    setBusy("Applying…");
    try {
      for (let i = 0; i < current.length; i++) {
        const f = current[i]; if (!f) continue;
        const bmp = await applyLook(f.blob, p);
        setFills((prev) => { const a = [...prev]; if (a[i]?.srcId !== f.srcId) { bmp.close(); return prev; } a[i]!.bmp?.close(); a[i] = { ...f, bmp }; return a; });
      }
    } finally { setBusy(""); }
  };

  const build = async (): Promise<Blob | null> => {
    const c = document.createElement("canvas");
    const list: (StripPhoto | null)[] = fills.map((f) => (f?.bmp ? { src: f.bmp, w: f.bmp.width, h: f.bmp.height } : null));
    renderStrip(c, { template: tpl, photos: list, values, scale: 2, pair: settings.stripPair, placeholder: false });
    try { return await stripToBlob(c, mime(settings), settings.quality); } catch { return null; }
  };

  const doExport = async () => {
    setBusy("Making your strip…");
    try {
      const b = await build();
      if (b) await onExport(b, ext(settings));
    } finally { setBusy(""); }
  };

  const doShare = async () => {
    setBusy("Making your strip…");
    try {
      const b = await build();
      if (b) await onShare(b, `pixi-strip-${Date.now()}.${ext(settings)}`);
    } finally { setBusy(""); }
  };

  // Tap a window in the preview to choose which one you are filling.
  const pickSlot = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current; if (!c) return;
    const box = c.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * tpl.w;
    const y = ((e.clientY - box.top) / box.height) * tpl.h;
    const i = tpl.slots.findIndex((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (i >= 0) { tap(); setSlot(i); setTab("photos"); }
  };

  const filled = fills.filter(Boolean).length;
  const size = stripSize(tpl, 1);
  const ordered = useMemo(() => {
    const rank = new Map(recentLookIds.map((id, i) => [id, i]));
    return [...looks].sort((a, b) => (rank.get(a.preset.id) ?? 999) - (rank.get(b.preset.id) ?? 999));
  }, [looks, recentLookIds]);

  const chip = (on: boolean) => `shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${on ? "bg-white text-black" : "bg-white/[0.08] text-white/80"}`;

  return (
    <div className="flex h-full flex-col">
      <header className="safe-t flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Build</h1>
        <div className="flex items-center gap-2">
          <motion.button whileTap={press} transition={snappy} onClick={() => { tap(); setPair(!settings.stripPair); }} aria-pressed={settings.stripPair}
            className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${settings.stripPair ? "bg-[var(--accent)] text-black" : "bg-white/[0.08] text-white/80"}`}>
            Print pair
          </motion.button>
          <motion.button whileTap={press} transition={snappy} onClick={doShare} disabled={!filled || !!busy} aria-label="Share the strip"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.09] disabled:opacity-40"><I n="share" className="h-[18px] w-[18px]" /></motion.button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-2">
        <canvas ref={canvasRef} width={size.w} height={size.h} onClick={pickSlot}
          className="max-h-full max-w-full cursor-pointer rounded-[6px] object-contain shadow-[0_10px_40px_rgba(0,0,0,.6)]" />
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
              {tab === k && <motion.span layoutId="strip-seg" className="absolute inset-0 rounded-[9px] bg-white/[0.14]" transition={smooth} />}
              <span className={`relative ${tab === k ? "text-white" : "text-white/55"}`}>{l}</span>
            </button>
          ))}
        </div>

        <div className="h-[186px] overflow-y-auto overscroll-contain pb-2">
          {tab === "frame" && (
            <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
              {STRIP_TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => { tap(); setTplId(t.id); setValues({}); }} className="w-[78px] shrink-0 text-center">
                  <div className={`flex h-[112px] items-center justify-center rounded-xl bg-white/[0.06] p-1.5 ${t.id === tplId ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}>
                    <FramePreview id={t.id} />
                  </div>
                  <div className="mt-1 truncate text-[11px] font-medium">{t.name}</div>
                  <div className="truncate text-[10px] text-white/35">{t.slots.length} photo{t.slots.length > 1 ? "s" : ""}</div>
                </button>
              ))}
            </div>
          )}

          {tab === "photos" && (
            <div className="space-y-2.5">
              <div className="flex gap-2 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                {tpl.slots.map((_, i) => (
                  <button key={i} onClick={() => { tap(); setSlot(i); }} aria-label={`Window ${i + 1}`}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/[0.07] text-[13px] font-semibold ${i === slot ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}>
                    {fills[i] ? <img src={roll.find((r) => r.id === fills[i]!.srcId)?.url} alt="" className="h-full w-full object-cover" /> : <span className="text-white/40">{i + 1}</span>}
                  </button>
                ))}
                <span className="mx-1 h-12 w-px shrink-0 bg-white/10" />
                <button onClick={() => { tap(); fillAll(); }} disabled={!photos.length} className={chip(false)}>Fill the rest</button>
                {filled > 0 && <button onClick={() => { tap(); clearSlot(slot); }} className={chip(false)}>Clear</button>}
              </div>

              {photos.length === 0 ? (
                <div className="px-4 pt-3 text-center">
                  <p className="text-[13px] leading-relaxed text-white/45">Your roll is empty. Take a few photos and they will show up here.</p>
                  <button onClick={onOpenCamera} className="mt-2.5 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black">Open the camera</button>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
                  <button onClick={onOpenCamera} className="flex h-[92px] w-[70px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-white/[0.07] text-[11px] font-medium text-white/70">
                    <I n="camera" className="h-5 w-5" /> Camera
                  </button>
                  {photos.map((p) => {
                    const used = fills.some((f) => f?.srcId === p.id);
                    return (
                      <button key={p.id} onClick={() => { tap(); put(p, slot); }} aria-label="Use this photo"
                        className={`relative h-[92px] w-[70px] shrink-0 overflow-hidden rounded-xl bg-white/[0.05] ${used ? "opacity-45" : ""}`}>
                        <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        {used && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-black"><I n="check" className="h-3 w-3" w={3} /></span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "look" && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              <button onClick={() => { tap(); changeLook(null); }} className={chip(lookId === null)}>As shot</button>
              {ordered.slice(0, 40).map((l) => (
                <button key={l.preset.id} onClick={() => { tap(); changeLook(l.preset.id); }} className={chip(lookId === l.preset.id)}>{l.preset.name}</button>
              ))}
            </div>
          )}

          {tab === "text" && (
            <div className="space-y-3 px-4 pb-2">
              {(tpl.fields ?? []).length === 0 && <p className="text-[13px] text-white/45">This frame has no text to change.</p>}
              {(tpl.fields ?? []).map((fd) => (
                <label key={fd.key} className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">{fd.label}</span>
                  <input value={values[fd.key] ?? fd.def} maxLength={fd.max} onChange={(e) => setValues((v) => ({ ...v, [fd.key]: e.target.value }))}
                    className="w-full rounded-xl bg-white/[0.07] px-3.5 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-2">
          <motion.button whileTap={press} transition={snappy} onClick={doExport} disabled={!filled || !!busy}
            className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-black disabled:opacity-35">
            {filled === 0 ? "Add a photo to start" : settings.saveMode === "auto" ? "Save to roll and phone" : "Save to roll"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/** Small drawing of a frame, rendered once per template so the picker stays cheap. */
function FramePreview({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const t = stripById(id);
    const s = stripSize(t, 1);
    const k = 104 / s.h;
    const tmp = document.createElement("canvas");
    renderStrip(tmp, { template: t, photos: t.slots.map(() => null), scale: 1, placeholder: false });
    c.width = Math.round(s.w * k); c.height = Math.round(s.h * k);
    const g = c.getContext("2d")!;
    g.drawImage(tmp, 0, 0, c.width, c.height);
    g.fillStyle = "rgba(255,255,255,.22)";
    for (const sl of t.slots) g.fillRect(sl.x * k, sl.y * k, sl.w * k, sl.h * k);
  }, [id]);
  return <canvas ref={ref} className="max-h-full max-w-full rounded-[3px] object-contain" />;
}
