# Launching Pixi

## The name and the promise

**Pixi** — *Free. On-device. No account.*

One line, everywhere: **A retro camera that develops every shot like an instant print. Your photos never leave the phone.**

| Field | Text | Limit |
|---|---|---|
| App name | Pixi: Retro Film Camera | 30 |
| Subtitle (App Store) | Free. On-device. No account. | 30 |
| Short description (Play) | A retro camera that develops every shot. Free, on-device, no account. | 80 |
| Product Hunt tagline | A retro camera that develops every shot, on your phone | 60 |
| Keywords (App Store) | film,camera,retro,disposable,instant,vintage,photobooth,carousel,grain,ccd,digicam,analog | 100 |

### Description

> Pixi turns your phone into a 2003 digicam, a disposable, a camcorder or an instant camera — and every shot develops in your hand, the way a print comes up.
>
> **Shoot.** Real camera and film looks, rendered live on your phone's graphics chip. Swipe to change camera.
> **Develop.** Every photo comes up slowly, then lands in your roll. Turn any shot into a six-second develop clip.
> **Make.** Pour a roll into photobooth strips, Instagram carousels at 1080×1350, contact sheets, 4×6 and 8×10 prints, or an A4 sticker sheet with cut lines.
>
> **Free. On-device. No account.** Pixi has no server, no sign-in, no ads and no analytics. Nothing you shoot is uploaded. Back up your roll as a zip whenever you like.

## Screenshots: one story in three frames

`node scripts/launch-kit.mjs path/to/your/photos` writes them to `docs/launch/`.

1. **Shoot like it's 2003.** — the camera, nothing but the viewfinder, the look and the shutter.
2. **Every shot develops.** — the print coming up after the shutter.
3. **Pour it into a carousel.** — Build, already filled with the roll.

Sizes: 1290×2796 (App Store, iPhone 6.9"; Apple scales it down for smaller phones) and 1080×1920 (Play). **Run it with your own photos before you submit.** The built-in stand-in scenes are drawings; they show the layout, not the product.

## The 15-second film

`docs/launch/promo-1080x1920.mp4` — promise → shutter → develop → carousel → end card. Use it on Product Hunt, as the Play listing's promo video (upload to YouTube), and on Instagram/TikTok. It is made with the app's own look engine and layout engine but it is an animation, not a screen recording.

### The App Store app preview has to be a real recording

Apple only accepts app previews that are screen captures of the app itself. Record it on the phone:

1. Settings → Pixi → turn **Frame meter** off; pick a look you love (Honey Hour or Super 8 Summer read well).
2. Start the phone's screen recorder. Point at something with light in it.
3. **0–3 s:** hold on the viewfinder, swipe once to change look. **3–4 s:** press the shutter.
4. **4–8 s:** let the print develop and land in the corner. Don't touch anything.
5. **8–13 s:** tap Build (it opens already filled), swipe through two carousel pages.
6. **13–15 s:** tap Save. Stop recording.
7. Trim to 15–30 s. Upload at the device's native resolution (for a 6.9" iPhone, 886×1920 portrait).

Pixi has no iOS build yet (Capacitor's iOS target needs a Mac with Xcode). The App Store parts of this page are ready for when it does.

## Before you press launch

- [ ] Real-phone checks in `docs/PERFORMANCE.md` pass.
- [ ] Gallery save, share sheet and photo import tested on at least two Android phones (one Samsung).
- [ ] Release-signed build: follow `docs/RELEASE.md`.
- [ ] Screenshots and film re-made with your own photos.
- [ ] Privacy policy live: the page is built (`/privacy/`); it goes live with the web deploy.
