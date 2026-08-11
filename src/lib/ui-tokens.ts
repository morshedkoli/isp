/**
 * Design tokens — the single visual language for the admin panel.
 *
 * Direction: "Soft Greenish" Premium UI. Soft emerald and sage tones,
 * gradient accents, layered low-opacity emerald shadows, generous rounding,
 * and backdrop blur depth.
 *
 * Every page composes from these — do not hand-roll one-off card/button classes.
 */

// ─── Surfaces ─────────────────────────────────────────────────────────────────

export const ui = {
  /** Primary raised surface. */
  card: 'rounded-2xl bg-white shadow-[0_4px_24px_-4px_rgba(16,185,129,0.06),0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-emerald-950/[0.04]',
  /** Recessed surface for nested content inside a card. */
  cardSoft: 'rounded-xl bg-emerald-50/40 ring-1 ring-emerald-900/[0.04]',
  /** Header strip inside a card. */
  cardHeader: 'flex items-center gap-2.5 border-b border-emerald-900/5 px-5 py-4',
  cardBody: 'p-5',

  // ─── Typography ─────────────────────────────────────────────────────────────
  pageTitle: 'text-2xl font-bold tracking-tight text-stone-900',
  pageSubtitle: 'text-sm text-stone-500',
  sectionTitle: 'text-base font-semibold text-stone-900',
  /** Small uppercase label above a value or section. */
  eyebrow: 'text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70',
  metricValue: 'text-2xl font-bold tracking-tight text-stone-900',

  // ─── Form controls ──────────────────────────────────────────────────────────
  label: 'mb-1.5 block text-sm font-medium text-stone-700',
  input:
    'w-full rounded-xl border border-emerald-900/10 bg-emerald-50/20 px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15',
  /** Same as `input` but without the full-width constraint. */
  inputBase:
    'rounded-xl border border-emerald-900/10 bg-emerald-50/20 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15',
  select:
    'cursor-pointer rounded-xl border border-emerald-900/10 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 outline-none transition-all hover:border-emerald-600/30 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15',

  // ─── Buttons ────────────────────────────────────────────────────────────────
  buttonPrimary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(16,185,129,0.28)] transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-60 disabled:shadow-none',
  buttonSecondary:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-all hover:border-emerald-600/30 hover:bg-emerald-50/50 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:opacity-60',
  buttonSecondarySm:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-900/10 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition-all hover:border-emerald-600/30 hover:bg-emerald-50/50 hover:text-emerald-900 disabled:opacity-60',
  buttonDanger:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(225,29,72,0.22)] transition-all hover:from-rose-700 hover:to-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-60',
  /** Borderless icon button used in table rows. */
  buttonIcon:
    'rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-400',

  // ─── Tables ─────────────────────────────────────────────────────────────────
  table: 'w-full text-sm',
  tableHead: 'border-b border-emerald-900/5 bg-emerald-50/40',
  tableHeadCell: 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-emerald-800/70',
  tableCell: 'px-4 py-3 text-stone-600',
  tableRow: 'group border-b border-emerald-900/[0.03] transition-colors last:border-0 hover:bg-emerald-50/30',
  tableFootRow: 'border-t border-emerald-900/10 bg-emerald-50/60',

  // ─── Overlays ───────────────────────────────────────────────────────────────
  modalOverlay: 'absolute inset-0 bg-stone-950/40 backdrop-blur-md',
  modalPanel:
    'relative w-full rounded-2xl bg-white p-6 shadow-[0_24px_64px_-16px_rgba(16,185,129,0.15)] ring-1 ring-emerald-950/[0.06]',
  modalShell: 'fixed inset-0 z-50 flex items-center justify-center p-4',

  // ─── Feedback ───────────────────────────────────────────────────────────────
  errorBanner: 'rounded-xl border border-rose-200/70 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-sm',
  badge: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
} as const;

// ─── Semantic accents ─────────────────────────────────────────────────────────

/**
 * One accent per business concept, styled with green-harmonious tones.
 */
export interface AccentTokens {
  /** Solid gradient surface for hero/KPI tiles. */
  solid: string;
  /** Tinted surface for breakdown rows and chips. */
  soft: string;
  /** Text colour on a light background. */
  text: string;
  /** Icon/dot fill. */
  dot: string;
  /** Progress bar fill. */
  bar: string;
}

export const accents = {
  commission: {
    solid: 'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-emerald-500/20',
    soft: 'bg-emerald-50/80 ring-1 ring-emerald-200/60',
    text: 'text-emerald-800',
    dot: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  expense: {
    solid: 'bg-gradient-to-br from-rose-600 to-rose-500 text-white shadow-rose-500/20',
    soft: 'bg-rose-50/80 ring-1 ring-rose-200/60',
    text: 'text-rose-700',
    dot: 'text-rose-500',
    bar: 'bg-rose-500',
  },
  profit: {
    solid: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-emerald-500/20',
    soft: 'bg-emerald-50/90 ring-1 ring-emerald-200/80',
    text: 'text-emerald-800',
    dot: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  loss: {
    solid: 'bg-gradient-to-br from-amber-600 to-amber-500 text-white shadow-amber-500/20',
    soft: 'bg-amber-50/80 ring-1 ring-amber-200/60',
    text: 'text-amber-700',
    dot: 'text-amber-500',
    bar: 'bg-amber-500',
  },
  hotspot: {
    solid: 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-teal-500/20',
    soft: 'bg-teal-50/80 ring-1 ring-teal-200/60',
    text: 'text-teal-800',
    dot: 'text-teal-600',
    bar: 'bg-teal-500',
  },
  agent: {
    solid: 'bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white shadow-emerald-700/20',
    soft: 'bg-emerald-50/80 ring-1 ring-emerald-200/60',
    text: 'text-emerald-800',
    dot: 'text-emerald-600',
    bar: 'bg-emerald-600',
  },
  partner: {
    solid: 'bg-gradient-to-br from-teal-700 via-emerald-600 to-teal-800 text-white shadow-teal-600/20',
    soft: 'bg-teal-50/80 ring-1 ring-teal-200/60',
    text: 'text-teal-800',
    dot: 'text-teal-600',
    bar: 'bg-teal-600',
  },
  neutral: {
    solid: 'bg-gradient-to-br from-stone-800 via-emerald-950 to-stone-900 text-white',
    soft: 'bg-emerald-50/40 ring-1 ring-emerald-900/10',
    text: 'text-stone-800',
    dot: 'text-emerald-700',
    bar: 'bg-emerald-600',
  },
} satisfies Record<string, AccentTokens>;

export type AccentName = keyof typeof accents;

/** Rotating palette for per-partner colour coding (charts, avatars, bars). */
export const PARTNER_ACCENTS: AccentName[] = [
  'commission',
  'profit',
  'hotspot',
  'partner',
  'agent',
];

/** Status pill styling, keyed by settlement state. */
export const statusBadge = {
  settled: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
  partial: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
  unpaid: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70',
  none: 'bg-stone-100 text-stone-500 ring-1 ring-stone-200/70',
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
  inactive: 'bg-stone-100 text-stone-500 ring-1 ring-stone-200/70',
} as const;

