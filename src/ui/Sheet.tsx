"use client";
import { AnimatePresence, motion } from "framer-motion";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" className="fixed inset-0 z-50 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div key="sh" role="dialog" aria-label={title} className="fixed inset-x-0 bottom-0 z-[51] mx-auto flex max-h-[78dvh] max-w-md flex-col rounded-t-3xl bg-neutral-950 ring-1 ring-white/10 safe-b"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); }}>
            <div className="flex flex-col items-center pt-2.5"><span className="h-1 w-10 rounded-full bg-white/20" /><h2 className="pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">{title}</h2></div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
