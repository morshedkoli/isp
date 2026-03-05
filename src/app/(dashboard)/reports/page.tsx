import { getMonthlyReport, getDueAgingReport } from './actions';
import { formatCurrency } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const now = new Date();
  const [monthly, aging] = await Promise.all([
    getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
    getDueAgingReport(),
  ]);

  if (!monthly.success || !aging.success) {
    return <div className="p-6">Failed to load reports.</div>;
  }

  const report = monthly.report;
  const agingSummary = aging.summary;

  if (!report || !agingSummary) {
    return <div className="p-6">Report data unavailable.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Monthly profit and due analytics overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/reports/monthly-csv?year=${report.year}&month=${report.month}`}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            Export Monthly CSV
          </a>
          <a
            href="/api/reports/due-list-csv"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Export Due CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Revenue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(report.revenue.total)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Expenses</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(report.expenses)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Net Profit</p>
          <p className={`mt-1 text-2xl font-bold ${report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(report.netProfit)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-semibold text-slate-900">Partner Share Breakdown</h2>
        <div className="space-y-2">
          {report.partnerShares.map((p) => (
            <div key={p.partnerId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-700">{p.partnerName} ({p.sharePercent}%)</span>
              <span className="font-semibold text-slate-900">{formatCurrency(p.shareAmount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-semibold text-slate-900">Due Aging</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
          {Object.entries(agingSummary).map(([bucket, data]) => (
            <div key={bucket} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-700">{bucket} days</p>
              <p className="text-slate-500">{data.count} items</p>
              <p className="font-semibold text-slate-900">{formatCurrency(data.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
