"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

/** The install prompt Chrome and Edge offer. Not in the TypeScript DOM types. */
type BeforeInstallPrompt = Event & { prompt: () => Promise<{ outcome: "accepted" | "dismissed" }> };

const noop = () => () => undefined;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const never = () => false;

/**
 * Install support for the Wedding Pola page. Chrome and Edge give a prompt to call; iPhone Safari
 * has no prompt, so it gets a sentence about the Share menu instead. Nothing is shown when the app
 * already runs from the home screen.
 */
export function useInstall(): { canInstall: boolean; iosHint: boolean; install: () => Promise<void> } {
  const [prompt, setPrompt] = useState<BeforeInstallPrompt | null>(null);
  const standalone = useSyncExternalStore(noop, isStandalone, never);
  const iphone = useSyncExternalStore(noop, isIphone, never);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPrompt); };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    setPrompt(null);
    await prompt.prompt().catch(() => undefined);
  };
  return { canInstall: prompt !== null && !standalone, iosHint: iphone && !standalone, install };
}
