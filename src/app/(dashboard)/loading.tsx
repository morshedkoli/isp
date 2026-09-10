import { ui } from '@/lib/ui-tokens';

/**
 * Shown while a *different* dashboard page streams in — switching from
 * Expenses to Reports, say. Month changes stay on the same route segment, so
 * they never hit this boundary; those are covered by `PeriodTransition`.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 animate-pulse rounded-lg bg-emerald-900/[0.07]" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-emerald-900/[0.05]" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-xl bg-emerald-900/[0.06]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className={`${ui.card} p-5`}>
            <div className="h-3 w-24 animate-pulse rounded bg-emerald-900/[0.07]" />
            <div className="mt-3 h-7 w-32 animate-pulse rounded-lg bg-emerald-900/[0.09]" />
            <div className="mt-3 h-3 w-40 animate-pulse rounded bg-emerald-900/[0.05]" />
          </div>
        ))}
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <div className="h-4 w-44 animate-pulse rounded bg-emerald-900/[0.07]" />
        </div>
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-11 animate-pulse rounded-xl bg-emerald-900/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}
