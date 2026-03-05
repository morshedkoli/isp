'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Receipt, Users, MoreHorizontal, Plus, Edit2, Trash2, X,
    Calendar, TrendingDown, Banknote, AlertCircle, ChevronDown,
} from 'lucide-react';
import { ui } from '@/lib/ui-tokens';
import { createExpense, updateExpense, deleteExpense } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
    id: string;
    type: 'SALARY' | 'MISC';
    description: string;
    amount: number;
    date: string | Date;
    notes?: string | null;
}

interface Props {
    salaries: Expense[];
    misc: Expense[];
    salaryTotal: number;
    miscTotal: number;
    grandTotal: number;
    year: number;
    month: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const emptyForm = (type: 'SALARY' | 'MISC') => ({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    type,
});

// ─── Sub-component: Expense Table ─────────────────────────────────────────────

function ExpenseTable({
    rows,
    type,
    total,
    onAdd,
    onEdit,
    onDelete,
}: {
    rows: Expense[];
    type: 'SALARY' | 'MISC';
    total: number;
    onAdd: () => void;
    onEdit: (e: Expense) => void;
    onDelete: (id: string) => void;
}) {
    const isSalary = type === 'SALARY';
    const label = isSalary ? 'Employee' : 'Description';
    const emptyText = isSalary ? 'No salaries added yet' : 'No misc expenses yet';
    const accentBg = isSalary ? 'bg-violet-50' : 'bg-orange-50';
    const accentText = isSalary ? 'text-violet-700' : 'text-orange-700';
    const addBtnColor = isSalary ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-400/25' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-400/25';

    const fmtDate = (d: string | Date) =>
        new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            {/* Card header */}
            <div className={`flex items-center justify-between border-b border-slate-100 px-5 py-4 ${accentBg}`}>
                <div className="flex items-center gap-2.5">
                    {isSalary ? <Users size={18} className={accentText} /> : <MoreHorizontal size={18} className={accentText} />}
                    <div>
                        <p className={`font-semibold ${accentText}`}>{isSalary ? 'Employee Salaries' : 'Misc. Expenses'}</p>
                        <p className="text-xs text-slate-500">{rows.length} entr{rows.length === 1 ? 'y' : 'ies'} · ৳{total.toLocaleString()} total</p>
                    </div>
                </div>
                <button
                    onClick={onAdd}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-md transition ${addBtnColor}`}
                >
                    <Plus size={13} /> Add
                </button>
            </div>

            {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                    <AlertCircle size={22} className="mb-2 text-slate-300" />
                    <p className="text-sm text-slate-400">{emptyText}</p>
                    <button onClick={onAdd} className={`mt-3 text-xs font-medium ${accentText} hover:underline`}>Add one now →</button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/40">
                                <th className={ui.tableHeadCell}>Date</th>
                                <th className={ui.tableHeadCell}>{label}</th>
                                <th className={ui.tableHeadCell}>Notes</th>
                                <th className={`${ui.tableHeadCell} text-right`}>Amount</th>
                                <th className={`${ui.tableHeadCell} text-center`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map(row => (
                                <tr key={row.id} className="group transition-colors hover:bg-slate-50/60">
                                    <td className={ui.tableCell}>
                                        <span className="text-slate-600">{fmtDate(row.date)}</span>
                                    </td>
                                    <td className={ui.tableCell}>
                                        <span className="font-medium text-slate-800">{row.description}</span>
                                    </td>
                                    <td className={`${ui.tableCell} max-w-[160px]`}>
                                        <span className="block truncate text-slate-500">{row.notes || '—'}</span>
                                    </td>
                                    <td className={`${ui.tableCell} text-right`}>
                                        <span className={`font-bold ${accentText}`}>৳{row.amount.toLocaleString()}</span>
                                    </td>
                                    <td className={`${ui.tableCell} text-center`}>
                                        <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button onClick={() => onEdit(row)} className="rounded-lg p-1.5 text-indigo-500 transition hover:bg-indigo-50" title="Edit"><Edit2 size={13} /></button>
                                            <button onClick={() => onDelete(row.id)} className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50" title="Delete"><Trash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-600">
                                    {isSalary ? 'Total Salaries' : 'Total Misc. Expenses'}
                                </td>
                                <td className={`px-4 py-3 text-right text-sm font-bold ${accentText}`}>
                                    ৳{total.toLocaleString()}
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExpensesClient({ salaries, misc, salaryTotal, miscTotal, grandTotal, year, month }: Props) {
    const router = useRouter();

    const [modal, setModal] = useState<{ open: boolean; type: 'SALARY' | 'MISC'; editing: Expense | null }>({
        open: false, type: 'SALARY', editing: null,
    });
    const [form, setForm] = useState(emptyForm('SALARY'));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const openAdd = (type: 'SALARY' | 'MISC') => {
        setModal({ open: true, type, editing: null });
        setForm(emptyForm(type));
        setError('');
    };

    const openEdit = (expense: Expense) => {
        setModal({ open: true, type: expense.type, editing: expense });
        setForm({
            description: expense.description,
            amount: expense.amount.toString(),
            date: new Date(expense.date).toISOString().split('T')[0],
            notes: expense.notes || '',
            type: expense.type,
        });
        setError('');
    };

    const closeModal = () => {
        setModal({ open: false, type: 'SALARY', editing: null });
        setForm(emptyForm('SALARY'));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(form.amount);
        if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
        if (!form.description.trim()) { setError('Description is required.'); return; }
        setIsLoading(true); setError('');
        try {
            const payload = {
                description: form.description,
                amount: amt,
                date: form.date,
                notes: form.notes || undefined,
            };
            const result = modal.editing
                ? await updateExpense(modal.editing.id, payload)
                : await createExpense({ ...payload, type: modal.type });
            if (result.success) { closeModal(); router.refresh(); }
            else setError(result.error || 'An error occurred');
        } catch { setError('Unexpected error'); }
        finally { setIsLoading(false); }
    };

    const handleDelete = async (id: string) => {
        setDeleteLoading(true);
        try {
            const result = await deleteExpense(id);
            if (result.success) { setDeleteConfirm(null); router.refresh(); }
            else alert(result.error || 'Failed to delete');
        } finally { setDeleteLoading(false); }
    };

    const handlePeriod = (y: number, m: number) => router.push(`/expenses?year=${y}&month=${m}`);

    const isSalaryModal = modal.type === 'SALARY';
    const modalAccent = isSalaryModal ? 'bg-violet-600' : 'bg-orange-500';
    const modalShadow = isSalaryModal ? 'shadow-violet-400/25' : 'shadow-orange-400/25';

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 shadow-lg shadow-rose-500/30">
                        <Receipt size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
                        <p className="text-sm text-slate-500">Employee salaries &amp; business expenses</p>
                    </div>
                </div>
            </div>

            {/* Period selector + summary strip */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <Calendar size={15} className="text-slate-400" />
                    <select value={month} onChange={e => handlePeriod(year, parseInt(e.target.value))} className="text-sm font-medium text-slate-700 outline-none">
                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <select value={year} onChange={e => handlePeriod(parseInt(e.target.value), month)} className="text-sm font-medium text-slate-700 outline-none">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    { label: 'Employee Salaries', value: salaryTotal, color: 'text-violet-700', bg: 'bg-violet-50', border: 'ring-violet-200', icon: Users },
                    { label: 'Misc. Expenses', value: miscTotal, color: 'text-orange-600', bg: 'bg-orange-50', border: 'ring-orange-200', icon: MoreHorizontal },
                    { label: 'Total Expenses', value: grandTotal, color: 'text-rose-700', bg: 'bg-rose-50', border: 'ring-rose-200', icon: TrendingDown },
                ].map(({ label, value, color, bg, border, icon: Icon }) => (
                    <div key={label} className={`flex items-center gap-4 rounded-2xl ${bg} p-5 ring-1 ${border}`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm`}>
                            <Icon size={18} className={color} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">{label}</p>
                            <p className={`text-2xl font-bold ${color}`}>৳{value.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Two tables side-by-side */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ExpenseTable
                    rows={salaries} type="SALARY" total={salaryTotal}
                    onAdd={() => openAdd('SALARY')} onEdit={openEdit} onDelete={(id) => setDeleteConfirm(id)}
                />
                <ExpenseTable
                    rows={misc} type="MISC" total={miscTotal}
                    onAdd={() => openAdd('MISC')} onEdit={openEdit} onDelete={(id) => setDeleteConfirm(id)}
                />
            </div>

            {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${modalAccent} shadow-md ${modalShadow}`}>
                                    {isSalaryModal ? <Users size={16} className="text-white" /> : <Banknote size={16} className="text-white" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {modal.editing ? 'Edit Entry' : isSalaryModal ? 'Add Salary' : 'Add Misc. Expense'}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        {isSalaryModal ? 'Employee salary for the period' : 'One-off business expense'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                        </div>

                        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={ui.label}>{isSalaryModal ? 'Employee Name' : 'Description'} *</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className={ui.input}
                                    placeholder={isSalaryModal ? 'e.g. Rahim, Karim' : 'e.g. Office rent, Electricity bill'}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={ui.label}>Amount (৳) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">৳</span>
                                        <input
                                            type="number" min="1" step="0.01"
                                            value={form.amount}
                                            onChange={e => setForm({ ...form, amount: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-base font-bold text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={ui.label}>Date *</label>
                                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={ui.input} required />
                                </div>
                            </div>

                            <div>
                                <label className={ui.label}>Notes <span className="font-normal text-slate-400">(optional)</span></label>
                                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={ui.input} placeholder="Any additional detail…" />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                                <button type="button" onClick={closeModal} className={ui.buttonSecondary}>Cancel</button>
                                <button type="submit" disabled={isLoading}
                                    className={`rounded-xl ${modalAccent} px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60`}>
                                    {isLoading ? 'Saving…' : modal.editing ? 'Save Changes' : 'Add Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100"><Trash2 size={22} className="text-rose-600" /></div>
                        <h3 className="text-lg font-bold text-slate-900">Delete this entry?</h3>
                        <p className="mt-1 text-sm text-slate-500">This will be permanently removed.</p>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className={`flex-1 ${ui.buttonSecondary}`}>Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} disabled={deleteLoading} className={`flex-1 ${ui.buttonDanger}`}>
                                {deleteLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
