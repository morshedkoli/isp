/**
 * Shared "which month/year am I looking at" logic.
 *
 * Kept edge-safe (no `next/headers`) so it can be imported from both
 * `proxy.ts` (Edge Middleware, which syncs the cookie from the URL on every
 * navigation) and server/client components. See `period-server.ts` for the
 * server-component-only cookie reader.
 */

export const PERIOD_COOKIE = 'selected_period';
export const PERIOD_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Abbreviated month names, for dense UI like CSV headers and chips. */
export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export interface Period {
  year: number;
  month: number;
}

export function isValidPeriod(year: number, month: number): boolean {
  return (
    Number.isInteger(year) && year >= 2000 && year <= 2100 &&
    Number.isInteger(month) && month >= 1 && month <= 12
  );
}

/** 1-indexed month → "October". Falls back to an empty string when out of range. */
export function monthName(month: number): string {
  return MONTHS[month - 1] ?? '';
}

/** "October 2026" */
export function formatPeriod(year: number, month: number): string {
  return `${monthName(month)} ${year}`;
}

/** "2026-10" — stable, sortable key used for CSV filenames and cookie storage. */
export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Year options for a period selector: every year that has data, plus the
 * current year and the selected one, so a manually-chosen year is never
 * missing from its own dropdown.
 */
export function buildYearOptions(availablePeriods: Period[], selectedYear: number): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from(
    new Set([...availablePeriods.map((p) => p.year), currentYear, selectedYear]),
  ).sort((a, b) => b - a);
}

/** Newest-first sort for a list of periods. */
export function sortPeriodsDesc(periods: Period[]): Period[] {
  return [...periods].sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
}

/**
 * Resolve the period a page should render, given URL params and fallbacks.
 * An explicitly-chosen period always wins, even if it has no data yet —
 * only missing/malformed params fall through to the stored or default period.
 */
export function resolvePeriod(
  rawYear: string | undefined,
  rawMonth: string | undefined,
  fallbacks: (Period | null | undefined)[],
): Period {
  const year = rawYear !== undefined ? parseInt(rawYear, 10) : NaN;
  const month = rawMonth !== undefined ? parseInt(rawMonth, 10) : NaN;
  if (isValidPeriod(year, month)) {
    return { year, month };
  }

  for (const fallback of fallbacks) {
    if (fallback && isValidPeriod(fallback.year, fallback.month)) {
      return fallback;
    }
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Inclusive start/end Date bounds for a period, in server-local time. */
export function periodBounds(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export function parsePeriodCookie(raw: string | undefined | null): Period | null {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{1,2})$/.exec(raw);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  return isValidPeriod(year, month) ? { year, month } : null;
}
