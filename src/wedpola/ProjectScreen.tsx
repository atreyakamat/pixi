"use client";
import { useEffect, useState } from "react";
import { useWedPola } from "./context";
import {
  canManage, clearLookDefault, isOwner, loadLookDefaults, loadProject, loadSheets, saveLookDefault, saveSheets, setSelectionOnly,
  type ProjectRow,
} from "./manage";
import { LOOKS_BY_ID, looksIn } from "./looks";
import { LIGHTINGS, LIGHTING_LABELS, SHEET_KINDS, type Lighting, type SheetKind } from "./validate";

const SHEET_TEXT: Record<SheetKind, { label: string; sub: string }> = {
  grid: { label: "Grid", sub: "Every chosen photo in every look, on one sheet." },
  "before-after": { label: "Before and after", sub: "The original next to the chosen look." },
};

const select = "min-h-11 w-full min-w-0 rounded-xl bg-white/[0.08] px-3 text-[1rem] text-white disabled:opacity-50";

type Notice = { tone: "ok" | "error"; text: string };

/** One project's manage screen: selection, look defaults and look sheets. Read-only for non-managers. */
export function ProjectScreen({ id }: { id: string }) {
  const { supabase, session, member, openProjects } = useWedPola();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [defaults, setDefaults] = useState<Partial<Record<Lighting, string>>>({});
  const [sheets, setSheets] = useState<SheetKind[]>([]);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!member) return;
    let live = true;
    Promise.all([loadProject(supabase, id), loadLookDefaults(supabase, member.organizationId), loadSheets(supabase, member.organizationId)])
      .then(([p, d, s]) => {
        if (!live) return;
        setProject(p.project);
        setLoadError(p.error ?? (p.project ? d.error ?? s.error ?? "" : "That project isn't in your studio."));
        setDefaults(d.defaults);
        setSheets(s.sheets);
      })
      .catch(() => { if (live) setLoadError("Couldn't load this project. Check your connection and try again."); });
    return () => { live = false; };
  }, [supabase, id, member, version]);

  if (!member) {
    return <Shell onBack={openProjects}><p className="rounded-xl bg-white/[0.06] p-4 text-sm leading-relaxed text-white/70">Your account isn&apos;t linked to a studio yet.</p></Shell>;
  }
  const manager = canManage(member.role);
  const owner = isOwner(member.role);
  const after = (result: { ok: true } | { ok: false; message: string }, done: string) => {
    setNotice(result.ok ? { tone: "ok", text: done } : { tone: "error", text: result.message });
    setVersion((n) => n + 1);
  };
  const run = async (task: () => Promise<{ ok: true } | { ok: false; message: string }>, done: string) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try { after(await task(), done); } catch { setNotice({ tone: "error", text: "Couldn't save. Check your connection and try again." }); }
    setBusy(false);
  };

  const setLook = (lighting: Lighting, look: string) => {
    const userId = session.user.id;
    void run(
      () => (look ? saveLookDefault(supabase, member.organizationId, userId, lighting, look) : clearLookDefault(supabase, member.organizationId, lighting)),
      look ? `${LIGHTING_LABELS[lighting]} default saved.` : `${LIGHTING_LABELS[lighting]} default cleared.`,
    );
  };
  const toggleSheet = (kind: SheetKind, on: boolean) => {
    const next = SHEET_KINDS.filter((k) => (k === kind ? on : sheets.includes(k)));
    void run(() => saveSheets(supabase, member.organizationId, next), "Look sheets saved.");
  };
  const toggleSelection = (value: boolean) => {
    if (!project) return;
    void run(() => setSelectionOnly(supabase, project.id, value), value ? "Selection only is on." : "Selection only is off.");
  };

  return (
    <Shell onBack={openProjects}>
      {loadError && <p role="alert" className="mb-4 rounded-xl bg-red-500/15 p-3 text-sm leading-relaxed text-red-200">{loadError}</p>}
      {!project && !loadError && <p className="text-sm text-white/50">Loading…</p>}
      {project && (
        <>
          <section className="pb-6">
            <h1 className="break-words text-[1.5rem] font-bold tracking-[-0.02em]">{project.name}</h1>
            <p className="pt-1 text-sm text-white/50">{project.status[0].toUpperCase() + project.status.slice(1)} · {project.photoCount} {project.photoCount === 1 ? "photo" : "photos"}</p>
          </section>

          <Section title="Selection" note="When this is on, a client can download only the photos they hearted. Nothing is removed from the studio.">
            <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-2">
              <span className="text-[0.9375rem]">Selection only</span>
              <button
                type="button"
                role="switch"
                aria-checked={project.selection_only}
                aria-label="Selection only"
                disabled={!owner || busy}
                onClick={() => toggleSelection(!project.selection_only)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${project.selection_only ? "bg-white" : "bg-white/20"}`}
              >
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-[#0a0a0a] transition-transform ${project.selection_only ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
            {!owner && <p className="px-4 pb-3 text-[0.8125rem] text-white/45">Only the studio owner can change this.</p>}
          </Section>

          <Section title="Look defaults" note="The look used for each kind of light when a photo is edited. Pick No default to clear one.">
            {LIGHTINGS.map((lighting) => {
              const current = defaults[lighting] ?? "";
              const options = looksIn(lighting);
              const unknown = current && !LOOKS_BY_ID.has(current) ? current : null;
              return (
                <div key={lighting} className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 px-4 py-3">
                  <label htmlFor={`look-${lighting}`} className="min-w-[8rem] flex-1 text-[0.9375rem]">{LIGHTING_LABELS[lighting]}</label>
                  <select id={`look-${lighting}`} value={current} disabled={!manager || busy} onChange={(e) => setLook(lighting, e.target.value)} className={`${select} max-w-full sm:w-56`}>
                    <option value="">No default</option>
                    {unknown && <option value={unknown}>{unknown}</option>}
                    {options.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              );
            })}
            {!manager && <p className="px-4 pb-3 text-[0.8125rem] text-white/45">Only owners and admins can change the looks.</p>}
          </Section>

          <Section title="Look sheets" note="The sheets clients can order from their chosen photos. Turn on one or both.">
            {SHEET_KINDS.map((kind) => (
              <label key={kind} className="flex min-h-11 items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={sheets.includes(kind)}
                  disabled={!manager || busy}
                  onChange={(e) => toggleSheet(kind, e.target.checked)}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-white disabled:opacity-50"
                />
                <span className="min-w-0">
                  <span className="block text-[0.9375rem]">{SHEET_TEXT[kind].label}</span>
                  <span className="block text-[0.8125rem] leading-snug text-white/45">{SHEET_TEXT[kind].sub}</span>
                </span>
              </label>
            ))}
            {!manager && <p className="px-4 pb-3 text-[0.8125rem] text-white/45">Only owners and admins can change the sheets.</p>}
          </Section>

          {notice && (
            <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-2 rounded-xl p-3 text-sm leading-relaxed ${notice.tone === "error" ? "bg-red-500/15 text-red-200" : "bg-white/[0.08] text-white/80"}`}>
              {notice.text}
            </p>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh min-w-0 overflow-x-hidden bg-[#0a0a0a] px-4 pb-10 pt-6 text-white">
      <button type="button" onClick={onBack} className="mb-4 min-h-11 rounded-full bg-white/[0.12] px-4 text-sm font-semibold">Projects</button>
      {children}
    </main>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="pb-6">
      <h2 className="pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white/40">{title}</h2>
      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-[18px] bg-white/[0.05]">{children}</div>
      <p className="pt-2 text-[0.8125rem] leading-relaxed text-white/45">{note}</p>
    </section>
  );
}
