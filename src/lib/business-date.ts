/**
 * Calendar-date handling for the business timezone (Asia/Dhaka).
 *
 * The app records *calendar dates* ("the 1st of August"), not instants. Three
 * rules keep that unambiguous regardless of where the server runs:
 *
 *  1. A calendar date travels as a `yyyy-MM-dd` string — the value an
 *     `<input type="date">` already produces.
 *  2. It is stored as UTC midnight of that day. `new Date('2026-08-01')`
 *     already parses to UTC midnight, so this matches every row written
 *     before this module existed.
 *  3. `month`/`year` are read straight off the string. Deriving them with
 *     `date.getMonth()` used the *server's* timezone: on any host west of
 *     UTC, an expense dated the 1st was filed to the previous month.
 *
 * "Today" is likewise the current calendar date in Dhaka, not `toISOString()`,
 * which returns the previous day between 00:00 and 06:00 local time.
 */

import { formatInTimeZone } from 'date-fns-tz';

export const BUSINESS_TIMEZONE = 'Asia/Dhaka';

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CalendarParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Parse a `yyyy-MM-dd` string, rejecting malformed input and impossible days
 * such as `2026-02-31` (which `new Date()` would silently roll into March).
 */
export function parseCalendarDate(value: string | null | undefined): CalendarParts | null {
  if (!value) return null;

  const match = CALENDAR_DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Round-trip through UTC to reject days that don't exist in that month.
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/** `yyyy-MM-dd` → the UTC-midnight instant stored in the database. */
export function calendarDateToDate(value: string | null | undefined): Date | null {
  const parts = parseCalendarDate(value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

/** A stored date → the `yyyy-MM-dd` it represents in the business timezone. */
export function toCalendarDate(value: Date | string): string {
  return formatInTimeZone(new Date(value), BUSINESS_TIMEZONE, 'yyyy-MM-dd');
}

/** Today's calendar date in the business timezone, as `yyyy-MM-dd`. */
export function businessToday(): string {
  return toCalendarDate(new Date());
}

/** The `{ year, month }` a stored date belongs to in the business timezone. */
export function periodOf(value: Date | string): { year: number; month: number } {
  const parts = parseCalendarDate(toCalendarDate(value));
  // toCalendarDate always emits a well-formed date, so this cannot be null.
  return { year: parts!.year, month: parts!.month };
}

/**
 * Inclusive UTC bounds covering every calendar day of the given month, matching
 * how `calendarDateToDate` anchors stored rows.
 */
export function monthBounds(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

/**
 * The date an entry form should open on for the period being viewed: today
 * when that period is the current month, otherwise the first of the month, so
 * a new entry always lands in the period the user is looking at.
 */
export function defaultEntryDate(year: number, month: number): string {
  const today = businessToday();
  const parts = parseCalendarDate(today);
  if (parts && parts.year === year && parts.month === month) {
    return today;
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
