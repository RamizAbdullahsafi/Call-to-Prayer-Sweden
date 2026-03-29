import { SWEDISH_MUNICIPALITIES } from "./data/swedishMunicipalities";

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

/** Six times in order Fajr … Isha from bönetider widget HTML (one HH:MM per `<li>`). */
function extractPrayerTimesFromWidgetHtml(html: string): string[] {
  const trimmed = html.trim();
  if (
    trimmed.length < 20 ||
    !/<li\b/i.test(trimmed) ||
    /<ul[^>]*>\s*<\/ul>/i.test(trimmed)
  ) {
    throw new Error("PRAYER_TIMES_EMPTY");
  }

  const liBlocks = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) ?? [];
  const times: string[] = [];
  for (const li of liBlocks) {
    const span = li.match(/<span[^>]*>(\d{2}:\d{2})<\/span>/i);
    if (span) {
      times.push(span[1]!);
      continue;
    }
    const inLi = li.match(/\b(\d{2}:\d{2})\b/);
    if (inLi) times.push(inLi[1]!);
  }
  if (times.length === 6) return times;

  const loose = html.match(/\d{2}:\d{2}/g);
  if (loose && loose.length >= 6) return loose.slice(0, 6);

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
  let times: string[];
  try {
    times = extractPrayerTimesFromWidgetHtml(html);
  } catch (e) {
    if (e instanceof Error && e.message === "PRAYER_TIMES_EMPTY") {
      throw new Error("PRAYER_TIMES_EMPTY");
    }
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

export { SWEDISH_MUNICIPALITIES };
