/**
 * Pure technical-indicator math. No I/O, no network, no dates beyond what is
 * passed in — which makes every function here trivially unit-testable with
 * synthetic data (see scoring.test.ts).
 *
 * All functions operate on plain number arrays that are assumed to be in
 * chronological order (oldest -> newest).
 */

import { Candle } from "./types";

/** Simple moving average of the last `period` values. Null if not enough data. */
export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) {
    sum += values[i];
  }
  return sum / period;
}

/**
 * Wilder's RSI over `period`. Returns a value in 0..100, or null if there is
 * not enough data. Uses simple averaging of the first `period` changes then
 * Wilder smoothing thereafter.
 */
export function rsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  let gainSum = 0;
  let lossSum = 0;
  // Seed with the first `period` changes.
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gainSum += change;
    else lossSum -= change;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  // Wilder smoothing across the remainder.
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Average True Range over `period` using Wilder smoothing. Null if not enough
 * data. Measures typical daily range in absolute price terms.
 */
export function atr(candles: Candle[], period: number): number | null {
  if (candles.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose),
    );
    trueRanges.push(tr);
  }

  // Seed with a simple average of the first `period` true ranges.
  let sum = 0;
  for (let i = 0; i < period; i++) sum += trueRanges[i];
  let atrVal = sum / period;
  // Wilder smoothing for the rest.
  for (let i = period; i < trueRanges.length; i++) {
    atrVal = (atrVal * (period - 1) + trueRanges[i]) / period;
  }
  return atrVal;
}

/**
 * Momentum as a simple return over `lookback` bars:
 * (last / value `lookback` bars ago) - 1. Null if not enough data.
 */
export function momentum(closes: number[], lookback: number): number | null {
  if (closes.length < lookback + 1) return null;
  const past = closes[closes.length - 1 - lookback];
  if (past <= 0) return null;
  return closes[closes.length - 1] / past - 1;
}

/**
 * Medium-term support (lowest low) and resistance (highest high) over the
 * last `window` candles. Returns nulls if not enough data.
 */
export function supportResistance(
  candles: Candle[],
  window: number,
): { support: number | null; resistance: number | null } {
  if (candles.length === 0) return { support: null, resistance: null };
  const start = Math.max(0, candles.length - window);
  let support = Infinity;
  let resistance = -Infinity;
  for (let i = start; i < candles.length; i++) {
    if (candles[i].low < support) support = candles[i].low;
    if (candles[i].high > resistance) resistance = candles[i].high;
  }
  return {
    support: Number.isFinite(support) ? support : null,
    resistance: Number.isFinite(resistance) ? resistance : null,
  };
}

/** Convenience: extract the close prices from a candle series. */
export function closesOf(candles: Candle[]): number[] {
  return candles.map((c) => c.close);
}

/**
 * Exponential Moving Average (EMA).
 */
export function ema(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  const k = 2 / (period + 1);
  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let currentEma = sum / period;
  for (let i = period; i < values.length; i++) {
    currentEma = values[i] * k + currentEma * (1 - k);
  }
  return currentEma;
}

/**
 * MACD indicator: returns MACD line, signal line, and histogram.
 */
export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macdLine: number; signalLine: number; histogram: number } | null {
  if (closes.length < slowPeriod + signalPeriod) return null;

  // Calculate series of MACD line values to compute signal EMA
  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);
  const kSignal = 2 / (signalPeriod + 1);

  // Initial SMA for fast and slow
  let fastSum = 0;
  for (let i = 0; i < fastPeriod; i++) fastSum += closes[i];
  let fastEma = fastSum / fastPeriod;

  let slowSum = 0;
  for (let i = 0; i < slowPeriod; i++) slowSum += closes[i];
  let slowEma = slowSum / slowPeriod;

  // Run EMA forward until slowPeriod start
  for (let i = fastPeriod; i < slowPeriod; i++) {
    fastEma = closes[i] * kFast + fastEma * (1 - kFast);
  }

  const macdValues: number[] = [];
  macdValues.push(fastEma - slowEma);

  for (let i = slowPeriod; i < closes.length; i++) {
    fastEma = closes[i] * kFast + fastEma * (1 - kFast);
    slowEma = closes[i] * kSlow + slowEma * (1 - kSlow);
    macdValues.push(fastEma - slowEma);
  }

  if (macdValues.length < signalPeriod) return null;

  // Signal line is EMA of macdValues
  let signalSum = 0;
  for (let i = 0; i < signalPeriod; i++) signalSum += macdValues[i];
  let signalEma = signalSum / signalPeriod;

  for (let i = signalPeriod; i < macdValues.length; i++) {
    signalEma = macdValues[i] * kSignal + signalEma * (1 - kSignal);
  }

  const currentMacd = macdValues[macdValues.length - 1];
  const histogram = currentMacd - signalEma;

  return { macdLine: currentMacd, signalLine: signalEma, histogram };
}

/**
 * Volume ratio: compares recent average volume (e.g. 5 days) to baseline (e.g. 20 days).
 */
export function volumeRatio(
  candles: Candle[],
  recentPeriod = 5,
  baselinePeriod = 20
): number | null {
  if (candles.length < baselinePeriod) return null;
  const vols = candles.map((c) => c.volume);
  const recentSum = vols.slice(-recentPeriod).reduce((a, b) => a + b, 0);
  const baselineSum = vols.slice(-baselinePeriod).reduce((a, b) => a + b, 0);
  const recentAvg = recentSum / recentPeriod;
  const baselineAvg = baselineSum / baselinePeriod;
  if (baselineAvg <= 0) return 1;
  return recentAvg / baselineAvg;
}

/**
 * Proximity to 52-week (or custom window) high.
 * Returns ratio: price / high52w (e.g. 0.95 means within 5% of 52w high).
 */
export function nearHigh(candles: Candle[], windowDays = 252): number | null {
  if (candles.length === 0) return null;
  const slice = candles.slice(-windowDays);
  const maxHigh = Math.max(...slice.map((c) => c.high));
  const currentPrice = candles[candles.length - 1].close;
  if (maxHigh <= 0) return null;
  return currentPrice / maxHigh;
}
