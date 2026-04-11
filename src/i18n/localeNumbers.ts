/**
 * Format integers with the numbering system customary for `locale`
 * (e.g. Eastern Arabic digits for `ar`, Persian for `fa`).
 */
export function formatLocaleDigits(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
      useGrouping: false,
    }).format(value);
  } catch {
    try {
      return new Intl.NumberFormat("en", {
        maximumFractionDigits: 0,
        useGrouping: false,
      }).format(value);
    } catch {
      return String(value);
    }
  }
}
