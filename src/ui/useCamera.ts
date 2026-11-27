"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Lens { id: string; label: string }

const cameraError = (e: unknown): string => {
  const n = (e as { name?: string })?.name;
  if (n === "NotAllowedError" || n === "SecurityError") return "Pixi can't use the camera yet. Allow Camera for Pixi in your phone's or browser's settings, then tap Try again.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "This device doesn't seem to have a camera. You can still bring in a photo from your phone.";
  if (n === "NotReadableError") return "Another app is using the camera. Close it, then tap Try again.";
  return "The camera didn't start. Tap Try again, or bring in a photo from your phone.";
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

/** Best-guess label for a back lens from its device label. Order matters: check the narrowest term first
 *  so e.g. "Back Ultra Wide Macro Camera" lands on Ultra-wide rather than Macro. Most OEMs label generically
 *  or not at all, so this is a hint, not a guarantee — see cameraDiag.ts for reading the real labels off a phone. */
function lensLabel(label: string, index: number): string {
  if (/ultra.?wide/i.test(label)) return "0.5x";
  if (/macro/i.test(label)) return "Macro";
  if (/tele(photo)?|zoom/i.test(label)) return "Tele";
  if (/wide/i.test(label) && !/ultra/i.test(label)) return "1x";
  return index === 0 ? "1x" : `Lens ${index + 1}`;
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
  // Device IDs seen for each facing, once labels are known (labels are blank until permission is granted once).
  // Lets flip() ask for a specific camera by id instead of trusting the "ideal" facingMode hint, which some
  // Android WebViews silently ignore and just hand back whatever camera was already open.
  const knownRef = useRef<{ user?: string; environment?: string }>({});

  const stop = useCallback(() => {
    wantRef.current = { ...wantRef.current, on: false };
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false); setTorchOn(false); setTorchOk(false);
  }, []);

  // Named function expression (not an arrow) so the retry branch below can call `doStart` recursively
  // without referencing the `start` binding before useCallback has finished assigning it.
  const start = useCallback(async function doStart(want: "user" | "environment", deviceId?: string, retried = false): Promise<boolean> {
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("The camera only works on a secure page. Open Pixi from its https:// link, then try again.");
      return false;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    // Prefer a device id we already know for this facing over the bare facingMode hint: some Android
    // WebViews treat facingMode as advisory and silently hand back whatever camera is already open,
    // which is how a "flip" can end up just mirroring the same feed instead of switching cameras.
    // facingMode is requested as `exact` (not `ideal`) when we have no id yet, so a mismatch throws
    // instead of silently succeeding with the wrong camera.
    const knownId = deviceId ?? knownRef.current[want];
    const attempts: MediaStreamConstraints[] = [
      knownId
        ? { video: { deviceId: { exact: knownId }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }
        : { video: { facingMode: { exact: want }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: { ideal: want }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: true, audio: false },
    ];
    let last: unknown;
    for (const c of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        const v = ensureVideo(videoRef);
        v.srcObject = stream;
        await v.play();
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();

        // Learn every camera's facing + id from this permission grant, so the next flip can ask for a
        // specific device instead of trusting the facingMode hint alone.
        let devs: MediaDeviceInfo[] = [];
        try { devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"); } catch { /* ignore */ }
        for (const d of devs) {
          if (!d.label) continue;
          if (/front|user|face/i.test(d.label)) knownRef.current.user ??= d.deviceId;
          else knownRef.current.environment ??= d.deviceId;
        }

        // Verify we actually got the camera we asked for. If not, and we haven't retried yet, stop
        // this stream and ask again by explicit device id instead of pretending the flip worked.
        const actual = settings.facingMode as "user" | "environment" | undefined;
        if (actual && actual !== want && !retried) {
          const candidate = devs.find((d) => (want === "user" ? /front|user|face/i.test(d.label) : !/front|user|face/i.test(d.label)) && d.deviceId !== settings.deviceId);
          if (candidate) {
            stream.getTracks().forEach((t) => t.stop());
            return doStart(want, candidate.deviceId, true);
          }
        }

        streamRef.current = stream;
        const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorchOk(!!caps.torch); setTorchOn(false);
        const resolvedFacing = actual ?? want;
        wantRef.current = { on: true, facing: resolvedFacing, lens: deviceId };
        track.addEventListener("ended", () => { if (streamRef.current === stream) setLive(false); });
        setFacing(resolvedFacing); setLive(true); setError("");
        const back = resolvedFacing === "environment" ? devs.filter((d) => !/front|user|face/i.test(d.label)) : [];
        setLenses(back.length > 1 ? back.map((d, i) => ({ id: d.deviceId, label: lensLabel(d.label, i) })) : []);
        setLensId(settings.deviceId ?? "");
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
