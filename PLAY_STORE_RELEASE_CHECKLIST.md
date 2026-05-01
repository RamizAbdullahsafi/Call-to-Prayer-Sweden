# Play Store Release Checklist

Use this document before each Google Play submission for `se.calltoprayer.sweden`.

## 1) Automated checks (repo)

Run these commands from project root:

- `npm run validate:assets`
- `npm run validate:playstore`
- `npm run build`

If any check fails, fix it before generating release bundles.

## 2) Android release build

- Confirm release signing is configured (`android/keystore.properties` on local machine only).
- Confirm `versionCode` is incremented in `android/app/build.gradle`.
- Confirm `versionName` is updated in `android/app/build.gradle`.
- Build release AAB in Android Studio and upload AAB (not debug APK) to Play Console.

## 3) Permission and policy declarations (Play Console)

You will likely need to declare the purpose of:

- `POST_NOTIFICATIONS`
- `SCHEDULE_EXACT_ALARM`
- `USE_EXACT_ALARM`
- foreground service for media playback (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`)

Suggested declaration text (adapt to your exact release behavior):

> This app schedules exact, user-expected prayer-time reminders and optional adhan playback at specific times selected by the user. Exact alarms are required to reliably trigger reminders and playback at prayer time, including when the app is not open. Foreground service is used only during active adhan audio playback and is stopped immediately when playback ends.

## 4) Data safety form alignment

Ensure Data safety answers match app behavior and legal pages:

- Data handled: city/date query, optional location (when user asks), app preferences.
- Purpose: core app functionality (prayer times, reminders, qibla).
- Sharing/selling: no selling of personal data.
- Collection context: location only user-triggered, notifications opt-in by OS/app settings.
- Retention: primarily local storage on device; provider logs retained per provider policy.

Confirm consistency with:

- `public/privacy.html`
- `public/en/privacy.html`

## 5) Manual QA before rollout

Test on at least one Android 13+ and one Android 14+ device:

- Notification permission granted/denied paths.
- Exact alarms granted/denied paths.
- Battery optimization restricted/unrestricted behavior.
- Reboot persistence (`BOOT_COMPLETED` flow).
- Azan playback starts and stops correctly with foreground notification.
- Notification icon visible and clean in status bar.
- Silent / vibrate / notify-only / full modes.

## 6) Store listing quality

- App title and short description clearly explain reminders + azan behavior.
- Screenshots match current UI and language support.
- Privacy policy URL points to a public, accessible page.
- Support email and contact details are valid.

## 7) Rollout strategy

- Start with internal testing.
- Move to closed/open testing.
- Use staged production rollout (for example: 10% -> 50% -> 100%).
- Watch crashes/ANRs and user feedback between rollout stages.

## 8) Final go/no-go

Do not publish if any of the following is true:

- `validate:playstore` has FAIL items.
- Release build not signed correctly.
- Data safety answers differ from privacy policy.
- Reminder/azan reliability fails under lock screen/background conditions.
