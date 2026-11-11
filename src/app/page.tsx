"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RetroRenderer, type LcdMode } from "@/engine/renderer";
import { BRANDS, CAMERAS, EFFECTS, STAMPS, cameraFromPreset, withEffects, withFilm, type EffectId } from "@/ui/cameras";
import { Builder } from "@/ui/Builder";
import { Gallery, type GalleryItem } from "@/ui/Gallery";
import { FilmCarousel } from "@/ui/FilmCarousel";
import { ShareSheet } from "@/ui/ShareSheet";
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

type View = "camera" | "gallery" | "builder" | "share";
type Shot = { url: string; kind: "photo" | "video"; ext: string; blob: Blob };

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
  const [minimal, setMinimal] = useState(false);
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
    return { ...moded, overlays: [...(moded.overlays ?? []), ...watermarkOverlays(wmId, camDef, wmText)] };
  }, [camDef, film, effects, stamp, mode, pro, focus, portraitBlur, wmId, wmText, building, dr.draft]);

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
    } catch { /* ignore */ }
    setLooksReady(true);
  }, []);
  useEffect(() => {
    try { localStorage.setItem("pixi:v2", JSON.stringify({ camId, aspectId, gridId, timerSec, wmId, wmText, stamp, filmId })); } catch { /* ignore */ }
  }, [camId, aspectId, gridId, timerSec, wmId, wmText, stamp, filmId]);
  useEffect(() => { if (looksReady) persistLooks(myLooks); }, [myLooks, looksReady]);
  useEffect(() => { if (looksReady) persistFavs(favs); }, [favs, looksReady]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  // Fit the viewfinder box to the chosen aspect inside the available slot.
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const calc = () => {
      const W = el.clientWidth, H = el.clientHeight;
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
    let raf = 0, side = 1100, slow = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      if (pauseRef.current || viewRef.current === "gallery" || document.hidden) { raf = requestAnimationFrame(loop); return; }
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

  const addShot = (blob: Blob, kind: Shot["kind"], ext: string) =>
    setShots((s) => [{ url: URL.createObjectURL(blob), kind, ext, blob }, ...s].slice(0, 30));

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
      const blob = await rendererRef.current!.capture({ ...optsRef.current, maxSide: 2048, date: new Date() }, performance.now() / 1000);
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

  const onShutter = async () => {
    if (busy) return;
    if (countdown > 0) { cancelRef.current = true; return; }
    if (recording) { return mode === "timelapse" ? stopTimelapse() : stopVideo(); }
    if (timerSec > 0 && !(await runCountdown(timerSec))) return;
    if (mode === "video") return startVideo();
    if (mode === "timelapse") return startTimelapse();
    return takePhoto();
  };

  const share = async (s: Shot) => {
    const file = new File([s.blob], `pixi-${Date.now()}.${s.ext}`, { type: s.blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
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
  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? "bg-orange-500 text-black" : "bg-neutral-800 text-neutral-300 active:bg-neutral-700"}`;
  const tool = (on: boolean) => `flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${on ? "bg-orange-500 text-black" : "bg-neutral-800 text-neutral-200"}`;
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const isVideoMode = mode === "video" || mode === "timelapse";
  const last = shots[0];

  return (
    <main className="mx-auto flex min-h-dvh w-full min-w-0 max-w-md flex-col overflow-x-hidden bg-neutral-950 pb-20 text-neutral-100">
      <header className="flex items-center justify-between px-4 pb-2 pt-3">
        <h1 className="text-lg font-semibold tracking-tight">Pixi</h1>
        <div className="flex items-center gap-3 text-xs text-neutral-300">
          <span className="rounded bg-neutral-800 px-2 py-1">{camDef.brand} {camDef.model}</span>
          <button onClick={() => setMinimal(!minimal)} className="underline underline-offset-2">{minimal ? "Show controls" : "Minimal"}</button>
        </div>
      </header>

      {!minimal && view === "camera" && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2">
          <button className={tool(flashOn)} onClick={() => setFlashOn(!flashOn)}><Icon d={ICON.bolt} className="h-4 w-4" />Flash {flashOn ? "on" : "off"}</button>
          <button className={tool(timerSec > 0)} onClick={() => cycle(TIMERS, timerSec, setTimerSec)}>Timer {timerSec ? `${timerSec}s` : "off"}</button>
          <button className={tool(aspectId !== "look")} disabled={recording} onClick={() => cycle(ASPECTS.map((a) => a.id), aspectId, setAspectId)}>Ratio {ASPECTS.find((a) => a.id === aspectId)!.label}</button>
          <button className={tool(gridId !== "off")} onClick={() => cycle(GRIDS.map((g) => g.id), gridId, setGridId)}>{GRIDS.find((g) => g.id === gridId)!.label}</button>
          <button className={tool(wmId !== "off")} onClick={() => cycle(WATERMARKS.map((w) => w.id), wmId, setWmId)}>{WATERMARKS.find((w) => w.id === wmId)!.label}</button>
        </div>
      )}
      {!minimal && view === "camera" && wmId === "custom" && (
        <input value={wmText} onChange={(e) => setWmText(e.target.value)} maxLength={40} placeholder="Your watermark text"
          className="mx-3 mb-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-orange-500" />
      )}

      <div ref={slotRef} className={`mx-3 flex items-center justify-center rounded-2xl bg-black ring-1 ring-white/10 ${view === "camera" ? "h-[52dvh]" : view === "gallery" ? "hidden" : "h-[36dvh]"}`}>
        <div className="relative touch-none overflow-hidden" style={{ width: fit.w, height: fit.h }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
          <GridOverlay id={gridId} />
          {ring && <div key={ring.k} className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-yellow-300" style={{ left: `${ring.x}%`, top: `${ring.y}%` }} />}
          {flash && <div className="pointer-events-none absolute inset-0 bg-white" />}
          {countdown > 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 text-8xl font-light text-white">{countdown}</div>}
          {busy && <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/60 py-2 text-center text-sm">{busy}</div>}
          {recording && (
            <div className="absolute left-2 top-2 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {mode === "timelapse" ? `${tlCount} frames · ~${(tlCount / 24).toFixed(1)}s` : `REC ${mmss}`}
            </div>
          )}
          {mode === "portrait" && !recording && <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px]">Tap to set focus</div>}
          {!cam.live && !(error || cam.error) && (
            <button onClick={() => startCamera(cam.facing)} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-black shadow-lg active:scale-95">Start camera</button>
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
          {!minimal && (
            <>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/55 p-1 text-[11px] backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
                {cam.lenses.map((l) => (
                  <button key={l.id} onClick={() => cam.useLens(l.id)} className={`rounded-full px-2.5 py-1 ${cam.lensId === l.id ? "bg-white text-black" : "text-neutral-200"}`}>{l.label}</button>
                ))}
                {[1, 2, 3].map((z) => (
                  <button key={z} onClick={() => setZoom(z)} className={`rounded-full px-2.5 py-1 ${Math.abs(zoom - z) < 0.15 ? "bg-orange-500 text-black" : "text-neutral-200"}`}>{z}×</button>
                ))}
              </div>
              <div className="absolute right-2 top-2 flex flex-col gap-2 text-xs" onPointerDown={(e) => e.stopPropagation()}>
                <label className="cursor-pointer rounded-full bg-black/60 px-3 py-1.5 backdrop-blur">Import<input type="file" accept="image/*" hidden onChange={(e) => importFile(e.target.files?.[0])} /></label>
                <button className="rounded-full bg-black/60 px-3 py-1.5 backdrop-blur" onClick={() => setLcd(lcd === "off" ? "shoot" : lcd === "shoot" ? "play" : "off")}>LCD {lcd}</button>
              </div>
            </>
          )}
        </div>
      </div>

      {view === "camera" && (<>
      <div className="flex gap-1 overflow-x-auto px-3 pt-3">
        {MODES.map((m) => (
          <button key={m.id} disabled={recording || !!busy} onClick={() => setMode(m.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide ${mode === m.id ? "bg-white text-black" : "text-neutral-400"}`}>{m.label.toUpperCase()}</button>
        ))}
      </div>

      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex w-16 justify-start">
          {last && (last.kind === "photo"
            ? <button onClick={() => share(last)} aria-label="Share last shot"><img src={last.url} alt="Last shot" className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/20" /></button>
            : <button onClick={() => share(last)} aria-label="Share last video"><video src={last.url} muted className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/20" /></button>)}
        </div>
        <button aria-label={isVideoMode ? (recording ? "Stop recording" : "Start recording") : "Take photo"} onClick={onShutter}
          className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white transition active:scale-95 ${isVideoMode ? "bg-neutral-900" : "bg-orange-500"}`}>
          {isVideoMode && <span className={`block bg-red-500 transition-all ${recording ? "h-6 w-6 rounded-md" : "h-11 w-11 rounded-full"}`} />}
          {countdown > 0 && <span className="text-lg font-semibold text-white">✕</span>}
        </button>
        <div className="flex w-16 justify-end">
          <button onClick={() => (cam.live ? cam.flip() : startCamera(cam.facing === "user" ? "environment" : "user"))} aria-label="Flip camera" className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 active:bg-neutral-700"><Icon d={ICON.flip} className="h-6 w-6" /></button>
        </div>
      </div>

      {mode === "pro" && !minimal && (
        <section className="mx-3 mb-3 space-y-2 rounded-2xl bg-neutral-900 p-3 ring-1 ring-white/10">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-500">
            <span>Manual controls</span>
            <div className="flex gap-2 normal-case">
              <button className={chip(pro.look)} onClick={() => setPro({ ...pro, look: !pro.look })}>Camera look {pro.look ? "on" : "off"}</button>
              <button className={chip(false)} onClick={() => setPro({ ...PRO_DEFAULT, look: pro.look })}>Reset</button>
            </div>
          </div>
          {PRO_CONTROLS.map((c) => (
            <label key={c.key} className="flex items-center gap-3 text-xs text-neutral-300">
              <span className="w-20">{c.label}</span>
              <input type="range" min={c.min} max={c.max} step={c.step} value={pro[c.key]} onChange={(e) => setPro({ ...pro, [c.key]: +e.target.value })} className="flex-1 accent-orange-500" />
              <span className="w-10 text-right tabular-nums">{pro[c.key].toFixed(2)}</span>
            </label>
          ))}
        </section>
      )}
      {mode === "portrait" && !minimal && (
        <label className="mx-4 mb-3 flex items-center gap-3 text-xs text-neutral-300">
          <span className="w-20">Background blur</span>
          <input type="range" min={0} max={1} step={0.02} value={portraitBlur} onChange={(e) => setPortraitBlur(+e.target.value)} className="flex-1 accent-orange-500" />
        </label>
      )}
      {mode === "night" && !minimal && <p className="mx-4 mb-3 text-xs text-neutral-400">Night takes about one second and combines 8 frames to cut noise. Hold still.</p>}
      {mode === "timelapse" && !minimal && (
        <div className="mx-4 mb-3 flex items-center gap-2 text-xs text-neutral-300">
          Every
          {TL_INTERVALS.map((n) => <button key={n} disabled={recording} onClick={() => setTlInterval(n)} className={chip(tlInterval === n)}>{n}s</button>)}
        </div>
      )}

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
              {STAMPS.map((s) => <button key={s.id} onClick={() => setStamp(s.id)} className={chip(stamp === s.id)} title={s.sample}>{s.label}</button>)}
            </div>
          </div>

          <div>
            <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Effects</h2>
            <div className="flex gap-2 overflow-x-auto px-4 pb-1">
              {EFFECTS.map((e) => (
                <button key={e.id} onClick={() => setEffects((s) => { const n = new Set(s); if (n.has(e.id)) n.delete(e.id); else n.add(e.id); return n; })} className={chip(effects.has(e.id))}>{e.label}</button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="px-4 pb-1 text-[11px] uppercase tracking-wider text-neutral-500">Film roll</h2>
            <FilmCarousel value={filmId} onPick={(f) => setFilmId(f?.id ?? null)} />
          </div>

          <div>
            <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Makers</h2>
            <div className="flex gap-4 overflow-x-auto px-4 pb-1">
              {["All", ...(myLooks.length ? ["My Looks"] : []), ...BRANDS].map((b) => <button key={b} onClick={() => setBrand(b)} className={`shrink-0 text-sm ${brand === b ? "font-semibold text-orange-400" : "text-neutral-400"}`}>{b}</button>)}
            </div>
          </div>

          {rows.map(({ row, items }) => (
            <div key={row}>
              <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">{row === "Mine" ? "My Looks" : row}</h2>
              <div className="flex gap-3 overflow-x-auto px-4 pb-1">
                {items.map((c) => (
                  <button key={c.preset.id} onClick={() => setCamId(c.preset.id)} className="w-24 shrink-0 text-center" title={c.preset.blurb}>
                    <div className={`h-[72px] rounded-xl bg-neutral-800/80 p-1 ring-1 transition ${c.preset.id === camId ? "ring-orange-500" : "ring-white/5"}`}><CameraIcon body={c.body} color={c.color} /></div>
                    <div className="mt-1.5 truncate text-[11px] font-medium text-neutral-200">{c.preset.name}</div>
                    <div className="truncate text-[10px] text-neutral-500">{c.brand} {c.model}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="px-4 text-xs text-neutral-400">{camDef.preset.blurb}</p>

          {shots.length > 0 && (
            <div>
              <h2 className="px-4 pb-1.5 text-[11px] uppercase tracking-wider text-neutral-500">Saved · tap to share or download</h2>
              <div className="flex gap-2 overflow-x-auto px-4">
                {shots.map((s) => (
                  <button key={s.url} onClick={() => share(s)} className="shrink-0">
                    {s.kind === "photo" ? <img src={s.url} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <video src={s.url} muted className="h-16 w-16 rounded-lg object-cover" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      </>)}

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
      {view === "share" && (
        <ShareSheet looks={myLooks} focusId={dr.draft?.id ?? (myLooks.some((l) => l.id === camId) ? camId : undefined)} camLive={cam.live} startCamera={() => startCamera(cam.facing)} getFrame={getFrame} onImport={importLook} />
      )}

      {toast && <div role="status" className="fixed inset-x-0 bottom-20 z-40 mx-auto w-fit rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-lg">{toast}</div>}

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-white/10 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {([["camera", "Camera"], ["gallery", "Looks"], ["builder", "Build"], ["share", "Share"]] as [View, string][]).map(([v, label]) => (
          <button key={v} aria-current={view === v ? "page" : undefined} disabled={recording || !!busy}
            onClick={() => { if (v === "builder") { if (!dr.draft) openBuilder(); else setView("builder"); } else setView(v); }}
            className={`flex-1 py-3 text-xs font-semibold tracking-wide ${view === v ? "text-orange-400" : "text-neutral-400"}`}>{label}</button>
        ))}
      </nav>
    </main>
  );
}
