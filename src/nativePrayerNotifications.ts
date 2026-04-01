import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { PrayerDay, PrayerKey } from "./prayerTimes";
import { fetchPrayerTimes, prayerInstant } from "./prayerTimes";
import { logNotificationDebug } from "./notificationDebug";
import {
  buildPrayerSchedulePersisted,
  persistPrayerScheduleConfig,
} from "./schedulePersistence";

// Versioned IDs: Android channels keep sound settings after creation.
const CHANNEL_LOUD = "prayer-times-v2";
const CHANNEL_QUIET = "prayer-times-quiet-v2";

/** Apple limits pending local notifications (≈64); stay under with margin. */
const MAX_IOS_PENDING_NOTIFICATIONS = 60;

const ORDER: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

/** Default: web / fallback. */
export const NATIVE_NOTIFICATION_DAYS_AHEAD = 7;

/** Android: long horizon + WorkManager refresh. iOS: stay within pending limit. */
export function daysAheadForNativePlatform(): number {
  const p = Capacitor.getPlatform();
  if (p === "android") return 60;
  if (p === "ios") return 14;
  return NATIVE_NOTIFICATION_DAYS_AHEAD;
}

/** Stable 32-bit id for Android (date + prayer index). */
function nativeNotificationId(date: string, key: PrayerKey): number {
  const dayPart = parseInt(date.replace(/-/g, ""), 10) % 100000;
  const idx = ORDER.indexOf(key);
  return dayPart * 10 + idx;
}

let channelsReady = false;

async function ensureChannels(): Promise<void> {
  if (channelsReady) return;
  await LocalNotifications.createChannel({
    id: CHANNEL_LOUD,
    name: "Prayer times",
    description: "Alerts when it is time to pray (with sound).",
    importance: 5,
    vibration: true,
    sound: "adhan_notify.wav",
  });
  await LocalNotifications.createChannel({
    id: CHANNEL_QUIET,
    name: "Prayer times (quiet)",
    description: "Visual reminder without notification sound.",
    importance: 2,
    vibration: false,
  });
  channelsReady = true;
}

export function isNativeLocalNotificationsAvailable(): boolean {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable("LocalNotifications")
  );
}

export async function requestNativeNotificationPermissions(): Promise<void> {
  if (!isNativeLocalNotificationsAvailable()) return;
  const { display } = await LocalNotifications.requestPermissions();
  logNotificationDebug("requestNativeNotificationPermissions result", display);
  if (display !== "granted") return;
  await ensureChannels();
}

export async function getNativeNotificationDisplayPermission(): Promise<
  "granted" | "denied" | "prompt" | "prompt-with-rationale"
> {
  if (!isNativeLocalNotificationsAvailable()) return "denied";
  const { display } = await LocalNotifications.checkPermissions();
  return display;
}

/** Android 12+ exact alarm permission (Settings → Alarms & reminders). */
export async function getAndroidExactAlarmPermission(): Promise<
  "granted" | "denied" | "unsupported"
> {
  if (!isNativeLocalNotificationsAvailable() || Capacitor.getPlatform() !== "android") {
    return "unsupported";
  }
  try {
    const r = await LocalNotifications.checkExactNotificationSetting();
    return r.exact_alarm === "granted" ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

/** Opens system screen so the user can allow exact alarms (Android). */
export async function openAndroidExactAlarmSettings(): Promise<void> {
  if (!isNativeLocalNotificationsAvailable() || Capacitor.getPlatform() !== "android") {
    return;
  }
  await LocalNotifications.changeExactNotificationSetting();
}

export async function cancelAllNativePrayerNotifications(): Promise<void> {
  if (!isNativeLocalNotificationsAvailable()) return;
  const pending = await LocalNotifications.getPending();
  logNotificationDebug(
    "cancelAllNativePrayerNotifications pending count",
    pending.notifications.length
  );
  if (pending.notifications.length === 0) return;
  await LocalNotifications.cancel({
    notifications: pending.notifications.map((n) => ({ id: n.id })),
  });
}

type SchedulePayload = {
  id: number;
  title: string;
  body: string;
  channelId: string;
  schedule: { at: Date; allowWhileIdle: boolean };
  extra: { ctp: boolean; key: PrayerKey };
};

function buildDayNotifications(
  day: PrayerDay,
  keys: Set<PrayerKey>,
  now: Date,
  notificationSilent: boolean,
  title: string,
  prayerLabel: (key: PrayerKey) => string
): SchedulePayload[] {
  const channelId = notificationSilent ? CHANNEL_QUIET : CHANNEL_LOUD;
  const out: SchedulePayload[] = [];
  for (const key of keys) {
    const at = prayerInstant(day, key);
    if (at.getTime() <= now.getTime()) continue;
    out.push({
      id: nativeNotificationId(day.date, key),
      title,
      body: `${prayerLabel(key)} — ${day.city} (${day.schedule[key]})`,
      channelId,
      schedule: {
        at,
        allowWhileIdle: true,
      },
      extra: { ctp: true, key },
    });
  }
  return out;
}

const SCHEDULE_CHUNK = 40;

async function scheduleInChunks(
  notifications: SchedulePayload[]
): Promise<void> {
  for (let i = 0; i < notifications.length; i += SCHEDULE_CHUNK) {
    const chunk = notifications.slice(i, i + SCHEDULE_CHUNK);
    await LocalNotifications.schedule({ notifications: chunk });
    logNotificationDebug(
      "LocalNotifications.schedule chunk",
      chunk.length,
      "ids",
      chunk.map((n) => n.id)
    );
  }
}

/**
 * Schedule OS-level alarms for the next several days so alerts still fire after
 * midnight without opening the app (replaces “today only” scheduling).
 */
export async function scheduleNativePrayerNotificationsAhead(options: {
  city: string;
  keys: Set<PrayerKey>;
  notificationSilent: boolean;
  title: string;
  prayerLabel: (key: PrayerKey) => string;
  daysAhead?: number;
}): Promise<void> {
  if (!isNativeLocalNotificationsAvailable()) return;

  const { display } = await LocalNotifications.checkPermissions();
  if (display !== "granted") {
    await LocalNotifications.requestPermissions();
    const again = await LocalNotifications.checkPermissions();
    logNotificationDebug("permission after request", again.display);
    if (again.display !== "granted") {
      logNotificationDebug("abort schedule: notification permission not granted");
      return;
    }
  }

  await ensureChannels();
  await cancelAllNativePrayerNotifications();

  const {
    city,
    keys,
    notificationSilent,
    title,
    prayerLabel,
    daysAhead = daysAheadForNativePlatform(),
  } = options;

  if (keys.size === 0) return;

  const now = new Date();
  const offsets = Array.from({ length: daysAhead }, (_, i) => i);

  const settled = await Promise.allSettled(
    offsets.map(async (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(12, 0, 0, 0);
      return fetchPrayerTimes(city, d);
    })
  );

  const notifications: SchedulePayload[] = [];

  for (let i = 0; i < settled.length; i++) {
    const r = settled[i]!;
    if (r.status === "rejected") {
      logNotificationDebug(
        "fetchPrayerTimes failed for day offset",
        i,
        r.reason
      );
      continue;
    }
    const day = r.value;
    logNotificationDebug("prayer times loaded", day.date, day.city, day.schedule);
    notifications.push(
      ...buildDayNotifications(
        day,
        keys,
        now,
        notificationSilent,
        title,
        prayerLabel
      )
    );
  }

  if (notifications.length === 0) {
    logNotificationDebug("no future notifications to schedule (check network / city)");
    return;
  }

  let resolvedCity = city;
  for (const r of settled) {
    if (r.status === "fulfilled") {
      resolvedCity = r.value.city;
      break;
    }
  }

  let toSchedule = notifications;
  if (
    Capacitor.getPlatform() === "ios" &&
    toSchedule.length > MAX_IOS_PENDING_NOTIFICATIONS
  ) {
    toSchedule = [...toSchedule].sort(
      (a, b) => a.schedule.at.getTime() - b.schedule.at.getTime()
    );
    toSchedule = toSchedule.slice(0, MAX_IOS_PENDING_NOTIFICATIONS);
    logNotificationDebug(
      "iOS: capped notifications to",
      MAX_IOS_PENDING_NOTIFICATIONS
    );
  }

  try {
    await scheduleInChunks(toSchedule);
    logNotificationDebug(
      "schedule complete",
      toSchedule.length,
      "notifications up to",
      toSchedule[toSchedule.length - 1]!.schedule.at.toISOString()
    );
    try {
      await persistPrayerScheduleConfig(
        buildPrayerSchedulePersisted({
          city: resolvedCity,
          keys,
          notificationSilent,
          title,
          prayerLabel,
          daysAhead,
        })
      );
    } catch (err) {
      logNotificationDebug("persistPrayerScheduleConfig failed", err);
    }
  } catch (e) {
    logNotificationDebug("LocalNotifications.schedule error", e);
    throw e;
  }
}

/**
 * Schedule only the loaded calendar day (legacy / tests). Prefer
 * {@link scheduleNativePrayerNotificationsAhead} in the app.
 */
export async function scheduleNativePrayerNotifications(options: {
  day: PrayerDay;
  keys: Set<PrayerKey>;
  notificationSilent: boolean;
  title: string;
  prayerLabel: (key: PrayerKey) => string;
}): Promise<void> {
  if (!isNativeLocalNotificationsAvailable()) return;

  const { display } = await LocalNotifications.checkPermissions();
  if (display !== "granted") {
    await LocalNotifications.requestPermissions();
    const again = await LocalNotifications.checkPermissions();
    if (again.display !== "granted") return;
  }

  await ensureChannels();
  await cancelAllNativePrayerNotifications();

  const { day, keys, notificationSilent, title, prayerLabel } = options;
  const now = new Date();
  const notifications = buildDayNotifications(
    day,
    keys,
    now,
    notificationSilent,
    title,
    prayerLabel
  );

  if (notifications.length === 0) return;
  await scheduleInChunks(notifications);
}
