import { CapCategory, HoldingHorizon, ScoredStock, StockData } from "./types";
import { scoreStock } from "./scoring";
import { HORIZON_PROFILES, RANKING_PARAMS } from "./config";

/** Score + sort every stock in one category, best composite first. */
export function rankCategory(
  stocks: StockData[],
  horizon: HoldingHorizon = "positional"
): ScoredStock[] {
  const profile = HORIZON_PROFILES[horizon] ?? HORIZON_PROFILES.positional;
  const minRR = profile.tradeParams.minRiskReward;

  return stocks
    .filter((s) => s.candles.length >= RANKING_PARAMS.minCandlesRequired)
    .map((s) => scoreStock(s, horizon))
    .filter((s) => s.levels.riskRewardRatio >= minRR) // Filter out picks that don't satisfy min R:R
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

/** Top N picks for one category. */
export function topPicksForCategory(
  stocks: StockData[],
  topN: number = RANKING_PARAMS.topPicksPerCategory,
  horizon: HoldingHorizon = "positional"
): ScoredStock[] {
  return rankCategory(stocks, horizon).slice(0, topN);
}

/**
 * Analyze all three cap categories at once.
 * Input is keyed by category; output is the top-N picks per category.
 */
export function analyzeAll(
  byCategory: Record<CapCategory, StockData[]>,
  horizon: HoldingHorizon = "positional"
): Record<CapCategory, ScoredStock[]> {
  return {
    largecap: topPicksForCategory(byCategory.largecap, RANKING_PARAMS.topPicksPerCategory, horizon),
    midcap: topPicksForCategory(byCategory.midcap, RANKING_PARAMS.topPicksPerCategory, horizon),
    smallcap: topPicksForCategory(byCategory.smallcap, RANKING_PARAMS.topPicksPerCategory, horizon),
  };
}

/** Flatten the per-category picks into a single list (15 total by default). */
export function flattenPicks(
  picks: Record<CapCategory, ScoredStock[]>,
): ScoredStock[] {
  return [...picks.largecap, ...picks.midcap, ...picks.smallcap];
}

