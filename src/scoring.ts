/**
 * ============================================================================
 *  SCORING ENGINE  —  tuned for 2-3+ month positional holds
 * ============================================================================
 *  Design principle: MEDIUM-TERM over short-term.
 *    - Technical score emphasizes trend (price vs 50/200 SMA + golden cross)
 *      and 6-month momentum. RSI is ONLY a gate against chasing overbought/
 *      oversold extremes — it never drives the score up.
 *    - Fundamental score is weighted slightly heavier than technical in the
 *      composite (see COMPOSITE_WEIGHTS), because the horizon is months.
 *    - Trade levels come from ATR + medium-term (90-120 day) support/
 *      resistance, not short 20-30 day windows.
 *
 *  Every function is PURE (candles in, numbers out) so the exact same logic
 *  can be replayed on historical slices by the backtester with no lookahead.
 * ============================================================================
 */

import {
  Candle,
  CapCategory,
  FundamentalBreakdown,
  Fundamentals,
  ScoredStock,
  StockData,
  TechnicalBreakdown,
  TradeLevels,
} from "./types";
import {
  atr,
  closesOf,
  momentum,
  rsi,
  sma,
  supportResistance,
} from "./indicators";
import {
  COMPOSITE_WEIGHTS,
  FUNDAMENTAL_CURVES,
  FUNDAMENTAL_WEIGHTS,
  NEUTRAL_SCORE,
  TECHNICAL_PARAMS,
  TECHNICAL_WEIGHTS,
  TRADE_PARAMS,
} from "./config";

// ---------------------------------------------------------------------------
//  Small scoring helpers
// ---------------------------------------------------------------------------

/** Clamp a number into [0, 1]. */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Piecewise-linear "higher is better" score.
 * value <= bad  => 0 ; value >= good => 1 ; linear in between.
 */
export function linScore(value: number, bad: number, good: number): number {
  if (good === bad) return NEUTRAL_SCORE;
  return clamp01((value - bad) / (good - bad));
}

/**
 * Piecewise-linear "lower is better" score.
 * value <= good => 1 ; value >= bad => 0 ; linear in between.
 */
export function linScoreInverted(value: number, good: number, bad: number): number {
  if (good === bad) return NEUTRAL_SCORE;
  return clamp01((bad - value) / (bad - good));
}

/**
 * Map a signed relative distance (e.g. price 8% above SMA => 0.08) to 0..1,
 * centered at 0.5. Saturates at ±`scale`. Used for trend components.
 */
function softStep(relDistance: number, scale = 0.15): number {
  return clamp01(0.5 + 0.5 * Math.max(-1, Math.min(1, relDistance / scale)));
}

// ---------------------------------------------------------------------------
//  Technical score
// ---------------------------------------------------------------------------

/**
 * Compute the technical sub-score from a chronological candle series.
 * Any indicator that can't be computed (insufficient data) degrades to a
 * neutral 0.5 for that component rather than throwing.
 */
export function scoreTechnical(candles: Candle[]): TechnicalBreakdown {
  const closes = closesOf(candles);
  const price = closes[closes.length - 1];

  const sma50 = sma(closes, TECHNICAL_PARAMS.smaShortPeriod);
  const sma200 = sma(closes, TECHNICAL_PARAMS.smaLongPeriod);

  // --- Trend component (price vs 50/200 SMA + golden cross) ---
  const vs50 = sma50 != null ? softStep(price / sma50 - 1) : NEUTRAL_SCORE;
  const vs200 = sma200 != null ? softStep(price / sma200 - 1) : NEUTRAL_SCORE;
  const goldenCross =
    sma50 != null && sma200 != null
      ? softStep(sma50 / sma200 - 1)
      : NEUTRAL_SCORE;
  // Weight the longer-term signals a touch more (they matter more for a
  // multi-month hold): 50-SMA 30%, 200-SMA 35%, golden cross 35%.
  const trend = vs50 * 0.3 + vs200 * 0.35 + goldenCross * 0.35;

  // --- Momentum component (6-month return) ---
  const mom = momentum(closes, TECHNICAL_PARAMS.momentumLookbackDays);
  const momentumScore =
    mom != null ? linScore(mom, -0.1, 0.3) : NEUTRAL_SCORE;

  // --- RSI gate (penalize chasing extremes only) ---
  const rsiVal = rsi(closes, TECHNICAL_PARAMS.rsiPeriod);
  let rsiGate = 1;
  if (rsiVal != null) {
    if (
      rsiVal >= TECHNICAL_PARAMS.rsiOverbought ||
      rsiVal <= TECHNICAL_PARAMS.rsiOversold
    ) {
      rsiGate = 1 - TECHNICAL_PARAMS.rsiPenalty;
    }
  }

  const rawScore =
    trend * TECHNICAL_WEIGHTS.trend + momentumScore * TECHNICAL_WEIGHTS.momentum;
  const score = clamp01(rawScore * rsiGate);

  return { trend, momentum: momentumScore, rsiGate, score };
}

// ---------------------------------------------------------------------------
//  Fundamental score
// ---------------------------------------------------------------------------

/**
 * Compute the fundamental sub-score. Missing inputs are neutralized to 0.5
 * and counted in `missingCount`.
 */
export function scoreFundamental(f: Fundamentals): FundamentalBreakdown {
  const c = FUNDAMENTAL_CURVES;
  let missingCount = 0;

  // P/E — cheaper better; negative earnings heavily penalized.
  let pe: number;
  if (f.peRatio == null) {
    pe = NEUTRAL_SCORE;
    missingCount++;
  } else if (f.peRatio <= 0) {
    pe = c.pe.negativePenalty;
  } else {
    pe = linScoreInverted(f.peRatio, c.pe.good, c.pe.bad);
  }

  // ROE — higher better.
  let roe: number;
  if (f.roe == null) {
    roe = NEUTRAL_SCORE;
    missingCount++;
  } else {
    roe = linScore(f.roe, c.roe.bad, c.roe.good);
  }

  // Debt/Equity — lower better.
  let debtToEquity: number;
  if (f.debtToEquity == null) {
    debtToEquity = NEUTRAL_SCORE;
    missingCount++;
  } else {
    debtToEquity = linScoreInverted(
      f.debtToEquity,
      c.debtToEquity.good,
      c.debtToEquity.bad,
    );
  }

  // Earnings growth — higher better (negative maps to ~0).
  let earningsGrowth: number;
  if (f.earningsGrowth == null) {
    earningsGrowth = NEUTRAL_SCORE;
    missingCount++;
  } else {
    earningsGrowth = linScore(
      f.earningsGrowth,
      c.earningsGrowth.bad,
      c.earningsGrowth.good,
    );
  }

  // Profit margin — higher better.
  let profitMargin: number;
  if (f.profitMargin == null) {
    profitMargin = NEUTRAL_SCORE;
    missingCount++;
  } else {
    profitMargin = linScore(
      f.profitMargin,
      c.profitMargin.bad,
      c.profitMargin.good,
    );
  }

  const score = clamp01(
    pe * FUNDAMENTAL_WEIGHTS.pe +
      roe * FUNDAMENTAL_WEIGHTS.roe +
      debtToEquity * FUNDAMENTAL_WEIGHTS.debtToEquity +
      earningsGrowth * FUNDAMENTAL_WEIGHTS.earningsGrowth +
      profitMargin * FUNDAMENTAL_WEIGHTS.profitMargin,
  );

  return { pe, roe, debtToEquity, earningsGrowth, profitMargin, score, missingCount };
}

// ---------------------------------------------------------------------------
//  Trade levels (entry band / target / stop-loss / horizon)
// ---------------------------------------------------------------------------

/**
 * Derive entry band, target and stop from ATR + medium-term support/
 * resistance. All levels are sanity-clamped so that:
 *   stopLoss < entryLow <= currentPrice <= entryHigh < target, all > 0.
 */
export function computeTradeLevels(
  candles: Candle[],
  category: CapCategory,
): TradeLevels {
  const price = candles[candles.length - 1].close;

  // ATR with a sensible fallback (2% of price) if history is too short.
  const atrVal = atr(candles, TRADE_PARAMS.atrPeriod) ?? price * 0.02;

  const { support, resistance } = supportResistance(
    candles,
    TRADE_PARAMS.supportResistanceWindowDays,
  );

  // Entry band around current price.
  let entryLow = price - TRADE_PARAMS.entryBandAtrMult * atrVal;
  let entryHigh = price + TRADE_PARAMS.entryBandAtrMult * atrVal;

  // Target: ATR-based projection, aimed at least as high as medium-term
  // resistance (we want room to run toward/through the prior high).
  const atrTarget = price + TRADE_PARAMS.targetAtrMult * atrVal;
  let target = resistance != null ? Math.max(atrTarget, resistance) : atrTarget;

  // Stop: ATR-based, extended DOWN to medium-term support if support sits
  // below the ATR stop (gives the thesis room; never tighter than ATR stop).
  const atrStop = price - TRADE_PARAMS.stopAtrMult * atrVal;
  let stopLoss = support != null ? Math.min(atrStop, support) : atrStop;

  // --- Sanity clamps ---
  stopLoss = Math.max(0.01, Math.min(stopLoss, price * 0.99));
  entryLow = Math.max(stopLoss + 0.01, Math.min(entryLow, price));
  entryHigh = Math.max(price, entryHigh);
  target = Math.max(target, entryHigh * 1.01);

  const suggestedHoldingDays =
    TRADE_PARAMS.holdingDaysByCategory[category] ??
    TRADE_PARAMS.defaultHoldingDays;

  return {
    currentPrice: price,
    entryLow,
    entryHigh,
    target,
    stopLoss,
    suggestedHoldingDays,
    atr: atrVal,
  };
}

// ---------------------------------------------------------------------------
//  Composite
// ---------------------------------------------------------------------------

/**
 * Score a full stock into a ScoredStock (composite 0..100 + diagnostics).
 * `candlesOverride` lets the backtester pass a historical slice; when omitted
 * we use the stock's full candle series.
 */
export function scoreStock(
  data: StockData,
  candlesOverride?: Candle[],
): ScoredStock {
  const candles = candlesOverride ?? data.candles;
  const technical = scoreTechnical(candles);
  const fundamental = scoreFundamental(data.fundamentals);
  const levels = computeTradeLevels(candles, data.category);

  const composite01 =
    fundamental.score * COMPOSITE_WEIGHTS.fundamental +
    technical.score * COMPOSITE_WEIGHTS.technical;

  return {
    ticker: data.ticker,
    name: data.name,
    category: data.category,
    compositeScore: Math.round(composite01 * 1000) / 10, // one decimal, 0..100
    technical,
    fundamental,
    levels,
    fundamentalsMissing: data.fundamentalsMissing,
  };
}
