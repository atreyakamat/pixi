import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Media } from "@capacitor-community/media";

export const isNative = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

function toBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/** Writes the file to app cache and opens the Android share sheet (which includes "Save to Photos/Files"). */
export async function nativeShare(blob: Blob, name: string): Promise<void> {
  const data = await toBase64(blob);
  const f = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
  await Share.share({ files: [f.uri], dialogTitle: "Share or save" });
}

async function pixiAlbum(): Promise<string> {
  const find = async () => (await Media.getAlbums()).albums.find((a) => a.name === "Pixi")?.identifier;
  let id = await find();
  if (!id) { await Media.createAlbum({ name: "Pixi" }); id = await find(); }
  if (!id) throw new Error("Could not create the Pixi album");
  return id;
}

/** Saves into the phone's Gallery (album "Pixi") so it shows up in Photos. Falls back to Documents/Pixi. */
export async function nativeSave(blob: Blob, name: string, kind: "photo" | "video"): Promise<string> {
  const base = name.replace(/\.[^.]+$/, "");
  try {
    const albumIdentifier = await pixiAlbum();
    if (kind === "photo") {
      const data = await toBase64(blob);
      await Media.savePhoto({ path: `data:${blob.type || "image/jpeg"};base64,${data}`, albumIdentifier, fileName: base });
    } else {
      const f = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache });
      await Media.saveVideo({ path: f.uri, albumIdentifier, fileName: base });
    }
    return "Gallery";
  } catch {
    const f = await Filesystem.writeFile({ path: `Pixi/${name}`, data: await toBase64(blob), directory: Directory.Documents, recursive: true });
    return f.uri;
  }
}
