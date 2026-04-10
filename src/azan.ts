import { Capacitor } from "@capacitor/core";
import type { PrayerKey } from "./prayerTimes";

const STORAGE_VOICE = "ctp.azan.voice";
const STORAGE_PLAY = "ctp.azan.play";
const STORAGE_VOLUME = "ctp.azan.volume";
const STORAGE_ADHAN_KEYS = "ctp.azan.prayerKeys";

export type AzanVoiceDef = {
  id: string;
  label: string;
  reciter: string;
  /** Filename under `public/audio/` and `android/.../res/raw/` (offline). */
  offlineFile: string;
  sourceNote?: string;
};

/** Android [AzanPlaybackService] prefix for [R.raw] lookup (basename of offlineFile). */
export const RAW_ASSET_PREFIX = "asset://raw/";

export function webAudioPath(offlineFile: string): string {
  return `/audio/${offlineFile}`;
}

export function androidRawAssetUrl(offlineFile: string): string {
  const base = offlineFile.replace(/\.[^.]+$/, "");
  return `${RAW_ASSET_PREFIX}${base}`;
}

/** Voice ids removed from the picker; map to default on load. */
const RETIRED_AZAN_VOICE_IDS = new Set(["bundled-offline", "beautiful-adhan"]);

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
          id: "mishary-dubai",
          label: "Dubai One TV",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_dubai.mp3",
          sourceNote: "Bundled; AlAdhan",
        },
        {
          id: "mishary-yet-another",
          label: "Long studio recording",
          reciter: "Mishary Rashid Alafasy",
          offlineFile: "mishary_yet_another.mp3",
          sourceNote: "Bundled; AlAdhan",
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
          id: "islamic-call-worship",
          label: "Islamic call to worship",
          reciter: "Mahfoudou",
          offlineFile: "islamic_call_worship.oga",
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

const DEFAULT_VOICE_ID = "mishary-yet-another";

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
/** Invalidate in-flight playback when stop or new play starts. */
let azanSession = 0;

export function setAzanPlaybackListener(
  cb: ((playing: boolean) => void) | null
): void {
  playbackListener = cb;
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

function resolveAzanUrl(voiceId: string): string | null {
  const def = AZAN_VOICES.find((v) => v.id === voiceId);
  return def ? webAudioPath(def.offlineFile) : null;
}

/** Playback URL for the selected voice (WebView path or Android raw asset). */
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
  const url = resolveAzanUrl(voiceId);
  if (url) playAzanUrl(url, getVoiceMeta(voiceId), onPlaybackError);
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
  currentAudio = a;

  const m = meta ?? { title: "Azan", artist: "Call to Prayer Sweden" };
  applyMediaSession(m.title, m.artist);
  void acquireWakeLock();
  emitPlayback(true);

  const onEnd = (): void => {
    if (session !== azanSession) return;
    releaseWakeLock();
    clearMediaSession();
    if (currentAudio === a) currentAudio = null;
    emitPlayback(false);
  };

  let failureReported = false;
  const onPlaybackFailed = (): void => {
    if (session !== azanSession || failureReported) return;
    failureReported = true;
    releaseWakeLock();
    clearMediaSession();
    if (currentAudio === a) currentAudio = null;
    emitPlayback(false);
    onPlaybackError?.();
  };

  a.addEventListener("ended", onEnd);
  a.addEventListener("error", () => onPlaybackFailed());

  void a.play().catch(() => {
    onPlaybackFailed();
  });
}

export function stopAzan(): void {
  azanSession++;
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
