import type { MessageId } from "./i18n/messages";
import { formatLocaleDigits } from "./i18n/localeNumbers";

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

/** Arabic — Islamic month names */
const MONTH_NAMES_AR = [
  "المحرّم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوّال",
  "ذو القعدة",
  "ذو الحجّة",
];

/** Persian */
const MONTH_NAMES_FA = [
  "محرم",
  "صفر",
  "ربیع‌الاول",
  "ربیع‌الثانی",
  "جمادی‌الاول",
  "جمادی‌الثانی",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذوالقعده",
  "ذوالحجه",
];

/** Kurmanjî (Latin) */
const MONTH_NAMES_KU = [
  "Muharram",
  "Safar",
  "Rebîa yekem",
  "Rebîa duyem",
  "Cemazîyê yekem",
  "Cemazîyê duyem",
  "Receb",
  "Şaban",
  "Remezan",
  "Şewal",
  "Zilqade",
  "Zilhicce",
];

/** Somali (Latin) */
const MONTH_NAMES_SO = [
  "Muharram",
  "Safar",
  "Rabi'ul-awal",
  "Rabi'ul-thani",
  "Jumadil-awal",
  "Jumadil-thani",
  "Rajab",
  "Sha'baan",
  "Ramadaan",
  "Shawwal",
  "Dulqacdah",
  "Dulhijjah",
];

function monthNamesForLocale(locale: string): string[] {
  const lang = locale.split("-")[0]?.toLowerCase() ?? "en";
  switch (lang) {
    case "sv":
      return MONTH_NAMES_SV;
    case "ar":
      return MONTH_NAMES_AR;
    case "fa":
      return MONTH_NAMES_FA;
    case "ku":
      return MONTH_NAMES_KU;
    case "so":
      return MONTH_NAMES_SO;
    default:
      return MONTH_NAMES_EN;
  }
}

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
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(adjustedDate);

    day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
    month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
    const yearStr = parts.find((p) => p.type === "year")?.value ?? "1445";
    year = Number(yearStr.replace(/\D/g, ""));
  } catch {
    /* keep defaults */
  }

  const names = monthNamesForLocale(locale);
  const monthName = names[Math.max(0, Math.min(11, month - 1))]!;

  const dayStr = formatLocaleDigits(day, locale);
  const yearStr = formatLocaleDigits(year, locale);
  const label = `${dayStr} ${monthName} ${yearStr}`;

  return {
    day,
    month,
    year,
    monthName,
    label,
  };
}

/** i18n key for optional Hijri “important day” line, or null. */
export function hijriImportantDayKey(info: HijriInfo): MessageId | null {
  if (info.month === 9 && info.day === 1) return "hijriEvent.ramadanStart";
  if (info.month === 9 && info.day === 27) return "hijriEvent.laylatQadr";
  if (info.month === 10 && info.day === 1) return "hijriEvent.eidFitr";
  if (info.month === 12 && info.day === 9) return "hijriEvent.arafah";
  if (info.month === 12 && info.day === 10) return "hijriEvent.eidAdha";
  return null;
}
