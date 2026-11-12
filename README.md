# Pixi

**Free. On-device. No account. Your photos never leave the phone.**

Pixi is a retro camera that renders every look on your phone's GPU. There is no server, no sign-in, no analytics and no upload. Shoot, pick a look, and pour a roll into photobooth strips, Instagram carousels, contact sheets, 4×6 and 8×10 prints or an A4 sticker sheet — all built on the device from your own photos.

## What it does

- **Looks** — dozens of camera and film looks, a layer-based look builder, your own saved looks, favourites and most-used first.
- **Develop** — each shot comes up like an instant print. Any photo can become a six-second develop clip (MP4) for a story or a launch post.
- **Build** — one roll, twenty-four layouts: strips, four-up booth cards, carousels of any length at 1080×1350 in eight styles (Instant, Glass, Noir, Editorial, Photo Dump and more) with a caption per page, a numbered contact sheet, and 300 DPI prints with bleed, cut lines and crop marks.
- **Booth** — pick a frame, a 3-2-1 countdown, four shots land straight in it.
- **Roll** — everything stays in Pixi until you export; a 30-day bin for mistakes; import from the phone; a zip backup you control.
- **Share looks** — a look fits in a QR code. Scan one from another phone; nothing goes through a server.
- **Sign your work** — an optional `@handle` credit in the corner of what Build makes.
- **Offline on the web** — after one visit the hosted app runs with no connection.
- **Profile** — a card with your name, best shots and the looks you shoot with, shared as an image, a link or a QR. No account: the profile rides inside the link.
- **Nearby** — send photos phone to phone over a hotspot with WebRTC. No internet.

## How it feels

- **One path.** Shoot → the print develops in the corner → Build opens already filled with your newest shots → Save. Everything else is one tap away, never in the way.
- **A camera that stays out of the way.** The viewfinder, the look, the shutter. Flash, timer, aspect, grid and lenses live behind the chevron (or pull down on the top bar).
- **The develop is the signature.** A weighted spring, a chemistry-shaped fade, a shutter haptic and a quiet synthesised click; the print shrinks into the last-shot button when it is done.
- **Photos move, they don't cut.** A roll tile grows into the viewer and shrinks back; swipe down to close.
- **Feedback first.** The shutter puts a copy of the viewfinder on screen in the same frame; the full-quality render follows.
- **One type scale, one accent.** Apple's eleven text styles in rem, following the phone's text-size setting (Dynamic Type), on an 8-pt grid.
- **Calm messages.** Success is silent; problems say what happened and what to do, one at a time.
- **Advanced is opt-in.** The layer-by-layer look builder is in Settings → Advanced.

## Privacy, concretely

| | |
|---|---|
| Where photos are stored | IndexedDB in the app's own storage, marked persistent |
| Network calls made by the app | none — the content-security policy forbids them |
| Android backup to Google | off (`allowBackup=false`) |
| Permissions | camera, microphone (video only, asked the first time you record), storage on Android 9 and older, vibrate (haptics) |
| Accounts, analytics, crash reporting | none |

See `docs/SECURITY-AUDIT.md` for the audit and `docs/ARCHITECTURE.md` for the decisions behind the app.

## Stack

Next.js 16 static export · React 19 · Tailwind 4 · framer-motion · WebGL2 renderer · Capacitor 8 (Android)

## Run it

```sh
npm install
npm run dev            # landing page at http://localhost:3000, the app at /app/
npm run apk            # static export → Capacitor sync → android/app/build/outputs/apk/debug/
```

Tests run against the static export in headless Chrome:

```sh
PIXI_TARGET=web npx next build && cp -r out /tmp/out-web     # landing page at /, app at /app/
PIXI_TARGET=app npx next build                               # camera at /
python3 -m http.server 3111 -d out & python3 -m http.server 3112 -d /tmp/out-web &
node scripts/e2e-mvp.mjs && node scripts/e2e-build.mjs && node scripts/e2e-v2.mjs && node scripts/e2e-carousel.mjs
node scripts/e2e-polish.mjs          # onboarding, hidden controls, develop hand-off, smart Build
node scripts/orientation-check.mjs   # every look comes out the right way up
node scripts/backup-check.mjs        # backup round-trip, junk refused
node scripts/layout-sheet.mjs        # every layout on one sheet → /tmp/layouts.jpg
node scripts/clip-check.mjs          # the develop clip encodes
node scripts/e2e-profile.mjs         # profile card, link round trip through /u/, hostile link refused
node scripts/offline-check.mjs        # one visit, server stopped: landing, app, camera still work
node scripts/sign-check.mjs           # the @handle credit: toggle, preview, remembered
node scripts/e2e-unlimited.mjs        # a 45-page carousel: every page right size, none blank, none repeated
node scripts/e2e-landing.mjs         # landing page: live demo renders and reacts, phone and desktop
node scripts/bigtext-check.mjs        # every screen at the largest text size on a small phone
node scripts/privacy-check.mjs        # privacy page reachable, scrolls, returns
node scripts/launch-kit.mjs ~/photos # store screenshots + 15 s promo film → docs/launch/
```

On a phone: Settings → Performance → Frame meter. See `docs/PERFORMANCE.md`, `docs/LAUNCH.md` and `docs/RELEASE.md` (signing and Google Play).
