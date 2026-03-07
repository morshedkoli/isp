'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    UserCheck,
    Edit2,
    X,
    CheckCircle,
    XCircle,
    Phone,
    PieChart,
    HandCoins,
    CheckCheck,
} from 'lucide-react';
import { ui } from '@/lib/ui-tokens';
import {
    createPartner,
    updatePartner,
    getMonthlyPartnerSettlement,
    settlePartnerMonthlyCommission,
} from './actions';

interface Partner {
    id: string;
    sharePercent: number;
    isActive: boolean;
    createdAt: Date;
    user: {
        name: string;
        email: string;
        phone?: string | null;
    };
}

interface Period {
    year: number;
    month: number;
}

interface RecentPayout {
    id: string;
    partnerName: string;
    amount: number;
    date: string;
    method: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';
    referenceId?: string | null;
    notes?: string | null;
}

interface SettlementPartnerRow {
    partnerId: string;
    partnerName: string;
    sharePercent: number;
    dueAmount: number;
    paidAmount: number;
    remainingAmount: number;
}

interface PartnersClientProps {
    partners: Partner[];
    recentPayouts: RecentPayout[];
    availablePeriods: Period[];
    autoOpenSettlement: { year: number; month: number } | null;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const PAYMENT_METHODS: Array<RecentPayout['method']> = ['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'];

const emptyPartnerForm = {
    name: '',
    phone: '',
    sharePercent: '',
};

const todayInputValue = () => new Date().toISOString().split('T')[0];

const formatMoney = (amount: number) => `BDT ${amount.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

const formatMethod = (method: RecentPayout['method']) => {
    switch (method) {
        case 'BKASH': return 'bKash';
        case 'NAGAD': return 'Nagad';
        default: return method;
    }
};

export default function PartnersClient({
    partners,
    recentPayouts,
    availablePeriods,
    autoOpenSettlement,
}: PartnersClientProps) {
    const router = useRouter();

    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [partnerForm, setPartnerForm] = useState(emptyPartnerForm);
    const [partnerFormLoading, setPartnerFormLoading] = useState(false);
    const [partnerFormError, setPartnerFormError] = useState('');

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        partnerId: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        date: todayInputValue(),
        method: 'CASH' as RecentPayout['method'],
        notes: '',
    });
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentPreviewLoading, setPaymentPreviewLoading] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [paymentPreview, setPaymentPreview] = useState<{
        dueAmount: number;
        paidAmount: number;
        remainingAmount: number;
    }>({
        dueAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
    });
    const [paymentPreviewUpdatedAt, setPaymentPreviewUpdatedAt] = useState<Date | null>(null);

    const initialPeriod = useMemo(() => {
        if (availablePeriods.length > 0) return availablePeriods[0];
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }, [availablePeriods]);

    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [settlementForm, setSettlementForm] = useState({
        year: initialPeriod.year,
        month: initialPeriod.month,
        date: todayInputValue(),
        method: 'CASH' as RecentPayout['method'],
        notes: '',
    });
    const [settlementRows, setSettlementRows] = useState<SettlementPartnerRow[]>([]);
    const [settlementNet, setSettlementNet] = useState(0);
    const [settlementLoading, setSettlementLoading] = useState(false);
    const [settlingPartnerId, setSettlingPartnerId] = useState<string | null>(null);
    const [settlementError, setSettlementError] = useState('');
    const [didAutoOpenSettlement, setDidAutoOpenSettlement] = useState(false);

    const activePartners = useMemo(
        () => partners.filter((p) => p.isActive),
        [partners],
    );

    const totalShare = activePartners.reduce((sum, p) => sum + p.sharePercent, 0);

    const periodYears = Array.from(new Set(availablePeriods.map((p) => p.year))).sort((a, b) => b - a);
    const periodMonthsForSelectedYear = availablePeriods
        .filter((p) => p.year === settlementForm.year)
        .map((p) => p.month)
        .sort((a, b) => a - b);
    const periodMonthsForPaymentYear = availablePeriods
        .filter((p) => p.year === paymentForm.year)
        .map((p) => p.month)
        .sort((a, b) => a - b);

    const remainingSettlementAmount = settlementRows.reduce((sum, row) => sum + row.remainingAmount, 0);

    const loadSettlementPreview = async (year: number, month: number) => {
        setSettlementLoading(true);
        setSettlementError('');
        const result = await getMonthlyPartnerSettlement(year, month);

        if (result.success && 'partners' in result && 'netCommission' in result) {
            setSettlementRows(result.partners as SettlementPartnerRow[]);
            setSettlementNet(result.netCommission as number);
        } else {
            setSettlementRows([]);
            setSettlementNet(0);
            setSettlementError(result.error || 'Failed to load settlement preview');
        }

        setSettlementLoading(false);
    };

    const loadPaymentPreview = async (partnerId: string, year: number, month: number) => {
        if (!partnerId) {
            setPaymentPreview({ dueAmount: 0, paidAmount: 0, remainingAmount: 0 });
            setPaymentPreviewUpdatedAt(null);
            return;
        }

        setPaymentPreviewLoading(true);
        setPaymentError('');
        try {
            const result = await getMonthlyPartnerSettlement(year, month);

            if (result.success && 'partners' in result) {
                const row = result.partners.find((partner) => partner.partnerId === partnerId);
                setPaymentPreview({
                    dueAmount: row?.dueAmount ?? 0,
                    paidAmount: row?.paidAmount ?? 0,
                    remainingAmount: row?.remainingAmount ?? 0,
                });
                setPaymentPreviewUpdatedAt(new Date());
                if (!row) {
                    setPaymentError('No calculated commission found for this partner in selected month');
                }
            } else {
                setPaymentPreview({ dueAmount: 0, paidAmount: 0, remainingAmount: 0 });
                setPaymentPreviewUpdatedAt(new Date());
                setPaymentError(result.error || 'Failed to calculate partner commission');
            }
        } catch {
            setPaymentPreview({ dueAmount: 0, paidAmount: 0, remainingAmount: 0 });
            setPaymentPreviewUpdatedAt(new Date());
            setPaymentError('Failed to calculate partner commission');
        } finally {
            setPaymentPreviewLoading(false);
        }
    };

    useEffect(() => {
        if (!autoOpenSettlement || didAutoOpenSettlement) return;

        const requested = availablePeriods.find(
            (period) => period.year === autoOpenSettlement.year && period.month === autoOpenSettlement.month,
        );
        const target = requested || availablePeriods[0] || initialPeriod;

        setSettlementForm((prev) => ({
            ...prev,
            year: target.year,
            month: target.month,
            date: todayInputValue(),
        }));
        setSettlementError('');
        setIsSettlementModalOpen(true);
        setDidAutoOpenSettlement(true);
    }, [autoOpenSettlement, availablePeriods, didAutoOpenSettlement, initialPeriod]);

    useEffect(() => {
        if (!isSettlementModalOpen) return;

        loadSettlementPreview(settlementForm.year, settlementForm.month);
    }, [isSettlementModalOpen, settlementForm.year, settlementForm.month]);

    useEffect(() => {
        if (!isPaymentModalOpen) return;
        loadPaymentPreview(paymentForm.partnerId, paymentForm.year, paymentForm.month);
    }, [isPaymentModalOpen, paymentForm.partnerId, paymentForm.year, paymentForm.month]);

    const openAddModal = () => {
        setEditingPartner(null);
        setPartnerForm(emptyPartnerForm);
        setPartnerFormError('');
        setIsPartnerModalOpen(true);
    };

    const openEditModal = (partner: Partner) => {
        setEditingPartner(partner);
        setPartnerForm({
            name: partner.user.name,
            phone: partner.user.phone || '',
            sharePercent: partner.sharePercent.toString(),
        });
        setPartnerFormError('');
        setIsPartnerModalOpen(true);
    };

    const closePartnerModal = () => {
        setIsPartnerModalOpen(false);
        setEditingPartner(null);
        setPartnerForm(emptyPartnerForm);
        setPartnerFormError('');
    };

    const handlePartnerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPartnerFormLoading(true);
        setPartnerFormError('');

        try {
            let result;
            if (editingPartner) {
                result = await updatePartner(editingPartner.id, {
                    name: partnerForm.name,
                    phone: partnerForm.phone,
                    sharePercent: parseFloat(partnerForm.sharePercent),
                });
            } else {
                result = await createPartner({
                    name: partnerForm.name,
                    phone: partnerForm.phone,
                    sharePercent: parseFloat(partnerForm.sharePercent),
                });
            }

            if (result.success) {
                closePartnerModal();
                router.refresh();
            } else {
                setPartnerFormError(result.error || 'An error occurred');
            }
        } catch {
            setPartnerFormError('An unexpected error occurred');
        } finally {
            setPartnerFormLoading(false);
        }
    };

    const handleToggleActive = async (partner: Partner) => {
        const result = await updatePartner(partner.id, { isActive: !partner.isActive });
        if (result.success) {
            router.refresh();
        }
    };

    const openPaymentModal = () => {
        const firstPeriod = availablePeriods[0] || initialPeriod;
        const partnerId = activePartners[0]?.id || '';
        setPaymentForm({
            partnerId,
            year: firstPeriod.year,
            month: firstPeriod.month,
            date: todayInputValue(),
            method: 'CASH',
            notes: '',
        });
        setPaymentPreview({ dueAmount: 0, paidAmount: 0, remainingAmount: 0 });
        setPaymentPreviewUpdatedAt(null);
        setPaymentError('');
        setIsPaymentModalOpen(true);
        if (partnerId) {
            loadPaymentPreview(partnerId, firstPeriod.year, firstPeriod.month);
        }
    };

    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setPaymentError('');
    };

    const handlePaymentYearChange = (nextYear: number) => {
        const monthExists = availablePeriods.some((p) => p.year === nextYear && p.month === paymentForm.month);
        const nextMonth = monthExists
            ? paymentForm.month
            : (availablePeriods.find((p) => p.year === nextYear)?.month || 1);

        setPaymentForm((prev) => ({ ...prev, year: nextYear, month: nextMonth }));
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!paymentForm.partnerId) {
            setPaymentError('Please select a partner');
            return;
        }

        if (paymentPreview.remainingAmount <= 0) {
            setPaymentError('No remaining commission due for this partner in selected month');
            return;
        }

        setPaymentLoading(true);
        setPaymentError('');

        const result = await settlePartnerMonthlyCommission({
            partnerId: paymentForm.partnerId,
            year: paymentForm.year,
            month: paymentForm.month,
            date: paymentForm.date,
            method: paymentForm.method,
            notes: paymentForm.notes || undefined,
        });

        setPaymentLoading(false);
        if (result.success) {
            closePaymentModal();
            router.refresh();
        } else {
            setPaymentError(result.error || 'Failed to settle partner payment');
        }
    };

    const openSettlementModal = () => {
        const firstPeriod = availablePeriods[0] || initialPeriod;
        setSettlementForm((prev) => ({
            ...prev,
            year: firstPeriod.year,
            month: firstPeriod.month,
            date: todayInputValue(),
        }));
        setSettlementError('');
        setIsSettlementModalOpen(true);
    };

    const closeSettlementModal = () => {
        setIsSettlementModalOpen(false);
        setSettlementError('');
    };

    const handleSettlementYearChange = (nextYear: number) => {
        const monthExists = availablePeriods.some((p) => p.year === nextYear && p.month === settlementForm.month);
        const nextMonth = monthExists
            ? settlementForm.month
            : (availablePeriods.find((p) => p.year === nextYear)?.month || 1);

        setSettlementForm((prev) => ({ ...prev, year: nextYear, month: nextMonth }));
    };

    const handleSettlePartner = async (partnerId: string) => {
        setSettlingPartnerId(partnerId);
        setSettlementError('');

        const result = await settlePartnerMonthlyCommission({
            partnerId,
            year: settlementForm.year,
            month: settlementForm.month,
            date: settlementForm.date,
            method: settlementForm.method,
            notes: settlementForm.notes || undefined,
        });

        setSettlingPartnerId(null);
        if (result.success) {
            await loadSettlementPreview(settlementForm.year, settlementForm.month);
            router.refresh();
        } else {
            setSettlementError(result.error || 'Failed to settle this partner');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Partners</h1>
                    <p className="text-sm text-slate-500">
                        Partner profiles, payout tracking, and monthly settlement
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={openPaymentModal}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                        <HandCoins size={16} />
                        Settle Partner (Calculated)
                    </button>
                    <button
                        onClick={openSettlementModal}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                    >
                        <CheckCheck size={16} />
                        Settle Month (One by One)
                    </button>
                    <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700"
                    >
                        <Plus size={16} />
                        Add Partner
                    </button>
                </div>
            </div>

            {partners.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Partners</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{partners.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Partners</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-600">{activePartners.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Share Allocated</p>
                        <p className={`mt-1 text-2xl font-bold ${totalShare > 100 ? 'text-rose-600' : 'text-indigo-600'}`}>
                            {totalShare.toFixed(1)}%
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Recent Payouts</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{recentPayouts.length}</p>
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                {partners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="mb-4 rounded-full bg-indigo-50 p-5">
                            <UserCheck className="h-8 w-8 text-indigo-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-700">No partners yet</p>
                        <p className="mt-1 text-sm text-slate-400">Add partners to track profit sharing</p>
                        <button
                            onClick={openAddModal}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                        >
                            <Plus size={16} />
                            Add First Partner
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Partner</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Share %</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {partners.map((partner) => (
                                    <tr key={partner.id} className="group transition-colors hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
                                                    {partner.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="font-medium text-slate-900">{partner.user.name}</div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {partner.user.phone ? (
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    <Phone size={13} className="text-slate-400" />
                                                    {partner.user.phone}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                                                <PieChart size={13} />
                                                {partner.sharePercent}%
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${partner.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                {partner.isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
                                                {partner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    onClick={() => openEditModal(partner)}
                                                    className="rounded-lg p-1.5 text-indigo-600 transition-colors hover:bg-indigo-50"
                                                    title="Edit partner"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(partner)}
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${partner.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                >
                                                    {partner.isActive ? 'Deactivate' : 'Activate'}
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

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">Recent Partner Payments</h2>
                    <p className="text-xs text-slate-500">Latest recorded payouts and settlement references</p>
                </div>

                {recentPayouts.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-slate-400">No partner payments recorded yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-slate-50/70">
                                <tr>
                                    <th className={ui.tableHeadCell}>Date</th>
                                    <th className={ui.tableHeadCell}>Partner</th>
                                    <th className={ui.tableHeadCell}>Method</th>
                                    <th className={ui.tableHeadCell}>Reference</th>
                                    <th className={`${ui.tableHeadCell} text-right`}>Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {recentPayouts.map((payout) => (
                                    <tr key={payout.id}>
                                        <td className={ui.tableCell}>{new Date(payout.date).toLocaleDateString('en-GB')}</td>
                                        <td className={ui.tableCell}>{payout.partnerName}</td>
                                        <td className={ui.tableCell}>{formatMethod(payout.method)}</td>
                                        <td className={ui.tableCell}>{payout.referenceId || '-'}</td>
                                        <td className={`${ui.tableCell} text-right font-semibold text-emerald-700`}>
                                            {formatMoney(payout.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isPartnerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closePartnerModal} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{editingPartner ? 'Edit Partner' : 'Add New Partner'}</h2>
                                <p className="text-sm text-slate-500">
                                    {editingPartner ? 'Update partner information' : 'Create partner account and set share percent'}
                                </p>
                            </div>
                            <button
                                onClick={closePartnerModal}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {partnerFormError && (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                                {partnerFormError}
                            </div>
                        )}

                        <form onSubmit={handlePartnerSubmit} className="space-y-4">
                            <div>
                                <label className={ui.label}>Full Name *</label>
                                <input
                                    type="text"
                                    value={partnerForm.name}
                                    onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                                    className={ui.input}
                                    placeholder="Partner full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className={ui.label}>Phone Number <span className="font-normal text-slate-400">(optional)</span></label>
                                <input
                                    type="tel"
                                    value={partnerForm.phone}
                                    onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                                    className={ui.input}
                                    placeholder="01XXXXXXXXX"
                                />
                            </div>

                            <div>
                                <label className={ui.label}>Share Percent (%) *</label>
                                <input
                                    type="number"
                                    value={partnerForm.sharePercent}
                                    onChange={(e) => setPartnerForm({ ...partnerForm, sharePercent: e.target.value })}
                                    className={ui.input}
                                    placeholder="e.g. 40"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    required
                                />
                                {totalShare > 0 && !editingPartner && (
                                    <p className="mt-1 text-xs text-slate-400">
                                        Currently allocated: {totalShare.toFixed(1)}% across active partners
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                                <button type="button" onClick={closePartnerModal} className={ui.buttonSecondary}>Cancel</button>
                                <button type="submit" disabled={partnerFormLoading} className={ui.buttonPrimary}>
                                    {partnerFormLoading
                                        ? editingPartner
                                            ? 'Saving...'
                                            : 'Creating...'
                                        : editingPartner
                                            ? 'Save Changes'
                                            : 'Create Partner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closePaymentModal} />
                    <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Settle Partner (Calculated)</h2>
                                <p className="text-sm text-slate-500">Settle one partner using calculated monthly commission</p>
                            </div>
                            <button onClick={closePaymentModal} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        {paymentError && (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                                {paymentError}
                            </div>
                        )}

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className={ui.label}>Partner *</label>
                                <select
                                    value={paymentForm.partnerId}
                                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, partnerId: e.target.value }))}
                                    className={ui.input}
                                    required
                                >
                                    <option value="">Select partner</option>
                                    {activePartners.map((partner) => (
                                        <option key={partner.id} value={partner.id}>{partner.user.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className={ui.label}>Month *</label>
                                    <select
                                        value={paymentForm.month}
                                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, month: parseInt(e.target.value, 10) }))}
                                        className={ui.input}
                                    >
                                        {periodMonthsForPaymentYear.map((month) => (
                                            <option key={month} value={month}>{MONTHS[month - 1]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={ui.label}>Year *</label>
                                    <select
                                        value={paymentForm.year}
                                        onChange={(e) => handlePaymentYearChange(parseInt(e.target.value, 10))}
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
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, date: e.target.value }))}
                                        className={ui.input}
                                        required
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-slate-500">
                                Last updated:{' '}
                                {paymentPreviewUpdatedAt
                                    ? paymentPreviewUpdatedAt.toLocaleString('en-GB')
                                    : 'Not loaded yet'}
                            </p>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className={ui.label}>Partner Distribution</label>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                                        {paymentPreviewLoading ? 'Calculating...' : formatMoney(paymentPreview.dueAmount)}
                                    </div>
                                </div>
                                <div>
                                    <label className={ui.label}>Already Paid</label>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                                        {paymentPreviewLoading ? 'Calculating...' : formatMoney(paymentPreview.paidAmount)}
                                    </div>
                                </div>
                                <div>
                                    <label className={ui.label}>Remaining *</label>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
                                        {paymentPreviewLoading ? 'Calculating...' : formatMoney(paymentPreview.remainingAmount)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={ui.label}>Method *</label>
                                    <select
                                        value={paymentForm.method}
                                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value as RecentPayout['method'] }))}
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
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    className={ui.input}
                                    rows={3}
                                    placeholder="Any memo for this payout"
                                />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                                <button type="button" onClick={closePaymentModal} className={ui.buttonSecondary}>Cancel</button>
                                <button type="submit" disabled={paymentLoading || paymentPreviewLoading || paymentPreview.remainingAmount <= 0} className={ui.buttonPrimary}>
                                    {paymentLoading ? 'Settling...' : 'Settle Partner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isSettlementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeSettlementModal} />
                    <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Settle Monthly Commission (One by One)</h2>
                                <p className="text-sm text-slate-500">Settle partner shares one by one for a selected month</p>
                            </div>
                            <button onClick={closeSettlementModal} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-5">
                                <div>
                                    <label className={ui.label}>Month *</label>
                                    <select
                                        value={settlementForm.month}
                                        onChange={(e) => setSettlementForm((prev) => ({ ...prev, month: parseInt(e.target.value, 10) }))}
                                        className={ui.input}
                                    >
                                        {periodMonthsForSelectedYear.map((month) => (
                                            <option key={month} value={month}>{MONTHS[month - 1]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={ui.label}>Year *</label>
                                    <select
                                        value={settlementForm.year}
                                        onChange={(e) => handleSettlementYearChange(parseInt(e.target.value, 10))}
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
                                        value={settlementForm.method}
                                        onChange={(e) => setSettlementForm((prev) => ({ ...prev, method: e.target.value as RecentPayout['method'] }))}
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
                                        value={settlementForm.date}
                                        onChange={(e) => setSettlementForm((prev) => ({ ...prev, date: e.target.value }))}
                                        className={ui.input}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={ui.label}>Notes (optional)</label>
                                <input
                                    type="text"
                                    value={settlementForm.notes}
                                    onChange={(e) => setSettlementForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    className={ui.input}
                                    placeholder="Optional note to attach with each payout"
                                />
                            </div>

                            {settlementError && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                                    {settlementError}
                                </div>
                            )}

                            <div className="rounded-xl border border-slate-200">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                                    <span className="font-semibold text-slate-700">
                                        Preview for {MONTHS[settlementForm.month - 1]} {settlementForm.year}
                                    </span>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span>Net pool: <strong className="text-slate-700">{formatMoney(settlementNet)}</strong></span>
                                        <span>Remaining to settle: <strong className="text-emerald-700">{formatMoney(remainingSettlementAmount)}</strong></span>
                                    </div>
                                </div>

                                {settlementLoading ? (
                                    <div className="px-4 py-8 text-center text-sm text-slate-400">Loading settlement preview...</div>
                                ) : settlementRows.length === 0 ? (
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
                                                {settlementRows.map((row) => (
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
                                <button type="button" onClick={closeSettlementModal} className={ui.buttonSecondary}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
