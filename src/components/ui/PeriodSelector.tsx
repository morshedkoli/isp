'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Loader2 } from 'lucide-react';
import { MONTHS, buildYearOptions, formatPeriod, PERIOD_COOKIE, PERIOD_COOKIE_MAX_AGE, getClientPeriod, type Period } from '@/lib/period';
import { setStoredPeriodAction } from '@/lib/period-actions';
import { usePeriodTransition } from './PeriodTransition';

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
  const { isPending, startPeriodTransition } = usePeriodTransition();

  /**
   * The month being navigated to. Shown in place of the resolved period while
   * the fetch is in flight, so the selects reflect the click immediately
   * instead of snapping back until the server responds.
   */
  const [requestedPeriod, setRequestedPeriod] = useState<Period | null>(null);

  const now = new Date();
  const cookiePeriod = getClientPeriod();
  const fallbackYear = cookiePeriod?.year ?? fallbackPeriod?.year ?? now.getFullYear();
  const fallbackMonth = cookiePeriod?.month ?? fallbackPeriod?.month ?? now.getMonth() + 1;
  const resolvedYear = year ?? (parseInt(searchParams?.get('year') || '', 10) || fallbackYear);
  const resolvedMonth = month ?? (parseInt(searchParams?.get('month') || '', 10) || fallbackMonth);

  // Once the transition settles, `requestedPeriod` is ignored and the resolved
  // period takes over — no cleanup effect needed.
  const currentYear = isPending && requestedPeriod ? requestedPeriod.year : resolvedYear;
  const currentMonth = isPending && requestedPeriod ? requestedPeriod.month : resolvedMonth;

  const activePath = basePath ?? (typeof window !== 'undefined' ? window.location.pathname : '/dashboard');

  const years = buildYearOptions(availablePeriods, currentYear);

  const go = (nextYear: number, nextMonth: number) => {
    // 1. Immediately persist to document.cookie so that every client fetch & link keeps this period
    if (typeof document !== 'undefined') {
      document.cookie = `${PERIOD_COOKIE}=${nextYear}-${nextMonth}; path=/; max-age=${PERIOD_COOKIE_MAX_AGE}; SameSite=Lax`;
    }
    // 2. Call server action to update server cookie store
    setStoredPeriodAction(nextYear, nextMonth).catch(() => {});
    // 3. Navigate inside a transition so the shell can dim the stale content
    //    and show a progress bar until the new month's data has rendered.
    setRequestedPeriod({ year: nextYear, month: nextMonth });
    startPeriodTransition(() => {
      router.push(`${activePath}?year=${nextYear}&month=${nextMonth}`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 shadow-sm transition-all ${
          isPending
            ? 'border-emerald-500/40 ring-2 ring-emerald-500/10'
            : 'border-emerald-900/10 hover:border-emerald-600/30'
        }`}
        suppressHydrationWarning
      >
        {isPending ? (
          <Loader2 size={15} className="shrink-0 animate-spin text-emerald-600" />
        ) : (
          <Calendar size={15} className="shrink-0 text-emerald-600" />
        )}
        <select
          aria-label="Month"
          value={currentMonth}
          disabled={isPending}
          onChange={(e) => go(currentYear, parseInt(e.target.value, 10))}
          suppressHydrationWarning
          className="cursor-pointer bg-transparent text-xs font-semibold text-stone-700 outline-none transition-colors hover:text-emerald-800 disabled:cursor-wait disabled:text-stone-400"
        >
          {MONTHS.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-xs font-light text-emerald-900/20">|</span>
        <select
          aria-label="Year"
          value={currentYear}
          disabled={isPending}
          onChange={(e) => go(parseInt(e.target.value, 10), currentMonth)}
          suppressHydrationWarning
          className="cursor-pointer bg-transparent text-xs font-semibold text-stone-700 outline-none transition-colors hover:text-emerald-800 disabled:cursor-wait disabled:text-stone-400"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Announced to screen readers and shown to everyone else — the selects
          alone changing was not enough to tell that data was being fetched. */}
      <span
        role="status"
        aria-live="polite"
        className={`hidden items-center text-xs font-medium text-emerald-700 sm:inline-flex ${
          isPending ? 'opacity-100' : 'sr-only opacity-0'
        }`}
      >
        {isPending ? `Loading ${formatPeriod(currentYear, currentMonth)}…` : ''}
      </span>

      {children}
    </div>
  );
}
