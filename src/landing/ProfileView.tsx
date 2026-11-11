"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PRESETS } from "@/presets";
import type { Preset } from "@/engine/types";
import { applyLook } from "@/ui/applyLook";
import { PixiMark } from "@/ui/Logo";
import { reveal } from "@/ui/motion";
import { decodeProfile, profileCodeFrom, type SharedProfile } from "@/ui/profile";
import { loadFavs, loadLooks, lookToPreset, persistFavs, persistLooks } from "@/ui/store";
import { beach } from "./scenes";

type Tile = { key: string; name: string; note: string; src: string | null };
const isBuiltin = (id: string) => PRESETS.some((p) => p.id === id);

/**
 * Someone's profile, opened from a link. Everything on this page comes out of the link itself
 * (the part after #, which browsers never send to a server) and is checked before it is shown.
 */
export function ProfileView() {
  const [state, setState] = useState<"loading" | "none" | "ok">("loading");
  const [p, setP] = useState<SharedProfile | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let dead = false;
    const read = async () => {
      const code = profileCodeFrom(decodeURIComponent(location.hash));
      const sp = code ? await decodeProfile(code, isBuiltin) : null;
      if (dead) return;
      setP(sp); setState(sp ? "ok" : "none"); setAdded(false);
    };
    void read();
    window.addEventListener("hashchange", read);
    return () => { dead = true; window.removeEventListener("hashchange", read); };
  }, []);

  const presets = useMemo(() => (p?.looks ?? []).map((l): { preset: Preset; mine: boolean } | null => {
    if ("builtin" in l) { const pr = PRESETS.find((x) => x.id === l.builtin); return pr ? { preset: pr, mine: false } : null; }
    return { preset: lookToPreset(l.look), mine: true };
  }).filter((x): x is { preset: Preset; mine: boolean } => !!x), [p]);

  // Show each look on a sample scene, rendered by the real engine.
  useEffect(() => {
    let dead = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- placeholders first, pictures as they render
    setTiles(presets.map((x, i) => ({ key: `${x.preset.id}-${i}`, name: x.preset.name, note: x.mine ? "Their own look" : "Built into Pixi", src: null })));
    (async () => {
      const scene = beach(600, 800);
      const blob: Blob | null = await new Promise((r) => scene.toBlob((b) => r(b), "image/jpeg", 0.9));
      if (!blob) return;
      for (let i = 0; i < presets.length; i++) {
        try {
          const bmp = await applyLook(blob, presets[i].preset, 600);
          const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
          c.getContext("2d")!.drawImage(bmp, 0, 0); bmp.close();
          const src = c.toDataURL("image/jpeg", 0.85);
          if (dead) return;
          setTiles((t) => t.map((x, k) => (k === i ? { ...x, src } : x)));
        } catch { /* no WebGL here: the names still show */ }
      }
    })();
    return () => { dead = true; };
  }, [presets]);

  /** Same site, same storage as the app: the looks are written straight into this browser's Pixi. */
  const add = () => {
    if (!p) return;
    const custom = p.looks.flatMap((l) => ("look" in l ? [l.look] : []));
    const stars = p.looks.flatMap((l) => ("builtin" in l ? [l.builtin] : []));
    if (custom.length) persistLooks([...custom, ...loadLooks()].slice(0, 200));
    if (stars.length) persistFavs([...new Set([...loadFavs(), ...stars])]);
    setAdded(true);
  };

  const who = p ? p.name || `@${p.handle}` : "";
  return (
    <div className="relative min-h-dvh select-text bg-[#0b0a09] text-white" style={{ userSelect: "text" }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,194,71,.14),transparent_70%)]" />
      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" prefetch={false} className="flex items-center gap-2.5" aria-label="Pixi home"><PixiMark size={30} /><span className="text-[1.125rem] font-bold tracking-[-0.02em]">Pixi</span></Link>
        <a href="/app/" className="rounded-full bg-white/10 px-4 py-2 text-[0.9375rem] font-semibold">Open Pixi</a>
      </header>

      <main className="relative mx-auto max-w-3xl px-6 pb-24 pt-8">
        {state === "loading" && <p className="py-24 text-center text-white/40" role="status">Opening profile…</p>}

        {state === "none" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={reveal} className="py-20 text-center">
            <h1 className="text-[2rem] font-bold tracking-[-0.02em]">This profile link is incomplete</h1>
            <p className="mx-auto mt-3 max-w-[26rem] text-[1.0625rem] leading-[1.5] text-white/60">A Pixi profile travels inside its link, so part of the link went missing on the way. Ask for it again, or scan the QR code on their card.</p>
            <Link href="/" prefetch={false} className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-[1.0625rem] font-semibold text-black">See what Pixi is</Link>
          </motion.div>
        )}

        {state === "ok" && p && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={reveal} className="flex flex-col items-center text-center">
              <div aria-hidden className="flex h-24 w-24 items-center justify-center rounded-full bg-[#F6F1E7] text-[2.5rem] font-bold text-[#211C17]">{(p.name[0] || p.handle[0] || "P").toUpperCase()}</div>
              <h1 className="mt-5 break-words text-[clamp(2rem,6vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">{who}</h1>
              {p.handle && p.name && <p className="lcd mt-1.5 text-[1rem] tracking-normal text-[var(--accent)]">@{p.handle}</p>}
              {p.bio && <p className="mt-4 max-w-[28rem] break-words text-[1.0625rem] leading-[1.5] text-white/65">{p.bio}</p>}
            </motion.div>

            {tiles.length > 0 ? (
              <>
                <h2 className="mt-14 text-center text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-white/40">Shoots with</h2>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {tiles.map((t, i) => (
                    <motion.figure key={t.key} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...reveal, delay: 0.1 + i * 0.08 }} className="overflow-hidden rounded-[1.25rem] bg-white/[0.05]">
                      <div className="aspect-[3/4] bg-[#151517]">{t.src && <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} src={t.src} alt={`A sample scene through ${t.name}`} className="h-full w-full object-cover" />}</div>
                      <figcaption className="px-4 py-3"><div className="break-words text-[1rem] font-semibold">{t.name}</div><div className="text-[0.8125rem] text-white/45">{t.note}</div></figcaption>
                    </motion.figure>
                  ))}
                </div>
                <div className="mt-10 flex flex-col items-center gap-3 text-center">
                  {added ? (
                    <>
                      <p role="status" className="text-[1.0625rem] font-semibold text-[var(--accent)]">Added. They are waiting in your Looks.</p>
                      <a href="/app/" className="rounded-full bg-white px-7 py-3.5 text-[1.0625rem] font-semibold text-black">Open the camera</a>
                    </>
                  ) : (
                    <>
                      <button onClick={add} className="rounded-full bg-white px-7 py-3.5 text-[1.0625rem] font-semibold text-black transition-transform active:scale-95">Add {tiles.length === 1 ? "this look" : `these ${tiles.length} looks`} to my Pixi</button>
                      <p className="max-w-[24rem] text-[0.8125rem] text-white/40">Free, no account. The looks are saved in this browser and nothing is sent anywhere.</p>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-12 text-center"><a href="/app/" className="rounded-full bg-white px-7 py-3.5 text-[1.0625rem] font-semibold text-black">Try Pixi yourself</a></div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
