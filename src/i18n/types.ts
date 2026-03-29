export type Locale = "sv" | "en" | "ar" | "fa" | "ku" | "so";

export const LOCALES: Locale[] = ["sv", "en", "ar", "fa", "ku", "so"];

/** BCP 47 / HTML lang */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  sv: "sv",
  en: "en",
  ar: "ar",
  fa: "fa",
  ku: "ku",
  so: "so",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  sv: "Svenska",
  en: "English",
  ar: "العربية",
  fa: "فارسی",
  ku: "Kurdî (Kurmancî)",
  so: "Soomaali",
};

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar", "fa"]);
