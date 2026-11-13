"use client";
import { useState, useSyncExternalStore } from "react";
import { Group, Row } from "./Settings";
import { onTokenChange, parseStudioToken, savedToken, saveToken, sendRoll, STUDIO_BUILD, STUDIO_SITE } from "./studioSend";

/** The studio's send panel. Renders nothing in the public Pixi app. */
export function StudioSendPanel({ say }: { say: (m: string) => void }) {
  const token = useSyncExternalStore(onTokenChange, savedToken, () => null);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState("");
  if (!STUDIO_BUILD) return null;

  const connect = () => {
    const t = parseStudioToken(paste);
    if (!t) { say("That isn't a connect line. Copy it from Photo delivery → Connect a computer."); return; }
    saveToken(t); setPaste("");
    say("Connected to your studio.");
  };
  const send = async () => {
    if (!token || busy) return;
    setBusy("Sending…");
    const r = await sendRoll(token, (d, t) => setBusy(`Sending ${d}/${t}…`));
    setBusy("");
    say(r.ok ? `Sent ${r.sent} ${r.sent === 1 ? "photo" : "photos"} to ${r.project}${r.skipped ? `, skipped ${r.skipped}` : ""}.` : r.reason);
  };
  const disconnect = () => { saveToken(null); say("Disconnected from your studio."); };

  return (
    <Group title="Studio" note={`Send your Roll to your studio at ${STUDIO_SITE}. Only when you press Send; nothing is sent in the background.`}>
      {token ? (
        <>
          <Row label="Send the Roll to your studio">
            <button onClick={send} disabled={!!busy} className="rounded-full bg-white/[0.16] px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy || "Send"}</button>
          </Row>
          <Row label="Disconnect this phone">
            <button onClick={disconnect} className="text-sm text-white/60 underline">Disconnect</button>
          </Row>
        </>
      ) : (
        <div className="px-4 py-3">
          <label htmlFor="studio-connect" className="block pb-2 text-sm text-white/70">Paste the connect line from your studio dashboard</label>
          <textarea id="studio-connect" value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} className="w-full rounded-lg bg-white/[0.08] p-2 text-sm" />
          <button onClick={connect} disabled={!paste.trim()} className="mt-2 rounded-full bg-white/[0.16] px-4 py-2 text-sm font-semibold disabled:opacity-50">Connect</button>
        </div>
      )}
    </Group>
  );
}
