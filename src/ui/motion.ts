/** One motion vocabulary for the whole app, so nothing moves in a way the rest of the app doesn't. */
import type { Transition } from "framer-motion";

/** Controls that answer a finger: fast, barely overshoots. */
export const snappy: Transition = { type: "spring", stiffness: 520, damping: 34, mass: 0.6 };
/** Things that move position or size: settles without wobble. */
export const smooth: Transition = { type: "spring", stiffness: 300, damping: 30 };
/** Sheets and full-screen covers: the slow-in, fast-out curve used on iOS. */
export const sheet: Transition = { duration: 0.44, ease: [0.32, 0.72, 0, 1] };
/** Cross-fades between screens. */
export const fade: Transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] };

export const press = { scale: 0.92 };

/** Short tap feedback. Silent where the device has no vibrator. */
export const tap = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };
