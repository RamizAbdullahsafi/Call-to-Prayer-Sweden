import type { CSSProperties, ReactElement } from "react";
import {
  Suspense,
  lazy,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SWEDISH_MUNICIPALITIES } from "./data/swedishMunicipalities";
import {
  buildScheduleRows,
  fetchPrayerTimes,
  formatDateYMD,
  prayerInstant,
  syncPrayerCacheFromLocalStorageToNativePreferences,
  type PrayerDay,
  type PrayerKey,
} from "./prayerTimes";
import {
  AZAN_VOICE_GROUPS,
  DEFAULT_AZAN_PRAYER_KEYS,
  getAzanVoiceLabel,
  getBundledAzanOfflineFiles,
  getAzanStreamUrl,
  loadAzanPlayEnabled,
  loadAzanPrayerKeys,
  loadAzanVoiceIdsByPrayer,
  loadAzanVolume,
  loadAzanVoiceId,
  playAzanFromVoiceId,
  saveAzanPlayEnabled,
  saveAzanPrayerKeys,
  saveAzanVoiceIdsByPrayer,
  saveAzanVolume,
  saveAzanVoiceId,
  seekAzan,
  setAzanPlaybackListener,
  setAzanProgressListener,
  stopAzan,
} from "./azan";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  DEFAULT_NOTIFY_KEYS,
  loadNotifyKeys,
  loadNotifyMode,
  notificationsSupported,
  requestNotificationPermission,
  saveNotifyKeys,
  saveNotifyMode,
  startPrayerNotifications,
  type NotifyMode,
} from "./notifications";
import { logNotificationDebug } from "./notificationDebug";
import {
  cancelAllNativePrayerNotifications,
  getAndroidExactAlarmPermission,
  getNativeNotificationDisplayPermission,
  isIgnoringBatteryOptimizations,
  isNativeLocalNotificationsAvailable,
  NOTIFICATION_SOUND,
  openAndroidAppNotificationSettings,
  openAndroidBatteryOptimizationSettings,
  openAndroidExactAlarmSettings,
  requestNativeNotificationPermissions,
  scheduleNativePrayerNotificationsAhead,
  verifyAndroidRawAudioAssets,
} from "./nativePrayerNotifications";
import {
  LOCALES,
  LOCALE_LABELS,
  useI18n,
  type Locale,
} from "./i18n";
import type { MessageId } from "./i18n/messages";
import { detectCurrentPosition, reverseGeocodeCity, type GeoPoint } from "./location";
import { qiblaBearing } from "./qibla";
import { formatLocaleDigits } from "./i18n/localeNumbers";
import { hijriFromGregorian, hijriImportantDayKey } from "./hijri";
import { buildHijriMonthGrid, shiftHijriMonth } from "./hijriCalendar";
const AppDownloadBanner = lazy(() =>
  import("./AppDownloadBanner").then((m) => ({ default: m.AppDownloadBanner }))
);
const IconCalendar = lazy(() =>
  import("./TabIcons").then((m) => ({ default: m.IconCalendar }))
);
const IconPrayer = lazy(() =>
  import("./TabIcons").then((m) => ({ default: m.IconPrayer }))
);
const IconQibla = lazy(() =>
  import("./TabIcons").then((m) => ({ default: m.IconQibla }))
);
const IconSettings = lazy(() =>
  import("./TabIcons").then((m) => ({ default: m.IconSettings }))
);
import {
  hasAbsoluteOrientationListener,
  headingFromOrientationEvent,
  lerpHeading,
  normalizeDeg,
} from "./qiblaCompass";

function prayerMsg(
  key: PrayerKey,
  kind: "prayer" | "prayerSecondary"
): MessageId {
  return `${kind}.${key}` as MessageId;
}

function formatCountdownI18n(
  ms: number,
  t: (id: MessageId, vars?: Record<string, string | number>) => string
): string {
  if (ms <= 0) return t("countdownNow");
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h} ${t("countdownHoursShort")} ${m} ${t("countdownMinShort")}`;
  }
  if (m > 0) {
    return `${m} ${t("countdownMinShort")} ${sec} ${t("countdownSecShort")}`;
  }
  return `${sec} ${t("countdownSecShort")}`;
}

function formatAdhanTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ORDER: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const CITY_CUSTOM_KEY = "ctp.ort.custom";
const NOTIFY_SILENT_KEY = "ctp.notify.silent";
type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const COMPASS_SMOOTH = 0.16;

type ReleaseDiagnosticStatus = "pass" | "warn" | "fail";
type ReleaseDiagnosticItem = {
  id: string;
  label: string;
  status: ReleaseDiagnosticStatus;
  detail: string;
};

function loadNotifySilent(): boolean {
  try {
    return localStorage.getItem(NOTIFY_SILENT_KEY) === "1";
  } catch {
    return false;
  }
}

function saveNotifySilent(on: boolean): void {
  try {
    localStorage.setItem(NOTIFY_SILENT_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function loadSavedCustomCity(): string {
  try {
    return localStorage.getItem(CITY_CUSTOM_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistCustomCity(value: string): void {
  try {
    const v = value.trim();
    if (v) localStorage.setItem(CITY_CUSTOM_KEY, v);
    else localStorage.removeItem(CITY_CUSTOM_KEY);
  } catch {
    /* ignore */
  }
}

function getNextPrayer(
  day: PrayerDay,
  now: Date
): { key: PrayerKey; at: Date } | null {
  let next: { key: PrayerKey; at: Date } | null = null;
  for (const key of ORDER) {
    const at = prayerInstant(day, key);
    if (at > now && (!next || at < next.at)) {
      next = { key, at };
    }
  }
  return next;
}

function setToPrayerKeys(keys: Set<PrayerKey>): PrayerKey[] {
  return [...keys];
}

function normalizeCityName(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase("sv-SE")
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o");
}

const ScheduleSkeleton = memo(function ScheduleSkeleton(): ReactElement {
  return (
    <div
      className="schedule schedule--skeleton"
      aria-hidden="true"
    >
      {ORDER.map((key) => (
        <div key={key} className="prayer-row skeleton-row">
          <div className="skeleton-block skeleton-block--label" />
          <div className="skeleton-block skeleton-block--time" />
        </div>
      ))}
    </div>
  );
});

const NextPrayerBanner = memo(function NextPrayerBanner({
  scheduleDay,
  t,
  onPrayerElapsed,
}: {
  scheduleDay: PrayerDay;
  t: (id: MessageId, vars?: Record<string, string | number>) => string;
  onPrayerElapsed: () => void;
}): ReactElement | null {
  const [nowTick, setNowTick] = useState(() => new Date());
  const prevCountdownDiffRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setNowTick(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const nextPrayer = useMemo(() => getNextPrayer(scheduleDay, nowTick), [scheduleDay, nowTick]);

  useEffect(() => {
    if (!nextPrayer) {
      prevCountdownDiffRef.current = null;
      return;
    }
    const diff = nextPrayer.at.getTime() - nowTick.getTime();
    const prev = prevCountdownDiffRef.current;
    prevCountdownDiffRef.current = diff;
    if (prev !== null && prev > 0 && diff <= 0) {
      onPrayerElapsed();
    }
  }, [nextPrayer, nowTick, onPrayerElapsed]);

  if (!nextPrayer) return null;

  return (
    <div id="next" className="next-banner" role="region" aria-label={t("nextPrayer")}>
      <div className="next-banner__main">
        <div className="label">{t("nextPrayer")}</div>
        <div className="name">
          {t(prayerMsg(nextPrayer.key, "prayer"))}
          <span className="next-banner__dot" aria-hidden>
            ·
          </span>
          <time
            className="next-banner__time"
            dateTime={`${scheduleDay.date}T${scheduleDay.schedule[nextPrayer.key]}`}
          >
            {scheduleDay.schedule[nextPrayer.key]}
          </time>
        </div>
      </div>
      <div className="countdown" aria-live="polite">
        {formatCountdownI18n(nextPrayer.at.getTime() - nowTick.getTime(), t)}
      </div>
    </div>
  );
});

export function App(): ReactElement {
  const { t, locale, setLocale } = useI18n();
  /** Latest `t` for async callbacks without retriggering `loadPrayerTimes` when only language changes. */
  const tRef = useRef(t);
  tRef.current = t;

  const defaultCity = "Stockholm";
  const [city, setCity] = useState(defaultCity);
  const [cityCustom, setCityCustom] = useState(loadSavedCustomCity);
  const cityCustomRef = useRef(cityCustom);
  cityCustomRef.current = cityCustom;
  const [dateInput, setDateInput] = useState(() =>
    formatDateYMD(new Date())
  );
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setNowTick(new Date());
    }, 5000);
    return () => window.clearInterval(id);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [audioAssetWarning, setAudioAssetWarning] = useState<string | null>(null);
  const [scheduleDay, setScheduleDay] = useState<PrayerDay | null>(null);
  const [offlineCachedTimes, setOfflineCachedTimes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifyKeys, setNotifyKeys] = useState<PrayerKey[]>(() =>
    setToPrayerKeys(loadNotifyKeys())
  );
  const [azanPrayerKeys, setAzanPrayerKeys] = useState<PrayerKey[]>(() =>
    setToPrayerKeys(loadAzanPrayerKeys())
  );
  const [azanVoiceId, setAzanVoiceId] = useState(loadAzanVoiceId);
  const [azanVoiceByPrayer, setAzanVoiceByPrayer] = useState(
    loadAzanVoiceIdsByPrayer
  );
  const [azanPlay, setAzanPlay] = useState(loadAzanPlayEnabled);
  const [azanVolumePct, setAzanVolumePct] = useState(() =>
    Math.round(loadAzanVolume() * 100)
  );
  const [notifySilent, setNotifySilent] = useState(loadNotifySilent);
  const [notifyMode, setNotifyMode] = useState<NotifyMode>(() => loadNotifyMode());
  const [azanPlaying, setAzanPlaying] = useState(false);
  const [azanProgress, setAzanProgress] = useState<{
    currentTime: number;
    duration: number;
  } | null>(null);
  const [azanPlayError, setAzanPlayError] = useState<string | null>(null);
  const adhanVoiceDialogRef = useRef<HTMLDialogElement>(null);
  const [adhanVoicePickerOpen, setAdhanVoicePickerOpen] = useState(false);
  /** `global` = default voice; otherwise pick voice for that prayer only. */
  const [adhanVoicePickerScope, setAdhanVoicePickerScope] = useState<
    "global" | PrayerKey
  >("global");
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [headingDeg, setHeadingDeg] = useState<number | null>(null);
  const [compassPermissionNeeded, setCompassPermissionNeeded] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const headingSmoothRef = useRef<number | null>(null);
  const headingRafRef = useRef<number | null>(null);
  const headingPendingRef = useRef<number | null>(null);
  const stopCompassRef = useRef<() => void>(() => {});

  const [activeTab, setActiveTab] = useState<
    "prayer" | "qibla" | "calendar" | "settings"
  >("prayer");
  const [showLaunchGreeting, setShowLaunchGreeting] = useState(true);
  const adhanUiVisibleRef = useRef(false);

  useEffect(() => {
    saveNotifyMode(notifyMode);
    if (notifyMode === "silent") {
      setNotifySilent(true);
      saveNotifySilent(true);
      saveAzanPlayEnabled(false);
      setAzanPlay(false);
      return;
    }
    if (notifyMode === "notify_only") {
      setNotifySilent(false);
      saveNotifySilent(false);
      saveAzanPlayEnabled(false);
      setAzanPlay(false);
      return;
    }
    if (notifyMode === "vibrate") {
      setNotifySilent(true);
      saveNotifySilent(true);
      saveAzanPlayEnabled(false);
      setAzanPlay(false);
      return;
    }
    setNotifySilent(false);
    saveNotifySilent(false);
    saveAzanPlayEnabled(true);
    setAzanPlay(true);
  }, [notifyMode]);

  const notifySilentRef = useRef(notifySilent);
  notifySilentRef.current = notifySilent;

  const disposeNotifyRef = useRef<() => void>(() => {});

  const loadPrayerTimes = useCallback(async (): Promise<void> => {
    const tr = tRef.current;
    setError(null);
    setOfflineCachedTimes(false);
    setLoading(true);
    const d = new Date(dateInput + "T12:00:00");
    if (Number.isNaN(d.getTime())) {
      setError(tr("errors.selectDate"));
      setLoading(false);
      return;
    }
    const cityVal = cityCustomRef.current.trim() || city;
    try {
      const result = await fetchPrayerTimes(cityVal, d);
      startTransition(() => {
        setScheduleDay(result.day);
        setOfflineCachedTimes(result.fromCache);
      });
    } catch (e) {
      startTransition(() => {
        if (e instanceof Error) {
          if (e.message.startsWith("PRAYER_TIMES_HTTP_")) {
            const status = e.message.slice("PRAYER_TIMES_HTTP_".length);
            setError(tr("errors.fetchFailed", { status }));
          } else if (e.message === "PRAYER_TIMES_PARSE") {
            setError(tr("errors.parseFailed"));
          } else if (e.message === "PRAYER_TIMES_EMPTY") {
            setError(tr("errors.cityNotFound"));
          } else {
            setError(tr("errors.generic"));
          }
        } else {
          setError(tr("errors.generic"));
        }
      });
    } finally {
      setLoading(false);
    }
  }, [dateInput, city]);

  useEffect(() => {
    void loadPrayerTimes();
  }, [loadPrayerTimes]);

  useEffect(() => {
    setError(null);
  }, [locale]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const id = window.setTimeout(() => {
      void syncPrayerCacheFromLocalStorageToNativePreferences();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setShowLaunchGreeting(false);
    }, 3200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") stopAzan();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setAzanPlaybackListener((playing) => setAzanPlaying(playing));
    return () => setAzanPlaybackListener(null);
  }, []);

  useEffect(() => {
    setAzanProgressListener((p) => {
      if (!adhanUiVisibleRef.current) return;
      setAzanProgress(p);
    });
    return () => setAzanProgressListener(null);
  }, []);

  const [permRevision, setPermRevision] = useState(0);
  const nativeNotificationsEnabled =
    Capacitor.isNativePlatform() && isNativeLocalNotificationsAvailable();
  const [nativePerm, setNativePerm] = useState<
    "granted" | "denied" | "prompt" | "prompt-with-rationale"
  >("prompt");
  const [nativeRescheduleTick, setNativeRescheduleTick] = useState(0);
  const [androidExactAlarm, setAndroidExactAlarm] = useState<
    "granted" | "denied" | "unsupported"
  >("unsupported");
  const [batteryOptimizationIgnored, setBatteryOptimizationIgnored] = useState(false);
  const [releaseHealthRunning, setReleaseHealthRunning] = useState(false);
  const [releaseHealthCheckedAt, setReleaseHealthCheckedAt] = useState<Date | null>(null);
  const [releaseDebugOk, setReleaseDebugOk] = useState<boolean | null>(null);
  const [releaseDebugMessage, setReleaseDebugMessage] = useState("");
  const [releaseDiagnostics, setReleaseDiagnostics] = useState<ReleaseDiagnosticItem[]>([]);
  const [releaseReportCopied, setReleaseReportCopied] = useState(false);
  const [autoFixRunning, setAutoFixRunning] = useState(false);
  const [developerToolsEnabled] = useState(() => {
    if (import.meta.env.DEV) return true;
    try {
      return localStorage.getItem("ctp.devtools") === "1";
    } catch {
      return false;
    }
  });
  const [remindersDisclosureOpen, setRemindersDisclosureOpen] = useState(false);
  const [adhanDisclosureOpen, setAdhanDisclosureOpen] = useState(false);

  useEffect(() => {
    const visible = activeTab === "settings" && adhanDisclosureOpen;
    adhanUiVisibleRef.current = visible;
    if (!visible) {
      setAzanProgress(null);
    }
  }, [activeTab, adhanDisclosureOpen]);

  useEffect(() => {
    if (!nativeNotificationsEnabled) return;
    void getNativeNotificationDisplayPermission().then((p) => setNativePerm(p));
  }, [nativeNotificationsEnabled, permRevision]);

  useEffect(() => {
    if (!nativeNotificationsEnabled || Capacitor.getPlatform() !== "android") {
      setAndroidExactAlarm("unsupported");
      return;
    }
    void getAndroidExactAlarmPermission().then((s) => setAndroidExactAlarm(s));
    void isIgnoringBatteryOptimizations().then((ignored) => setBatteryOptimizationIgnored(ignored));
  }, [nativeNotificationsEnabled, permRevision, nativeRescheduleTick]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isNativeLocalNotificationsAvailable()) {
      return;
    }
    let sub: { remove: () => Promise<void> } | undefined;
    const handleStateChange = ({ isActive }: { isActive: boolean }) => {
      if (isActive) {
        logNotificationDebug("app foreground — reschedule native notifications");
        setNativeRescheduleTick((n) => n + 1);
      }
    };

    if (CapacitorApp && typeof CapacitorApp.addListener === "function") {
      void CapacitorApp.addListener("appStateChange", handleStateChange).then((handle) => {
        sub = handle;
      });
    }

    return () => {
      void sub?.remove();
    };
  }, []);

  const runReleaseHealthCheck = useCallback(async (): Promise<void> => {
    if (!developerToolsEnabled) return;
    if (!nativeNotificationsEnabled || Capacitor.getPlatform() !== "android") {
      setReleaseDebugOk(false);
      setReleaseDebugMessage("Android native notifications are not active on this device.");
      setReleaseDiagnostics([]);
      return;
    }
    setReleaseHealthRunning(true);
    try {
      const cityVal = cityCustomRef.current.trim() || city;
      const requiredAudioFiles = [
        ...getBundledAzanOfflineFiles(),
        ...(NOTIFICATION_SOUND && NOTIFICATION_SOUND !== "default"
          ? [NOTIFICATION_SOUND]
          : []),
      ];
      const [displayPerm, exactAlarm, batteryIgnored, missingAudio, pending, todayFetch, tomorrowFetch] =
        await Promise.all([
        getNativeNotificationDisplayPermission(),
        getAndroidExactAlarmPermission(),
        isIgnoringBatteryOptimizations(),
        verifyAndroidRawAudioAssets(requiredAudioFiles),
        LocalNotifications.getPending(),
        fetchPrayerTimes(cityVal, new Date()),
        (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return fetchPrayerTimes(cityVal, d);
        })(),
        ]);
      const hasMaghribAzan = azanPrayerKeys.includes("maghrib");
      const hasAzanOnAnyScheduledPrayer = notifyKeys.some((key) =>
        azanPrayerKeys.includes(key)
      );
      const pendingBeforeCount = pending.notifications.length;
      let pendingCount = pendingBeforeCount;
      let pendingRescheduleNote = "";
      if (pendingBeforeCount === 0) {
        try {
          await scheduleNativePrayerNotificationsAhead({
            city: cityVal,
            keys: new Set(notifyKeys),
            notifyMode,
            title: tRef.current("appTitle"),
            prayerLabel: (key) => tRef.current(prayerMsg(key, "prayer")),
            androidAzan:
              Capacitor.getPlatform() === "android"
                ? {
                    enabled: notifyMode === "full",
                    audioUrlByKey: ORDER.reduce<Partial<Record<PrayerKey, string>>>(
                      (acc, key) => {
                        const voiceId = azanVoiceByPrayer[key] ?? azanVoiceId;
                        const url = getAzanStreamUrl(voiceId);
                        if (url) acc[key] = url;
                        return acc;
                      },
                      {}
                    ),
                    volume: azanVolumePct / 100,
                    prayerKeys: new Set(azanPrayerKeys),
                  }
                : undefined,
          });
          await new Promise((resolve) => window.setTimeout(resolve, 350));
          const pendingAfter = await LocalNotifications.getPending();
          pendingCount = pendingAfter.notifications.length;
          pendingRescheduleNote =
            pendingCount > 0
              ? `Auto-reschedule recovered queue (${pendingCount} pending).`
              : "Auto-reschedule ran, but queue is still empty.";
        } catch (e) {
          pendingRescheduleNote = `Auto-reschedule failed: ${
            e instanceof Error ? e.message : "unknown error"
          }`;
        }
      }
      const checkRows: ReleaseDiagnosticItem[] = [
        {
          id: "perm",
          label: "Notification permission",
          status: displayPerm === "granted" ? "pass" : "fail",
          detail:
            displayPerm === "granted"
              ? "Granted"
              : "Not granted. Open app notification settings and allow notifications.",
        },
        {
          id: "exact",
          label: "Exact alarms",
          status: exactAlarm === "granted" ? "pass" : "fail",
          detail:
            exactAlarm === "granted"
              ? "Allowed"
              : "Denied. Enable exact alarms for Prayer Sweden.",
        },
        {
          id: "battery",
          label: "Battery optimization",
          status: batteryIgnored ? "pass" : "fail",
          detail: batteryIgnored
            ? "App is unrestricted"
            : "Restricted. Set app to Unrestricted / Don't optimize.",
        },
        {
          id: "audio-assets",
          label: "Bundled audio assets",
          status: missingAudio.length === 0 ? "pass" : "fail",
          detail:
            missingAudio.length === 0
              ? "All required raw assets exist in installed build."
              : `Missing: ${missingAudio.join(", ")}`,
        },
        {
          id: "mode",
          label: "Reminder mode",
          status: notifyMode === "full" ? "pass" : "warn",
          detail:
            notifyMode === "full"
              ? "Full Azan mode is enabled."
              : "Not Full mode. Notifications can work, but native azan audio won't.",
        },
        {
          id: "azan-toggle",
          label: "Azan playback toggle",
          status: azanPlay ? "pass" : "warn",
          detail: azanPlay ? "Enabled" : "Disabled",
        },
        {
          id: "azan-volume",
          label: "Azan volume",
          status: azanVolumePct > 0 ? "pass" : "fail",
          detail: azanVolumePct > 0 ? `${azanVolumePct}%` : "0% (muted)",
        },
        {
          id: "azan-maghrib",
          label: "Maghrib azan selected",
          status: hasMaghribAzan ? "pass" : "warn",
          detail: hasMaghribAzan ? "Included" : "Not included in azan prayers",
        },
        {
          id: "overlap",
          label: "Reminder/Azan overlap",
          status: hasAzanOnAnyScheduledPrayer ? "pass" : "fail",
          detail: hasAzanOnAnyScheduledPrayer
            ? "At least one reminder prayer has azan enabled."
            : "No overlap. Azan cannot play for any scheduled reminder.",
        },
        {
          id: "api-today",
          label: "Prayer API fetch (today)",
          status: todayFetch?.day?.schedule ? "pass" : "fail",
          detail: todayFetch?.day?.date
            ? `OK for ${todayFetch.day.city} (${todayFetch.day.date})`
            : "Failed to fetch today's prayer times.",
        },
        {
          id: "api-tomorrow",
          label: "Prayer API fetch (tomorrow)",
          status: tomorrowFetch?.day?.schedule ? "pass" : "fail",
          detail: tomorrowFetch?.day?.date
            ? `OK for ${tomorrowFetch.day.city} (${tomorrowFetch.day.date})`
            : "Failed to fetch tomorrow's prayer times.",
        },
        {
          id: "pending",
          label: "Pending native notifications",
          status: pendingCount > 0 ? "pass" : "fail",
          detail:
            pendingCount > 0
              ? `${pendingCount} notifications queued in OS${pendingRescheduleNote ? ` (${pendingRescheduleNote})` : ""}`
              : `0 queued notifications.${pendingRescheduleNote ? ` ${pendingRescheduleNote}` : " Scheduling likely failed or was cleared."}`,
        },
      ];
      const failCount = checkRows.filter((r) => r.status === "fail").length;
      const warnCount = checkRows.filter((r) => r.status === "warn").length;
      setReleaseDiagnostics(checkRows);
      setReleaseDebugOk(failCount === 0);
      setReleaseDebugMessage(
        failCount > 0
          ? `Found ${failCount} critical issue(s) and ${warnCount} warning(s). Fix critical issues first, then run this check again.`
          : warnCount > 0
            ? `No critical issues found. ${warnCount} warning(s) remain.`
            : "All diagnostics passed. If azan still fails, test during lock screen and share device model + Android version."
      );
      setReleaseHealthCheckedAt(new Date());
    } catch (err) {
      setReleaseDebugOk(false);
      setReleaseDiagnostics([]);
      setReleaseDebugMessage(
        `Diagnostics crashed before completion: ${
          err instanceof Error ? err.message : "unknown error"
        }`
      );
      setReleaseHealthCheckedAt(new Date());
    } finally {
      setReleaseHealthRunning(false);
    }
  }, [
    developerToolsEnabled,
    nativeNotificationsEnabled,
    city,
    azanPrayerKeys,
    notifyKeys,
    notifyMode,
    azanPlay,
    azanVolumePct,
  ]);

  const copyReleaseDiagnosticReport = useCallback(async (): Promise<void> => {
    if (releaseDiagnostics.length === 0) return;
    const cityVal = cityCustomRef.current.trim() || city;
    const checkedAt = releaseHealthCheckedAt
      ? releaseHealthCheckedAt.toISOString()
      : "not-run";
    const header = [
      "Prayer Sweden Diagnostic Report",
      `CheckedAt: ${checkedAt}`,
      `City: ${cityVal}`,
      `Summary: ${releaseDebugMessage || "No summary"}`,
      "",
      "Checks:",
    ];
    const rows = releaseDiagnostics.map(
      (row) => `- [${row.status.toUpperCase()}] ${row.label}: ${row.detail}`
    );
    const text = [...header, ...rows].join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setReleaseReportCopied(true);
      window.setTimeout(() => setReleaseReportCopied(false), 1800);
    } catch {
      setReleaseReportCopied(false);
    }
  }, [releaseDiagnostics, releaseHealthCheckedAt, city, releaseDebugMessage]);

  const applyAzanAutoFixes = useCallback(async (): Promise<void> => {
    if (!developerToolsEnabled) return;
    if (!nativeNotificationsEnabled || Capacitor.getPlatform() !== "android") return;
    setAutoFixRunning(true);
    try {
      if (notifyMode !== "full") {
        setNotifyMode("full");
      }
      if (!azanPlay) {
        setAzanPlay(true);
        saveAzanPlayEnabled(true);
      }
      if (azanVolumePct <= 0) {
        setAzanVolumePct(92);
        saveAzanVolume(0.92);
      }
      const hasAzanOverlap = notifyKeys.some((key) => azanPrayerKeys.includes(key));
      if (!hasAzanOverlap) {
        const next = [...notifyKeys];
        setAzanPrayerKeys(next);
        saveAzanPrayerKeys(new Set(next));
      }
      await requestNativeNotificationPermissions();
      await openAndroidAppNotificationSettings();
      await openAndroidExactAlarmSettings();
      await openAndroidBatteryOptimizationSettings();
      setPermRevision((n) => n + 1);
      setNativeRescheduleTick((n) => n + 1);
      await runReleaseHealthCheck();
    } finally {
      setAutoFixRunning(false);
    }
  }, [
    developerToolsEnabled,
    nativeNotificationsEnabled,
    notifyMode,
    azanPlay,
    azanVolumePct,
    notifyKeys,
    azanPrayerKeys,
    runReleaseHealthCheck,
  ]);

  useEffect(() => {
    if (!developerToolsEnabled) return;
    if (!remindersDisclosureOpen) return;
    if (!nativeNotificationsEnabled || Capacitor.getPlatform() !== "android") return;
    void runReleaseHealthCheck();
  }, [developerToolsEnabled, remindersDisclosureOpen, nativeNotificationsEnabled, runReleaseHealthCheck]);

  const permStatus = useMemo((): string => {
    if (nativeNotificationsEnabled) {
      if (nativePerm === "granted") return t("permGranted");
      if (nativePerm === "denied") return t("permDenied");
      return t("permDefault");
    }
    if (!notificationsSupported()) return t("permNotSupported");
    const p = Notification.permission;
    if (p === "granted") return t("permGranted");
    if (p === "denied") return t("permDenied");
    return t("permDefault");
  }, [nativeNotificationsEnabled, nativePerm, permRevision, t]);

  const notifyKeySet = useMemo(() => new Set(notifyKeys), [notifyKeys]);
  const adhanKeySet = useMemo(() => new Set(azanPrayerKeys), [azanPrayerKeys]);
  const hasAzanOnAnyScheduledPrayer = useMemo(
    () => notifyKeys.some((key) => azanPrayerKeys.includes(key)),
    [notifyKeys, azanPrayerKeys]
  );
  const azanBlockingReason = useMemo((): string | null => {
    if (notifyMode !== "full") {
      return "Azan won't play because reminder mode is not Full Azan.";
    }
    if (!azanPlay) {
      return "Azan won't play because \"Play azan with reminder\" is off.";
    }
    if (azanVolumePct <= 0) {
      return "Azan won't play because volume is set to 0%.";
    }
    if (!hasAzanOnAnyScheduledPrayer) {
      return "Azan won't play because no selected reminder prayer has azan enabled.";
    }
    return null;
  }, [notifyMode, azanPlay, azanVolumePct, hasAzanOnAnyScheduledPrayer]);

  const hardBlockers = useMemo((): string[] => {
    if (!nativeNotificationsEnabled || Capacitor.getPlatform() !== "android") return [];
    const out: string[] = [];
    if (nativePerm !== "granted") out.push("Notifications are not granted in Android settings.");
    if (androidExactAlarm === "denied") out.push("Exact alarms are disabled for this app.");
    if (!batteryOptimizationIgnored) {
      out.push("Battery optimization is enabled and may block prayer-time audio.");
    }
    if (audioAssetWarning) out.push(audioAssetWarning);
    if (notifyMode !== "full") out.push("Reminder mode must be Full for native azan alarms.");
    if (!azanPlay) out.push("Play azan with reminder is turned off.");
    if (azanVolumePct <= 0) out.push("Azan volume is 0%.");
    if (!hasAzanOnAnyScheduledPrayer) {
      out.push("No overlap between selected reminder prayers and azan prayers.");
    }
    return out;
  }, [
    nativeNotificationsEnabled,
    nativePerm,
    androidExactAlarm,
    batteryOptimizationIgnored,
    audioAssetWarning,
    notifyMode,
    azanPlay,
    azanVolumePct,
    hasAzanOnAnyScheduledPrayer,
  ]);

  useEffect(() => {
    if (!developerToolsEnabled) return;
    if (!nativeNotificationsEnabled || Capacitor.getPlatform() !== "android") return;
    if (activeTab !== "settings" || !remindersDisclosureOpen) return;
    const id = window.setInterval(() => {
      setPermRevision((n) => n + 1);
      setNativeRescheduleTick((n) => n + 1);
      void runReleaseHealthCheck();
    }, 180000);
    return () => window.clearInterval(id);
  }, [
    developerToolsEnabled,
    nativeNotificationsEnabled,
    runReleaseHealthCheck,
    activeTab,
    remindersDisclosureOpen,
  ]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    if (!isNativeLocalNotificationsAvailable()) return;
    const requiredFiles = [
      ...getBundledAzanOfflineFiles(),
      ...(NOTIFICATION_SOUND && NOTIFICATION_SOUND !== "default"
        ? [NOTIFICATION_SOUND]
        : []),
    ];
    let cancelled = false;
    void verifyAndroidRawAudioAssets(requiredFiles).then((missing) => {
      if (cancelled) return;
      if (missing.length === 0) {
        setAudioAssetWarning(null);
        return;
      }
      setAudioAssetWarning(
        `Audio assets missing in this build: ${missing.join(", ")}. Rebuild and reinstall the app before relying on azan alerts.`
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cleanupNativeNotifications = useCallback((): void => {
    if (Capacitor.isNativePlatform() && isNativeLocalNotificationsAvailable()) {
      void cancelAllNativePrayerNotifications();
    }
  }, []);

  useEffect(() => {
    if (
      !Capacitor.isNativePlatform() ||
      !isNativeLocalNotificationsAvailable()
    ) {
      return;
    }
    if (notifyKeySet.size === 0) {
      cleanupNativeNotifications();
      return;
    }
    const cityVal = cityCustomRef.current.trim() || city;
    const debounceMs = 260;
    const handle = window.setTimeout(() => {
      void scheduleNativePrayerNotificationsAhead({
        city: cityVal,
        keys: notifyKeySet,
        notifyMode,
        title: tRef.current("appTitle"),
        prayerLabel: (key) => tRef.current(prayerMsg(key, "prayer")),
        androidAzan:
          Capacitor.getPlatform() === "android"
            ? {
                enabled: notifyMode === "full",
                audioUrlByKey: ORDER.reduce<Partial<Record<PrayerKey, string>>>(
                  (acc, key) => {
                    const voiceId = azanVoiceByPrayer[key] ?? azanVoiceId;
                    const url = getAzanStreamUrl(voiceId);
                    if (url) acc[key] = url;
                    return acc;
                  },
                  {}
                ),
                volume: azanVolumePct / 100,
                prayerKeys: adhanKeySet,
              }
            : undefined,
      });
      saveNotifyKeys(notifyKeySet);
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [
    city,
    cityCustom,
    nativeRescheduleTick,
    notifyKeySet,
    notifySilent,
    notifyMode,
    permRevision,
    locale,
    azanVoiceId,
    azanVoiceByPrayer,
    azanVolumePct,
    adhanKeySet,
    cleanupNativeNotifications,
  ]);

  useEffect(() => {
    if (
      Capacitor.isNativePlatform() &&
      isNativeLocalNotificationsAvailable()
    ) {
      return;
    }

    disposeNotifyRef.current();
    disposeNotifyRef.current = () => {};

    if (!notificationsSupported() || Notification.permission !== "granted") {
      return;
    }
    if (!scheduleDay) return;
    if (scheduleDay.date !== formatDateYMD(new Date())) return;
    if (notifyKeySet.size === 0) return;

    saveNotifyKeys(notifyKeySet);

    const dispose = startPrayerNotifications(
      scheduleDay,
      notifyKeySet,
      () => {
        disposeNotifyRef.current();
        setDateInput(formatDateYMD(new Date()));
      },
      {
        onPrayerTime: (key) => {
          if (notifyMode === "vibrate" && "vibrate" in navigator) {
            navigator.vibrate?.([220, 120, 220]);
          }
          if (!loadAzanPlayEnabled()) return;
          if (loadAzanVolume() <= 0) return;
          if (!loadAzanPrayerKeys().has(key)) return;
          const voiceByPrayer = loadAzanVoiceIdsByPrayer();
          playAzanFromVoiceId(voiceByPrayer[key] ?? loadAzanVoiceId());
        },
        getNotificationSilent: () => notifySilentRef.current,
        notificationTitle: () => tRef.current("appTitle"),
        prayerLabel: (key) => tRef.current(prayerMsg(key, "prayer")),
      }
    );
    disposeNotifyRef.current = dispose;
    return () => {
      dispose();
    };
  }, [scheduleDay, notifyKeySet, notifySilent, notifyMode]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isNativeLocalNotificationsAvailable()) {
      return;
    }
    let sub: { remove: () => Promise<void> } | undefined;
    let actionSub: { remove: () => Promise<void> } | undefined;
    void LocalNotifications.addListener(
      "localNotificationReceived",
      (notification) => {
        const key = notification.extra?.key as PrayerKey | undefined;
        logNotificationDebug(
          "localNotificationReceived",
          notification.id,
          key,
          notification.title
        );
        if (!key) return;
        if (notifyMode === "vibrate" && "vibrate" in navigator) {
          navigator.vibrate?.([220, 120, 220]);
        }
        if (Capacitor.getPlatform() === "android") return;
        if (!loadAzanPlayEnabled()) return;
        if (loadAzanVolume() <= 0) return;
        if (!loadAzanPrayerKeys().has(key)) return;
        const voiceByPrayer = loadAzanVoiceIdsByPrayer();
        playAzanFromVoiceId(voiceByPrayer[key] ?? loadAzanVoiceId());
      }
    ).then((handle) => {
      sub = handle;
    });
    void LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        const key = event.notification.extra?.key as PrayerKey | undefined;
        logNotificationDebug(
          "localNotificationActionPerformed",
          event.notification.id,
          key
        );
        if (!key) return;
        if (notifyMode === "vibrate" && "vibrate" in navigator) {
          navigator.vibrate?.([220, 120, 220]);
        }
        if (Capacitor.getPlatform() === "android") return;
        if (!loadAzanPlayEnabled()) return;
        if (loadAzanVolume() <= 0) return;
        if (!loadAzanPrayerKeys().has(key)) return;
        const voiceByPrayer = loadAzanVoiceIdsByPrayer();
        playAzanFromVoiceId(voiceByPrayer[key] ?? loadAzanVoiceId());
      }
    ).then((handle) => {
      actionSub = handle;
    });
    return () => {
      void sub?.remove();
      void actionSub?.remove();
    };
  }, [notifyMode]);

  const onNotifyChange = (key: PrayerKey, checked: boolean): void => {
    setNotifyKeys((prev) => {
      const s = new Set(prev);
      if (checked) s.add(key);
      else s.delete(key);
      let next = [...s];
      if (next.length === 0) {
        next = [...DEFAULT_NOTIFY_KEYS];
      }
      saveNotifyKeys(new Set(next));
      return next;
    });
  };

  const onAzanPrayerChange = (key: PrayerKey, checked: boolean): void => {
    setAzanPrayerKeys((prev) => {
      const s = new Set(prev);
      if (checked) s.add(key);
      else s.delete(key);
      let next = [...s];
      if (next.length === 0) {
        next = [...DEFAULT_AZAN_PRAYER_KEYS];
      }
      saveAzanPrayerKeys(new Set(next));
      return next;
    });
  };

  const onAzanVoiceForPrayerChange = (key: PrayerKey, voiceId: string): void => {
    setAzanVoiceByPrayer((prev) => {
      const next = { ...prev, [key]: voiceId };
      saveAzanVoiceIdsByPrayer(next);
      return next;
    });
  };

  const syncAzanFromNotify = (): void => {
    setAzanPrayerKeys([...notifyKeys]);
    saveAzanPrayerKeys(new Set(notifyKeys));
  };

  const requestPerm = async (): Promise<void> => {
    if (nativeNotificationsEnabled) {
      await requestNativeNotificationPermissions();
    } else {
      await requestNotificationPermission();
    }
    setPermRevision((n) => n + 1);
  };

  const notifyPermDisabled = !nativeNotificationsEnabled && !notificationsSupported();

  const municipalityByNormalized = useMemo(() => {
    const m = new Map<string, string>();
    for (const name of SWEDISH_MUNICIPALITIES) {
      m.set(normalizeCityName(name), name);
    }
    return m;
  }, []);

  const onDetectLocation = async (): Promise<void> => {
    setGeoLoading(true);
    setGeoMessage(null);
    try {
      const point = await detectCurrentPosition();
      setGeo(point);
      const cityName = await reverseGeocodeCity(point.latitude, point.longitude);
      if (cityName) {
        setCityCustom(cityName);
        cityCustomRef.current = cityName;
        persistCustomCity(cityName);
        const normalized = normalizeCityName(cityName);
        const matched = municipalityByNormalized.get(normalized);
        if (matched) setCity(matched);
        setGeoMessage(`Location found: ${cityName}`);
        void loadPrayerTimes();
      } else {
        setGeoMessage("Location found.");
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "GEO_DENIED"
          ? "Location permission denied."
          : "Could not detect your location.";
      setGeoMessage(msg);
    } finally {
      setGeoLoading(false);
    }
  };

  const startCompassTracking = useCallback((): (() => void) => {
    headingSmoothRef.current = null;
    const onOrientation = (event: DeviceOrientationEvent): void => {
      const raw = headingFromOrientationEvent(event);
      if (raw === null) return;
      const prev = headingSmoothRef.current;
      const next =
        prev === null ? raw : lerpHeading(prev, raw, COMPASS_SMOOTH);
      headingSmoothRef.current = next;
      headingPendingRef.current = next;
      if (headingRafRef.current !== null) return;
      headingRafRef.current = window.requestAnimationFrame(() => {
        headingRafRef.current = null;
        if (headingPendingRef.current !== null) {
          setHeadingDeg(headingPendingRef.current);
        }
      });
      setCompassError(null);
    };
    const useAbsolute = hasAbsoluteOrientationListener();
    const onOrientationChange = (): void => {
      headingSmoothRef.current = null;
    };
    window.addEventListener("orientationchange", onOrientationChange);
    if (useAbsolute) {
      window.addEventListener("deviceorientationabsolute", onOrientation, true);
    } else {
      window.addEventListener("deviceorientation", onOrientation, true);
    }
    return () => {
      if (headingRafRef.current !== null) {
        window.cancelAnimationFrame(headingRafRef.current);
        headingRafRef.current = null;
      }
      headingPendingRef.current = null;
      window.removeEventListener("orientationchange", onOrientationChange);
      if (useAbsolute) {
        window.removeEventListener(
          "deviceorientationabsolute",
          onOrientation,
          true
        );
      } else {
        window.removeEventListener("deviceorientation", onOrientation, true);
      }
    };
  }, []);

  const requestCompassPermission = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setCompassError("Compass is not supported on this device/browser.");
      return;
    }
    const ctor = window
      .DeviceOrientationEvent as DeviceOrientationWithPermission;
    if (typeof ctor.requestPermission !== "function") return;
    try {
      const permission = await ctor.requestPermission();
      if (permission === "granted") {
        setCompassPermissionNeeded(false);
        setCompassError(null);
        stopCompassRef.current();
        stopCompassRef.current = startCompassTracking();
      } else {
        setCompassError("Compass permission was denied.");
      }
    } catch {
      setCompassError("Could not enable compass access.");
    }
  }, [startCompassTracking]);

  useEffect(() => {
    if (activeTab !== "qibla") return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setCompassError("Compass is not supported on this device/browser.");
      return;
    }
    const ctor = window
      .DeviceOrientationEvent as DeviceOrientationWithPermission;
    if (typeof ctor.requestPermission === "function") {
      setCompassPermissionNeeded(true);
      return;
    }
    setCompassPermissionNeeded(false);
    stopCompassRef.current();
    stopCompassRef.current = startCompassTracking();
    return () => {
      stopCompassRef.current();
      stopCompassRef.current = () => {};
    };
  }, [activeTab, startCompassTracking]);

  useEffect(() => {
    return () => {
      stopCompassRef.current();
      stopCompassRef.current = () => {};
    };
  }, []);

  const hijriInfo = useMemo(() => {
    if (activeTab !== "calendar") return null;
    const date = new Date(dateInput + "T12:00:00");
    if (Number.isNaN(date.getTime())) return null;
    return hijriFromGregorian(date, locale);
  }, [activeTab, dateInput, locale]);

  const hijriEventMessageId = useMemo(
    () => (hijriInfo ? hijriImportantDayKey(hijriInfo) : null),
    [hijriInfo]
  );
  const gregorianInfoLabel = useMemo(() => {
    if (activeTab !== "calendar") return null;
    const date = new Date(dateInput + "T12:00:00");
    if (Number.isNaN(date.getTime())) return null;
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      return date.toDateString();
    }
  }, [activeTab, dateInput, locale]);

  const locationSummaryLine = useMemo(() => {
    if (activeTab !== "prayer") return "";
    const cityVal = cityCustom.trim() || city;
    const d = new Date(dateInput + "T12:00:00");
    let datePart = dateInput;
    if (!Number.isNaN(d.getTime())) {
      try {
        datePart = new Intl.DateTimeFormat(locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(d);
      } catch {
        datePart = dateInput;
      }
    }
    return `${cityVal} · ${datePart}`;
  }, [activeTab, city, cityCustom, dateInput, locale]);

  const [hijriViewAnchor, setHijriViewAnchor] = useState(
    () => new Date(`${formatDateYMD(new Date())}T12:00:00`)
  );
  useEffect(() => {
    const d = new Date(dateInput + "T12:00:00");
    if (!Number.isNaN(d.getTime())) setHijriViewAnchor(d);
  }, [dateInput]);

  const hijriMonthGrid = useMemo(() => {
    if (activeTab !== "calendar") return null;
    if (Number.isNaN(hijriViewAnchor.getTime())) return null;
    return buildHijriMonthGrid(hijriViewAnchor, locale);
  }, [activeTab, hijriViewAnchor, locale]);

  const scheduleRows = useMemo(() => {
    if (activeTab !== "prayer" || !scheduleDay) return [];
    const d = new Date(scheduleDay.date + "T12:00:00");
    return buildScheduleRows(scheduleDay, d);
  }, [activeTab, scheduleDay]);

  const isRamadanGregorianDay = useMemo(() => {
    if (activeTab !== "prayer" || !scheduleDay) return false;
    const d = new Date(scheduleDay.date + "T12:00:00");
    return hijriFromGregorian(d, locale).month === 9;
  }, [activeTab, scheduleDay, locale]);

  const nextPrayer = useMemo(() => {
    if (!scheduleDay) return null;
    return getNextPrayer(scheduleDay, nowTick);
  }, [scheduleDay, nowTick]);

  const qiblaDeg = useMemo(() => {
    if (activeTab !== "qibla" || !geo) return null;
    return qiblaBearing(geo.latitude, geo.longitude);
  }, [activeTab, geo]);
  const qiblaNeedleDeg = useMemo(() => {
    if (qiblaDeg === null) return null;
    if (headingDeg === null) return qiblaDeg;
    return normalizeDeg(qiblaDeg - headingDeg);
  }, [qiblaDeg, headingDeg]);

  const getLegalPath = (path: string): string => {
    if (locale === "sv") return path;
    return `/${locale}${path}`;
  };

  const voiceDialogSelectedId =
    adhanVoicePickerScope === "global"
      ? azanVoiceId
      : (azanVoiceByPrayer[adhanVoicePickerScope] ?? azanVoiceId);

  return (
    <div className="app-native-shell">
      {showLaunchGreeting ? (
        <div className="startup-salam" role="status" aria-live="polite">
          <p className="startup-salam__text" lang="ar" dir="rtl">
            السلام عليكم
          </p>
        </div>
      ) : null}
      <a href="#main-content" className="skip-link">
        {t("skipToContent")}
      </a>
      <Suspense fallback={null}>
        <AppDownloadBanner t={t} />
      </Suspense>
      <header className="app-top-bar" role="banner">
        <div className="app-top-bar__inner">
          <p className="app-top-bar__eyebrow">{t("tagline")}</p>
          <h1 className="app-top-bar__title">{t("appTitle")}</h1>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="app-main masjid-sanctuary app-main--shell app-main--with-tabbar"
        aria-busy={loading}
      >
      {activeTab === "prayer" ? (
      <section
        id="panel-prayer"
        role="tabpanel"
        aria-labelledby="tab-btn-prayer"
        className="app-tab-panel app-page"
      >
      <header className="app-page-head app-page-head--toolbar">
        <h2 className="app-page-title">{t("tabPrayer")}</h2>
        <p className="app-page-sub">{t("tabPrayerLead")}</p>
      </header>

      {error ? (
        <div id="error" className="error" role="alert" tabIndex={-1}>
          {error}
        </div>
      ) : null}
      {audioAssetWarning ? (
        <p className="status-chip status-chip--warning" role="alert">
          {audioAssetWarning}
        </p>
      ) : null}

      <div className="live-region-polite" aria-live="polite" aria-atomic="true">
        {loading ? (
          <span className="visually-hidden">{t("loadingTimesAria")}</span>
        ) : null}
      </div>
      {offlineCachedTimes ? (
        <p className="status-chip status-chip--offline">
          {t("offlineCachedTimes")}
        </p>
      ) : null}

      {!scheduleDay ? null : (
        <NextPrayerBanner
          scheduleDay={scheduleDay}
          t={t}
          onPrayerElapsed={() => {
            void loadPrayerTimes();
          }}
        />
      )}

      <section
        className="schedule-section"
        aria-labelledby="schedule-heading"
      >
        <h2 id="schedule-heading" className="schedule-heading">
          {t("scheduleHeading")}
        </h2>
        {scheduleDay && isRamadanGregorianDay ? (
          <div
            className="ramadan-card"
            aria-label={t("ramadanCardTitle")}
          >
            <h3 className="ramadan-card-title">{t("ramadanCardTitle")}</h3>
            <div className="ramadan-card-times">
              <div className="ramadan-card-row">
                <span className="ramadan-card-label">{t("imsakLabel")}</span>
                <time
                  className="ramadan-card-time"
                  dateTime={`${scheduleDay.date}T${scheduleDay.schedule.fajr}`}
                >
                  {scheduleDay.schedule.fajr}
                </time>
              </div>
              <div className="ramadan-card-row">
                <span className="ramadan-card-label">{t("iftarLabel")}</span>
                <time
                  className="ramadan-card-time"
                  dateTime={`${scheduleDay.date}T${scheduleDay.schedule.maghrib}`}
                >
                  {scheduleDay.schedule.maghrib}
                </time>
              </div>
            </div>
            <p className="ramadan-card-note">{t("ramadanCardNote")}</p>
          </div>
        ) : null}
        {loading && !scheduleDay ? (
          <ScheduleSkeleton />
        ) : null}
        <div
          id="schedule"
          className="schedule"
          hidden={loading && !scheduleDay ? true : undefined}
        >
          {scheduleDay
            ? scheduleRows.map((row) => {
                if (row.kind === "jumuah") {
                  return (
                    <div
                      key="jumuah"
                      className="prayer-row prayer-row--jumuah"
                      data-prayer="jumuah"
                    >
                      <div>
                        <span className="name-sv">{t("prayer.jumuah")}</span>
                        <span className="name-en">
                          {t("prayerSecondary.jumuah")}
                        </span>
                        <span className="jumuah-hint">{t("jumuahHint")}</span>
                      </div>
                      <time dateTime={`${scheduleDay.date}T${row.time}`}>
                        {row.time}
                      </time>
                    </div>
                  );
                }
                const key = row.key;
                const time = scheduleDay.schedule[key];
                const isNext = nextPrayer?.key === key;
                return (
                  <div
                    key={key}
                    className={`prayer-row${isNext ? " is-next" : ""}`}
                    data-prayer={key}
                  >
                    <div>
                      <span className="name-sv">
                        {t(prayerMsg(key, "prayer"))}
                      </span>
                      <span className="name-en">
                        {t(prayerMsg(key, "prayerSecondary"))}
                      </span>
                    </div>
                    <time dateTime={`${scheduleDay.date}T${time}`}>{time}</time>
                  </div>
                );
              })
            : null}
        </div>
      </section>
      <details className="disclosure-panel disclosure-panel--location">
        <summary className="disclosure-panel__summary">
          <span className="disclosure-panel__title">{t("disclosureLocationTitle")}</span>
          <span className="disclosure-panel__value">{locationSummaryLine}</span>
        </summary>
        <div className="disclosure-panel__body">
          <div className="controls masjid-panel" aria-label={t("controlsAria")}>
            <div>
              <label htmlFor="city">{t("city")}</label>
              <select
                id="city"
                aria-label={t("citySelectAria")}
                value={city}
                onChange={(e) => {
                  const next = e.target.value;
                  setCity(next);
                  setCityCustom(next);
                  persistCustomCity(next);
                  void loadPrayerTimes();
                }}
              >
                {SWEDISH_MUNICIPALITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cityCustom">{t("cityCustom")}</label>
              <input
                type="text"
                id="cityCustom"
                list="city-custom-options"
                autoComplete="address-level2"
                placeholder={t("cityCustomPlaceholder")}
                value={cityCustom}
                onChange={(e) => {
                  const next = e.target.value;
                  setCityCustom(next);
                  const normalized = normalizeCityName(next);
                  const matched = municipalityByNormalized.get(normalized);
                  if (matched) setCity(matched);
                }}
                onBlur={() => {
                  persistCustomCity(cityCustom);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    persistCustomCity(cityCustom);
                    void loadPrayerTimes();
                  }
                }}
              />
              <datalist id="city-custom-options">
                {SWEDISH_MUNICIPALITIES.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="controls-row control-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => void onDetectLocation()}
                disabled={geoLoading}
              >
                {geoLoading ? "Detecting location…" : "Use my location (GPS)"}
              </button>
              <label className="mode-label" htmlFor="notifyMode">
                Azan mode
                <select
                  id="notifyMode"
                  value={notifyMode}
                  onChange={(e) => setNotifyMode(e.target.value as NotifyMode)}
                >
                  <option value="full">Full Azan</option>
                  <option value="notify_only">Notification only</option>
                  <option value="vibrate">Vibration only</option>
                  <option value="silent">Silent</option>
                </select>
              </label>
            </div>
            {geoMessage ? (
              <p className="status-chip status-chip--info">{geoMessage}</p>
            ) : null}
            <div className="controls-row">
              <div className="prayer-day-field">
                <label htmlFor="date">{t("date")}</label>
                <input
                  type="date"
                  id="date"
                  className="prayer-date-input"
                  value={dateInput}
                  onChange={(e) => {
                    setDateInput(e.target.value);
                  }}
                />
              </div>
              <div className="controls-load">
                <button
                  type="button"
                  className={`primary${loading ? " is-loading" : ""}`}
                  disabled={loading}
                  aria-busy={loading}
                  onClick={() => void loadPrayerTimes()}
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner" aria-hidden="true" />
                      <span>{t("loading")}</span>
                    </>
                  ) : (
                    t("loadTimes")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </details>

      </section>
      ) : null}

      {activeTab === "qibla" ? (
      <section
        id="panel-qibla"
        role="tabpanel"
        aria-labelledby="tab-btn-qibla"
        className="app-tab-panel app-page"
      >
      <header className="app-page-head app-page-head--toolbar">
        <h2 className="app-page-title">{t("tabQibla")}</h2>
        <p className="app-page-sub">{t("tabQiblaLead")}</p>
      </header>
      <div className="feature-grid feature-grid--stack">
        <div className="feature-card feature-card--pro">
          <h3 className="feature-card__title">{t("qiblaTitle")}</h3>
          <div className="qibla-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => void onDetectLocation()}
              disabled={geoLoading}
            >
              {geoLoading ? "Detecting location…" : "Use my location (GPS)"}
            </button>
            {compassPermissionNeeded ? (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  void requestCompassPermission();
                }}
              >
                Enable compass
              </button>
            ) : null}
          </div>
          {geoMessage ? (
            <p className="status-chip status-chip--info">{geoMessage}</p>
          ) : null}
          {compassError ? (
            <p className="status-chip status-chip--warning">{compassError}</p>
          ) : null}
          {qiblaDeg === null ? (
            <p className="feature-card__lead">{t("qiblaGpsHint")}</p>
          ) : (
            <>
              <div
                className="qibla-dial"
                role="img"
                aria-label={t("qiblaBearing", { deg: Math.round(qiblaDeg) })}
              >
                <div
                  className="qibla-dial-face"
                  style={{
                    transform:
                      headingDeg === null
                        ? "rotate(0deg)"
                        : `rotate(${-headingDeg}deg)`,
                  }}
                >
                  <span className="qibla-rose qibla-rose--n">N</span>
                  <span className="qibla-rose qibla-rose--e">E</span>
                  <span className="qibla-rose qibla-rose--s">S</span>
                  <span className="qibla-rose qibla-rose--w">W</span>
                </div>
                <div className="qibla-hub" aria-hidden="true" />
                <div
                  className="qibla-pointer"
                  style={{
                    transform: `translateX(-50%) rotate(${qiblaNeedleDeg ?? qiblaDeg}deg)`,
                  }}
                >
                  <svg
                    className="qibla-arrow-svg"
                    viewBox="0 0 48 56"
                    aria-hidden="true"
                  >
                    <title>Qibla</title>
                    <path
                      fill="currentColor"
                      d="M24 4 L44 44 L28 44 L28 52 L20 52 L20 44 L4 44 Z"
                    />
                  </svg>
                </div>
              </div>
              <p className="qibla-bearing-text">
                {t("qiblaBearing", { deg: Math.round(qiblaDeg) })}
              </p>
              {headingDeg === null ? null : (
                <p className="qibla-bearing-text">
                  Heading: {Math.round(headingDeg)}°
                </p>
              )}
            </>
          )}
        </div>
      </div>

      </section>
      ) : null}

      {activeTab === "calendar" ? (
      <section
        id="panel-calendar"
        role="tabpanel"
        aria-labelledby="tab-btn-calendar"
        className="app-tab-panel app-page"
      >
      <header className="app-page-head app-page-head--toolbar">
        <h2 className="app-page-title">{t("tabCalendar")}</h2>
        <p className="app-page-sub">{t("tabCalendarLead")}</p>
      </header>
      <div className="calendar-hub">
        <div className="calendar-hub__summary">
          <p className="calendar-hub__eyebrow">{t("hijriSummaryTitle")}</p>
          {!hijriInfo ? null : (
            <>
              <p className="hijri-summary-label">{hijriInfo.label}</p>
              {gregorianInfoLabel ? (
                <p className="calendar-hub__greg">{gregorianInfoLabel}</p>
              ) : null}
              {hijriEventMessageId ? (
                <p className="hijri-event">{t(hijriEventMessageId)}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="calendar-hub__divider" aria-hidden />
        <div className="calendar-hub__calendar">
          <div className="hijri-cal-header">
            <div className="hijri-cal-header__row">
              <h3 className="hijri-cal-title">{t("hijriCalendarTitle")}</h3>
              <div
                className="hijri-cal-nav"
                role="group"
                aria-label={t("hijriCalendarTitle")}
              >
                <button
                  type="button"
                  className="hijri-cal-nav-btn"
                  aria-label={t("calPrevMonth")}
                  onClick={() =>
                    setHijriViewAnchor((a) => shiftHijriMonth(a, -1, locale))
                  }
                >
                  <svg
                    className="hijri-cal-nav-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <polyline
                      points="15 18 9 12 15 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <span className="hijri-cal-month-label">
                  {hijriMonthGrid?.monthTitle ?? "—"}
                </span>
                <button
                  type="button"
                  className="hijri-cal-nav-btn"
                  aria-label={t("calNextMonth")}
                  onClick={() =>
                    setHijriViewAnchor((a) => shiftHijriMonth(a, 1, locale))
                  }
                >
                  <svg
                    className="hijri-cal-nav-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <polyline
                      points="9 18 15 12 9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <p className="hijri-cal-nav-hint">{t("calMonthPagerHint")}</p>
          </div>
          {!hijriMonthGrid ? null : (
            <div
              className="hijri-cal-grid"
              role="grid"
              aria-label={hijriMonthGrid.monthTitle}
            >
              <div className="hijri-cal-weekdays" role="row">
                {hijriMonthGrid.weekdayLabels.map((wd, wdIdx) => (
                  <div
                    key={`hijri-wd-${wdIdx}`}
                    className="hijri-cal-wd"
                    role="columnheader"
                  >
                    {wd}
                  </div>
                ))}
              </div>
              <div className="hijri-cal-cells">
                {hijriMonthGrid.cells.map((cell, idx) => {
                  if (!cell) {
                    return (
                      <div
                        key={`e-${idx}`}
                        className="hijri-cal-cell hijri-cal-cell--empty"
                      />
                    );
                  }
                  const ymd = formatDateYMD(cell.gregorian);
                  const selected = ymd === dateInput;
                  const today =
                    ymd === formatDateYMD(new Date());
                  return (
                    <button
                      key={ymd}
                      type="button"
                      className={`hijri-cal-cell${selected ? " hijri-cal-cell--selected" : ""}${today ? " hijri-cal-cell--today" : ""}`}
                      onClick={() => setDateInput(ymd)}
                    >
                      <span className="hijri-cal-day">
                        {formatLocaleDigits(cell.hijriDay, locale)}
                      </span>
                      <span className="hijri-cal-greg">
                        {formatLocaleDigits(cell.gregorian.getDate(), locale)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      </section>
      ) : null}

      {activeTab === "settings" ? (
      <section
        id="panel-settings"
        role="tabpanel"
        aria-labelledby="tab-btn-settings"
        className="app-tab-panel app-tab-panel--settings app-page"
      >
      <header className="app-page-head app-page-head--toolbar">
        <h2 className="app-page-title">{t("tabSettings")}</h2>
        <p className="app-page-sub">{t("settingsSection")}</p>
      </header>
      {nativeNotificationsEnabled && Capacitor.getPlatform() === "android" ? (
        <section className="azan-guard" aria-label={t("azanGuardAria")}>
          <h3 className="azan-guard__title">{t("azanGuardTitle")}</h3>
          {hardBlockers.length > 0 ? (
            <>
              <p className="azan-guard__intro">
                {t("azanGuardIntro")}
              </p>
              <ul className="azan-guard__list">
                {hardBlockers.map((msg, idx) => (
                  <li key={`${idx}-${msg}`} className="azan-guard__item">
                    {msg}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="primary azan-guard__fix"
                disabled={autoFixRunning}
                onClick={() => {
                  void applyAzanAutoFixes();
                }}
              >
                {autoFixRunning ? t("azanGuardFixing") : t("azanGuardFixAll")}
              </button>
            </>
          ) : (
            <p className="status-chip status-chip--offline" role="status">
              {t("azanGuardAllClear")}
            </p>
          )}
        </section>
      ) : null}
      <div className="settings-stack">
        <section
          className="settings-tile"
          aria-labelledby="settings-heading-lang"
        >
          <h3 id="settings-heading-lang" className="settings-tile__title">
            {t("language")}
          </h3>
          <select
            id="app-locale"
            className="settings-select"
            value={locale}
            aria-labelledby="settings-heading-lang"
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {LOCALES.map((loc) => (
              <option key={loc} value={loc}>
                {LOCALE_LABELS[loc]}
              </option>
            ))}
          </select>
        </section>
      </div>
      <details
        className="settings-disclosure"
        onToggle={(e) =>
          setRemindersDisclosureOpen((e.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary className="settings-disclosure__summary">
          <span className="settings-disclosure__title">{t("reminders")}</span>
          <span className="settings-disclosure__badge">{notifyKeys.length}</span>
        </summary>
        {remindersDisclosureOpen ? (
        <fieldset className="notify-fieldset notify-fieldset--disclosure">
          <legend className="visually-hidden">{t("reminders")}</legend>
        {nativeNotificationsEnabled && Capacitor.getPlatform() === "android" ? (
          <div
            className="android-setup"
            role="region"
            aria-label={t("androidSetupTitle")}
          >
            <h3 className="android-setup__title">{t("androidSetupTitle")}</h3>
            <p className="android-setup__intro">{t("androidSetupIntro")}</p>
            <ol className="android-setup__list">
              <li className="android-setup__row">
                <p className="android-setup__hint">{t("androidSetupStepNotifications")}</p>
                <div className="android-setup__actions">
                  <button
                    type="button"
                    className="primary android-setup__btn"
                    onClick={() => {
                      void (async () => {
                        await requestNativeNotificationPermissions();
                        setPermRevision((n) => n + 1);
                        await openAndroidAppNotificationSettings();
                      })();
                    }}
                  >
                    {t("allowNotifications")}
                  </button>
                  <span className="perm-status android-setup__status" aria-live="polite">
                    {permStatus}
                  </span>
                </div>
              </li>
              <li className="android-setup__row">
                <p className="android-setup__hint">{t("androidSetupStepExact")}</p>
                <p className="android-setup__subhint">{t("androidExactAlarmsHint")}</p>
                <div className="android-setup__actions">
                  <button
                    type="button"
                    className="primary android-setup__btn"
                    onClick={() => {
                      void openAndroidExactAlarmSettings().then(() =>
                        setPermRevision((n) => n + 1)
                      );
                    }}
                  >
                    {t("androidExactAlarmsOpen")}
                  </button>
                  <span className="perm-status android-setup__status" aria-live="polite">
                    {androidExactAlarm === "unsupported"
                      ? ""
                      : androidExactAlarm === "granted"
                        ? t("exactAlarmsGranted")
                        : t("exactAlarmsDenied")}
                  </span>
                </div>
              </li>
              <li className="android-setup__row">
                <p className="android-setup__hint">{t("androidSetupStepBattery")}</p>
                <p className="android-setup__subhint">{t("batteryOptimizationHint")}</p>
                <div className="android-setup__actions">
                  <button
                    type="button"
                    className="primary android-setup__btn"
                    onClick={() => {
                      void openAndroidBatteryOptimizationSettings().then(() =>
                        setNativeRescheduleTick((n) => n + 1)
                      );
                    }}
                  >
                    {t("androidSetupBatteryButton")}
                  </button>
                  <span className="perm-status android-setup__status" aria-live="polite">
                    {batteryOptimizationIgnored
                      ? t("batteryUnrestrictedOk")
                      : ""}
                  </span>
                </div>
              </li>
            </ol>
            {developerToolsEnabled ? (
              <div className="release-health" role="region" aria-label="Release health check">
                <div className="release-health__header">
                  <h4 className="release-health__title">Release health check</h4>
                  <div className="android-setup__actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void runReleaseHealthCheck()}
                      disabled={releaseHealthRunning}
                    >
                      {releaseHealthRunning ? "Checking..." : "Run check"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void copyReleaseDiagnosticReport()}
                      disabled={releaseDiagnostics.length === 0}
                    >
                      {releaseReportCopied ? "Copied" : "Copy report"}
                    </button>
                  </div>
                </div>
                {releaseHealthCheckedAt ? (
                  <p className="release-health__stamp">
                    Last check: {releaseHealthCheckedAt.toLocaleTimeString()}
                  </p>
                ) : null}
                {releaseDebugMessage ? (
                  <p
                    className={`status-chip ${
                      releaseDebugOk ? "status-chip--offline" : "status-chip--warning"
                    }`}
                  >
                    {releaseDebugMessage}
                  </p>
                ) : null}
                {releaseDiagnostics.length > 0 ? (
                  <ul className="azan-guard__list">
                    {releaseDiagnostics.map((row) => (
                      <li key={row.id} className="azan-guard__item">
                        [{row.status.toUpperCase()}] {row.label}: {row.detail}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="notify-actions">
            <button
              type="button"
              className="secondary"
              disabled={notifyPermDisabled}
              onClick={() => void requestPerm()}
            >
              {t("allowNotifications")}
            </button>
            <span className="perm-status" aria-live="polite">
              {permStatus}
            </span>
          </div>
        )}
        <div className="notify-grid" id="notify-grid">
          {ORDER.map((key) => (
            <label key={key} className="notify-item">
              <input
                type="checkbox"
                className="notify-prayer"
                checked={notifyKeySet.has(key)}
                onChange={(e) => onNotifyChange(key, e.target.checked)}
              />
              {t(prayerMsg(key, "prayer"))}
            </label>
          ))}
        </div>
        <label className="notify-silent-row">
          <input
            type="checkbox"
            checked={notifySilent}
            onChange={(e) => {
              const v = e.target.checked;
              setNotifySilent(v);
              saveNotifySilent(v);
            }}
          />
          {t("notifySilent")}
        </label>
        </fieldset>
        ) : null}
      </details>

      <details
        className="settings-disclosure"
        onToggle={(e) =>
          setAdhanDisclosureOpen((e.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary className="settings-disclosure__summary">
          <span className="settings-disclosure__title">{t("adhan")}</span>
        </summary>
        {adhanDisclosureOpen ? (
        <fieldset className="adhan-fieldset adhan-fieldset--disclosure">
          <legend className="visually-hidden">{t("adhan")}</legend>
        <p className="adhan-hint">
          {t("adhanHintBefore")}{" "}
          <strong>{t("test")}</strong> {t("adhanHintAfter")}
        </p>
        <div className="adhan-row adhan-row-top">
          <div className="adhan-grow">
            <label htmlFor="adhan-voice-trigger">{t("voice")}</label>
            <button
              type="button"
              id="adhan-voice-trigger"
              className="adhan-voice-trigger"
              aria-haspopup="dialog"
              aria-expanded={
                adhanVoicePickerOpen && adhanVoicePickerScope === "global"
              }
              aria-controls="adhan-voice-dialog"
              aria-label={t("voiceSelectAria")}
              onClick={() => {
                setAdhanVoicePickerScope("global");
                setAdhanVoicePickerOpen(true);
                adhanVoiceDialogRef.current?.showModal();
              }}
            >
              <span className="adhan-voice-trigger__label">
                {getAzanVoiceLabel(azanVoiceId)}
              </span>
            </button>
            <dialog
              id="adhan-voice-dialog"
              ref={adhanVoiceDialogRef}
              className="adhan-voice-dialog"
              aria-labelledby="adhan-voice-dialog-title"
              onClose={() => {
                setAdhanVoicePickerOpen(false);
                setAdhanVoicePickerScope("global");
              }}
            >
              <div className="adhan-voice-dialog__header">
                <h3 id="adhan-voice-dialog-title" className="adhan-voice-dialog__title">
                  {adhanVoicePickerScope === "global"
                    ? t("voice")
                    : `${t("voice")} · ${t(
                        prayerMsg(adhanVoicePickerScope, "prayer")
                      )}`}
                </h3>
                <button
                  type="button"
                  className="adhan-voice-dialog__close"
                  aria-label={t("appDownloadBannerDismiss")}
                  onClick={() => adhanVoiceDialogRef.current?.close()}
                >
                  ×
                </button>
              </div>
              <div className="adhan-voice-dialog__scroller">
                {AZAN_VOICE_GROUPS.map((group) => (
                  <section
                    key={group.groupId}
                    className="adhan-voice-group"
                    aria-label={group.groupLabel}
                  >
                    <p className="adhan-voice-group__label">{group.groupLabel}</p>
                    <ul className="adhan-voice-group__list">
                      {group.voices.map((vo) => (
                        <li key={vo.id}>
                          <button
                            type="button"
                            className={`adhan-voice-option${vo.id === voiceDialogSelectedId ? " adhan-voice-option--active" : ""}`}
                            onClick={() => {
                              if (adhanVoicePickerScope === "global") {
                                setAzanVoiceId(vo.id);
                                saveAzanVoiceId(vo.id);
                              } else {
                                onAzanVoiceForPrayerChange(
                                  adhanVoicePickerScope,
                                  vo.id
                                );
                              }
                              setAzanPlayError(null);
                              adhanVoiceDialogRef.current?.close();
                            }}
                          >
                            {vo.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </dialog>
            <div className="adhan-per-prayer-voices">
              <p className="adhan-section-label">{t("adhanPerPrayerTitle")}</p>
              <div className="adhan-per-prayer-voices__grid">
                {ORDER.filter((key) => key !== "sunrise").map((key) => (
                  <div key={`voice-${key}`} className="adhan-per-prayer-voices__item">
                    <span className="adhan-per-prayer-voices__prayer-label">
                      {t(prayerMsg(key, "prayer"))}
                    </span>
                    <button
                      type="button"
                      className="adhan-voice-trigger adhan-voice-trigger--per-prayer"
                      aria-haspopup="dialog"
                      aria-expanded={
                        adhanVoicePickerOpen &&
                        adhanVoicePickerScope === key
                      }
                      aria-controls="adhan-voice-dialog"
                      aria-label={`${t("voice")}: ${t(prayerMsg(key, "prayer"))}`}
                      onClick={() => {
                        setAdhanVoicePickerScope(key);
                        setAdhanVoicePickerOpen(true);
                        adhanVoiceDialogRef.current?.showModal();
                      }}
                    >
                      <span className="adhan-voice-trigger__label">
                        {getAzanVoiceLabel(azanVoiceByPrayer[key] ?? azanVoiceId)}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="adhan-actions adhan-actions-btns">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                saveAzanVoiceId(azanVoiceId);
                setError(null);
                setAzanPlayError(null);
                playAzanFromVoiceId(azanVoiceId, () =>
                  setAzanPlayError(t("adhanPlaybackFailed"))
                );
              }}
            >
              {t("test")}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!azanPlaying}
              onClick={() => stopAzan()}
            >
              {t("stop")}
            </button>
          </div>
        </div>
        {azanPlayError ? (
          <p className="adhan-playback-error" role="alert">
            {azanPlayError}
          </p>
        ) : null}
        <div className="adhan-volume-row">
          <label htmlFor="adhan-volume">
            {t("volume")}{" "}
            <span id="adhan-volume-label">{azanVolumePct}%</span>
          </label>
          <input
            type="range"
            id="adhan-volume"
            min={0}
            max={100}
            value={azanVolumePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={azanVolumePct}
            onChange={(e) => {
              const pct = Number(e.target.value);
              setAzanVolumePct(pct);
              saveAzanVolume(pct / 100);
            }}
          />
        </div>
        {azanPlaying ? (
          <div className="adhan-player-row">
            <span className="adhan-player-time">
              {formatAdhanTime(azanProgress?.currentTime ?? 0)}
            </span>
            <input
              type="range"
              className="adhan-player-scrub"
              min={0}
              max={
                azanProgress && azanProgress.duration > 0
                  ? azanProgress.duration
                  : 1
              }
              step={0.25}
              value={
                azanProgress && azanProgress.duration > 0
                  ? Math.min(azanProgress.currentTime, azanProgress.duration)
                  : 0
              }
              disabled={
                !azanProgress ||
                !Number.isFinite(azanProgress.duration) ||
                azanProgress.duration <= 0
              }
              aria-label={t("adhanSeek")}
              onChange={(e) => seekAzan(Number(e.target.value))}
            />
            <span className="adhan-player-time">
              {formatAdhanTime(azanProgress?.duration ?? 0)}
            </span>
          </div>
        ) : null}
        <p className="adhan-section-label">{t("adhanForPrayers")}</p>
        <div className="notify-grid adhan-prayer-grid" id="adhan-prayer-grid">
          {ORDER.map((key) => (
            <label key={key} className="notify-item">
              <input
                type="checkbox"
                className="adhan-prayer"
                checked={adhanKeySet.has(key)}
                onChange={(e) => onAzanPrayerChange(key, e.target.checked)}
              />
              {t(prayerMsg(key, "prayer"))}
            </label>
          ))}
        </div>
        <div className="adhan-sync-row">
          <button
            type="button"
            className="secondary"
            onClick={syncAzanFromNotify}
          >
            {t("syncAdhanWithNotify")}
          </button>
        </div>
        <label className="adhan-play-toggle">
          <input
            type="checkbox"
            checked={azanPlay}
            onChange={(e) => {
              const v = e.target.checked;
              setAzanPlay(v);
              saveAzanPlayEnabled(v);
            }}
          />
          {t("playAdhanOnNotify")}
        </label>
        {azanBlockingReason ? (
          <p className="status-chip status-chip--warning" role="status">
            {azanBlockingReason}
          </p>
        ) : (
          <p className="status-chip status-chip--offline" role="status">
            Azan playback is ready with current settings.
          </p>
        )}
        {!azanPlaying ? null : (
          <div
            id="adhan-playing"
            className="adhan-playing"
            role="status"
            aria-live="polite"
          >
            <span className="adhan-playing-dot" aria-hidden="true" />
            {t("adhanPlaying")}
          </div>
        )}
        </fieldset>
        ) : null}
      </details>

      </section>
      ) : null}

      </main>

      <footer className="app-footer">
        <div className="app-footer__top">
          <p className="app-footer__attribution">
            {t("footerAttribution")}
            <a
              href="https://www.islamiskaforbundet.se/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("footerLinkLabel")}
            </a>
          </p>
          <p className="footer-credit">{t("footerCreatedBy")}</p>
          <p className="footer-copyright">{t("footerCopyright")}</p>
        </div>
        <nav className="footer-legal-nav" aria-label={t("footerLegalNavAria")}>
          <a href={getLegalPath("/terms.html")}>{t("terms")}</a>
          <span className="footer-legal-nav__sep" aria-hidden>
            ·
          </span>
          <a href={getLegalPath("/privacy.html")}>{t("privacy")}</a>
          <span className="footer-legal-nav__sep" aria-hidden>
            ·
          </span>
          <a href={getLegalPath("/cookies.html")}>{t("cookiesPolicy")}</a>
          <span className="footer-legal-nav__sep" aria-hidden>
            ·
          </span>
          <a href={getLegalPath("/disclaimer.html")}>{t("disclaimer")}</a>
        </nav>
      </footer>

      <nav className="app-tab-bar" aria-label={t("mainNavAria")}>
        <div
          className="app-tab-bar__inner"
          role="tablist"
          style={
            {
              "--tab-active":
                activeTab === "prayer"
                  ? 0
                  : activeTab === "qibla"
                    ? 1
                    : activeTab === "calendar"
                      ? 2
                      : 3,
            } as CSSProperties
          }
        >
          <span className="app-tab-bar__pill" aria-hidden />
          <button
            type="button"
            id="tab-btn-prayer"
            role="tab"
            aria-selected={activeTab === "prayer"}
            aria-controls="panel-prayer"
            className={`app-tab${activeTab === "prayer" ? " app-tab--active" : ""}`}
            onClick={() => setActiveTab("prayer")}
          >
            <Suspense fallback={<span className="app-tab__icon" aria-hidden />}><IconPrayer className="app-tab__icon" /></Suspense>
            <span className="app-tab__label">{t("tabPrayer")}</span>
          </button>
          <button
            type="button"
            id="tab-btn-qibla"
            role="tab"
            aria-selected={activeTab === "qibla"}
            aria-controls="panel-qibla"
            className={`app-tab${activeTab === "qibla" ? " app-tab--active" : ""}`}
            onClick={() => setActiveTab("qibla")}
          >
            <Suspense fallback={<span className="app-tab__icon" aria-hidden />}><IconQibla className="app-tab__icon" /></Suspense>
            <span className="app-tab__label">{t("tabQibla")}</span>
          </button>
          <button
            type="button"
            id="tab-btn-calendar"
            role="tab"
            aria-selected={activeTab === "calendar"}
            aria-controls="panel-calendar"
            className={`app-tab${activeTab === "calendar" ? " app-tab--active" : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            <Suspense fallback={<span className="app-tab__icon" aria-hidden />}><IconCalendar className="app-tab__icon" /></Suspense>
            <span className="app-tab__label">{t("tabCalendar")}</span>
          </button>
          <button
            type="button"
            id="tab-btn-settings"
            role="tab"
            aria-selected={activeTab === "settings"}
            aria-controls="panel-settings"
            className={`app-tab${activeTab === "settings" ? " app-tab--active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Suspense fallback={<span className="app-tab__icon" aria-hidden />}><IconSettings className="app-tab__icon" /></Suspense>
            <span className="app-tab__label">{t("tabSettings")}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
