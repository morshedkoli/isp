import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { PERIOD_COOKIE, parsePeriodCookie, sortPeriodsDesc, type Period } from './period';

/**
 * Reads the app-wide selected month/year cookie (kept in sync by `proxy.ts`
 * whenever a period-aware page is visited with valid `year`/`month` params).
 * Server-component-only — do not import this from `proxy.ts` (Edge runtime).
 */
export async function getStoredPeriod(): Promise<Period | null> {
  const store = await cookies();
  return parsePeriodCookie(store.get(PERIOD_COOKIE)?.value);
}

/**
 * Every month that has any business activity — a commission record, an expense,
 * or a hotspot sale. Used to widen period selectors and to pick a sensible
 * default when the user has never chosen a period.
 *
 * Previously copy-pasted into four page files; kept here so all of them agree
 * on what "a period with data" means.
 */
export async function getAvailablePeriods(): Promise<Period[]> {
  const [commissions, expenses, hotspotSales] = await Promise.all([
    prisma.commissionRecord.findMany({ select: { year: true, month: true } }),
    prisma.expense.findMany({ select: { year: true, month: true } }),
    prisma.hotspotSale.findMany({ select: { date: true } }),
  ]);

  const keys = new Set<string>();
  for (const row of commissions) keys.add(`${row.year}-${row.month}`);
  for (const row of expenses) keys.add(`${row.year}-${row.month}`);
  for (const sale of hotspotSales) {
    const date = new Date(sale.date);
    keys.add(`${date.getFullYear()}-${date.getMonth() + 1}`);
  }

  const periods = Array.from(keys).map((key) => {
    const [year, month] = key.split('-').map((part) => parseInt(part, 10));
    return { year, month };
  });

  return sortPeriodsDesc(periods);
}
