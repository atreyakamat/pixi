"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { NearbyPanel, type NearbyShot } from "./NearbyPanel";
import { decodeLook, encodeLook, type SavedLook } from "./store";

interface Props {
  looks: SavedLook[];
  focusId?: string;
  camLive: boolean;
  startCamera: () => void;
  getFrame: () => ImageData | null;
  onImport: (l: SavedLook) => void;
  shots: NearbyShot[];
  onReceiveFile: (blob: Blob, name: string) => void;
}

export function ShareSheet({ looks, focusId, camLive, startCamera, getFrame, onImport, shots, onReceiveFile }: Props) {
  const [sel, setSel] = useState(focusId ?? looks[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [note, setNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const done = useRef(false);

  useEffect(() => { if (focusId) setSel(focusId); }, [focusId]);

  useEffect(() => {
    const l = looks.find((x) => x.id === sel);
    setQr(""); setCode(""); setNote("");
    if (!l) return;
    let dead = false;
    (async () => {
      const c = await encodeLook(l);
      if (dead) return;
      setCode(c);
      try { const u = await QRCode.toDataURL(c, { errorCorrectionLevel: "L", margin: 2, width: 360 }); if (!dead) setQr(u); }
      catch { if (!dead) setNote("This look is too large for one QR code. Copy the code instead."); }
    })();
    return () => { dead = true; };
  }, [sel, looks]);

  const importCode = async (c: string) => {
    const l = await decodeLook(c);
    if (!l) { setMsg("That is not a valid Pixi look."); return false; }
    onImport(l); setMsg(`Added “${l.name}” to My Looks.`); return true;
  };

  useEffect(() => {
    if (!scanning) return;
    done.current = false;
    const id = setInterval(async () => {
      if (done.current) return;
      const f = getFrame();
      if (!f) return;
      const r = jsQR(f.data, f.width, f.height, { inversionAttempts: "dontInvert" });
      if (r?.data.startsWith("PIXI")) { done.current = true; setScanning(false); await importCode(r.data); }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const copy = async () => { try { await navigator.clipboard.writeText(code); setMsg("Code copied."); } catch { setMsg("Could not copy. Select the code manually."); } };
  const btn = "rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 active:bg-neutral-700 disabled:opacity-40";

  return (
    <section className="space-y-5 px-3 pb-6 pt-1">
      <div className="space-y-2 rounded-2xl bg-neutral-900 p-3 ring-1 ring-white/10">
        <h2 className="text-sm font-semibold">Share a look</h2>
        {looks.length === 0 ? <p className="text-xs text-neutral-400">Save a look to My Looks in the builder first, then share it here.</p> : (
          <>
            <select aria-label="Look to share" value={sel} onChange={(e) => setSel(e.target.value)} className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm">
              {looks.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {qr ? <img src={qr} alt="QR code for this look" className="mx-auto w-60 rounded-xl bg-white p-1" /> : note ? <p className="text-xs text-amber-300">{note}</p> : <div className="mx-auto h-60 w-60 animate-pulse rounded-xl bg-neutral-800" />}
            <p className="text-center text-xs text-neutral-400">On the other phone open Share → Scan a look and point it here. No internet needed.</p>
            <div className="flex justify-center gap-2"><button className={btn} onClick={copy} disabled={!code}>Copy code</button></div>
          </>
        )}
      </div>

      <div className="space-y-2 rounded-2xl bg-neutral-900 p-3 ring-1 ring-white/10">
        <h2 className="text-sm font-semibold">Scan a look</h2>
        {!camLive ? (
          <div className="space-y-2"><p className="text-xs text-neutral-400">The scanner uses the camera.</p><button className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black" onClick={startCamera}>Start camera</button></div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-neutral-400">{scanning ? "Point the camera at a Pixi QR code. Look at the preview above." : "Tap Scan, then point the camera at a Pixi QR code."}</p>
            <button className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black" onClick={() => { setMsg(""); setScanning(!scanning); }}>{scanning ? "Stop scanning" : "Scan"}</button>
          </div>
        )}
        <div className="flex gap-2">
          <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Or paste a code (PIXI1.…)" className="min-w-0 flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-xs outline-none ring-1 ring-white/10 focus:ring-orange-500" />
          <button className={btn} disabled={!paste.trim()} onClick={async () => { if (await importCode(paste)) setPaste(""); }}>Add</button>
        </div>
      </div>
      <NearbyPanel shots={shots} camLive={camLive} startCamera={startCamera} getFrame={getFrame} onReceiveFile={onReceiveFile}
        onReceiveLook={async (c) => { const l = await decodeLook(c); if (!l) return false; onImport(l); return true; }} />
      {msg && <p role="status" className="text-center text-xs text-orange-300">{msg}</p>}
    </section>
  );
}
