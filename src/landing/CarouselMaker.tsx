"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LAYOUTS, layoutById } from "@/ui/layoutTemplates";
import { isCarousel, layoutSize, layoutToBlob, renderLayout, type Layout } from "@/ui/layouts";
import { acceptMedia } from "@/ui/media";

/**
 * The carousel maker, on the web, so someone can make a post without installing anything.
 *
 * It is the same layout engine the app uses — the frames are data, and this page renders them with
 * the same code — so a carousel made here is identical to one made in Pixi. Photos are read with
 * createImageBitmap and drawn to a canvas in the browser: nothing is uploaded, and there is no
 * server to upload to.
 */

const IG_PER_POST = 20;
const MAX_PHOTOS = 60;

interface Pic { id: string; bmp: ImageBitmap; url: string }

export function CarouselMaker() {
  const [pics, setPics] = useState<Pic[]>([]);
  const [frameId, setFrameId] = useState("ca-instant");
  const [page, setPage] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const frames = useMemo(() => LAYOUTS.filter(isCarousel), []);
  const tpl: Layout = useMemo(() => layoutById(frameId), [frameId]);
  const pages = Math.max(1, pics.length);
  const posts = Math.ceil(pages / IG_PER_POST);

  // Revoke the preview urls when the photos change, or a long session leaks every one of them.
  useEffect(() => () => { pics.forEach((p) => URL.revokeObjectURL(p.url)); }, [pics]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const i = Math.min(page, pages - 1);
    const pic = pics[i];
    renderLayout(c, {
      template: tpl,
      // A panorama frame needs the first photo; every other frame draws the page's own.
      photos: tpl.slots.map((_, n) => {
        const p = tpl.slots[n]?.pan ? pics[0] : pics[i + n] ?? pic;
        return p ? { src: p.bmp, w: p.bmp.width, h: p.bmp.height } : null;
      }),
      values,
      scale: 1,
      placeholder: true,
      slide: { index: i + 1, total: pages },
    });
  }, [tpl, pics, page, pages, values]);

  useEffect(() => { draw(); }, [draw]);

  const add = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, MAX_PHOTOS);
    if (!list.length) return;
    setBusy(`Reading ${list.length} ${list.length === 1 ? "photo" : "photos"}…`);
    const next: Pic[] = [];
    let skipped = 0;
    for (const f of list) {
      // The same byte check the app uses: a renamed file is refused rather than half-drawn.
      const m = await acceptMedia(f);
      if (!m || m.kind !== "photo") { skipped++; continue; }
      try {
        const bmp = await createImageBitmap(m.blob);
        next.push({ id: `${f.name}-${f.size}-${next.length}`, bmp, url: URL.createObjectURL(m.blob) });
      } catch { skipped++; }
    }
    setPics((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    setBusy("");
    setNote(next.length
      ? `${next.length} added${skipped ? `, ${skipped} couldn't be read` : ""}`
      : "None of those could be read. JPEG, PNG and WebP work.");
  };

  const exportAll = async () => {
    if (!pics.length) return;
    setBusy("Making your pages…");
    const made: Blob[] = [];
    try {
      for (let i = 0; i < pages; i++) {
        const c = document.createElement("canvas");
        renderLayout(c, {
          template: tpl,
          photos: tpl.slots.map((_, n) => {
            const p = tpl.slots[n]?.pan ? pics[0] : pics[i + n] ?? pics[i];
            return p ? { src: p.bmp, w: p.bmp.width, h: p.bmp.height } : null;
          }),
          values,
          scale: 1,
          slide: { index: i + 1, total: pages },
        });
        made.push(await layoutToBlob(c, "image/jpeg", 0.94));
        setBusy(`Making your pages… ${i + 1} of ${pages}`);
      }
      // One download per page, numbered, so they stay in order in the phone's picker.
      for (let i = 0; i < made.length; i++) {
        const url = URL.createObjectURL(made[i]);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pixi-${String(i + 1).padStart(2, "0")}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        await new Promise((r) => setTimeout(r, 120)); // browsers drop a burst of downloads
      }
      setNote(`${made.length} ${made.length === 1 ? "page" : "pages"} downloaded${posts > 1 ? ` — that is ${posts} Instagram posts` : ""}`);
    } catch {
      setNote("Something went wrong making those pages. Try fewer photos at once.");
    }
    setBusy("");
  };

  const size = layoutSize(tpl, 1);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 text-white">
      <h1 className="text-[2rem] font-bold tracking-[-0.02em] sm:text-[2.5rem]">Carousel maker</h1>
      <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-white/55">
        Make a swipeable Instagram post from your photos. Thirty frames, no account, and nothing is
        uploaded — your photos are drawn in this browser and never leave your device.
      </p>

      <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="relative overflow-hidden rounded-2xl bg-white/[0.04] p-4">
            <canvas ref={canvasRef} className="mx-auto block h-auto w-full max-w-[420px] rounded-lg"
              style={{ aspectRatio: `${size.w} / ${size.h}` }} aria-label={`Page ${Math.min(page + 1, pages)} of ${pages}`} />
            {busy && (
              <div role="status" className="absolute inset-0 flex items-center justify-center bg-black/55">
                <span className="rounded-full bg-black/80 px-4 py-2 text-[0.8125rem]">{busy}</span>
              </div>
            )}
          </div>

          {pics.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}
                aria-label="Previous page" className="rounded-full bg-white/[0.08] px-4 py-2 text-[0.875rem] disabled:opacity-30">←</button>
              <span className="tabular-nums text-[0.8125rem] text-white/50">{Math.min(page + 1, pages)} / {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
                aria-label="Next page" className="rounded-full bg-white/[0.08] px-4 py-2 text-[0.875rem] disabled:opacity-30">→</button>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white/35">Photos</h2>
            <button onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl bg-white py-3 text-[0.9375rem] font-semibold text-black">
              {pics.length ? "Add more photos" : "Choose photos"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
            {pics.length > 0 && (
              <>
                <p className="mt-2 text-[0.8125rem] text-white/45">
                  {pages} {pages === 1 ? "page" : "pages"}
                  {posts > 1 ? ` · ${posts} Instagram posts of ${IG_PER_POST}` : ""}
                </p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {pics.map((p, i) => (
                    <button key={p.id} onClick={() => setPage(i)} aria-label={`Page ${i + 1}`}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ${i === page ? "ring-2 ring-white" : "opacity-70"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- a blob url, which next/image cannot take */}
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <button onClick={() => { setPics([]); setPage(0); setNote(""); }}
                  className="mt-2 text-[0.8125rem] text-white/45 underline-offset-4 hover:underline">Clear all</button>
              </>
            )}
          </div>

          <div>
            <h2 className="pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white/35">Frame</h2>
            <select value={frameId} onChange={(e) => { setFrameId(e.target.value); setValues({}); }} aria-label="Frame"
              className="w-full rounded-xl bg-white/[0.07] px-3 py-2.5 text-[0.9375rem] outline-none">
              {frames.map((t) => <option key={t.id} value={t.id} className="bg-[#17171a]">{t.name}</option>)}
            </select>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-white/45">{tpl.blurb}</p>
          </div>

          {(tpl.fields ?? []).length > 0 && (
            <div>
              <h2 className="pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white/35">Text</h2>
              <div className="space-y-2.5">
                {(tpl.fields ?? []).map((fd) => (
                  <label key={fd.key} className="block">
                    <span className="mb-1 block text-[0.75rem] text-white/45">{fd.label}</span>
                    <input value={values[fd.key] ?? fd.def} maxLength={fd.max}
                      onChange={(e) => setValues((v) => ({ ...v, [fd.key]: e.target.value }))}
                      className="w-full rounded-xl bg-white/[0.07] px-3 py-2.5 text-[0.9375rem] outline-none" />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <button onClick={() => void exportAll()} disabled={!pics.length || !!busy}
              className="w-full rounded-2xl bg-[var(--accent)] py-3.5 text-[0.9375rem] font-semibold text-black disabled:opacity-35">
              {pics.length ? `Download ${pages} ${pages === 1 ? "page" : "pages"}` : "Add photos to start"}
            </button>
            {note && <p aria-live="polite" className="mt-2 text-[0.8125rem] text-white/55">{note}</p>}
            <p className="mt-3 text-[0.75rem] leading-relaxed text-white/35">
              Pages download one by one, numbered in order. Upload them to Instagram in that order and
              the carousel reads the way you built it.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
