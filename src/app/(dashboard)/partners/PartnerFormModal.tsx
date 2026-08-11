'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ui } from '@/lib/ui-tokens';
import { createPartner, updatePartner } from './actions';
import type { Partner } from './shared';

const emptyPartnerForm = {
    name: '',
    phone: '',
    sharePercent: '',
};

interface PartnerFormModalProps {
    editingPartner: Partner | null;
    totalShare: number;
    onClose: () => void;
    onSaved: () => void;
}

export default function PartnerFormModal({ editingPartner, totalShare, onClose, onSaved }: PartnerFormModalProps) {
    const [form, setForm] = useState(
        editingPartner
            ? {
                name: editingPartner.user?.name ?? '',
                phone: editingPartner.user?.phone || '',
                sharePercent: editingPartner.sharePercent.toString(),
            }
            : emptyPartnerForm
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = editingPartner
                ? await updatePartner(editingPartner.id, {
                    name: form.name,
                    phone: form.phone,
                    sharePercent: parseFloat(form.sharePercent),
                })
                : await createPartner({
                    name: form.name,
                    phone: form.phone,
                    sharePercent: parseFloat(form.sharePercent),
                });

            if (result.success) {
                onSaved();
            } else {
                setError(result.error || 'An error occurred');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{editingPartner ? 'Edit Partner' : 'Add New Partner'}</h2>
                        <p className="text-sm text-slate-500">
                            {editingPartner ? 'Update partner information' : 'Create partner account and set share percent'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
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
                            onChange={(e) => setForm({ ...form, sharePercent: e.target.value })}
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
                        <button type="button" onClick={onClose} className={ui.buttonSecondary}>Cancel</button>
                        <button type="submit" disabled={loading} className={ui.buttonPrimary}>
                            {loading
                                ? editingPartner ? 'Saving...' : 'Creating...'
                                : editingPartner ? 'Save Changes' : 'Create Partner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
