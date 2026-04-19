import { Capacitor } from "@capacitor/core";
import type { PrayerKey } from "./prayerTimes";

const STORAGE_VOICE = "ctp.azan.voice";
const STORAGE_VOICE_BY_PRAYER = "ctp.azan.voiceByPrayer";
const STORAGE_PLAY = "ctp.azan.play";
const STORAGE_VOLUME = "ctp.azan.volume";
const STORAGE_ADHAN_KEYS = "ctp.azan.prayerKeys";

export type AzanVoiceDef = {
  id: string;
  label: string;
  reciter: string;
  /** Filename under `public/audio/` and `android/.../res/raw/` (offline). */
  offlineFile: string;
  /**
   * If `offlineFile` is WebM and the browser cannot play it (e.g. iOS), use this
   * bundled MP3/ogg path instead.
   */
  iosFallbackFile?: string;
  sourceNote?: string;
};

/** Android [AzanPlaybackService] prefix for [R.raw] lookup (basename of offlineFile). */
export const RAW_ASSET_PREFIX = "asset://raw/";

/**
 * Bundled app URL under `public/audio/` (Vite → `dist/` → Capacitor `www`).
 * Uses `import.meta.env.BASE_URL` so subpath deploys and WebView origins resolve correctly.
 * UI language (`document.documentElement.lang` / locale) does not affect this path — the same
 * files are used for sv, en, ar, fa, ku, and so.
 */
export function webAudioPath(offlineFile: string): string {
  const rawBase = import.meta.env.BASE_URL ?? "/";
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
  return `${base}audio/${offlineFile}`;
}

export function androidRawAssetUrl(offlineFile: string): string {
  const base = offlineFile.replace(/\.[^.]+$/, "");
  return `${RAW_ASSET_PREFIX}${base}`;
}

/** Voice ids removed from the picker; map to default on load. */
const RETIRED_AZAN_VOICE_IDS = new Set([
  "bundled-offline",
  "beautiful-adhan",
  "islamic-call-worship",
  "masjid-al-haram",
  "masjid-nabawi",
  "masjid-al-aqsa",
  "mishary-dubai",
  "mishary-yet-another",
]);

function iosLikeBrowser(): boolean {
  if (Capacitor.getPlatform() === "ios") return true;
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function webmFallbackForVoice(def: AzanVoiceDef): string {
  return def.iosFallbackFile ?? "mishary_dubai.mp3";
}

/**
 * Grouped for the settings dropdown (optgroup). Each `label` is the option text;
 * `reciter` is used for media session / attribution.
 */
export const AZAN_VOICE_GROUPS: { groupId: string; groupLabel: string; voices: AzanVoiceDef[] }[] =
  [
    {
      groupId: "mishary",
      groupLabel: "Mishary Rashid Alafasy",
      voices: [
        {
          id: "mishary-hijaz-fajr-2014",
          label: "Maqam Hijaz · Fajr (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_yet_another.mp3",
          sourceNote:
            "SoundCloud (Read, Love & Remember): Mishary Rashid Alafasy — Adhan (Fajr), uploaded 2014. Bundled offline copy included.",
        },
        {
          id: "mishary-hijaz-daily-2014",
          label: "Maqam Hijaz · Dhuhr/Asr/Maghrib/Isha (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_dubai.mp3",
          sourceNote:
            "SoundCloud (Read, Love & Remember): Mishary Rashid Alafasy — Adhan (Dhuhr, Asr, Maghrib, Isha), uploaded 2014. Bundled offline copy included.",
        },
        {
          id: "mishary-alt",
          label: "Alternate studio take",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_alt.mp3",
          sourceNote: "Bundled; AlAdhan",
        },
      ],
    },
    {
      groupId: "mishary-soundcloud",
      groupLabel: "Mishary SoundCloud Collection",
      voices: [
        {
          id: "mishary-sc-01",
          label: "Saba 2 (Fajr)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_01_160922833.m4a",
          sourceNote: "SoundCloud playlist track id 160922833",
        },
        {
          id: "mishary-sc-02",
          label: "Nahawand (2014) · Fajr",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_02_160923210.m4a",
          sourceNote: "SoundCloud playlist track id 160923210",
        },
        {
          id: "mishary-sc-03",
          label: "Lamy (2005) · Fajr",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_03_160922604.m4a",
          sourceNote: "SoundCloud playlist track id 160922604",
        },
        {
          id: "mishary-sc-04",
          label: "Kurd (2008) · Fajr",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_04_160922603.m4a",
          sourceNote: "SoundCloud playlist track id 160922603",
        },
        {
          id: "mishary-sc-05",
          label: "Kurd Low (2010) · Fajr",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_05_160922602.m4a",
          sourceNote: "SoundCloud playlist track id 160922602",
        },
        {
          id: "mishary-sc-06",
          label: "Hejaz (2013) · Fajr",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_06_160922601.m4a",
          sourceNote: "SoundCloud collection track id 160922601",
        },
        {
          id: "mishary-sc-07",
          label: "Hejaz (2010) · Fajr",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_07_160922600.m4a",
          sourceNote: "SoundCloud collection track id 160922600",
        },
        {
          id: "mishary-sc-08",
          label: "Sika (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_08_160921786.m4a",
          sourceNote: "SoundCloud collection track id 160921786",
        },
        {
          id: "mishary-sc-09",
          label: "Saba (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_09_160921785.m4a",
          sourceNote: "SoundCloud collection track id 160921785",
        },
        {
          id: "mishary-sc-10",
          label: "Saba 2 (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_10_160921783.m4a",
          sourceNote: "SoundCloud collection track id 160921783",
        },
        {
          id: "mishary-sc-11",
          label: "Rast (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_11_160921782.m4a",
          sourceNote: "SoundCloud collection track id 160921782",
        },
        {
          id: "mishary-sc-12",
          label: "Nawa (2005)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_12_160921781.m4a",
          sourceNote: "SoundCloud collection track id 160921781",
        },
        {
          id: "mishary-sc-13",
          label: "Nawa Athar (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_13_160921108.m4a",
          sourceNote: "SoundCloud collection track id 160921108",
        },
        {
          id: "mishary-sc-14",
          label: "Nahawand (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_14_160921107.m4a",
          sourceNote: "SoundCloud collection track id 160921107",
        },
        {
          id: "mishary-sc-15",
          label: "Nahawand (2010)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_15_160919244.m4a",
          sourceNote: "SoundCloud collection track id 160919244",
        },
        {
          id: "mishary-sc-16",
          label: "Lamy (2005)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_16_160919243.m4a",
          sourceNote: "SoundCloud collection track id 160919243",
        },
        {
          id: "mishary-sc-17",
          label: "Kurd (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_17_160919242.m4a",
          sourceNote: "SoundCloud collection track id 160919242",
        },
        {
          id: "mishary-sc-18",
          label: "Kurd (2008)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_18_160919241.m4a",
          sourceNote: "SoundCloud collection track id 160919241",
        },
        {
          id: "mishary-sc-19",
          label: "Kurd Mid (2010)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_19_160919240.m4a",
          sourceNote: "SoundCloud collection track id 160919240",
        },
        {
          id: "mishary-sc-20",
          label: "Kurd Low (2010)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_20_160919239.m4a",
          sourceNote: "SoundCloud collection track id 160919239",
        },
        {
          id: "mishary-sc-21",
          label: "Kurd High (2010)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_21_160919238.m4a",
          sourceNote: "SoundCloud collection track id 160919238",
        },
        {
          id: "mishary-sc-22",
          label: "Hejaz (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_22_160919237.m4a",
          sourceNote: "SoundCloud collection track id 160919237",
        },
        {
          id: "mishary-sc-23",
          label: "Hejaz (2010)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_23_160919236.m4a",
          sourceNote: "SoundCloud collection track id 160919236",
        },
        {
          id: "mishary-sc-24",
          label: "Hejaz (2013)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_24_160919235.m4a",
          sourceNote: "SoundCloud collection track id 160919235",
        },
        {
          id: "mishary-sc-25",
          label: "Bayaty (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_25_160919234.m4a",
          sourceNote: "SoundCloud collection track id 160919234",
        },
        {
          id: "mishary-sc-26",
          label: "Ajam (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_26_160919233.m4a",
          sourceNote: "SoundCloud collection track id 160919233",
        },
        {
          id: "mishary-sc-27",
          label: "Ajam 2 (2014)",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_sc_27_160919232.m4a",
          sourceNote: "SoundCloud collection track id 160919232",
        },
      ],
    },
    {
      groupId: "reciters",
      groupLabel: "More reciters",
      voices: [
        {
          id: "ahmad-nafees",
          label: "Ahmad al-Nafees",
          reciter: "Ahmad al-Nafees",
          offlineFile: "ahmad_nafees.mp3",
          sourceNote: "Bundled; AlAdhan",
        },
        {
          id: "mustafa-ozcan",
          label: "Mustafa Özcan · Turkey",
          reciter: "Hafiz Mustafa Özcan",
          offlineFile: "mustafa_ozcan.mp3",
          sourceNote: "Bundled; AlAdhan",
        },
        {
          id: "karl-jenkins",
          label: "Karl Jenkins · Mass for Peace",
          reciter: "Karl Jenkins (arr.)",
          offlineFile: "karl_jenkins.mp3",
          sourceNote: "Bundled; AlAdhan",
        },
        {
          id: "mansour-zahrani",
          label: "Mansour Al-Zahrani",
          reciter: "Mansour Al-Zahrani",
          offlineFile: "mansour_zahrani.mp3",
          sourceNote: "Bundled; AlAdhan",
        },
      ],
    },
    {
      groupId: "commons",
      groupLabel: "More recordings",
      voices: [
        {
          id: "sabah-fakhry",
          label: "Sabah Fakhri · classic (1985)",
          reciter: "Sabah Fakhri",
          offlineFile: "sabah_fakhry.mp3",
          sourceNote: "Bundled; Wikimedia Commons",
        },
        {
          id: "adhan-classic",
          label: "Classic adhan",
          reciter: "—",
          offlineFile: "adhan_classic.ogg",
          sourceNote: "Bundled; Wikimedia Commons (CC BY-SA)",
        },
        {
          id: "aaqib-azeez",
          label: "Aaqib Azeez · Sunnah style",
          reciter: "Aaqib Azeez",
          offlineFile: "aaqib_azeez.mp3",
          sourceNote: "Bundled; Wikimedia Commons (CC BY-SA)",
        },
      ],
    },
  ];

export const AZAN_VOICES: AzanVoiceDef[] = AZAN_VOICE_GROUPS.flatMap((g) => g.voices);

/** Label for the current voice id (for the picker button). */
export function getAzanVoiceLabel(voiceId: string): string {
  for (const g of AZAN_VOICE_GROUPS) {
    const v = g.voices.find((vo) => vo.id === voiceId);
    if (v) return v.label;
  }
  return voiceId;
}

const DEFAULT_VOICE_ID = "mishary-hijaz-fajr-2014";

const ALL_PRAYER_KEYS: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

/** Default: azan for same prayers as default notifications (usually not Shuruk). */
export const DEFAULT_AZAN_PRAYER_KEYS: PrayerKey[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

let currentAudio: HTMLAudioElement | null = null;
let wakeLock: WakeLockSentinel | null = null;
let playbackListener: ((playing: boolean) => void) | null = null;
export type AzanProgress = { currentTime: number; duration: number };
let progressListener: ((p: AzanProgress | null) => void) | null = null;
/** Invalidate in-flight playback when stop or new play starts. */
let azanSession = 0;

export function setAzanPlaybackListener(
  cb: ((playing: boolean) => void) | null
): void {
  playbackListener = cb;
}

export function setAzanProgressListener(
  cb: ((p: AzanProgress | null) => void) | null
): void {
  progressListener = cb;
}

function emitPlayback(playing: boolean): void {
  playbackListener?.(playing);
}

async function acquireWakeLock(): Promise<void> {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    /* denied or unsupported */
  }
}

function releaseWakeLock(): void {
  void wakeLock?.release();
  wakeLock = null;
}

function clearMediaSession(): void {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.setActionHandler("stop", null);
  } catch {
    /* ignore */
  }
}

function applyMediaSession(title: string, artist: string): void {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "Call to Prayer Sweden",
    });
    navigator.mediaSession.setActionHandler("stop", () => {
      stopAzan();
    });
  } catch {
    /* ignore */
  }
}

export function loadAzanPlayEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_PLAY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function saveAzanPlayEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_PLAY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** 0–1 */
export function loadAzanVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_VOLUME);
    if (raw === null) return 0.92;
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  } catch {
    /* ignore */
  }
  return 0.92;
}

export function saveAzanVolume(v: number): void {
  const x = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem(STORAGE_VOLUME, String(x));
  } catch {
    /* ignore */
  }
  if (currentAudio) currentAudio.volume = x;
}

export function loadAzanPrayerKeys(): Set<PrayerKey> {
  try {
    const raw = localStorage.getItem(STORAGE_ADHAN_KEYS);
    if (!raw) return new Set(DEFAULT_AZAN_PRAYER_KEYS);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set(DEFAULT_AZAN_PRAYER_KEYS);
    const next = new Set<PrayerKey>();
    for (const k of parsed) {
      if (ALL_PRAYER_KEYS.includes(k as PrayerKey)) next.add(k as PrayerKey);
    }
    return next.size > 0 ? next : new Set(DEFAULT_AZAN_PRAYER_KEYS);
  } catch {
    return new Set(DEFAULT_AZAN_PRAYER_KEYS);
  }
}

export function saveAzanPrayerKeys(keys: Set<PrayerKey>): void {
  try {
    localStorage.setItem(STORAGE_ADHAN_KEYS, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}

export type AzanVoiceByPrayer = Record<PrayerKey, string>;

export function loadAzanVoiceId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_VOICE);
    if (raw === "custom") {
      try {
        localStorage.removeItem("ctp.azan.customUrl");
        localStorage.setItem(STORAGE_VOICE, DEFAULT_VOICE_ID);
      } catch {
        /* ignore */
      }
      return DEFAULT_VOICE_ID;
    }
    if (raw && RETIRED_AZAN_VOICE_IDS.has(raw)) {
      try {
        localStorage.setItem(STORAGE_VOICE, DEFAULT_VOICE_ID);
      } catch {
        /* ignore */
      }
      return DEFAULT_VOICE_ID;
    }
    if (raw && AZAN_VOICES.some((v) => v.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_VOICE_ID;
}

export function saveAzanVoiceId(id: string): void {
  try {
    if (AZAN_VOICES.some((v) => v.id === id)) {
      localStorage.setItem(STORAGE_VOICE, id);
    }
  } catch {
    /* ignore */
  }
}

export function loadAzanVoiceIdsByPrayer(): AzanVoiceByPrayer {
  const fallback = loadAzanVoiceId();
  const base: AzanVoiceByPrayer = {
    fajr: fallback,
    sunrise: fallback,
    dhuhr: fallback,
    asr: fallback,
    maghrib: fallback,
    isha: fallback,
  };
  try {
    const raw = localStorage.getItem(STORAGE_VOICE_BY_PRAYER);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Record<PrayerKey, string>>;
    for (const key of ALL_PRAYER_KEYS) {
      const id = parsed[key];
      if (id && AZAN_VOICES.some((v) => v.id === id)) {
        base[key] = id;
      }
    }
  } catch {
    /* ignore */
  }
  return base;
}

export function saveAzanVoiceIdsByPrayer(map: AzanVoiceByPrayer): void {
  const cleaned: Partial<Record<PrayerKey, string>> = {};
  for (const key of ALL_PRAYER_KEYS) {
    const id = map[key];
    if (id && AZAN_VOICES.some((v) => v.id === id)) {
      cleaned[key] = id;
    }
  }
  try {
    localStorage.setItem(STORAGE_VOICE_BY_PRAYER, JSON.stringify(cleaned));
  } catch {
    /* ignore */
  }
}

/**
 * Bundled file path for in-app HTML5 playback (`new Audio()`).
 * Uses {@link webAudioPath} under `public/audio/` (Vite → `dist/` → Capacitor `public/`).
 * Works offline in the WebView/PWA without network — do not use `asset://raw/` here
 * (that scheme is only for `getAzanStreamUrl` → Android native azan alarms / foreground service).
 */
export function getAzanBundledWebUrl(voiceId: string): string | null {
  const def = AZAN_VOICES.find((v) => v.id === voiceId);
  if (!def) return null;
  if (def.offlineFile.endsWith(".webm") && iosLikeBrowser()) {
    return webAudioPath(webmFallbackForVoice(def));
  }
  return webAudioPath(def.offlineFile);
}

/** Playback URL for the selected voice: Android native alarms use `asset://raw/…`; elsewhere bundled web path. */
export function getAzanStreamUrl(voiceId: string): string | null {
  const def = AZAN_VOICES.find((v) => v.id === voiceId);
  if (!def) return null;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    return androidRawAssetUrl(def.offlineFile);
  }
  return webAudioPath(def.offlineFile);
}

function getVoiceMeta(voiceId: string): { title: string; artist: string } {
  const def = AZAN_VOICES.find((v) => v.id === voiceId);
  if (def) return { title: "Azan", artist: `${def.reciter} — ${def.label}` };
  return { title: "Azan", artist: "Call to Prayer Sweden" };
}

export function playAzanFromVoiceId(
  voiceId: string,
  onPlaybackError?: () => void
): void {
  const url = getAzanBundledWebUrl(voiceId);
  if (!url) {
    onPlaybackError?.();
    return;
  }
  playAzanUrl(url, getVoiceMeta(voiceId), onPlaybackError);
}

export function playAzanUrl(
  url: string,
  meta?: { title: string; artist: string },
  onPlaybackError?: () => void
): void {
  stopAzan();
  const session = azanSession;
  const a = new Audio(url);
  a.volume = loadAzanVolume();
  a.preload = "auto";
  /* iOS WebKit: hint inline playback (video uses playsinline; harmless on Audio). */
  a.setAttribute("playsinline", "");
  try {
    a.load();
  } catch {
    /* ignore */
  }
  currentAudio = a;

  const m = meta ?? { title: "Azan", artist: "Call to Prayer Sweden" };
  applyMediaSession(m.title, m.artist);
  void acquireWakeLock();
  emitPlayback(true);

  const onEnd = (): void => {
    if (session !== azanSession) return;
    progressListener?.(null);
    releaseWakeLock();
    clearMediaSession();
    if (currentAudio === a) currentAudio = null;
    emitPlayback(false);
  };

  let failureReported = false;
  const onPlaybackFailed = (): void => {
    if (session !== azanSession || failureReported) return;
    failureReported = true;
    progressListener?.(null);
    releaseWakeLock();
    clearMediaSession();
    if (currentAudio === a) currentAudio = null;
    emitPlayback(false);
    onPlaybackError?.();
  };

  a.addEventListener("ended", onEnd);
  a.addEventListener("error", () => onPlaybackFailed());

  const emitProgress = (): void => {
    if (session !== azanSession) return;
    const d = a.duration;
    progressListener?.({
      currentTime: a.currentTime,
      duration: Number.isFinite(d) && d > 0 ? d : 0,
    });
  };
  a.addEventListener("timeupdate", emitProgress);
  a.addEventListener("loadedmetadata", emitProgress);
  progressListener?.({ currentTime: 0, duration: 0 });

  void a.play().catch(() => {
    onPlaybackFailed();
  });
}

export function seekAzan(seconds: number): void {
  if (!currentAudio || !Number.isFinite(seconds)) return;
  try {
    const d = currentAudio.duration;
    const max =
      Number.isFinite(d) && d > 0 ? d : Number.POSITIVE_INFINITY;
    currentAudio.currentTime = Math.max(0, Math.min(seconds, max));
  } catch {
    /* ignore */
  }
}

export function stopAzan(): void {
  azanSession++;
  progressListener?.(null);
  if (!currentAudio) {
    releaseWakeLock();
    clearMediaSession();
    emitPlayback(false);
    return;
  }
  currentAudio.pause();
  currentAudio.src = "";
  currentAudio = null;
  releaseWakeLock();
  clearMediaSession();
  emitPlayback(false);
}
