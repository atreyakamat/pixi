import type { Metadata } from "next";
import { BackLink } from "@/ui/BackLink";

export const metadata: Metadata = { title: "Pixi privacy policy", description: "Pixi collects nothing. Your photos never leave your phone." };

/** The whole policy. It is short because the app has no server, no account and no analytics. */
export default function Privacy() {
  return (
    <main className="mx-auto min-h-dvh max-w-md select-text overflow-y-auto bg-black px-6 pb-16 pt-14 text-white" style={{ userSelect: "text" }}>
      <BackLink className="t-subhead text-[var(--accent)]">‹ Back to Pixi</BackLink>
      <h1 className="t-large mt-6">Privacy</h1>
      <p className="t-body mt-4 text-white/70">Pixi collects nothing. Your photos never leave your phone unless you share them yourself.</p>

      <h2 className="t-title3 mt-10">What Pixi stores</h2>
      <p className="t-body mt-2 text-white/70">Your photos, videos, saved looks and settings are kept in the app&rsquo;s own storage on your device. Deleting the app deletes them. A backup is made only when you ask for one, and it goes where you choose.</p>

      <h2 className="t-title3 mt-8">What Pixi sends</h2>
      <p className="t-body mt-2 text-white/70">Nothing. Pixi has no server, no account, no advertising and no analytics. The app makes no network requests. Nearby sharing sends photos directly between two phones on the same local network, only when both people start it.</p>

      <h2 className="t-title3 mt-8">Permissions</h2>
      <ul className="t-body mt-2 list-disc space-y-1.5 pl-5 text-white/70">
        <li><b className="font-semibold text-white">Camera</b> for the viewfinder.</li>
        <li><b className="font-semibold text-white">Microphone</b> only while you record a video.</li>
        <li><b className="font-semibold text-white">Photos and storage</b> only to save a photo to your gallery when you ask.</li>
        <li><b className="font-semibold text-white">Vibration</b> for tap feedback.</li>
      </ul>

      <h2 className="t-title3 mt-8">Children</h2>
      <p className="t-body mt-2 text-white/70">Pixi collects no personal information from anyone, including children.</p>

      <h2 className="t-title3 mt-8">Contact</h2>
      <p className="t-body mt-2 text-white/70">Questions: open an issue at github.com/atreyakamat/pixi.</p>

      <p className="t-footnote mt-10 text-white/40">Last updated 11 November 2026.</p>
    </main>
  );
}
