import { Preferences } from "@capacitor/preferences";
import type { PrayerKey } from "./prayerTimes";
import { getAbsoluteBonetiderFetchUrl } from "./prayerTimes";

/** Same key Android WorkManager reads from SharedPreferences "CapacitorStorage". */
export const PRAYER_SCHEDULE_CONFIG_KEY = "ctp.prayerScheduleConfig.v1";

export type PrayerSchedulePersisted = {
  /** Full POST URL, e.g. https://….netlify.app/api/bonetider (required for background refresh on Android). */
  apiFetchUrl: string;
  city: string;
  keys: PrayerKey[];
  notificationSilent: boolean;
  title: string;
  labels: Record<PrayerKey, string>;
  daysAhead: number;
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
  notificationSilent: boolean;
  title: string;
  prayerLabel: (key: PrayerKey) => string;
  daysAhead: number;
}): PrayerSchedulePersisted {
  const labels = {} as Record<PrayerKey, string>;
  for (const key of options.keys) {
    labels[key] = options.prayerLabel(key);
  }
  return {
    apiFetchUrl: getAbsoluteBonetiderFetchUrl(),
    city: options.city,
    keys: [...options.keys],
    notificationSilent: options.notificationSilent,
    title: options.title,
    labels,
    daysAhead: options.daysAhead,
  };
}
