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

export const CATEGORY_LABEL: Record<string, string> = {
  largecap: 'Large cap',
  midcap: 'Mid cap',
  smallcap: 'Small cap',
};

export const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  STILL_OPEN: 'Still open',
  HIT_TARGET: 'Target hit',
  HIT_STOPLOSS: 'Stop hit',
  EXPIRED_OPEN: 'Expired',
};
