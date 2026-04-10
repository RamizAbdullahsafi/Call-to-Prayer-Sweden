import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { PrayerDay, PrayerKey } from "./prayerTimes";
import { fetchPrayerTimes, prayerInstant } from "./prayerTimes";
import { logNotificationDebug } from "./notificationDebug";
import {
  buildPrayerSchedulePersisted,
  persistPrayerScheduleConfig,
} from "./schedulePersistence";
import type { NotifyMode } from "./notifications";

export interface BatteryOptimizationPlugin {
  isIgnoringBatteryOptimizations(): Promise<{ isIgnoring: boolean }>;
  openSettings(): Promise<void>;
  openAppDetailsSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
}

const BatteryOptimization = registerPlugin<BatteryOptimizationPlugin>(
  "BatteryOptimization"
);

export interface NativeAzanPlugin {
  sync(options: {
    enabled: boolean;
    audioUrl: string;
    volume: number;
    alarms: { id: number; atMs: number; key: PrayerKey }[];
  }): Promise<void>;
}

const NativeAzan = registerPlugin<NativeAzanPlugin>("NativeAzan");

// Versioned IDs: Android channels keep sound settings after creation.
// Bump when changing sound/importance so devices pick up new channel defaults.
const CHANNEL_LOUD = "ctp-prayer-alarm-v1";
const CHANNEL_QUIET = "ctp-prayer-quiet-v1";
/** Sound off, device vibration on (Android 8+ channel). */
const CHANNEL_VIBRATE = "ctp-prayer-vibrate-v1";

/** Old channel ids (pre alarm-style audio); delete so Android recreates with patched plugin behavior. */
const LEGACY_CHANNEL_IDS = [
  "prayer-times-v2",
  "prayer-times-quiet-v2",
];

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
  if (p === "android") return 30; // Max 500 alarms; 5 prayers * 30 days * 2 = 300 (safe).
  if (p === "ios") return 14;
  return NATIVE_NOTIFICATION_DAYS_AHEAD;
}

/** Stable 32-bit id for Android (date + prayer index). */
export function nativeNotificationId(date: string, key: PrayerKey): number {
  const dayPart = parseInt(date.replace(/-/g, ""), 10) % 100000;
  const idx = ORDER.indexOf(key);
  return dayPart * 10 + idx;
}

/** Must match [AzanAlarmScheduler.AZAN_ALARM_ID_OFFSET] on Android. */
export const ANDROID_AZAN_ALARM_ID_OFFSET = 10_000_000;

export function androidAzanAlarmId(date: string, key: PrayerKey): number {
  return ANDROID_AZAN_ALARM_ID_OFFSET + nativeNotificationId(date, key);
}

let channelsReady = false;

async function ensureChannels(): Promise<void> {
  if (channelsReady) return;
  for (const id of LEGACY_CHANNEL_IDS) {
    try {
      await LocalNotifications.deleteChannel({ id });
    } catch {
      /* channel may not exist */
    }
  }
  await LocalNotifications.createChannel({
    id: CHANNEL_LOUD,
    name: "Prayer times (azan)",
    description:
      "Plays the bundled azan sound at prayer time, including when the screen is off.",
    importance: 5,
    visibility: 1,
    vibration: true,
    sound: "azan_notify.wav",
  });
  await LocalNotifications.createChannel({
    id: CHANNEL_QUIET,
    name: "Prayer times (quiet)",
    description: "On-screen reminder only; no sound when silent mode is selected.",
    importance: 2,
    visibility: 1,
    vibration: false,
  });
  await LocalNotifications.createChannel({
    id: CHANNEL_VIBRATE,
    name: "Prayer times (vibrate)",
    description:
      "Vibration at prayer time without notification sound or full azan.",
    importance: 4,
    visibility: 1,
    vibration: true,
  });
  channelsReady = true;
}

function channelAndSoundForNotifyMode(mode: NotifyMode): {
  channelId: string;
  sound?: string;
} {
  switch (mode) {
    case "full":
    case "notify_only":
      return { channelId: CHANNEL_LOUD, sound: "azan_notify.wav" };
    case "vibrate":
      return { channelId: CHANNEL_VIBRATE, sound: undefined };
    case "silent":
      return { channelId: CHANNEL_QUIET, sound: undefined };
  }
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

/** Opens this app’s system settings page (battery, data, etc.). */
export async function openAndroidBatteryOptimizationSettings(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await BatteryOptimization.openAppDetailsSettings();
  } catch {
    try {
      await BatteryOptimization.openSettings();
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("BatteryOptimization plugin not available", e);
      }
    }
  }
}

/** Opens Android notification settings for this app. */
export async function openAndroidAppNotificationSettings(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await BatteryOptimization.openNotificationSettings();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("openNotificationSettings failed", e);
    }
  }
}

export async function isIgnoringBatteryOptimizations(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return true;
  try {
    const { isIgnoring } = await BatteryOptimization.isIgnoringBatteryOptimizations();
    return !!isIgnoring;
  } catch {
    return true;
  }
}

export async function cancelAllNativePrayerNotifications(): Promise<void> {
  if (!isNativeLocalNotificationsAvailable()) return;
  const pending = await LocalNotifications.getPending();
  logNotificationDebug(
    "cancelAllNativePrayerNotifications pending count",
    pending.notifications.length
  );
  if (pending.notifications.length === 0) {
    if (Capacitor.getPlatform() === "android") {
      try {
        await NativeAzan.sync({
          enabled: false,
          audioUrl: "",
          volume: 0.92,
          alarms: [],
        });
      } catch {
        /* ignore */
      }
    }
    return;
  }
  await LocalNotifications.cancel({
    notifications: pending.notifications.map((n) => ({ id: n.id })),
  });
  if (Capacitor.getPlatform() === "android") {
    try {
      await NativeAzan.sync({
        enabled: false,
        audioUrl: "",
        volume: 0.92,
        alarms: [],
      });
    } catch {
      /* ignore */
    }
  }
}

type SchedulePayload = {
  id: number;
  /** Used for Android native azan alarm ids (not sent to LocalNotifications). */
  dateYmd: string;
  title: string;
  body: string;
  channelId: string;
  /** Android: bundled `res/raw` sound; required for audible alerts when the app/WebView is not running. */
  sound?: string;
  schedule: { at: Date; allowWhileIdle: boolean };
  extra: { ctp: boolean; key: PrayerKey };
};

function buildDayNotifications(
  day: PrayerDay,
  keys: Set<PrayerKey>,
  now: Date,
  notifyMode: NotifyMode,
  title: string,
  prayerLabel: (key: PrayerKey) => string
): SchedulePayload[] {
  const { channelId, sound } = channelAndSoundForNotifyMode(notifyMode);
  const out: SchedulePayload[] = [];
  for (const key of keys) {
    const at = prayerInstant(day, key);
    if (at.getTime() <= now.getTime()) continue;
    out.push({
      id: nativeNotificationId(day.date, key),
      dateYmd: day.date,
      title,
      body: `${prayerLabel(key)} (${day.schedule[key]})`,
      channelId,
      sound,
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
    await LocalNotifications.schedule({
      notifications: chunk.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        channelId: n.channelId,
        sound: n.sound,
        schedule: n.schedule,
        extra: n.extra,
      })),
    });
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
async function syncAndroidAzanMediaAlarms(
  androidAzan:
    | {
        enabled: boolean;
        audioUrl: string;
        volume: number;
        prayerKeys: Set<PrayerKey>;
      }
    | undefined,
  payloads: SchedulePayload[]
): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    if (!androidAzan?.enabled) {
      await NativeAzan.sync({
        enabled: false,
        audioUrl: "",
        volume: 0.92,
        alarms: [],
      });
      return;
    }
    const url = androidAzan.audioUrl.trim();
    if (!url || androidAzan.volume <= 0) {
      await NativeAzan.sync({
        enabled: false,
        audioUrl: "",
        volume: 0.92,
        alarms: [],
      });
      return;
    }
    const alarms: { id: number; atMs: number; key: PrayerKey }[] = [];
    for (const n of payloads) {
      if (!androidAzan.prayerKeys.has(n.extra.key)) continue;
      alarms.push({
        id: androidAzanAlarmId(n.dateYmd, n.extra.key),
        atMs: n.schedule.at.getTime(),
        key: n.extra.key,
      });
    }
    await NativeAzan.sync({
      enabled: alarms.length > 0,
      audioUrl: url,
      volume: androidAzan.volume,
      alarms,
    });
  } catch (e) {
    logNotificationDebug("NativeAzan.sync failed", e);
  }
}

export async function scheduleNativePrayerNotificationsAhead(options: {
  city: string;
  keys: Set<PrayerKey>;
  notifyMode: NotifyMode;
  title: string;
  prayerLabel: (key: PrayerKey) => string;
  daysAhead?: number;
  /** Android: parallel exact alarms so full azan plays without a live WebView. */
  androidAzan?: {
    enabled: boolean;
    audioUrl: string;
    volume: number;
    prayerKeys: Set<PrayerKey>;
  };
}): Promise<void> {
  if (!isNativeLocalNotificationsAvailable()) return;

  const { display } = await LocalNotifications.checkPermissions();
  if (display !== "granted") {
    await LocalNotifications.requestPermissions();
    const again = await LocalNotifications.checkPermissions();
    logNotificationDebug("permission after request", again.display);
    if (again.display !== "granted") {
      logNotificationDebug("abort schedule: notification permission not granted");
      if (Capacitor.getPlatform() === "android") {
        try {
          await NativeAzan.sync({
            enabled: false,
            audioUrl: "",
            volume: 0.92,
            alarms: [],
          });
        } catch {
          /* ignore */
        }
      }
      return;
    }
  }

  await ensureChannels();
  await cancelAllNativePrayerNotifications();

  const {
    city,
    keys,
    notifyMode,
    title,
    prayerLabel,
    daysAhead = daysAheadForNativePlatform(),
    androidAzan,
  } = options;

  if (keys.size === 0) {
    if (Capacitor.getPlatform() === "android") {
      try {
        await NativeAzan.sync({
          enabled: false,
          audioUrl: "",
          volume: 0.92,
          alarms: [],
        });
      } catch {
        /* ignore */
      }
    }
    return;
  }

  const now = new Date();
  const offsets = Array.from({ length: daysAhead }, (_, i) => i);

  const settled = await Promise.allSettled(
    offsets.map(async (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(12, 0, 0, 0);
      return fetchPrayerTimes(city, d).then((r) => r.day);
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
        notifyMode,
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
          notifyMode,
          title,
          prayerLabel,
          daysAhead,
          androidAzan,
        })
      );
    } catch (err) {
      logNotificationDebug("persistPrayerScheduleConfig failed", err);
    }
    await syncAndroidAzanMediaAlarms(androidAzan, toSchedule);
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
  notifyMode?: NotifyMode;
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

  const { day, keys, title, prayerLabel, notifyMode = "notify_only" } = options;
  const now = new Date();
  const notifications = buildDayNotifications(
    day,
    keys,
    now,
    notifyMode,
    title,
    prayerLabel
  );

  if (notifications.length === 0) return;
  await scheduleInChunks(notifications);
}
