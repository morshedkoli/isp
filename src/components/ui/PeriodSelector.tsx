'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { MONTHS, buildYearOptions, type Period } from '@/lib/period';

interface PeriodSelectorProps {
  /** Route the selection navigates to, e.g. "/dashboard". */
  basePath?: string;
  year?: number;
  month?: number;
  /** Periods that actually have data — used only to widen the year list. */
  availablePeriods?: Period[];
  /** Optional trailing content (badges, hints) rendered beside the selects. */
  children?: React.ReactNode;
}

export default function PeriodSelector({
  basePath,
  year,
  month,
  availablePeriods = [],
  children,
}: PeriodSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const currentYear = year ?? (parseInt(searchParams?.get('year') || '', 10) || now.getFullYear());
  const currentMonth = month ?? (parseInt(searchParams?.get('month') || '', 10) || (now.getMonth() + 1));
  const activePath = basePath ?? (typeof window !== 'undefined' ? window.location.pathname : '/dashboard');

  const years = buildYearOptions(availablePeriods, currentYear);

  const go = (nextYear: number, nextMonth: number) => {
    router.push(`${activePath}?year=${nextYear}&month=${nextMonth}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 py-1.5 shadow-sm transition-all hover:border-emerald-600/30">
        <Calendar size={15} className="text-emerald-600 shrink-0" />
        <select
          aria-label="Month"
          value={currentMonth}
          onChange={(e) => go(currentYear, parseInt(e.target.value, 10))}
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
