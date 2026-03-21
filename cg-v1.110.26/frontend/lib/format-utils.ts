/**
 * Safe formatting utilities for SuperAdmin portal.
 *
 * Guards against undefined/null/NaN values that crash .toLocaleString()
 * and other formatting methods when API data is incomplete.
 */

/** Coerce unknown input to a safe number, defaulting to 0. */
export function safeNumber(n: unknown): number {
  if (n == null) return 0;
  const num = typeof n === 'number' ? n : Number(n);
  return isNaN(num) ? 0 : num;
}

/** Format a number with K/M abbreviations, safe against null/undefined. */
export function safeFormatNumber(n: unknown): string {
  const num = safeNumber(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/** Format as USD currency, safe against null/undefined. */
export function safeCurrency(n: unknown): string {
  const num = safeNumber(n);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Format an ISO date string, returning a fallback for invalid/missing values. */
export function safeDate(iso: unknown, fallback = '—'): string {
  if (!iso || typeof iso !== 'string') return fallback;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format a percentage, safe against null/undefined. */
export function safePercent(n: unknown, decimals = 1): string {
  const num = safeNumber(n);
  return `${num.toFixed(decimals)}%`;
}
