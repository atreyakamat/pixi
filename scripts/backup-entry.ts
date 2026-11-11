import { backupRoll, restoreRoll } from "../src/ui/backup";
import { rollAdd, rollAll, rollClear } from "../src/ui/roll";
import { sampleScene } from "../src/ui/sampleScene";
(async () => {
  const w = window as unknown as { __done?: unknown; __err?: string };
  try {
    await rollClear();
    const blob: Blob = await new Promise((r) => sampleScene(600, 800).toBlob((b) => r(b!), "image/jpeg", 0.9));
    for (let i = 0; i < 3; i++) await rollAdd({ id: `t${i}`, kind: "photo", ext: "jpg", blob, created: 1000 + i, camera: "Test" }, { autoSave: false, limit: 500 });
    const zip = await backupRoll();
    await rollClear();
    const empty = (await rollAll()).length;
    const r = await restoreRoll(zip);
    const back = await rollAll();
    // A zip with a renamed non-image must be refused, and junk must not parse.
    const junk = await restoreRoll(new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])]));
    w.__done = { zipBytes: zip.size, empty, restored: r, count: back.length, sameBytes: back[0].blob.size === blob.size, hasThumb: !!back[0].thumb, junkRefused: !!junk.reason };
  } catch (e) { w.__err = String(e); }
})();
