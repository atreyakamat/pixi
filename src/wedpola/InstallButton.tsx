"use client";
import { useInstall } from "./install";

/** "Install Wedding Pola" where the browser offers it, and a Share-menu hint on iPhone. Renders nothing otherwise. */
export function InstallButton({ className = "" }: { className?: string }) {
  const { canInstall, iosHint, install } = useInstall();
  if (canInstall) {
    return (
      <button type="button" onClick={() => void install()} className={`min-h-11 rounded-full bg-white/[0.16] px-5 text-sm font-semibold ${className}`}>
        Install Wedding Pola
      </button>
    );
  }
  if (iosHint) {
    return <p className={`text-sm leading-relaxed text-white/50 ${className}`}>To install, tap the Share button in Safari, then Add to Home Screen.</p>;
  }
  return null;
}
