import Link from 'next/link';
import {
  Plus,
  UserCheck,
  Edit2,
  CheckCircle,
  XCircle,
  Phone,
  PieChart,
  Banknote,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';
import { formatTaka } from '@/lib/format';
import { formatPeriod } from '@/lib/period';
import type { PartnerSummary, Period } from './shared';

interface PartnerTableProps {
  partners: PartnerSummary[];
  activePartners: PartnerSummary[];
  totalShare: number;
  period: Period;
  onAdd: () => void;
  onEdit: (partner: PartnerSummary) => void;
  onGiveMoney: (partner: PartnerSummary) => void;
  onToggleActive: (partner: PartnerSummary) => void;
}

function balanceBadge(balance: number) {
  if (balance > 0.005) {
    return {
      label: 'Payable',
      className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
      amountClass: 'text-emerald-800',
    };
  }
  if (balance < -0.005) {
    return {
      label: 'Advance',
      className: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
      amountClass: 'text-sky-700',
    };
  }
  return {
    label: 'Settled',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    amountClass: 'text-stone-500',
  };
}

export default function PartnerTable({
  partners,
  activePartners,
  totalShare,
  period,
  onAdd,
  onEdit,
  onGiveMoney,
  onToggleActive,
}: PartnerTableProps) {
  const showHeaderStats = partners.length > 0;
  const totalPayableBalance = partners.reduce(
    (sum, p) => sum + (p.balance > 0 ? p.balance : 0),
    0,
  );
  const periodEarned = partners.reduce((sum, p) => sum + p.thisMonthEarned, 0);
  const periodPaid = partners.reduce((sum, p) => sum + p.thisMonthPaid, 0);

  return (
    <>
      {showHeaderStats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
                Total Payable Balance
              </p>
              <Wallet size={15} className="text-emerald-200" />
            </div>
            <p className="mt-1.5 text-2xl font-extrabold tabular-nums">
              {formatTaka(totalPayableBalance, { decimals: true })}
            </p>
            <p className="mt-1 text-xs text-emerald-100/80">
              Across {activePartners.length} active partner{activePartners.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
              {formatPeriod(period.year, period.month)} Credited
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-700">
              +{formatTaka(periodEarned, { decimals: true })}
            </p>
            <p className="mt-1 text-xs text-stone-500">Added from monthly calculation</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
              Money Given ({formatPeriod(period.year, period.month)})
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-rose-700">
              {periodPaid > 0 ? `−${formatTaka(periodPaid, { decimals: true })}` : formatTaka(0)}
            </p>
            <p className="mt-1 text-xs text-stone-500">Deducted from balances</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
              Total Share Allocated
            </p>
            <p
              className={`mt-1.5 text-2xl font-bold tabular-nums ${
                Math.abs(totalShare - 100) > 0.1 ? 'text-amber-600' : 'text-stone-900'
              }`}
            >
              {totalShare.toFixed(2)}%
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {partners.length} partner profile{partners.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.04]">
        {partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 rounded-full bg-emerald-50 p-5 ring-1 ring-emerald-200/50">
              <UserCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-stone-800">No partners yet</p>
            <p className="mt-1 text-sm text-stone-400">
              Add partners to track profit shares and individual wallet balances
            </p>
            <button
              onClick={onAdd}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus size={16} />
              Add First Partner
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-emerald-900/[0.04]">
              <thead className="bg-emerald-50/40">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Partner Profile
                  </th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Share %
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Total Credited
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Total Given
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Current Balance
                  </th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
                {partners.map((partner) => {
                  const badge = balanceBadge(partner.balance);
                  const totalCredited = partner.totalEarned + partner.totalCreditAdjustments;
                  const totalDeducted = partner.totalPaid + partner.totalDebitAdjustments;
                  const profileHref = `/partners/${partner.id}?year=${period.year}&month=${period.month}`;

                  return (
                    <tr key={partner.id} className="group transition-colors hover:bg-emerald-50/30">
                      <td className="whitespace-nowrap px-5 py-4">
                        <Link href={profileHref} className="flex items-center gap-3 group/link">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 font-bold text-white shadow-sm">
                            {(partner.name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1 font-semibold text-stone-900 group-hover/link:text-emerald-700 group-hover/link:underline">
                              {partner.name}
                              <ArrowUpRight size={13} className="text-stone-400 group-hover/link:text-emerald-600" />
                            </div>
                            {partner.phone ? (
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                                <Phone size={11} className="text-stone-400" />
                                {partner.phone}
                              </div>
                            ) : (
                              <div className="mt-0.5 text-xs text-stone-400">
                                {partner.calculatedMonthsCount} month{partner.calculatedMonthsCount === 1 ? '' : 's'} · {partner.payoutsCount} payment{partner.payoutsCount === 1 ? '' : 's'}
                              </div>
                            )}
                          </div>
                        </Link>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-center">
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200/60">
                          <PieChart size={12} className="text-emerald-600" />
                          {partner.sharePercent}%
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold tabular-nums text-emerald-700">
                        +{formatTaka(totalCredited, { decimals: true })}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold tabular-nums text-rose-700">
                        {totalDeducted > 0
                          ? `−${formatTaka(totalDeducted, { decimals: true })}`
                          : formatTaka(0, { decimals: true })}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className={`text-base font-extrabold tabular-nums ${badge.amountClass}`}>
                          {formatTaka(partner.balance, { decimals: true })}
                        </div>
                        <span
                          className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleActive(partner)}
                          title={partner.isActive ? 'Click to deactivate' : 'Click to activate'}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${
                            partner.isActive
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'
                          }`}
                        >
                          {partner.isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {partner.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onGiveMoney(partner)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
                          >
                            <Banknote size={13} />
                            Give Money
                          </button>
                          <Link
                            href={profileHref}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-emerald-800"
                          >
                            Profile
                          </Link>
                          <button
                            type="button"
                            onClick={() => onEdit(partner)}
                            className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                            title="Edit partner"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
