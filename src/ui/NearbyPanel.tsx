"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { Nearby, type NearbyState } from "./nearby";

export interface NearbyShot { url: string; kind: "photo" | "video"; ext: string; blob: Blob }
interface Props {
  shots: NearbyShot[];
  camLive: boolean;
  startCamera: () => void;
  getFrame: () => ImageData | null;
  onReceiveFile: (blob: Blob, name: string) => void;
  onReceiveLook: (code: string) => Promise<boolean>;
}

type Role = "none" | "send" | "recv";
const btn = "rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 active:bg-neutral-700 disabled:opacity-40";
const pri = "rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black disabled:opacity-40";

export function NearbyPanel({ shots, camLive, startCamera, getFrame, onReceiveFile, onReceiveLook }: Props) {
  const nb = useRef<Nearby | null>(null);
  const [role, setRole] = useState<Role>("none");
  const [state, setState] = useState<NearbyState>("idle");
  const [qr, setQr] = useState("");
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState("");
  const [prog, setProg] = useState<[number, number] | null>(null);
  const scanFor = useRef<"PIXIO" | "PIXIA" | null>(null);

  const reset = () => { nb.current?.close(); nb.current = null; setRole("none"); setState("idle"); setQr(""); setScanning(false); setMsg(""); setProg(null); };
  useEffect(() => () => { nb.current?.close(); }, []);

  const make = () => {
    const n = new Nearby();
    n.onState = setState;
    n.onProgress = (a, b) => setProg(a >= b ? null : [a, b]);
    n.onItem = async (i) => {
      if (i.kind === "file") { onReceiveFile(i.blob, i.name); setMsg(`Received ${i.name}.`); }
      else setMsg((await onReceiveLook(i.code)) ? "Received a look." : "Received an invalid look.");
    };
    nb.current = n; return n;
  };
  const show = async (code: string) => {
    try { setQr(await QRCode.toDataURL(code, { errorCorrectionLevel: "L", margin: 2, width: 420 })); }
    catch { setMsg("Connection code too large for a QR."); }
  };

  const startSend = async () => {
    setMsg(""); setRole("send"); setQr("");
    const code = await make().createOffer();
    await show(code); scanFor.current = "PIXIA";
  };
  const startRecv = () => { setMsg(""); setRole("recv"); setQr(""); make(); scanFor.current = "PIXIO"; setScanning(true); };

  useEffect(() => {
    if (!scanning) return;
    let done = false;
    const id = setInterval(async () => {
      if (done) return;
      const f = getFrame(); if (!f) return;
      const r = jsQR(f.data, f.width, f.height, { inversionAttempts: "dontInvert" });
      const want = scanFor.current;
      if (!r || !want || !r.data.startsWith(want)) return;
      done = true; setScanning(false);
      const n = nb.current; if (!n) return;
      try {
        if (want === "PIXIO") { const ans = await n.acceptOffer(r.data); if (ans) { setQr(""); await show(ans); setMsg("Now let the other phone scan this."); } else setMsg("That code didn't work."); }
        else if (!(await n.acceptAnswer(r.data))) setMsg("That code didn't work.");
      } catch { setMsg("Could not connect. Make sure both phones are on the same hotspot."); }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const sendShot = async (s: NearbyShot) => {
    try { await nb.current?.sendFile(s.blob, `pixi-${Date.now()}.${s.ext}`); setMsg("Sent."); } catch { setMsg("Send failed."); }
  };
  const open = state === "open";

  return (
    <div className="space-y-2 rounded-2xl bg-neutral-900 p-3 ring-1 ring-white/10">
      <h2 className="text-sm font-semibold">Send photos nearby</h2>
      <p className="text-xs text-neutral-400">Put both phones on the same hotspot or Wi-Fi. Photos go straight from phone to phone. Nothing is uploaded.</p>
      {role === "none" && (
        <div className="flex gap-2">
          <button className={pri} onClick={startSend}>Send</button>
          <button className={pri} onClick={() => (camLive ? startRecv() : (startCamera(), setMsg("Camera starting. Tap Receive again.")))}>Receive</button>
        </div>
      )}
      {role !== "none" && !open && (
        <div className="space-y-2">
          {qr && <img src={qr} alt="Connection QR code" className="mx-auto w-64 rounded-xl bg-white p-1" />}
          {role === "send" && qr && <>
            <p className="text-xs text-neutral-400">1. On the other phone tap Receive and scan this. 2. Then scan the code it shows back.</p>
            <button className={pri} onClick={() => { if (!camLive) startCamera(); setScanning(!scanning); }}>{scanning ? "Stop scanning" : "Scan their code"}</button>
          </>}
          {role === "recv" && !qr && <p className="text-xs text-neutral-400">{scanning ? "Point the camera at the sender's code." : "Starting scanner…"}</p>}
          <p className="text-[11px] text-neutral-500">Status: {state}</p>
          <button className={btn} onClick={reset}>Cancel</button>
        </div>
      )}
      {open && (
        <div className="space-y-2">
          <p className="text-xs text-emerald-300">Connected.</p>
          {role === "send" && (shots.length === 0 ? <p className="text-xs text-neutral-400">Take a photo first, then tap it to send.</p> : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {shots.map((s) => s.kind === "photo"
                ? <button key={s.url} onClick={() => sendShot(s)} className="shrink-0"><img src={s.url} alt="Send this photo" className="h-20 w-16 rounded-lg object-cover" /></button>
                : <button key={s.url} onClick={() => sendShot(s)} className="h-20 w-16 shrink-0 rounded-lg bg-neutral-800 text-[10px]">Video</button>)}
            </div>
          ))}
          {role === "recv" && <p className="text-xs text-neutral-400">Waiting for photos…</p>}
          {prog && <div className="h-1.5 overflow-hidden rounded bg-neutral-800"><div className="h-full bg-orange-500" style={{ width: `${(prog[0] / prog[1]) * 100}%` }} /></div>}
          <button className={btn} onClick={reset}>Disconnect</button>
        </div>
      )}
      {msg && <p role="status" className="text-xs text-orange-300">{msg}</p>}
    </div>
  );
}
