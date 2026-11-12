"use client";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { PixiMark } from "@/ui/Logo";
import { I, type IconName } from "@/ui/icons";
import { reveal } from "@/ui/motion";
import { LiveDemo } from "./LiveDemo";
import { Showcase } from "./Showcase";

const APK = process.env.NEXT_PUBLIC_PIXI_APK;
const REPO = "https://github.com/atreyakamat/pixi";

const rise = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: reveal } as const;

const STEPS: { n: string; title: string; body: string }[] = [
  { n: "01", title: "Shoot", body: "Eighty-four cameras in one: digicams, disposables, camcorders, flip phones, instant film. The look is live in the viewfinder, so what you see is what you keep." },
  { n: "02", title: "Develop", body: "Press the shutter and a print slides out and comes up slowly, the way instant film does. It is the best three seconds in the app." },
  { n: "03", title: "Make", body: "Pour a roll into photobooth strips, carousels sized for your feed, contact sheets, 4×6 prints or a sticker sheet with cut lines." },
];

const FACTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "lock", title: "No account", body: "Nothing to sign up for. Open it and shoot." },
  { icon: "camera", title: "On your device", body: "Every look is rendered by your phone's graphics chip. Photos are stored in the app, on the phone." },
  { icon: "close", title: "No uploads, no ads, no tracking", body: "Pixi has no server to send anything to. The app makes no network requests." },
  { icon: "save", title: "Your backup, your call", body: "Export the whole roll as a zip whenever you like, and restore it on a new phone." },
];

export function Landing() {
  const { scrollY } = useScroll();
  const glow = useTransform(scrollY, [0, 600], [1, 0.25]);
  const lift = useTransform(scrollY, [0, 600], [0, -40]);

  return (
    <div className="relative min-h-dvh select-text overflow-x-hidden bg-[#0b0a09] text-white" style={{ userSelect: "text" }}>
      <motion.div aria-hidden style={{ opacity: glow }} className="pointer-events-none absolute inset-x-0 top-0 h-[60rem] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,194,71,.16),transparent_70%)]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" prefetch={false} className="flex items-center gap-2.5" aria-label="Pixi home"><PixiMark size={34} /><span className="text-[1.25rem] font-bold tracking-[-0.02em]">Pixi</span></Link>
        <nav className="flex items-center gap-5 text-[0.9375rem]">
          <a href="#privacy" className="hidden text-white/60 hover:text-white sm:block">Privacy</a>
          <a href="/app/" className="rounded-full bg-white px-4 py-2 font-semibold text-black">Open Pixi</a>
        </nav>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-10 md:grid-cols-[1.05fr_.95fr] md:pt-20">
          <motion.div style={{ y: lift }}>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={reveal} className="lcd text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">A retro camera for your phone</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...reveal, delay: 0.06 }} className="mt-4 text-[clamp(2.5rem,6.4vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.035em]">
              <span className="whitespace-nowrap">Free. On-device.</span><br /><span className="whitespace-nowrap">No account.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...reveal, delay: 0.14 }} className="mt-6 max-w-[30rem] text-[1.1875rem] leading-[1.45] text-white/65">
              Pixi turns your phone into a 2003 digicam and develops every shot like an instant print. Your photos never leave the phone.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...reveal, delay: 0.22 }} className="mt-9 flex flex-wrap items-center gap-3">
              <a href="/app/" className="rounded-full bg-white px-7 py-4 text-[1.0625rem] font-semibold text-black transition-transform active:scale-95">Open the camera</a>
              {APK ? <a href={APK} className="rounded-full bg-white/10 px-7 py-4 text-[1.0625rem] font-semibold transition-transform active:scale-95">Get the Android app</a> : null}
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 text-[0.8125rem] text-white/40">Works in your browser, no install, and offline after your first visit. {APK ? "" : "The Android app is on the way."}</motion.p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...reveal, delay: 0.18 }}><LiveDemo /></motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <motion.h2 {...rise} className="max-w-[22ch] text-[clamp(1.9rem,4.4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">Three steps. Nothing in the way.</motion.h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} {...rise} transition={{ ...reveal, delay: i * 0.08 }} className="rounded-[1.75rem] bg-white/[0.05] p-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)]">
                <div className="lcd text-[0.75rem] font-semibold text-[var(--accent)]">{s.n}</div>
                <h3 className="mt-3 text-[1.5rem] font-bold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-2.5 text-[1rem] leading-[1.5] text-white/60">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-14 md:grid-cols-2">
            <div>
              <motion.h2 {...rise} className="text-[clamp(1.9rem,4.4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">One roll.<br />Every format.</motion.h2>
              <motion.p {...rise} className="mt-5 max-w-[30rem] text-[1.0625rem] leading-[1.5] text-white/60">Pick the photos, pick a frame, save. Twenty layouts, from a booth strip to an A4 sticker sheet at print resolution, all made on your phone.</motion.p>
            </div>
            <Showcase />
          </div>
        </section>

        <section id="privacy" className="mx-auto max-w-6xl scroll-mt-10 px-6 py-20">
          <motion.h2 {...rise} className="max-w-[20ch] text-[clamp(1.9rem,4.4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">Private because there is nothing to leak.</motion.h2>
          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {FACTS.map((f, i) => (
              <motion.div key={f.title} {...rise} transition={{ ...reveal, delay: i * 0.06 }} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-black"><I n={f.icon} className="h-5 w-5" w={2} /></span>
                <div>
                  <h3 className="text-[1.125rem] font-semibold">{f.title}</h3>
                  <p className="mt-1 text-[1rem] leading-[1.5] text-white/60">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.p {...rise} className="mt-10 text-[0.9375rem] text-white/45">Read the <a className="underline underline-offset-4 hover:text-white" href="/privacy/">privacy policy</a>. It is short. The code is <a className="underline underline-offset-4 hover:text-white" href={REPO}>open on GitHub</a>.</motion.p>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <motion.div {...rise} className="rounded-[2rem] bg-[#F6F1E7] px-7 py-12 text-[#211C17] md:px-14 md:py-16">
            <div className="lcd text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[#C8791B]">Profiles without accounts</div>
            <h2 className="mt-3 max-w-[18ch] text-[clamp(1.8rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em]">Share your looks, not your data.</h2>
            <p className="mt-4 max-w-[36rem] text-[1.0625rem] leading-[1.5] text-[#211C17]/70">Make a profile card with your name, your best shots and the looks you shoot with. Share it as an image, a link or a QR code. Anyone who opens it can add your looks to their own Pixi. The profile lives on your phone; the link carries it, no server involved.</p>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-28 pt-10 text-center">
          <motion.div {...rise} className="flex flex-col items-center">
            <PixiMark size={72} />
            <h2 className="mt-7 text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.03em]">Take your first photo.</h2>
            <a href="/app/" className="mt-8 rounded-full bg-white px-8 py-4 text-[1.0625rem] font-semibold text-black transition-transform active:scale-95">Open the camera</a>
          </motion.div>
        </section>
      </main>

      <footer className="relative border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-[0.8125rem] text-white/45">
          <span>Pixi. Free. On-device. No account.</span>
          <span className="flex gap-6"><a className="hover:text-white" href="/privacy/">Privacy</a><a className="hover:text-white" href={REPO}>GitHub</a><a className="hover:text-white" href="/app/">Open Pixi</a></span>
        </div>
      </footer>
    </div>
  );
}
