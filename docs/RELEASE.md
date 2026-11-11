# Releasing Pixi on Google Play

Everything here runs on your own computer. The signing key never goes into the repo.

## Once: make your signing key

Run this in the `android` folder. Pick one password and use it for both prompts.

```sh
keytool -genkeypair -v -keystore pixi-upload.jks -alias pixi -keyalg RSA -keysize 2048 -validity 10000
```

Then create `android/keystore.properties` (git ignores it):

```
storeFile=../pixi-upload.jks
storePassword=YOUR_PASSWORD
keyAlias=pixi
keyPassword=YOUR_PASSWORD
```

**Back up `pixi-upload.jks` and the password somewhere safe** (a password manager, a USB stick). If you lose them you can ask Google to reset the upload key, but it takes days.

## Every release

```sh
npm run check                                   # types and lint
npm run aab -- -PpixiVersionCode=2 -PpixiVersionName=1.0.1
```

- `pixiVersionCode` must go up by one on every upload (1, 2, 3…).
- The file to upload is `android/app/build/outputs/bundle/release/app-release.aab`.
- Without `keystore.properties` the bundle builds unsigned, and Play will reject it.

## Play Console, first time

1. Create the app: name "Pixi: Retro Film Camera", free, category Photography.
2. **Play App Signing:** accept it. Google keeps the real signing key; yours is only the upload key.
3. **Store listing:** copy the text from `docs/LAUNCH.md`. Upload the 1080×1920 screenshots from `docs/launch/`.
4. **Privacy policy URL:** `https://<your-site>/privacy/` (the page ships with the web version).
5. **Data safety form:** "No data collected", "No data shared". That is true: see `docs/SECURITY-AUDIT.md`.
6. **Permissions declaration:** camera and microphone are for taking photos and recording video.
7. **Content rating:** fill in the questionnaire; Pixi has no user-generated content shared between users and no ads.
8. Upload the `.aab` to **Internal testing** first, install it from the Play link on your phone, and run the checks in `docs/PERFORMANCE.md` again on that build.

New personal developer accounts (created after 13 November 2023) must run a closed test before Google allows a production release: at least 12 testers, all opted in for 14 days in a row. Invite a few more than 12 so one person leaving does not cost you the two weeks, and start the test as early as you can. Organisation accounts are exempt. Source: https://support.google.com/googleplay/android-developer/answer/14151465

## The web version

`netlify.toml` is set up: build command `PIXI_TARGET=app npx next build`, publish folder `out`. Connect the repo in Netlify and it deploys on every push to `main`. The camera needs HTTPS, which Netlify provides.
