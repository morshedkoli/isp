'use client';

import { useState } from 'react';
import { Scale, PlusCircle, MinusCircle } from 'lucide-react';
import Modal, { ModalActions } from '@/components/ui/Modal';
import { formatTaka } from '@/lib/format';
import { ui } from '@/lib/ui-tokens';
import { createPartnerAdjustment } from './actions';
import { todayInputValue, type AdjustmentDirection, type PartnerSummary } from './shared';

interface BalanceAdjustmentModalProps {
  partner: PartnerSummary;
  onClose: () => void;
  onSaved: () => void;
}

const PRESET_REASONS: Record<AdjustmentDirection, string[]> = {
  DEBIT: ['Past months already settled', 'Expense offset', 'Balance correction'],
  CREDIT: ['Opening balance', 'Bonus / Extra share', 'Balance correction'],
};

export default function BalanceAdjustmentModal({
  partner,
  onClose,
  onSaved,
}: BalanceAdjustmentModalProps) {
  const [form, setForm] = useState({
    type: 'DEBIT' as AdjustmentDirection,
    amount: '',
    date: todayInputValue(),
    reason: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsedAmount = parseFloat(form.amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  const newBalance =
    form.type === 'CREDIT'
      ? partner.balance + validAmount
      : partner.balance - validAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter an amount greater than ৳0.');
      return;
    }
    if (!form.reason.trim()) {
      setError('Please enter a reason for this adjustment.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await createPartnerAdjustment({
        partnerId: partner.id,
        type: form.type,
        amount: parsedAmount,
        date: form.date,
        reason: form.reason.trim(),
        notes: form.notes.trim() || undefined,
      });

      if (result.success) {
        onSaved();
      } else {
        setError(result.error || 'Could not save balance adjustment.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Adjust Balance · ${partner.name}`}
      description="Add or deduct from this partner's balance without recording a cash payout"
      icon={Scale}
      accent="partner"
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, type: 'DEBIT' }))}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
              form.type === 'DEBIT'
                ? 'border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-rose-300'
                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            <MinusCircle size={15} /> Deduct Balance (−)
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, type: 'CREDIT' }))}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
              form.type === 'CREDIT'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300'
                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            <PlusCircle size={15} /> Add to Balance (+)
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-emerald-950/[0.06] bg-stone-50/80 px-4 py-3 text-xs">
          <div>
            <p className="text-stone-500">Current Balance</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-stone-900">
              {formatTaka(partner.balance, { decimals: true })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-stone-500">Balance After Adjustment</p>
            <p className="mt-0.5 text-sm font-extrabold tabular-nums text-emerald-800">
              {formatTaka(newBalance, { decimals: true })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="adj-amount" className={ui.label}>
                Amount (৳) *
              </label>
              {form.type === 'DEBIT' && partner.balance > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      amount: String(Math.round(partner.balance * 100) / 100),
                    }))
                  }
                  className="mb-1.5 text-[11px] font-semibold text-rose-700 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <input
              id="adj-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className={`${ui.input} font-bold`}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label htmlFor="adj-date" className={ui.label}>
              Date *
            </label>
            <input
              id="adj-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className={ui.input}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="adj-reason" className={ui.label}>
            Reason *
          </label>
          <input
            id="adj-reason"
            type="text"
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            className={ui.input}
            placeholder="e.g. Past months already settled"
            required
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PRESET_REASONS[form.type].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, reason: preset }))}
                className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:bg-stone-200"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="adj-notes" className={ui.label}>
            Notes <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <input
            id="adj-notes"
            type="text"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className={ui.input}
            placeholder="Additional details"
          />
        </div>

        <ModalActions>
          <button type="button" onClick={onClose} className={ui.buttonSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={ui.buttonPrimary}>
            {loading ? 'Saving…' : 'Apply Adjustment'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
