import type { ReactElement } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  type PrayerDay,
  type PrayerKey,
} from "./prayerTimes";
import {
  AZAN_VOICES,
  DEFAULT_AZAN_PRAYER_KEYS,
  loadAzanPlayEnabled,
  loadAzanPrayerKeys,
  loadAzanVolume,
  loadAzanVoiceId,
  playAzanFromVoiceId,
  saveAzanPlayEnabled,
  saveAzanPrayerKeys,
  saveAzanVolume,
  saveAzanVoiceId,
  setAzanPlaybackListener,
  stopAzan,
} from "./azan";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  DEFAULT_NOTIFY_KEYS,
  loadNotifyKeys,
  notificationsSupported,
  requestNotificationPermission,
  saveNotifyKeys,
  startPrayerNotifications,
} from "./notifications";
import { logNotificationDebug } from "./notificationDebug";
import {
  cancelAllNativePrayerNotifications,
  getAndroidExactAlarmPermission,
  getNativeNotificationDisplayPermission,
  isIgnoringBatteryOptimizations,
  isNativeLocalNotificationsAvailable,
  openAndroidAppNotificationSettings,
  openAndroidBatteryOptimizationSettings,
  openAndroidExactAlarmSettings,
  requestNativeNotificationPermissions,
  scheduleNativePrayerNotificationsAhead,
} from "./nativePrayerNotifications";
import {
  applyEffectiveTheme,
  effectiveTheme,
  getStoredThemePreference,
  saveThemePreference,
  subscribeSystemColorScheme,
  type ThemePreference,
} from "./theme";
import {
  LOCALES,
  LOCALE_LABELS,
  useI18n,
  type Locale,
} from "./i18n";
import type { MessageId } from "./i18n/messages";
import { detectCurrentPosition, reverseGeocodeCity, type GeoPoint } from "./location";
import { qiblaBearing } from "./qibla";
import { hijriFromGregorian, hijriImportantDay } from "./hijri";
import { buildHijriMonthGrid, shiftHijriMonth } from "./hijriCalendar";
import { AppDownloadBanner } from "./AppDownloadBanner";
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
type NotifyMode = "full" | "notify_only" | "vibrate" | "silent";
type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const COMPASS_SMOOTH = 0.16;

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

function ScheduleSkeleton(): ReactElement {
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
}

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
  const [error, setError] = useState<string | null>(null);
  const [scheduleDay, setScheduleDay] = useState<PrayerDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [notifyKeys, setNotifyKeys] = useState<PrayerKey[]>(() =>
    setToPrayerKeys(loadNotifyKeys())
  );
  const [azanPrayerKeys, setAzanPrayerKeys] = useState<PrayerKey[]>(() =>
    setToPrayerKeys(loadAzanPrayerKeys())
  );
  const [azanVoiceId, setAzanVoiceId] = useState(loadAzanVoiceId);
  const [azanPlay, setAzanPlay] = useState(loadAzanPlayEnabled);
  const [azanVolumePct, setAzanVolumePct] = useState(() =>
    Math.round(loadAzanVolume() * 100)
  );
  const [notifySilent, setNotifySilent] = useState(loadNotifySilent);
  const [notifyMode, setNotifyMode] = useState<NotifyMode>(() => {
    if (loadAzanPlayEnabled()) return "full";
    if (loadNotifySilent()) return "silent";
    return "notify_only";
  });
  const [azanPlaying, setAzanPlaying] = useState(false);
  const [azanPlayError, setAzanPlayError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => new Date());
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [headingDeg, setHeadingDeg] = useState<number | null>(null);
  const [compassPermissionNeeded, setCompassPermissionNeeded] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const headingSmoothRef = useRef<number | null>(null);
  const stopCompassRef = useRef<() => void>(() => {});

  const [themePref, setThemePref] = useState<ThemePreference>(() =>
    getStoredThemePreference()
  );

  const [activeTab, setActiveTab] = useState<
    "prayer" | "qibla" | "calendar" | "settings"
  >("prayer");

  useLayoutEffect(() => {
    applyEffectiveTheme(effectiveTheme(themePref));
  }, [themePref]);

  useEffect(() => {
    if (themePref !== "system") return;
    return subscribeSystemColorScheme(() => {
      applyEffectiveTheme(effectiveTheme("system"));
    });
  }, [themePref]);

  useEffect(() => {
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
  const prevCountdownDiffRef = useRef<number | null>(null);

  const loadPrayerTimes = useCallback(async (): Promise<void> => {
    const tr = tRef.current;
    setError(null);
    setLoading(true);
    setScheduleDay(null);
    const d = new Date(dateInput + "T12:00:00");
    if (Number.isNaN(d.getTime())) {
      setError(tr("errors.selectDate"));
      setLoading(false);
      return;
    }
    const cityVal = cityCustomRef.current.trim() || city;
    try {
      const day = await fetchPrayerTimes(cityVal, d);
      setScheduleDay(day);
    } catch (e) {
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
    const id = window.setInterval(() => setNowTick(new Date()), 1000);
    return () => window.clearInterval(id);
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

  const nextPrayer = useMemo(() => {
    if (!scheduleDay) return null;
    return getNextPrayer(scheduleDay, nowTick);
  }, [scheduleDay, nowTick]);

  useEffect(() => {
    if (!scheduleDay || !nextPrayer) {
      prevCountdownDiffRef.current = null;
      return;
    }
    const diff = nextPrayer.at.getTime() - nowTick.getTime();
    const prev = prevCountdownDiffRef.current;
    prevCountdownDiffRef.current = diff;
    if (prev !== null && prev > 0 && diff <= 0) {
      void loadPrayerTimes();
    }
  }, [scheduleDay, nextPrayer, nowTick, loadPrayerTimes]);

  const notifyKeySet = useMemo(() => new Set(notifyKeys), [notifyKeys]);
  const adhanKeySet = useMemo(() => new Set(azanPrayerKeys), [azanPrayerKeys]);

  useEffect(() => {
    disposeNotifyRef.current();
    disposeNotifyRef.current = () => {};

    const cleanupNative = (): void => {
      if (Capacitor.isNativePlatform() && isNativeLocalNotificationsAvailable()) {
        void cancelAllNativePrayerNotifications();
      }
    };

    if (
      Capacitor.isNativePlatform() &&
      isNativeLocalNotificationsAvailable()
    ) {
      if (notifyKeySet.size === 0) {
        cleanupNative();
        return;
      }
      const cityVal = cityCustomRef.current.trim() || city;
      void scheduleNativePrayerNotificationsAhead({
        city: cityVal,
        keys: notifyKeySet,
        notificationSilent: notifySilent,
        title: t("appTitle"),
        prayerLabel: (key) => t(prayerMsg(key, "prayer")),
      });
      saveNotifyKeys(notifyKeySet);
      disposeNotifyRef.current = cleanupNative;
      return () => {
        cleanupNative();
      };
    }

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
          playAzanFromVoiceId(loadAzanVoiceId());
        },
        getNotificationSilent: () => notifySilentRef.current,
        notificationTitle: t("appTitle"),
        prayerLabel: (key) => t(prayerMsg(key, "prayer")),
      }
    );
    disposeNotifyRef.current = dispose;
    return () => {
      dispose();
    };
  }, [
    city,
    nativeRescheduleTick,
    scheduleDay,
    notifyKeySet,
    notifySilent,
    notifyMode,
    permRevision,
    t,
  ]);

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
        if (!loadAzanPlayEnabled()) return;
        if (loadAzanVolume() <= 0) return;
        if (!loadAzanPrayerKeys().has(key)) return;
        playAzanFromVoiceId(loadAzanVoiceId());
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
        if (!loadAzanPlayEnabled()) return;
        if (loadAzanVolume() <= 0) return;
        if (!loadAzanPrayerKeys().has(key)) return;
        playAzanFromVoiceId(loadAzanVoiceId());
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

  const onThemePreferenceChange = (pref: ThemePreference): void => {
    saveThemePreference(pref);
    setThemePref(pref);
  };

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
        persistCustomCity(cityName);
      }
      setGeoMessage(
        cityName
          ? `Location found: ${cityName}`
          : "Location found."
      );
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
      setHeadingDeg(next);
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
    const date = new Date(dateInput + "T12:00:00");
    if (Number.isNaN(date.getTime())) return null;
    return hijriFromGregorian(date, locale);
  }, [dateInput, locale]);

  const [hijriViewAnchor, setHijriViewAnchor] = useState(
    () => new Date(`${formatDateYMD(new Date())}T12:00:00`)
  );
  useEffect(() => {
    const d = new Date(dateInput + "T12:00:00");
    if (!Number.isNaN(d.getTime())) setHijriViewAnchor(d);
  }, [dateInput]);

  const hijriMonthGrid = useMemo(() => {
    if (Number.isNaN(hijriViewAnchor.getTime())) return null;
    return buildHijriMonthGrid(hijriViewAnchor, locale);
  }, [hijriViewAnchor, locale]);

  const scheduleRows = useMemo(() => {
    if (!scheduleDay) return [];
    const d = new Date(scheduleDay.date + "T12:00:00");
    return buildScheduleRows(scheduleDay, d);
  }, [scheduleDay]);

  const isRamadanGregorianDay = useMemo(() => {
    if (!scheduleDay) return false;
    const d = new Date(scheduleDay.date + "T12:00:00");
    return hijriFromGregorian(d, locale).month === 9;
  }, [scheduleDay, locale]);

  const qiblaDeg = useMemo(() => {
    if (!geo) return null;
    return qiblaBearing(geo.latitude, geo.longitude);
  }, [geo]);
  const qiblaNeedleDeg = useMemo(() => {
    if (qiblaDeg === null) return null;
    if (headingDeg === null) return qiblaDeg;
    return normalizeDeg(qiblaDeg - headingDeg);
  }, [qiblaDeg, headingDeg]);

  const getLegalPath = (path: string): string => {
    if (locale === "sv") return path;
    return `/${locale}${path}`;
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t("skipToContent")}
      </a>
      <AppDownloadBanner t={t} />
      <header className="app-header masjid-header app-header--brand">
        <h1>{t("appTitle")}</h1>
        <p className="tagline">{t("tagline")}</p>
      </header>

      <nav className="app-nav" aria-label={t("mainNavAria")}>
        <div className="app-nav-inner" role="tablist">
          <button
            type="button"
            id="tab-btn-prayer"
            role="tab"
            aria-selected={activeTab === "prayer"}
            aria-controls="panel-prayer"
            className={`app-nav-tab${activeTab === "prayer" ? " app-nav-tab--active" : ""}`}
            onClick={() => setActiveTab("prayer")}
          >
            {t("tabPrayer")}
          </button>
          <button
            type="button"
            id="tab-btn-qibla"
            role="tab"
            aria-selected={activeTab === "qibla"}
            aria-controls="panel-qibla"
            className={`app-nav-tab${activeTab === "qibla" ? " app-nav-tab--active" : ""}`}
            onClick={() => setActiveTab("qibla")}
          >
            {t("tabQibla")}
          </button>
          <button
            type="button"
            id="tab-btn-calendar"
            role="tab"
            aria-selected={activeTab === "calendar"}
            aria-controls="panel-calendar"
            className={`app-nav-tab${activeTab === "calendar" ? " app-nav-tab--active" : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            {t("tabCalendar")}
          </button>
          <button
            type="button"
            id="tab-btn-settings"
            role="tab"
            aria-selected={activeTab === "settings"}
            aria-controls="panel-settings"
            className={`app-nav-tab${activeTab === "settings" ? " app-nav-tab--active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            {t("tabSettings")}
          </button>
        </div>
      </nav>

      <main
        id="main-content"
        tabIndex={-1}
        className="app-main masjid-sanctuary app-main--shell"
        aria-busy={loading}
      >
      <section
        id="panel-prayer"
        role="tabpanel"
        aria-labelledby="tab-btn-prayer"
        hidden={activeTab !== "prayer"}
        className="app-tab-panel"
      >
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
        {geoMessage ? <p className="geo-msg">{geoMessage}</p> : null}
        <div className="controls-row">
          <div>
            <label htmlFor="date">{t("date")}</label>
            <input
              type="date"
              id="date"
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

      {error ? (
        <div id="error" className="error" role="alert" tabIndex={-1}>
          {error}
        </div>
      ) : null}

      <div className="live-region-polite" aria-live="polite" aria-atomic="true">
        {loading ? (
          <span className="visually-hidden">{t("loadingTimesAria")}</span>
        ) : null}
      </div>

      {!scheduleDay || !nextPrayer ? null : (
        <div
          id="next"
          className="next-banner"
          role="region"
          aria-label={t("nextPrayer")}
        >
          <div className="label">{t("nextPrayer")}</div>
          <div className="name">
            {t(prayerMsg(nextPrayer.key, "prayer"))} ·{" "}
            {scheduleDay.schedule[nextPrayer.key]}
          </div>
          <div className="countdown">
            {formatCountdownI18n(
              nextPrayer.at.getTime() - nowTick.getTime(),
              t
            )}
          </div>
        </div>
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

      </section>

      <section
        id="panel-qibla"
        role="tabpanel"
        aria-labelledby="tab-btn-qibla"
        hidden={activeTab !== "qibla"}
        className="app-tab-panel"
      >
      <div className="feature-grid feature-grid--stack">
        <div className="feature-card">
          <h3>{t("qiblaTitle")}</h3>
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
          {geoMessage ? <p className="geo-msg">{geoMessage}</p> : null}
          {compassError ? <p className="geo-msg">{compassError}</p> : null}
          {qiblaDeg === null ? (
            <p>{t("qiblaGpsHint")}</p>
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

      <section
        id="panel-calendar"
        role="tabpanel"
        aria-labelledby="tab-btn-calendar"
        hidden={activeTab !== "calendar"}
        className="app-tab-panel"
      >
      <div className="feature-grid feature-grid--calendar">
        <div className="feature-card feature-card--hijri-summary">
          <h3>{t("hijriSummaryTitle")}</h3>
          {!hijriInfo ? null : (
            <>
              <p className="hijri-summary-label">{hijriInfo.label}</p>
              {hijriImportantDay(hijriInfo) ? (
                <p className="hijri-event">{hijriImportantDay(hijriInfo)}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="feature-card feature-card--hijri-calendar">
          <div className="hijri-cal-header">
            <h3 className="hijri-cal-title">{t("hijriCalendarTitle")}</h3>
            <div className="hijri-cal-nav">
              <button
                type="button"
                className="hijri-cal-nav-btn"
                aria-label={t("calPrevMonth")}
                onClick={() =>
                  setHijriViewAnchor((a) => shiftHijriMonth(a, -1, locale))
                }
              >
                ‹
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
                ›
              </button>
            </div>
          </div>
          {!hijriMonthGrid ? null : (
            <div
              className="hijri-cal-grid"
              role="grid"
              aria-label={hijriMonthGrid.monthTitle}
            >
              <div className="hijri-cal-weekdays" role="row">
                {hijriMonthGrid.weekdayLabels.map((wd) => (
                  <div key={wd} className="hijri-cal-wd" role="columnheader">
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
                      <span className="hijri-cal-day">{cell.hijriDay}</span>
                      <span className="hijri-cal-greg">
                        {cell.gregorian.getDate()}
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

      <section
        id="panel-settings"
        role="tabpanel"
        aria-labelledby="tab-btn-settings"
        hidden={activeTab !== "settings"}
        className="app-tab-panel app-tab-panel--settings"
      >
      <p className="settings-intro">{t("settingsSection")}</p>
      <div
        className="lang-bar lang-bar--in-panel"
        role="group"
        aria-label={t("language")}
      >
        <label className="lang-bar-label" htmlFor="app-locale">
          {t("language")}
        </label>
        <select
          id="app-locale"
          className="lang-select"
          value={locale}
          aria-label={t("language")}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          {LOCALES.map((loc) => (
            <option key={loc} value={loc}>
              {LOCALE_LABELS[loc]}
            </option>
          ))}
        </select>
      </div>
      <div
        className="theme-bar theme-bar--in-panel"
        role="group"
        aria-label={t("themeAppearance")}
      >
        <span className="theme-bar-label" id="theme-label">
          {t("themeAppearance")}
        </span>
        <div
          className="theme-segmented"
          role="group"
          aria-labelledby="theme-label"
        >
          <button
            type="button"
            className={`theme-option${themePref === "light" ? " theme-option--active" : ""}`}
            aria-pressed={themePref === "light"}
            onClick={() => onThemePreferenceChange("light")}
          >
            {t("themeDay")}
          </button>
          <button
            type="button"
            className={`theme-option${themePref === "dark" ? " theme-option--active" : ""}`}
            aria-pressed={themePref === "dark"}
            onClick={() => onThemePreferenceChange("dark")}
          >
            {t("themeNight")}
          </button>
          <button
            type="button"
            className={`theme-option${themePref === "system" ? " theme-option--active" : ""}`}
            aria-pressed={themePref === "system"}
            onClick={() => onThemePreferenceChange("system")}
          >
            {t("themeSystem")}
          </button>
        </div>
      </div>
      <fieldset className="notify-fieldset">
        <legend>{t("reminders")}</legend>
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

      <fieldset className="adhan-fieldset">
        <legend>{t("adhan")}</legend>
        <p className="adhan-hint">
          {t("adhanHintBefore")}{" "}
          <strong>{t("test")}</strong> {t("adhanHintAfter")}
        </p>
        <div className="adhan-row adhan-row-top">
          <div className="adhan-grow">
            <label htmlFor="adhan-voice">{t("voice")}</label>
            <select
              id="adhan-voice"
              aria-label={t("voiceSelectAria")}
              value={azanVoiceId}
              onChange={(e) => {
                const v = e.target.value;
                setAzanVoiceId(v);
                saveAzanVoiceId(v);
                setAzanPlayError(null);
              }}
            >
              {AZAN_VOICES.map((vo) => (
                <option key={vo.id} value={vo.id}>
                  {vo.reciter} — {vo.label}
                </option>
              ))}
            </select>
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
        <p className="adhan-sublegend">{t("adhanForPrayers")}</p>
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
        <p className="adhan-attrib">
          {t("attribAladhan")}{" "}
          <a
            href="https://www.aladhan.com/download-adhans"
            target="_blank"
            rel="noopener noreferrer"
          >
            AlAdhan
          </a>{" "}
          {t("attribCommons")}{" "}
          <a
            href="https://commons.wikimedia.org/wiki/Category:Adhan"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wikimedia Commons
          </a>
          .
        </p>
      </fieldset>

      </section>

      </main>

      <footer className="app-footer">
        <p>
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
        <p className="footer-legal">
          <a href={getLegalPath("/terms.html")}>{t("terms")}</a>
          {" · "}
          <a href={getLegalPath("/privacy.html")}>{t("privacy")}</a>
          {" · "}
          <a href={getLegalPath("/cookies.html")}>{t("cookiesPolicy")}</a>
          {" · "}
          <a href={getLegalPath("/disclaimer.html")}>{t("disclaimer")}</a>
        </p>
      </footer>
    </>
  );
}
