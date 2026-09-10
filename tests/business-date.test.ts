import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDateToDate,
  defaultEntryDate,
  monthBounds,
  parseCalendarDate,
  periodOf,
  toCalendarDate,
} from '../src/lib/business-date';

test('parses a well-formed calendar date', () => {
  assert.deepEqual(parseCalendarDate('2026-08-01'), { year: 2026, month: 8, day: 1 });
});

test('rejects malformed and impossible calendar dates', () => {
  for (const bad of ['', '2026-8-1', '26-08-01', 'not-a-date', '2026-13-01', '2026-02-31', '2026-04-31']) {
    assert.equal(parseCalendarDate(bad), null, `expected ${bad} to be rejected`);
  }
});

test('stores a calendar date as UTC midnight, matching existing rows', () => {
  assert.equal(calendarDateToDate('2026-08-01')!.toISOString(), '2026-08-01T00:00:00.000Z');
});

test('derives the period from the calendar string, not the host timezone', () => {
  // The regression: an expense dated the 1st filed into the previous month on
  // any server west of UTC. Deriving from the string is host-independent.
  const parts = parseCalendarDate('2026-08-01')!;
  assert.equal(parts.month, 8);
  assert.equal(parts.year, 2026);
});

test('reads a stored date back as its Dhaka calendar day', () => {
  // 2026-07-31T18:00Z is already 1 August in Dhaka (UTC+6).
  assert.equal(toCalendarDate('2026-07-31T18:00:00.000Z'), '2026-08-01');
  assert.equal(toCalendarDate('2026-08-01T00:00:00.000Z'), '2026-08-01');
  assert.deepEqual(periodOf('2026-07-31T18:00:00.000Z'), { year: 2026, month: 8 });
});

test('month bounds cover the whole month in UTC', () => {
  const { start, end } = monthBounds(2026, 8);
  assert.equal(start.toISOString(), '2026-08-01T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-08-31T23:59:59.999Z');
});

test('month bounds include an entry dated the first of the month', () => {
  const { start, end } = monthBounds(2026, 8);
  const firstOfMonth = calendarDateToDate('2026-08-01')!;
  assert.ok(firstOfMonth >= start && firstOfMonth <= end);
});

test('month bounds exclude the adjacent months', () => {
  const { start, end } = monthBounds(2026, 8);
  assert.ok(calendarDateToDate('2026-07-31')! < start);
  assert.ok(calendarDateToDate('2026-09-01')! > end);
});

test('month bounds handle February in a leap year', () => {
  const { end } = monthBounds(2028, 2);
  assert.equal(end.toISOString(), '2028-02-29T23:59:59.999Z');
});

test('entry date defaults to the first of a period that is not the current month', () => {
  assert.equal(defaultEntryDate(2020, 3), '2020-03-01');
  assert.equal(defaultEntryDate(2020, 11), '2020-11-01');
});

test('entry date defaults to today when viewing the current month', () => {
  const parts = parseCalendarDate(toCalendarDate(new Date()))!;
  assert.equal(defaultEntryDate(parts.year, parts.month), toCalendarDate(new Date()));
});
