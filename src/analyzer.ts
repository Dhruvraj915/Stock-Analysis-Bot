/**
 * Ranking layer: score every stock in a cap category and return the top N by
 * composite score, with full diagnostics attached.
 */

import { CapCategory, ScoredStock, StockData } from "./types";
import { scoreStock } from "./scoring";
import { RANKING_PARAMS } from "./config";

/** Score + sort every stock in one category, best composite first. */
export function rankCategory(stocks: StockData[]): ScoredStock[] {
  return stocks
    .filter((s) => s.candles.length >= RANKING_PARAMS.minCandlesRequired)
    .map((s) => scoreStock(s))
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

/** Top N picks for one category. */
export function topPicksForCategory(
  stocks: StockData[],
  topN: number = RANKING_PARAMS.topPicksPerCategory,
): ScoredStock[] {
  return rankCategory(stocks).slice(0, topN);
}

/**
 * Analyze all three cap categories at once.
 * Input is keyed by category; output is the top-N picks per category.
 */
export function analyzeAll(
  byCategory: Record<CapCategory, StockData[]>,
): Record<CapCategory, ScoredStock[]> {
  return {
    largecap: topPicksForCategory(byCategory.largecap),
    midcap: topPicksForCategory(byCategory.midcap),
    smallcap: topPicksForCategory(byCategory.smallcap),
  };
}

/** Flatten the per-category picks into a single list (15 total by default). */
export function flattenPicks(
  picks: Record<CapCategory, ScoredStock[]>,
): ScoredStock[] {
  return [...picks.largecap, ...picks.midcap, ...picks.smallcap];
}
