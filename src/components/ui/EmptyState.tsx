import type { LucideIcon } from 'lucide-react';
import { accents, type AccentName } from '@/lib/ui-tokens';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: AccentName;
  /** Call-to-action, typically a button or link. */
  action?: React.ReactNode;
  /** `compact` for empties inside a card section, `full` for a whole page area. */
  size?: 'compact' | 'full';
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  accent = 'neutral',
  action,
  size = 'full',
}: EmptyStateProps) {
  const isCompact = size === 'compact';

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${isCompact ? 'py-10' : 'py-16'}`}
    >
      <div
        className={`mb-3 flex items-center justify-center rounded-full ${accents[accent].soft} ${isCompact ? 'h-11 w-11' : 'h-14 w-14'}`}
      >
        <Icon size={isCompact ? 20 : 24} className={accents[accent].dot} />
      </div>
      <p className={`font-semibold text-stone-700 ${isCompact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
