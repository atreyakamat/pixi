# Pixi security audit

Date: 2026-11-11 · Scope: the web app (`src/`), the Android wrapper (`android/`, `capacitor.config.ts`), dependencies and the build. Method: manual code review of every input boundary, `npm audit`, static checks (`tsc`, `eslint`), and e2e runs with the hardened configuration.

Pixi's security model is simple: **there is no server**. The app is static files inside the APK (or a static host on the web), it holds the person's photos in the browser's own storage, and it never makes a network request. Almost every finding below is about keeping that promise true.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Android auto-backup was on, so the roll could be copied to Google Drive | High | Fixed |
| 2 | Files from the phone picker and from Nearby were trusted by name and declared MIME type | Medium | Fixed |
| 3 | No content-security policy; a future dependency or XSS could phone home silently | Medium | Fixed |
| 4 | FileProvider exposed the whole external storage root | Medium | Fixed |
| 5 | Cleartext traffic not explicitly disabled in the WebView | Low | Fixed |
| 6 | Backup zip import is a new untrusted-input surface | — | Built with validation from the start |
| 7 | `npm audit` (production dependencies) | — | 0 vulnerabilities |
| 8 | Secrets in the tree | — | None found |
| 9 | Debug APK only; no release signing or Play config yet | Info | Signing config added (key stays outside the repo, see `docs/RELEASE.md`); R8 shrinking left off on purpose |
| 10 | WebRTC Nearby has no authentication beyond the QR exchange | Info | Accepted, documented |

## Findings

### 1. Android auto-backup (High, fixed)

`android:allowBackup="true"` was the Capacitor default. On a device signed in to Google, Android backs up app data — which for Pixi is the WebView's IndexedDB, i.e. every photo in the roll — to the person's Google account. That contradicts "your photos never leave the phone".

Fix: `android:allowBackup="false"` in `AndroidManifest.xml`. The in-app zip backup (Settings → Keep it safe) is the person's own, explicit copy.

### 2. Imported and received files trusted by name (Medium, fixed)

`importPhotos` took the extension from the file name and the kind from `file.type`, both of which the sender controls. A received Nearby file used the name's extension with no length cap. Nothing dangerous could execute — the bytes only ever reach `createImageBitmap` and a `<img>`/`<video>` — but a wrong extension would propagate into exported file names and the backup manifest, and a non-media file would be stored forever and fail silently in the viewer.

Fix: `src/ui/media.ts` — `acceptMedia()` reads the first 16 bytes and recognises JPEG, PNG, WebP, MP4 and WebM by their magic numbers. Anything else is refused with a toast; the stored blob is retyped from its real header. Used by the phone import, Nearby receive and backup restore.

### 3. No content-security policy (Medium, fixed)

Pixi makes no network requests, but nothing enforced that. A compromised dependency, or an injection through a shared look name, could have fetched or posted data without anyone noticing.

Fix: a CSP `<meta>` in `src/app/layout.tsx`:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' data:;
connect-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none';
base-uri 'self'; form-action 'none'
```

`'unsafe-inline'` for scripts is forced by Next's static export, which inlines its bootstrap (`self.__next_f.push`). It is the policy's weak point and should be revisited if Next adds nonce support to static exports. WebRTC data channels are not governed by `connect-src`; Nearby keeps working. Verified: all five e2e suites pass with the policy in place and no CSP violations in the console.

### 4. FileProvider paths too broad (Medium, fixed)

`file_paths.xml` granted `<external-path path="."/>`: any content URI minted by the app could point anywhere on external storage. Share only ever hands out files from the cache directory.

Fix: `cache-path`, `files-path` and `external-files-path` only.

### 5. Cleartext traffic (Low, fixed)

`allowMixedContent: false` was already set; `android:usesCleartextTraffic="false"` now makes the WebView refuse `http://` outright as well.

### 6. Backup zip restore (new surface, built defensively)

`restoreRoll()` treats everything in the zip as hostile:

- the archive is capped at 2 GB and each entry at 64 MB (`fflate` filter, so oversize entries are never inflated);
- the manifest must say `app: "pixi"`; ids must match `^[A-Za-z0-9_-]{1,64}$`; paths must start with `shots/` and contain no `..`;
- the extension must be in the allow-list **and** the bytes must carry that format's magic number;
- timestamps are clamped; strings are length-capped; at most 5 000 items are read;
- ids already in the roll are left alone, so a restore can never overwrite a newer shot.

Tested in `scripts/backup-check.mjs`: a 3-shot round trip is byte-identical, and random bytes are refused with a reason.

### 7. Dependencies

`npm audit --omit=dev`: 0 vulnerabilities. Production dependency set is small and pinned via `package-lock.json`: Capacitor core + 4 plugins, Next, React, framer-motion, idb, fflate, qrcode, jsqr.

### 8. Secrets

No API keys, tokens or credentials in `src/`, `android/` or the config. `.env*` and `*.pem` are git-ignored. The app has nothing to authenticate to.

### 9. Release build (open)

Only a debug APK exists. Before any public release: a release keystore kept outside the repo, `minifyEnabled` for the Android side, and the Play `dataExtractionRules`. `targetSdk 36` is current.

### 10. Nearby (accepted)

Phone-to-phone transfer uses WebRTC over the local network with no STUN/TURN and no signalling server; the offer and answer travel as QR codes the two people show each other. That exchange is the authentication: whoever can scan the QR is who gets connected. The data channel is DTLS-encrypted by the protocol. Received files pass through `acceptMedia()` (finding 2) and are size-capped at 400 MB.

## Addendum, polish round

- New production dependencies: `@capacitor/haptics` and `@capacitor/text-zoom` (both first-party Capacitor). `npm audit --omit=dev`: still 0. Haptics adds Android's `VIBRATE` permission, a normal (install-time, no prompt) permission.
- The shutter click is synthesised with Web Audio. No audio file is loaded, so the CSP is unchanged.
- The frame meter's numbers stay in memory on the phone; nothing is stored or sent.
- Onboarding no longer asks for the microphone or storage up front. Each is requested the first time it is needed (recording video, saving a photo), which is the least-privilege order.

## Addendum, profiles and landing page

- **New untrusted input: profile codes** (`PIXIU1.…`, from a link fragment, a QR or a paste). `decodeProfile` caps name (40), bio (90), re-cleans the handle to `[a-z0-9._]`, keeps at most three looks, accepts built-in look ids only if they exist, and sends custom looks through `sanitizeLook`. Decompressed size is capped at 32 KB. All of it is rendered as React text, never as HTML. Tested with a hostile link (markup in the name, a script tag as the handle, a 5,000-character bio, an unknown layer kind) in `scripts/e2e-profile.mjs`.
- **Privacy of the link.** The profile is in the URL fragment, which browsers do not send to servers, so the static host's logs never contain it. The avatar and photos are not in the link at all.
- **Handles are not identities.** Nothing verifies a handle, so a profile link proves nothing about who made it. The UI never presents a profile as verified.
- **Landing page.** Same CSP as the app; the e2e test asserts it makes zero requests to any other host. Its only outbound links are to the GitHub repository.
- **`/u/` writes to storage** (adds looks to this browser's Pixi) only when the person presses the button, never on load.

## Input boundaries, reviewed

| Boundary | Validation |
|---|---|
| Shared look code (QR, paste, Nearby) | `store.ts` `sanitize()`: known layer kinds only, every parameter clamped to its declared range, max 24 layers, strings capped |
| Phone photo picker | `acceptMedia()` magic bytes, 24 files per import, 200 MB each |
| Nearby file | size header ≤ 400 MB, byte count must match, `acceptMedia()` |
| Backup zip | finding 6 |
| Captions and field text | rendered to canvas only, never to the DOM as HTML; length caps per field |
| `localStorage` settings | every key type-checked and range-checked on load |

## Not in scope

Hosting configuration for the web build (headers, TLS), and anything after the person shares a file out of the app.
