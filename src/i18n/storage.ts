import { LOCALES, type Locale } from "./types";

const STORAGE_KEY = "ctp.locale";

export function getStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (LOCALES as readonly string[]).includes(v)) return v as Locale;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

function browserLocale(): Locale {
  const langs = [
    navigator.language,
    ...(navigator.languages ?? []),
  ];
  for (const raw of langs) {
    const base = raw.split("-")[0]?.toLowerCase() ?? "";
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return "sv";
}

export function getInitialLocale(): Locale {
  return getStoredLocale() ?? browserLocale();
}
