/**
 * Checks for the look settings Wedding Pola writes. These mirror the database rules
 * (studio_look_defaults, organizations.look_sheets), so a bad value is caught before it is sent.
 * Pure and dependency-free: the unit tests import this file directly.
 */

export const LIGHTINGS = ["daylight", "golden", "indoor", "stage", "night"] as const;
export type Lighting = (typeof LIGHTINGS)[number];

export const LIGHTING_LABELS: Record<Lighting, string> = {
  daylight: "Daylight",
  golden: "Golden hour",
  indoor: "Indoor",
  stage: "Stage",
  night: "Night",
};

export const LOOK_ID_MAX = 40;
const LOOK_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const SHEET_KINDS = ["grid", "before-after"] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];

export function isLighting(value: unknown): value is Lighting {
  return typeof value === "string" && (LIGHTINGS as readonly string[]).includes(value);
}

export function isLookId(value: unknown): value is string {
  return typeof value === "string" && value.length <= LOOK_ID_MAX && LOOK_ID.test(value);
}

/**
 * The look sheets a studio offers, in the order they are listed. Returns null when any value is
 * not a known sheet. Duplicates are dropped; an empty list is allowed (it turns sheets off).
 */
export function normalizeSheets(values: readonly unknown[]): SheetKind[] | null {
  if (!values.every((v) => typeof v === "string" && (SHEET_KINDS as readonly string[]).includes(v))) return null;
  return SHEET_KINDS.filter((kind) => values.includes(kind));
}
