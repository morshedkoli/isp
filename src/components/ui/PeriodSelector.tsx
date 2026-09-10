'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { MONTHS, buildYearOptions, PERIOD_COOKIE, PERIOD_COOKIE_MAX_AGE, getClientPeriod, type Period } from '@/lib/period';
import { setStoredPeriodAction } from '@/lib/period-actions';

interface PeriodSelectorProps {
  /** Route the selection navigates to, e.g. "/dashboard". */
  basePath?: string;
  year?: number;
  month?: number;
  /** Periods that actually have data — used only to widen the year list. */
  availablePeriods?: Period[];
  /**
   * What the page resolves to when the URL carries no year/month — the stored
   * period, else the newest period with data. Falling back to today's month
   * here instead let the selector disagree with the data on screen.
   */
  fallbackPeriod?: Period;
  /** Optional trailing content (badges, hints) rendered beside the selects. */
  children?: React.ReactNode;
}

export default function PeriodSelector({
  basePath,
  year,
  month,
  availablePeriods = [],
  fallbackPeriod,
  children,
}: PeriodSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const cookiePeriod = getClientPeriod();
  const fallbackYear = cookiePeriod?.year ?? fallbackPeriod?.year ?? now.getFullYear();
  const fallbackMonth = cookiePeriod?.month ?? fallbackPeriod?.month ?? now.getMonth() + 1;
  const currentYear = year ?? (parseInt(searchParams?.get('year') || '', 10) || fallbackYear);
  const currentMonth = month ?? (parseInt(searchParams?.get('month') || '', 10) || fallbackMonth);
  const activePath = basePath ?? (typeof window !== 'undefined' ? window.location.pathname : '/dashboard');

  const years = buildYearOptions(availablePeriods, currentYear);

  const go = (nextYear: number, nextMonth: number) => {
    // 1. Immediately persist to document.cookie so that every client fetch & link keeps this period
    if (typeof document !== 'undefined') {
      document.cookie = `${PERIOD_COOKIE}=${nextYear}-${nextMonth}; path=/; max-age=${PERIOD_COOKIE_MAX_AGE}; SameSite=Lax`;
    }
    // 2. Call server action to update server cookie store
    setStoredPeriodAction(nextYear, nextMonth).catch(() => {});
    // 3. Navigate with the new query params and refresh server components
    router.push(`${activePath}?year=${nextYear}&month=${nextMonth}`);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
      <div className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 py-1.5 shadow-sm transition-all hover:border-emerald-600/30" suppressHydrationWarning>
        <Calendar size={15} className="text-emerald-600 shrink-0" />
        <select
          aria-label="Month"
          value={currentMonth}
          onChange={(e) => go(currentYear, parseInt(e.target.value, 10))}
          suppressHydrationWarning
          className="cursor-pointer bg-transparent text-xs font-semibold text-stone-700 outline-none hover:text-emerald-800 transition-colors"
        >
          {MONTHS.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-emerald-900/20 font-light text-xs">|</span>
        <select
          aria-label="Year"
          value={currentYear}
          onChange={(e) => go(parseInt(e.target.value, 10), currentMonth)}
          suppressHydrationWarning
          className="cursor-pointer bg-transparent text-xs font-semibold text-stone-700 outline-none hover:text-emerald-800 transition-colors"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {children}
    </div>
  );
}
