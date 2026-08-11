import type { LucideIcon } from 'lucide-react';
import { accents, ui, type AccentName } from '@/lib/ui-tokens';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Semantic colour for the icon tile — matches the module's identity. */
  accent?: AccentName;
  /** Buttons / links rendered on the trailing edge. */
  actions?: React.ReactNode;
  /** Secondary row beneath the title, typically a <PeriodSelector />. */
  toolbar?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  accent = 'commission',
  actions,
  toolbar,
}: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${accents[accent].solid}`}
            >
              <Icon size={21} />
            </div>
          )}
          <div>
            <h1 className={ui.pageTitle}>{title}</h1>
            {subtitle && <p className={ui.pageSubtitle}>{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {toolbar}
    </header>
  );
}
