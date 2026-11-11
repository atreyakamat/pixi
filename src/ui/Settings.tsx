"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { I } from "./icons";
import { press, smooth, snappy, tap } from "./motion";
import { DEFAULTS, type Settings as S } from "./settings";
import { rollClear, rollSize } from "./roll";
import { isNative } from "./native";

const mb = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">{title}</h2>
      <div className="mx-4 divide-y divide-white/[0.06] overflow-hidden rounded-[18px] bg-white/[0.05]">{children}</div>
      {note && <p className="px-5 pt-2 text-[12px] leading-relaxed text-white/35">{note}</p>}
    </section>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[15px]">{label}</div>
        {sub && <div className="mt-0.5 text-[12px] leading-snug text-white/40">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => { tap(); onChange(!on); }}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-[#30d158]" : "bg-white/15"}`}>
      <motion.span layout transition={snappy} className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow" style={{ left: on ? 22 : 2 }} />
    </button>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex shrink-0 rounded-lg bg-white/[0.08] p-[3px]">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => { tap(); onChange(v); }} className="relative rounded-[7px] px-3 py-1 text-[13px] font-medium">
          {value === v && <motion.span layoutId={`seg-${options.map((o) => o[0]).join()}`} className="absolute inset-0 rounded-[7px] bg-white/[0.16]" transition={smooth} />}
          <span className={`relative ${value === v ? "text-white" : "text-white/55"}`}>{l}</span>
        </button>
      ))}
    </div>
  );
}

export function SettingsScreen({ settings, setSettings, onClose, onCleared }: { settings: S; setSettings: (s: S) => void; onClose: () => void; onCleared: () => void }) {
  const [use, setUse] = useState<{ count: number; bytes: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof S>(k: K, v: S[K]) => setSettings({ ...settings, [k]: v });
  useEffect(() => { rollSize().then(setUse); }, []);

  return (
    <section className="pb-10">
      <header className="safe-t flex items-center justify-between px-4 pb-4 pt-3">
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Settings</h1>
        <motion.button whileTap={press} transition={snappy} aria-label="Close settings" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.09]"><I n="close" className="h-[18px] w-[18px]" /></motion.button>
      </header>

      <div className="space-y-6">
        <Group title="Saving" note={settings.saveMode === "auto"
          ? "Every shot is kept in Pixi and copied to your phone's gallery straight away."
          : "Shots are kept in Pixi only. Open one from the Roll and tap Save when you want it on your phone."}>
          <Row label="When you take a photo">
            <Seg value={settings.saveMode} onChange={(v) => set("saveMode", v)} options={[["auto", "Save to phone"], ["manual", "Keep in Pixi"]]} />
          </Row>
          <Row label="File type" sub={settings.format === "png" ? "Larger files, no compression marks" : "Smaller files, works everywhere"}>
            <Seg value={settings.format} onChange={(v) => set("format", v)} options={[["jpeg", "JPEG"], ["png", "PNG"]]} />
          </Row>
          {settings.format === "jpeg" && (
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between pb-1.5">
                <span className="text-[15px]">Quality</span>
                <span className="text-[13px] tabular-nums text-white/45">{Math.round(settings.quality * 100)}%</span>
              </div>
              <input aria-label="JPEG quality" type="range" min={0.6} max={1} step={0.02} value={settings.quality} onChange={(e) => set("quality", +e.target.value)} className="w-full accent-[var(--accent)]" />
            </div>
          )}
        </Group>

        <Group title="Photobooth strips" note="A real booth prints two identical strips so you can keep one and give one away.">
          <Row label="Print a pair" sub="Export two copies side by side">
            <Toggle on={settings.stripPair} onChange={(v) => set("stripPair", v)} label="Print a pair" />
          </Row>
        </Group>

        <Group title="Feel">
          <Row label="Tap feedback" sub="A short buzz when you press a control">
            <Toggle on={settings.haptics} onChange={(v) => set("haptics", v)} label="Tap feedback" />
          </Row>
        </Group>

        <Group title="Storage" note={`Pixi keeps your most recent ${settings.rollLimit} shots on this phone. Older ones drop off on their own.`}>
          <Row label="Your roll" sub={use ? `${use.count} ${use.count === 1 ? "shot" : "shots"} · ${mb(use.bytes)}` : "Measuring…"} />
          <Row label="How many to keep">
            <Seg value={String(settings.rollLimit)} onChange={(v) => set("rollLimit", +v)} options={[["200", "200"], ["500", "500"], ["2000", "2000"]]} />
          </Row>
          <button onClick={() => { tap(); setConfirm(true); }} className="w-full px-4 py-3 text-left text-[15px] text-[#ff453a]">Empty the roll…</button>
        </Group>

        <Group title="About">
          <Row label="Pixi" sub={isNative() ? "Android app" : "Web app"} />
          <Row label="Where your photos go" sub="Everything is made on this phone. Pixi has no account and uploads nothing." />
        </Group>
      </div>

      {confirm && (
        <div role="dialog" aria-modal="true" aria-label="Empty the roll" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-[300px] rounded-[22px] bg-[#1c1c1f] p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-semibold">Empty the roll?</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">This removes every shot Pixi is holding on this phone. Anything already saved to your gallery stays there.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirm(false)} className="flex-1 rounded-xl bg-white/[0.08] py-2.5 text-[15px] font-medium">Keep them</button>
              <button onClick={async () => { await rollClear(); setConfirm(false); setUse({ count: 0, bytes: 0 }); onCleared(); }} className="flex-1 rounded-xl bg-[#ff453a] py-2.5 text-[15px] font-semibold">Empty</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-6">
        <button onClick={() => setSettings({ ...DEFAULTS })} className="w-full rounded-xl bg-white/[0.06] py-3 text-[15px] font-medium text-white/70">Reset all settings</button>
      </div>
    </section>
  );
}
