'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Calculator,
  CheckCircle2,
  Edit2,
  Phone,
  PieChart,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate, formatPercent, formatTaka } from '@/lib/format';
import type { PartnerLedgerResult } from '@/lib/partner-ledger';
import { formatPeriod } from '@/lib/period';
import { ui } from '@/lib/ui-tokens';
import { deletePartnerAdjustment, deletePartnerPayout } from '../actions';
import BalanceAdjustmentModal from '../BalanceAdjustmentModal';
import GiveMoneyModal, { type EditingPayoutData } from '../GiveMoneyModal';
import PartnerFormModal from '../PartnerFormModal';
import { formatMethod, type PartnerLedgerEntry, type PartnerSummary, type Period } from '../shared';

interface PartnerProfileClientProps {
  profile: PartnerLedgerResult;
  partnerSummary: PartnerSummary;
  allPartners: PartnerSummary[];
  selectedPeriod: Period;
  excludedCurrentPeriod: Period;
}

type ViewFilter = 'all' | 'calculations' | 'payouts' | 'monthly';

export default function PartnerProfileClient({
  profile,
  partnerSummary,
  allPartners,
  selectedPeriod,
  excludedCurrentPeriod,
}: PartnerProfileClientProps) {
  const router = useRouter();

  const [filter, setFilter] = useState<ViewFilter>('all');
  const [isGiveMoneyOpen, setIsGiveMoneyOpen] = useState(false);
  const [editingPayout, setEditingPayout] = useState<EditingPayoutData | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'PAYOUT' | 'ADJUSTMENT';
    rawId: string;
    label: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalShare = useMemo(
    () => allPartners.filter((p) => p.isActive).reduce((s, p) => s + p.sharePercent, 0),
    [allPartners],
  );

  const filteredEntries = useMemo(() => {
    if (filter === 'calculations') {
      return profile.entries.filter((e) => e.kind === 'CALCULATION');
    }
    if (filter === 'payouts') {
      return profile.entries.filter((e) => e.kind === 'PAYOUT');
    }
    return profile.entries;
  }, [profile.entries, filter]);

  const totalCredited = profile.totalEarned + profile.totalCreditAdjustments;
  const totalDeducted = profile.totalPaid + profile.totalDebitAdjustments;
  const periodQuery = `year=${selectedPeriod.year}&month=${selectedPeriod.month}`;

  const handleOpenEditPayout = (entry: PartnerLedgerEntry) => {
    if (entry.kind !== 'PAYOUT' || !entry.method) return;
    setEditingPayout({
      id: entry.rawId,
      partnerId: profile.partnerId,
      amount: entry.amount,
      date: entry.date,
      method: entry.method,
      referenceId: entry.referenceId,
      notes: entry.notes,
    });
    setIsGiveMoneyOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res =
        deleteTarget.kind === 'PAYOUT'
          ? await deletePartnerPayout(deleteTarget.rawId)
          : await deletePartnerAdjustment(deleteTarget.rawId);
      if (res.success) {
        setDeleteTarget(null);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const balanceState =
    profile.balance > 0.005
      ? {
          badge: 'Payable Balance',
          heroClass: 'from-emerald-700 via-teal-700 to-emerald-800 ring-emerald-500/30',
          subtext: 'Available balance owed to this partner',
        }
      : profile.balance < -0.005
        ? {
            badge: 'Advance Given',
            heroClass: 'from-sky-700 via-cyan-700 to-slate-800 ring-sky-500/30',
            subtext: 'Paid ahead of calculated shares',
          }
        : {
            badge: 'Fully Settled',
            heroClass: 'from-stone-700 via-stone-800 to-stone-900 ring-stone-500/30',
            subtext: 'All calculated shares have been paid out',
          };

  return (
    <div className="space-y-6">
      {/* Top Bar: Back + Partner Quick Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/partners?${periodQuery}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs ring-1 ring-emerald-950/[0.06] transition-colors hover:bg-emerald-50 hover:text-emerald-800"
        >
          <ArrowLeft size={14} />
          All Partners
        </Link>

        {allPartners.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white p-1 shadow-xs ring-1 ring-emerald-950/[0.06]">
            {allPartners.map((p) => {
              const active = p.id === profile.partnerId;
              return (
                <Link
                  key={p.id}
                  href={`/partners/${p.id}?${periodQuery}`}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-emerald-50 hover:text-stone-900'
                  }`}
                >
                  <span>{p.name}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {formatTaka(p.balance)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Partner Profile Header Card */}
      <div className="overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.05]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-xl font-black text-white shadow-md shadow-emerald-600/20">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                  {profile.name}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                  <PieChart size={12} className="text-emerald-600" />
                  {profile.sharePercent}% Share
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    profile.isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                  }`}
                >
                  {profile.isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                  {profile.isActive ? 'Active Partner' : 'Inactive'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-stone-500">
                {profile.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} className="text-stone-400" />
                    {profile.phone}
                  </span>
                )}
                <span>
                  {profile.calculatedMonthsCount} completed month
                  {profile.calculatedMonthsCount === 1 ? '' : 's'} · {profile.payoutsCount} payment
                  {profile.payoutsCount === 1 ? '' : 's'} given
                </span>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                  Excludes {formatPeriod(excludedCurrentPeriod.year, excludedCurrentPeriod.month)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEditingPayout(null);
                setIsGiveMoneyOpen(true);
              }}
              className={ui.buttonPrimary}
            >
              <Banknote size={16} />
              Give Money
            </button>
            <button
              type="button"
              onClick={() => setIsAdjustOpen(true)}
              className={ui.buttonSecondary}
            >
              <Scale size={15} />
              Adjust Balance
            </button>
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className={ui.buttonSecondary}
            >
              <Edit2 size={14} />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Balance & Wallet Summary Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Main Balance Hero */}
          <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-md ring-1 ${balanceState.heroClass}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                Current Balance
              </span>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                {balanceState.badge}
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
              {formatTaka(profile.balance, { decimals: true })}
            </p>
            <p className="mt-1 text-[11px] text-white/75">{balanceState.subtext}</p>
          </div>

          {/* Total Credited */}
          <div className="rounded-2xl border border-emerald-950/[0.05] bg-emerald-50/40 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span>Total Credited (+)</span>
              <TrendingUp size={15} className="text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-800">
              +{formatTaka(totalCredited, { decimals: true })}
            </p>
            <p className="mt-1 text-[11px] text-stone-500">
              Shares: {formatTaka(profile.totalEarned, { decimals: true })}
              {profile.totalCreditAdjustments > 0 &&
                ` · Adj: +${formatTaka(profile.totalCreditAdjustments, { decimals: true })}`}
            </p>
          </div>

          {/* Total Given */}
          <div className="rounded-2xl border border-rose-950/[0.05] bg-rose-50/40 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
              <span>Total Money Given (−)</span>
              <TrendingDown size={15} className="text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-rose-700">
              {totalDeducted > 0
                ? `−${formatTaka(totalDeducted, { decimals: true })}`
                : formatTaka(0, { decimals: true })}
            </p>
            <p className="mt-1 text-[11px] text-stone-500">
              Payouts: {formatTaka(profile.totalPaid, { decimals: true })}
              {profile.totalDebitAdjustments > 0 &&
                ` · Adj: −${formatTaka(profile.totalDebitAdjustments, { decimals: true })}`}
            </p>
          </div>

          {/* Selected Period Share */}
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
              <span>{formatPeriod(selectedPeriod.year, selectedPeriod.month)}</span>
              <Wallet size={15} className="text-teal-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-stone-900">
              +{formatTaka(profile.thisMonthEarned, { decimals: true })}
            </p>
            <Link
              href={`/commissions?${periodQuery}`}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              Open calculator <ArrowUpRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* Ledger & Monthly Breakdown Card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.05]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-950/[0.05] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Account Statement & Transactions</h2>
            <p className="text-xs text-stone-500">
              Calculated monthly shares add to balance (+); money given deducts from balance (−)
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Statement view"
            className="flex flex-wrap items-center gap-1 rounded-xl bg-stone-100 p-1"
          >
            {[
              { key: 'all' as const, label: `All (${profile.entries.length})` },
              {
                key: 'calculations' as const,
                label: `Calculations (${profile.calculatedMonthsCount})`,
              },
              { key: 'payouts' as const, label: `Money Given (${profile.payoutsCount})` },
              { key: 'monthly' as const, label: 'Monthly Summary' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={filter === tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === tab.key
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filter === 'monthly' ? (
          profile.monthlyBreakdown.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Calculator}
                title="No calculated months yet"
                description="Save a monthly commission calculation to credit this partner's profile."
                size="compact"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={ui.table}>
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.tableHeadCell}>Month</th>
                    <th className={`${ui.tableHeadCell} text-right`}>ISP Pool</th>
                    <th className={`${ui.tableHeadCell} text-right`}>Agents & Expenses</th>
                    <th className={`${ui.tableHeadCell} text-right`}>Net Pool</th>
                    <th className={`${ui.tableHeadCell} text-center`}>Share %</th>
                    <th className={`${ui.tableHeadCell} text-right`}>Credited to Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
                  {profile.monthlyBreakdown.map((m) => (
                    <tr key={`${m.year}-${m.month}`} className={ui.tableRow}>
                      <td className={ui.tableCell + ' font-semibold text-stone-900'}>
                        <Link
                          href={`/commissions?year=${m.year}&month=${m.month}`}
                          className="inline-flex items-center gap-1 hover:text-emerald-700 hover:underline"
                        >
                          {formatPeriod(m.year, m.month)}
                          <ArrowUpRight size={12} className="text-stone-400" />
                        </Link>
                      </td>
                      <td className={`${ui.tableCell} text-right tabular-nums`}>
                        {formatTaka(m.companyCommission, { decimals: true })}
                      </td>
                      <td className={`${ui.tableCell} text-right tabular-nums text-rose-700`}>
                        −{formatTaka(m.agentPayouts + m.totalExpenses, { decimals: true })}
                      </td>
                      <td className={`${ui.tableCell} text-right font-medium tabular-nums`}>
                        {formatTaka(m.netPool, { decimals: true })}
                      </td>
                      <td className={`${ui.tableCell} text-center text-xs font-semibold text-stone-600`}>
                        {formatPercent(m.sharePercent)}
                      </td>
                      <td className={`${ui.tableCell} text-right font-bold tabular-nums text-emerald-700`}>
                        +{formatTaka(m.creditedAmount, { decimals: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredEntries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Wallet}
              title="No transactions in this view"
              description="Calculated monthly shares and money given to this partner will appear here."
              size="compact"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={ui.table}>
              <thead className={ui.tableHead}>
                <tr>
                  <th className={ui.tableHeadCell}>Date</th>
                  <th className={ui.tableHeadCell}>Transaction</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Added (+)</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Given / Deducted (−)</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Running Balance</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
                {filteredEntries.map((entry) => {
                  const isCredit = entry.direction === 'CREDIT';

                  return (
                    <tr key={entry.id} className={ui.tableRow}>
                      <td className={ui.tableCell + ' whitespace-nowrap text-xs text-stone-500'}>
                        {formatDate(entry.date)}
                      </td>

                      <td className={ui.tableCell}>
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              entry.kind === 'CALCULATION'
                                ? 'bg-emerald-50 text-emerald-700'
                                : entry.kind === 'PAYOUT'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {entry.kind === 'CALCULATION' ? (
                              <Calculator size={14} />
                            ) : entry.kind === 'PAYOUT' ? (
                              <Banknote size={14} />
                            ) : (
                              <Scale size={14} />
                            )}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {entry.kind === 'CALCULATION' && entry.year && entry.month ? (
                                <Link
                                  href={`/commissions?year=${entry.year}&month=${entry.month}`}
                                  className="font-semibold text-stone-900 hover:text-emerald-700 hover:underline"
                                >
                                  {entry.title}
                                </Link>
                              ) : (
                                <span className="font-semibold text-stone-900">{entry.title}</span>
                              )}

                              {entry.kind === 'PAYOUT' && entry.method && (
                                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                                  {formatMethod(entry.method)}
                                </span>
                              )}
                            </div>
                            {entry.subtitle && (
                              <p className="mt-0.5 text-xs text-stone-500">{entry.subtitle}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className={`${ui.tableCell} whitespace-nowrap text-right font-bold tabular-nums`}>
                        {isCredit ? (
                          <span className="text-emerald-700">
                            +{formatTaka(entry.amount, { decimals: true })}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      <td className={`${ui.tableCell} whitespace-nowrap text-right font-bold tabular-nums`}>
                        {!isCredit ? (
                          <span className="text-rose-700">
                            −{formatTaka(entry.amount, { decimals: true })}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      <td className={`${ui.tableCell} whitespace-nowrap text-right font-extrabold tabular-nums text-stone-900`}>
                        {formatTaka(entry.balanceAfter, { decimals: true })}
                      </td>

                      <td className={`${ui.tableCell} whitespace-nowrap text-right`}>
                        {entry.kind === 'CALCULATION' && entry.year && entry.month ? (
                          <Link
                            href={`/commissions?year=${entry.year}&month=${entry.month}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Calculator <ArrowUpRight size={12} />
                          </Link>
                        ) : entry.kind === 'PAYOUT' ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayout(entry)}
                              className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                              title="Edit payment"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: 'PAYOUT',
                                  rawId: entry.rawId,
                                  label: `${formatTaka(entry.amount, { decimals: true })} payment`,
                                })
                              }
                              className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                              title="Delete payment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'ADJUSTMENT',
                                rawId: entry.rawId,
                                label: `${formatTaka(entry.amount, { decimals: true })} adjustment`,
                              })
                            }
                            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Delete adjustment"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isGiveMoneyOpen && (
        <GiveMoneyModal
          partners={allPartners}
          defaultPartnerId={profile.partnerId}
          lockedPartner={true}
          editingPayout={editingPayout}
          onClose={() => {
            setIsGiveMoneyOpen(false);
            setEditingPayout(null);
          }}
          onSaved={() => {
            setIsGiveMoneyOpen(false);
            setEditingPayout(null);
            router.refresh();
          }}
        />
      )}

      {isAdjustOpen && (
        <BalanceAdjustmentModal
          partner={partnerSummary}
          onClose={() => setIsAdjustOpen(false)}
          onSaved={() => {
            setIsAdjustOpen(false);
            router.refresh();
          }}
        />
      )}

      {isEditProfileOpen && (
        <PartnerFormModal
          editingPartner={partnerSummary}
          totalShare={totalShare}
          onClose={() => setIsEditProfileOpen(false)}
          onSaved={() => {
            setIsEditProfileOpen(false);
            router.refresh();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.label}?`}
          description={
            deleteTarget.kind === 'PAYOUT'
              ? "Removing this payment will restore the deducted amount to the partner's balance."
              : "Removing this adjustment will recalculate the partner's balance immediately."
          }
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
