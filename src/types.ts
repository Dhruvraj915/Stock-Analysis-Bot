/**
 * Shared type definitions used across the whole system.
 * Keeping these in one place makes the data flow (fetch -> score -> rank ->
 * notify -> ledger) explicit and type-safe.
 */

/** Market-cap bucket a ticker belongs to. */
export type CapCategory = "largecap" | "midcap" | "smallcap";

/** Holding-horizon mode: swing (10-15d), positional (2-3m), longterm (1-2y). */
export type HoldingHorizon = "swing" | "positional" | "longterm";

export const HOLDING_HORIZONS: HoldingHorizon[] = ["swing", "positional", "longterm"];

/** One entry in the curated stock universe (see config.ts). */
export interface UniverseEntry {
  ticker: string; // Yahoo Finance symbol, e.g. "RELIANCE.NS"
  name: string; // Short human-readable name for display
}

/** One daily OHLCV candle. */
export interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fundamental metrics for a ticker. Every field is optional because smaller
 * NSE stocks frequently have missing/partial data on Yahoo. Scoring degrades
 * such fields to a neutral score rather than crashing.
 */
export interface Fundamentals {
  peRatio?: number; // Trailing (or forward) price/earnings
  roe?: number; // Return on equity, as a fraction (0.18 = 18%)
  debtToEquity?: number; // Debt/equity ratio, normalized to a multiple (0.5 = 50%)
  earningsGrowth?: number; // YoY earnings growth, as a fraction (0.20 = 20%)
  profitMargin?: number; // Net profit margin, as a fraction (0.12 = 12%)
}

/** Everything fetched for a single ticker. */
export interface StockData {
  ticker: string;
  name: string;
  category: CapCategory;
  candles: Candle[]; // Chronological, oldest -> newest
  fundamentals: Fundamentals;
  /** True when fundamentals fetch failed/returned nothing (all neutral). */
  fundamentalsMissing: boolean;
}

/** Breakdown of the technical sub-score (each component in 0..1). */
export interface TechnicalBreakdown {
  trend: number; // Price vs 50/200 SMA + golden cross
  momentum: number; // Momentum (lookback based on horizon)
  rsiGate: number; // 1 = fine, <1 = penalized for overbought/oversold entry
  macdBonus?: number; // MACD crossover/histogram signal
  volumeGate?: number; // Volume breakout confirmation
  nearHighBonus?: number; // 52-week high proximity bonus
  score: number; // Weighted technical score, 0..1
}

/** Breakdown of the fundamental sub-score (each component in 0..1). */
export interface FundamentalBreakdown {
  pe: number;
  roe: number;
  debtToEquity: number;
  earningsGrowth: number;
  profitMargin: number;
  score: number; // Weighted fundamental score, 0..1
  missingCount: number; // How many of the 5 inputs were missing (neutralized)
}

/** Suggested trade levels derived from ATR + medium-term support/resistance. */
export interface TradeLevels {
  currentPrice: number;
  entryLow: number;
  entryHigh: number;
  target: number;
  stopLoss: number;
  suggestedHoldingDays: number;
  horizon: HoldingHorizon;
  riskRewardRatio: number;
  atr: number;
}

/** A fully scored + ranked pick with all diagnostics. */
export interface ScoredStock {
  ticker: string;
  name: string;
  category: CapCategory;
  horizon: HoldingHorizon;
  compositeScore: number; // 0..100 for display
  technical: TechnicalBreakdown;
  fundamental: FundamentalBreakdown;
  levels: TradeLevels;
  fundamentalsMissing: boolean;
}

/** Lifecycle status of a logged pick. */
export type PickStatus =
  | "OPEN"
  | "HIT_TARGET"
  | "HIT_STOPLOSS"
  | "STILL_OPEN"
  | "EXPIRED_OPEN";

/**
 * One row in the persistent ledger. Written when a pick is first suggested,
 * then updated in place by the status-check routine.
 */
export interface LedgerEntry {
  id: string; // `${date}:${ticker}` or `${date}:${ticker}:${horizon}`
  date: string; // ISO date (YYYY-MM-DD) the pick was suggested
  ticker: string;
  name: string;
  category: CapCategory;
  horizon?: HoldingHorizon; // Horizon mode (defaults to 'positional' if legacy)
  compositeScore: number;
  technicalScore: number;
  fundamentalScore: number;
  entryLow: number;
  entryHigh: number;
  entryReference: number; // Price at suggestion time (used for return calc)
  target: number;
  stopLoss: number;
  suggestedHoldingDays: number;
  riskRewardRatio?: number;
  status: PickStatus;
  // Filled in when the pick resolves:
  resolvedDate?: string; // ISO date the status changed away from OPEN/STILL_OPEN
  resolvedPrice?: number; // Price at resolution
  returnPct?: number; // Realized/marked return vs entryReference, in %
  lastCheckedDate?: string; // Last time the status-check routine touched it
  lastCheckedPrice?: number;
}

