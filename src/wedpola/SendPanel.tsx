"use client";
import { useEffect, useState } from "react";
import { Group, Row } from "@/ui/Settings";
import { STUDIO_SITE, sendRollTo, type SendTarget } from "@/ui/studioSend";
import { useWedPola } from "./context";
import { listProjects, type ProjectRow } from "./manage";
import { InstallButton } from "./InstallButton";

const NEW = "new";

/**
 * The Wedding Pola panel in Settings: who is signed in, the studio, sending the Roll to a project,
 * install and sign out. It replaces the worker-token panel in this build.
 */
export function WedPolaSendPanel({ say }: { say: (m: string) => void }) {
  const { supabase, session, member, openProjects } = useWedPola();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [choice, setChoice] = useState(NEW);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!member) return;
    let live = true;
    listProjects(supabase, member.organizationId).then((r) => { if (live) setProjects(r.rows); }).catch(() => undefined);
    return () => { live = false; };
  }, [supabase, member]);

  const send = async () => {
    if (busy || !member) return;
    if (!STUDIO_SITE) { say("Sending isn't set up on this site yet."); return; }
    setBusy("Sending…");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { say("Sign in again to send."); return; }
      const picked = projects.find((p) => p.id === choice);
      const target: SendTarget = picked
        ? { kind: "existing", projectId: picked.id, projectName: picked.name }
        : { kind: "new", organizationId: member.organizationId };
      const r = await sendRollTo({ site: STUDIO_SITE, bearer: token }, target, (d, t) => setBusy(`Sending ${d}/${t}…`));
      say(r.ok ? `Sent ${r.sent} ${r.sent === 1 ? "photo" : "photos"} to ${r.project}${r.skipped ? `, skipped ${r.skipped}` : ""}.` : r.reason);
    } catch {
      say("Sending didn't finish. Try again.");
    } finally {
      setBusy("");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => undefined);
    say("Signed out.");
  };

  return (
    <>
      <Group title="Wedding Pola" note="Your photos go to your studio only when you press Send.">
        <Row label="Signed in as" sub={session.user.email ?? "Signed in"} />
        {member ? (
          <>
            <Row label="Studio" sub={member.organizationName} />
            <Row label="Projects" sub="See and manage the studio's projects">
              <button type="button" onClick={openProjects} className="min-h-11 rounded-full bg-white/[0.16] px-4 text-sm font-semibold">Open</button>
            </Row>
          </>
        ) : (
          <Row label="No studio yet" sub="Ask your studio owner to add this account." />
        )}
      </Group>

      {member && (
        <Group title="Send" note="Pick a project, or send to a new one named for today.">
          <div className="px-4 py-3">
            <label htmlFor="wp-project" className="block pb-2 text-[0.9375rem]">Send the Roll to</label>
            <select id="wp-project" value={choice} onChange={(e) => setChoice(e.target.value)} disabled={!!busy} className="min-h-11 w-full min-w-0 rounded-xl bg-white/[0.08] px-3 text-[1rem] text-white disabled:opacity-50">
              <option value={NEW}>A new project for today</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Row label="Send the Roll">
            <button type="button" onClick={() => void send()} disabled={!!busy} className="min-h-11 rounded-full bg-white/[0.16] px-5 text-sm font-semibold disabled:opacity-50">{busy || "Send"}</button>
          </Row>
        </Group>
      )}

      <Group title="App" note="Install puts Wedding Pola on your home screen. It opens full screen and works offline.">
        <div className="empty:hidden px-4 py-3"><InstallButton className="w-full" /></div>
        <Row label="Sign out" sub="Clears this phone's sign-in">
          <button type="button" onClick={() => void signOut()} className="min-h-11 px-3 text-sm text-white/70 underline">Sign out</button>
        </Row>
      </Group>
    </>
  );
}
