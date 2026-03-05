'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Wifi,
    Trash2,
    Edit2,
    X,
    Calendar,
    TrendingUp,
    Banknote,
    Clock,
    Search,
    ChevronDown,
    CheckCircle,
} from 'lucide-react';
import { ui } from '@/lib/ui-tokens';
import { recordHotspotSale, updateHotspotSale, deleteHotspotSale } from './actions';
import { HOTSPOT_PACKAGES, type HotspotPackageKey } from './constants';

// ─── Types ────────────────────────────────────────────────────────────────────

type PkgKey = HotspotPackageKey;

interface Sale {
    id: string;
    package: PkgKey;
    quantity: number;
    discount?: number | null;
    amount: number;
    date: string | Date;
    customerName?: string | null;
    customerPhone?: string | null;
    notes?: string | null;
    createdBy: { name: string };
}

interface Summary {
    sevenDay: { count: number; revenue: number };
    thirtyDay: { count: number; revenue: number };
    totalRevenue: number;
}

interface Props {
    sales: Sale[];
    summary: Summary;
    year: number;
    month: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const PKG_CONFIG: Record<PkgKey, { label: string; price: number; days: number; color: string; bg: string; ring: string; dot: string }> = {
    SEVEN_DAY: {
        label: '7-Day Pass',
        price: 50,
        days: 7,
        color: 'text-sky-700',
        bg: 'bg-sky-50',
        ring: 'ring-sky-200 hover:ring-sky-400',
        dot: 'bg-sky-500',
    },
    THIRTY_DAY: {
        label: '30-Day Pass',
        price: 200,
        days: 30,
        color: 'text-violet-700',
        bg: 'bg-violet-50',
        ring: 'ring-violet-200 hover:ring-violet-400',
        dot: 'bg-violet-500',
    },
};

const emptyForm = {
    package: 'SEVEN_DAY' as PkgKey,
    quantity: '1',
    discount: '0',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
    notes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HotspotClient({ sales, summary, year, month }: Props) {
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterPkg, setFilterPkg] = useState<PkgKey | ''>('');
    const [quickSuccess, setQuickSuccess] = useState<PkgKey | null>(null);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // ── Derived ─────────────────────────────────────────────────────────────────

    const filtered = useMemo(() => sales.filter((s) => {
        const matchPkg = !filterPkg || s.package === filterPkg;
        const matchSearch = !search || [
            s.notes ?? '', s.createdBy.name,
            s.customerName ?? '', s.customerPhone ?? '',
        ].some(f => f.toLowerCase().includes(search.toLowerCase()));
        return matchPkg && matchSearch;
    }), [sales, filterPkg, search]);

    const filteredTotal = filtered.reduce((sum, s) => sum + s.amount, 0);

    // ── Handlers ─────────────────────────────────────────────────────────────────

    const openAdd = (pkg?: PkgKey) => {
        setEditingSale(null);
        setForm({ ...emptyForm, package: pkg ?? 'SEVEN_DAY' });
        setError('');
        setIsModalOpen(true);
    };

    const openEdit = (sale: Sale) => {
        setEditingSale(sale);
        setForm({
            package: sale.package,
            quantity: sale.quantity.toString(),
            discount: (sale.discount || 0).toString(),
            date: new Date(sale.date).toISOString().split('T')[0],
            customerName: sale.customerName || '',
            customerPhone: sale.customerPhone || '',
            notes: sale.notes || '',
        });
        setError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSale(null);
        setForm(emptyForm);
        setError('');
    };

    // One-click quick-add (qty = 1, today)
    const handleQuickAdd = async (pkg: PkgKey) => {
        setIsLoading(true);
        try {
            const result = await recordHotspotSale({
                package: pkg,
                quantity: 1,
                date: new Date().toISOString().split('T')[0],
            });
            if (result.success) {
                setQuickSuccess(pkg);
                setTimeout(() => setQuickSuccess(null), 1800);
                router.refresh();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseInt(form.quantity);
        const discountVal = parseFloat(form.discount) || 0;
        if (isNaN(qty) || qty < 1) {
            setError('Quantity must be at least 1.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const payload = {
                package: form.package,
                quantity: qty,
                discount: discountVal > 0 ? discountVal : undefined,
                date: form.date,
                customerName: form.customerName.trim() || undefined,
                customerPhone: form.customerPhone.trim() || undefined,
                notes: form.notes || undefined,
            };
            const result = editingSale
                ? await updateHotspotSale(editingSale.id, payload)
                : await recordHotspotSale(payload);

            if (result.success) {
                closeModal();
                router.refresh();
            } else {
                setError(result.error || 'An error occurred');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setIsLoading(true);
        try {
            const result = await deleteHotspotSale(id);
            if (result.success) {
                setDeleteConfirm(null);
                router.refresh();
            } else {
                alert(result.error || 'Failed to delete');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePeriod = (y: number, m: number) => router.push(`/hotspot?year=${y}&month=${m}`);

    // Inline computed price preview
    const rawPrice = PKG_CONFIG[form.package].price * (parseInt(form.quantity) || 0);
    const previewAmount = Math.max(0, rawPrice - (parseFloat(form.discount) || 0));

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* ── Header ──────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 shadow-lg shadow-sky-500/30">
                        <Wifi size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Hotspot Sales</h1>
                        <p className="text-sm text-slate-500">Cash voucher sales tracker</p>
                    </div>
                </div>
                <button
                    onClick={() => openAdd()}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-700"
                >
                    <Plus size={16} />
                    Record Sale
                </button>
            </div>

            {/* ── Period ──────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <Calendar size={15} className="text-slate-400" />
                    <select
                        value={month}
                        onChange={(e) => handlePeriod(year, parseInt(e.target.value))}
                        className="text-sm font-medium text-slate-700 outline-none"
                    >
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <select
                        value={year}
                        onChange={(e) => handlePeriod(parseInt(e.target.value), month)}
                        className="text-sm font-medium text-slate-700 outline-none"
                    >
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* ── Quick-Add Cards ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(Object.keys(PKG_CONFIG) as PkgKey[]).map((key) => {
                    const cfg = PKG_CONFIG[key];
                    const stat = key === 'SEVEN_DAY' ? summary.sevenDay : summary.thirtyDay;
                    const isSuccess = quickSuccess === key;
                    return (
                        <div
                            key={key}
                            className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 transition-all ${cfg.ring}`}
                        >
                            <div className={`absolute right-0 top-0 h-28 w-28 -translate-y-8 translate-x-8 rounded-full ${cfg.bg} opacity-60`} />
                            <div className="relative">
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                                            <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-3xl font-bold text-slate-900">৳{cfg.price}</p>
                                        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                            <Clock size={11} />
                                            <span>{cfg.days} days validity</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">This month</p>
                                        <p className="text-xl font-bold text-slate-800">{stat.count} sold</p>
                                        <p className={`text-sm font-semibold ${cfg.color}`}>৳{stat.revenue.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Quick-add 1 button */}
                                <button
                                    onClick={() => handleQuickAdd(key)}
                                    disabled={isLoading}
                                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${isSuccess
                                        ? 'bg-emerald-500 text-white'
                                        : `${cfg.bg} ${cfg.color} hover:opacity-80`
                                        }`}
                                >
                                    {isSuccess ? (
                                        <>
                                            <CheckCircle size={16} />
                                            Recorded!
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Quick Add ×1
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Summary Strip ────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 to-violet-600 px-6 py-4 shadow-lg">
                <div className="flex items-center gap-2">
                    <Banknote size={20} className="text-white/80" />
                    <span className="text-sm font-medium text-white/80">Total Revenue</span>
                </div>
                <span className="text-2xl font-bold text-white">৳{summary.totalRevenue.toLocaleString()}</span>
                <span className="ml-auto text-sm text-white/60">{MONTHS[month - 1]} {year}</span>
                <div className="flex items-center gap-1">
                    <TrendingUp size={16} className="text-white/70" />
                    <span className="text-sm font-semibold text-white">
                        {summary.sevenDay.count + summary.thirtyDay.count} total passes sold
                    </span>
                </div>
            </div>

            {/* ── Table ────────────────────────────────────────────────────────────── */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Wifi size={16} className="text-slate-400" />
                        <span className="font-semibold text-slate-900">{filtered.length} Record{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search name / phone…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20 sm:w-44"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={filterPkg}
                                onChange={(e) => setFilterPkg(e.target.value as PkgKey | '')}
                                className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-7 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/20"
                            >
                                <option value="">All Packages</option>
                                <option value="SEVEN_DAY">7-Day (৳50)</option>
                                <option value="THIRTY_DAY">30-Day (৳200)</option>
                            </select>
                            <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50">
                            <Wifi size={24} className="text-sky-400" />
                        </div>
                        <p className="font-semibold text-slate-700">No sales recorded</p>
                        <p className="mt-1 text-sm text-slate-400">
                            {sales.length === 0 ? 'Use the Quick Add buttons above to record your first sale' : 'Try adjusting the filter'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className={ui.tableHeadCell}>Date</th>
                                    <th className={ui.tableHeadCell}>Package</th>
                                    <th className={ui.tableHeadCell}>Customer</th>
                                    <th className={ui.tableHeadCell}>Qty</th>
                                    <th className={ui.tableHeadCell}>Notes</th>
                                    <th className={`${ui.tableHeadCell} text-right`}>Amount</th>
                                    <th className={`${ui.tableHeadCell} text-center`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((sale) => {
                                    const cfg = PKG_CONFIG[sale.package];
                                    return (
                                        <tr key={sale.id} className="group transition-colors hover:bg-slate-50/60">
                                            <td className={ui.tableCell}>
                                                <span className="font-medium text-slate-700">
                                                    {new Date(sale.date).toLocaleDateString('en-GB', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                    })}
                                                </span>
                                            </td>
                                            <td className={ui.tableCell}>
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                                                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label} · ৳{cfg.price}
                                                </span>
                                            </td>
                                            <td className={ui.tableCell}>
                                                {sale.customerName ? (
                                                    <div>
                                                        <p className="font-medium text-slate-800">{sale.customerName}</p>
                                                        {sale.customerPhone && <p className="text-xs text-slate-400">{sale.customerPhone}</p>}
                                                    </div>
                                                ) : <span className="text-slate-400">—</span>}
                                            </td>
                                            <td className={ui.tableCell}>
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-700">
                                                    ×{sale.quantity}
                                                </span>
                                            </td>
                                            <td className={`${ui.tableCell} max-w-[140px]`}>
                                                <span className="block truncate text-slate-500" title={sale.notes || ''}>
                                                    {sale.notes || '—'}
                                                </span>
                                            </td>
                                            <td className={`${ui.tableCell} text-right`}>
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-emerald-600">৳{sale.amount.toLocaleString()}</span>
                                                    {sale.discount && sale.discount > 0 ? (
                                                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full mt-0.5 border border-amber-100">
                                                            −৳{sale.discount} disc.
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className={`${ui.tableCell} text-center`}>
                                                <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        onClick={() => openEdit(sale)}
                                                        className="rounded-lg p-1.5 text-indigo-500 transition hover:bg-indigo-50"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(sale.id)}
                                                        className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50">
                                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-slate-600">
                                        {filterPkg ? `Total for ${PKG_CONFIG[filterPkg].label}` : 'Total (filtered)'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                                        ৳{filteredTotal.toLocaleString()}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                            <Trash2 size={22} className="text-rose-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Delete this record?</h3>
                        <p className="mt-1 text-sm text-slate-500">This sale entry will be permanently removed.</p>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className={`flex-1 ${ui.buttonSecondary}`}>Cancel</button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={isLoading}
                                className={`flex-1 ${ui.buttonDanger}`}
                            >
                                {isLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {editingSale ? 'Edit Sale Record' : 'Record Hotspot Sale'}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {editingSale ? 'Update this sale entry' : 'Log a cash voucher sale'}
                                </p>
                            </div>
                            <button onClick={closeModal} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Package selector — two big toggle buttons */}
                            <div>
                                <label className={ui.label}>Package *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(Object.keys(PKG_CONFIG) as PkgKey[]).map((key) => {
                                        const cfg = PKG_CONFIG[key];
                                        const active = form.package === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setForm({ ...form, package: key })}
                                                className={`flex flex-col items-center gap-1 rounded-xl border-2 py-4 text-sm font-semibold transition-all ${active
                                                    ? `border-sky-500 ${cfg.bg} ${cfg.color} shadow-md`
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="text-2xl font-bold">৳{cfg.price}</span>
                                                <span className="text-xs opacity-80">{cfg.label}</span>
                                                <span className="flex items-center gap-1 text-xs opacity-60">
                                                    <Clock size={10} /> {cfg.days} days
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Quantity + Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={ui.label}>Quantity *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        className={ui.input}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={ui.label}>Date *</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className={ui.input}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Discount */}
                            <div>
                                <label className={ui.label}>Discount (৳) <span className="text-slate-400 font-normal">(optional)</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.discount}
                                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                                    className={ui.input}
                                    placeholder="e.g. 50"
                                />
                            </div>

                            {/* Live price preview */}
                            {rawPrice > 0 && (
                                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-emerald-700">
                                            {form.quantity} × ৳{PKG_CONFIG[form.package].price}
                                        </span>
                                        {parseFloat(form.discount) > 0 && (
                                            <span className="text-xs text-amber-600 font-medium">− ৳{form.discount} discount</span>
                                        )}
                                    </div>
                                    <span className="text-lg font-bold text-emerald-700">= ৳{previewAmount.toLocaleString()}</span>
                                </div>
                            )}

                            {/* Customer Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={ui.label}>Customer Name <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <input
                                        type="text"
                                        value={form.customerName}
                                        onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                        className={ui.input}
                                        placeholder="Buyer's name"
                                    />
                                </div>
                                <div>
                                    <label className={ui.label}>Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <input
                                        type="text"
                                        value={form.customerPhone}
                                        onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                                        className={ui.input}
                                        placeholder="01XXXXXXXXX"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className={ui.label}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                                <input
                                    type="text"
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className={ui.input}
                                    placeholder="e.g. Morning batch, Area name…"
                                />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                                <button type="button" onClick={closeModal} className={ui.buttonSecondary}>Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                                >
                                    {isLoading
                                        ? editingSale ? 'Saving…' : 'Recording…'
                                        : editingSale ? 'Save Changes' : 'Record Sale'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
