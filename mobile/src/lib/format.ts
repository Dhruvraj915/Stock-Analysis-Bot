export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Whole calendar days between two ISO dates (b - a). */
export function daysBetweenDates(aIso: string, bIso: string = new Date().toISOString().slice(0, 10)): number {
  const a = new Date(aIso + 'T00:00:00Z').getTime();
  const b = new Date(bIso + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export const CATEGORY_LABEL: Record<string, string> = {
  largecap: 'Large cap',
  midcap: 'Mid cap',
  smallcap: 'Small cap',
};

export const HORIZON_LABEL: Record<string, string> = {
  swing: 'Swing (10–15d)',
  positional: 'Positional (2–3m)',
  longterm: 'Long-Term (1–2y)',
};

export const HORIZON_SHORT_LABEL: Record<string, string> = {
  swing: '10–15d',
  positional: '2–3m',
  longterm: '1–2y',
};

export const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  STILL_OPEN: 'Still open',
  HIT_TARGET: 'Target hit',
  HIT_STOPLOSS: 'Stop hit',
  EXPIRED_OPEN: 'Expired',
};

