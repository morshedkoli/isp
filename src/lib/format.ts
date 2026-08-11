/**
 * Single source of truth for money and date display.
 *
 * The app previously had four competing currency formatters — some rendering
 * "৳1,234", others "BDT 1,234", and two that ran the value through Math.abs()
 * and silently dropped the minus sign on a loss. Everything now goes through here.
 */

const TAKA = '৳';
const LOCALE = 'en-BD';

// U+2212 MINUS SIGN — visually balanced with digits, unlike the ASCII hyphen.
const MINUS = '−';

export interface MoneyOptions {
  /** Show two decimal places. Defaults to whole taka. */
  decimals?: boolean;
  /** Render a leading "+" for positive values (for deltas). Defaults to false. */
  signed?: boolean;
}

/**
 * Format an amount as taka. Negative values keep their sign — callers must not
 * pre-apply Math.abs(), or a loss will read as a gain.
 */
export function formatTaka(amount: number, options: MoneyOptions = {}): string {
  const { decimals = false, signed = false } = options;
  const safe = Number.isFinite(amount) ? amount : 0;
  const fractionDigits = decimals ? 2 : 0;

  const digits = Math.abs(safe).toLocaleString(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const sign = safe < 0 ? MINUS : signed && safe > 0 ? '+' : '';
  return `${sign}${TAKA}${digits}`;
}

/**
 * Format an amount that is being subtracted (agent payouts, expenses, …).
 * Always renders with a leading minus regardless of the value's own sign,
 * so breakdown rows read consistently.
 */
export function formatDeduction(amount: number): string {
  return `${MINUS}${formatTaka(Math.abs(amount))}`;
}

/** Percentage with at most one decimal place — "60%" / "60.9%". */
export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString(LOCALE, { maximumFractionDigits: 1 })}%`;
}

/** "05 Oct 2026" */
export function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** "05 Oct" — for dense tables where the year is implied by the period filter. */
export function formatDateShort(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

/** Value for an <input type="date">. */
export function toDateInputValue(value: Date | string = new Date()): string {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANK: 'Bank',
  OTHER: 'Other',
};

export function formatPaymentMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
