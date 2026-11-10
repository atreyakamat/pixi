"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RetroRenderer, type LcdMode } from "@/engine/renderer";
import { BRANDS, CAMERAS, EFFECTS, STAMPS, withEffects, type EffectId } from "@/ui/cameras";
import { CameraIcon } from "@/ui/CameraIcon";
import { sampleScene } from "@/ui/sampleScene";

type Shot = { url: string; kind: "photo" | "video"; ext: string };
type Mode = "photo" | "video";

const cameraError = (e: unknown): string => {
  const n = (e as { name?: string })?.name;
  if (n === "NotAllowedError" || n === "SecurityError") return "Camera permission is blocked. Allow camera for this site in your browser settings, then tap Start camera.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "No camera was found on this device.";
  if (n === "NotReadableError") return "The camera is being used by another app. Close it and try again.";
  return "Could not start the camera. You can still import a photo.";
};

const pickMime = (): { mime: string; ext: string } => {
  const list: [string, string][] = [["video/mp4;codecs=avc1", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]];
  for (const [m, e] of list) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return { mime: m, ext: e };
  return { mime: "", ext: "webm" };
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RetroRenderer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const srcRef = useRef<{ el: TexImageSource; w: number; h: number } | null>(null);
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; ext: string; mic?: MediaStream } | null>(null);

  const [camId, setCamId] = useState(CAMERAS[0].preset.id);
  const [effects, setEffects] = useState<Set<EffectId>>(new Set());
  const [stamp, setStamp] = useState("preset");
  const [brand, setBrand] = useState("All");
  const [minimal, setMinimal] = useState(false);
  const [lcd, setLcd] = useState<LcdMode>("off");
  const [intensity, setIntensity] = useState(1);
  const [mirror, setMirror] = useState(false);
  const [live, setLive] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [mode, setMode] = useState<Mode>("photo");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shots, setShots] = useState<Shot[]>([]);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(false);

  const cam = CAMERAS.find((c) => c.preset.id === camId)!;
  const preset = useMemo(() => withEffects(cam.preset, { effects, stamp }), [cam, effects, stamp]);
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
      if (v && v.readyState >= 2 && v.videoWidth) r.setSource(v, v.videoWidth, v.videoHeight);
      else if (src) r.setSource(src.el, src.w, src.h);
      const a = performance.now();
      r.render({ ...optsRef.current, maxSide: side }, (t - t0) / 1000);
      if (performance.now() - a > 40 && ++slow > 10 && side > 500) { side = Math.round(side * 0.8); slow = 0; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [recording]);

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };

  const startCamera = useCallback(async (want: "user" | "environment") => {
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("The camera only works on a secure page. Open the https:// link (or localhost), not an http:// address or an embedded preview.");
      return;
    }
    stopStream();
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: want }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: want }, audio: false },
      { video: true, audio: false },
    ];
    let last: unknown;
    for (const c of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        let v = videoRef.current;
        if (!v) {
          v = document.createElement("video");
          v.setAttribute("playsinline", ""); v.setAttribute("autoplay", ""); v.muted = true;
          v.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0";
          document.body.appendChild(v);
          videoRef.current = v;
        }
        v.srcObject = stream;
        await v.play();
        streamRef.current = stream;
        setFacing(want); setMirror(want === "user"); setLive(true); setError("");
        return;
      } catch (e) { last = e; if ((e as { name?: string }).name === "NotAllowedError") break; }
    }
    setError(cameraError(last));
  }, []);

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      stopStream();
      if (videoRef.current) videoRef.current.srcObject = null;
      setLive(false); setMirror(false); setError("");
      srcRef.current = { el: bmp, w: bmp.width, h: bmp.height };
    } catch { setError("That file could not be opened as an image."); }
  };

  const takePhoto = async () => {
    setFlash(true); setTimeout(() => setFlash(false), 120);
    const blob = await rendererRef.current!.capture({ ...optsRef.current, maxSide: 2048, date: new Date() }, performance.now() / 1000);
    setShots((s) => [{ url: URL.createObjectURL(blob), kind: "photo" as const, ext: "jpg" }, ...s].slice(0, 24));
  };

  const startRecording = async () => {
    const canvas = canvasRef.current!;
    const out = canvas.captureStream(30);
    let mic: MediaStream | undefined;
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }); mic.getAudioTracks().forEach((t) => out.addTrack(t)); } catch { /* record silently */ }
    const { mime, ext } = pickMime();
    const rec = new MediaRecorder(out, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      mic?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
      setShots((s) => [{ url: URL.createObjectURL(blob), kind: "video" as const, ext }, ...s].slice(0, 24));
    };
    rec.start(250);
    recRef.current = { rec, chunks, ext, mic };
    setElapsed(0); setRecording(true);
  };
  const stopRecording = () => { recRef.current?.rec.state !== "inactive" && recRef.current?.rec.stop(); setRecording(false); };

  const onShutter = () => (mode === "photo" ? takePhoto() : recording ? stopRecording() : startRecording());
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const rows = (["Digicam", "Special"] as const)
    .map((row) => ({ row, items: CAMERAS.filter((c) => c.row === row && (brand === "All" || c.brand === brand)) }))
    .filter((r) => r.items.length);

  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? "bg-orange-500 text-black" : "bg-neutral-800 text-neutral-300 active:bg-neutral-700"}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full min-w-0 max-w-md flex-col overflow-x-hidden bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between px-4 pb-2 pt-3">
        <h1 className="text-lg font-semibold tracking-tight">Pixi</h1>
        <div className="flex items-center gap-3 text-xs text-neutral-300">
          <span className="rounded bg-neutral-800 px-2 py-1">{cam.brand} {cam.model}</span>
          <button onClick={() => setMinimal(!minimal)} className="underline underline-offset-2">{minimal ? "Show controls" : "Minimal"}</button>
        </div>
      </header>

      <div className="relative mx-3 overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
        <canvas ref={canvasRef} className="block h-[58dvh] w-full object-contain" />
        {flash && <div className="pointer-events-none absolute inset-0 bg-white/80" />}
        {recording && <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />REC {mmss}</div>}
        {!live && !error && (
          <button onClick={() => startCamera(facing)} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-black shadow-lg active:scale-95">Start camera</button>
        )}
        {error && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/80 p-3 text-center text-xs text-amber-200">
            {error}
            <div className="mt-2 flex justify-center gap-2">
              <button onClick={() => startCamera(facing)} className="rounded-full bg-orange-500 px-3 py-1 font-semibold text-black">Try again</button>
              <label className="cursor-pointer rounded-full bg-neutral-700 px-3 py-1 text-neutral-100">Import photo<input type="file" accept="image/*" hidden onChange={(e) => importFile(e.target.files?.[0])} /></label>
            </div>
          </div>
        )}
        {!minimal && (
          <div className="absolute right-2 top-2 flex flex-col gap-2 text-xs">
            <button className="rounded-full bg-black/60 px-3 py-1.5 backdrop-blur" onClick={() => startCamera(facing === "user" ? "environment" : "user")}>{live ? "Flip" : "Camera"}</button>
            <label className="cursor-pointer rounded-full bg-black/60 px-3 py-1.5 backdrop-blur">Import<input type="file" accept="image/*" hidden onChange={(e) => importFile(e.target.files?.[0])} /></label>
            <button className="rounded-full bg-black/60 px-3 py-1.5 backdrop-blur" onClick={() => setLcd(lcd === "off" ? "shoot" : lcd === "shoot" ? "play" : "off")}>LCD {lcd}</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex w-16 justify-start">
          {shots[0] && (shots[0].kind === "photo"
            ? <a href={shots[0].url} download={`pixi.${shots[0].ext}`}><img src={shots[0].url} alt="Last shot" className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/20" /></a>
            : <a href={shots[0].url} download={`pixi.${shots[0].ext}`}><video src={shots[0].url} muted className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/20" /></a>)}
        </div>
        <button aria-label={mode === "photo" ? "Take photo" : recording ? "Stop recording" : "Start recording"} onClick={onShutter}
          className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white transition active:scale-95 ${mode === "video" ? "bg-neutral-900" : "bg-orange-500"}`}>
          {mode === "video" && <span className={`block bg-red-500 transition-all ${recording ? "h-6 w-6 rounded-md" : "h-11 w-11 rounded-full"}`} />}
        </button>
        <div className="flex w-16 justify-end">
          <div className="flex overflow-hidden rounded-full bg-neutral-800 text-[11px]">
            {(["photo", "video"] as Mode[]).map((m) => (
              <button key={m} disabled={recording} onClick={() => setMode(m)} className={`px-2.5 py-1.5 ${mode === m ? "bg-white text-black" : "text-neutral-300"}`}>{m === "photo" ? "Pic" : "Vid"}</button>
            ))}
          </div>
        </div>
      </div>

      {!minimal && (
        <section className="space-y-4 pb-8">
          <label className="mx-4 flex items-center gap-3 text-xs text-neutral-400">
            Strength
            <input aria-label="Intensity" type="range" min={0} max={1} step={0.01} value={intensity} onChange={(e) => setIntensity(+e.target.value)} className="flex-1 accent-orange-500" />
            <span className="w-8 text-right tabular-nums">{Math.round(intensity * 100)}</span>
          </label>

          <div>
            <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Timestamp</h2>
            <div className="flex gap-2 overflow-x-auto px-4 pb-1">
              {STAMPS.map((s) => (
                <button key={s.id} onClick={() => setStamp(s.id)} className={chip(stamp === s.id)} title={s.sample}>{s.label}</button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Effects</h2>
            <div className="flex gap-2 overflow-x-auto px-4 pb-1">
              {EFFECTS.map((e) => (
                <button key={e.id} onClick={() => setEffects((s) => { const n = new Set(s); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n; })} className={chip(effects.has(e.id))}>{e.label}</button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Makers</h2>
            <div className="flex gap-4 overflow-x-auto px-4 pb-1">
              {["All", ...BRANDS].map((b) => (
                <button key={b} onClick={() => setBrand(b)} className={`shrink-0 text-sm ${brand === b ? "font-semibold text-orange-400" : "text-neutral-400"}`}>{b}</button>
              ))}
            </div>
          </div>

          {rows.map(({ row, items }) => (
            <div key={row}>
              <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">{row}</h2>
              <div className="flex gap-3 overflow-x-auto px-4 pb-1">
                {items.map((c) => (
                  <button key={c.preset.id} onClick={() => setCamId(c.preset.id)} className="w-24 shrink-0 text-center" title={c.preset.blurb}>
                    <div className={`h-[72px] rounded-xl bg-neutral-800/80 p-1 ring-1 transition ${c.preset.id === camId ? "ring-orange-500" : "ring-white/5"}`}>
                      <CameraIcon body={c.body} color={c.color} />
                    </div>
                    <div className="mt-1.5 truncate text-[11px] font-medium text-neutral-200">{c.preset.name}</div>
                    <div className="truncate text-[10px] text-neutral-500">{c.brand} {c.model}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="px-4 text-xs text-neutral-400">{cam.preset.blurb}</p>

          {shots.length > 0 && (
            <div>
              <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Saved (tap to download)</h2>
              <div className="flex gap-2 overflow-x-auto px-4">
                {shots.map((s) => (
                  <a key={s.url} href={s.url} download={`pixi.${s.ext}`} className="shrink-0">
                    {s.kind === "photo" ? <img src={s.url} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <video src={s.url} muted className="h-16 w-16 rounded-lg object-cover" />}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
