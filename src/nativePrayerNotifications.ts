import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { PrayerDay, PrayerKey } from "./prayerTimes";
import { prayerInstant } from "./prayerTimes";

const CHANNEL_LOUD = "prayer-times";
const CHANNEL_QUIET = "prayer-times-quiet";

const ORDER: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

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
  if (display !== "granted") return;
  await ensureChannels();
}

export async function cancelAllNativePrayerNotifications(): Promise<void> {
  if (!isNativeLocalNotificationsAvailable()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length === 0) return;
  await LocalNotifications.cancel({
    notifications: pending.notifications.map((n) => ({ id: n.id })),
  });
}

/**
 * Schedule OS-level alarms for today's prayer times (replaces unreliable JS timers
 * when the app is backgrounded or the phone is locked).
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
  const channelId = notificationSilent ? CHANNEL_QUIET : CHANNEL_LOUD;

  const notifications: {
    id: number;
    title: string;
    body: string;
    channelId: string;
    schedule: { at: Date; allowWhileIdle: boolean };
    extra: { ctp: boolean; key: PrayerKey };
  }[] = [];

  for (const key of keys) {
    const at = prayerInstant(day, key);
    if (at.getTime() <= now.getTime()) continue;

    notifications.push({
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

  if (notifications.length === 0) return;

  await LocalNotifications.schedule({ notifications });
}
