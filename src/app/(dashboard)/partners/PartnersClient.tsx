'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { ui } from '@/lib/ui-tokens';
import { createPartner, updatePartner } from './actions';

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

interface PartnersClientProps {
    partners: Partner[];
}

const emptyForm = {
    name: '',
    phone: '',
    sharePercent: '',
};

export default function PartnersClient({ partners }: PartnersClientProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const totalShare = partners
        .filter((p) => p.isActive)
        .reduce((sum, p) => sum + p.sharePercent, 0);

    const openAddModal = () => {
        setEditingPartner(null);
        setForm(emptyForm);
        setError('');
        setIsModalOpen(true);
    };

    const openEditModal = (partner: Partner) => {
        setEditingPartner(partner);
        setForm({
            name: partner.user.name,
            phone: partner.user.phone || '',
            sharePercent: partner.sharePercent.toString(),
        });
        setError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPartner(null);
        setForm(emptyForm);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            let result;
            if (editingPartner) {
                result = await updatePartner(editingPartner.id, {
                    name: form.name,
                    phone: form.phone,
                    sharePercent: parseFloat(form.sharePercent),
                });
            } else {
                result = await createPartner({
                    name: form.name,
                    phone: form.phone,
                    sharePercent: parseFloat(form.sharePercent),
                });
            }

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

    const handleToggleActive = async (partner: Partner) => {
        const result = await updatePartner(partner.id, { isActive: !partner.isActive });
        if (result.success) {
            router.refresh();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Partners</h1>
                    <p className="text-sm text-slate-500">
                        Partner profiles and profit share distribution
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700"
                >
                    <Plus size={16} />
                    Add Partner
                </button>
            </div>

            {/* Summary Card */}
            {partners.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            Total Partners
                        </p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                            {partners.length}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            Active Partners
                        </p>
                        <p className="mt-1 text-2xl font-bold text-emerald-600">
                            {partners.filter((p) => p.isActive).length}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                            Total Share Allocated
                        </p>
                        <p
                            className={`mt-1 text-2xl font-bold ${totalShare > 100 ? 'text-rose-600' : 'text-indigo-600'
                                }`}
                        >
                            {totalShare.toFixed(1)}%
                        </p>
                    </div>
                </div>
            )}

            {/* Partners Table */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                {partners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="mb-4 rounded-full bg-indigo-50 p-5">
                            <UserCheck className="h-8 w-8 text-indigo-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-700">No partners yet</p>
                        <p className="mt-1 text-sm text-slate-400">
                            Add partners to track profit sharing
                        </p>
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
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Partner
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Contact
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Share %
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {partners.map((partner) => (
                                    <tr
                                        key={partner.id}
                                        className="group transition-colors hover:bg-slate-50"
                                    >
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
                                                    {partner.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="font-medium text-slate-900">
                                                    {partner.user.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {partner.user.phone ? (
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    <Phone size={13} className="text-slate-400" />
                                                    {partner.user.phone}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                                                <PieChart size={13} />
                                                {partner.sharePercent}%
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${partner.isActive
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-rose-50 text-rose-700'
                                                    }`}
                                            >
                                                {partner.isActive ? (
                                                    <CheckCircle size={11} />
                                                ) : (
                                                    <XCircle size={11} />
                                                )}
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
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${partner.isActive
                                                        ? 'text-amber-600 hover:bg-amber-50'
                                                        : 'text-emerald-600 hover:bg-emerald-50'
                                                        }`}
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

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={closeModal}
                    />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {editingPartner ? 'Edit Partner' : 'Add New Partner'}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {editingPartner
                                        ? 'Update partner information'
                                        : 'Create partner account and set share percent'}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
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
                                <label className={ui.label}>Full Name *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className={ui.input}
                                    placeholder="Partner full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className={ui.label}>Phone Number <span className="font-normal text-slate-400">(optional)</span></label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className={ui.input}
                                    placeholder="01XXXXXXXXX"
                                />
                            </div>

                            <div>
                                <label className={ui.label}>Share Percent (%) *</label>
                                <input
                                    type="number"
                                    value={form.sharePercent}
                                    onChange={(e) =>
                                        setForm({ ...form, sharePercent: e.target.value })
                                    }
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
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className={ui.buttonSecondary}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={ui.buttonPrimary}
                                >
                                    {isLoading
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
        </div>
    );
}
