import type { LucideIcon } from 'lucide-react';
import { accents, ui, type AccentName } from '@/lib/ui-tokens';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`${ui.card} ${className}`}>{children}</div>;
}

interface SectionCardProps extends CardProps {
  title: string;
  icon?: LucideIcon;
  accent?: AccentName;
  /** Right-aligned content in the header — counts, links, filters. */
  aside?: React.ReactNode;
  /** Set false when the body manages its own padding (e.g. a full-bleed table). */
  padded?: boolean;
}

/** A card with a titled header strip — the default container for page sections. */
export function SectionCard({
  title,
  icon: Icon,
  accent = 'neutral',
  aside,
  children,
  padded = true,
  className = '',
}: SectionCardProps) {
  return (
    <section className={`${ui.card} overflow-hidden ${className}`}>
      <div className={ui.cardHeader}>
        {Icon && <Icon size={17} className={accents[accent].dot} />}
        <h2 className={ui.sectionTitle}>{title}</h2>
        {aside && <div className="ml-auto flex items-center gap-2">{aside}</div>}
      </div>
      <div className={padded ? ui.cardBody : ''}>{children}</div>
    </section>
  );
}
