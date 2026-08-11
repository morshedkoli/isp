import type { LucideIcon } from 'lucide-react';
import { accents, ui, type AccentName } from '@/lib/ui-tokens';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: AccentName;
  /** `solid` for headline KPIs, `soft` for secondary summary tiles. */
  variant?: 'solid' | 'soft';
}

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'neutral',
  variant = 'solid',
}: StatCardProps) {
  const tokens = accents[accent];

  if (variant === 'soft') {
    return (
      <div className={`flex items-center gap-4 rounded-2xl p-4 ${tokens.soft}`}>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            <Icon size={18} className={tokens.dot} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">{label}</p>
          <p className={`truncate text-xl font-bold ${tokens.text}`}>{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-stone-400">{hint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 shadow-[0_8px_24px_-12px_rgba(28,25,23,0.35)] ${tokens.solid}`}
    >
      {/* Soft highlight so the flat gradient reads as a lit surface. */}
      <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{label}</p>
          <p className="mt-2 truncate text-3xl font-extrabold tracking-tight">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-white/70">{hint}</p>}
        </div>
        {Icon && (
          <div className="shrink-0 rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact metric used inside cards where a full StatCard would be too heavy. */
export function MiniStat({
  label,
  value,
  accent = 'neutral',
}: {
  label: string;
  value: string;
  accent?: AccentName;
}) {
  return (
    <div className={ui.cardSoft + ' p-4'}>
      <p className={ui.eyebrow}>{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${accents[accent].text}`}>{value}</p>
    </div>
  );
}
