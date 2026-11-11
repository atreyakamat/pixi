import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

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

/** Saves into the phone's Documents/Pixi folder. Returns the saved path. */
export async function nativeSave(blob: Blob, name: string): Promise<string> {
  const data = await toBase64(blob);
  const f = await Filesystem.writeFile({ path: `Pixi/${name}`, data, directory: Directory.Documents, recursive: true });
  return f.uri;
}
