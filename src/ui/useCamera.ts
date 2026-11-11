"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Lens { id: string; label: string }

const cameraError = (e: unknown): string => {
  const n = (e as { name?: string })?.name;
  if (n === "NotAllowedError" || n === "SecurityError") return "Camera permission is blocked. Allow camera for this site in your browser settings, then tap Try again.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "No camera was found on this device.";
  if (n === "NotReadableError") return "The camera is being used by another app. Close it and try again.";
  return "Could not start the camera. You can still import a photo.";
};

/** Owns the camera stream: start, flip, lens switch and torch. The hidden <video> is read by the render loop. */
function ensureVideo(ref: { current: HTMLVideoElement | null }): HTMLVideoElement {
  if (ref.current) return ref.current;
  const v = document.createElement("video");
  v.setAttribute("playsinline", ""); v.setAttribute("autoplay", ""); v.muted = true;
  v.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0";
  document.body.appendChild(v);
  ref.current = v;
  return v;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [error, setError] = useState("");
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [lensId, setLensId] = useState<string>("");
  const [torchOk, setTorchOk] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const wantRef = useRef<{ on: boolean; facing: "user" | "environment"; lens?: string }>({ on: false, facing: "environment" });

  const stop = useCallback(() => {
    wantRef.current = { ...wantRef.current, on: false };
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false); setTorchOn(false); setTorchOk(false);
  }, []);

  const start = useCallback(async (want: "user" | "environment", deviceId?: string) => {
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("The camera only works on a secure page. Open the https:// link (or localhost), not an http:// address or an embedded preview.");
      return false;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const attempts: MediaStreamConstraints[] = [
      deviceId ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false } : { video: { facingMode: { ideal: want }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: want }, audio: false },
      { video: true, audio: false },
    ];
    let last: unknown;
    for (const c of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        const v = ensureVideo(videoRef);
        v.srcObject = stream;
        await v.play();
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorchOk(!!caps.torch); setTorchOn(false);
        wantRef.current = { on: true, facing: want, lens: deviceId };
        stream.getVideoTracks()[0].addEventListener("ended", () => { if (streamRef.current === stream) setLive(false); });
        setFacing(want); setLive(true); setError("");
        try {
          const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
          const back = want === "environment" ? devs.filter((d) => !/front|user|face/i.test(d.label)) : [];
          setLenses(back.length > 1 ? back.map((d, i) => ({ id: d.deviceId, label: /ultra/i.test(d.label) ? "0.5x" : /tele|zoom/i.test(d.label) ? "Tele" : i === 0 ? "1x" : `Lens ${i + 1}` })) : []);
          setLensId(track.getSettings().deviceId ?? "");
        } catch { setLenses([]); }
        return true;
      } catch (e) { last = e; if ((e as { name?: string }).name === "NotAllowedError") break; }
    }
    setError(cameraError(last));
    return false;
  }, []);

  const setTorch = useCallback(async (on: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try { await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] }); setTorchOn(on); } catch { /* unsupported */ }
  }, []);

  const flip = useCallback(() => start(facing === "user" ? "environment" : "user"), [facing, start]);
  const useLens = useCallback((id: string) => start("environment", id), [start]);

  // Release the camera when the app goes to the background and bring it back on return.
  useEffect(() => {
    const release = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setLive(false); setTorchOn(false);
    };
    const resume = () => {
      const w = wantRef.current;
      if (!w.on) return;
      const t = streamRef.current?.getVideoTracks()[0];
      if (t && t.readyState === "live" && !t.muted) return;
      void start(w.facing, w.lens);
    };
    const onVis = () => (document.hidden ? release() : resume());
    document.addEventListener("visibilitychange", onVis);
    let sub: { remove: () => Promise<void> } | undefined;
    import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", (st) => (st.isActive ? resume() : release()))).then((h) => { sub = h; }).catch(() => {});
    return () => { document.removeEventListener("visibilitychange", onVis); void sub?.remove(); };
  }, [start]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  return { videoRef, streamRef, live, facing, error, setError, lenses, lensId, torchOk, torchOn, start, stop, flip, useLens, setTorch };
}
