import PixiApp from "@/shell/PixiApp";
import { Landing } from "@/landing/Landing";

/**
 * One codebase, two front doors. The Android build (PIXI_TARGET=app) opens straight into the
 * camera. Everywhere else the root is the landing page and the app lives at /app/.
 * The choice is made at build time, so each build ships only the door it uses.
 */
export default function Root() {
  return process.env.PIXI_TARGET === "app" ? <PixiApp /> : <Landing />;
}
