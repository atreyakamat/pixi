"use client";
import { useEffect, useState } from "react";
import { useWedPola } from "./context";
import { canManage, listProjects, type ProjectRow } from "./manage";

const STATUS: Record<ProjectRow["status"], string> = { draft: "Draft", published: "Published", archived: "Archived" };

/** The studio's projects, newest first. Tapping one opens its manage screen. */
export function ProjectList() {
  const { supabase, member, openCamera, openProject } = useWedPola();
  const [rows, setRows] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!member) return;
    let live = true;
    listProjects(supabase, member.organizationId).then(
      (r) => { if (live) { setRows(r.rows); setError(r.error ?? ""); } },
      () => { if (live) setError("Couldn't load the projects. Check your connection and try again."); },
    );
    return () => { live = false; };
  }, [supabase, member, reload]);

  return (
    <main className="min-h-dvh bg-[#0a0a0a] px-4 pb-10 pt-6 text-white">
      <header className="flex items-center justify-between gap-3 pb-5">
        <h1 className="text-[1.75rem] font-bold tracking-[-0.02em]">Projects</h1>
        <button type="button" onClick={openCamera} className="min-h-11 rounded-full bg-white/[0.12] px-4 text-sm font-semibold">Camera</button>
      </header>

      {!member ? (
        <p className="rounded-xl bg-white/[0.06] p-4 text-sm leading-relaxed text-white/70">Your account isn&apos;t linked to a studio yet. Ask your studio owner to add you, then sign in again.</p>
      ) : (
        <>
          {!canManage(member.role) && <p className="pb-4 text-sm leading-relaxed text-white/50">You can see the projects. Owners and admins can change the looks and settings.</p>}
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/15 p-3 text-sm leading-relaxed text-red-200">{error}</p>}
          {rows === null && !error && <p className="text-sm text-white/50">Loading projects…</p>}
          {rows?.length === 0 && <p className="rounded-xl bg-white/[0.06] p-4 text-sm leading-relaxed text-white/70">No projects yet. Send a Roll from the camera and it will show up here.</p>}
          {rows && rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => openProject(p.id)} className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-left">
                    <span className="min-w-0">
                      <span className="block truncate text-[1rem] font-semibold">{p.name}</span>
                      <span className="block text-[0.8125rem] text-white/50">{STATUS[p.status]} · {p.photoCount} {p.photoCount === 1 ? "photo" : "photos"}</span>
                    </span>
                    <span aria-hidden className="shrink-0 text-white/40">›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setReload((n) => n + 1)} className="mt-4 min-h-11 px-1 text-sm text-white/60 underline">Refresh</button>
        </>
      )}
    </main>
  );
}
