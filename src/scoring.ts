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
  HoldingHorizon,
  ScoredStock,
  StockData,
  TechnicalBreakdown,
  TradeLevels,
} from "./types";
import {
  atr,
  closesOf,
  macd,
  momentum,
  nearHigh,
  rsi,
  sma,
  supportResistance,
  volumeRatio,
} from "./indicators";
import {
  FUNDAMENTAL_CURVES,
  FUNDAMENTAL_WEIGHTS,
  HORIZON_PROFILES,
  NEUTRAL_SCORE,
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
 * neutral score for that component rather than throwing.
 */
export function scoreTechnical(
  candles: Candle[],
  horizon: HoldingHorizon = "positional"
): TechnicalBreakdown {
  const profile = HORIZON_PROFILES[horizon] ?? HORIZON_PROFILES.positional;
  const p = profile.technicalParams;
  const w = profile.technicalWeights;

  const closes = closesOf(candles);
  const price = closes[closes.length - 1];

  const smaShort = sma(closes, p.smaShortPeriod);
  const smaLong = sma(closes, p.smaLongPeriod);

  // --- Trend component (price vs Short/Long SMA + cross) ---
  const vsShort = smaShort != null ? softStep(price / smaShort - 1) : NEUTRAL_SCORE;
  const vsLong = smaLong != null ? softStep(price / smaLong - 1) : NEUTRAL_SCORE;
  const goldenCross =
    smaShort != null && smaLong != null
      ? softStep(smaShort / smaLong - 1)
      : NEUTRAL_SCORE;

  const trend = vsShort * 0.3 + vsLong * 0.35 + goldenCross * 0.35;

  // --- Momentum component ---
  const mom = momentum(closes, p.momentumLookbackDays);
  const momentumScore = mom != null ? linScore(mom, -0.1, 0.3) : NEUTRAL_SCORE;

  // --- MACD bonus (crossover / positive histogram) ---
  const macdRes = macd(closes);
  let macdBonus = NEUTRAL_SCORE;
  if (macdRes != null) {
    if (macdRes.macdLine > macdRes.signalLine) {
      macdBonus = macdRes.histogram > 0 ? 0.8 : 0.65;
    } else {
      macdBonus = macdRes.histogram < 0 ? 0.2 : 0.35;
    }
  }

  // --- 52-Week / multi-month high proximity ---
  const highRatio = nearHigh(candles, Math.min(candles.length, 252));
  const nearHighBonus = highRatio != null ? linScore(highRatio, 0.75, 0.98) : NEUTRAL_SCORE;

  // --- Volume Gate / confirmation ---
  let volumeGate = 1;
  if (p.volumeConfirmation) {
    const vr = volumeRatio(candles, 5, 20);
    if (vr != null) {
      if (vr >= 1.3) volumeGate = 1.05; // 5% boost for strong volume
      else if (vr < 0.7) volumeGate = 0.92; // 8% penalty for thin dry volume
    }
  }

  // --- RSI gate (penalize chasing extremes only) ---
  const rsiVal = rsi(closes, p.rsiPeriod);
  let rsiGate = 1;
  if (rsiVal != null) {
    if (rsiVal >= p.rsiOverbought || rsiVal <= p.rsiOversold) {
      rsiGate = 1 - p.rsiPenalty;
    }
  }

  const rawScore =
    trend * w.trend +
    momentumScore * w.momentum +
    macdBonus * w.macd +
    nearHighBonus * w.nearHigh;

  const score = clamp01(rawScore * rsiGate * volumeGate);

  return {
    trend,
    momentum: momentumScore,
    rsiGate,
    macdBonus,
    volumeGate,
    nearHighBonus,
    score,
  };
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
 * Derive entry band, target and stop from ATR + support/resistance.
 * All levels are sanity-clamped so that:
 *   stopLoss < entryLow <= currentPrice <= entryHigh < target, all > 0.
 */
export function computeTradeLevels(
  candles: Candle[],
  category: CapCategory,
  horizon: HoldingHorizon = "positional"
): TradeLevels {
  const profile = HORIZON_PROFILES[horizon] ?? HORIZON_PROFILES.positional;
  const tp = profile.tradeParams;
  const price = candles[candles.length - 1].close;

  // ATR with fallback (2% of price) if history is short
  const atrVal = atr(candles, tp.atrPeriod) ?? price * 0.02;

  const { support, resistance } = supportResistance(
    candles,
    tp.supportResistanceWindowDays,
  );

  // Entry band around current price
  let entryLow = price - tp.entryBandAtrMult * atrVal;
  let entryHigh = price + tp.entryBandAtrMult * atrVal;

  // Target: ATR-based projection, aimed at least as high as resistance
  const atrTarget = price + tp.targetAtrMult * atrVal;
  let target = resistance != null ? Math.max(atrTarget, resistance) : atrTarget;

  // Stop: ATR-based, extended down to support if support sits below ATR stop
  const atrStop = price - tp.stopAtrMult * atrVal;
  let stopLoss = support != null ? Math.min(atrStop, support) : atrStop;

  // --- Sanity clamps ---
  stopLoss = Math.max(0.01, Math.min(stopLoss, price * 0.99));
  entryLow = Math.max(stopLoss + 0.01, Math.min(entryLow, price));
  entryHigh = Math.max(price, entryHigh);
  target = Math.max(target, entryHigh * 1.01);

  const suggestedHoldingDays =
    tp.holdingDaysByCategory[category] ?? tp.defaultHoldingDays;

  const risk = Math.max(0.01, price - stopLoss);
  const reward = Math.max(0.01, target - price);
  const riskRewardRatio = Math.round((reward / risk) * 100) / 100;

  return {
    currentPrice: price,
    entryLow,
    entryHigh,
    target,
    stopLoss,
    suggestedHoldingDays,
    horizon,
    riskRewardRatio,
    atr: atrVal,
  };
}

// ---------------------------------------------------------------------------
//  Composite
// ---------------------------------------------------------------------------

/**
 * Score a full stock into a ScoredStock (composite 0..100 + diagnostics).
 * `candlesOverride` lets the backtester pass a historical slice.
 */
export function scoreStock(
  data: StockData,
  horizon: HoldingHorizon = "positional",
  candlesOverride?: Candle[],
): ScoredStock {
  const profile = HORIZON_PROFILES[horizon] ?? HORIZON_PROFILES.positional;
  const candles = candlesOverride ?? data.candles;
  const technical = scoreTechnical(candles, horizon);
  const fundamental = scoreFundamental(data.fundamentals);
  const levels = computeTradeLevels(candles, data.category, horizon);

  const composite01 =
    fundamental.score * profile.compositeWeights.fundamental +
    technical.score * profile.compositeWeights.technical;

  return {
    ticker: data.ticker,
    name: data.name,
    category: data.category,
    horizon,
    compositeScore: Math.round(composite01 * 1000) / 10, // one decimal, 0..100
    technical,
    fundamental,
    levels,
    fundamentalsMissing: data.fundamentalsMissing,
  };
}

