import type { PrayerDay, PrayerKey } from "./prayerTimes";
import { formatDateYMD, prayerInstant } from "./prayerTimes";
import { logNotificationDebug } from "./notificationDebug";

const STORAGE_KEYS = "ctp.notify.keys";
const FIRED_PREFIX = "ctp.fired.";

/** Persisted Azan mode (must match App settings dropdown). */
export type NotifyMode = "full" | "notify_only" | "vibrate" | "silent";

const NOTIFY_MODE_KEY = "ctp.notify.mode";
const ALL_NOTIFY_MODES: readonly NotifyMode[] = [
  "full",
  "notify_only",
  "vibrate",
  "silent",
];

export function loadNotifyMode(): NotifyMode {
  try {
    const raw = localStorage.getItem(NOTIFY_MODE_KEY);
    if (raw && ALL_NOTIFY_MODES.includes(raw as NotifyMode)) {
      return raw as NotifyMode;
    }
  } catch {
    /* ignore */
  }
  try {
    if (localStorage.getItem("ctp.azan.play") === "1") {
      return "full";
    }
    if (localStorage.getItem("ctp.notify.silent") === "1") {
      return "silent";
    }
  } catch {
    /* ignore */
  }
  return "notify_only";
}

export function saveNotifyMode(mode: NotifyMode): void {
  try {
    localStorage.setItem(NOTIFY_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

const ALL_KEYS: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

/** Default: all except Shuruk (many users skip sunrise adhan). */
export const DEFAULT_NOTIFY_KEYS: PrayerKey[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

export function notificationsSupported(): boolean {
  return typeof Notification !== "undefined";
}

export function loadNotifyKeys(): Set<PrayerKey> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS);
    if (!raw) return new Set(DEFAULT_NOTIFY_KEYS);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set(DEFAULT_NOTIFY_KEYS);
    const next = new Set<PrayerKey>();
    for (const k of parsed) {
      if (ALL_KEYS.includes(k as PrayerKey)) next.add(k as PrayerKey);
    }
    return next.size > 0 ? next : new Set(DEFAULT_NOTIFY_KEYS);
  } catch {
    return new Set(DEFAULT_NOTIFY_KEYS);
  }
}

export function saveNotifyKeys(keys: Set<PrayerKey>): void {
  localStorage.setItem(STORAGE_KEYS, JSON.stringify([...keys]));
}

function firedStorageKey(date: string, key: PrayerKey): string {
  return `${FIRED_PREFIX}${date}-${key}`;
}

function wasFired(date: string, key: PrayerKey): boolean {
  return sessionStorage.getItem(firedStorageKey(date, key)) === "1";
}

function markFired(date: string, key: PrayerKey): void {
  sessionStorage.setItem(firedStorageKey(date, key), "1");
}

/**
 * Short polling works more reliably than a single long setTimeout when the tab
 * is in the background (browser throttling).
 */
const TICK_MS = 15_000;
const FIRE_WINDOW_MS = 120_000;
const RELOAD_THROTTLE_MS = 45_000;

export type PrayerNotifyOptions = {
  /** Called once when a prayer notification fires (same moment as Notification). */
  onPrayerTime?: (key: PrayerKey) => void;
  /** When true, the system/browser notification uses no default sound (HTML adhan still plays). */
  getNotificationSilent?: () => boolean;
  /** Localized notification title (defaults to app name). */
  notificationTitle?: string | (() => string);
  /** Localized prayer name for the notification body. */
  prayerLabel?: (key: PrayerKey) => string;
};

function tick(
  day: PrayerDay,
  keys: Set<PrayerKey>,
  onReloadToday: () => void,
  reloadState: { lastMs: number },
  options?: PrayerNotifyOptions
): void {
  const now = new Date();

  if (formatDateYMD(now) !== day.date) {
    const t = Date.now();
    if (t - reloadState.lastMs < RELOAD_THROTTLE_MS) return;
    reloadState.lastMs = t;
    onReloadToday();
    return;
  }

  for (const key of keys) {
    if (wasFired(day.date, key)) continue;
    const at = prayerInstant(day, key);
    const delta = now.getTime() - at.getTime();
    if (delta >= 0 && delta < FIRE_WINDOW_MS) {
      markFired(day.date, key);
      logNotificationDebug(
        "web Notification fired",
        key,
        day.date,
        day.schedule[key],
        "deltaMs",
        delta
      );
      const label =
        options?.prayerLabel?.(key) ??
        (key === "sunrise"
          ? "Shuruk"
          : key.charAt(0).toUpperCase() + key.slice(1));
      const silent = options?.getNotificationSilent?.() ?? false;
      const rawTitle = options?.notificationTitle;
      const title =
        typeof rawTitle === "function"
          ? rawTitle()
          : (rawTitle ?? "Call to Prayer Sweden");
      new Notification(title, {
        body: `${label} (${day.schedule[key]})`,
        tag: `ctp-${day.date}-${key}`,
        silent,
      });
      options?.onPrayerTime?.(key);
    }
  }
}

/**
 * Starts polling for prayer times on `day`. Only meaningful when `day.date`
 * is today in the local calendar. Returns a disposer.
 */
export function startPrayerNotifications(
  day: PrayerDay,
  keys: Set<PrayerKey>,
  onReloadToday: () => void,
  options?: PrayerNotifyOptions
): () => void {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return () => {};
  }

  const reloadState = { lastMs: 0 };

  const id = window.setInterval(() => {
    tick(day, keys, onReloadToday, reloadState, options);
  }, TICK_MS);

  tick(day, keys, onReloadToday, reloadState, options);

  return () => {
    window.clearInterval(id);
  };
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission
> {
  if (!notificationsSupported()) return "denied";
  const p = await Notification.requestPermission();
  return p;
}
