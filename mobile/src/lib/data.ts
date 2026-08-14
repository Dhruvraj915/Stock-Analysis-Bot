import { parseCsv } from './csv';
import {
  BacktestTrade,
  CapCategory,
  CAP_CATEGORIES,
  LedgerEntry,
  PickStatus,
} from './types';

import fallbackBacktest from './fallbackBacktest.json';
import fallbackLedger from './fallbackLedger.json';

/**
 * The mobile app has no backend — it reads the same public GitHub repo the
 * CLI already commits to daily, straight off raw.githubusercontent.com.
 * Zero cost, always as fresh as the last daily/weekly Action run.
 * Falls back to bundled data if offline or remote fetch fails.
 */
const REPO_RAW_BASE =
  'https://raw.githubusercontent.com/Dhruvraj915/Stock-Analysis-Bot/main/';

export async function fetchLedger(): Promise<LedgerEntry[]> {
  try {
    const res = await fetch(`${REPO_RAW_BASE}data/ledger.json`);
    if (res.ok) {
      const parsed = await res.json();
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed to fetch remote ledger, using fallback:', err);
  }
  return fallbackLedger as LedgerEntry[];
}

export async function fetchBacktestTrades(): Promise<BacktestTrade[]> {
  try {
    const res = await fetch(`${REPO_RAW_BASE}backtest-results.csv`);
    if (res.ok) {
      const text = await res.text();
      const rows = parseCsv(text);
      if (rows.length > 0) {
        return rows.map(r => ({
          entryDate: r.entryDate,
          ticker: r.ticker,
          category: r.category as CapCategory,
          entryPrice: Number(r.entryPrice),
          target: Number(r.target),
          stopLoss: Number(r.stopLoss),
          horizonDays: Number(r.horizonDays),
          exitDate: r.exitDate,
          exitPrice: Number(r.exitPrice),
          status: r.status as BacktestTrade['status'],
          returnPct: Number(r.returnPct),
          daysToResolution: Number(r.daysToResolution),
        }));
      }
    }
  } catch (err) {
    console.warn('Failed to fetch remote backtest CSV, using fallback:', err);
  }
  return fallbackBacktest as BacktestTrade[];
}

const ACTIVE_STATUSES: PickStatus[] = ['OPEN', 'STILL_OPEN'];
export const isActive = (status: PickStatus) =>
  ACTIVE_STATUSES.includes(status);

/**
 * Scores an active open pick based on four criteria (mirrors the "Step 2"
 * guide shown to the user):
 *   1. Price proximity  — current price within -1% to +2% of entry  (max 30 pts)
 *   2. Freshness        — picked 0–15 days ago                       (max 25 pts)
 *   3. Composite score  — algo's own score (0–100)                   (max 30 pts)
 *   4. Risk-reward      — ratio ≥ 2.0:1                             (max 15 pts)
 *
 * Returns a value in [0, 100].
 */
export function scorePick(entry: LedgerEntry, today = new Date()): number {
  const todayIso = today.toISOString().slice(0, 10);
  const currentPrice =
    entry.lastCheckedPrice ?? entry.resolvedPrice ?? entry.entryReference;
  const ref = entry.entryReference;

  // 1. Price proximity: how close is current price to entry zone?
  const priceDriftPct = ref > 0 ? ((currentPrice - ref) / ref) * 100 : 999;
  let proximityScore = 0;
  if (priceDriftPct >= -1 && priceDriftPct <= 2) {
    // Ideal zone: full 30 pts
    proximityScore = 30;
  } else if (priceDriftPct > 2 && priceDriftPct <= 5) {
    // Already moved up a bit: partial credit
    proximityScore = Math.max(0, 30 - (priceDriftPct - 2) * 6);
  } else if (priceDriftPct < -1 && priceDriftPct >= -5) {
    // Slightly below entry (pullback): partial credit
    proximityScore = Math.max(0, 30 + priceDriftPct * 4);
  }

  // 2. Freshness: 0–15 days gets full 25 pts, decays linearly after that
  const a = new Date(entry.date + 'T00:00:00Z').getTime();
  const b = new Date(todayIso + 'T00:00:00Z').getTime();
  const daysHeld = Math.max(0, Math.round((b - a) / 86_400_000));
  const freshnessScore =
    daysHeld <= 15 ? 25 : Math.max(0, 25 - (daysHeld - 15) * 1.5);

  // 3. Composite score: scale 0–100 to 0–30 pts
  const compositeScore = Math.min(30, (entry.compositeScore / 100) * 30);

  // 4. Risk-reward: ≥2 gets 15 pts, proportional below
  const rr = entry.riskRewardRatio ?? 0;
  const rrScore = Math.min(15, (rr / 2) * 15);

  return Math.round(proximityScore + freshnessScore + compositeScore + rrScore);
}

/**
 * Returns the top `limit` active picks from `entries`, sorted by
 * `scorePick()` descending. Only picks scoring ≥ 50 are included
 * to ensure recommendations are genuinely strong.
 */
export function getTopRecommendedPicks(
  entries: LedgerEntry[],
  limit = 2,
): Array<LedgerEntry & { recommendationScore: number }> {
  return entries
    .filter(e => isActive(e.status))
    .map(e => ({ ...e, recommendationScore: scorePick(e) }))
    .filter(e => e.recommendationScore >= 50)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

export function groupByCategory<T extends { category: CapCategory }>(
  entries: T[],
): Record<CapCategory, T[]> {
  const out: Record<CapCategory, T[]> = {
    largecap: [],
    midcap: [],
    smallcap: [],
  };
  for (const e of entries) out[e.category].push(e);
  return out;
}

/** Mirrors src/weeklySummary.ts `computeStats` — win rate credits any closed
 * pick with a positive return, not just literal target hits. */
export interface LedgerStats {
  total: number;
  hitTarget: number;
  hitStop: number;
  expired: number;
  open: number;
  closed: number;
  winRatePct: number | null;
  avgReturnClosedPct: number | null;
  avgReturnOpenPct: number | null;
}

export function computeLedgerStats(entries: LedgerEntry[]): LedgerStats {
  let hitTarget = 0;
  let hitStop = 0;
  let expired = 0;
  let open = 0;
  const closedReturns: number[] = [];
  const openReturns: number[] = [];
  let wins = 0;

  for (const e of entries) {
    if (isActive(e.status)) {
      open++;
      if (e.returnPct != null) openReturns.push(e.returnPct);
      continue;
    }
    if (e.status === 'HIT_TARGET') hitTarget++;
    else if (e.status === 'HIT_STOPLOSS') hitStop++;
    else if (e.status === 'EXPIRED_OPEN') expired++;

    if (e.returnPct != null) {
      closedReturns.push(e.returnPct);
      if (e.returnPct > 0) wins++;
    }
  }

  const closed = hitTarget + hitStop + expired;
  const avg = (xs: number[]): number | null =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

  return {
    total: entries.length,
    hitTarget,
    hitStop,
    expired,
    open,
    closed,
    winRatePct: closedReturns.length
      ? (wins / closedReturns.length) * 100
      : null,
    avgReturnClosedPct: avg(closedReturns),
    avgReturnOpenPct: avg(openReturns),
  };
}

/** Cumulative return (%) walking resolved picks in resolution order — an
 * equity-curve proxy: each closed pick contributes its return as if an equal
 * slice of capital were allocated to it. */
export function buildEquityCurve(
  entries: LedgerEntry[],
): { label: string; value: number }[] {
  const resolved = entries
    .filter(
      e => !isActive(e.status) && e.resolvedDate != null && e.returnPct != null,
    )
    .sort((a, b) => (a.resolvedDate! < b.resolvedDate! ? -1 : 1));

  let cumulative = 0;
  const points = [{ label: 'Start', value: 0 }];
  for (const e of resolved) {
    cumulative += e.returnPct!;
    points.push({
      label: e.resolvedDate!,
      value: Math.round(cumulative * 100) / 100,
    });
  }
  return points;
}

/** Mirrors the `aggregate()` shape in src/backtest.ts:190. */
export interface BacktestAggregate {
  n: number;
  hitTarget: number;
  hitStop: number;
  expired: number;
  winRatePct: number | null;
  avgReturnPct: number | null;
  avgDaysToResolution: number | null;
}

export function computeBacktestAggregate(
  trades: BacktestTrade[],
): BacktestAggregate {
  if (trades.length === 0) {
    return {
      n: 0,
      hitTarget: 0,
      hitStop: 0,
      expired: 0,
      winRatePct: null,
      avgReturnPct: null,
      avgDaysToResolution: null,
    };
  }
  const hitTarget = trades.filter(t => t.status === 'HIT_TARGET').length;
  const hitStop = trades.filter(t => t.status === 'HIT_STOPLOSS').length;
  const expired = trades.filter(t => t.status === 'EXPIRED_OPEN').length;
  const wins = trades.filter(t => t.returnPct > 0).length;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    n: trades.length,
    hitTarget,
    hitStop,
    expired,
    winRatePct: (wins / trades.length) * 100,
    avgReturnPct: avg(trades.map(t => t.returnPct)),
    avgDaysToResolution: avg(trades.map(t => t.daysToResolution)),
  };
}

export function computeBacktestByCategory(
  trades: BacktestTrade[],
): Record<CapCategory, BacktestAggregate> {
  const grouped = groupByCategory(trades);
  return {
    largecap: computeBacktestAggregate(grouped.largecap),
    midcap: computeBacktestAggregate(grouped.midcap),
    smallcap: computeBacktestAggregate(grouped.smallcap),
  };
}

/** Bucketed return distribution for a histogram, split at 0% (loss vs gain). */
export function buildReturnHistogram(
  trades: BacktestTrade[],
  bucketWidth = 5,
): { label: string; value: number; isLoss: boolean }[] {
  if (trades.length === 0) return [];
  const min = Math.min(...trades.map(t => t.returnPct));
  const max = Math.max(...trades.map(t => t.returnPct));
  const lowBucket = Math.floor(min / bucketWidth) * bucketWidth;
  const highBucket = Math.ceil(max / bucketWidth) * bucketWidth;

  const buckets: { start: number; count: number }[] = [];
  for (let start = lowBucket; start < highBucket; start += bucketWidth) {
    buckets.push({ start, count: 0 });
  }
  for (const t of trades) {
    let idx = Math.floor((t.returnPct - lowBucket) / bucketWidth);
    if (idx >= buckets.length) idx = buckets.length - 1;
    if (idx < 0) idx = 0;
    buckets[idx].count++;
  }
  return buckets.map(b => ({
    label: `${b.start >= 0 ? '+' : ''}${b.start}%`,
    value: b.count,
    isLoss: b.start < 0,
  }));
}

export { CAP_CATEGORIES };
