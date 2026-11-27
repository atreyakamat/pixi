/**
 * The request shapes for the wed-idea worker API (/api/worker/...). Shared by the studio build
 * (worker token) and Wedding Pola (a signed-in user's access token). Pure functions only, so
 * they can be unit tested without a browser.
 */

export const WORKER_PREFIX = "/api/worker";

/** Where a request goes and who it is sent as. organizationId is needed only for user tokens. */
export type Conn = { site: string; bearer: string };

export function workerUrl(site: string, path: string): string {
  return `${site.replace(/\/+$/, "")}${WORKER_PREFIX}${path}`;
}

export function authHeaders(bearer: string, hasBody: boolean): Record<string, string> {
  return { Authorization: `Bearer ${bearer}`, ...(hasBody ? { "Content-Type": "application/json" } : {}) };
}

/** Body for POST /projects. A user token must also name the studio. */
export function projectCreateBody(name: string, organizationId?: string): { name: string; kind: "other"; organizationId?: string } {
  return { name, kind: "other", ...(organizationId ? { organizationId } : {}) };
}

/** The name a new project gets when a Roll is sent to a new project. */
export function projectNameFor(now: Date): string {
  return `Pixi ${now.toISOString().slice(0, 16).replace("T", " ")}`;
}

export function fileNameFor(itemId: string, ext: string | undefined): string {
  return `pixi-${itemId}.${ext || "jpg"}`;
}
