import type { Metadata } from "next";
import "./globals.css";
import { MotionConfig } from "framer-motion";
import { Offline } from "@/ui/Offline";

export const metadata: Metadata = {
  title: "Pixi",
  description: "Retro camera looks, free and on-device.",
  manifest: "/manifest.webmanifest",
};

/**
 * Pixi runs from local files and talks to no server. The policy says so: nothing loads from the
 * network, no frames, no plugins. Next's static export inlines its bootstrap scripts, so inline
 * script and style stay allowed; blob and data URLs carry photos and QR codes.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Every framer-motion animation in the app honours the system reduce-motion setting. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <Offline />
      </body>
    </html>
  );
}
