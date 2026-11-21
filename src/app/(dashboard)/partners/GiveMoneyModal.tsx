'use client';

import { useMemo, useState } from 'react';
import { Banknote, ArrowRight } from 'lucide-react';
import Modal, { ModalActions } from '@/components/ui/Modal';
import { formatTaka } from '@/lib/format';
import { ui } from '@/lib/ui-tokens';
import { createPartnerPayout, updatePartnerPayout } from './actions';
import {
  PAYMENT_METHODS,
  dateToInputValue,
  formatMethod,
  todayInputValue,
  type PartnerSummary,
  type PaymentMethodType,
} from './shared';

export interface EditingPayoutData {
  id: string;
  partnerId: string;
  amount: number;
  date: string;
  method: PaymentMethodType;
  referenceId?: string | null;
  notes?: string | null;
}

interface GiveMoneyModalProps {
  partners: PartnerSummary[];
  defaultPartnerId?: string;
  lockedPartner?: boolean;
  editingPayout?: EditingPayoutData | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function GiveMoneyModal({
  partners,
  defaultPartnerId,
  lockedPartner = false,
  editingPayout = null,
  onClose,
  onSaved,
}: GiveMoneyModalProps) {
  const initialPartnerId =
    editingPayout?.partnerId || defaultPartnerId || partners[0]?.id || '';

  const [form, setForm] = useState({
    partnerId: initialPartnerId,
    amount: editingPayout ? String(editingPayout.amount) : '',
    date: editingPayout ? dateToInputValue(editingPayout.date) : todayInputValue(),
    method: (editingPayout?.method || 'CASH') as PaymentMethodType,
    referenceId: editingPayout?.referenceId ?? '',
    notes: editingPayout?.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === form.partnerId) ?? null,
    [partners, form.partnerId],
  );

  // When editing an existing payout, add back its old amount to show balance before this payout.
  const balanceBefore = useMemo(() => {
    if (!selectedPartner) return 0;
    if (editingPayout && editingPayout.partnerId === selectedPartner.id) {
      return selectedPartner.balance + editingPayout.amount;
    }
    return selectedPartner.balance;
  }, [selectedPartner, editingPayout]);

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
    if (!form.partnerId) {
      setError('Please select a partner.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter an amount greater than ৳0.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = editingPayout
        ? await updatePartnerPayout(editingPayout.id, {
            amount: parsedAmount,
            date: form.date,
            method: form.method,
            referenceId: form.referenceId || undefined,
            notes: form.notes || undefined,
          })
        : await createPartnerPayout({
            partnerId: form.partnerId,
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
      title={editingPayout ? 'Edit Payment Record' : 'Give Money to Partner'}
      description={
        editingPayout
          ? 'Update payout amount or details — partner balance updates automatically'
          : 'Record money given to a partner and deduct it from their profile balance'
      }
      icon={Banknote}
      accent="profit"
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!lockedPartner && !editingPayout ? (
          <div>
            <label htmlFor="give-partner" className={ui.label}>
              Partner *
            </label>
            <select
              id="give-partner"
              value={form.partnerId}
              onChange={(e) => setForm((prev) => ({ ...prev, partnerId: e.target.value }))}
              className={ui.input}
              required
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sharePercent}% · Balance {formatTaka(p.balance, { decimals: true })})
                </option>
              ))}
            </select>
          </div>
        ) : (
          selectedPartner && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3.5 py-2.5 ring-1 ring-emerald-900/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {selectedPartner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">{selectedPartner.name}</p>
                  <p className="text-[11px] text-stone-500">Profit share: {selectedPartner.sharePercent}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  Available Balance
                </p>
                <p className="text-sm font-bold tabular-nums text-emerald-800">
                  {formatTaka(balanceBefore, { decimals: true })}
                </p>
              </div>
            </div>
          )
        )}

        {/* Live Balance Deduction Preview */}
        {selectedPartner && (
          <div className="rounded-xl border border-emerald-950/[0.06] bg-stone-50/80 p-3.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div>
                <p className="text-stone-500">Current Balance</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-stone-900">
                  {formatTaka(balanceBefore, { decimals: true })}
                </p>
              </div>
              <ArrowRight size={14} className="text-stone-400 shrink-0" />
              <div>
                <p className="text-rose-600">Deducting Now</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-rose-700">
                  −{formatTaka(validAmount, { decimals: true })}
                </p>
              </div>
              <ArrowRight size={14} className="text-stone-400 shrink-0" />
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
            {balanceAfter < -0.005 && (
              <p className="mt-2 text-[11px] font-medium text-sky-700">
                Note: This exceeds current due balance by {formatTaka(Math.abs(balanceAfter), { decimals: true })} and will be tracked as an advance.
              </p>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="give-amount" className={ui.label}>
              Amount Given (৳) *
            </label>
            {balanceBefore > 0 && !editingPayout && (
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
              id="give-amount"
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
            <label htmlFor="give-method" className={ui.label}>
              Payment Method *
            </label>
            <select
              id="give-method"
              value={form.method}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, method: e.target.value as PaymentMethodType }))
              }
              className={ui.input}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {formatMethod(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="give-date" className={ui.label}>
              Date *
            </label>
            <input
              id="give-date"
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
            <label htmlFor="give-ref" className={ui.label}>
              Reference / TrxID <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="give-ref"
              type="text"
              value={form.referenceId}
              onChange={(e) => setForm((prev) => ({ ...prev, referenceId: e.target.value }))}
              className={ui.input}
              placeholder="e.g. bKash TrxID"
            />
          </div>
          <div>
            <label htmlFor="give-notes" className={ui.label}>
              Notes <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="give-notes"
              type="text"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className={ui.input}
              placeholder="e.g. Hand cash payout"
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
              : editingPayout
                ? 'Save Changes'
                : 'Give Money & Deduct Balance'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
