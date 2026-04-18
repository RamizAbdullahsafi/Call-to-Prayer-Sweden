import { Preferences } from "@capacitor/preferences";
import type { PrayerKey } from "./prayerTimes";
import { getAbsoluteBonetiderFetchUrl } from "./prayerTimes";
import type { NotifyMode } from "./notifications";

/** Same key Android WorkManager reads from SharedPreferences "CapacitorStorage". */
export const PRAYER_SCHEDULE_CONFIG_KEY = "ctp.prayerScheduleConfig.v1";

export type PrayerSchedulePersisted = {
  /** Full POST URL, e.g. https://….netlify.app/api/bonetider (required for background refresh on Android). */
  apiFetchUrl: string;
  city: string;
  keys: PrayerKey[];
  /** @deprecated Prefer notifyMode; kept for older app workers. */
  notificationSilent?: boolean;
  notifyMode?: NotifyMode;
  title: string;
  labels: Record<PrayerKey, string>;
  daysAhead: number;
  /** Android: native exact alarms for full azan when the WebView is not running. */
  azanPlayEnabled?: boolean;
  azanAudioUrl?: string;
  azanAudioUrlByKey?: Partial<Record<PrayerKey, string>>;
  azanVolume?: number;
  azanKeys?: PrayerKey[];
};

export async function persistPrayerScheduleConfig(
  config: PrayerSchedulePersisted
): Promise<void> {
  await Preferences.set({
    key: PRAYER_SCHEDULE_CONFIG_KEY,
    value: JSON.stringify(config),
  });
}

/** Build payload from current scheduling options (Android background worker uses this). */
export function buildPrayerSchedulePersisted(options: {
  city: string;
  keys: Set<PrayerKey>;
  notifyMode: NotifyMode;
  title: string;
  prayerLabel: (key: PrayerKey) => string;
  daysAhead: number;
  androidAzan?: {
    enabled: boolean;
    audioUrlByKey: Partial<Record<PrayerKey, string>>;
    volume: number;
    prayerKeys: Set<PrayerKey>;
  };
}): PrayerSchedulePersisted {
  const labels = {} as Record<PrayerKey, string>;
  for (const key of options.keys) {
    labels[key] = options.prayerLabel(key);
  }
  const silentLegacy =
    options.notifyMode === "silent" || options.notifyMode === "vibrate";
  const base: PrayerSchedulePersisted = {
    apiFetchUrl: getAbsoluteBonetiderFetchUrl(),
    city: options.city,
    keys: [...options.keys],
    notificationSilent: silentLegacy,
    notifyMode: options.notifyMode,
    title: options.title,
    labels,
    daysAhead: options.daysAhead,
  };
  const az = options.androidAzan;
  const hasPerPrayerAudio =
    !!az &&
    Object.values(az.audioUrlByKey).some((u) => typeof u === "string" && u.length > 0);
  if (az && az.enabled && hasPerPrayerAudio && az.prayerKeys.size > 0) {
    base.azanPlayEnabled = true;
    base.azanAudioUrlByKey = az.audioUrlByKey;
    base.azanAudioUrl = Object.values(az.audioUrlByKey).find((u) => u && u.length > 0);
    base.azanVolume = az.volume;
    base.azanKeys = [...az.prayerKeys];
  }
  return base;
}
