'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Banknote,
  Calculator,
  Edit2,
  MinusCircle,
  PlusCircle,
  Scale,
  Trash2,
  X,
} from 'lucide-react';
import { businessToday } from '@/lib/business-date';
import { formatDate, formatPaymentMethod, formatTaka } from '@/lib/format';
import type { PartnerLedgerEntry } from '@/lib/partner-ledger';
import { ui } from '@/lib/ui-tokens';
import {
  deleteUnifiedAdjustment,
  deleteUnifiedPayment,
  recordUnifiedAdjustment,
} from './actions';
import type { EditingUnifiedPayment, UnifiedPersonRow } from './RecordPaymentModal';

interface StatementModalProps {
  person: UnifiedPersonRow;
  onClose: () => void;
  onPayClick: () => void;
  onEditPayment: (editing: EditingUnifiedPayment) => void;
  onChanged: () => void;
}

export default function StatementModal({
  person,
  onClose,
  onPayClick,
  onEditPayment,
  onChanged,
}: StatementModalProps) {
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjForm, setAdjForm] = useState({
    type: 'DEBIT' as 'CREDIT' | 'DEBIT',
    amount: '',
    date: businessToday(),
    reason: 'Past months already settled',
    notes: '',
  });
  const [savingAdj, setSavingAdj] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(adjForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid adjustment amount greater than ৳0.');
      return;
    }
    setSavingAdj(true);
    setError('');
    try {
      const res = await recordUnifiedAdjustment({
        personKind: person.kind,
        personId: person.id,
        type: adjForm.type,
        amount: amt,
        date: adjForm.date,
        reason: adjForm.reason,
        notes: adjForm.notes || undefined,
      });
      if (res.success) {
        setShowAdjustForm(false);
        setAdjForm((prev) => ({ ...prev, amount: '', notes: '' }));
        onChanged();
      } else {
        setError(res.error || 'Could not save adjustment.');
      }
    } finally {
      setSavingAdj(false);
    }
  };

  const handleDeleteEntry = async (entry: PartnerLedgerEntry) => {
    setBusyId(entry.id);
    setError('');
    try {
      const res =
        entry.kind === 'PAYOUT'
          ? await deleteUnifiedPayment(person.kind, entry.rawId)
          : await deleteUnifiedAdjustment(person.kind, entry.rawId);
      if (res.success) {
        onChanged();
      } else {
        setError(res.error || 'Could not delete entry.');
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-emerald-950/10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-950/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold text-white ${
                person.kind === 'PARTNER' ? 'bg-emerald-600' : 'bg-teal-600'
              }`}
            >
              {person.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900">{person.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    person.kind === 'PARTNER'
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                      : 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                  }`}
                >
                  {person.kind === 'PARTNER' ? 'Partner' : 'Field Agent'} · {person.ratePercent}%
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Credited +{formatTaka(person.totalCredited, { decimals: true })} · Paid −
                {formatTaka(person.totalPaid, { decimals: true })} ·{' '}
                <strong className="text-emerald-800">
                  Balance {formatTaka(person.balance, { decimals: true })}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPayClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Banknote size={14} /> Record Payment
            </button>
            <button
              type="button"
              onClick={() => setShowAdjustForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Scale size={14} /> Adjust Balance
            </button>
            {person.kind === 'PARTNER' && (
              <Link
                href={`/partners/${person.id}`}
                className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Full Profile <ArrowUpRight size={13} />
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* Inline Balance Adjustment Drawer */}
        {showAdjustForm && (
          <form
            onSubmit={handleSaveAdjustment}
            className="mx-6 mt-4 space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-800">
                Manual Balance Adjustment (Clear old due or add opening balance)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAdjForm((p) => ({ ...p, type: 'DEBIT' }))}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                    adjForm.type === 'DEBIT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-stone-600 ring-1 ring-stone-200'
                  }`}
                >
                  <MinusCircle size={12} /> Deduct (−)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjForm((p) => ({ ...p, type: 'CREDIT' }))}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                    adjForm.type === 'CREDIT'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-stone-600 ring-1 ring-stone-200'
                  }`}
                >
                  <PlusCircle size={12} /> Add (+)
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-stone-600">Amount (৳) *</label>
                  {adjForm.type === 'DEBIT' && person.balance > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAdjForm((p) => ({
                          ...p,
                          amount: String(Math.round(person.balance * 100) / 100),
                        }))
                      }
                      className="text-[10px] font-bold text-rose-700 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={adjForm.amount}
                  onChange={(e) => setAdjForm((p) => ({ ...p, amount: e.target.value }))}
                  className={`${ui.input} mt-1 py-1.5 text-xs font-bold`}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-600">Date *</label>
                <input
                  type="date"
                  value={adjForm.date}
                  onChange={(e) => setAdjForm((p) => ({ ...p, date: e.target.value }))}
                  className={`${ui.input} mt-1 py-1.5 text-xs`}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-stone-600">Reason *</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={adjForm.reason}
                    onChange={(e) => setAdjForm((p) => ({ ...p, reason: e.target.value }))}
                    className={`${ui.input} py-1.5 text-xs`}
                    placeholder="Reason"
                    required
                  />
                  <button
                    type="submit"
                    disabled={savingAdj}
                    className="shrink-0 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    {savingAdj ? 'Saving…' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {person.entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-400">
              No transactions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200/80">
              <table className={ui.table}>
                <thead className={ui.tableHead}>
                  <tr>
                    <th className={ui.tableHeadCell}>Date</th>
                    <th className={ui.tableHeadCell}>Details</th>
                    <th className={`${ui.tableHeadCell} text-right`}>Added (+)</th>
                    <th className={`${ui.tableHeadCell} text-right`}>Paid (−)</th>
                    <th className={`${ui.tableHeadCell} text-right`}>Balance</th>
                    <th className={`${ui.tableHeadCell} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {person.entries.map((entry) => {
                    const isCredit = entry.direction === 'CREDIT';
                    return (
                      <tr key={entry.id} className={ui.tableRow}>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center gap-2">
                            {entry.kind === 'CALCULATION' ? (
                              <Calculator size={13} className="shrink-0 text-emerald-600" />
                            ) : entry.kind === 'PAYOUT' ? (
                              <Banknote size={13} className="shrink-0 text-rose-600" />
                            ) : (
                              <Scale size={13} className="shrink-0 text-amber-600" />
                            )}
                            <span className="font-semibold text-stone-900">{entry.title}</span>
                            {entry.method && (
                              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                                {formatPaymentMethod(entry.method)}
                              </span>
                            )}
                          </div>
                          {entry.subtitle && (
                            <p className="mt-0.5 pl-5 text-[11px] text-stone-500">
                              {entry.subtitle}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold tabular-nums text-emerald-700">
                          {isCredit ? `+${formatTaka(entry.amount, { decimals: true })}` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold tabular-nums text-rose-700">
                          {!isCredit ? `−${formatTaka(entry.amount, { decimals: true })}` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-extrabold tabular-nums text-stone-900">
                          {formatTaka(entry.balanceAfter, { decimals: true })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {entry.kind === 'PAYOUT' && entry.method && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onEditPayment({
                                    payoutId: entry.rawId,
                                    personKind: person.kind,
                                    personId: person.id,
                                    amount: entry.amount,
                                    date: entry.date,
                                    method: entry.method!,
                                    referenceId: entry.referenceId,
                                    notes: entry.notes,
                                  })
                                }
                                className="rounded p-1 text-stone-400 hover:bg-emerald-50 hover:text-emerald-700"
                                title="Edit payment"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={busyId === entry.id}
                                onClick={() => handleDeleteEntry(entry)}
                                className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Delete payment"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                          {entry.kind === 'ADJUSTMENT' && (
                            <button
                              type="button"
                              disabled={busyId === entry.id}
                              onClick={() => handleDeleteEntry(entry)}
                              className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Delete adjustment"
                            >
                              <Trash2 size={13} />
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
      </div>
    </div>
  );
}
