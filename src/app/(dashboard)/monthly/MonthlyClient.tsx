'use client';

import Link from 'next/link';
import {
  Wifi,
  Receipt,
  Calculator,
  TrendingDown,
  Users,
  ArrowRight,
  Banknote,
  PieChart,
  ShoppingBag,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/Card';
import {
  formatTaka,
  formatDeduction,
  formatPercent,
  formatDateShort,
  formatPaymentMethod,
} from '@/lib/format';
import { formatPeriod } from '@/lib/period';
import { accents, statusBadge, ui, PARTNER_ACCENTS } from '@/lib/ui-tokens';
import { HOTSPOT_PACKAGES, type HotspotPackageKey } from '../hotspot/constants';

interface PartnerShare {
  id: string;
  name: string;
  sharePercent: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  balance: number;
}

interface MonthlyInfoData {
  month: string;
  monthIndex: number;
  year: number;
  companyCommission: number;
  sources: { id: string; description: string; amount: number }[];
  agentPayouts: number;
  agentBreakdown: { id: string; agentName: string; percent: number; amount: number }[];
  salaryTotal: number;
  fiberCableTotal: number;
  rentTotal: number;
  utilitiesTotal: number;
  equipmentTotal: number;
  conveyanceTotal: number;
  miscTotal: number;
  totalExpenses: number;
  recentExpenses: {
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
  }[];
  hotspotRevenue: number;
  hotspotVouchers: number;
  hotspotCount: number;
  netCommission: number;
  hasCommissionRecord: boolean;
  partnerShares: PartnerShare[];
  recentHotspot: {
    id: string;
    package: string;
    quantity: number;
    amount: number;
    customerName?: string | null;
    date: string;
  }[];
  periodPayouts: {
    id: string;
    partnerId: string;
    partnerName: string;
    amount: number;
    method: string;
    date: string;
    notes?: string | null;
  }[];
}

function packageLabel(pkg: string): string {
  const config = HOTSPOT_PACKAGES[pkg as HotspotPackageKey];
  return config ? `${config.label} · ${formatTaka(config.price)}` : pkg;
}

function settlementStatus(share: PartnerShare) {
  if (share.amount <= 0) return { label: 'No payout', className: statusBadge.none };
  if (share.remainingAmount <= 0) return { label: 'Settled', className: statusBadge.settled };
  if (share.paidAmount > 0) return { label: 'Partial', className: statusBadge.partial };
  return { label: 'Unpaid', className: statusBadge.unpaid };
}

function adjacentPeriod(year: number, month: number, delta: -1 | 1) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function BreakdownRow({
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

export default function MonthlyClient({ data }: { data: MonthlyInfoData }) {
  const {
    monthIndex,
    year,
    companyCommission,
    sources,
    agentPayouts,
    agentBreakdown,
    salaryTotal,
    fiberCableTotal,
    rentTotal,
    utilitiesTotal,
    equipmentTotal,
    conveyanceTotal,
    miscTotal,
    totalExpenses,
    recentExpenses,
    hotspotRevenue,
    hotspotVouchers,
    netCommission,
    hasCommissionRecord,
    partnerShares,
    recentHotspot,
    periodPayouts,
  } = data;

  const isProfit = netCommission >= 0;
  const totalAllocated = partnerShares.reduce((sum, p) => sum + p.amount, 0);
  const allocatedPercent = partnerShares.reduce((sum, p) => sum + p.sharePercent, 0);
  const settledCount = partnerShares.filter((p) => p.amount > 0 && p.remainingAmount <= 0).length;
  const pendingCount = partnerShares.filter((p) => p.remainingAmount > 0).length;

  const prev = adjacentPeriod(year, monthIndex, -1);
  const next = adjacentPeriod(year, monthIndex, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Information"
        subtitle={`${formatPeriod(year, monthIndex)} complete breakdown & activity`}
        icon={CalendarRange}
        accent="commission"
        toolbar={
          <div className="flex items-center gap-1.5 rounded-xl bg-white p-1 shadow-xs ring-1 ring-emerald-950/[0.06]">
            <Link
              href={`/monthly?year=${prev.year}&month=${prev.month}`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
              title={`Previous: ${formatPeriod(prev.year, prev.month)}`}
            >
              <ChevronLeft size={14} />
              Prev
            </Link>
            <span className="px-2 text-xs font-bold text-emerald-900">
              {formatPeriod(year, monthIndex)}
            </span>
            <Link
              href={`/monthly?year=${next.year}&month=${next.month}`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
              title={`Next: ${formatPeriod(next.year, next.month)}`}
            >
              Next
              <ChevronRight size={14} />
            </Link>
          </div>
        }
        actions={
          <>
            <Link href="/dashboard" className={ui.buttonSecondary}>
              <Layers size={15} /> Total Overview
            </Link>
            <Link href={`/expenses?year=${year}&month=${monthIndex}`} className={ui.buttonSecondary}>
              <Receipt size={15} /> Add Expense
            </Link>
            <Link href={`/hotspot?year=${year}&month=${monthIndex}`} className={ui.buttonSecondary}>
              <Wifi size={15} /> Hotspot Sale
            </Link>
            <Link href={`/commissions?year=${year}&month=${monthIndex}`} className={ui.buttonPrimary}>
              <Calculator size={15} /> Commissions
            </Link>
          </>
        }
      />

      {!hasCommissionRecord && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs sm:text-sm text-amber-900 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <Calculator className="h-5 w-5 text-amber-600 shrink-0" />
            <span>No commission record saved for {formatPeriod(year, monthIndex)} yet.</span>
          </div>
          <Link
            href={`/commissions?year=${year}&month=${monthIndex}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            Record Commission <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Monthly KPI Row */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <StatCard
            label={isProfit ? 'Net to Partners' : 'Monthly Deficit'}
            value={formatTaka(netCommission)}
            hint={`${formatPeriod(year, monthIndex)} distributable pool`}
            icon={PieChart}
            accent={isProfit ? 'profit' : 'loss'}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
          <StatCard
            label="ISP Commission"
            value={formatTaka(companyCommission)}
            hint={`${sources.length} source${sources.length === 1 ? '' : 's'}`}
            icon={Banknote}
            accent="commission"
            variant="soft"
          />
          <StatCard
            label="Agent Payouts"
            value={formatTaka(agentPayouts)}
            hint={`${agentBreakdown.length} field agent${agentBreakdown.length === 1 ? '' : 's'}`}
            icon={Users}
            accent="agent"
            variant="soft"
          />
          <StatCard
            label="Expenses"
            value={formatTaka(totalExpenses)}
            hint={`Salary ${formatTaka(salaryTotal)}`}
            icon={Receipt}
            accent="expense"
            variant="soft"
          />
          <StatCard
            label="Hotspot Sales"
            value={formatTaka(hotspotRevenue)}
            hint={`${hotspotVouchers} voucher${hotspotVouchers === 1 ? '' : 's'} sold`}
            icon={Wifi}
            accent="hotspot"
            variant="soft"
          />
        </div>
      </div>

      {/* Monthly Commission Waterfall + Partner Shares */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={`${formatPeriod(year, monthIndex)} Commission Breakdown`}
          icon={Calculator}
          accent="commission"
          aside={
            <Link
              href={`/commissions?year=${year}&month=${monthIndex}`}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Edit Calculator
            </Link>
          }
        >
          <div className="space-y-2">
            <BreakdownRow
              label="Total ISP Commission Pool"
              value={formatTaka(companyCommission)}
              accent="commission"
            />
            {sources.length > 0 && (
              <div className="grid gap-1.5 pl-4">
                {sources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-600"
                  >
                    <span>{src.description}</span>
                    <span className="font-semibold tabular-nums text-stone-800">
                      {formatTaka(src.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <BreakdownRow
              label="Field Agent Commissions"
              value={formatDeduction(agentPayouts)}
              accent="agent"
              indented
            />
            {agentBreakdown.length > 0 && (
              <div className="grid gap-1.5 pl-4">
                {agentBreakdown.map((ag) => (
                  <div
                    key={ag.id}
                    className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-600"
                  >
                    <span>
                      {ag.agentName} ({formatPercent(ag.percent)})
                    </span>
                    <span className="font-semibold tabular-nums text-teal-800">
                      {formatDeduction(ag.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {salaryTotal > 0 && (
              <BreakdownRow label="বেতন (Salaries)" value={formatDeduction(salaryTotal)} accent="partner" indented />
            )}
            {fiberCableTotal > 0 && (
              <BreakdownRow label="ফাইবার ক্যাবল (Fiber Cable)" value={formatDeduction(fiberCableTotal)} accent="hotspot" indented />
            )}
            {rentTotal > 0 && (
              <BreakdownRow label="অফিস ও বাসা ভাড়া (Rent)" value={formatDeduction(rentTotal)} accent="expense" indented />
            )}
            {utilitiesTotal > 0 && (
              <BreakdownRow label="বিদ্যুৎ ও বিল (Utilities)" value={formatDeduction(utilitiesTotal)} accent="expense" indented />
            )}
            {equipmentTotal > 0 && (
              <BreakdownRow label="যন্ত্রপাতি ও ডিভাইস (Equipment)" value={formatDeduction(equipmentTotal)} accent="expense" indented />
            )}
            {conveyanceTotal > 0 && (
              <BreakdownRow label="যাতায়াত খরচ (Conveyance)" value={formatDeduction(conveyanceTotal)} accent="expense" indented />
            )}
            {miscTotal > 0 && (
              <BreakdownRow label="অন্যান্য খরচ (Misc. Expenses)" value={formatDeduction(miscTotal)} accent="expense" indented />
            )}

            <div className="border-t-2 border-dashed border-stone-200 pt-1" />

            <div
              className={`flex items-center justify-between rounded-xl px-4 py-4 ${
                isProfit ? accents.profit.soft : accents.expense.soft
              }`}
            >
              <span className={`font-bold ${isProfit ? accents.profit.text : accents.expense.text}`}>
                Net Distributable ({formatPeriod(year, monthIndex)})
              </span>
              <span
                className={`text-xl font-extrabold tabular-nums ${
                  isProfit ? accents.profit.text : accents.expense.text
                }`}
              >
                {formatTaka(netCommission)}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Partner Shares (This Month)"
          icon={Users}
          accent="profit"
          aside={
            <span className="text-xs text-stone-400">
              {settledCount} settled · {pendingCount} pending
            </span>
          }
        >
          {partnerShares.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No partners added yet"
              description="Add partners to start tracking profit sharing."
              action={
                <Link href={`/partners?year=${year}&month=${monthIndex}`} className={ui.buttonSecondarySm}>
                  Add partners <ArrowRight size={12} />
                </Link>
              }
              size="compact"
            />
          ) : (
            <div className="space-y-4">
              {partnerShares.map((partner, index) => {
                const accent = accents[PARTNER_ACCENTS[index % PARTNER_ACCENTS.length]];
                const status = settlementStatus(partner);
                const barWidth =
                  netCommission > 0
                    ? Math.min((partner.amount / netCommission) * 100, 100)
                    : partner.sharePercent;

                return (
                  <div key={partner.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={`/partners/${partner.id}?year=${year}&month=${monthIndex}`}
                          className="group flex items-center gap-2"
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accent.soft} ${accent.text}`}
                          >
                            {partner.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-stone-800 group-hover:text-emerald-700 group-hover:underline">
                            {partner.name}
                          </span>
                        </Link>
                        <span className={`${ui.badge} shrink-0 ${accent.soft} ${accent.text}`}>
                          {formatPercent(partner.sharePercent)}
                        </span>
                        <span className={`${ui.badge} shrink-0 ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold tabular-nums ${accent.text}`}>
                          +{formatTaka(partner.amount, { decimals: true })}
                        </p>
                        <p className="text-[11px] tabular-nums text-stone-500">
                          Profile Balance:{' '}
                          <span className="font-semibold text-stone-800">
                            {formatTaka(partner.balance, { decimals: true })}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full transition-all ${accent.bar}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
                <span>Total credited this month ({formatPercent(allocatedPercent)})</span>
                <span className="font-semibold tabular-nums text-stone-700">
                  +{formatTaka(totalAllocated, { decimals: true })}
                </span>
              </div>

              {periodPayouts.length > 0 && (
                <div className="rounded-xl border border-emerald-950/[0.05] bg-stone-50/70 p-3 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Money Given in {formatPeriod(year, monthIndex)}
                  </p>
                  {periodPayouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <Link
                        href={`/partners/${p.partnerId}?year=${year}&month=${monthIndex}`}
                        className="font-medium text-stone-700 hover:text-emerald-700 hover:underline"
                      >
                        {p.partnerName} · {formatPaymentMethod(p.method)} ({formatDateShort(p.date)})
                      </Link>
                      <span className="font-bold tabular-nums text-rose-700">
                        −{formatTaka(p.amount, { decimals: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link
            href={`/partners?year=${year}&month=${monthIndex}`}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
          >
            Partner profiles & balances <ArrowRight size={12} />
          </Link>
        </SectionCard>
      </div>

      {/* Monthly Expense Items + Hotspot Sales */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={`Expenses in ${formatPeriod(year, monthIndex)}`}
          icon={TrendingDown}
          accent="expense"
          aside={
            <Link
              href={`/expenses?year=${year}&month=${monthIndex}`}
              className="text-xs font-medium text-rose-600 hover:underline"
            >
              Manage all ({formatTaka(totalExpenses)})
            </Link>
          }
        >
          {recentExpenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded this month"
              description="Expenses you add for this period will appear here."
              accent="expense"
              action={
                <Link href={`/expenses?year=${year}&month=${monthIndex}`} className={ui.buttonSecondarySm}>
                  Add expense <ArrowRight size={12} />
                </Link>
              }
              size="compact"
            />
          ) : (
            <div className="divide-y divide-stone-100">
              {recentExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-800">{exp.description}</p>
                    <p className="text-xs text-stone-400">
                      {exp.type} · {formatDateShort(exp.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-rose-700">
                    −{formatTaka(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={`Hotspot Sales in ${formatPeriod(year, monthIndex)}`}
          icon={ShoppingBag}
          accent="hotspot"
          aside={
            <Link
              href={`/hotspot?year=${year}&month=${monthIndex}`}
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              View all ({formatTaka(hotspotRevenue)})
            </Link>
          }
        >
          {recentHotspot.length === 0 ? (
            <EmptyState
              icon={Wifi}
              title="No hotspot sales this month"
              description="Voucher sales recorded in this month will appear here."
              accent="hotspot"
              action={
                <Link href={`/hotspot?year=${year}&month=${monthIndex}`} className={ui.buttonSecondarySm}>
                  Record a sale <ArrowRight size={12} />
                </Link>
              }
              size="compact"
            />
          ) : (
            <div className="divide-y divide-stone-100">
              {recentHotspot.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accents.hotspot.soft}`}
                    >
                      <Wifi size={15} className={accents.hotspot.dot} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {sale.customerName || 'Walk-in'}
                      </p>
                      <p className="truncate text-xs text-stone-400">
                        {packageLabel(sale.package)} {sale.quantity > 1 ? `× ${sale.quantity}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-emerald-600">
                      {formatTaka(sale.amount)}
                    </p>
                    <p className="text-xs text-stone-400">{formatDateShort(sale.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
