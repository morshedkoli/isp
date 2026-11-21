'use client';

import Link from 'next/link';
import {
  Wifi,
  Receipt,
  Calculator,
  Users,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  PieChart,
  LayoutDashboard,
  CalendarRange,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/Card';
import { formatTaka, formatDeduction, formatPercent } from '@/lib/format';
import { formatPeriod } from '@/lib/period';
import { accents, ui, PARTNER_ACCENTS } from '@/lib/ui-tokens';

export interface OverviewPartnerRow {
  id: string;
  name: string;
  sharePercent: number;
  isActive: boolean;
  totalCredited: number;
  totalGiven: number;
  balance: number;
  payoutsCount: number;
}

export interface OverviewMonthRow {
  year: number;
  month: number;
  hasCommission: boolean;
  companyCommission: number;
  agentPayouts: number;
  expenses: number;
  hotspotRevenue: number;
  netCommission: number;
}

export interface OverviewData {
  spanLabel: string;
  calculatedMonthsCount: number;
  activeMonthsCount: number;
  totalCompanyCommission: number;
  totalAgentPayouts: number;
  agents: {
    id: string;
    name: string;
    percent: number;
    totalAmount: number;
    monthsCount: number;
  }[];
  expenses: {
    salaryTotal: number;
    fiberCableTotal: number;
    rentTotal: number;
    utilitiesTotal: number;
    equipmentTotal: number;
    conveyanceTotal: number;
    miscTotal: number;
    total: number;
    entriesCount: number;
  };
  hotspot: {
    totalRevenue: number;
    totalVouchers: number;
    salesCount: number;
    sevenDayVouchers: number;
    thirtyDayVouchers: number;
  };
  totalNetCommission: number;
  combinedBusinessNet: number;
  partners: OverviewPartnerRow[];
  totalPartnerCredited: number;
  totalPartnerGiven: number;
  totalPartnerPayable: number;
  monthlyHistory: OverviewMonthRow[];
}

function WaterfallRow({
  label,
  value,
  accent,
  indented = false,
}: {
  label: string;
  value: string;
  accent: keyof typeof accents;
  indented?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${accents[accent].soft}`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${accents[accent].text}`}>
        {indented && <ArrowRight size={13} className="opacity-60" />}
        {label}
      </div>
      <span className={`font-semibold tabular-nums ${accents[accent].text}`}>{value}</span>
    </div>
  );
}

function partnerBalancePill(balance: number) {
  if (balance > 0.005) {
    return {
      label: 'Payable',
      className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    };
  }
  if (balance < -0.005) {
    return {
      label: 'Advance',
      className: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
    };
  }
  return {
    label: 'Settled',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  };
}

export default function DashboardClient({ data }: { data: OverviewData }) {
  const {
    spanLabel,
    calculatedMonthsCount,
    activeMonthsCount,
    totalCompanyCommission,
    totalAgentPayouts,
    agents,
    expenses,
    hotspot,
    totalNetCommission,
    combinedBusinessNet,
    partners,
    totalPartnerCredited,
    totalPartnerGiven,
    totalPartnerPayable,
    monthlyHistory,
  } = data;

  const isProfit = totalNetCommission >= 0;
  const expenseCategories = [
    { label: 'বেতন (Salaries)', amount: expenses.salaryTotal, bar: 'bg-indigo-500' },
    { label: 'ফাইবার ক্যাবল (Fiber Cable)', amount: expenses.fiberCableTotal, bar: 'bg-amber-500' },
    { label: 'অফিস ও স্থান ভাড়া (Rent)', amount: expenses.rentTotal, bar: 'bg-emerald-500' },
    { label: 'বিদ্যুৎ ও বিল (Utilities)', amount: expenses.utilitiesTotal, bar: 'bg-rose-500' },
    { label: 'যন্ত্রপাতি ও ডিভাইস (Equipment)', amount: expenses.equipmentTotal, bar: 'bg-teal-500' },
    { label: 'যাতায়াত (Conveyance)', amount: expenses.conveyanceTotal, bar: 'bg-cyan-500' },
    { label: 'অন্যান্য খরচ (Misc)', amount: expenses.miscTotal, bar: 'bg-stone-500' },
  ].filter((c) => c.amount > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Total Overview"
        subtitle={`All-time total calculation across ${activeMonthsCount} recorded month${activeMonthsCount === 1 ? '' : 's'} · ${spanLabel}`}
        icon={LayoutDashboard}
        accent="commission"
        actions={
          <>
            <Link href="/monthly" className={ui.buttonSecondary}>
              <CalendarRange size={15} /> Monthly Info
            </Link>
            <Link href="/balances" className={ui.buttonSecondary}>
              <Wallet size={15} /> All Balances & Pay
            </Link>
            <Link href="/commissions" className={ui.buttonPrimary}>
              <Calculator size={15} /> Commissions
            </Link>
          </>
        }
      />

      {/* Grand All-Time Hero Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ring-1 ${
          isProfit
            ? 'bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-950 ring-emerald-500/30'
            : 'bg-gradient-to-br from-rose-800 via-rose-900 to-stone-950 ring-rose-500/30'
        }`}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-emerald-400/10 blur-2xl" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              <TrendingUp size={12} /> All-Time Net Distributable Pool
            </span>
            <p className="mt-3 text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
              {formatTaka(totalNetCommission, { decimals: true })}
            </p>
            <p className="mt-1.5 text-xs text-emerald-100/80">
              Calculated from {calculatedMonthsCount} saved commission month
              {calculatedMonthsCount === 1 ? '' : 's'} ({spanLabel})
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-7">
            <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs ring-1 ring-white/15">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/80">
                Credited to Partners
              </p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-white">
                +{formatTaka(totalPartnerCredited, { decimals: true })}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-100/70">Total profit shares added</p>
            </div>

            <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs ring-1 ring-white/15">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/80">
                Money Given (−)
              </p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-rose-200">
                −{formatTaka(totalPartnerGiven, { decimals: true })}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-100/70">Total paid out to partners</p>
            </div>

            <Link
              href="/partners"
              className="group rounded-xl bg-white/15 p-3.5 backdrop-blur-xs ring-1 ring-white/25 transition-colors hover:bg-white/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200">
                  Payable Balance
                </p>
                <ArrowUpRight size={14} className="text-amber-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-white">
                {formatTaka(totalPartnerPayable, { decimals: true })}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-100/80">Remaining in partner profiles</p>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Core All-Time KPI Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total ISP Commission"
          value={formatTaka(totalCompanyCommission)}
          hint={`${calculatedMonthsCount} month${calculatedMonthsCount === 1 ? '' : 's'} recorded`}
          icon={Banknote}
          accent="commission"
          variant="soft"
        />
        <StatCard
          label="Total Agent Payouts"
          value={formatTaka(totalAgentPayouts)}
          hint={`${agents.length} field agent${agents.length === 1 ? '' : 's'} paid`}
          icon={Users}
          accent="agent"
          variant="soft"
        />
        <StatCard
          label="Total Expenses"
          value={formatTaka(expenses.total)}
          hint={`${expenses.entriesCount} expense record${expenses.entriesCount === 1 ? '' : 's'}`}
          icon={Receipt}
          accent="expense"
          variant="soft"
        />
        <StatCard
          label="Total Hotspot Cash"
          value={formatTaka(hotspot.totalRevenue)}
          hint={`${hotspot.totalVouchers} voucher${hotspot.totalVouchers === 1 ? '' : 's'} (${hotspot.sevenDayVouchers}×7d · ${hotspot.thirtyDayVouchers}×30d)`}
          icon={Wifi}
          accent="hotspot"
          variant="soft"
        />
      </div>

      {/* Complete Total Calculation Waterfall + Partner Balances */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Complete Total Calculation"
          icon={Calculator}
          accent="commission"
          aside={<span className="text-xs font-medium text-stone-400">All-time cumulative</span>}
        >
          <div className="space-y-2.5">
            <WaterfallRow
              label="Total ISP Commission Pool"
              value={formatTaka(totalCompanyCommission, { decimals: true })}
              accent="commission"
            />

            <WaterfallRow
              label="Total Field Agent Commissions"
              value={formatDeduction(totalAgentPayouts)}
              accent="agent"
              indented
            />
            {agents.length > 0 && (
              <div className="grid gap-1.5 pl-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-600"
                  >
                    <span>
                      Agent: <strong className="text-stone-800">{agent.name}</strong> ({formatPercent(agent.percent)} · {agent.monthsCount} mo)
                    </span>
                    <span className="font-semibold tabular-nums text-teal-800">
                      −{formatTaka(agent.totalAmount, { decimals: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {expenses.salaryTotal > 0 && (
              <WaterfallRow label="বেতন (Salaries)" value={formatDeduction(expenses.salaryTotal)} accent="partner" indented />
            )}
            {expenses.fiberCableTotal > 0 && (
              <WaterfallRow label="ফাইবার ক্যাবল (Fiber Cable)" value={formatDeduction(expenses.fiberCableTotal)} accent="hotspot" indented />
            )}
            {expenses.rentTotal > 0 && (
              <WaterfallRow label="অফিস ও স্থান ভাড়া (Rent)" value={formatDeduction(expenses.rentTotal)} accent="expense" indented />
            )}
            {expenses.utilitiesTotal > 0 && (
              <WaterfallRow label="বিদ্যুৎ ও বিল (Utilities)" value={formatDeduction(expenses.utilitiesTotal)} accent="expense" indented />
            )}
            {expenses.equipmentTotal > 0 && (
              <WaterfallRow label="যন্ত্রপাতি ও ডিভাইস (Equipment)" value={formatDeduction(expenses.equipmentTotal)} accent="expense" indented />
            )}
            {expenses.conveyanceTotal > 0 && (
              <WaterfallRow label="যাতায়াত (Conveyance)" value={formatDeduction(expenses.conveyanceTotal)} accent="expense" indented />
            )}
            {expenses.miscTotal > 0 && (
              <WaterfallRow label="অন্যান্য খরচ (Misc)" value={formatDeduction(expenses.miscTotal)} accent="expense" indented />
            )}

            <div className="border-t-2 border-dashed border-stone-200 pt-1" />

            <div
              className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${
                isProfit ? accents.profit.soft : accents.expense.soft
              }`}
            >
              <span className={`font-bold ${isProfit ? accents.profit.text : accents.expense.text}`}>
                Net Distributable to Partners
              </span>
              <span
                className={`text-lg font-extrabold tabular-nums ${
                  isProfit ? accents.profit.text : accents.expense.text
                }`}
              >
                {formatTaka(totalNetCommission, { decimals: true })}
              </span>
            </div>

            <div className="rounded-xl border border-sky-200/70 bg-sky-50/50 px-4 py-3 text-xs">
              <div className="flex items-center justify-between text-sky-900">
                <span className="font-semibold">+ Hotspot Voucher Cash Revenue (Separate)</span>
                <span className="font-bold tabular-nums">{formatTaka(hotspot.totalRevenue, { decimals: true })}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-sky-200/60 pt-1.5 text-sm font-bold text-stone-900">
                <span>Combined Business Net (Commission + Hotspot)</span>
                <span className="tabular-nums text-emerald-800">
                  {formatTaka(combinedBusinessNet, { decimals: true })}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Partner Profiles — Total & Balance"
          icon={PieChart}
          accent="profit"
          aside={
            <Link href="/partners" className="text-xs font-semibold text-emerald-700 hover:underline">
              Open Partners →
            </Link>
          }
        >
          {partners.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No partners added yet"
              description="Add partners to track profit shares and individual balances."
              action={
                <Link href="/partners" className={ui.buttonSecondarySm}>
                  Add partners <ArrowRight size={12} />
                </Link>
              }
              size="compact"
            />
          ) : (
            <div className="space-y-3.5">
              {partners.map((partner, index) => {
                const accent = accents[PARTNER_ACCENTS[index % PARTNER_ACCENTS.length]];
                const pill = partnerBalancePill(partner.balance);
                const paidRatio =
                  partner.totalCredited > 0
                    ? Math.min(100, Math.max(0, (partner.totalGiven / partner.totalCredited) * 100))
                    : 0;

                return (
                  <Link
                    key={partner.id}
                    href={`/partners/${partner.id}`}
                    className="group block rounded-2xl border border-emerald-950/[0.05] bg-stone-50/50 p-4 transition-all hover:border-emerald-500/30 hover:bg-emerald-50/30 hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accent.soft} ${accent.text}`}
                        >
                          {partner.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-stone-900 group-hover:text-emerald-800 group-hover:underline">
                              {partner.name}
                            </span>
                            <span className={`${ui.badge} ${accent.soft} ${accent.text}`}>
                              {formatPercent(partner.sharePercent)}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.className}`}>
                              {pill.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs tabular-nums text-stone-500">
                            Credited <strong className="text-emerald-700">+{formatTaka(partner.totalCredited, { decimals: true })}</strong>
                            {' · '}
                            Given <strong className="text-rose-700">−{formatTaka(partner.totalGiven, { decimals: true })}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                          Balance
                        </p>
                        <p className="text-base font-extrabold tabular-nums text-stone-900">
                          {formatTaka(partner.balance, { decimals: true })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-stone-400">
                        <span>Payout progress ({paidRatio.toFixed(0)}% given)</span>
                        <span className="text-emerald-700 group-hover:underline">
                          View profile & give money →
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80">
                        <div
                          className={`h-full rounded-full transition-all ${accent.bar}`}
                          style={{ width: `${paidRatio}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* All-Time Expense Categories */}
      {expenseCategories.length > 0 && (
        <SectionCard
          title="All-Time Expense Breakdown by Category"
          icon={Receipt}
          accent="expense"
          aside={
            <span className="text-xs font-semibold text-stone-600">
              Grand Total: {formatTaka(expenses.total, { decimals: true })}
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {expenseCategories.map((cat) => {
              const pct = expenses.total > 0 ? (cat.amount / expenses.total) * 100 : 0;
              return (
                <div key={cat.label} className={`${ui.cardSoft} p-4 space-y-2`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-stone-700">{cat.label}</span>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-stone-500">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-base font-bold tabular-nums text-stone-900">
                    {formatTaka(cat.amount, { decimals: true })}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/70">
                    <div className={`h-full ${cat.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Month-by-Month Ledger Table */}
      <div className={ui.card + ' overflow-hidden'}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.sectionTitle}>All Recorded Months</h2>
            <p className={ui.pageSubtitle}>
              Click any month to open its detailed Monthly Information page
            </p>
          </div>
          <Link
            href="/monthly"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-900/10 hover:bg-emerald-100"
          >
            <CalendarRange size={13} /> Open Monthly Page
          </Link>
        </div>

        {monthlyHistory.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CalendarRange}
              title="No monthly records yet"
              description="Once you record commissions, expenses, or hotspot sales, every month will be summarized here."
              size="compact"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={ui.table}>
              <thead className={ui.tableHead}>
                <tr>
                  <th className={ui.tableHeadCell}>Period</th>
                  <th className={`${ui.tableHeadCell} text-right`}>ISP Pool</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Agent Payouts</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Expenses</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Net Distributable</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Hotspot Cash</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
                {monthlyHistory.map((row) => {
                  const href = `/monthly?year=${row.year}&month=${row.month}`;
                  return (
                    <tr key={`${row.year}-${row.month}`} className={ui.tableRow}>
                      <td className={ui.tableCell + ' font-semibold text-stone-900'}>
                        <Link href={href} className="hover:text-emerald-700 hover:underline">
                          {formatPeriod(row.year, row.month)}
                        </Link>
                        {!row.hasCommission && (
                          <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                            No commission yet
                          </span>
                        )}
                      </td>
                      <td className={`${ui.tableCell} text-right tabular-nums`}>
                        {formatTaka(row.companyCommission, { decimals: true })}
                      </td>
                      <td className={`${ui.tableCell} text-right tabular-nums text-teal-800`}>
                        {row.agentPayouts > 0
                          ? `−${formatTaka(row.agentPayouts, { decimals: true })}`
                          : formatTaka(0)}
                      </td>
                      <td className={`${ui.tableCell} text-right tabular-nums text-rose-700`}>
                        {row.expenses > 0
                          ? `−${formatTaka(row.expenses, { decimals: true })}`
                          : formatTaka(0)}
                      </td>
                      <td
                        className={`${ui.tableCell} text-right font-bold tabular-nums ${
                          row.netCommission >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatTaka(row.netCommission, { decimals: true })}
                      </td>
                      <td className={`${ui.tableCell} text-right tabular-nums text-sky-700`}>
                        {formatTaka(row.hotspotRevenue, { decimals: true })}
                      </td>
                      <td className={`${ui.tableCell} text-right`}>
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          Monthly Info <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-emerald-950/10 bg-emerald-50/40 font-bold text-stone-900">
                <tr>
                  <td className={ui.tableCell}>Total ({monthlyHistory.length} months)</td>
                  <td className={`${ui.tableCell} text-right tabular-nums`}>
                    {formatTaka(totalCompanyCommission, { decimals: true })}
                  </td>
                  <td className={`${ui.tableCell} text-right tabular-nums text-teal-800`}>
                    −{formatTaka(totalAgentPayouts, { decimals: true })}
                  </td>
                  <td className={`${ui.tableCell} text-right tabular-nums text-rose-700`}>
                    −{formatTaka(expenses.total, { decimals: true })}
                  </td>
                  <td className={`${ui.tableCell} text-right tabular-nums text-emerald-800`}>
                    {formatTaka(totalNetCommission, { decimals: true })}
                  </td>
                  <td className={`${ui.tableCell} text-right tabular-nums text-sky-800`}>
                    {formatTaka(hotspot.totalRevenue, { decimals: true })}
                  </td>
                  <td className={ui.tableCell} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
