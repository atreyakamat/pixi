// After `PIXI_TARGET=wedpola next build`: puts the Wedding Pola worker, manifest and icons (kept in
// wedpola/pwa, outside public/, so the public site never serves them) at the site root, where the
// worker's scope covers the whole app. Then removes the public-site routes this build must not
// serve, and writes the Netlify headers for the Wedding Pola site. Changes only the out/ folder.
import fs from "node:fs";
import path from "node:path";

const out = path.resolve("out");
const pwa = path.resolve("wedpola/pwa");
const files = ["sw.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
for (const f of files) {
  if (!fs.existsSync(path.join(pwa, f))) throw new Error(`Missing wedpola/pwa/${f}.`);
  fs.copyFileSync(path.join(pwa, f), path.join(out, f));
}

// Routes that belong to the public Pixi site. Wedding Pola has its own sign-in in front of the
// camera, so these must not be reachable here.
for (const dir of ["app", "make", "u", "privacy"]) fs.rmSync(path.join(out, dir), { recursive: true, force: true });

// The same headers as netlify.toml for the public site, for the Wedding Pola site. The worker and
// manifest are never cached for long, so an update reaches the phone.
fs.writeFileSync(path.join(out, "_headers"), `/*
  Permissions-Policy: camera=(self), microphone=(self)
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=63072000; includeSubDomains

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Cache-Control: no-cache

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
`);
console.log("Wedding Pola: worker, manifest and icons at the site root; _headers written.");
