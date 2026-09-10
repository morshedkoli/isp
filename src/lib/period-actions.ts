'use server';

import { cookies } from 'next/headers';
import { PERIOD_COOKIE, PERIOD_COOKIE_MAX_AGE, isValidPeriod } from './period';

export async function setStoredPeriodAction(year: number, month: number) {
  if (!isValidPeriod(year, month)) return;
  const store = await cookies();
  store.set(PERIOD_COOKIE, `${year}-${month}`, {
    path: '/',
    maxAge: PERIOD_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}
