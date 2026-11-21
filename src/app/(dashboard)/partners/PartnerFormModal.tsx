'use client';

import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import Modal, { ModalActions } from '@/components/ui/Modal';
import { ui } from '@/lib/ui-tokens';
import { createPartner, updatePartner } from './actions';
import type { PartnerSummary } from './shared';

const emptyPartnerForm = {
  name: '',
  phone: '',
  sharePercent: '',
  openingBalance: '',
};

interface PartnerFormModalProps {
  editingPartner: PartnerSummary | null;
  totalShare: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function PartnerFormModal({
  editingPartner,
  totalShare,
  onClose,
  onSaved,
}: PartnerFormModalProps) {
  const [form, setForm] = useState(
    editingPartner
      ? {
          name: editingPartner.name,
          phone: editingPartner.phone || '',
          sharePercent: editingPartner.sharePercent.toString(),
          openingBalance: '',
        }
      : emptyPartnerForm,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const sharePercent = parseFloat(form.sharePercent);
      if (Number.isNaN(sharePercent) || sharePercent < 0 || sharePercent > 100) {
        setError('Share percent must be between 0 and 100.');
        setLoading(false);
        return;
      }

      const openingBalance = form.openingBalance ? parseFloat(form.openingBalance) : 0;

      const result = editingPartner
        ? await updatePartner(editingPartner.id, {
            name: form.name,
            phone: form.phone,
            sharePercent,
          })
        : await createPartner({
            name: form.name,
            phone: form.phone,
            sharePercent,
            openingBalance: openingBalance > 0 ? openingBalance : undefined,
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
    <Modal
      title={editingPartner ? 'Edit Partner' : 'Add New Partner'}
      description={
        editingPartner
          ? 'Update partner profile and equity share percent'
          : 'Create partner profile with automatic profit balance tracking'
      }
      icon={UserCheck}
      accent="profit"
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="partner-name" className={ui.label}>
            Full Name *
          </label>
          <input
            id="partner-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={ui.input}
            placeholder="Partner full name"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="partner-phone" className={ui.label}>
              Phone Number <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="partner-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={ui.input}
              placeholder="01XXXXXXXXX"
            />
          </div>

          <div>
            <label htmlFor="partner-share" className={ui.label}>
              Profit Share (%) *
            </label>
            <input
              id="partner-share"
              type="number"
              value={form.sharePercent}
              onChange={(e) => setForm({ ...form, sharePercent: e.target.value })}
              className={`${ui.input} font-bold`}
              placeholder="e.g. 25"
              min="0"
              max="100"
              step="0.01"
              required
            />
          </div>
        </div>

        {totalShare > 0 && !editingPartner && (
          <p className="text-xs text-stone-500">
            Currently allocated: <strong>{totalShare.toFixed(2)}%</strong> across active partners
            {totalShare < 100 && ` (${(100 - totalShare).toFixed(2)}% available)`}
          </p>
        )}

        {!editingPartner && (
          <div>
            <label htmlFor="partner-opening" className={ui.label}>
              Opening Balance (৳) <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="partner-opening"
              type="number"
              min="0"
              step="0.01"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              className={ui.input}
              placeholder="0.00"
            />
          </div>
        )}

        <ModalActions>
          <button type="button" onClick={onClose} className={ui.buttonSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className={ui.buttonPrimary}>
            {loading
              ? editingPartner
                ? 'Saving…'
                : 'Creating…'
              : editingPartner
                ? 'Save Changes'
                : 'Create Partner'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
