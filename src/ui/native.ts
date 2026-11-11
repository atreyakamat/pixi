import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";

export const isNative = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

/** Where a file ended up, or why it didn't. Callers must handle `ok: false` — saving is never assumed. */
export type SaveResult =
  | { ok: true; where: "gallery" | "files" | "download" }
  | { ok: false; reason: string };

const ALBUM = "Pixi";

export function toBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(r.error ?? new Error("Could not read the file"));
    r.readAsDataURL(blob);
  });
}

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, "_").slice(0, 60);

/** Opens the system share sheet, which on every platform also offers "Save to Photos" or "Save to Files". */
export async function nativeShare(blob: Blob, name: string): Promise<void> {
  const data = await toBase64(blob);
  const f = await Filesystem.writeFile({ path: safeName(name), data, directory: Directory.Cache });
  await Share.share({ files: [f.uri], dialogTitle: "Share or save" });
}

/**
 * The album identifier Android needs. Asking for the albums root and appending our name avoids
 * getAlbums(), which needs media-read permission the app does not otherwise require.
 */
async function albumId(): Promise<string | undefined> {
  try {
    const { albums } = await Media.getAlbums();
    const hit = albums.find((a) => a.name === ALBUM);
    if (hit) return hit.identifier;
  } catch { /* listing needs a permission we would rather not ask for */ }
  try { await Media.createAlbum({ name: ALBUM }); } catch { /* already there, or not supported */ }
  try {
    const { albums } = await Media.getAlbums();
    const hit = albums.find((a) => a.name === ALBUM);
    if (hit) return hit.identifier;
  } catch { /* fall through */ }
  if (Capacitor.getPlatform() === "android") {
    try { const { path } = await Media.getAlbumsPath(); if (path) return `${path}/${ALBUM}`; } catch { /* no path */ }
  }
  return undefined;
}

/**
 * Android 9 and older need a storage permission before anything can be written to the public
 * library. Android 10 and newer grant writes to an app's own media for free, so nothing is asked.
 */
export async function ensureSavePermission(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const cur = await Filesystem.checkPermissions();
    if (cur.publicStorage === "granted") return true;
    const asked = await Filesystem.requestPermissions();
    return asked.publicStorage === "granted";
  } catch { return true; } // platforms that do not gate this at all
}

/** Saves into the phone's photo library. Returns why it failed instead of throwing. */
export async function saveToGallery(blob: Blob, name: string, kind: "photo" | "video"): Promise<SaveResult> {
  if (!isNative()) return downloadInBrowser(blob, name);
  await ensureSavePermission();
  const base = safeName(name).replace(/\.[^.]+$/, "");
  const id = await albumId();
  try {
    if (kind === "photo") {
      const data = await toBase64(blob);
      await Media.savePhoto({ path: `data:${blob.type || "image/jpeg"};base64,${data}`, albumIdentifier: id, fileName: base });
    } else {
      const tmp = await Filesystem.writeFile({ path: safeName(name), data: await toBase64(blob), directory: Directory.Cache });
      await Media.saveVideo({ path: tmp.uri, albumIdentifier: id, fileName: base });
    }
    return { ok: true, where: "gallery" };
  } catch (e) {
    // Scoped storage blocks some devices from the public library. Documents still works there.
    try {
      await Filesystem.writeFile({ path: `${ALBUM}/${safeName(name)}`, data: await toBase64(blob), directory: Directory.Documents, recursive: true });
      return { ok: true, where: "files" };
    } catch {
      return { ok: false, reason: e instanceof Error && e.message ? e.message : "Your phone would not let Pixi write to the gallery." };
    }
  }
}

/** Browser fallback: hand the file to the browser's own download. */
export function downloadInBrowser(blob: Blob, name: string): SaveResult {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = safeName(name); a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { ok: true, where: "download" };
  } catch {
    return { ok: false, reason: "This browser blocked the download. Use Share instead." };
  }
}

/** Share where the platform supports it, otherwise fall back to saving. */
export async function shareOrSave(blob: Blob, name: string): Promise<SaveResult> {
  if (isNative()) {
    try { await nativeShare(blob, name); return { ok: true, where: "gallery" }; }
    catch { return saveToGallery(blob, name, blob.type.startsWith("video") ? "video" : "photo"); }
  }
  const file = new File([blob], safeName(name), { type: blob.type || "image/jpeg" });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return { ok: true, where: "gallery" }; }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { ok: true, where: "gallery" };
  }
  return downloadInBrowser(blob, name);
}

export function saveMessage(r: SaveResult): string {
  if (!r.ok) return r.reason;
  return r.where === "gallery" ? "Saved to your gallery" : r.where === "files" ? "Saved to Documents/Pixi" : "Downloaded";
}
