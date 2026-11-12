"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RetroRenderer } from "@/engine/renderer";
import { PRESETS } from "@/presets";
import { press, reveal, smooth, snappy } from "@/ui/motion";
import { beach, cafe, hills, neon } from "./scenes";

/** Looks that show the range: warm, night, instant, tape, toy phone. */
const DEMO_IDS = ["gh-honey-hour", "s8-warm", "ip-soft-glow", "vh-home-video", "mn-night-streak", "lr-vga-02"];
const SCENES = [beach, neon, hills, cafe];

/**
 * Not a video of the app: the app's own look engine, running on this page. Switch looks, press the
 * shutter, watch the print come up. A drawn scene stands in for the camera so nothing asks for
 * permission just to look around.
 */
export function LiveDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const looks = useMemo(() => DEMO_IDS.map((id) => PRESETS.find((p) => p.id === id)).filter((p): p is (typeof PRESETS)[number] => !!p), []);
  const [look, setLook] = useState(0);
  const [scene, setScene] = useState(0);
  const [print, setPrint] = useState<{ k: number; src: string } | null>(null);
  const [flash, setFlash] = useState(0);
  const [ok, setOk] = useState(true);
  const state = useRef({ look: 0, scene: 0 });
  useEffect(() => { state.current = { look, scene }; }, [look, scene]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let r: RetroRenderer;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL support is only known once the canvas exists
    try { r = new RetroRenderer(canvas); r.warmUp(); } catch { setOk(false); return; }
    const sources = SCENES.map((f) => f(900, 1200));
    let raf = 0, last = 0, visible = true, shown = -1;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    if (boxRef.current) io.observe(boxRef.current);
    const t0 = performance.now();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      // The scene is a still, so a few frames a second is enough to keep the grain alive.
      if (!visible || document.hidden || t - last < (still ? 1000 : 90)) return;
      last = t;
      const s = state.current;
      if (shown !== s.scene) { r.setSource(sources[s.scene], 900, 1200); shown = s.scene; }
      try { r.render({ preset: { ...looks[s.look], overlays: looks[s.look].overlays ?? [] }, intensity: 1, mirror: false, lcd: "off", maxSide: 900, aspect: 3 / 4, date: new Date() }, (t - t0) / 1000); }
      catch { setOk(false); cancelAnimationFrame(raf); }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [looks, still]);

  const shoot = () => {
    const c = canvasRef.current; if (!c || !c.width) return;
    try { navigator.vibrate?.([14, 50, 6]); } catch { /* no vibrator */ }
    let src = "";
    try { src = c.toDataURL("image/jpeg", 0.85); } catch { return; }
    setFlash((n) => n + 1);
    setPrint({ k: Date.now(), src });
  };

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-[21rem]">
      <div className="relative rounded-[2.6rem] bg-[#161618] p-2.5 shadow-[0_40px_120px_rgba(0,0,0,.7),inset_0_0_0_1.5px_#2c2c30]">
        <div className="overflow-hidden rounded-[2.1rem] bg-black px-3 pb-4 pt-3">
          <div className="relative overflow-hidden rounded-[1.4rem] bg-[#0c0c0e]" style={{ aspectRatio: "3/4" }}>
            <canvas ref={canvasRef} role="img" aria-label={`A sample scene through the ${looks[look]?.name} look`} className="absolute inset-0 h-full w-full" />
            {!ok && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[0.8125rem] text-white/50">This browser can&rsquo;t run the live preview. The app itself needs WebGL 2.</div>}
            {flash > 0 && <motion.div key={flash} className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} />}
            <AnimatePresence>
                {print && (
                  <motion.div key={print.k} className="absolute bottom-3 left-3 z-10 w-[5.2rem] origin-bottom-left rounded-[5px] bg-[#FBF8F2] p-[5px] pb-[16px] shadow-[0_12px_30px_rgba(0,0,0,.7)]"
                    initial={still ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.7, rotate: -8 }} animate={{ y: 0, opacity: 1, scale: 1, rotate: -4 }} exit={{ opacity: 0, scale: 0.6 }} transition={reveal}>
                    <motion.img src={print.src} alt="The photo you just took, developing" className="block aspect-square w-full rounded-[1px] bg-[#EFEAE0] object-cover"
                      initial={still ? false : { opacity: 0.08, filter: "brightness(2.1) contrast(0.18) saturate(0.05) sepia(0.6)" }}
                      animate={{ opacity: 1, filter: "brightness(1) contrast(1) saturate(1) sepia(0)" }} transition={{ duration: still ? 0 : 2.4, ease: [0.55, 0, 0.25, 1] }} />
                  </motion.div>
                )}
              </AnimatePresence>
            <button onClick={() => setScene((s) => (s + 1) % SCENES.length)} className="absolute right-2.5 top-2.5 rounded-full bg-black/45 px-3 py-1.5 text-[0.6875rem] font-semibold backdrop-blur-md">Change scene</button>
          </div>

          <div className="mt-3 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={look} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }} className="text-[0.9375rem] font-semibold">{looks[look]?.name}</motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }} role="group" aria-label="Looks">
            {looks.map((l, i) => (
              <button key={l.id} onClick={() => setLook(i)} aria-pressed={i === look} className="relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.75rem] font-medium">
                {i === look && <motion.span layoutId="demo-look" className="absolute inset-0 rounded-full bg-white" transition={smooth} />}
                <span className={`relative ${i === look ? "text-black" : "text-white/60"}`}>{l.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between px-5">
            <span className="h-12 w-12" />
            <motion.button onClick={shoot} whileTap={{ scale: 0.9 }} transition={snappy} aria-label="Take a photo in the demo" className="relative flex h-[4.1rem] w-[4.1rem] items-center justify-center rounded-full">
              <span className="absolute inset-0 rounded-full border-[3px] border-white" />
              <span className="h-[3.3rem] w-[3.3rem] rounded-full bg-white" />
            </motion.button>
            <motion.span whileTap={press} className="h-12 w-12" />
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[0.8125rem] text-white/45">This is the real engine, running in your browser. Pick a look and press the shutter.</p>
    </div>
  );
}
