"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RetroRenderer, type LcdMode } from "@/engine/renderer";
import { CAMERAS, EFFECTS, withEffects, type EffectId } from "@/ui/cameras";
import { CameraIcon } from "@/ui/CameraIcon";

function sampleScene(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1200; c.height = 1600;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 1000);
  sky.addColorStop(0, "#3b5b8c"); sky.addColorStop(0.6, "#f2a65a"); sky.addColorStop(1, "#ffd8a0");
  g.fillStyle = sky; g.fillRect(0, 0, 1200, 1600);
  g.fillStyle = "#fff3c4"; g.beginPath(); g.arc(820, 820, 90, 0, 7); g.fill();
  g.fillStyle = "#2c2a2e"; g.fillRect(0, 1000, 1200, 600);
  g.fillStyle = "#3a4a3a"; for (let i = 0; i < 9; i++) g.fillRect(40 + i * 130, 880 - (i % 3) * 60, 90, 200);
  g.fillStyle = "#d9b89a"; g.beginPath(); g.arc(380, 1180, 120, 0, 7); g.fill();
  g.fillStyle = "#6b3f2a"; g.fillRect(250, 1290, 260, 300);
  return c;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RetroRenderer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const srcRef = useRef<{ el: TexImageSource; w: number; h: number } | null>(null);
  const [camId, setCamId] = useState(CAMERAS[0].preset.id);
  const [effects, setEffects] = useState<Set<EffectId>>(new Set());
  const [minimal, setMinimal] = useState(false);
  const [lcd, setLcd] = useState<LcdMode>("off");
  const [intensity, setIntensity] = useState(1);
  const [mirror, setMirror] = useState(false);
  const [live, setLive] = useState(false);
  const [shots, setShots] = useState<string[]>([]);
  const [error, setError] = useState("");

  const cam = CAMERAS.find((c) => c.preset.id === camId)!;
  const preset = useMemo(() => withEffects(cam.preset, effects), [cam, effects]);
  const optsRef = useRef({ preset, intensity, mirror, lcd });
  optsRef.current = { preset, intensity, mirror, lcd };

  useEffect(() => {
    const r = new RetroRenderer(canvasRef.current!);
    rendererRef.current = r;
    const s = sampleScene();
    srcRef.current = { el: s, w: s.width, h: s.height };
    r.setSource(s, s.width, s.height);
    r.warmUp();
    let raf = 0, side = 1100, slow = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      const v = videoRef.current, src = srcRef.current;
      if (v && v.readyState >= 2) { r.setSource(v, v.videoWidth, v.videoHeight); }
      else if (src) r.setSource(src.el, src.w, src.h);
      const a = performance.now();
      r.render({ ...optsRef.current, maxSide: side }, (t - t0) / 1000);
      if (performance.now() - a > 40 && ++slow > 10 && side > 500) { side = Math.round(side * 0.8); slow = 0; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleCamera = useCallback(async (facing: "user" | "environment" = "environment") => {
    try {
      videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      const v = videoRef.current ?? document.createElement("video");
      v.muted = true; v.playsInline = true; v.srcObject = stream;
      await v.play();
      videoRef.current = v; setMirror(facing === "user"); setLive(true); setError("");
    } catch { setError("Camera unavailable. You can import a photo instead."); }
  }, []);

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
    videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    videoRef.current = null; setLive(false); setMirror(false);
    srcRef.current = { el: bmp, w: bmp.width, h: bmp.height };
  };

  const shutter = async () => {
    const r = rendererRef.current!;
    const blob = await r.capture({ ...optsRef.current, maxSide: 2048, date: new Date() }, performance.now() / 1000);
    setShots((s) => [URL.createObjectURL(blob), ...s].slice(0, 12));
  };

  const rows = (["Digicam", "Special"] as const).map((row) => ({ row, items: CAMERAS.filter((c) => c.row === row) }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-neutral-950 text-neutral-100">
      <div className="relative flex-1 bg-black">
        <canvas ref={canvasRef} className="block h-[62dvh] w-full object-contain" />
        {error && <p className="absolute inset-x-0 top-2 text-center text-xs text-amber-300">{error}</p>}
        {!minimal && (
          <div className="absolute right-2 top-2 flex flex-col gap-2 text-xs">
            <button className="rounded bg-black/60 px-2 py-1" onClick={() => toggleCamera(mirror ? "environment" : "user")}>{live ? "Flip" : "Camera"}</button>
            <label className="cursor-pointer rounded bg-black/60 px-2 py-1">Import<input type="file" accept="image/*" hidden onChange={(e) => importFile(e.target.files?.[0])} /></label>
            <button className="rounded bg-black/60 px-2 py-1" onClick={() => setLcd(lcd === "off" ? "shoot" : lcd === "shoot" ? "play" : "off")}>LCD: {lcd}</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 py-3">
        <button className="text-xs underline" onClick={() => setMinimal(!minimal)}>{minimal ? "Show UI" : "Minimal"}</button>
        <button aria-label="Shutter" onClick={shutter} className="h-16 w-16 rounded-full border-4 border-white bg-orange-500 active:scale-95" />
        <input aria-label="Intensity" type="range" min={0} max={1} step={0.01} value={intensity} onChange={(e) => setIntensity(+e.target.value)} className="w-24" />
      </div>

      {!minimal && (
        <section className="space-y-3 pb-4">
          <div className="flex gap-2 overflow-x-auto px-3">
            {EFFECTS.map((e) => (
              <button key={e.id} onClick={() => setEffects((s) => { const n = new Set(s); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n; })}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${effects.has(e.id) ? "bg-orange-500 text-black" : "bg-neutral-800"}`}>{e.label}</button>
            ))}
          </div>
          {rows.map(({ row, items }) => (
            <div key={row}>
              <h2 className="px-3 pb-1 text-xs uppercase tracking-wider text-neutral-400">{row}</h2>
              <div className="flex gap-2 overflow-x-auto px-3">
                {items.map((c) => (
                  <button key={c.preset.id} onClick={() => setCamId(c.preset.id)} className="w-20 shrink-0 text-center" title={c.preset.blurb}>
                    <div className="h-16 rounded-lg bg-neutral-800/80"><CameraIcon body={c.body} color={c.color} selected={c.preset.id === camId} /></div>
                    <div className="truncate text-[10px] text-neutral-300">{c.model}</div>
                    <div className="truncate text-[9px] text-neutral-500">{c.preset.name}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {shots.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-3">
              {shots.map((u) => <a key={u} href={u} download="retro-cam.jpg"><img src={u} alt="" className="h-14 w-14 rounded object-cover" /></a>)}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
