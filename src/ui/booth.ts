/** Photo-booth composer: 4 captured frames into a strip or a 2x2 grid on a cream card, with a small date footer. */
export type BoothLayout = "strip" | "grid";

export async function composeBooth(frames: ImageBitmap[], layout: BoothLayout, label: string): Promise<Blob> {
  const ar = frames[0].width / frames[0].height;
  const pad = 30, gap = 20, footer = 120;
  const fw = layout === "strip" ? 520 : 440, fh = Math.round(fw / ar);
  const cols = layout === "strip" ? 1 : 2, rows = layout === "strip" ? 4 : 2;
  const W = pad * 2 + cols * fw + (cols - 1) * gap;
  const H = pad + rows * fh + (rows - 1) * gap + footer;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f4efe6"; g.fillRect(0, 0, W, H);
  frames.slice(0, cols * rows).forEach((f, i) => {
    const x = pad + (i % cols) * (fw + gap), y = pad + Math.floor(i / cols) * (fh + gap);
    g.save(); g.beginPath(); g.roundRect(x, y, fw, fh, 6); g.clip(); g.drawImage(f, x, y, fw, fh); g.restore();
  });
  const d = new Date();
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  g.fillStyle = "#1a1a1a"; g.textAlign = "center";
  g.font = "700 34px ui-monospace, Menlo, monospace"; g.fillText("P I X I", W / 2, H - 62);
  g.font = "400 20px ui-monospace, Menlo, monospace"; g.fillStyle = "#555"; g.fillText(`${date}  ·  ${label}`, W / 2, H - 28);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Strip failed"))), "image/jpeg", 0.92));
}
