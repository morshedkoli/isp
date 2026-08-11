'use client';

import { useState } from 'react';
import { Clock, Wifi } from 'lucide-react';
import Modal, { ModalActions } from '@/components/ui/Modal';
import { formatTaka, toDateInputValue } from '@/lib/format';
import { accents, ui } from '@/lib/ui-tokens';
import { recordHotspotSale, updateHotspotSale } from './actions';
import { PKG_CONFIG, PKG_KEYS, type PkgKey, type Sale } from './shared';

interface SaleFormModalProps {
  editingSale: Sale | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SaleFormModal({ editingSale, onClose, onSaved }: SaleFormModalProps) {
  const [pkg, setPkg] = useState<PkgKey>(editingSale?.package ?? 'SEVEN_DAY');
  const [quantity, setQuantity] = useState(editingSale ? String(editingSale.quantity) : '1');
  const [discount, setDiscount] = useState(String(editingSale?.discount ?? 0));
  const [date, setDate] = useState(toDateInputValue(editingSale?.date ?? new Date()));
  const [customerName, setCustomerName] = useState(editingSale?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(editingSale?.customerPhone ?? '');
  const [notes, setNotes] = useState(editingSale?.notes ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const parsedQuantity = parseInt(quantity, 10) || 0;
  const parsedDiscount = parseFloat(discount) || 0;
  const grossAmount = PKG_CONFIG[pkg].price * parsedQuantity;
  // Mirrors the server's calculation in actions.ts so the preview can't disagree.
  const previewAmount = Math.max(0, grossAmount - parsedDiscount);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (parsedQuantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    if (parsedDiscount < 0) {
      setError('Discount cannot be negative.');
      return;
    }
    if (parsedDiscount > grossAmount) {
      setError('Discount cannot exceed the total package price.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const payload = {
        package: pkg,
        quantity: parsedQuantity,
        discount: parsedDiscount > 0 ? parsedDiscount : undefined,
        date,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const result = editingSale
        ? await updateHotspotSale(editingSale.id, payload)
        : await recordHotspotSale(payload);

      if (result.success) {
        onSaved();
      } else {
        setError(result.error || 'Could not save this sale.');
      }
    } catch {
      setError('Unexpected error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={editingSale ? 'Edit Sale Record' : 'Record Hotspot Sale'}
      description={editingSale ? 'Update this sale entry' : 'Log a cash voucher sale'}
      icon={Wifi}
      accent="hotspot"
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className={ui.label}>Package *</legend>
          <div className="grid grid-cols-2 gap-3">
            {PKG_KEYS.map((key) => {
              const config = PKG_CONFIG[key];
              const accent = accents[config.accent];
              const isActive = pkg === key;

              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setPkg(key)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 py-4 text-sm font-semibold transition-all ${
                    isActive
                      ? `border-current ${accent.soft} ${accent.text} shadow-sm`
                      : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-2xl font-bold">{formatTaka(config.price)}</span>
                  <span className="text-xs opacity-80">{config.label}</span>
                  <span className="flex items-center gap-1 text-xs opacity-60">
                    <Clock size={10} /> {config.days} days
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sale-quantity" className={ui.label}>
              Quantity *
            </label>
            <input
              id="sale-quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={ui.input}
              required
            />
          </div>
          <div>
            <label htmlFor="sale-date" className={ui.label}>
              Date *
            </label>
            <input
              id="sale-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={ui.input}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="sale-discount" className={ui.label}>
            Discount (৳) <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <input
            id="sale-discount"
            type="number"
            min="0"
            max={grossAmount || undefined}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className={ui.input}
            placeholder="e.g. 50"
          />
        </div>

        {grossAmount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
            <div className="flex flex-col">
              <span className="text-sm text-emerald-700">
                {parsedQuantity} × {formatTaka(PKG_CONFIG[pkg].price)}
              </span>
              {parsedDiscount > 0 && (
                <span className="text-xs font-medium text-amber-600">
                  −{formatTaka(parsedDiscount)} discount
                </span>
              )}
            </div>
            <span className="text-lg font-bold tabular-nums text-emerald-700">
              = {formatTaka(previewAmount)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sale-customer" className={ui.label}>
              Customer Name <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="sale-customer"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={ui.input}
              placeholder="Buyer's name"
            />
          </div>
          <div>
            <label htmlFor="sale-phone" className={ui.label}>
              Phone <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="sale-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className={ui.input}
              placeholder="01XXXXXXXXX"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sale-notes" className={ui.label}>
            Notes <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <input
            id="sale-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={ui.input}
            placeholder="e.g. Morning batch, area name…"
          />
        </div>

        <ModalActions>
          <button type="button" onClick={onClose} className={ui.buttonSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className={ui.buttonPrimary}>
            {isLoading
              ? editingSale
                ? 'Saving…'
                : 'Recording…'
              : editingSale
                ? 'Save Changes'
                : 'Record Sale'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
