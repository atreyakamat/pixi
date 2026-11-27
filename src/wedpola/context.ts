"use client";
import { createContext, useContext } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Member } from "./manage";

/** What the signed-in screens share: the client, the session, the studio and the navigation. */
export type WedPolaState = {
  supabase: SupabaseClient;
  session: Session;
  /** The studio this account belongs to, or null when it isn't linked to one. */
  member: Member | null;
  openProjects: () => void;
  openProject: (projectId: string) => void;
  openCamera: () => void;
};

export const WedPolaContext = createContext<WedPolaState | null>(null);

export function useWedPola(): WedPolaState {
  const state = useContext(WedPolaContext);
  if (!state) throw new Error("Wedding Pola screens must be opened from the Wedding Pola root.");
  return state;
}
