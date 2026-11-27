import PixiApp from "@/shell/PixiApp";
import { Landing } from "@/landing/Landing";
import { WedPolaRoot } from "@/wedpola/WedPolaRoot";

/**
 * One codebase, several front doors. The Android build (PIXI_TARGET=app) opens straight into the
 * camera. The Wedding Pola build (PIXI_TARGET=wedpola) opens at sign-in, then the camera. Everywhere
 * else the root is the landing page and the app lives at /app/.
 * The choice is made at build time, so each build ships only the door it uses.
 */
export default function Root() {
  if (process.env.PIXI_TARGET === "wedpola") return <WedPolaRoot />;
  return process.env.PIXI_TARGET === "app" ? <PixiApp /> : <Landing />;
}
