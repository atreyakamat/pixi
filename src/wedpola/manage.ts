import type { SupabaseClient } from "@supabase/supabase-js";
import { REFUSED, saveMessage, type Failure } from "./messages";
import { isLookId, isLighting, normalizeSheets, type Lighting, type SheetKind } from "./validate";

/** The data behind the manage screens. Every call runs as the signed-in user; RLS decides what is allowed. */

export type Role = "owner" | "admin" | "operator";
export type Member = { organizationId: string; organizationName: string; role: Role };
export type Outcome = { ok: true } | { ok: false; message: string };
export type ProjectRow = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  kind: string;
  shoot_date: string | null;
  selection_only: boolean;
  photoCount: number;
};

/** Owners and admins manage looks and sheets. Only owners toggle selection-only in the UI. */
export const canManage = (role: Role) => role === "owner" || role === "admin";
export const isOwner = (role: Role) => role === "owner";

const PROJECT_COLUMNS = "id, name, status, kind, shoot_date, selection_only, project_photos (count)";

type PhotoCount = { project_photos: { count: number }[] | null };
const withCount = <T extends PhotoCount>(row: T) => ({ ...row, photoCount: row.project_photos?.[0]?.count ?? 0 });

/** The studio this account belongs to (the first membership), or null when it has none. */
export async function loadMember(sb: SupabaseClient, userId: string): Promise<{ member: Member | null; error?: string }> {
  const { data, error } = await sb
    .from("organization_members")
    .select("organization_id, role, organizations (name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) return { member: null, error: saveMessage(error, "load your studio") };
  type Row = { organization_id: string; role: Role; organizations: { name: string } | { name: string }[] | null };
  const row = (data as Row[] | null)?.[0];
  if (!row) return { member: null };
  // PostgREST returns a many-to-one embed as an object; accept an array too, to be safe.
  const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
  return { member: { organizationId: row.organization_id, organizationName: org?.name ?? "Your studio", role: row.role } };
}

export async function listProjects(sb: SupabaseClient, organizationId: string): Promise<{ rows: ProjectRow[]; error?: string }> {
  const { data, error } = await sb
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) return { rows: [], error: saveMessage(error, "load the projects") };
  return { rows: ((data ?? []) as (PhotoCount & Omit<ProjectRow, "photoCount">)[]).map(withCount) };
}

export async function loadProject(sb: SupabaseClient, projectId: string): Promise<{ project: ProjectRow | null; error?: string }> {
  const { data, error } = await sb.from("projects").select(PROJECT_COLUMNS).eq("id", projectId).maybeSingle();
  if (error) return { project: null, error: saveMessage(error, "load the project") };
  if (!data) return { project: null };
  return { project: withCount(data as PhotoCount & Omit<ProjectRow, "photoCount">) };
}

/** Turns "no row came back" into a refusal: RLS filters the row out instead of raising an error. */
function outcome(error: Failure, rowsChanged: number | null, what: string): Outcome {
  if (error) return { ok: false, message: saveMessage(error, what) };
  if (rowsChanged === 0) return { ok: false, message: REFUSED };
  return { ok: true };
}

export async function setSelectionOnly(sb: SupabaseClient, projectId: string, value: boolean): Promise<Outcome> {
  const { data, error } = await sb.from("projects").update({ selection_only: value }).eq("id", projectId).select("id");
  return outcome(error, data ? data.length : null, "change selection");
}

export async function loadLookDefaults(sb: SupabaseClient, organizationId: string): Promise<{ defaults: Partial<Record<Lighting, string>>; error?: string }> {
  const { data, error } = await sb.from("studio_look_defaults").select("lighting, look").eq("organization_id", organizationId);
  if (error) return { defaults: {}, error: saveMessage(error, "load the look defaults") };
  const defaults: Partial<Record<Lighting, string>> = {};
  for (const row of (data ?? []) as { lighting: string; look: string }[]) {
    if (isLighting(row.lighting)) defaults[row.lighting] = row.look;
  }
  return { defaults };
}

/** Sets the default look for one kind of light. Refuses values the database would refuse too. */
export async function saveLookDefault(sb: SupabaseClient, organizationId: string, userId: string, lighting: Lighting, look: string): Promise<Outcome> {
  if (!isLighting(lighting) || !isLookId(look)) return { ok: false, message: "That look can't be saved." };
  const { error } = await sb
    .from("studio_look_defaults")
    .upsert(
      { organization_id: organizationId, lighting, look, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: "organization_id,lighting" },
    );
  return outcome(error, null, "save the look");
}

/** Clears the default for one kind of light. Checks the row is gone, since RLS can filter the delete silently. */
export async function clearLookDefault(sb: SupabaseClient, organizationId: string, lighting: Lighting): Promise<Outcome> {
  if (!isLighting(lighting)) return { ok: false, message: "That light can't be cleared." };
  const { error } = await sb.from("studio_look_defaults").delete().eq("organization_id", organizationId).eq("lighting", lighting);
  if (error) return { ok: false, message: saveMessage(error, "clear the look") };
  const { data } = await sb.from("studio_look_defaults").select("lighting").eq("organization_id", organizationId).eq("lighting", lighting);
  return data && data.length ? { ok: false, message: REFUSED } : { ok: true };
}

export async function loadSheets(sb: SupabaseClient, organizationId: string): Promise<{ sheets: SheetKind[]; error?: string }> {
  const { data, error } = await sb.from("organizations").select("look_sheets").eq("id", organizationId).maybeSingle();
  if (error) return { sheets: [], error: saveMessage(error, "load the look sheets") };
  return { sheets: normalizeSheets(((data as { look_sheets?: unknown[] } | null)?.look_sheets ?? [])) ?? [] };
}

export async function saveSheets(sb: SupabaseClient, organizationId: string, sheets: readonly unknown[]): Promise<Outcome> {
  const clean = normalizeSheets(sheets);
  if (!clean) return { ok: false, message: "That look sheet isn't one Wedding Pola can offer." };
  const { data, error } = await sb.from("organizations").update({ look_sheets: clean }).eq("id", organizationId).select("id");
  return outcome(error, data ? data.length : null, "save the look sheets");
}
