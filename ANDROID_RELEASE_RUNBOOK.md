# Android Release Runbook

This runbook covers the technical steps that can be completed locally before Play Console upload.

## 1) Prepare versions

Edit `android/app/build.gradle`:

- Increment `versionCode` (must always increase).
- Update `versionName` (human-readable release version).

## 2) Run preflight checks

From project root:

- `npm install` (if needed)
- `npm run release:preflight`

Expected: all checks pass and build succeeds.

## 3) Sync web to Android

- `npm run android:sync`

This ensures latest web assets/config are copied into Android project.

## 4) Configure release signing

On your local machine only:

- Create `android/keystore.properties` from `android/keystore.properties.example`.
- Point `storeFile` to your `.jks`.
- Fill `storePassword`, `keyAlias`, and `keyPassword`.

Do not commit private keystore files or real credentials.

## 5) Build signed release bundle

In Android Studio:

- Open `android/` project.
- Build > Generate Signed Bundle / APK.
- Choose Android App Bundle (AAB).
- Use release key.
- Build release.

## 6) Post-build local verification

Before upload:

- Install release build on physical device.
- Verify reminder notification arrives at expected time.
- Verify full azan mode plays with screen locked.
- Verify playback foreground notification appears and clears after completion.
- Verify bell status icon appears correctly in notification bar.

## 7) Upload-ready artifacts

Keep these ready:

- Signed `.aab`
- Release notes text
- Updated screenshot set (if UI changed)
- Privacy policy URL
- Support contact email
