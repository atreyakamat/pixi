import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { saveToGallery, type SaveResult } from "./native";

export interface RollItem {
  id: string;
  kind: "photo" | "video";
  ext: string;
  blob: Blob;
  /** Small JPEG of the frame, so the grid never has to hold full-size images in memory. */
  thumb?: Blob;
  created: number;
  camera?: string;
  /** True once the file has also been written to the phone's gallery. */
  exported?: boolean;
}

interface Schema extends DBSchema { roll: { key: string; value: RollItem; indexes: { created: number } } }

let dbp: Promise<IDBPDatabase<Schema>> | null = null;
const db = () => (dbp ??= openDB<Schema>("pixi", 1, {
  upgrade(d) { d.createObjectStore("roll", { keyPath: "id" }).createIndex("created", "created"); },
}));

/** Builds a small preview so the Roll grid stays light however many shots are stored. */
export async function makeThumb(blob: Blob, max = 320): Promise<Blob | undefined> {
  let bmp: ImageBitmap | undefined;
  try {
    bmp = await createImageBitmap(blob);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    return await new Promise((res) => c.toBlob((b) => res(b ?? undefined), "image/jpeg", 0.75));
  } catch { return undefined; }
  finally { bmp?.close(); }
}

export async function rollAll(): Promise<RollItem[]> {
  try { return (await (await db()).getAllFromIndex("roll", "created")).reverse(); } catch { return []; }
}

export async function rollGet(id: string): Promise<RollItem | undefined> {
  try { return await (await db()).get("roll", id); } catch { return undefined; }
}

/** Drops the oldest shots once the roll passes the person's limit, so storage cannot grow without end. */
async function trim(limit: number) {
  try {
    const d = await db();
    const keys = await d.getAllKeysFromIndex("roll", "created");
    if (keys.length <= limit) return;
    const tx = d.transaction("roll", "readwrite");
    await Promise.all([...keys.slice(0, keys.length - limit).map((k) => tx.store.delete(k)), tx.done]);
  } catch { /* nothing we can do about a full or blocked store */ }
}

export interface AddResult { stored: boolean; save?: SaveResult }

/**
 * Keeps a shot in Pixi and, when the person has asked for it, writes a copy to the phone gallery.
 * Never throws: a full disk must not lose the photo that is already on screen.
 */
export async function rollAdd(item: RollItem, opts: { autoSave: boolean; limit: number }): Promise<AddResult> {
  const thumb = item.thumb ?? (item.kind === "photo" ? await makeThumb(item.blob) : undefined);
  let save: SaveResult | undefined;
  if (opts.autoSave) {
    save = await saveToGallery(item.blob, `pixi-${item.created}.${item.ext}`, item.kind);
  }
  let stored = false;
  try {
    await (await db()).put("roll", { ...item, thumb, exported: save?.ok === true });
    stored = true;
    void trim(opts.limit);
  } catch { /* quota or private mode */ }
  return { stored, save };
}

export async function markExported(id: string) {
  try {
    const d = await db();
    const cur = await d.get("roll", id);
    if (cur) await d.put("roll", { ...cur, exported: true });
  } catch { /* ignore */ }
}

export async function rollDelete(id: string): Promise<void> {
  try { await (await db()).delete("roll", id); } catch { /* ignore */ }
}

/** Rough number of bytes the roll is holding, for the Settings screen. */
export async function rollSize(): Promise<{ count: number; bytes: number }> {
  try {
    const all = await (await db()).getAll("roll");
    return { count: all.length, bytes: all.reduce((n, i) => n + i.blob.size + (i.thumb?.size ?? 0), 0) };
  } catch { return { count: 0, bytes: 0 }; }
}

export async function rollClear(): Promise<void> {
  try { await (await db()).clear("roll"); } catch { /* ignore */ }
}
