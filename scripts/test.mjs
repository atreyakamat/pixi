// Runs the unit tests: bundles each *.test.ts with esbuild (already a dev dependency), then runs
// them with Node's built-in test runner. Covers the pure modules only; no browser, no network.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const entries = [
  "src/ui/studioRequests.test.ts",
  ...fs.readdirSync("src/wedpola").filter((f) => f.endsWith(".test.ts")).map((f) => `src/wedpola/${f}`),
];
const outdir = path.resolve("node_modules/.cache/pixi-tests");
fs.rmSync(outdir, { recursive: true, force: true });
await build({ entryPoints: entries, bundle: true, platform: "node", format: "esm", outdir, outbase: "src", logLevel: "warning" });
const files = entries.map((e) => path.join(outdir, path.relative("src", e).replace(/\.ts$/, ".js")));
execFileSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
