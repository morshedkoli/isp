'use client';

import Link from 'next/link';
import {
  Wifi, Receipt, Calculator, TrendingDown, Users,
  ArrowRight, Banknote, PieChart, ShoppingBag, LayoutDashboard,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import PeriodSelector from '@/components/ui/PeriodSelector';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/Card';
import { formatTaka, formatDeduction, formatPercent, formatDateShort } from '@/lib/format';
import { formatPeriod, type Period } from '@/lib/period';
import { accents, statusBadge, ui, PARTNER_ACCENTS } from '@/lib/ui-tokens';
import { HOTSPOT_PACKAGES, type HotspotPackageKey } from '../hotspot/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartnerShare {
  id: string;
  name: string;
  sharePercent: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
}

interface DashboardData {
  month: string;
  monthIndex: number;
  year: number;
  companyCommission: number;
  agentPayouts: number;
  salaryTotal: number;
  fiberCableTotal: number;
  rentTotal?: number;
  utilitiesTotal?: number;
  equipmentTotal?: number;
  conveyanceTotal?: number;
  miscTotal: number;
  totalExpenses: number;
  hotspotRevenue: number;
  hotspotCount: number;
  netCommission: number;
  hasCommissionRecord?: boolean;
  partnerShares: PartnerShare[];
  recentHotspot: {
    id: string;
    package: string;
    amount: number;
    customerName?: string | null;
    date: string;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** One row of the commission waterfall. */
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
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${accents[accent].soft}`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${accents[accent].text}`}>
        {indented && <ArrowRight size={13} className="opacity-60" />}
        {label}
      </div>
      <span className={`font-semibold tabular-nums ${accents[accent].text}`}>{value}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardClient({
  data,
  availablePeriods,
}: {
  data: DashboardData;
  availablePeriods: Period[];
}) {
  const {
    monthIndex, year,
    companyCommission, agentPayouts,
    salaryTotal, fiberCableTotal,
    rentTotal = 0, utilitiesTotal = 0, equipmentTotal = 0, conveyanceTotal = 0,
    miscTotal, totalExpenses,
    hotspotRevenue, hotspotCount,
    netCommission, hasCommissionRecord, partnerShares, recentHotspot,
  } = data;

  const isProfit = netCommission >= 0;
  const totalAllocated = partnerShares.reduce((sum, p) => sum + p.amount, 0);
  const allocatedPercent = partnerShares.reduce((sum, p) => sum + p.sharePercent, 0);
  const settledCount = partnerShares.filter((p) => p.amount > 0 && p.remainingAmount <= 0).length;
  const pendingCount = partnerShares.filter((p) => p.remainingAmount > 0).length;
  const settleHref = `/partners?settle=1&year=${year}&month=${monthIndex}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`${formatPeriod(year, monthIndex)} overview`}
        icon={LayoutDashboard}
        accent="commission"
        actions={
          <>
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
            <span>No commission record entered for {formatPeriod(year, monthIndex)} yet.</span>
          </div>
          <Link
            href={`/commissions?year=${year}&month=${monthIndex}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
          >
            Record Commission <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/*
        ── KPI row ───────────────────────────────────────────────────────────
        The bottom line leads. Four equally-loud gradient tiles gave the month's
        net the same weight as its inputs, so nothing read as the answer — and
        on a phone the four stacked blocks pushed every table below the fold.
        The net stays solid; the three figures feeding it are supporting tiles.
      */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <StatCard
            label={isProfit ? 'Net to Partners' : 'Net Loss'}
            value={formatTaka(netCommission)}
            hint={isProfit ? 'Distributable profit' : 'Net loss this month'}
            icon={PieChart}
            accent={isProfit ? 'profit' : 'loss'}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
          <StatCard
            label="Company Commission"
            value={formatTaka(companyCommission)}
            hint={`Agent payouts ${formatTaka(agentPayouts)}`}
            icon={Banknote}
            accent="commission"
            variant="soft"
          />
          <StatCard
            label="Total Expenses"
            value={formatTaka(totalExpenses)}
            hint={`Salary ${formatTaka(salaryTotal)} · Fiber ${formatTaka(fiberCableTotal)}`}
            icon={Receipt}
            accent="expense"
            variant="soft"
          />
          <StatCard
            label="Hotspot Sales"
            value={formatTaka(hotspotRevenue)}
            hint={`${hotspotCount} voucher${hotspotCount === 1 ? '' : 's'} sold`}
            icon={Wifi}
            accent="hotspot"
            variant="soft"
          />
        </div>
      </div>

      {/* ── Commission waterfall + partner distribution ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Commission Breakdown"
          icon={Calculator}
          accent="commission"
          aside={<span className="text-xs text-stone-400">{formatPeriod(year, monthIndex)}</span>}
        >
          <div className="space-y-2.5">
            <BreakdownRow
              label="Company Commission"
              value={formatTaka(companyCommission)}
              accent="commission"
            />
            <BreakdownRow
              label="Agent Payouts"
              value={formatDeduction(agentPayouts)}
              accent="agent"
              indented
            />
            {salaryTotal > 0 && (
              <BreakdownRow
                label="বেতন (Salaries)"
                value={formatDeduction(salaryTotal)}
                accent="partner"
                indented
              />
            )}
            {fiberCableTotal > 0 && (
              <BreakdownRow
                label="ফাইবার ক্যাবল (Fiber Cable)"
                value={formatDeduction(fiberCableTotal)}
                accent="hotspot"
                indented
              />
            )}
            {rentTotal > 0 && (
              <BreakdownRow
                label="অফিস ও বাসা ভাড়া (Rent)"
                value={formatDeduction(rentTotal)}
                accent="expense"
                indented
              />
            )}
            {utilitiesTotal > 0 && (
              <BreakdownRow
                label="বিদ্যুৎ ও বিল (Utilities)"
                value={formatDeduction(utilitiesTotal)}
                accent="expense"
                indented
              />
            )}
            {equipmentTotal > 0 && (
              <BreakdownRow
                label="যন্ত্রপাতি ও ডিভাইস (Equipment)"
                value={formatDeduction(equipmentTotal)}
                accent="expense"
                indented
              />
            )}
            {conveyanceTotal > 0 && (
              <BreakdownRow
                label="যাতায়াত খরচ (Conveyance)"
                value={formatDeduction(conveyanceTotal)}
                accent="expense"
                indented
              />
            )}
            {miscTotal > 0 && (
              <BreakdownRow
                label="অন্যান্য খরচ (Misc. Expenses)"
                value={formatDeduction(miscTotal)}
                accent="expense"
                indented
              />
            )}
            {totalExpenses === 0 && (
              <div className="px-4 py-1 text-xs italic text-stone-400">কোনো খরচ রেকর্ড করা হয়নি (No expenses)</div>
            )}

            <div className="border-t-2 border-dashed border-stone-200" />

            <div
              className={`flex items-center justify-between rounded-xl px-4 py-4 ${isProfit ? accents.profit.soft : accents.expense.soft}`}
            >
              <span className={`font-bold ${isProfit ? accents.profit.text : accents.expense.text}`}>
                Net Distributable
              </span>
              <span
                className={`text-xl font-extrabold tabular-nums ${isProfit ? accents.profit.text : accents.expense.text}`}
              >
                {formatTaka(netCommission)}
              </span>
            </div>
          </div>

          <Link
            href={`/commissions?year=${year}&month=${monthIndex}`}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800 hover:underline"
          >
            Go to full commission calculator <ArrowRight size={12} />
          </Link>
        </SectionCard>

        <SectionCard
          title="Partner Distribution"
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
                const barWidth = netCommission > 0
                  ? Math.min((partner.amount / netCommission) * 100, 100)
                  : partner.sharePercent;

                return (
                  <div key={partner.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      {/* Wraps rather than squeezing the name: on a 320px screen the
                          two badges left "Halim" 33px of a 38px word and clipped it. */}
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accent.soft} ${accent.text}`}
                        >
                          {partner.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-stone-800">
                          {partner.name}
                        </span>
                        <span className={`${ui.badge} shrink-0 ${accent.soft} ${accent.text}`}>
                          {formatPercent(partner.sharePercent)}
                        </span>
                        <Link
                          href={settleHref}
                          className={`${ui.badge} shrink-0 ${status.className} transition-opacity hover:opacity-80`}
                        >
                          {status.label}
                        </Link>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold tabular-nums ${accent.text}`}>
                          {formatTaka(partner.amount)}
                        </p>
                        {partner.amount > 0 && (
                          <p className="text-[11px] tabular-nums text-stone-500">
                            Paid {formatTaka(partner.paidAmount)} · Due{' '}
                            {formatTaka(partner.remainingAmount)}
                          </p>
                        )}
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
                <span>Total allocated ({formatPercent(allocatedPercent)})</span>
                <span className="font-semibold tabular-nums text-stone-700">
                  {formatTaka(totalAllocated)}
                </span>
              </div>
            </div>
          )}

          <Link
            href={`/partners?year=${year}&month=${monthIndex}`}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
          >
            Manage partners <ArrowRight size={12} />
          </Link>
        </SectionCard>
      </div>

      {/* ── Expenses + recent hotspot ───────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="এই মাসের খরচ (Expenses This Month)" icon={TrendingDown} accent="expense">
          <div className="space-y-2.5">
            {salaryTotal > 0 && (
              <BreakdownRow
                label="বেতন (Salaries)"
                value={formatTaka(salaryTotal)}
                accent="partner"
              />
            )}
            {fiberCableTotal > 0 && (
              <BreakdownRow label="ফাইবার ক্যাবল (Fiber Cable)" value={formatTaka(fiberCableTotal)} accent="hotspot" />
            )}
            {rentTotal > 0 && (
              <BreakdownRow label="অফিস ও বাসা ভাড়া (Rent)" value={formatTaka(rentTotal)} accent="expense" />
            )}
            {utilitiesTotal > 0 && (
              <BreakdownRow label="বিদ্যুৎ ও বিল (Utilities)" value={formatTaka(utilitiesTotal)} accent="expense" />
            )}
            {equipmentTotal > 0 && (
              <BreakdownRow label="যন্ত্রপাতি ও ডিভাইস (Equipment)" value={formatTaka(equipmentTotal)} accent="expense" />
            )}
            {conveyanceTotal > 0 && (
              <BreakdownRow label="যাতায়াত খরচ (Conveyance)" value={formatTaka(conveyanceTotal)} accent="expense" />
            )}
            {miscTotal > 0 && (
              <BreakdownRow label="অন্যান্য খরচ (Misc. Expenses)" value={formatTaka(miscTotal)} accent="agent" />
            )}
            {totalExpenses === 0 && (
              <p className="px-4 py-2 text-xs italic text-stone-400">কোনো খরচ রেকর্ড করা হয়নি (No expenses recorded)</p>
            )}
            <div className={`flex items-center justify-between rounded-xl px-4 py-4 ${accents.expense.soft}`}>
              <span className={`font-bold ${accents.expense.text}`}>সর্বমোট খরচ (Grand Total)</span>
              <span className={`text-xl font-extrabold tabular-nums ${accents.expense.text}`}>
                {formatTaka(totalExpenses)}
              </span>
            </div>
          </div>

          <Link
            href={`/expenses?year=${year}&month=${monthIndex}`}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 transition-colors hover:text-rose-700 hover:underline"
          >
            Manage expenses <ArrowRight size={12} />
          </Link>
        </SectionCard>

        <SectionCard
          title="Recent Hotspot Sales"
          icon={ShoppingBag}
          accent="hotspot"
          aside={
            <Link
              href={`/hotspot?year=${year}&month=${monthIndex}`}
              className="text-xs font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline"
            >
              View all
            </Link>
          }
        >
          {recentHotspot.length === 0 ? (
            <EmptyState
              icon={Wifi}
              title="No hotspot sales yet"
              description="Voucher sales you record will appear here."
              accent="hotspot"
              action={
                <Link href={`/hotspot?year=${year}&month=${monthIndex}`} className={ui.buttonSecondarySm}>
                  Record a sale <ArrowRight size={12} />
                </Link>
              }
              size="compact"
            />
          ) : (
            <div className="divide-y divide-stone-50">
              {recentHotspot.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accents.hotspot.soft}`}>
                      <Wifi size={15} className={accents.hotspot.dot} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {sale.customerName || 'Walk-in'}
                      </p>
                      <p className="truncate text-xs text-stone-400">{packageLabel(sale.package)}</p>
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
