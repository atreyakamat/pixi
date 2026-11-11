# Pixi architecture

Short records of the decisions that shape the app, and why. Add a new entry when a decision changes; don't rewrite old ones.

## The shape

```
src/
  engine/      WebGL2 look renderer. No React, no DOM beyond a canvas.
  presets/     The 84 looks, as data.
  ui/          Screens, components and on-device services (roll, backup, profile, layouts, feel, perf).
  shell/       PixiApp: the app itself. Owns camera state and wires the screens together.
  landing/     The marketing page, the live demo, and the shared-profile page.
  app/         Routes only. Each file is a few lines that pick what to show.
android/       Capacitor wrapper around the static export.
scripts/       Headless-Chrome tests and the launch kit.
```

Rule of thumb: `engine` and `presets` know nothing about React; `ui` knows nothing about routes; `landing` may use `engine` and `ui` but the app never imports from `landing`.

## 1. No server

**Decision.** Pixi has no backend. Photos live in IndexedDB, settings and looks in localStorage, and a content-security policy forbids network requests.

**Why.** It is the product's promise ("Free. On-device. No account."), it costs nothing to run, and there is nothing to breach. `docs/SECURITY-AUDIT.md` depends on it.

**Cost.** No sync between devices, no public feed, no usernames that are guaranteed unique. The zip backup covers moving phones.

## 2. Profiles travel in the link

**Decision.** A profile is stored on the phone. To share it, the public part (name, handle, bio, up to three looks) is compressed into a code, `PIXIU1.…`, carried in a link's fragment (`/u/#p=…`) or a QR code. The profile card image carries the photos and avatar.

**Why.** The obvious design, accounts in a database, would break decision 1, need hosting and moderation, and turn a camera into a social network. A fragment is never sent to a web server, so even the host of the landing page cannot see whose profile is opened. This gives sharing without identity infrastructure.

**Cost, stated plainly.** Handles are not unique and nothing stops two people using the same one; a profile link is a snapshot, so it does not update after it is shared; links with custom looks are long (roughly 300 characters per look). The avatar and photos are deliberately left out of the link to keep it short enough for messaging apps.

**Safety.** A profile code is untrusted input. `decodeProfile` caps every string, re-cleans the handle, checks built-in look ids against the real list, and passes custom looks through the same sanitiser as shared looks. Text is only ever rendered as text. `scripts/e2e-profile.mjs` includes a hostile link.

**If this changes.** If accounts are ever wanted, they should be an optional layer on top (for example a Supabase table of `handle → profile code`), never a requirement to use the camera.

## 3. One codebase, three build targets

| `PIXI_TARGET` | Output | `/` shows | Used for |
|---|---|---|---|
| `app` | static export | the camera | the Android wrapper |
| `web` | static export | the landing page | Netlify or any static host |
| unset | dev server | the landing page | `npm run dev` |

In every target the app is also at `/app/`, profiles at `/u/` and the policy at `/privacy/`. The choice is made at build time in `src/app/page.tsx`, so the Android build does not load the landing page and the landing page does not load the camera until someone opens it.

Optional build-time settings: `NEXT_PUBLIC_PIXI_SITE` (the public address, so the Android app can make profile links) and `NEXT_PUBLIC_PIXI_APK` (shows a download button on the landing page).

## 4. The landing page runs the product

**Decision.** The hero is not a video or a screenshot. It is the look engine rendering a drawn scene, with a shutter that develops a print; the layouts further down are drawn by the layout engine.

**Why.** It proves the claim ("rendered on your device") by doing it, it can never drift out of date, and it ships no image assets. It asks for no camera permission, so looking around is free.

**Cost.** It needs WebGL 2. Without it the demo shows a one-line explanation and the rest of the page still works.

## 5. Layouts are data, rendered by one engine

Every output (strip, card, carousel, contact sheet, print, sticker sheet) is a `Layout` object drawn by `renderLayout`. Booth mode, Build, the launch kit and the landing page all use it, so they cannot disagree.

## 6. Feedback first, work second

The shutter shows a copy of the viewfinder in the same frame, then does the full-quality render. Success is silent; only problems speak. Motion uses the shared tokens in `src/ui/motion.ts`, and the system reduce-motion setting is honoured app-wide.

## Known debt

- `src/shell/PixiApp.tsx` is about 1,100 lines and owns too much (camera modes, capture, toasts, navigation). The next refactor should lift capture into a `useCapture` hook and the toast queue into its own module. It is covered by the e2e suites, which makes that refactor safe to do.
- No offline install for the web version yet (no service worker). The Android app is fully offline already.
- Performance has only been measured in software rendering; see `docs/PERFORMANCE.md`.
