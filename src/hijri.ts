export type HijriInfo = {
  day: number;
  month: number;
  year: number;
  monthName: string;
  label: string;
};

const MONTH_NAMES_EN = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qa'dah",
  "Dhu al-Hijjah",
];

const MONTH_NAMES_SV = [
  "Muharram",
  "Safar",
  "Rabi' al-awwal",
  "Rabi' al-thani",
  "Jumada al-ula",
  "Jumada al-akhira",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-qa'da",
  "Dhu al-hijja",
];

export function getHijriOffset(): number {
  try {
    return Number(localStorage.getItem("ctp.hijri.offset") ?? "0");
  } catch {
    return 0;
  }
}

export function saveHijriOffset(offset: number): void {
  try {
    localStorage.setItem("ctp.hijri.offset", offset.toString());
  } catch {
    /* ignore */
  }
}

export function hijriFromGregorian(date: Date, locale: string = "en"): HijriInfo {
  const adjustedDate = new Date(date);
  const offset = getHijriOffset();
  if (offset !== 0) {
    adjustedDate.setDate(adjustedDate.getDate() + offset);
  }

  let day = 1;
  let month = 1;
  let year = 1445;

  try {
    // We use 'en-u-ca-islamic-umalqura' for numeric parts to ensure stability
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(adjustedDate);

    day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
    month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
    // Some environments return year with " AH", so we extract only digits
    const yearStr = parts.find((p) => p.type === "year")?.value ?? "1445";
    year = Number(yearStr.replace(/\D/g, ""));
  } catch {
    // If Intl fails, we could use a simple algorithmic fallback here if needed
  }

  const monthNames = locale.startsWith("sv") ? MONTH_NAMES_SV : MONTH_NAMES_EN;
  const monthName = monthNames[Math.max(0, Math.min(11, month - 1))]!;

  // Construct the label manually to ensure "Islamic Month + Islamic Year"
  const label = `${day} ${monthName} ${year}`;

  return {
    day,
    month,
    year,
    monthName,
    label,
  };
}

export function hijriImportantDay(info: HijriInfo): string | null {
  if (info.month === 9 && info.day === 1) return "Start of Ramadan";
  if (info.month === 9 && info.day === 27) return "Laylat al-Qadr (approx.)";
  if (info.month === 10 && info.day === 1) return "Eid al-Fitr";
  if (info.month === 12 && info.day === 9) return "Day of Arafah";
  if (info.month === 12 && info.day === 10) return "Eid al-Adha";
  return null;
}
