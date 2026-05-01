# Play Console Submission Pack

Use this as your copy-ready pack while filling Google Play Console fields.

## App core description (short)

Call to Prayer Sweden provides daily prayer times in Sweden with optional reminders, azan playback, qibla direction, and Hijri calendar support.

## Exact alarm declaration (suggested text)

We use exact alarms to trigger user-expected prayer-time reminders and optional azan playback at specific times selected by the user.  
Without exact alarms, reminders and adhan may be delayed or missed due to Android background restrictions.  
Exact alarms are only scheduled for upcoming prayer times and are canceled/rescheduled when user settings change.

## Foreground service declaration (suggested text)

Foreground service is used only during active azan audio playback so Android allows uninterrupted prayer-time playback when the app is backgrounded or the screen is locked.  
The service type is media playback, and it stops immediately when playback completes or is interrupted.

## Permission justification snippets

### POST_NOTIFICATIONS

Needed to show user-enabled prayer reminders at selected prayer times.

### SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM

Needed for precise prayer-time scheduling where user expectation is exact-time reminders and azan playback.

### FOREGROUND_SERVICE + FOREGROUND_SERVICE_MEDIA_PLAYBACK

Needed for user-initiated azan playback at prayer time while app is in background/lock screen.

### ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION

Used only when user requests location to detect city and calculate qibla direction.  
Location is not used for ads and not sold.

## Data safety mapping (recommended answers baseline)

Always verify these against your latest behavior before submitting.

- **Personal info**: No direct collection (unless you add account/contact features later).
- **Location**: Collected only when user explicitly requests location features.
- **App activity**: Not collected for ads/profiling by your app logic.
- **Device or other IDs**: Not collected by your app logic for profiling.
- **Data sharing**: No selling of user personal data.
- **Data encryption in transit**: Yes (network requests over HTTPS).
- **User can request deletion**: Local data can be removed by clearing app data/uninstalling.

## Privacy policy URL checklist

Before submission, ensure the public policy URL:

- is reachable without login,
- explicitly mentions notifications/exact alarms/location behavior,
- matches Data safety declarations exactly.

Project legal pages currently live under `public/` (including localized variants).

## Release notes template (What’s new)

Use this for each production rollout:

- Improved prayer reminder reliability on Android.
- Improved azan playback handling in background/lock screen.
- Updated notification icon and notification behavior consistency.
- Stability and performance improvements.

## Internal release QA notes template

Device model(s) tested:

- Android version:
- Notification permission flow tested: Yes/No
- Exact alarm setting tested: Yes/No
- Battery optimization unrestricted tested: Yes/No
- Reboot test passed: Yes/No
- Lock-screen azan playback passed: Yes/No
- Known issues:
