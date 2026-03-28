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

function capitalizeCity(city: string): string {
  return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
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

/**
 * Bönetider från Islamiska förbundets webb-widget — samma underliggande källa
 * som appen Muslimens Kompanjon (IF i Sverige). Anrop går via Vite-proxy
 * (`/api/bonetider`) så att webbläsaren slipper CORS-blockering.
 */
export async function fetchPrayerTimes(
  city: string,
  date: Date = new Date()
): Promise<PrayerDay> {
  const params = new URLSearchParams({
    ifis_bonetider_widget_city: `${capitalizeCity(city.trim())}, SE`,
    ifis_bonetider_widget_date: formatDateYMD(date),
  });

  const res = await fetch("/api/bonetider", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Kunde inte hämta bönetider (${res.status})`);
  }

  const html = await res.text();
  const matches = html.match(/\d{2}:\d{2}/g);

  if (!matches || matches.length !== 6) {
    throw new Error(
      `Inga bönetider hittades för ${city}. Kontrollera stadsnamnet.`
    );
  }

  const schedule = PRAYER_KEYS.reduce((acc, key, i) => {
    acc[key] = matches[i]!;
    return acc;
  }, {} as PrayerSchedule);

  return {
    city: capitalizeCity(city.trim()),
    date: formatDateYMD(date),
    schedule,
  };
}

export const SWEDISH_CITIES = [
  "Stockholm",
  "Göteborg",
  "Malmö",
  "Uppsala",
  "Västerås",
  "Örebro",
  "Linköping",
  "Helsingborg",
  "Jönköping",
  "Norrköping",
  "Lund",
  "Umeå",
  "Gävle",
  "Borås",
  "Sundsvall",
  "Eskilstuna",
  "Karlstad",
  "Halmstad",
  "Växjö",
  "Luleå",
] as const;
