"use client";
import { useEffect } from "react";

/**
 * Registers the offline worker on the hosted web build and on Wedding Pola (each ships its own
 * sw.js). Not in the Android app (its files are
 * already on the phone) and not in development (a cache would hide your edits).
 */
export function Offline() {
  useEffect(() => {
    // The Wedding Pola build has its own worker file at the same address on its own site.
    const target = process.env.NEXT_PUBLIC_PIXI_TARGET;
    if ((target !== "web" && target !== "wedpola") || !("serviceWorker" in navigator)) return;
    let dead = false;
    const report = () => {
      if (dead) return;
      const urls = performance.getEntriesByType("resource").map((r) => r.name).filter((u) => u.startsWith(location.origin));
      navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "pixi-loaded", urls })).catch(() => {});
    };
    // A new build changes this address, which is what makes browsers pick up the new worker.
    navigator.serviceWorker.register(`/sw.js?b=${process.env.NEXT_PUBLIC_PIXI_BUILD ?? "0"}`, { scope: "/" }).then(() => {
      // Once the page has settled, tell the worker which files it really used.
      setTimeout(report, 4000);
    }).catch(() => { /* private mode or blocked: the site still works online */ });
    return () => { dead = true; };
  }, []);
  return null;
}
