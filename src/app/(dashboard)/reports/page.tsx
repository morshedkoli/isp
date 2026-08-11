import { BarChart3, Download, FileSpreadsheet, FileText, HandCoins, Users, Receipt } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getMonthlyReport, getAgentPerformanceReport, getPartnerDueAging } from './actions';
import { formatTaka, formatPercent } from '@/lib/format';
import { formatPeriod, resolvePeriod, type Period } from '@/lib/period';
import { getStoredPeriod } from '@/lib/period-server';
import { accents, ui } from '@/lib/ui-tokens';
import PageHeader from '@/components/ui/PageHeader';
import PeriodSelector from '@/components/ui/PeriodSelector';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

const AGING_LABELS: Record<string, string> = {
  current: 'Current month', '1-2': '1-2 months', '3-5': '3-5 months', '6+': '6+ months',
};

async function getAvailableReportPeriods(): Promise<Period[]> {
  const periods = await prisma.commissionRecord.findMany({ select: { year: true, month: true }, distinct: ['year', 'month'] });
  return periods.sort((a, b) => b.year - a.year || b.month - a.month);
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const params = await searchParams;
  const [availablePeriods, storedPeriod] = await Promise.all([getAvailableReportPeriods(), getStoredPeriod()]);
  const { year, month } = resolvePeriod(params.year, params.month, [storedPeriod, availablePeriods[0]]);
  const [monthly, agentPerformance, aging] = await Promise.all([
    getMonthlyReport(year, month), getAgentPerformanceReport(year, month), getPartnerDueAging(),
  ]);

  if (!monthly.success || !aging.success || !monthly.report || !aging.summary) {
    return <div className={ui.errorBanner}>Reports could not be loaded. Please try again.</div>;
  }

  const report = monthly.report;
  const agentReport = agentPerformance.success ? agentPerformance.report ?? [] : [];
  const yearlyHref = `/api/reports/pdf?scope=yearly&year=${year}`;
  const monthlyPdfHref = `/api/reports/pdf?scope=monthly&year=${year}&month=${month}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`${formatPeriod(year, month)} financial performance and settlement status`}
        icon={BarChart3}
        accent="commission"
        actions={
          <>
            <a href={monthlyPdfHref} className={ui.buttonPrimary}><FileText size={15} /> Monthly PDF</a>
            <a href={yearlyHref} className={ui.buttonSecondary}><Download size={15} /> {year} PDF</a>
            <a href={`/api/reports/monthly-csv?year=${year}&month=${month}`} className={ui.buttonSecondary}><FileSpreadsheet size={15} /> CSV</a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Revenue" value={formatTaka(report.revenue.total)} hint={`Commission ${formatTaka(report.revenue.companyCommission)} · Hotspot ${formatTaka(report.revenue.hotspotRevenue)}`} icon={BarChart3} accent="commission" />
        <StatCard label="Total Expenses" value={formatTaka(report.expenses.total)} hint={`Agents ${formatTaka(report.expenses.agentPayouts)} · Fiber ${formatTaka(report.expenses.fiberCableTotal)}`} icon={HandCoins} accent="expense" />
        <StatCard label="Net Profit" value={formatTaka(report.netProfit)} hint={report.netProfit >= 0 ? 'Positive result for this period' : 'Loss for this period'} icon={report.netProfit >= 0 ? BarChart3 : HandCoins} accent={report.netProfit >= 0 ? 'profit' : 'loss'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Partner settlement breakdown" icon={Users} accent="partner">
          {report.partnerShares.length === 0 ? <EmptyState icon={Users} title="No partner settlements" description="Partner shares will appear after commission is recorded." size="compact" /> : (
            <div className="space-y-2.5">
              {report.partnerShares.map((partner) => (
                <div key={partner.partnerId} className={`rounded-xl px-4 py-3 ${accents.partner.soft}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className={`text-sm font-semibold ${accents.partner.text}`}>{partner.partnerName}</p><p className="text-xs text-stone-500">Share {formatPercent(partner.sharePercent)} · Due {formatTaka(partner.dueAmount)}</p></div>
                    <div className="text-right"><p className="text-sm font-bold tabular-nums text-emerald-700">Paid {formatTaka(partner.paidAmount)}</p><p className="text-xs font-medium tabular-nums text-stone-600">Remaining {formatTaka(partner.remainingAmount)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Agent commission payouts" icon={HandCoins} accent="agent">
          {agentReport.length === 0 ? <EmptyState icon={HandCoins} title="No agent payouts" description="Commission entries for this period will appear here." size="compact" /> : (
            <div className="space-y-2.5">
              {agentReport.map((agent) => (
                <div key={agent.agentId} className={`flex items-center justify-between rounded-xl px-4 py-3 ${accents.agent.soft}`}>
                  <div><p className={`text-sm font-semibold ${accents.agent.text}`}>{agent.agentName}</p><p className="text-xs text-stone-500">{formatPercent(agent.commissionPercent)} commission</p></div>
                  <p className={`text-sm font-bold tabular-nums ${accents.agent.text}`}>{formatTaka(agent.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="ক্যাটাগরি অনুযায়ী খরচের হিসাব (Expense Category Breakdown)" icon={Receipt} accent="expense" aside={<span className="text-xs text-stone-500">Total: {formatTaka(report.expenses.total)}</span>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'কর্মচারীদের বেতন (Salaries)', amount: report.expenses.salaryTotal, color: 'bg-indigo-500' },
            { label: 'ফাইবার ক্যাবল (Fiber Cable)', amount: report.expenses.fiberCableTotal, color: 'bg-amber-500' },
            { label: 'স্থান ও অফিস ভাড়া (Rent)', amount: report.expenses.rentTotal, color: 'bg-emerald-500' },
            { label: 'বিদ্যুৎ ও বিল (Utilities)', amount: report.expenses.utilitiesTotal, color: 'bg-rose-500' },
            { label: 'ডিভাইস ও যন্ত্রপাতি (Equipment)', amount: report.expenses.equipmentTotal, color: 'bg-teal-500' },
            { label: 'যাতায়াত (Conveyance)', amount: report.expenses.conveyanceTotal, color: 'bg-cyan-500' },
            { label: 'অন্যান্য খরচ (Misc)', amount: report.expenses.miscTotal, color: 'bg-stone-500' },
            { label: 'এজেন্ট কমিশন payout (Agent Payouts)', amount: report.expenses.agentPayouts, color: 'bg-purple-500' },
          ].map((cat) => {
            const percent = report.expenses.total > 0 ? (cat.amount / report.expenses.total) * 100 : 0;
            return (
              <div key={cat.label} className={`${ui.cardSoft} p-4 space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-700 truncate">{cat.label}</span>
                  <span className="text-xs font-medium text-stone-500 tabular-nums">{percent.toFixed(1)}%</span>
                </div>
                <p className="text-base font-bold tabular-nums text-stone-900">{formatTaka(cat.amount)}</p>
                <div className="h-1.5 w-full rounded-full bg-stone-200/70 overflow-hidden">
                  <div className={`h-full ${cat.color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Partner due aging" icon={HandCoins} accent="expense" aside={<a href="/api/reports/due-list-csv" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">Export due list CSV</a>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(aging.summary).map(([bucket, data]) => (
            <div key={bucket} className={`${ui.cardSoft} p-4`}>
              <p className={ui.eyebrow}>{AGING_LABELS[bucket] ?? bucket}</p>
              <p className="mt-2 text-lg font-bold tabular-nums text-stone-900">{formatTaka(data.amount)}</p>
              <p className="mt-1 text-xs text-stone-500">{data.count} unsettled {data.count === 1 ? 'entry' : 'entries'}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Export options" icon={Download} accent="neutral" aside={<span className="text-xs text-stone-400">Selected year: {year}</span>}>
        <div className="grid gap-3 md:grid-cols-2">
          <a href={monthlyPdfHref} className={`${ui.cardSoft} flex items-center gap-3 p-4 transition-colors hover:bg-emerald-50/70`}><FileText size={19} className="text-emerald-600" /><span><span className="block text-sm font-semibold text-stone-800">Monthly PDF report</span><span className="text-xs text-stone-500">Detailed report for {formatPeriod(year, month)}</span></span></a>
          <a href={yearlyHref} className={`${ui.cardSoft} flex items-center gap-3 p-4 transition-colors hover:bg-emerald-50/70`}><Download size={19} className="text-emerald-600" /><span><span className="block text-sm font-semibold text-stone-800">Yearly PDF report</span><span className="text-xs text-stone-500">All months summarized for {year}</span></span></a>
        </div>
      </SectionCard>
    </div>
  );
}
