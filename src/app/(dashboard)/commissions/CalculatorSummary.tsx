import Link from 'next/link';
import { TrendingUp, Wallet, PieChart, ShieldAlert, Layers } from 'lucide-react';
import { formatDeduction, formatPercent, formatTaka } from '@/lib/format';
import { formatPeriod } from '@/lib/period';
import { accents, ui, PARTNER_ACCENTS } from '@/lib/ui-tokens';
import type { Agent, Partner } from './shared';

interface CalculatorSummaryProps {
  year: number;
  month: number;
  pool: number;
  activeAgents: Agent[];
  agentAmounts: Record<string, string>;
  agentTotal: number;
  salaryTotal: number;
  fiberCableTotal: number;
  rentTotal: number;
  utilitiesTotal: number;
  equipmentTotal: number;
  conveyanceTotal: number;
  miscTotal: number;
  totalExpenses: number;
  netCommission: number;
  activePartners: Partner[];
}

/** A single deducted line in the running total. */
function DeductionRow({
  label,
  amount,
  accent,
}: {
  label: string;
  amount: number;
  accent: keyof typeof accents;
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-emerald-950/[0.03] last:border-0">
      <div className={`flex min-w-0 items-center gap-2 ${accents[accent].text}`}>
        <div className={`h-1.5 w-1.5 rounded-full ${accents[accent].bar}`} />
        <span className="truncate font-medium">{label}</span>
      </div>
      <span className={`shrink-0 font-semibold tabular-nums ${accents[accent].text}`}>
        {formatDeduction(amount)}
      </span>
    </div>
  );
}

export default function CalculatorSummary({
  year,
  month,
  pool,
  activeAgents,
  agentAmounts,
  agentTotal,
  salaryTotal,
  fiberCableTotal,
  rentTotal,
  utilitiesTotal,
  equipmentTotal,
  conveyanceTotal,
  miscTotal,
  totalExpenses,
  netCommission,
  activePartners,
}: CalculatorSummaryProps) {
  const isProfit = netCommission >= 0;
  const allocatedPercent = activePartners.reduce((sum, partner) => sum + partner.sharePercent, 0);
  const unallocatedPercent = Math.max(0, 100 - allocatedPercent);

  return (
    <div className="sticky top-24 space-y-4">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <h2 className={ui.eyebrow}>{formatPeriod(year, month)} Calculation</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-900/10">
          <Layers size={11} /> Live Breakdown
        </span>
      </div>

      {/* Net Distributable Hero Card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 shadow-lg transition-all ${
          isProfit
            ? 'bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white ring-1 ring-emerald-500/30'
            : 'bg-gradient-to-br from-rose-700 via-rose-800 to-stone-900 text-white ring-1 ring-rose-500/30'
        }`}
      >
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/80">
              Net Distributable Pool
            </span>
            <span className="rounded-lg bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
              {isProfit ? 'Profit Pool' : 'Deficit'}
            </span>
          </div>

          <p className="mt-3 text-3xl font-black tracking-tight tabular-nums text-white">
            {formatTaka(netCommission)}
          </p>

          {!isProfit && (
            <p className="mt-2 text-xs font-medium text-rose-200 flex items-center gap-1">
              <ShieldAlert size={13} /> Deficit — payouts & expenses exceed ISP pool
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-xs text-emerald-100/70">
            <span>Period: {formatPeriod(year, month)}</span>
            <span className="flex items-center gap-1 font-semibold text-white">
              <TrendingUp size={13} /> {isProfit ? 'Distributable' : 'Overdraft'}
            </span>
          </div>
        </div>
      </div>

      {/* Deductions Breakdown Card */}
      <div className={`${ui.card} p-4 space-y-3`}>
        <div className="flex items-center justify-between text-xs font-semibold text-stone-700 pb-2 border-b border-emerald-950/[0.04]">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Wallet size={14} className="text-emerald-600" /> ISP Pool Received
          </div>
          <span className="font-bold tabular-nums text-stone-900">
            {formatTaka(pool)}
          </span>
        </div>

        <div className="space-y-0.5">
          {activeAgents.map((agent) => {
            const amount = parseFloat(agentAmounts[agent.id] ?? '') || 0;
            if (amount <= 0) return null;
            return (
              <DeductionRow key={agent.id} label={`Agent: ${agent.name}`} amount={amount} accent="agent" />
            );
          })}

          {salaryTotal > 0 && (
            <DeductionRow label="বেতন (Salaries)" amount={salaryTotal} accent="partner" />
          )}
          {fiberCableTotal > 0 && (
            <DeductionRow label="ফাইবার ক্যাবল (Fiber Cable)" amount={fiberCableTotal} accent="hotspot" />
          )}
          {rentTotal > 0 && (
            <DeductionRow label="স্থান ও অফিস ভাড়া (Rent)" amount={rentTotal} accent="profit" />
          )}
          {utilitiesTotal > 0 && (
            <DeductionRow label="বিদ্যুৎ ও বিল (Utilities)" amount={utilitiesTotal} accent="loss" />
          )}
          {equipmentTotal > 0 && (
            <DeductionRow label="ডিভাইস ও যন্ত্রপাতি (Equipment)" amount={equipmentTotal} accent="commission" />
          )}
          {conveyanceTotal > 0 && (
            <DeductionRow label="যাতায়াত (Conveyance)" amount={conveyanceTotal} accent="partner" />
          )}
          {miscTotal > 0 && (
            <DeductionRow label="অন্যান্য খরচ (Misc.)" amount={miscTotal} accent="expense" />
          )}
        </div>

        <div className="pt-2 border-t border-emerald-950/[0.05] flex items-center justify-between text-xs font-semibold text-stone-600">
          <span>Total Deductions</span>
          <span className="tabular-nums text-rose-700">
            {formatDeduction(agentTotal + totalExpenses)}
          </span>
        </div>
      </div>

      {/* Partner Share Distribution */}
      {activePartners.length > 0 && netCommission > 0 && (
        <div className={`${ui.card} p-4 space-y-3`}>
          <div className="flex items-center justify-between gap-2 border-b border-emerald-950/[0.04] pb-2">
            <p className={`${ui.eyebrow} flex items-center gap-1.5 text-stone-700`}>
              <PieChart size={13} className="text-teal-600" /> Partner Share Allocation
            </p>
            {allocatedPercent !== 100 && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                {formatPercent(allocatedPercent)} assigned
              </span>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            {activePartners.map((partner, index) => {
              const accent = accents[PARTNER_ACCENTS[index % PARTNER_ACCENTS.length]];
              const amount = (netCommission * partner.sharePercent) / 100;

              return (
                <div key={partner.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${accent.bar}`} />
                      <span className="truncate font-semibold text-stone-800">
                        {partner.user?.name ?? 'Partner'}
                      </span>
                      <span className="shrink-0 text-[11px] text-stone-400 font-medium">
                        ({formatPercent(partner.sharePercent)})
                      </span>
                    </div>
                    <span className={`shrink-0 font-bold tabular-nums ${accent.text}`}>
                      {formatTaka(amount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-emerald-950/[0.05]">
                    <div
                      className={`h-full rounded-full ${accent.bar} transition-all duration-500`}
                      style={{ width: `${Math.min(partner.sharePercent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {unallocatedPercent > 0 && (
            <p className="pt-2 text-[11px] font-medium text-stone-500 border-t border-dashed border-stone-200 flex justify-between">
              <span>Unallocated Pool:</span>
              <span className="font-semibold text-amber-700">
                {formatTaka((netCommission * unallocatedPercent) / 100)} ({formatPercent(unallocatedPercent)})
              </span>
            </p>
          )}
        </div>
      )}

      {activePartners.length === 0 && (
        <div className={`${ui.cardSoft} p-4 text-center`}>
          <p className="text-xs text-stone-500">No active partners added for distribution.</p>
          <Link href="/partners" className="mt-1 block text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">
            Manage partners & shares →
          </Link>
        </div>
      )}
    </div>
  );
}
