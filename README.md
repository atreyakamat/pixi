# Pixi

**Free. On-device. No account. Your photos never leave the phone.**

Pixi is a retro camera that renders every look on your phone's GPU. There is no server, no sign-in, no analytics and no upload. Shoot, pick a look, and pour a roll into photobooth strips, Instagram carousels, contact sheets, 4×6 and 8×10 prints or an A4 sticker sheet — all built on the device from your own photos.

## What it does

- **Looks** — dozens of camera and film looks, a layer-based look builder, your own saved looks, favourites and most-used first.
- **Develop** — each shot comes up like an instant print. Any photo can become a six-second develop clip (MP4) for a story or a launch post.
- **Build** — one roll, sixteen-plus layouts: strips, four-up booth cards, 1080×1350 carousels with a caption per page, a numbered contact sheet, and 300 DPI prints with bleed, cut lines and crop marks.
- **Booth** — pick a frame, a 3-2-1 countdown, four shots land straight in it.
- **Roll** — everything stays in Pixi until you export; a 30-day bin for mistakes; import from the phone; a zip backup you control.
- **Share looks** — a look fits in a QR code. Scan one from another phone; nothing goes through a server.
- **Nearby** — send photos phone to phone over a hotspot with WebRTC. No internet.

## Privacy, concretely

| | |
|---|---|
| Where photos are stored | IndexedDB in the app's own storage, marked persistent |
| Network calls made by the app | none — the content-security policy forbids them |
| Android backup to Google | off (`allowBackup=false`) |
| Permissions | camera, microphone (video), storage on Android 9 and older |
| Accounts, analytics, crash reporting | none |

See `docs/SECURITY-AUDIT.md` for the audit and the decisions behind it.

## Stack

Next.js 16 static export · React 19 · Tailwind 4 · framer-motion · WebGL2 renderer · Capacitor 8 (Android)

## Run it

```sh
npm install
npm run dev            # web, http://localhost:3000
npm run apk            # static export → Capacitor sync → android/app/build/outputs/apk/debug/
```

Tests run against the static export in headless Chrome:

```sh
PIXI_TARGET=app npx next build
python3 -m http.server 3111 -d out &
node scripts/e2e-mvp.mjs && node scripts/e2e-build.mjs && node scripts/e2e-v2.mjs && node scripts/e2e-carousel.mjs
node scripts/layout-sheet.mjs        # every layout on one sheet → /tmp/layouts.jpg
node scripts/clip-check.mjs          # the develop clip encodes
```
