'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Banknote } from 'lucide-react';
import Modal, { ModalActions } from '@/components/ui/Modal';
import { businessToday, toCalendarDate } from '@/lib/business-date';
import { formatPaymentMethod, formatTaka } from '@/lib/format';
import type { PartnerLedgerEntry, PaymentMethodType } from '@/lib/partner-ledger';
import { ui } from '@/lib/ui-tokens';
import { recordUnifiedPayment, updateUnifiedPayment, type PersonKind } from './actions';

export interface UnifiedPersonRow {
  key: string; // `${kind}:${id}`
  id: string;
  kind: PersonKind;
  name: string;
  phone: string | null;
  ratePercent: number;
  territoryOrNote: string | null;
  isActive: boolean;
  totalCredited: number;
  totalPaid: number;
  balance: number;
  calculatedMonthsCount: number;
  payoutsCount: number;
  entries: PartnerLedgerEntry[];
}

export interface EditingUnifiedPayment {
  payoutId: string;
  personKind: PersonKind;
  personId: string;
  amount: number;
  date: string;
  method: PaymentMethodType;
  referenceId?: string | null;
  notes?: string | null;
}

const METHODS: PaymentMethodType[] = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'];

interface RecordPaymentModalProps {
  people: UnifiedPersonRow[];
  selectedPersonKey?: string;
  lockedPerson?: boolean;
  editingPayment?: EditingUnifiedPayment | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RecordPaymentModal({
  people,
  selectedPersonKey,
  lockedPerson = false,
  editingPayment = null,
  onClose,
  onSaved,
}: RecordPaymentModalProps) {
  const initialKey = editingPayment
    ? `${editingPayment.personKind}:${editingPayment.personId}`
    : selectedPersonKey || people[0]?.key || '';

  const [form, setForm] = useState({
    personKey: initialKey,
    amount: editingPayment ? String(editingPayment.amount) : '',
    date: editingPayment ? toCalendarDate(editingPayment.date) : businessToday(),
    method: (editingPayment?.method || 'CASH') as PaymentMethodType,
    referenceId: editingPayment?.referenceId ?? '',
    notes: editingPayment?.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPerson = useMemo(
    () => people.find((p) => p.key === form.personKey) ?? null,
    [people, form.personKey],
  );

  const balanceBefore = useMemo(() => {
    if (!selectedPerson) return 0;
    if (
      editingPayment &&
      editingPayment.personKind === selectedPerson.kind &&
      editingPayment.personId === selectedPerson.id
    ) {
      return selectedPerson.balance + editingPayment.amount;
    }
    return selectedPerson.balance;
  }, [selectedPerson, editingPayment]);

  const parsedAmount = parseFloat(form.amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const balanceAfter = balanceBefore - validAmount;

  const setQuickAmount = (val: number) => {
    const rounded = Math.round(val * 100) / 100;
    if (rounded > 0) {
      setForm((prev) => ({ ...prev, amount: String(rounded) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) {
      setError('Please select a partner or agent.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter an amount greater than ৳0.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = editingPayment
        ? await updateUnifiedPayment({
            personKind: editingPayment.personKind,
            payoutId: editingPayment.payoutId,
            amount: parsedAmount,
            date: form.date,
            method: form.method,
            referenceId: form.referenceId || undefined,
            notes: form.notes || undefined,
          })
        : await recordUnifiedPayment({
            personKind: selectedPerson.kind,
            personId: selectedPerson.id,
            amount: parsedAmount,
            date: form.date,
            method: form.method,
            referenceId: form.referenceId || undefined,
            notes: form.notes || undefined,
          });

      if (result.success) {
        onSaved();
      } else {
        setError(result.error || 'Could not record payment.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingPayment ? 'Edit Recorded Payment' : 'Record Payment'}
      description={
        editingPayment
          ? 'Update payment details — balance recalculates immediately'
          : 'Record money paid to this Partner or Field Agent and deduct from their balance'
      }
      icon={Banknote}
      accent="profit"
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!lockedPerson && !editingPayment ? (
          <div>
            <label htmlFor="pay-person" className={ui.label}>
              Recipient (Partner / Agent) *
            </label>
            <select
              id="pay-person"
              value={form.personKey}
              onChange={(e) => setForm((prev) => ({ ...prev, personKey: e.target.value }))}
              className={ui.input}
              required
            >
              {people.map((p) => (
                <option key={p.key} value={p.key}>
                  [{p.kind === 'PARTNER' ? 'Partner' : 'Agent'}] {p.name} — Balance{' '}
                  {formatTaka(p.balance, { decimals: true })}
                </option>
              ))}
            </select>
          </div>
        ) : (
          selectedPerson && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3.5 py-2.5 ring-1 ring-emerald-900/10">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${
                    selectedPerson.kind === 'PARTNER' ? 'bg-emerald-600' : 'bg-teal-600'
                  }`}
                >
                  {selectedPerson.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-stone-900">{selectedPerson.name}</p>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        selectedPerson.kind === 'PARTNER'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {selectedPerson.kind === 'PARTNER' ? 'Partner' : 'Agent'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {selectedPerson.kind === 'PARTNER'
                      ? `Share ${selectedPerson.ratePercent}%`
                      : `Commission ${selectedPerson.ratePercent}%`}
                    {selectedPerson.territoryOrNote ? ` · ${selectedPerson.territoryOrNote}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  Balance
                </p>
                <p className="text-sm font-bold tabular-nums text-emerald-800">
                  {formatTaka(balanceBefore, { decimals: true })}
                </p>
              </div>
            </div>
          )
        )}

        {/* Live Deduction Preview */}
        {selectedPerson && (
          <div className="rounded-xl border border-emerald-950/[0.06] bg-stone-50/80 p-3.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div>
                <p className="text-stone-500">Current Balance</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-stone-900">
                  {formatTaka(balanceBefore, { decimals: true })}
                </p>
              </div>
              <ArrowRight size={14} className="shrink-0 text-stone-400" />
              <div>
                <p className="text-rose-600">Paying Now</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-rose-700">
                  −{formatTaka(validAmount, { decimals: true })}
                </p>
              </div>
              <ArrowRight size={14} className="shrink-0 text-stone-400" />
              <div className="text-right">
                <p className="text-stone-500">New Balance</p>
                <p
                  className={`mt-0.5 text-sm font-extrabold tabular-nums ${
                    balanceAfter < -0.005
                      ? 'text-sky-700'
                      : balanceAfter <= 0.005
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                  }`}
                >
                  {formatTaka(balanceAfter, { decimals: true })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="unified-pay-amount" className={ui.label}>
              Payment Amount (৳) *
            </label>
            {balanceBefore > 0 && !editingPayment && (
              <div className="mb-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickAmount(balanceBefore)}
                  className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-600/20 hover:bg-emerald-100"
                >
                  Full ({formatTaka(balanceBefore, { decimals: true })})
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAmount(balanceBefore / 2)}
                  className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-200"
                >
                  50%
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
              ৳
            </span>
            <input
              id="unified-pay-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className={`${ui.input} pl-8 text-base font-bold`}
              placeholder="0.00"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="unified-pay-method" className={ui.label}>
              Method *
            </label>
            <select
              id="unified-pay-method"
              value={form.method}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, method: e.target.value as PaymentMethodType }))
              }
              className={ui.input}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {formatPaymentMethod(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="unified-pay-date" className={ui.label}>
              Date *
            </label>
            <input
              id="unified-pay-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className={ui.input}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="unified-pay-ref" className={ui.label}>
              Reference / TrxID <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="unified-pay-ref"
              type="text"
              value={form.referenceId}
              onChange={(e) => setForm((prev) => ({ ...prev, referenceId: e.target.value }))}
              className={ui.input}
              placeholder="e.g. bKash TrxID"
            />
          </div>
          <div>
            <label htmlFor="unified-pay-notes" className={ui.label}>
              Notes <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="unified-pay-notes"
              type="text"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className={ui.input}
              placeholder="e.g. Cash handoff"
            />
          </div>
        </div>

        <ModalActions>
          <button type="button" onClick={onClose} className={ui.buttonSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={ui.buttonPrimary}>
            {loading
              ? 'Saving…'
              : editingPayment
                ? 'Save Changes'
                : 'Record Payment & Deduct'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
