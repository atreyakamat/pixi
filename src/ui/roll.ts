import { openDB, type DBSchema } from "idb";
import { isNative, nativeSave } from "./native";

export interface RollItem { id: string; kind: "photo" | "video"; ext: string; blob: Blob; created: number; camera?: string }
interface Schema extends DBSchema { roll: { key: string; value: RollItem; indexes: { created: number } } }

const db = () => openDB<Schema>("pixi", 1, {
  upgrade(d) { d.createObjectStore("roll", { keyPath: "id" }).createIndex("created", "created"); },
});

export async function rollAll(): Promise<RollItem[]> {
  try { return (await (await db()).getAllFromIndex("roll", "created")).reverse(); } catch { return []; }
}

/** Saves to the in-app roll (IndexedDB) and, in the Android app, also to Documents/Pixi. Never throws. */
export async function rollAdd(item: RollItem): Promise<{ saved: boolean; path?: string }> {
  let saved = false, path: string | undefined;
  try { await (await db()).put("roll", item); saved = true; } catch { /* storage full or blocked */ }
  if (isNative()) {
    try { path = await nativeSave(item.blob, `pixi-${item.created}.${item.ext}`, item.kind); saved = true; } catch { /* permission or disk */ }
  }
  return { saved, path };
}

export async function rollDelete(id: string): Promise<void> {
  try { await (await db()).delete("roll", id); } catch { /* ignore */ }
}
