import { hijriFromGregorian, type HijriInfo } from "./hijri";

export type HijriMonthCell = {
  hijriDay: number;
  gregorian: Date;
};

/** Walk back to the first day of the Hijri month containing `anchor`. */
export function findFirstDayOfHijriMonth(anchor: Date, locale: string): Date {
  const d = new Date(anchor);
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 40; i++) {
    const h = hijriFromGregorian(d, locale);
    if (h.day === 1) return d;
    d.setDate(d.getDate() - 1);
  }
  return new Date(anchor);
}

/** All days in the Hijri month that contains `anchor`. */
export function listDaysInHijriMonth(anchor: Date, locale: string): HijriMonthCell[] {
  const first = findFirstDayOfHijriMonth(anchor, locale);
  const d = new Date(first);
  const h0 = hijriFromGregorian(d, locale);
  const out: HijriMonthCell[] = [];
  for (let i = 0; i < 35; i++) {
    const h = hijriFromGregorian(d, locale);
    if (h.year !== h0.year || h.month !== h0.month) break;
    out.push({ hijriDay: h.day, gregorian: new Date(d) });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Last Gregorian day inside the same Hijri month as `anchor`. */
export function lastDayOfHijriMonth(anchor: Date, locale: string): Date {
  const days = listDaysInHijriMonth(anchor, locale);
  return days.length > 0 ? days[days.length - 1]!.gregorian : anchor;
}

/** Move to first day of previous / next Hijri month (as a Gregorian Date). */
export function shiftHijriMonth(anchor: Date, delta: -1 | 1, locale: string): Date {
  const d = new Date(anchor);
  d.setHours(12, 0, 0, 0);
  if (delta === 1) {
    const last = lastDayOfHijriMonth(d, locale);
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    return next;
  }
  const first = findFirstDayOfHijriMonth(d, locale);
  const prev = new Date(first);
  prev.setDate(prev.getDate() - 1);
  return prev;
}

/** Month title + weekday-aligned grid (Mon-first), null = empty cell. */
export function buildHijriMonthGrid(
  anchor: Date,
  locale: string
): {
  monthTitle: string;
  year: number;
  month: number;
  cells: (HijriMonthCell | null)[];
  weekdayLabels: string[];
} {
  const first = findFirstDayOfHijriMonth(anchor, locale);
  const h = hijriFromGregorian(first, locale);
  const days = listDaysInHijriMonth(anchor, locale);

  const monthTitle = new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
    month: "long",
    year: "numeric",
  }).format(first);

  const firstDowMon0 = (first.getDay() + 6) % 7;
  const cells: (HijriMonthCell | null)[] = [];
  for (let i = 0; i < firstDowMon0; i++) cells.push(null);
  for (const cell of days) cells.push(cell);
  const totalCells = Math.ceil(cells.length / 7) * 7;
  while (cells.length < totalCells) cells.push(null);

  const weekdayLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const ref = new Date(2024, 0, 1 + i);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(ref);
  });

  return {
    monthTitle,
    year: h.year,
    month: h.month,
    cells,
    weekdayLabels,
  };
}

export function hijriInfoForCell(cell: HijriMonthCell, locale: string): HijriInfo {
  return hijriFromGregorian(cell.gregorian, locale);
}
