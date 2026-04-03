import { Capacitor } from "@capacitor/core";
import { SWEDISH_MUNICIPALITIES } from "./data/swedishMunicipalities";

/**
 * Live site that hosts `/api/bonetider` (Netlify Function). Used when the app runs
 * in a native WebView, where relative `/api/*` has no server — and as a fallback if
 * `VITE_API_ORIGIN` was not set at build time.
 */
const DEFAULT_PRODUCTION_API_ORIGIN = "https://call-to-prayer-sweden.netlify.app";

function resolveApiOriginBase(): string {
  const fromEnv = import.meta.env.VITE_API_ORIGIN?.trim() ?? "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return DEFAULT_PRODUCTION_API_ORIGIN.replace(/\/$/, "");
  }
  return "";
}

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

/** Rows for the daily schedule; on Fridays inserts Jumu’ah after Dhuhr (same published time as Dhuhr from IF). */
export type ScheduleRow =
  | { kind: "prayer"; key: PrayerKey }
  | { kind: "jumuah"; time: string };

export function buildScheduleRows(day: PrayerDay, date: Date): ScheduleRow[] {
  const rows: ScheduleRow[] = PRAYER_KEYS.map((key) => ({
    kind: "prayer",
    key,
  }));
  if (date.getDay() === 5) {
    const idx = rows.findIndex(
      (r) => r.kind === "prayer" && r.key === "dhuhr"
    );
    if (idx >= 0) {
      rows.splice(idx + 1, 0, {
        kind: "jumuah",
        time: day.schedule.dhuhr,
      });
    }
  }
  return rows;
}

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

/** Remove duplicate country suffix if user pasted "Ort, SE". */
function stripCountrySuffix(raw: string): string {
  return raw
    .replace(/,\s*(SE|Sweden|Sverige)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase å/ä/ö for fuzzy match to official municipality names. */
function foldSv(s: string): string {
  return s
    .toLocaleLowerCase("sv-SE")
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o");
}

/** Common English (or ASCII) spellings → canonical name in SWEDISH_MUNICIPALITIES. */
const ENGLISH_TO_MUNICIPALITY: Record<string, string> = {
  gothenburg: "Göteborg",
  goteborg: "Göteborg",
  gothenberg: "Göteborg",
  stockholm: "Stockholm",
  malmo: "Malmö",
  uppsala: "Uppsala",
  linkoping: "Linköping",
  norrkoping: "Norrköping",
  jonkoping: "Jönköping",
  orebro: "Örebro",
  vastervik: "Västervik",
  helsingborg: "Helsingborg",
  lund: "Lund",
  umea: "Umeå",
  gavle: "Gävle",
  boras: "Borås",
  eskilstuna: "Eskilstuna",
  halmstad: "Halmstad",
  kalmar: "Kalmar",
  karlstad: "Karlstad",
  kristianstad: "Kristianstad",
  lulea: "Luleå",
  sodertalje: "Södertälje",
  trelleborg: "Trelleborg",
  uddevalla: "Uddevalla",
  varnamo: "Värnamo",
  vasteras: "Västerås",
  falun: "Falun",
  visby: "Gotland",
  ystad: "Ystad",
};

/**
 * Map free-text city to a name the IF widget understands (official seat / common ort).
 * Handles English names, optional ", SE", å/ä/ö vs ASCII, and unique prefix matches.
 */
export function resolveCityForWidget(city: string): string {
  const stripped = stripCountrySuffix(city.trim());
  if (!stripped) return "";
  const formatted = formatCityForWidget(stripped);

  const alias = ENGLISH_TO_MUNICIPALITY[foldSv(formatted)];
  if (alias) {
    const found = SWEDISH_MUNICIPALITIES.find((m) => m === alias);
    if (found) return found;
  }

  for (const m of SWEDISH_MUNICIPALITIES) {
    if (foldSv(m) === foldSv(formatted)) return m;
  }

  const f = foldSv(formatted);
  if (f.length >= 5) {
    const prefixed = SWEDISH_MUNICIPALITIES.filter((m) =>
      foldSv(m).startsWith(f)
    );
    if (prefixed.length === 1) return prefixed[0]!;
  }

  return formatted;
}

function normalizeLabel(input: string): string {
  return input
    .toLocaleLowerCase("sv-SE")
    .replace(/[\u2019'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function prayerKeyFromLabel(label: string): PrayerKey | null {
  const l = normalizeLabel(label);
  if (l.includes("fajr")) return "fajr";
  if (
    l.includes("shuruk") ||
    l.includes("shuruq") ||
    l.includes("sunrise") ||
    l.includes("soluppgang")
  ) {
    return "sunrise";
  }
  if (
    l.includes("dhohr") ||
    l.includes("dhuhr") ||
    l.includes("zuhr") ||
    l.includes("zohor") ||
    l.includes("middag")
  ) {
    return "dhuhr";
  }
  if (l.includes("asr")) return "asr";
  if (l.includes("magrib") || l.includes("maghrib")) return "maghrib";
  if (l.includes("isha") || l.includes("isha'a")) return "isha";
  return null;
}

/** Parse IF widget rows by prayer label (stable even if extra rows are inserted). */
function extractPrayerTimesFromWidgetHtml(html: string): PrayerSchedule {
  const trimmed = html.trim();
  if (
    trimmed.length < 20 ||
    !/<li\b/i.test(trimmed) ||
    /<ul[^>]*>\s*<\/ul>/i.test(trimmed)
  ) {
    throw new Error("PRAYER_TIMES_EMPTY");
  }

  const liBlocks = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) ?? [];
  const out: Partial<PrayerSchedule> = {};
  for (const li of liBlocks) {
    const timeMatch =
      li.match(/<span[^>]*>\s*(\d{2}:\d{2})\s*<\/span>/i) ??
      li.match(/\b(\d{2}:\d{2})\b/);
    if (!timeMatch) continue;
    const time = timeMatch[1]!;

    // Remove tags, punctuation, and trailing time to isolate the label.
    const text = li.replace(/<[^>]*>/g, " ");
    const label = text
      .replace(/\d{2}:\d{2}/g, " ")
      .replace(/[—–-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const key = prayerKeyFromLabel(label);
    if (key && !out[key]) out[key] = time;
  }

  if (
    out.fajr &&
    out.sunrise &&
    out.dhuhr &&
    out.asr &&
    out.maghrib &&
    out.isha
  ) {
    return out as PrayerSchedule;
  }
  throw new Error("PRAYER_TIMES_PARSE");
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
  const base = resolveApiOriginBase();
  if (base.length > 0) return `${base}/api/bonetider`;
  return "/api/bonetider";
}

/**
 * Absolute bönetider URL for persistence / Android background worker.
 * Empty only on web when no env and not native (uses relative `/api/bonetider` instead).
 */
export function getAbsoluteBonetiderFetchUrl(): string {
  const base = resolveApiOriginBase();
  return base.length > 0 ? `${base}/api/bonetider` : "";
}

/**
 * Bönetider från Islamiska förbundets webb-widget (IF i Sverige). På webb går
 * anrop via `/api/bonetider`
 * (Vite-proxy lokalt, Netlify Function i produktion). För Android bygger du med
 * `VITE_API_ORIGIN=https://din-sida.netlify.app` så anropen träffar samma backend.
 * Native builds fall back to the default Netlify origin if env is unset.
 */
export async function fetchPrayerTimes(
  city: string,
  date: Date = new Date()
): Promise<PrayerDay> {
  const place = resolveCityForWidget(city);
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
  let schedule: PrayerSchedule;
  try {
    schedule = extractPrayerTimesFromWidgetHtml(html);
  } catch (e) {
    if (e instanceof Error && e.message === "PRAYER_TIMES_EMPTY") {
      throw new Error("PRAYER_TIMES_EMPTY");
    }
    throw new Error("PRAYER_TIMES_PARSE");
  }

  return {
    city: place,
    date: formatDateYMD(date),
    schedule,
  };
}

export { SWEDISH_MUNICIPALITIES };
