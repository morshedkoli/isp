'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ui } from '@/lib/ui-tokens';
import { getMonthlyPartnerSettlement, settlePartnerMonthlyCommission } from './actions';
import {
    MONTHS,
    PAYMENT_METHODS,
    formatMoney,
    formatMethod,
    todayInputValue,
    type Partner,
    type Period,
    type RecentPayout,
} from './shared';

interface PaymentSettleModalProps {
    activePartners: Partner[];
    availablePeriods: Period[];
    initialPeriod: Period;
    onClose: () => void;
    onSettled: () => void;
}

export default function PaymentSettleModal({
    activePartners,
    availablePeriods,
    initialPeriod,
    onClose,
    onSettled,
}: PaymentSettleModalProps) {
    const firstPeriod = availablePeriods[0] || initialPeriod;

    const [form, setForm] = useState({
        partnerId: activePartners[0]?.id || '',
        year: firstPeriod.year,
        month: firstPeriod.month,
        date: todayInputValue(),
        method: 'CASH' as RecentPayout['method'],
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState({ dueAmount: 0, paidAmount: 0, remainingAmount: 0 });
    const [previewUpdatedAt, setPreviewUpdatedAt] = useState<Date | null>(null);

    const periodYears = Array.from(new Set(availablePeriods.map((p) => p.year))).sort((a, b) => b - a);
    const periodMonthsForYear = availablePeriods
        .filter((p) => p.year === form.year)
        .map((p) => p.month)
        .sort((a, b) => a - b);

    const loadPreview = async (partnerId: string, year: number, month: number) => {
        if (!partnerId) {
            setPreview({ dueAmount: 0, paidAmount: 0, remainingAmount: 0 });
            setPreviewUpdatedAt(null);
            return;
        }

        setPreviewLoading(true);
        setError('');
        try {
            const result = await getMonthlyPartnerSettlement(year, month);

            if (result.success && 'partners' in result) {
                const row = result.partners.find((partner) => partner.partnerId === partnerId);
                setPreview({
                    dueAmount: row?.dueAmount ?? 0,
                    paidAmount: row?.paidAmount ?? 0,
                    remainingAmount: row?.remainingAmount ?? 0,
                });
                setPreviewUpdatedAt(new Date());
                if (!row) {
                    setError('No calculated commission found for this partner in selected month');
                }
            } else {
                setPreview({ dueAmount: 0, paidAmount: 0, remainingAmount: 0 });
                setPreviewUpdatedAt(new Date());
                setError(result.error || 'Failed to calculate partner commission');
            }
        } catch {
            setPreview({ dueAmount: 0, paidAmount: 0, remainingAmount: 0 });
            setPreviewUpdatedAt(new Date());
            setError('Failed to calculate partner commission');
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        loadPreview(form.partnerId, form.year, form.month);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.partnerId, form.year, form.month]);

    const handleYearChange = (nextYear: number) => {
        const monthExists = availablePeriods.some((p) => p.year === nextYear && p.month === form.month);
        const nextMonth = monthExists ? form.month : (availablePeriods.find((p) => p.year === nextYear)?.month || 1);
        setForm((prev) => ({ ...prev, year: nextYear, month: nextMonth }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.partnerId) {
            setError('Please select a partner');
            return;
        }

        if (preview.remainingAmount <= 0) {
            setError('No remaining commission due for this partner in selected month');
            return;
        }

        setLoading(true);
        setError('');

        const result = await settlePartnerMonthlyCommission({
            partnerId: form.partnerId,
            year: form.year,
            month: form.month,
            date: form.date,
            method: form.method,
            notes: form.notes || undefined,
        });

        setLoading(false);
        if (result.success) {
            onSettled();
        } else {
            setError(result.error || 'Failed to settle partner payment');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Settle Partner (Calculated)</h2>
                        <p className="text-sm text-slate-500">Settle one partner using calculated monthly commission</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={ui.label}>Partner *</label>
                        <select
                            value={form.partnerId}
                            onChange={(e) => setForm((prev) => ({ ...prev, partnerId: e.target.value }))}
                            className={ui.input}
                            required
                        >
                            <option value="">Select partner</option>
                            {activePartners.map((partner) => (
                                <option key={partner.id} value={partner.id}>{partner.user?.name ?? 'Partner'}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                            <label className={ui.label}>Month *</label>
                            <select
                                value={form.month}
                                onChange={(e) => setForm((prev) => ({ ...prev, month: parseInt(e.target.value, 10) }))}
                                className={ui.input}
                            >
                                {periodMonthsForYear.map((month) => (
                                    <option key={month} value={month}>{MONTHS[month - 1]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={ui.label}>Year *</label>
                            <select
                                value={form.year}
                                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                                className={ui.input}
                            >
                                {periodYears.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={ui.label}>Payment Date *</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                                className={ui.input}
                                required
                            />
                        </div>
                    </div>

                    <p className="text-xs text-slate-500">
                        Last updated: {previewUpdatedAt ? previewUpdatedAt.toLocaleString('en-GB') : 'Not loaded yet'}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                            <label className={ui.label}>Partner Distribution</label>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                                {previewLoading ? 'Calculating...' : formatMoney(preview.dueAmount)}
                            </div>
                        </div>
                        <div>
                            <label className={ui.label}>Already Paid</label>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                                {previewLoading ? 'Calculating...' : formatMoney(preview.paidAmount)}
                            </div>
                        </div>
                        <div>
                            <label className={ui.label}>Remaining *</label>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
                                {previewLoading ? 'Calculating...' : formatMoney(preview.remainingAmount)}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className={ui.label}>Method *</label>
                            <select
                                value={form.method}
                                onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value as RecentPayout['method'] }))}
                                className={ui.input}
                                required
                            >
                                {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>{formatMethod(method)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <p className="text-xs text-slate-500">
                                Reference is auto-generated as monthly settlement.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className={ui.label}>Notes (optional)</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                            className={ui.input}
                            rows={3}
                            placeholder="Any memo for this payout"
                        />
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button type="button" onClick={onClose} className={ui.buttonSecondary}>Cancel</button>
                        <button type="submit" disabled={loading || previewLoading || preview.remainingAmount <= 0} className={ui.buttonPrimary}>
                            {loading ? 'Settling...' : 'Settle Partner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
