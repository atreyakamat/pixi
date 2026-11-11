"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RetroRenderer, type LcdMode } from "@/engine/renderer";
import { BRANDS, CAMERAS, EFFECTS, STAMPS, cameraFromPreset, withEffects, withFilm, type EffectId } from "@/ui/cameras";
import { Builder } from "@/ui/Builder";
import { Gallery, type GalleryItem } from "@/ui/Gallery";
import { FilmCarousel } from "@/ui/FilmCarousel";
import { isNative, nativeShare } from "@/ui/native";
import { rollAdd, rollAll, rollDelete } from "@/ui/roll";
import { ShareSheet } from "@/ui/ShareSheet";
import { AnimatePresence, motion } from "framer-motion";
import { I } from "@/ui/icons";
import { PixiMark } from "@/ui/Logo";
import { Splash } from "@/ui/Splash";
import { Onboarding } from "@/ui/Onboarding";
import { Shutter } from "@/ui/Shutter";
import { ModeDial } from "@/ui/ModeDial";
import { CameraCarousel } from "@/ui/CameraCarousel";
import { Sheet } from "@/ui/Sheet";
import { Nav, type View } from "@/ui/Nav";
import { Roll } from "@/ui/Roll";
import { composeBooth, type BoothLayout } from "@/ui/booth";
import { FILMS } from "@/presets/films";
import { useDraft } from "@/ui/useDraft";
import { loadFavs, loadLooks, lookToPreset, newId, persistFavs, persistLooks, presetToLook, type SavedLook } from "@/ui/store";
import { PRESETS } from "@/presets";
import { CameraIcon } from "@/ui/CameraIcon";
import { sampleScene } from "@/ui/sampleScene";
import { useCamera } from "@/ui/useCamera";
import { MODES, PRO_CONTROLS, PRO_DEFAULT, applyMode, type ModeId, type ProState } from "@/ui/modes";
import { WATERMARKS, watermarkOverlays, type WatermarkId } from "@/ui/watermarks";
import { encodeTimelapse } from "@/ui/timelapse";

type Shot = { id: string; url: string; kind: "photo" | "video"; ext: string; blob: Blob; created: number };

const ASPECTS = [
  { id: "look", label: "Auto", v: 0 },
  { id: "3:4", label: "3:4", v: 3 / 4 },
  { id: "1:1", label: "1:1", v: 1 },
  { id: "4:3", label: "4:3", v: 4 / 3 },
  { id: "9:16", label: "9:16", v: 9 / 16 },
  { id: "16:9", label: "16:9", v: 16 / 9 },
];
const GRIDS = [
  { id: "off", label: "Grid off" },
  { id: "thirds", label: "Grid thirds" },
  { id: "square", label: "Grid 4×4" },
  { id: "golden", label: "Grid golden" },
  { id: "cross", label: "Grid center" },
  { id: "diag", label: "Grid diagonal" },
];
const TIMERS = [0, 3, 5, 10];
const TL_INTERVALS = [1, 2, 5, 10, 30];
const MAX_TL_FRAMES = 600;

const pickMime = (): { mime: string; ext: string } => {
  const list: [string, string][] = [["video/mp4;codecs=avc1", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]];
  for (const [m, e] of list) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return { mime: m, ext: e };
  return { mime: "", ext: "webm" };
};

function GridOverlay({ id }: { id: string }) {
  if (id === "off") return null;
  const lines: [number, number, number, number][] = [];
  const v = (x: number) => lines.push([x, 0, x, 100]);
  const h = (y: number) => lines.push([0, y, 100, y]);
  if (id === "thirds") { v(33.33); v(66.66); h(33.33); h(66.66); }
  if (id === "square") { [25, 50, 75].forEach((n) => { v(n); h(n); }); }
  if (id === "golden") { v(38.2); v(61.8); h(38.2); h(61.8); }
  if (id === "cross") { v(50); h(50); }
  if (id === "diag") { lines.push([0, 0, 100, 100], [100, 0, 0, 100]); }
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {lines.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="rgba(255,255,255,.55)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />)}
      {id === "cross" && <circle cx="50" cy="50" r="2" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

const Icon = ({ d, className = "h-5 w-5" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);
const ICON = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  flip: "M4 8V5h3M20 16v3h-3M5 8a8 8 0 0 1 14-2M19 16a8 8 0 0 1-14 2",
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RetroRenderer | null>(null);
  const srcRef = useRef<{ el: TexImageSource; w: number; h: number } | null>(null);
  const overrideRef = useRef<{ el: TexImageSource; w: number; h: number } | null>(null);
  const recRef = useRef<{ rec: MediaRecorder; mic?: MediaStream } | null>(null);
  const tlRef = useRef<{ timer: ReturnType<typeof setInterval>; frames: Blob[]; w: number; h: number } | null>(null);
  const cancelRef = useRef(false);
  const micRef = useRef<MediaStream | null>(null);
  const pauseRef = useRef(false);
  const viewRef = useRef<View>("camera");
  const bootRef = useRef("splash");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d0: number; z0: number } | null>(null);
  const cam = useCamera();

  const [view, setView] = useState<View>("camera");
  viewRef.current = view;
  const [myLooks, setMyLooks] = useState<SavedLook[]>([]);
  const [looksReady, setLooksReady] = useState(false);
  const [favs, setFavs] = useState<string[]>([]);
  const [filmId, setFilmId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [toast, setToast] = useState("");
  const dr = useDraft();
  const [camId, setCamId] = useState(CAMERAS[0].preset.id);
  const [effects, setEffects] = useState<Set<EffectId>>(new Set());
  const [stamp, setStamp] = useState("preset");
  const [brand, setBrand] = useState("All");
  const [shelf, setShelf] = useState(false);
  const [shelfTab, setShelfTab] = useState<"cams" | "film" | "style">("cams");
  const [proSheet, setProSheet] = useState(false);
  const [frameId, setFrameId] = useState<"auto" | "none" | "polaroid" | "thin" | "rounded" | "film">("auto");
  const [boothLayout, setBoothLayout] = useState<BoothLayout>("strip");
  const [boothStep, setBoothStep] = useState(0);
  const [snap, setSnap] = useState(0);
  const [boot, setBoot] = useState<"splash" | "onboard" | "ready">("splash");
  bootRef.current = boot;
  const [lcd, setLcd] = useState<LcdMode>("off");
  const [intensity, setIntensity] = useState(1);
  const [mode, setMode] = useState<ModeId>("photo");
  const [aspectId, setAspectId] = useState("look");
  const [gridId, setGridId] = useState("off");
  const [timerSec, setTimerSec] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [wmId, setWmId] = useState<WatermarkId>("off");
  const [wmText, setWmText] = useState("");
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<[number, number]>([0.5, 0.45]);
  const [portraitBlur, setPortraitBlur] = useState(0.8);
  const [pro, setPro] = useState<ProState>(PRO_DEFAULT);
  const [tlInterval, setTlInterval] = useState(2);
  const [mirror, setMirror] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tlCount, setTlCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(false);
  const [ring, setRing] = useState<{ x: number; y: number; k: number } | null>(null);
  const [fit, setFit] = useState({ w: 300, h: 400 });

  const allCams = useMemo(() => [...myLooks.map((l) => cameraFromPreset(lookToPreset(l))), ...CAMERAS], [myLooks]);
  const camDef = allCams.find((c) => c.preset.id === camId) ?? CAMERAS[0];
  const film = FILMS.find((f) => f.id === filmId) ?? null;
  const building = view === "builder" && dr.draft;
  const aspect = aspectId === "look" ? camDef.preset.aspect ?? 3 / 4 : ASPECTS.find((a) => a.id === aspectId)!.v;

  const preset = useMemo(() => {
    if (building && dr.draft) return lookToPreset(dr.draft);
    const withFx = withEffects(withFilm(camDef.preset, film), { effects, stamp });
    const moded = applyMode(withFx, mode, { pro, focus, portraitBlur });
    const base = frameId === "auto" ? (moded.overlays ?? []) : (moded.overlays ?? []).filter((o) => o.kind !== "frame");
    const frame = frameId === "auto" || frameId === "none" ? [] : [{ kind: "frame" as const, style: frameId, color: frameId === "polaroid" || frameId === "thin" ? "#f4efe6" : "#111111" }];
    return { ...moded, overlays: [...base, ...frame, ...watermarkOverlays(wmId, camDef, wmText)] };
  }, [camDef, film, effects, stamp, mode, pro, focus, portraitBlur, wmId, wmText, frameId, building, dr.draft]);

  const optsRef = useRef({ preset, intensity, mirror: false, lcd, aspect, zoom });
  optsRef.current = { preset, intensity: compare && building ? 0 : intensity, mirror, lcd, aspect, zoom };

  // Restore and persist simple settings.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("pixi:v2") ?? "{}");
      const mine = loadLooks();
      setMyLooks(mine); setFavs(loadFavs());
      if (s.camId && (CAMERAS.some((c) => c.preset.id === s.camId) || mine.some((l) => l.id === s.camId))) setCamId(s.camId);
      if (s.filmId && FILMS.some((f) => f.id === s.filmId)) setFilmId(s.filmId);
      if (s.aspectId) setAspectId(s.aspectId);
      if (s.gridId) setGridId(s.gridId);
      if (typeof s.timerSec === "number") setTimerSec(s.timerSec);
      if (s.wmId) setWmId(s.wmId);
      if (typeof s.wmText === "string") setWmText(s.wmText);
      if (s.stamp) setStamp(s.stamp);
      if (s.frameId) setFrameId(s.frameId);
      if (s.boothLayout) setBoothLayout(s.boothLayout);
    } catch { /* ignore */ }
    setLooksReady(true);
    // Returning users already granted access: warm the camera up behind the splash.
    try { if (localStorage.getItem("pixi:onboarded") === "1") void cam.start("environment"); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem("pixi:v2", JSON.stringify({ camId, aspectId, gridId, timerSec, wmId, wmText, stamp, filmId, frameId, boothLayout })); } catch { /* ignore */ }
  }, [camId, aspectId, gridId, timerSec, wmId, wmText, stamp, filmId, frameId, boothLayout]);
  useEffect(() => { if (looksReady) persistLooks(myLooks); }, [myLooks, looksReady]);
  useEffect(() => { if (looksReady) persistFavs(favs); }, [favs, looksReady]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  // Fit the viewfinder box to the chosen aspect inside the available slot.
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const calc = () => {
      const W = el.clientWidth - 16, H = el.clientHeight - 16;
      if (W <= 0 || H <= 0) return;
      let w = W, h = W / aspect;
      if (h > H) { h = H; w = H * aspect; }
      setFit({ w: Math.floor(w), h: Math.floor(h) });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  // Render loop.
  useEffect(() => {
    const r = new RetroRenderer(canvasRef.current!);
    rendererRef.current = r;
    const s = sampleScene();
    srcRef.current = { el: s, w: s.width, h: s.height };
    r.setSource(s, s.width, s.height);
    r.warmUp();
    r.onRestored = () => { r.warmUp(); };
    let raf = 0, side = 1100, slow = 0, lastDraw = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      if (pauseRef.current || bootRef.current === "onboard" || !(viewRef.current === "camera" || viewRef.current === "builder") || document.hidden || t - lastDraw < 28) { raf = requestAnimationFrame(loop); return; }
      lastDraw = t;
      const v = cam.videoRef.current, src = srcRef.current, ov = overrideRef.current;
      if (ov) r.setSource(ov.el, ov.w, ov.h);
      else if (v && v.readyState >= 2 && v.videoWidth) r.setSource(v, v.videoWidth, v.videoHeight);
      else if (src) r.setSource(src.el, src.w, src.h);
      const a = performance.now();
      r.render({ ...optsRef.current, maxSide: side }, (t - t0) / 1000);
      if (performance.now() - a > 40 && ++slow > 10 && side > 500) { side = Math.round(side * 0.8); slow = 0; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setMirror(cam.live && cam.facing === "user"); }, [cam.live, cam.facing]);

  // Portrait: auto-centre the focus on a detected face when the browser supports FaceDetector.
  useEffect(() => {
    if (mode !== "portrait" || !cam.live) return;
    const FD = (window as unknown as { FaceDetector?: new (o?: object) => { detect(v: HTMLVideoElement): Promise<{ boundingBox: DOMRectReadOnly }[]> } }).FaceDetector;
    if (!FD) return;
    const det = new FD({ fastMode: true, maxDetectedFaces: 1 });
    const id = setInterval(async () => {
      const v = cam.videoRef.current;
      if (!v || !v.videoWidth) return;
      try {
        const f = await det.detect(v);
        if (!f[0]) return;
        const b = f[0].boundingBox;
        const sx = (b.x + b.width / 2) / v.videoWidth, sy = 1 - (b.y + b.height / 2) / v.videoHeight;
        const sa = v.videoWidth / v.videoHeight, z = Math.max(1, optsRef.current.zoom);
        const base: [number, number] = sa > aspect ? [aspect / sa, 1] : [1, sa / aspect];
        let ox = (sx - 0.5) / (base[0] / z) + 0.5; const oy = (sy - 0.5) / (base[1] / z) + 0.5;
        if (optsRef.current.mirror) ox = 1 - ox;
        setFocus([Math.min(1, Math.max(0, ox)), Math.min(1, Math.max(0, oy))]);
      } catch { /* detector unavailable */ }
    }, 600);
    return () => clearInterval(id);
  }, [mode, cam.live, cam.videoRef, aspect]);

  // Ask for the mic as soon as Video mode opens so recording itself never waits on a permission prompt.
  useEffect(() => {
    if (mode !== "video") { micRef.current?.getTracks().forEach((t) => t.stop()); micRef.current = null; return; }
    let dead = false;
    navigator.mediaDevices?.getUserMedia?.({ audio: true }).then((m) => { if (dead) m.getTracks().forEach((t) => t.stop()); else micRef.current = m; }).catch(() => {});
    return () => { dead = true; };
  }, [mode]);

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [recording]);

  const finishSplash = useCallback(() => {
    let done = false;
    try { done = localStorage.getItem("pixi:onboarded") === "1"; } catch { /* private mode */ }
    setBoot(done ? "ready" : "onboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const finishOnboard = () => {
    try { localStorage.setItem("pixi:onboarded", "1"); } catch { /* ignore */ }
    setBoot("ready"); void cam.start("environment");
  };

  const addShot = async (blob: Blob, kind: Shot["kind"], ext: string) => {
    const created = Date.now();
    const item: Shot = { id: `s${created}${Math.random().toString(36).slice(2, 6)}`, url: URL.createObjectURL(blob), kind, ext, blob, created };
    setShots((s) => [item, ...s].slice(0, 120));
    if (kind === "photo") setSnap((n) => n + 1);
    const r = await rollAdd({ id: item.id, kind, ext, blob, created, camera: camDef.model });
    setToast(r.saved ? (r.path ? "Saved to Documents/Pixi" : "Saved to your roll") : "Could not save. Storage may be full.");
  };
  const deleteShot = async (s: Shot) => { URL.revokeObjectURL(s.url); setShots((x) => x.filter((y) => y.id !== s.id)); await rollDelete(s.id); };

  // Load saved shots on launch so nothing is lost when the app is closed.
  useEffect(() => {
    rollAll().then((items) => setShots((cur) => [...cur, ...items.filter((i) => !cur.some((c) => c.id === i.id)).map((i) => ({ ...i, url: URL.createObjectURL(i.blob) }))].slice(0, 120)));
  }, []);

  const startCamera = async (facing: "user" | "environment") => { const ok = await cam.start(facing); if (ok) setError(""); };

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      cam.stop(); setError("");
      srcRef.current = { el: bmp, w: bmp.width, h: bmp.height };
    } catch { setError("That file could not be opened as an image."); }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** Night: average several frames to cut noise, then hand the result to the renderer as the capture source. */
  const nightSource = async () => {
    const v = cam.videoRef.current;
    if (!cam.live || !v || !v.videoWidth) return null;
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale), h = Math.round(v.videoHeight * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    const N = 8; const acc = new Float32Array(w * h * 4);
    for (let i = 0; i < N; i++) {
      setBusy(`Hold still… ${i + 1}/${N}`);
      g.drawImage(v, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data;
      for (let k = 0; k < d.length; k++) acc[k] += d[k];
      await sleep(110);
    }
    const out = g.createImageData(w, h);
    for (let k = 0; k < out.data.length; k++) out.data[k] = k % 4 === 3 ? 255 : acc[k] / N;
    g.putImageData(out, 0, 0);
    return { el: c as TexImageSource, w, h };
  };

  const takePhoto = async () => {
    const torchShot = flashOn && cam.facing === "environment" && cam.torchOk;
    if (flashOn && !torchShot) { setFlash(true); await sleep(380); }
    if (torchShot) { await cam.setTorch(true); await sleep(380); }
    let night = null as Awaited<ReturnType<typeof nightSource>>;
    if (mode === "night") { night = await nightSource(); if (night) overrideRef.current = night; }
    try {
      const blob = await rendererRef.current!.capture({ ...optsRef.current, maxSide: optsRef.current.preset.captureSide ?? 2048, date: new Date() }, performance.now() / 1000);
      addShot(blob, "photo", "jpg");
    } finally {
      overrideRef.current = null; setBusy(""); setFlash(false);
      if (torchShot) await cam.setTorch(false);
    }
  };

  const startVideo = async () => {
    if (flashOn && cam.torchOk) await cam.setTorch(true);
    const out = canvasRef.current!.captureStream(30);
    const mic = micRef.current ?? undefined;
    mic?.getAudioTracks().forEach((t) => out.addTrack(t));
    const { mime, ext } = pickMime();
    const rec = new MediaRecorder(out, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => { addShot(new Blob(chunks, { type: rec.mimeType || "video/webm" }), "video", ext); };
    rec.start(250);
    recRef.current = { rec, mic };
    setElapsed(0); setRecording(true);
  };
  const stopVideo = async () => {
    if (recRef.current?.rec.state !== "inactive") recRef.current?.rec.stop();
    setRecording(false);
    if (cam.torchOn) await cam.setTorch(false);
  };

  const startTimelapse = async () => {
    if (flashOn && cam.torchOk) await cam.setTorch(true);
    const c = canvasRef.current!;
    const frames: Blob[] = [];
    const grab = () => c.toBlob((b) => { if (b && frames.length < MAX_TL_FRAMES) { frames.push(b); setTlCount(frames.length); } }, "image/jpeg", 0.85);
    grab();
    const timer = setInterval(() => { if (frames.length >= MAX_TL_FRAMES) { stopTimelapse(); } else grab(); }, tlInterval * 1000);
    tlRef.current = { timer, frames, w: c.width, h: c.height };
    setTlCount(1); setElapsed(0); setRecording(true);
  };
  const stopTimelapse = async () => {
    const t = tlRef.current;
    if (!t) return;
    clearInterval(t.timer); tlRef.current = null; setRecording(false);
    if (cam.torchOn) await cam.setTorch(false);
    setBusy("Encoding timelapse…");
    pauseRef.current = true;
    try {
      const res = await encodeTimelapse(t.frames, t.w, t.h, 24);
      if (res) addShot(res.blob, "video", res.ext); else setError("Need at least 2 frames for a timelapse.");
    } finally { pauseRef.current = false; setBusy(""); }
  };

  const runCountdown = async (n: number) => {
    cancelRef.current = false;
    for (let i = n; i > 0; i--) {
      setCountdown(i);
      await sleep(1000);
      if (cancelRef.current) { setCountdown(0); return false; }
    }
    setCountdown(0);
    return true;
  };

  const runBooth = async () => {
    const frames: ImageBitmap[] = [];
    try {
      for (let i = 0; i < 4; i++) {
        setBoothStep(i + 1);
        if (!(await runCountdown(i === 0 ? 3 : 2))) return;
        setSnap((n) => n + 1);
        frames.push(await createImageBitmap(canvasRef.current!));
        await sleep(300);
      }
      setBusy("Making your strip…");
      await addShot(await composeBooth(frames, boothLayout, camDef.model), "photo", "jpg");
    } finally { frames.forEach((f) => f.close()); setBoothStep(0); setBusy(""); }
  };

  const onShutter = async () => {
    if (busy) return;
    if (countdown > 0) { cancelRef.current = true; return; }
    if (recording) { return mode === "timelapse" ? stopTimelapse() : stopVideo(); }
    if (mode === "booth") return runBooth();
    if (timerSec > 0 && !(await runCountdown(timerSec))) return;
    if (mode === "video") return startVideo();
    if (mode === "timelapse") return startTimelapse();
    return takePhoto();
  };

  const receiveFile = (blob: Blob, name: string) => {
    const ext = name.split(".").pop() || "jpg";
    void addShot(blob, blob.type.startsWith("video") ? "video" : "photo", ext);
  };

  const share = async (s: Shot) => {
    const file = new File([s.blob], `pixi-${Date.now()}.${s.ext}`, { type: s.blob.type });
    try {
      if (isNative()) await nativeShare(s.blob, file.name);
      else if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else { const a = document.createElement("a"); a.href = s.url; a.download = file.name; a.click(); }
    } catch { /* cancelled */ }
  };

  // Pinch to zoom, tap to focus.
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(Math.min(6, Math.max(1, pinch.current.z0 * (d / pinch.current.d0))));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const wasSingle = pointers.current.size === 1 && !pinch.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (wasSingle) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (mode === "portrait") setFocus([x, 1 - y]);
      setRing({ x: x * 100, y: y * 100, k: Date.now() });
      setTimeout(() => setRing((p) => (p && Date.now() - p.k >= 900 ? null : p)), 950);
    }
  };

  const openBuilder = (fromId?: string) => {
    const mine = myLooks.find((l) => l.id === (fromId ?? camId));
    if (mine) dr.open(JSON.parse(JSON.stringify(mine)));
    else {
      const src = fromId ? [...PRESETS].find((p) => p.id === fromId) ?? camDef.preset : camDef.preset;
      dr.open(presetToLook(src, `My ${src.name}`));
    }
    setView("builder");
  };
  const saveDraft = (asCopy: boolean) => {
    const d = dr.draft; if (!d) return;
    const exists = myLooks.some((l) => l.id === d.id);
    const name = d.name.trim() || `My look ${myLooks.length + 1}`;
    if (exists && !asCopy) { setMyLooks((a) => a.map((l) => (l.id === d.id ? { ...d, name } : l))); setCamId(d.id); setToast("Saved"); return; }
    const copy: SavedLook = { ...JSON.parse(JSON.stringify(d)), id: newId(), name: asCopy ? `${name} copy` : name, created: Date.now() };
    setMyLooks((a) => [copy, ...a]); dr.open(copy); setCamId(copy.id); setToast("Saved to My Looks");
  };
  const deleteDraft = () => {
    const d = dr.draft; if (!d) return;
    setMyLooks((a) => a.filter((l) => l.id !== d.id)); setFavs((f) => f.filter((x) => x !== d.id));
    if (camId === d.id) setCamId(CAMERAS[0].preset.id);
    dr.open(null); setView("gallery"); setToast("Deleted");
  };
  const importLook = (l: SavedLook) => { setMyLooks((a) => [l, ...a]); setCamId(l.id); };
  const getFrame = (): ImageData | null => {
    const v = cam.videoRef.current;
    if (!v || !v.videoWidth) return null;
    const k = Math.min(1, 640 / v.videoWidth), w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(v, 0, 0, w, h);
    return g.getImageData(0, 0, w, h);
  };
  const galleryItems: GalleryItem[] = useMemo(() => [
    ...myLooks.map((l) => ({ preset: lookToPreset(l), maker: "My Looks", mine: true })),
    ...CAMERAS.map((c) => ({ preset: c.preset, maker: c.brand, mine: false })),
  ], [myLooks]);

  const cycle = <T,>(list: T[], cur: T, set: (v: T) => void) => set(list[(list.indexOf(cur) + 1) % list.length]);
  const rows = (["Mine", "Digicam", "Special"] as const)
    .map((row) => ({ row, items: allCams.filter((c) => c.row === row && (brand === "All" || c.brand === brand)) }))
    .filter((r) => r.items.length);
  const carouselItems = useMemo(() => (["Mine", "Digicam", "Special"] as const).flatMap((r) => allCams.filter((c) => c.row === r)), [allCams]);
  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? "bg-orange-500 text-black" : "bg-neutral-800 text-neutral-300 active:bg-neutral-700"}`;
  const tb = (on: boolean) => `flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-[10px] font-bold transition-colors ${on ? "bg-orange-500 text-black" : "bg-white/10 text-neutral-200"}`;
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const isVideoMode = mode === "video" || mode === "timelapse";
  const last = shots[0];
  const showSlot = view === "camera" || view === "builder";
  const aspectLabel = ASPECTS.find((a) => a.id === aspectId)!.label;
  const spring = { type: "spring" as const, stiffness: 420, damping: 32 };

  return (
    <main className="fixed inset-0 mx-auto flex w-full max-w-md flex-col overflow-hidden bg-black text-neutral-100">
      <Splash show={boot === "splash"} onDone={finishSplash} />
      <AnimatePresence>{boot === "onboard" && <Onboarding key="ob" onFinish={finishOnboard} />}</AnimatePresence>

      {view === "camera" && (
        <header className="safe-t flex shrink-0 items-center gap-1.5 px-3 pb-2 pt-2">
          <PixiMark size={30} />
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setShelfTab("cams"); setShelf(true); }} className="lcd mx-1 min-w-0 flex-1 truncate rounded-full bg-white/10 px-3 py-2 text-left text-[10px] text-neutral-200">
            {camDef.brand.toUpperCase()} {camDef.model} <span className="text-neutral-500">▾</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} aria-label="Flash" className={tb(flashOn)} onClick={() => setFlashOn(!flashOn)}><I n="bolt" className="h-4 w-4" /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} aria-label="Timer" className={tb(timerSec > 0)} onClick={() => cycle(TIMERS, timerSec, setTimerSec)}><I n="timer" className="h-4 w-4" />{timerSec > 0 && `${timerSec}s`}</motion.button>
          <motion.button whileTap={{ scale: 0.9 }} aria-label="Ratio" className={tb(aspectId !== "look")} disabled={recording} onClick={() => cycle(ASPECTS.map((a) => a.id), aspectId, setAspectId)}>{aspectId === "look" ? <I n="ratio" className="h-4 w-4" /> : aspectLabel}</motion.button>
          <motion.button whileTap={{ scale: 0.9 }} aria-label="Grid" className={tb(gridId !== "off")} onClick={() => cycle(GRIDS.map((g) => g.id), gridId, setGridId)}><I n="grid" className="h-4 w-4" /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} aria-label="Watermark" className={tb(wmId !== "off")} onClick={() => cycle(WATERMARKS.map((w) => w.id), wmId, setWmId)}><I n="tag" className="h-4 w-4" /></motion.button>
        </header>
      )}

      <div ref={slotRef} className={`relative mx-4 flex min-h-0 items-center justify-center ${view === "camera" ? "flex-1" : view === "builder" ? "safe-t h-[34dvh] shrink-0 pt-2" : "hidden"}`}>
        <div className="relative" style={{ width: fit.w, height: fit.h }}>
          <div className="pointer-events-none absolute -inset-[7px] rounded-[22px]" style={{ background: "linear-gradient(145deg,#2c2c33,#0b0b0e)", boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 20px 40px rgba(0,0,0,.7)" }} />
          <span className="pointer-events-none absolute -top-[3px] right-3 h-1.5 w-1.5 rounded-full" style={{ background: recording ? "#ef4444" : camDef.color, boxShadow: `0 0 8px ${recording ? "#ef4444" : camDef.color}` }} />
          <div className="relative h-full w-full touch-none overflow-hidden rounded-2xl bg-black"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            <canvas ref={canvasRef} className="gpu absolute inset-0 block h-full w-full" />
            <GridOverlay id={gridId} />
            {ring && <div key={ring.k} className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-yellow-300" style={{ left: `${ring.x}%`, top: `${ring.y}%` }} />}
            {snap > 0 && <motion.div key={snap} className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.38, ease: "easeOut" }} />}
            {flash && <div className="pointer-events-none absolute inset-0 bg-white" />}
            <AnimatePresence>{countdown > 0 && <motion.div key={countdown} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={spring} className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 text-8xl font-light text-white">{countdown}</motion.div>}</AnimatePresence>
            {busy && <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/60 py-2 text-center text-sm">{busy}</div>}
            <div className="lcd pointer-events-none absolute left-2 top-2 flex items-center gap-2 text-[9px] text-white/80">
              {recording ? <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px]"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{mode === "timelapse" ? `${tlCount} FR` : `REC ${mmss}`}</span>
                : <span className="rounded-full bg-black/45 px-2 py-1">{boothStep ? `PHOTO ${boothStep}/4` : `${MODES.find((m) => m.id === mode)!.label.toUpperCase()} · ${aspectLabel === "Auto" ? "AUTO" : aspectLabel}`}</span>}
            </div>
            {mode === "portrait" && !recording && <div className="pointer-events-none absolute left-2 top-9 rounded-full bg-black/50 px-2 py-1 text-[10px]">Tap to set focus</div>}
            {!cam.live && !(error || cam.error) && boot === "ready" && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => startCamera(cam.facing)} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-black shadow-lg">Start camera</motion.button>
            )}
            {(error || cam.error) && (
              <div className="absolute inset-x-2 bottom-2 rounded-xl bg-black/85 p-3 text-center text-xs text-amber-200" onPointerDown={(e) => e.stopPropagation()}>
                {error || cam.error}
                <div className="mt-2 flex justify-center gap-2">
                  <button onClick={() => { setError(""); cam.setError(""); startCamera(cam.facing); }} className="rounded-full bg-orange-500 px-3 py-1 font-semibold text-black">Try again</button>
                  <label className="cursor-pointer rounded-full bg-neutral-700 px-3 py-1 text-neutral-100">Import photo<input type="file" accept="image/*" hidden onChange={(e) => importFile(e.target.files?.[0])} /></label>
                </div>
              </div>
            )}
            {view === "camera" && (
              <>
                <div className="absolute bottom-2 left-2 flex gap-1 rounded-full bg-black/60 p-1 text-[11px]" onPointerDown={(e) => e.stopPropagation()}>
                  {cam.lenses.map((l) => (
                    <button key={l.id} onClick={() => cam.useLens(l.id)} className={`rounded-full px-2.5 py-1 ${cam.lensId === l.id ? "bg-white text-black" : "text-neutral-200"}`}>{l.label}</button>
                  ))}
                  {[1, 2, 3].map((z) => (
                    <button key={z} onClick={() => setZoom(z)} className={`rounded-full px-2.5 py-1 ${Math.abs(zoom - z) < 0.15 ? "bg-orange-500 text-black" : "text-neutral-200"}`}>{z}×</button>
                  ))}
                </div>
                <div className="absolute right-2 top-2 flex flex-col gap-1.5 text-[10px]" onPointerDown={(e) => e.stopPropagation()}>
                  <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/55 backdrop-blur" aria-label="Import photo"><I n="image" className="h-4 w-4" /><input type="file" accept="image/*" hidden onChange={(e) => importFile(e.target.files?.[0])} /></label>
                  <button aria-label="LCD overlay" className="lcd flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-[9px] backdrop-blur" onClick={() => setLcd(lcd === "off" ? "shoot" : lcd === "shoot" ? "play" : "off")}>{lcd === "off" ? "LCD" : lcd === "shoot" ? "REC" : "PLY"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {view === "camera" && (
        <div className="shrink-0 pb-1 pt-4">
          <div className="relative flex items-center justify-center px-12">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={camDef.preset.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }} className="min-w-0 text-center">
                <div className="truncate text-sm font-semibold">{camDef.preset.name}</div>
                <div className="lcd truncate text-[9px] text-neutral-500">{camDef.brand.toUpperCase()} {camDef.model}{film ? ` · ${film.name}` : ""}</div>
              </motion.div>
            </AnimatePresence>
            <motion.button whileTap={{ scale: 0.9 }} aria-label="Looks, film and effects" onClick={() => { setShelfTab("style"); setShelf(true); }} className="absolute right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><I n="sliders" className="h-[18px] w-[18px]" /></motion.button>
          </div>
          <CameraCarousel items={carouselItems} value={camId} onPick={(id) => setCamId(id)} />

          <div className="min-h-[18px] px-4 text-center">
            {mode === "portrait" && <label className="flex items-center gap-3 text-[11px] text-neutral-400"><span>Blur</span><input type="range" min={0} max={1} step={0.02} value={portraitBlur} onChange={(e) => setPortraitBlur(+e.target.value)} className="flex-1 accent-orange-500" /></label>}
            {mode === "night" && <p className="text-[11px] text-neutral-500">Combines 8 frames. Hold still for a second.</p>}
            {mode === "timelapse" && <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">Every {TL_INTERVALS.map((n) => <button key={n} disabled={recording} onClick={() => setTlInterval(n)} className={chip(tlInterval === n)}>{n}s</button>)}</div>}
            {mode === "booth" && <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">4 photos, one card {([["strip", "Strip"], ["grid", "2×2"]] as const).map(([k, l]) => <button key={k} onClick={() => setBoothLayout(k)} className={chip(boothLayout === k)}>{l}</button>)}</div>}
            {mode === "pro" && <button onClick={() => setProSheet(true)} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium">Manual controls</button>}
          </div>

          <div className="pt-1"><ModeDial mode={mode} onChange={setMode} disabled={recording || !!busy || boothStep > 0} /></div>

          <div className="flex items-center justify-between px-8 pb-3 pt-1">
            <div className="flex w-14 justify-start">
              {last ? (
                <motion.button key={last.id} initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={spring} onClick={() => setView("roll")} aria-label="Open roll" className="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-white/25">
                  {last.kind === "photo" ? <img src={last.url} alt="Last shot" className="h-full w-full object-cover" /> : <video src={last.url} muted className="h-full w-full object-cover" />}
                </motion.button>
              ) : <div className="h-12 w-12 rounded-xl bg-white/5 ring-1 ring-white/10" />}
            </div>
            <Shutter video={isVideoMode} recording={recording} countdown={countdown} disabled={!!busy} onPress={onShutter} />
            <div className="flex w-14 justify-end">
              <motion.button whileTap={{ scale: 0.88, rotate: 180 }} onClick={() => (cam.live ? cam.flip() : startCamera(cam.facing === "user" ? "environment" : "user"))} aria-label="Flip camera" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"><I n="flip" className="h-6 w-6" /></motion.button>
            </div>
          </div>
        </div>
      )}

      {view !== "camera" && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className={view === "roll" ? "min-h-full" : ""}>
              {view === "gallery" && (
                <Gallery items={galleryItems} selectedId={camId} favs={favs}
                  onPick={(id) => { setCamId(id); setView("camera"); }}
                  onFav={(id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))}
                  onEdit={(id) => openBuilder(id)} onNew={() => openBuilder()} />
              )}
              {view === "builder" && dr.draft && (
                <Builder draft={dr.draft} saved={myLooks.some((l) => l.id === dr.draft!.id)} templates={PRESETS}
                  commit={dr.commit} undo={dr.undo} redo={dr.redo} canUndo={dr.canUndo} canRedo={dr.canRedo}
                  onCompare={setCompare} onSave={saveDraft} onDelete={deleteDraft} onShare={() => { saveDraft(false); setView("share"); }} onClose={() => { dr.open(null); setView("gallery"); }} />
              )}
              {view === "roll" && <Roll shots={shots} onShare={share} onDelete={deleteShot} onCamera={() => setView("camera")} />}
              {view === "share" && (
                <ShareSheet looks={myLooks} focusId={dr.draft?.id ?? (myLooks.some((l) => l.id === camId) ? camId : undefined)} camLive={cam.live} startCamera={() => startCamera(cam.facing)} getFrame={getFrame} onImport={importLook} shots={shots} onReceiveFile={receiveFile} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>{toast && <motion.div key="toast" role="status" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={spring} className="fixed inset-x-0 bottom-24 z-[70] mx-auto w-fit rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-lg">{toast}</motion.div>}</AnimatePresence>

      <Nav view={view} disabled={recording || !!busy || boothStep > 0} onChange={(v) => { if (v === "builder") { if (!dr.draft) openBuilder(); else setView("builder"); } else setView(v); }} />

      <Sheet open={shelf} onClose={() => setShelf(false)} title="Camera shelf">
        <div className="flex gap-2 px-4 pb-3 pt-1">
          {([["cams", "Cameras"], ["film", "Film"], ["style", "Style"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setShelfTab(k)} className="relative rounded-full px-4 py-1.5 text-xs font-semibold">
              {shelfTab === k && <motion.span layoutId="shelf-pill" className="absolute inset-0 rounded-full bg-white" transition={spring} />}
              <span className={`relative ${shelfTab === k ? "text-black" : "text-neutral-400"}`}>{l}</span>
            </button>
          ))}
        </div>
        {shelfTab === "cams" && (
          <div className="space-y-4">
            <div className="flex gap-4 overflow-x-auto px-4">
              {["All", ...(myLooks.length ? ["My Looks"] : []), ...BRANDS].map((b) => <button key={b} onClick={() => setBrand(b)} className={`shrink-0 text-sm ${brand === b ? "font-semibold text-orange-400" : "text-neutral-400"}`}>{b}</button>)}
            </div>
            {rows.map(({ row, items }) => (
              <div key={row}>
                <h3 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">{row === "Mine" ? "My Looks" : row}</h3>
                <div className="grid grid-cols-3 gap-2 px-4">
                  {items.map((c) => (
                    <button key={c.preset.id} onClick={() => { setCamId(c.preset.id); setShelf(false); }} className="text-center" title={c.preset.blurb}>
                      <div className={`h-[72px] rounded-xl bg-neutral-900 p-1 ring-1 transition ${c.preset.id === camId ? "ring-orange-500" : "ring-white/5"}`}><CameraIcon body={c.body} color={c.color} /></div>
                      <div className="mt-1 truncate text-[11px] font-medium text-neutral-200">{c.preset.name}</div>
                      <div className="truncate text-[10px] text-neutral-500">{c.brand} {c.model}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {shelfTab === "film" && (<div><p className="px-4 pb-1 text-xs text-neutral-500">Swipe to load a film. It replaces the camera&apos;s colour.</p><FilmCarousel value={filmId} onPick={(f) => setFilmId(f?.id ?? null)} /></div>)}
        {shelfTab === "style" && (
          <div className="space-y-5">
            <label className="mx-4 flex items-center gap-3 text-xs text-neutral-400">Strength
              <input aria-label="Intensity" type="range" min={0} max={1} step={0.01} value={intensity} onChange={(e) => setIntensity(+e.target.value)} className="flex-1 accent-orange-500" />
              <span className="w-8 text-right tabular-nums">{Math.round(intensity * 100)}</span>
            </label>
            <div><h3 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Timestamp</h3>
              <div className="flex gap-2 overflow-x-auto px-4 pb-1">{STAMPS.map((s) => <button key={s.id} onClick={() => setStamp(s.id)} className={chip(stamp === s.id)} title={s.sample}>{s.label}</button>)}</div></div>
            <div><h3 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Effects</h3>
              <div className="flex gap-2 overflow-x-auto px-4 pb-1">{EFFECTS.filter((e) => e.id !== "frame").map((e) => (
                <button key={e.id} onClick={() => setEffects((s) => { const n = new Set(s); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })} className={chip(effects.has(e.id))}>{e.label}</button>))}</div></div>
            <div><h3 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Frame</h3>
              <div className="flex gap-2 overflow-x-auto px-4 pb-1">{([["auto", "Camera default"], ["none", "None"], ["polaroid", "Polaroid"], ["thin", "Thin"], ["rounded", "Rounded"], ["film", "Film strip"]] as const).map(([k, l]) => <button key={k} onClick={() => setFrameId(k)} className={chip(frameId === k)}>{l}</button>)}</div></div>
            <div><h3 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Watermark</h3>
              <div className="flex gap-2 overflow-x-auto px-4 pb-1">{WATERMARKS.map((w) => <button key={w.id} onClick={() => setWmId(w.id)} className={chip(wmId === w.id)}>{w.label}</button>)}</div>
              {wmId === "custom" && <input value={wmText} onChange={(e) => setWmText(e.target.value)} maxLength={40} placeholder="Your watermark text" className="mx-4 mt-2 w-[calc(100%-2rem)] rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-orange-500" />}</div>
          </div>
        )}
      </Sheet>

      <Sheet open={proSheet} onClose={() => setProSheet(false)} title="Manual controls">
        <section className="space-y-3 px-4">
          <div className="flex gap-2">
            <button className={chip(pro.look)} onClick={() => setPro({ ...pro, look: !pro.look })}>Camera look {pro.look ? "on" : "off"}</button>
            <button className={chip(false)} onClick={() => setPro({ ...PRO_DEFAULT, look: pro.look })}>Reset</button>
          </div>
          {PRO_CONTROLS.map((c) => (
            <label key={c.key} className="flex items-center gap-3 text-xs text-neutral-300">
              <span className="w-20">{c.label}</span>
              <input type="range" min={c.min} max={c.max} step={c.step} value={pro[c.key]} onChange={(e) => setPro({ ...pro, [c.key]: +e.target.value })} className="flex-1 accent-orange-500" />
              <span className="w-10 text-right tabular-nums">{pro[c.key].toFixed(2)}</span>
            </label>
          ))}
        </section>
      </Sheet>
    </main>
  );
}
