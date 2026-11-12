"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PixiMark } from "./Logo";
import { I } from "./icons";
import { press, reveal, snappy, tap } from "./motion";

type Perm = "idle" | "asking" | "denied";

/**
 * Two screens. The promise, then the camera. Nothing to learn first: the microphone is asked for
 * the first time someone records video, and gallery access the first time a photo is saved.
 */
export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const [perm, setPerm] = useState<Perm>("idle");

  const allow = async () => {
    tap(); setPerm("asking");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach((t) => t.stop());
      onFinish();
    } catch { setPerm("denied"); }
  };

  return (
    <motion.div className="fixed inset-0 z-[90] flex flex-col bg-black safe-t safe-b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-8">
        <AnimatePresence mode="wait" initial={false}>
          {i === 0 ? (
            <motion.div key="promise" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={reveal} className="flex flex-col items-center text-center">
              <PixiMark size={88} />
              <h1 className="t-large mt-10">Free. On-device.<br />No account.</h1>
              <p className="t-body mt-4 max-w-[18rem] text-white/50">A retro camera that develops every shot like an instant print. Your photos never leave the phone.</p>
            </motion.div>
          ) : (
            <motion.div key="camera" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={reveal} className="flex flex-col items-center text-center">
              <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[26px] bg-white/[0.07]"><I n="camera" className="h-11 w-11" w={1.5} /></div>
              <h1 className="t-title1 mt-10">Let&rsquo;s take your first photo</h1>
              <p className="t-body mt-4 max-w-[18rem] text-white/50">
                {perm === "denied"
                  ? "The camera is blocked. Open your phone's Settings, then Apps, Pixi, Permissions, and allow Camera. Then come back and tap Try again."
                  : "Pixi needs the camera for the viewfinder. Nothing it sees is uploaded."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center gap-3 px-6 pb-8">
        {i === 0 ? (
          <motion.button whileTap={press} transition={snappy} onClick={() => { tap(); setI(1); }} className="t-headline w-full max-w-xs rounded-2xl bg-white py-4 text-black">Continue</motion.button>
        ) : (
          <>
            <motion.button whileTap={press} transition={snappy} disabled={perm === "asking"} onClick={allow} className="t-headline w-full max-w-xs rounded-2xl bg-white py-4 text-black disabled:opacity-60">
              {perm === "denied" ? "Try again" : "Allow camera"}
            </motion.button>
            <button onClick={onFinish} className="t-subhead py-2 text-white/45">Not now</button>
          </>
        )}
      </div>
    </motion.div>
  );
}
