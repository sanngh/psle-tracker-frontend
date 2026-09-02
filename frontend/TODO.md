# Frontend Deployment TODO (Android Play Store + iOS App Store)

## Code/config (can be done here)
- [x] Add `expo-image-picker` plugin config to `app.json` with a camera permission string (`NSCameraUsageDescription`). Without this, camera capture crashes on iOS standalone builds — currently missing.
- [x] Add `ios.buildNumber` to `app.json` (currently only `android.versionCode` exists).
- [x] Create `eas.json` with `development`/`preview`/`production` build profiles.
- [x] Add real `extra.eas.projectId` to `app.json` after running `eas init`.
- [x] Confirm `frontend/.env.production` points to the deployed Cloud Run URL (not a LAN IP) before any production build.
- [x] Decide and implement an account/data deletion path (in-app or clearly accessible) — decision: handled via existing admin/manual contact process (see `disclaimer.json`), no in-app deletion flow planned. Accepted risk: this may not fully satisfy Apple Guideline 5.1.1(v) if reviewers push back; revisit if App Store review flags it.
- [x] Disable the auto-added `RECORD_AUDIO` Android permission (`expo-image-picker`'s plugin defaults to requesting it for video capture, which this app doesn't use) — set via `microphonePermission: false` in the plugin config.
- [x] Install `expo-splash-screen` and switch `app.json` from the legacy bare `splash` field to the plugin config — enables Android 12+'s native SplashScreen API (with AndroidX `core-splashscreen` compat back to API 21) and iOS launch screen, both from one config. Currently reuses the placeholder `icon.png`; replace once real branding is ready. Note: only renders correctly in EAS/native builds, not in Expo Go.

## Visual assets needed from you (cannot be generated here)
- [x] App icon — 1024x1024 PNG — **real icon added** at `frontend/assets/icon.png`. Verify it has no transparent pixels (iOS App Store rejects icons with alpha transparency).
- [x] Android adaptive icon — foreground PNG (transparent) + background color — **real icon added** at `frontend/assets/adaptive-icon.png`.
- [x] Play Store feature graphic — 1024x500 — added at `frontend/store-assets/play-feature-graphic.png` (resized from original 1488x720 to the exact required size).
- [x] Store screenshots (phone sizes for both platforms; tablet only if supported) — Android: 4 screenshots added at `frontend/store-assets/screenshots/android/` (1049x2048–1080x2108, meets Play Console's 320-3840px range). iOS screenshots still needed for TestFlight/App Store later, not blocking Android.

## Accounts to set up (external)
- [x] Expo/EAS account — `eas login`, then `eas init` (done: project linked, `owner: sanngh`, `projectId` written to `app.json`)
- [ ] Google Play Developer account ($25 one-time)
- [ ] Apple Developer Program membership ($99/year)

## Store listing/compliance content (manual)
- [ ] Publicly hosted privacy policy URL, matching what `disclaimer.json` states
- [ ] Google Play: Data Safety form, content rating questionnaire, target-audience classification
- [ ] Apple: App Privacy "nutrition label" (disclose phone number + photo collection)

## Build & release flow (once the above is done)
- [ ] `eas build --platform android --profile production` → signed `.aab`
- [ ] `eas build --platform ios --profile production` → signed build (requires Apple Developer membership)
- [ ] Android: upload to Play Console **Closed Testing** track first, add pilot tester emails — not straight to Production
- [ ] iOS: upload to **TestFlight**, add pilot testers
- [ ] `eas submit` (optional) to automate store upload instead of manual dashboard upload
