import { makeThumb, rollAll, type RollItem } from "./roll";

/**
 * "Send to studio": uploads the Roll's photos to a wed-idea studio, using the
 * same worker API the PC app uses. Only built into the studio app (see
 * NEXT_PUBLIC_PIXI_STUDIO); the public Pixi never makes this call.
 */

/** The studio website this build may send to. Set at build time; nothing else is allowed. */
export const STUDIO_SITE: string | null = (process.env.NEXT_PUBLIC_STUDIO_SITE ?? "").trim().replace(/\/+$/, "") || null;
export const STUDIO_BUILD = process.env.NEXT_PUBLIC_PIXI_STUDIO === "1" && STUDIO_SITE !== null;

const TOKEN = /cwp_wk_[0-9a-f]{48}/;
const STORAGE_KEY = "pixi:studio-token";

/** The token from the connect line the dashboard shows, or null. */
export function parseStudioToken(text: string): string | null {
  return TOKEN.exec(text ?? "")?.[0] ?? null;
}

export function savedToken(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

const CHANGED = "pixi:studio-token-changed";

export function saveToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage blocked: the token is asked for again next time */ }
  window.dispatchEvent(new Event(CHANGED));
}

/** For useSyncExternalStore: tells React when the saved token changes. */
export function onTokenChange(callback: () => void): () => void {
  window.addEventListener(CHANGED, callback);
  return () => window.removeEventListener(CHANGED, callback);
}

export type SendResult = { ok: true; sent: number; skipped: number; project: string } | { ok: false; reason: string };

async function api<T>(token: string, path: string, body?: unknown, method: "GET" | "POST" = "POST"): Promise<T> {
  const res = await fetch(`${STUDIO_SITE}/api/worker${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `The studio answered ${res.status}.`);
  return data;
}

async function dimensions(blob: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const size = { width: bmp.width, height: bmp.height };
    bmp.close();
    return size;
  } catch { return null; }
}

async function put(url: string, blob: Blob): Promise<void> {
  const res = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
  if (!res.ok) throw new Error("A photo didn't upload. Try again.");
}

/** Sends every photo in the Roll to a new project named for the day. */
export async function sendRoll(token: string, onProgress: (done: number, total: number) => void, items?: RollItem[]): Promise<SendResult> {
  if (!STUDIO_BUILD) return { ok: false, reason: "Sending to a studio isn't set up in this app." };
  const photos = (items ?? (await rollAll())).filter((i) => i.kind === "photo");
  if (!photos.length) return { ok: false, reason: "The Roll has no photos to send." };
  try {
    const name = `Pixi ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const { project } = await api<{ project: { id: string; name: string } }>(token, "/projects", { name, kind: "other" });
    let sent = 0, skipped = 0;
    for (const [i, item] of photos.entries()) {
      const size = await dimensions(item.blob);
      if (!size) { skipped++; onProgress(i + 1, photos.length); continue; }
      const thumb = item.thumb ?? (await makeThumb(item.blob));
      if (!thumb) { skipped++; onProgress(i + 1, photos.length); continue; }
      const links = await api<{ photoId: string; full: string; thumb: string }>(token, `/projects/${project.id}/uploads`, {});
      await put(links.full, item.blob);
      await put(links.thumb, thumb);
      await api(token, `/projects/${project.id}/photos`, {
        photoId: links.photoId,
        fileName: `pixi-${item.id}.${item.ext || "jpg"}`,
        width: size.width,
        height: size.height,
        bytes: item.blob.size,
        takenAt: new Date(item.created).toISOString(),
      });
      sent++;
      onProgress(i + 1, photos.length);
    }
    return { ok: true, sent, skipped, project: project.name };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Sending didn't finish. Try again." };
  }
}
