"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PixiMark } from "./Logo";
import { CameraIcon } from "./CameraIcon";
import { CAMERAS } from "./cameras";
import { I, type IconName } from "./icons";
import { ensureSavePermission, isNative } from "./native";

type Perm = "idle" | "ok" | "denied";

async function askStorage(): Promise<Perm> {
  if (!isNative()) return "ok";
  return (await ensureSavePermission()) ? "ok" : "denied";
}

async function ask(kind: "video" | "audio"): Promise<Perm> {
  try {
    const s = await navigator.mediaDevices.getUserMedia(kind === "video" ? { video: true } : { audio: true });
    s.getTracks().forEach((t) => t.stop());
    return "ok";
  } catch { return "denied"; }
}

const slide = { enter: (d: number) => ({ x: d * 40, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d * -40, opacity: 0 }) };

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [cam, setCam] = useState<Perm>("idle");
  const [mic, setMic] = useState<Perm>("idle");
  const [store, setStore] = useState<Perm>("idle");
  const go = (n: number) => { setDir(n > i ? 1 : -1); setI(n); };
  const picks = [CAMERAS[0], CAMERAS[12] ?? CAMERAS[1], CAMERAS[30] ?? CAMERAS[2]];

  const pages = [
    <div key="a" className="flex flex-col items-center text-center">
      <PixiMark size={92} />
      <h2 className="mt-8 text-[30px] font-bold leading-[1.15] tracking-[-0.02em]">Your phone,<br />but a 2003 digicam.</h2>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/45">Real-time CCD, film and camcorder looks with date stamps. Free, and everything stays on your phone.</p>
    </div>,
    <div key="b" className="flex flex-col items-center text-center">
      <div className="flex gap-3">
        {picks.map((c, k) => (
          <motion.div key={c.preset.id} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + k * 0.1, type: "spring", stiffness: 260, damping: 20 }} className="h-24 w-24 rounded-[20px] bg-white/[0.06] p-2.5"><CameraIcon body={c.body} color={c.color} /></motion.div>
        ))}
      </div>
      <h2 className="mt-8 text-[30px] font-bold leading-[1.15] tracking-[-0.02em]">A shelf of cameras.<br />Swipe to switch.</h2>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/45">Digicams, flip phones, camcorders, disposables and a 0.1MP phone cam. Build your own look layer by layer.</p>
    </div>,
    <div key="c" className="flex w-full flex-col items-center text-center">
      <h2 className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em]">A few permissions</h2>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/45">Pixi needs the camera for the live view. The microphone is only used while recording video, and saving puts photos in your own gallery. Nothing is uploaded.</p>
      <div className="mt-6 w-full max-w-xs space-y-3">
        {([
          ["Camera", "camera", cam, async () => setCam(await ask("video")), "Needed for the viewfinder"],
          ["Microphone", "mic", mic, async () => setMic(await ask("audio")), "Only for sound in videos"],
          ["Saving photos", "save", store, async () => setStore(await askStorage()), "Writes to your gallery"],
        ] as [string, IconName, Perm, () => void, string][]).map(([label, icon, st, act, why]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.08]"><I n={icon} /></div>
            <div className="min-w-0 flex-1"><div className="text-[15px] font-medium">{label}</div><div className="text-[12px] leading-snug text-white/45">{st === "denied" ? "Blocked. Turn it on in Settings, Apps, Pixi, Permissions." : why}</div></div>
            {st === "ok" ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#30d158] text-black"><I n="check" className="h-4 w-4" w={2.6} /></span>
              : <motion.button whileTap={{ scale: 0.94 }} onClick={act} className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black">{st === "denied" ? "Retry" : "Allow"}</motion.button>}
          </div>
        ))}
      </div>
    </div>,
  ];

  const last = i === pages.length - 1;
  return (
    <motion.div className="fixed inset-0 z-[90] flex flex-col bg-black safe-t safe-b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex justify-end px-5 pt-4"><button onClick={onFinish} className="text-[15px] font-medium text-white/45">Skip</button></div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <AnimatePresence custom={dir} mode="wait" initial={false}>
          <motion.div key={i} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }} className="flex w-full justify-center">{pages[i]}</motion.div>
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center gap-5 px-6 pb-8">
        <div className="flex gap-2">{pages.map((_, k) => <motion.span key={k} animate={{ width: k === i ? 22 : 7, opacity: k === i ? 1 : 0.35 }} className="h-[7px] rounded-full bg-white" />)}</div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => (last ? onFinish() : go(i + 1))} className="w-full max-w-xs rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-black">{last ? (cam === "ok" ? "Open camera" : "Continue") : "Next"}</motion.button>
      </div>
    </motion.div>
  );
}
