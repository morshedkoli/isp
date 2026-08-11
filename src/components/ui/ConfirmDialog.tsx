'use client';

import { Trash2 } from 'lucide-react';
import { ui } from '@/lib/ui-tokens';

interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive-action confirmation. Replaces the four near-identical inline
 * delete dialogs that previously lived in the expenses, hotspot, commissions,
 * and partners modules.
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className={ui.modalShell} role="dialog" aria-modal="true" aria-label={title}>
      <div className={ui.modalOverlay} onClick={onCancel} />
      <div className={`${ui.modalPanel} max-w-sm`}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
          <Trash2 size={21} className="text-rose-600" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className={`flex-1 ${ui.buttonSecondary}`}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 ${ui.buttonDanger}`}
          >
            {isLoading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
