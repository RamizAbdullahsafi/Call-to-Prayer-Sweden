import type { PrayerKey } from "./prayerTimes";

const STORAGE_VOICE = "ctp.adhan.voice";
const STORAGE_PLAY = "ctp.adhan.play";
const STORAGE_VOLUME = "ctp.adhan.volume";
const STORAGE_ADHAN_KEYS = "ctp.adhan.prayerKeys";

export type AdhanVoiceDef = {
  id: string;
  label: string;
  reciter: string;
  url: string;
  sourceNote?: string;
};

/**
 * Mishary Alafasy and other muezzins: public MP3s from AlAdhan’s CDN
 * (same files as https://www.aladhan.com/download-adhans).
 */
const ALADHAN_VOICES: AdhanVoiceDef[] = [
  {
    id: "mishary-dubai",
    label: "Dubai One TV",
    reciter: "Mishary Rashid Alafasy",
    url: "https://cdn.aladhan.com/audio/adhans/a4.mp3",
    sourceNote: "AlAdhan",
  },
  {
    id: "mishary-yet-another",
    label: "Yet another recording",
    reciter: "Mishary Rashid Alafasy",
    url: "https://cdn.aladhan.com/audio/adhans/a9.mp3",
    sourceNote: "AlAdhan",
  },
  {
    id: "mishary-alt",
    label: "Alternate recording",
    reciter: "Mishary Rashid Alafasy",
    url: "https://cdn.aladhan.com/audio/adhans/a7.mp3",
    sourceNote: "AlAdhan",
  },
  {
    id: "ahmad-nafees",
    label: "Full adhan",
    reciter: "Ahmad al-Nafees",
    url: "https://cdn.aladhan.com/audio/adhans/a1.mp3",
    sourceNote: "AlAdhan",
  },
  {
    id: "mustafa-ozcan",
    label: "Turkey",
    reciter: "Hafiz Mustafa Özcan",
    url: "https://cdn.aladhan.com/audio/adhans/a2.mp3",
    sourceNote: "AlAdhan",
  },
  {
    id: "karl-jenkins",
    label: "Mass for Peace (orkester)",
    reciter: "Karl Jenkins (arr.)",
    url: "https://cdn.aladhan.com/audio/adhans/a3.mp3",
    sourceNote: "AlAdhan",
  },
  {
    id: "mansour-zahrani",
    label: "Full adhan",
    reciter: "Mansour Al-Zahrani",
    url: "https://cdn.aladhan.com/audio/adhans/a11-mansour-al-zahrani.mp3",
    sourceNote: "AlAdhan",
  },
];

/** Additional freely licensed recordings (Wikimedia Commons). */
const WIKIMEDIA_VOICES: AdhanVoiceDef[] = [
  {
    id: "sabah-fakhry",
    label: "Klassisk (1985)",
    reciter: "Sabah Fakhri",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Call_to_prayer_by_Sabah_Fakhry.mp3",
    sourceNote: "Wikimedia Commons",
  },
  {
    id: "beautiful-adhan",
    label: "Beautiful adhan",
    reciter: "—",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Beautiful_adhan.ogg",
    sourceNote: "Wikimedia Commons (CC0)",
  },
  {
    id: "adhan-classic",
    label: "Adhan (klassisk inspelning)",
    reciter: "—",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/86/Azan.ogg",
    sourceNote: "Wikimedia Commons (CC BY-SA)",
  },
  {
    id: "islamic-call-worship",
    label: "Islamiskt böneutrop",
    reciter: "Mahfoudou",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Islamic_call_to_worship.oga",
    sourceNote: "Wikimedia Commons (CC BY-SA)",
  },
  {
    id: "aaqib-azeez",
    label: "Sunnah-stil",
    reciter: "Aaqib Azeez",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3",
    sourceNote: "Wikimedia Commons (CC BY-SA)",
  },
];

export const ADHAN_VOICES: AdhanVoiceDef[] = [...ALADHAN_VOICES, ...WIKIMEDIA_VOICES];

const DEFAULT_VOICE_ID = "mishary-dubai";

const ALL_PRAYER_KEYS: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

/** Default: adhan for same prayers as default notifications (usually not Shuruk). */
export const DEFAULT_ADHAN_PRAYER_KEYS: PrayerKey[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

let currentAudio: HTMLAudioElement | null = null;
let wakeLock: WakeLockSentinel | null = null;
let playbackListener: ((playing: boolean) => void) | null = null;
/** Invalidates in-flight playback when stop or new play starts. */
let adhanSession = 0;

export function setAdhanPlaybackListener(
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
      stopAdhan();
    });
  } catch {
    /* ignore */
  }
}

export function loadAdhanPlayEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_PLAY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function saveAdhanPlayEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_PLAY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** 0–1 */
export function loadAdhanVolume(): number {
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

export function saveAdhanVolume(v: number): void {
  const x = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem(STORAGE_VOLUME, String(x));
  } catch {
    /* ignore */
  }
  if (currentAudio) currentAudio.volume = x;
}

export function loadAdhanPrayerKeys(): Set<PrayerKey> {
  try {
    const raw = localStorage.getItem(STORAGE_ADHAN_KEYS);
    if (!raw) return new Set(DEFAULT_ADHAN_PRAYER_KEYS);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set(DEFAULT_ADHAN_PRAYER_KEYS);
    const next = new Set<PrayerKey>();
    for (const k of parsed) {
      if (ALL_PRAYER_KEYS.includes(k as PrayerKey)) next.add(k as PrayerKey);
    }
    return next.size > 0 ? next : new Set(DEFAULT_ADHAN_PRAYER_KEYS);
  } catch {
    return new Set(DEFAULT_ADHAN_PRAYER_KEYS);
  }
}

export function saveAdhanPrayerKeys(keys: Set<PrayerKey>): void {
  try {
    localStorage.setItem(STORAGE_ADHAN_KEYS, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}

export function loadAdhanVoiceId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_VOICE);
    if (raw === "custom") {
      try {
        localStorage.removeItem("ctp.adhan.customUrl");
        localStorage.setItem(STORAGE_VOICE, DEFAULT_VOICE_ID);
      } catch {
        /* ignore */
      }
      return DEFAULT_VOICE_ID;
    }
    if (raw && ADHAN_VOICES.some((v) => v.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_VOICE_ID;
}

export function saveAdhanVoiceId(id: string): void {
  try {
    if (ADHAN_VOICES.some((v) => v.id === id)) {
      localStorage.setItem(STORAGE_VOICE, id);
    }
  } catch {
    /* ignore */
  }
}

function resolveAdhanUrl(voiceId: string): string | null {
  const def = ADHAN_VOICES.find((v) => v.id === voiceId);
  return def?.url ?? null;
}

function getVoiceMeta(voiceId: string): { title: string; artist: string } {
  const def = ADHAN_VOICES.find((v) => v.id === voiceId);
  if (def) return { title: "Adhan", artist: `${def.reciter} — ${def.label}` };
  return { title: "Adhan", artist: "Call to Prayer Sweden" };
}

export function playAdhanFromVoiceId(
  voiceId: string,
  onPlaybackError?: () => void
): void {
  const url = resolveAdhanUrl(voiceId);
  if (url) playAdhanUrl(url, getVoiceMeta(voiceId), onPlaybackError);
}

export function playAdhanUrl(
  url: string,
  meta?: { title: string; artist: string },
  onPlaybackError?: () => void
): void {
  stopAdhan();
  const session = adhanSession;
  const a = new Audio(url);
  a.volume = loadAdhanVolume();
  a.preload = "auto";
  currentAudio = a;

  const m = meta ?? { title: "Adhan", artist: "Call to Prayer Sweden" };
  applyMediaSession(m.title, m.artist);
  void acquireWakeLock();
  emitPlayback(true);

  const onEnd = (): void => {
    if (session !== adhanSession) return;
    releaseWakeLock();
    clearMediaSession();
    if (currentAudio === a) currentAudio = null;
    emitPlayback(false);
  };

  let failureReported = false;
  const onPlaybackFailed = (): void => {
    if (session !== adhanSession || failureReported) return;
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

export function stopAdhan(): void {
  adhanSession++;
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
