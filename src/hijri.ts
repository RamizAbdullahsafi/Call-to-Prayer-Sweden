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
  let day = 1;
  let month = 1;
  let year = 1445;
  let monthName = MONTH_NAMES[0]!;
  let label = `${day} ${monthName} ${year}`;

  try {
    try {
      const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }).formatToParts(date);

      day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
      month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
      year = Number(parts.find((p) => p.type === "year")?.value ?? "1445");
    } catch {
      /* ignore - uses defaults */
    }

    try {
      monthName =
        new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
          month: "long",
        }).format(date);
    } catch {
      try {
        // Fallback to English if the specific locale-u-ca combo fails
        monthName = new Intl.DateTimeFormat(`en-u-ca-islamic-umalqura`, {
          month: "long",
        }).format(date);
      } catch {
        monthName = MONTH_NAMES[Math.max(0, Math.min(11, month - 1))]!;
      }
    }

    try {
      label = new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      try {
        // Fallback to English if the specific locale-u-ca combo fails
        label = new Intl.DateTimeFormat(`en-u-ca-islamic-umalqura`, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date);
      } catch {
        label = `${day} ${monthName} ${year}`;
      }
    }
  } catch {
    /* Fallback if Intl or Islamic calendar is completely unsupported */
  }

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
