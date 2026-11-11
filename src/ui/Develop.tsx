"use client";
import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { smooth, tap } from "./motion";

/** How long the picture takes to come up. Long enough to watch, short enough not to be in the way. */
const DEVELOP_MS = 2500;
const HOLD_MS = 420;

/**
 * The shot comes out blank and fills in, the way an instant print does. It sits above the roll
 * button, never takes a tap, and tucks itself away when it is done — the camera stays live
 * throughout, so this is something to enjoy rather than something to wait for.
 */
export function DevelopCard({ src, onDone }: { src: string; onDone: () => void }) {
  const still = useReducedMotion();

  useEffect(() => {
    const ms = still ? 500 : DEVELOP_MS;
    const buzz = setTimeout(() => tap(14), ms);
    const end = setTimeout(onDone, ms + HOLD_MS);
    return () => { clearTimeout(buzz); clearTimeout(end); };
  }, [still, onDone]);

  const film = still
    ? { opacity: 1 }
    : {
      opacity: [0.18, 0.82, 1],
      filter: [
        "brightness(1.95) contrast(0.22) saturate(0.12) sepia(0.5)",
        "brightness(1.22) contrast(0.72) saturate(0.62) sepia(0.18)",
        "brightness(1) contrast(1) saturate(1) sepia(0)",
      ],
    };

  return (
    <motion.div
      aria-hidden data-pixi="develop"
      className="pointer-events-none fixed bottom-[132px] left-5 z-[55] w-[104px] rounded-[7px] bg-[#FBF8F2] p-[7px] pb-[21px] shadow-[0_12px_34px_rgba(0,0,0,.72)]"
      initial={{ y: 54, opacity: 0, scale: 0.84, rotate: -3 }}
      animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
      exit={{ y: 74, x: -8, opacity: 0, scale: 0.42 }}
      transition={smooth}
    >
      <motion.img
        src={src} alt=""
        className="block h-[92px] w-full rounded-[2px] bg-[#EFEAE0] object-cover"
        initial={still ? false : { opacity: 0.18, filter: "brightness(1.95) contrast(0.22) saturate(0.12) sepia(0.5)" }}
        animate={film}
        transition={{ duration: still ? 0 : DEVELOP_MS / 1000, times: [0, 0.45, 1], ease: "easeOut" }}
      />
    </motion.div>
  );
}
