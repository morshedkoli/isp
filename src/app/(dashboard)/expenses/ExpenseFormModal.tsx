'use client';

import { useState } from 'react';
import { Banknote } from 'lucide-react';
import Modal, { ModalActions } from '@/components/ui/Modal';
import { toDateInputValue } from '@/lib/format';
import { ui } from '@/lib/ui-tokens';
import { createExpense, updateExpense } from './actions';
import { EXPENSE_CONFIG, type Expense, type ExpenseType } from './shared';

interface ExpenseFormModalProps {
  initialType?: ExpenseType;
  editing: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CONFIG).map(([key, config]) => ({
  value: key as ExpenseType,
  label: config.title,
}));

export default function ExpenseFormModal({
  initialType = 'MISC',
  editing,
  onClose,
  onSaved,
}: ExpenseFormModalProps) {
  const [selectedType, setSelectedType] = useState<ExpenseType>(editing?.type || initialType);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [date, setDate] = useState(toDateInputValue(editing?.date ?? new Date()));
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const config = EXPENSE_CONFIG[selectedType];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!description.trim()) {
      setError(`${config.nameLabel} is required.`);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const payload = {
        description: description.trim(),
        amount: parsedAmount,
        date,
        notes: notes.trim() || undefined,
      };
      
      const result = editing
        ? await updateExpense(editing.id, { ...payload, type: selectedType })
        : await createExpense({ ...payload, type: selectedType });

      if (result.success) {
        onSaved();
      } else {
        setError(result.error || 'Could not save this entry.');
      }
    } catch {
      setError('Unexpected error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={editing ? 'খরচ এডিট করুন (Edit Expense)' : 'খরচ যোগ করুন (Add Expense)'}
      description={editing ? 'Update expense details' : 'Enter a new expense record.'}
      icon={Banknote}
      accent="expense"
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="expense-category" className={ui.label}>
            Category *
          </label>
          <select
            id="expense-category"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ExpenseType)}
            className={ui.input}
            required
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="expense-description" className={ui.label}>
            {config.nameLabel} *
          </label>
          <input
            id="expense-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={ui.input}
            placeholder={config.namePlaceholder}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expense-amount" className={ui.label}>
              Amount (৳) *
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">
                ৳
              </span>
              <input
                id="expense-amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${ui.input} pl-8 font-bold`}
                placeholder="0"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="expense-date" className={ui.label}>
              Date *
            </label>
            <input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={ui.input}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="expense-notes" className={ui.label}>
            Notes <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <input
            id="expense-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={ui.input}
            placeholder="Any additional detail…"
          />
        </div>

        <ModalActions>
          <button type="button" onClick={onClose} className={ui.buttonSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className={ui.buttonPrimary}>
            {isLoading ? 'Saving…' : editing ? 'Save Changes' : 'Add Expense'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
