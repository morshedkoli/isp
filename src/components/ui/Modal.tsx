'use client';

import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { accents, ui, type AccentName } from '@/lib/ui-tokens';

interface ModalProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  accent?: AccentName;
  /** Tailwind max-width class for the panel. */
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const;

/** Standard form modal shell — header, optional error banner, and body. */
export default function Modal({
  title,
  description,
  icon: Icon,
  accent = 'commission',
  size = 'md',
  error,
  onClose,
  children,
}: ModalProps) {
  return (
    <div className={ui.modalShell} role="dialog" aria-modal="true" aria-label={title}>
      <div className={ui.modalOverlay} onClick={onClose} />
      <div className={`${ui.modalPanel} ${SIZES[size]}`}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${accents[accent].solid}`}
              >
                <Icon size={16} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-stone-900">{title}</h2>
              {description && <p className="text-xs text-stone-400">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={ui.buttonIcon}
          >
            <X size={18} />
          </button>
        </div>

        {error && <div className={`mb-4 ${ui.errorBanner}`}>{error}</div>}

        {children}
      </div>
    </div>
  );
}

/** Right-aligned action row for modal forms. */
export function ModalActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">{children}</div>
  );
}
