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
    type Period,
    type RecentPayout,
    type SettlementPartnerRow,
} from './shared';

interface MonthSettlementModalProps {
    initialTarget: Period;
    availablePeriods: Period[];
    onClose: () => void;
    onSettled: () => void;
}

export default function MonthSettlementModal({
    initialTarget,
    availablePeriods,
    onClose,
    onSettled,
}: MonthSettlementModalProps) {
    const [form, setForm] = useState({
        year: initialTarget.year,
        month: initialTarget.month,
        date: todayInputValue(),
        method: 'CASH' as RecentPayout['method'],
        notes: '',
    });
    const [rows, setRows] = useState<SettlementPartnerRow[]>([]);
    const [netCommission, setNetCommission] = useState(0);
    const [loading, setLoading] = useState(false);
    const [settlingPartnerId, setSettlingPartnerId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const periodYears = Array.from(new Set(availablePeriods.map((p) => p.year))).sort((a, b) => b - a);
    const periodMonthsForYear = availablePeriods
        .filter((p) => p.year === form.year)
        .map((p) => p.month)
        .sort((a, b) => a - b);

    const remainingAmount = rows.reduce((sum, row) => sum + row.remainingAmount, 0);

    const loadPreview = async (year: number, month: number) => {
        setLoading(true);
        setError('');
        const result = await getMonthlyPartnerSettlement(year, month);

        if (result.success && 'partners' in result && 'netCommission' in result) {
            setRows(result.partners as SettlementPartnerRow[]);
            setNetCommission(result.netCommission as number);
        } else {
            setRows([]);
            setNetCommission(0);
            setError(result.error || 'Failed to load settlement preview');
        }

        setLoading(false);
    };

    useEffect(() => {
        loadPreview(form.year, form.month);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.year, form.month]);

    const handleYearChange = (nextYear: number) => {
        const monthExists = availablePeriods.some((p) => p.year === nextYear && p.month === form.month);
        const nextMonth = monthExists ? form.month : (availablePeriods.find((p) => p.year === nextYear)?.month || 1);
        setForm((prev) => ({ ...prev, year: nextYear, month: nextMonth }));
    };

    const handleSettlePartner = async (partnerId: string) => {
        setSettlingPartnerId(partnerId);
        setError('');

        const result = await settlePartnerMonthlyCommission({
            partnerId,
            year: form.year,
            month: form.month,
            date: form.date,
            method: form.method,
            notes: form.notes || undefined,
        });

        setSettlingPartnerId(null);
        if (result.success) {
            await loadPreview(form.year, form.month);
            onSettled();
        } else {
            setError(result.error || 'Failed to settle this partner');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Settle Monthly Commission (One by One)</h2>
                        <p className="text-sm text-slate-500">Settle partner shares one by one for a selected month</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-5">
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
                            <label className={ui.label}>Method *</label>
                            <select
                                value={form.method}
                                onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value as RecentPayout['method'] }))}
                                className={ui.input}
                            >
                                {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>{formatMethod(method)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className={ui.label}>Payout Date *</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                                className={ui.input}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className={ui.label}>Notes (optional)</label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                            className={ui.input}
                            placeholder="Optional note to attach with each payout"
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            {error}
                        </div>
                    )}

                    <div className="rounded-xl border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                            <span className="font-semibold text-slate-700">
                                Preview for {MONTHS[form.month - 1]} {form.year}
                            </span>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>Net pool: <strong className="text-slate-700">{formatMoney(netCommission)}</strong></span>
                                <span>Remaining to settle: <strong className="text-emerald-700">{formatMoney(remainingAmount)}</strong></span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-400">Loading settlement preview...</div>
                        ) : rows.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-400">No active partners found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100 text-sm">
                                    <thead className="bg-slate-50/70">
                                        <tr>
                                            <th className={ui.tableHeadCell}>Partner</th>
                                            <th className={`${ui.tableHeadCell} text-right`}>Share</th>
                                            <th className={`${ui.tableHeadCell} text-right`}>Distribution</th>
                                            <th className={`${ui.tableHeadCell} text-right`}>Already Paid</th>
                                            <th className={`${ui.tableHeadCell} text-right`}>Remaining</th>
                                            <th className={`${ui.tableHeadCell} text-right`}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {rows.map((row) => (
                                            <tr key={row.partnerId}>
                                                <td className={ui.tableCell}>{row.partnerName}</td>
                                                <td className={`${ui.tableCell} text-right`}>{row.sharePercent.toFixed(2)}%</td>
                                                <td className={`${ui.tableCell} text-right`}>{formatMoney(row.dueAmount)}</td>
                                                <td className={`${ui.tableCell} text-right text-slate-500`}>{formatMoney(row.paidAmount)}</td>
                                                <td className={`${ui.tableCell} text-right font-semibold ${row.remainingAmount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                                    {formatMoney(row.remainingAmount)}
                                                </td>
                                                <td className={`${ui.tableCell} text-right`}>
                                                    {row.remainingAmount > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSettlePartner(row.partnerId)}
                                                            disabled={settlingPartnerId === row.partnerId}
                                                            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                                                        >
                                                            {settlingPartnerId === row.partnerId ? 'Settling...' : 'Settle Now'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs font-medium text-emerald-600">Settled</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button type="button" onClick={onClose} className={ui.buttonSecondary}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
