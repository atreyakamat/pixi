"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import PixiApp from "@/shell/PixiApp";
import { getClient } from "./client";
import { WedPolaContext, type WedPolaState } from "./context";
import { loadMember, type Member } from "./manage";
import { SignIn } from "./SignIn";
import { ProjectList } from "./Projects";
import { ProjectScreen } from "./ProjectScreen";

type Screen = { name: "camera" } | { name: "projects" } | { name: "project"; id: string };
type Loaded = { userId: string; member: Member | null; error?: string };

/**
 * The Wedding Pola front door. Signed out: the sign-in screen. Signed in: the Pixi camera, with
 * the projects and project screens one tap away. The camera is unmounted while a manage screen is
 * open, so its stream stops.
 */
export function WedPolaRoot() {
  const [supabase] = useState(() => getClient());
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reload, setReload] = useState(0);
  const [screen, setScreen] = useState<Screen>({ name: "camera" });

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    supabase.auth.getSession().then(
      ({ data }) => { if (live) setSession(data.session); },
      () => { if (live) setSession(null); },
    );
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!live) return;
      if (event === "SIGNED_OUT") setScreen({ name: "camera" });
      setSession(next);
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, [supabase]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) return;
    let live = true;
    loadMember(supabase, userId).then(
      (r) => { if (live) setLoaded({ userId, member: r.member, error: r.error }); },
      () => { if (live) setLoaded({ userId, member: null, error: "Couldn't load your studio. Check your connection and try again." }); },
    );
    return () => { live = false; };
  }, [supabase, userId, reload]);

  if (!supabase) return <SignIn supabase={null} />;
  if (session === undefined) return <Splash text="Loading…" />;
  if (session === null) return <SignIn supabase={supabase} />;

  const ready = loaded?.userId === session.user.id ? loaded : null;
  if (!ready) return <Splash text="Opening your studio…" />;
  if (ready.error) {
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-4 bg-[#0a0a0a] px-4 text-white">
        <p role="alert" className="mx-auto w-full max-w-sm rounded-xl bg-red-500/15 p-4 text-sm leading-relaxed text-red-200">{ready.error}</p>
        <button type="button" onClick={() => setReload((n) => n + 1)} className="mx-auto min-h-11 rounded-full bg-white/[0.16] px-5 text-sm font-semibold">Try again</button>
      </main>
    );
  }

  const state: WedPolaState = {
    supabase,
    session,
    member: ready.member,
    openProjects: () => setScreen({ name: "projects" }),
    openProject: (id) => setScreen({ name: "project", id }),
    openCamera: () => setScreen({ name: "camera" }),
  };
  return (
    <WedPolaContext.Provider value={state}>
      {screen.name === "camera" && <PixiApp />}
      {screen.name === "projects" && <ProjectList />}
      {screen.name === "project" && <ProjectScreen key={screen.id} id={screen.id} />}
    </WedPolaContext.Provider>
  );
}

function Splash({ text }: { text: string }) {
  return <main className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] px-4 text-white/60">{text}</main>;
}
