export type HijriInfo = {
  day: number;
  month: number;
  year: number;
  monthName: string;
  label: string;
};

const MONTH_NAMES = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qadah",
  "Dhu al-Hijjah",
];

export function hijriFromGregorian(date: Date, locale: string = "en"): HijriInfo {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);

  const day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "1440");
  const monthName =
    new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
      month: "long",
    }).format(date) || MONTH_NAMES[Math.max(0, Math.min(11, month - 1))]!;

  const label = new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

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
