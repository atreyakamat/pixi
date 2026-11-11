"use client";
import { useState } from "react";
import { LAYER_DEFS, defaultParams } from "@/engine/layerDefs";
import type { GpuLayerKind, LayerSpec, OverlaySpec, Preset } from "@/engine/types";
import { CATS, GUIDE_STEPS, LAYER_HELP } from "./layerHelp";
import { STAMPS } from "./cameras";
import { presetToLook, type SavedLook } from "./store";

const FRAMES: { id: string; label: string }[] = [
  { id: "none", label: "No frame" }, { id: "polaroid", label: "Polaroid" }, { id: "thin", label: "Thin border" }, { id: "rounded", label: "Rounded" }, { id: "film", label: "Film strip" },
];

interface Props {
  draft: SavedLook;
  saved: boolean;
  templates: Preset[];
  commit: (l: SavedLook, key?: string) => void;
  undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
  onCompare: (on: boolean) => void;
  onSave: (asCopy: boolean) => void;
  onShare: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function Builder({ draft, saved, templates, commit, undo, redo, canUndo, canRedo, onCompare, onSave, onShare, onDelete, onClose }: Props) {
  const [open, setOpen] = useState<number | null>(0);
  const [guide, setGuide] = useState(false);
  const [adding, setAdding] = useState(false);
  const set = (layers: LayerSpec[], key?: string) => commit({ ...draft, layers }, key);
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= draft.layers.length) return; const a = [...draft.layers]; [a[i], a[j]] = [a[j], a[i]]; set(a); setOpen(j); };
  const patch = (i: number, p: Partial<LayerSpec>, key?: string) => set(draft.layers.map((l, k) => (k === i ? { ...l, ...p } : l)), key);
  const stampId = (() => { const s = draft.overlays.find((o) => o.kind === "stamp"); if (!s) return "none"; const m = STAMPS.find((x) => x.overlay && x.overlay.kind === "stamp" && s.kind === "stamp" && x.overlay.style === s.style && x.overlay.format === s.format); return m?.id ?? "custom"; })();
  const frameId = (draft.overlays.find((o) => o.kind === "frame") as Extract<OverlaySpec, { kind: "frame" }> | undefined)?.style ?? "none";

  const setStamp = (id: string) => {
    const rest = draft.overlays.filter((o) => o.kind !== "stamp");
    const def = STAMPS.find((s) => s.id === id);
    commit({ ...draft, overlays: def?.overlay ? [...rest, def.overlay] : rest });
  };
  const setFrame = (id: string) => {
    const rest = draft.overlays.filter((o) => o.kind !== "frame");
    commit({ ...draft, overlays: id === "none" ? rest : [...rest, { kind: "frame", style: id as "polaroid", color: "#f4efe6" } as OverlaySpec] });
  };
  const applyTemplate = (id: string) => {
    if (id === "__blank") { commit({ ...draft, layers: [{ kind: "grade", params: defaultParams("grade") }], overlays: [], blurb: "" }); setOpen(0); return; }
    const t = templates.find((p) => p.id === id); if (!t) return;
    const c = presetToLook(t, draft.name);
    commit({ ...draft, layers: c.layers, overlays: c.overlays, aspect: c.aspect, blurb: t.blurb }); setOpen(0);
  };

  const btn = "rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 active:bg-neutral-700 disabled:opacity-40";
  return (
    <section className="space-y-3 px-3 pb-6">
      <div className="flex items-center gap-2">
        <input value={draft.name} onChange={(e) => commit({ ...draft, name: e.target.value.slice(0, 40) }, "name")} placeholder="Name your look" className="min-w-0 flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-orange-500" />
        <button className={btn} onClick={() => setGuide(true)}>Guide</button>
        <button className={btn} onClick={onClose}>Close</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} disabled={!canUndo} onClick={undo}>Undo</button>
        <button className={btn} disabled={!canRedo} onClick={redo}>Redo</button>
        <button className={`${btn} select-none touch-none`} onPointerDown={() => onCompare(true)} onPointerUp={() => onCompare(false)} onPointerLeave={() => onCompare(false)} onPointerCancel={() => onCompare(false)}>Hold to compare</button>
        <select aria-label="Start from template" className="min-w-0 flex-1 rounded-full bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200" value="" onChange={(e) => e.target.value && applyTemplate(e.target.value)}>
          <option value="">Start from…</option>
          <option value="__blank">Blank look</option>
          {Array.from(new Set(templates.map((t) => t.family))).map((f) => (
            <optgroup key={f} label={f}>{templates.filter((t) => t.family === f).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {draft.layers.map((l, i) => {
          const def = LAYER_DEFS[l.kind]; const help = LAYER_HELP[l.kind]; const on = l.enabled !== false; const isOpen = open === i;
          return (
            <div key={i} className={`rounded-xl bg-neutral-900 ring-1 ${isOpen ? "ring-orange-500/60" : "ring-white/10"}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button role="switch" aria-checked={on} aria-label={`${on ? "Disable" : "Enable"} ${help.title}`} onClick={() => patch(i, { enabled: !on })} className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition ${on ? "bg-orange-500" : "bg-neutral-700"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} /></button>
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : i)}>
                  <div className={`truncate text-sm font-medium ${on ? "" : "text-neutral-500"}`}>{help.title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500">{help.cat}</div>
                </button>
                <button aria-label="Move up" disabled={i === 0} className="px-1 text-neutral-400 disabled:opacity-25" onClick={() => move(i, -1)}>▲</button>
                <button aria-label="Move down" disabled={i === draft.layers.length - 1} className="px-1 text-neutral-400 disabled:opacity-25" onClick={() => move(i, 1)}>▼</button>
              </div>
              {isOpen && (
                <div className="space-y-2 border-t border-white/5 px-3 pb-3 pt-2">
                  <p className="text-xs text-neutral-400">{help.help}</p>
                  {def.params.map((p) => {
                    const v = l.params?.[p.key] ?? p.def;
                    return (
                      <label key={p.key} className="flex items-center gap-3 text-xs text-neutral-300">
                        <span className="w-24 shrink-0 truncate">{p.label}</span>
                        <input type="range" min={p.min} max={p.max} step={p.step} value={v} className="flex-1 accent-orange-500"
                          onChange={(e) => patch(i, { params: { ...(l.params ?? {}), [p.key]: +e.target.value } }, `p${i}.${p.key}`)} />
                        <span className="w-10 text-right tabular-nums text-neutral-400">{Number(v.toFixed(2))}</span>
                      </label>
                    );
                  })}
                  <div className="flex gap-2 pt-1">
                    <button className={btn} onClick={() => patch(i, { params: defaultParams(l.kind) })}>Reset layer</button>
                    <button className={btn} onClick={() => { const a = [...draft.layers]; a.splice(i + 1, 0, JSON.parse(JSON.stringify(l))); set(a); setOpen(i + 1); }}>Duplicate</button>
                    <button className={`${btn} text-red-300`} onClick={() => { set(draft.layers.filter((_, k) => k !== i)); setOpen(null); }}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {draft.layers.length === 0 && <p className="rounded-xl bg-neutral-900 p-4 text-center text-xs text-neutral-400">No layers yet. Add one below or pick a template.</p>}
      </div>

      <div>
        <button className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-black active:scale-[.99]" onClick={() => setAdding(!adding)}>{adding ? "Close layer list" : "+ Add layer"}</button>
        {adding && (
          <div className="mt-2 space-y-3 rounded-xl bg-neutral-900 p-3 ring-1 ring-white/10">
            {CATS.map((c) => (
              <div key={c}>
                <h3 className="pb-1 text-[11px] uppercase tracking-wider text-neutral-500">{c}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(LAYER_HELP) as GpuLayerKind[]).filter((k) => LAYER_HELP[k].cat === c).map((k) => (
                    <button key={k} onClick={() => { if (draft.layers.length >= 24) return; set([...draft.layers, { kind: k, params: defaultParams(k) }]); setOpen(draft.layers.length); setAdding(false); }} className="rounded-lg bg-neutral-800 p-2 text-left active:bg-neutral-700">
                      <div className="text-xs font-medium">{LAYER_HELP[k].title}</div>
                      <div className="line-clamp-2 text-[10px] text-neutral-400">{LAYER_HELP[k].help}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
        <label className="space-y-1"><span className="text-[11px] uppercase tracking-wider text-neutral-500">Timestamp</span>
          <select className="w-full rounded-lg bg-neutral-800 px-2 py-2" value={stampId} onChange={(e) => setStamp(e.target.value)}>
            <option value="none">None</option>
            {stampId === "custom" && <option value="custom">Custom</option>}
            {STAMPS.filter((s) => s.overlay).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select></label>
        <label className="space-y-1"><span className="text-[11px] uppercase tracking-wider text-neutral-500">Frame</span>
          <select className="w-full rounded-lg bg-neutral-800 px-2 py-2" value={frameId} onChange={(e) => setFrame(e.target.value)}>
            {FRAMES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select></label>
      </div>

      <label className="block space-y-1 text-xs text-neutral-300"><span className="text-[11px] uppercase tracking-wider text-neutral-500">Description</span>
        <input value={draft.blurb} maxLength={120} onChange={(e) => commit({ ...draft, blurb: e.target.value }, "blurb")} placeholder="What does it feel like?" className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-orange-500" /></label>

      <div className="flex flex-wrap gap-2 pt-1">
        <button className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-black" onClick={() => onSave(false)}>{saved ? "Save changes" : "Save to My Looks"}</button>
        {saved && <button className={btn} onClick={() => onSave(true)}>Save as copy</button>}
        <button className={btn} onClick={onShare}>Share…</button>
        {saved && <button className={`${btn} text-red-300`} onClick={onDelete}>Delete</button>}
      </div>

      {guide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="How looks work" onClick={() => setGuide(false)}>
          <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-neutral-900 p-4 ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-base font-semibold">Make your own look</h2>
            <ol className="space-y-3">
              {GUIDE_STEPS.map((s, i) => (
                <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-black">{i + 1}</span>
                  <div><div className="text-sm font-medium">{s.t}</div><p className="text-xs text-neutral-400">{s.d}</p></div></li>
              ))}
            </ol>
            <button className="mt-4 w-full rounded-full bg-orange-500 py-2 text-sm font-semibold text-black" onClick={() => setGuide(false)}>Got it</button>
          </div>
        </div>
      )}
    </section>
  );
}
