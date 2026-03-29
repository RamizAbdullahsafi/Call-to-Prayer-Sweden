export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export type PrayerSchedule = Record<PrayerKey, string>;

export type PrayerDay = {
  city: string;
  date: string;
  schedule: PrayerSchedule;
};


const PRAYER_KEYS: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

/**
 * Format ort for Islamiska förbundets widget: Swedish title case per word
 * (e.g. Upplands Väsby, Dals-Ed), matching how locations are entered on their site.
 */
export function formatCityForWidget(city: string): string {
  const raw = city.trim();
  if (!raw) return raw;
  return raw
    .split(/(\s+|-)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (part === "-") return part;
      if (part.length === 0) return part;
      const lower = part.toLocaleLowerCase("sv-SE");
      return (
        lower.charAt(0).toLocaleUpperCase("sv-SE") + lower.slice(1)
      );
    })
    .join("");
}

/** Six times in order Fajr … Isha from bönetider widget HTML (one HH:MM per `<li>`). */
function extractPrayerTimesFromWidgetHtml(html: string): string[] {
  const liBlocks = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) ?? [];
  const times: string[] = [];
  for (const li of liBlocks) {
    const span = li.match(/<span[^>]*>(\d{2}:\d{2})<\/span>/i);
    if (span) times.push(span[1]!);
  }
  if (times.length === 6) return times;

  const loose = html.match(/\d{2}:\d{2}/g);
  if (loose && loose.length >= 6) return loose.slice(0, 6);

  throw new Error("Inga bönetider kunde läsas ur svaret.");
}

export function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar day match (user’s timezone). */
export function isLocalDateToday(d: Date): boolean {
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

/** Wall-clock instant for one prayer on the loaded schedule date. */
export function prayerInstant(day: PrayerDay, key: PrayerKey): Date {
  const [h, m] = day.schedule[key].split(":").map(Number);
  const d = new Date(day.date + "T12:00:00");
  d.setHours(h!, m!, 0, 0);
  return d;
}

function bonetiderFetchUrl(): string {
  const raw = import.meta.env.VITE_API_ORIGIN?.trim() ?? "";
  const base = raw.replace(/\/$/, "");
  return base.length > 0 ? `${base}/api/bonetider` : "/api/bonetider";
}

/**
 * Bönetider från Islamiska förbundets webb-widget (IF i Sverige). På webb går
 * anrop via `/api/bonetider`
 * (Vite-proxy lokalt, Netlify Function i produktion). För Android bygger du med
 * `VITE_API_ORIGIN=https://din-sida.netlify.app` så anropen träffar samma backend.
 */
export async function fetchPrayerTimes(
  city: string,
  date: Date = new Date()
): Promise<PrayerDay> {
  const place = formatCityForWidget(city);
  const params = new URLSearchParams({
    ifis_bonetider_widget_city: `${place}, SE`,
    ifis_bonetider_widget_date: formatDateYMD(date),
  });

  const res = await fetch(bonetiderFetchUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`PRAYER_TIMES_HTTP_${res.status}`);
  }

  const html = await res.text();
  let times: string[];
  try {
    times = extractPrayerTimesFromWidgetHtml(html);
  } catch {
    throw new Error("PRAYER_TIMES_PARSE");
  }

  const schedule = PRAYER_KEYS.reduce((acc, key, i) => {
    acc[key] = times[i]!;
    return acc;
  }, {} as PrayerSchedule);

  return {
    city: place,
    date: formatDateYMD(date),
    schedule,
  };
}

export { SWEDISH_MUNICIPALITIES } from "./data/swedishMunicipalities";
