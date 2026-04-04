import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { MESSAGES, type MessageId } from "./messages";
import { getInitialLocale, saveLocale } from "./storage";
import { LOCALE_HTML_LANG, RTL_LOCALES, type Locale } from "./types";

function interpolate(
  template: string | undefined,
  vars?: Record<string, string | number>
): string {
  if (typeof template !== "string") return "";
  if (!vars) return template;
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v));
  }
  return s;
}

export type TFunction = (
  id: MessageId,
  vars?: Record<string, string | number>
) => string;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }): ReactElement {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setLocaleState(next);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
    document.documentElement.dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";
  }, [locale]);

  const t = useMemo((): TFunction => {
    const table = MESSAGES[locale] || {};
    return (id, vars) => {
      const val = table[id];
      if (val === undefined) {
        return id;
      }
      return interpolate(val, vars);
    };
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
