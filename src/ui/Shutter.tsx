"use client";
import { motion } from "framer-motion";

export function Shutter({ video, recording, countdown, disabled, onPress }: { video: boolean; recording: boolean; countdown: number; disabled?: boolean; onPress: () => void }) {
  return (
    <motion.button aria-label={video ? (recording ? "Stop recording" : "Start recording") : "Take photo"} disabled={disabled} onClick={onPress}
      whileTap={{ scale: 0.93 }} transition={{ type: "spring", stiffness: 600, damping: 28 }}
      className="relative flex h-[88px] w-[88px] items-center justify-center rounded-full p-[5px] shadow-[0_6px_24px_rgba(0,0,0,.6)] disabled:opacity-50"
      style={{ background: "conic-gradient(from 210deg, #f2f2f4, #8c8c94, #e8e8ec, #6d6d75, #f2f2f4)" }}>
      <span className="flex h-full w-full items-center justify-center rounded-full bg-[#101013] p-[5px]">
        <motion.span className="flex items-center justify-center overflow-hidden" initial={false}
          animate={video
            ? { width: recording ? 30 : 58, height: recording ? 30 : 58, borderRadius: recording ? 8 : 29, backgroundColor: "#ef4444" }
            : { width: 62, height: 62, borderRadius: 31, backgroundColor: "#ff7a1a" }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          style={{ boxShadow: "inset 0 3px 6px rgba(255,255,255,.35), inset 0 -4px 8px rgba(0,0,0,.35)" }}>
          {countdown > 0 && <span className="text-xl font-semibold text-white">✕</span>}
        </motion.span>
      </span>
    </motion.button>
  );
}
