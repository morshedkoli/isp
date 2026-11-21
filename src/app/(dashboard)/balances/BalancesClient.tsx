'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  Edit2,
  FileText,
  Phone,
  Search,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { formatDate, formatPaymentMethod, formatPercent, formatTaka } from '@/lib/format';
import type { PaymentMethodType } from '@/lib/partner-ledger';
import { ui } from '@/lib/ui-tokens';
import { deleteUnifiedPayment, type PersonKind } from './actions';
import RecordPaymentModal, {
  type EditingUnifiedPayment,
  type UnifiedPersonRow,
} from './RecordPaymentModal';
import StatementModal from './StatementModal';

export interface UnifiedRecentPaymentRow {
  id: string;
  payoutId: string;
  personKind: PersonKind;
  personId: string;
  personName: string;
  amount: number;
  date: string;
  method: PaymentMethodType;
  referenceId: string | null;
  notes: string | null;
}

interface BalancesClientProps {
  people: UnifiedPersonRow[];
  recentPayments: UnifiedRecentPaymentRow[];
  cutoffLabel: string;
  excludedCurrentMonthLabel: string;
}

type RoleFilter = 'ALL' | 'PARTNER' | 'AGENT';

function balanceStatus(balance: number) {
  if (balance > 0.005) {
    return {
      label: 'Payable',
      pillClass: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
      textClass: 'text-emerald-800',
    };
  }
  if (balance < -0.005) {
    return {
      label: 'Advance',
      pillClass: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
      textClass: 'text-sky-700',
    };
  }
  return {
    label: 'Settled',
    pillClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    textClass: 'text-stone-500',
  };
}

export default function BalancesClient({
  people,
  recentPayments,
  cutoffLabel,
  excludedCurrentMonthLabel,
}: BalancesClientProps) {
  const router = useRouter();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [query, setQuery] = useState('');
  const [payingPersonKey, setPayingPersonKey] = useState<string | null>(null);
  const [isLockedPay, setIsLockedPay] = useState(false);
  const [editingPayment, setEditingPayment] = useState<EditingUnifiedPayment | null>(null);
  const [statementKey, setStatementKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnifiedRecentPaymentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const partnersList = useMemo(() => people.filter((p) => p.kind === 'PARTNER'), [people]);
  const agentsList = useMemo(() => people.filter((p) => p.kind === 'AGENT'), [people]);

  const partnersPayable = useMemo(
    () => partnersList.reduce((s, p) => s + (p.balance > 0 ? p.balance : 0), 0),
    [partnersList],
  );
  const agentsPayable = useMemo(
    () => agentsList.reduce((s, p) => s + (p.balance > 0 ? p.balance : 0), 0),
    [agentsList],
  );
  const totalPayable = partnersPayable + agentsPayable;
  const totalPaidAll = useMemo(
    () => people.reduce((s, p) => s + p.totalPaid, 0),
    [people],
  );

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => {
      if (roleFilter !== 'ALL' && person.kind !== roleFilter) return false;
      if (!q) return true;
      return (
        person.name.toLowerCase().includes(q) ||
        (person.phone?.toLowerCase().includes(q) ?? false) ||
        (person.territoryOrNote?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [people, roleFilter, query]);

  const activeStatementPerson = useMemo(
    () => (statementKey ? people.find((p) => p.key === statementKey) ?? null : null),
    [people, statementKey],
  );

  const openPayGeneral = () => {
    setEditingPayment(null);
    setIsLockedPay(false);
    setPayingPersonKey(people[0]?.key ?? '');
  };

  const openPayPerson = (person: UnifiedPersonRow) => {
    setEditingPayment(null);
    setIsLockedPay(true);
    setPayingPersonKey(person.key);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteUnifiedPayment(deleteTarget.personKind, deleteTarget.payoutId);
      if (res.success) {
        setDeleteTarget(null);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balances & Payments"
        subtitle={`Completed months up to ${cutoffLabel} (${excludedCurrentMonthLabel} excluded from balances)`}
        icon={Wallet}
        accent="profit"
        toolbar={
          <span className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Excludes {excludedCurrentMonthLabel} (ongoing month)
          </span>
        }
        actions={
          people.length > 0 ? (
            <button type="button" onClick={openPayGeneral} className={ui.buttonPrimary}>
              <Banknote size={16} />
              Record Payment
            </button>
          ) : undefined
        }
      />

      {/* Top Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 p-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              Total Payable (All)
            </p>
            <Wallet size={15} className="text-emerald-200" />
          </div>
          <p className="mt-1.5 text-2xl font-black tabular-nums">
            {formatTaka(totalPayable, { decimals: true })}
          </p>
          <p className="mt-1 text-xs text-emerald-100/80">
            {partnersList.length} partners + {agentsList.length} field agents
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-emerald-950/[0.05]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
              Partners Balance
            </p>
            <UserCheck size={15} className="text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-800">
            {formatTaka(partnersPayable, { decimals: true })}
          </p>
          <p className="mt-1 text-xs text-stone-500">{partnersList.length} equity partners</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-emerald-950/[0.05]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-800/70">
              Field Agents Balance
            </p>
            <Users size={15} className="text-teal-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-teal-800">
            {formatTaka(agentsPayable, { decimals: true })}
          </p>
          <p className="mt-1 text-xs text-stone-500">{agentsList.length} commission agents</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-emerald-950/[0.05]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-800/70">
              Total Paid Out
            </p>
            <Banknote size={15} className="text-rose-600" />
          </div>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-rose-700">
            {totalPaidAll > 0
              ? `−${formatTaka(totalPaidAll, { decimals: true })}`
              : formatTaka(0, { decimals: true })}
          </p>
          <p className="mt-1 text-xs text-stone-500">All recorded payments</p>
        </div>
      </div>

      {/* Filter Bar + People & Balances Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06)] ring-1 ring-emerald-950/[0.05]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-950/[0.05] px-5 py-4">
          <div
            role="tablist"
            aria-label="Filter by role"
            className="flex items-center gap-1 rounded-xl bg-stone-100 p-1"
          >
            {[
              { key: 'ALL' as const, label: `All (${people.length})` },
              { key: 'PARTNER' as const, label: `Partners (${partnersList.length})` },
              { key: 'AGENT' as const, label: `Field Agents (${agentsList.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={roleFilter === tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  roleFilter === tab.key
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, area…"
              className={`${ui.input} py-1.5 pl-8 text-xs`}
            />
          </div>
        </div>

        {filteredPeople.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Users}
              title="No matching people found"
              description="Try switching the role tab or clearing your search."
              size="compact"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-emerald-900/[0.04]">
              <thead className="bg-emerald-50/40">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Name & Role
                  </th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Rate / Share
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Total Earned (+)
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Total Paid (−)
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Current Balance
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70">
                    Payment & Statement
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
                {filteredPeople.map((person) => {
                  const status = balanceStatus(person.balance);
                  const isPartner = person.kind === 'PARTNER';

                  return (
                    <tr key={person.key} className="transition-colors hover:bg-emerald-50/30">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white shadow-xs ${
                              isPartner
                                ? 'bg-gradient-to-br from-emerald-600 to-emerald-700'
                                : 'bg-gradient-to-br from-teal-600 to-cyan-700'
                            }`}
                          >
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {isPartner ? (
                                <Link
                                  href={`/partners/${person.id}`}
                                  className="font-bold text-stone-900 hover:text-emerald-700 hover:underline"
                                >
                                  {person.name}
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setStatementKey(person.key)}
                                  className="font-bold text-stone-900 hover:text-teal-700 hover:underline"
                                >
                                  {person.name}
                                </button>
                              )}
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  isPartner
                                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                                    : 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                                }`}
                              >
                                {isPartner ? 'Partner' : 'Field Agent'}
                              </span>
                              {!person.isActive && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
                              {person.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone size={11} className="text-stone-400" />
                                  {person.phone}
                                </span>
                              )}
                              {person.territoryOrNote && (
                                <span className="text-stone-500">Area: {person.territoryOrNote}</span>
                              )}
                              {!person.phone && !person.territoryOrNote && (
                                <span className="text-stone-400">
                                  {person.calculatedMonthsCount} months · {person.payoutsCount} payments
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            isPartner
                              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70'
                              : 'bg-teal-50 text-teal-800 ring-1 ring-teal-200/70'
                          }`}
                        >
                          {formatPercent(person.ratePercent)} {isPartner ? 'Share' : 'Com.'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold tabular-nums text-emerald-700">
                        +{formatTaka(person.totalCredited, { decimals: true })}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold tabular-nums text-rose-700">
                        {person.totalPaid > 0
                          ? `−${formatTaka(person.totalPaid, { decimals: true })}`
                          : formatTaka(0, { decimals: true })}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className={`text-base font-extrabold tabular-nums ${status.textClass}`}>
                          {formatTaka(person.balance, { decimals: true })}
                        </div>
                        <span
                          className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.pillClass}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openPayPerson(person)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
                          >
                            <Banknote size={14} />
                            Record Payment
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatementKey(person.key)}
                            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-emerald-800"
                          >
                            <FileText size={13} />
                            Statement
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

      {/* Unified Recent Payments Table */}
      <div className={ui.card + ' overflow-hidden'}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.sectionTitle}>Recent Recorded Payments (All Partners & Agents)</h2>
            <p className={ui.pageSubtitle}>
              Latest payments across everyone — each payment automatically deducts from their balance
            </p>
          </div>
        </div>

        {recentPayments.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-stone-400">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={ui.table}>
              <thead className={ui.tableHead}>
                <tr>
                  <th className={ui.tableHeadCell}>Date</th>
                  <th className={ui.tableHeadCell}>Recipient</th>
                  <th className={ui.tableHeadCell}>Role</th>
                  <th className={ui.tableHeadCell}>Method</th>
                  <th className={ui.tableHeadCell}>Notes / Reference</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Paid Amount</th>
                  <th className={`${ui.tableHeadCell} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/[0.03] bg-white">
                {recentPayments.map((pay) => (
                  <tr key={pay.id} className={ui.tableRow}>
                    <td className={ui.tableCell + ' whitespace-nowrap text-xs text-stone-500'}>
                      {formatDate(pay.date)}
                    </td>
                    <td className={ui.tableCell + ' font-semibold text-stone-900'}>
                      <button
                        type="button"
                        onClick={() => setStatementKey(`${pay.personKind}:${pay.personId}`)}
                        className="hover:text-emerald-700 hover:underline"
                      >
                        {pay.personName}
                      </button>
                    </td>
                    <td className={ui.tableCell}>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          pay.personKind === 'PARTNER'
                            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                            : 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                        }`}
                      >
                        {pay.personKind === 'PARTNER' ? 'Partner' : 'Field Agent'}
                      </span>
                    </td>
                    <td className={ui.tableCell}>
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                        {formatPaymentMethod(pay.method)}
                      </span>
                    </td>
                    <td className={ui.tableCell + ' text-stone-600'}>
                      {pay.notes || pay.referenceId || '-'}
                    </td>
                    <td className={`${ui.tableCell} text-right font-bold tabular-nums text-rose-700`}>
                      −{formatTaka(pay.amount, { decimals: true })}
                    </td>
                    <td className={`${ui.tableCell} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPayment({
                              payoutId: pay.payoutId,
                              personKind: pay.personKind,
                              personId: pay.personId,
                              amount: pay.amount,
                              date: pay.date,
                              method: pay.method,
                              referenceId: pay.referenceId,
                              notes: pay.notes,
                            });
                            setPayingPersonKey(`${pay.personKind}:${pay.personId}`);
                            setIsLockedPay(true);
                          }}
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-emerald-50 hover:text-emerald-700"
                          title="Edit payment"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(pay)}
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete payment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(payingPersonKey !== null || editingPayment !== null) && (
        <RecordPaymentModal
          people={people}
          selectedPersonKey={payingPersonKey || undefined}
          lockedPerson={isLockedPay}
          editingPayment={editingPayment}
          onClose={() => {
            setPayingPersonKey(null);
            setEditingPayment(null);
            setIsLockedPay(false);
          }}
          onSaved={() => {
            setPayingPersonKey(null);
            setEditingPayment(null);
            setIsLockedPay(false);
            router.refresh();
          }}
        />
      )}

      {activeStatementPerson && (
        <StatementModal
          person={activeStatementPerson}
          onClose={() => setStatementKey(null)}
          onPayClick={() => {
            const p = activeStatementPerson;
            setStatementKey(null);
            openPayPerson(p);
          }}
          onEditPayment={(ed) => {
            setStatementKey(null);
            setEditingPayment(ed);
            setPayingPersonKey(`${ed.personKind}:${ed.personId}`);
            setIsLockedPay(true);
          }}
          onChanged={() => router.refresh()}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this payment?"
          description={`Deleting this ${formatTaka(deleteTarget.amount, { decimals: true })} payment will restore the amount back to ${deleteTarget.personName}'s balance.`}
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
