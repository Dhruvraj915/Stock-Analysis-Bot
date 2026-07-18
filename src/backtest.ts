/**
 * ============================================================================
 *  BACKTESTING MODULE  (npm run backtest)
 * ============================================================================
 *  Sanity-check the scoring logic against ~2 years of history BEFORE trusting
 *  live picks.
 *
 *  Method (no lookahead on PRICE data):
 *    - Fetch ~2y daily history + fundamentals for the whole universe once.
 *    - Step through history weekly (every N trading days).
 *    - On each sampled entry day D: score every stock using ONLY candles up to
 *      and including D, rank per cap, and "buy" the top picks at D's close.
 *    - Walk forward day-by-day. The first of {target hit, stop hit, horizon
 *      reached} resolves the trade:
 *         high >= target -> HIT_TARGET
 *         low  <= stop    -> HIT_STOPLOSS   (if both in one day, stop wins:
 *                                            the conservative assumption)
 *         days >= horizon -> EXPIRED_OPEN   (closed at that day's close)
 *    - Aggregate win rate / avg return / avg days-to-resolution per cap.
 *
 *  KNOWN LIMITATION (stated honestly): Yahoo only exposes CURRENT fundamentals,
 *  so the fundamental sub-score uses today's snapshot for every historical
 *  entry. Price/technical signals are strictly point-in-time; fundamentals are
 *  an approximation. Treat backtest fundamentals as indicative, not exact.
 * ============================================================================
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { Candle, CapCategory, StockData } from "./types";
import { UNIVERSE, BACKTEST_PARAMS, RANKING_PARAMS } from "./config";
import { fetchUniverse } from "./dataFetcher";
import { scoreStock, computeTradeLevels } from "./scoring";

type BTStatus = "HIT_TARGET" | "HIT_STOPLOSS" | "EXPIRED_OPEN" | "UNRESOLVED";

interface BacktestTrade {
  entryDate: string;
  ticker: string;
  category: CapCategory;
  entryPrice: number;
  target: number;
  stopLoss: number;
  horizonDays: number;
  exitDate: string;
  exitPrice: number;
  status: BTStatus;
  returnPct: number;
  daysToResolution: number;
}

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function calDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Simulate a single hypothetical trade forward from `entryIndex`.
 * Returns null if there isn't enough forward data to even start.
 */
function simulateTrade(
  candles: Candle[],
  entryIndex: number,
  category: CapCategory,
): { entryPrice: number; target: number; stopLoss: number; horizonDays: number; result: Omit<BacktestTrade, "ticker" | "category" | "entryDate" | "target" | "stopLoss" | "horizonDays" | "entryPrice"> } | null {
  const slice = candles.slice(0, entryIndex + 1);
  const levels = computeTradeLevels(slice, category);
  const entryPrice = levels.currentPrice;
  const entryDate = candles[entryIndex].date;
  const horizonDays = levels.suggestedHoldingDays;

  let status: BTStatus = "UNRESOLVED";
  let exitIndex = entryIndex;
  let exitPrice = entryPrice;

  for (let j = entryIndex + 1; j < candles.length; j++) {
    const c = candles[j];
    const ageDays = calDays(entryDate, c.date);

    // Stop checked before target on the same day (conservative).
    if (c.low <= levels.stopLoss) {
      status = "HIT_STOPLOSS";
      exitIndex = j;
      exitPrice = levels.stopLoss;
      break;
    }
    if (c.high >= levels.target) {
      status = "HIT_TARGET";
      exitIndex = j;
      exitPrice = levels.target;
      break;
    }
    if (ageDays >= horizonDays) {
      status = "EXPIRED_OPEN";
      exitIndex = j;
      exitPrice = c.close;
      break;
    }
  }

  if (status === "UNRESOLVED") {
    // Ran out of history before resolving — don't count this trade.
    return null;
  }

  const exitDate = candles[exitIndex].date;
  const returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
  const daysToResolution = calDays(entryDate, exitDate);

  return {
    entryPrice,
    target: levels.target,
    stopLoss: levels.stopLoss,
    horizonDays,
    result: {
      exitDate: isoOf(exitDate),
      exitPrice: Math.round(exitPrice * 100) / 100,
      status,
      returnPct: Math.round(returnPct * 100) / 100,
      daysToResolution,
    },
  };
}

/** Run the backtest for one cap category and return all resolved trades. */
function backtestCategory(
  stocks: StockData[],
  category: CapCategory,
): BacktestTrade[] {
  const trades: BacktestTrade[] = [];
  const eligible = stocks.filter(
    (s) => s.candles.length >= RANKING_PARAMS.minCandlesRequired,
  );
  if (eligible.length === 0) return trades;

  // Use the longest series to define the sampling calendar (all NSE stocks
  // share roughly the same trading days).
  const maxLen = Math.max(...eligible.map((s) => s.candles.length));

  for (
    let d = RANKING_PARAMS.minCandlesRequired;
    d < maxLen - BACKTEST_PARAMS.minForwardDaysToOpen;
    d += BACKTEST_PARAMS.sampleEveryNTradingDays
  ) {
    // Score every eligible stock as of day d (point-in-time on price).
    const ranked = eligible
      .filter((s) => s.candles.length > d)
      .map((s) => {
        const slice = s.candles.slice(0, d + 1);
        const scored = scoreStock(s, slice);
        return { stock: s, score: scored.compositeScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, BACKTEST_PARAMS.topPicksPerCategory);

    for (const { stock } of ranked) {
      // Find the index in THIS stock's series matching day d's date.
      const idx = Math.min(d, stock.candles.length - 1);
      const sim = simulateTrade(stock.candles, idx, category);
      if (!sim) continue;
      trades.push({
        entryDate: isoOf(stock.candles[idx].date),
        ticker: stock.ticker,
        category,
        entryPrice: Math.round(sim.entryPrice * 100) / 100,
        target: Math.round(sim.target * 100) / 100,
        stopLoss: Math.round(sim.stopLoss * 100) / 100,
        horizonDays: sim.horizonDays,
        ...sim.result,
      });
    }
  }
  return trades;
}

interface Aggregate {
  n: number;
  hitTarget: number;
  hitStop: number;
  expired: number;
  winRatePct: number | null;
  avgReturnPct: number | null;
  avgDaysToResolution: number | null;
}

function aggregate(trades: BacktestTrade[]): Aggregate {
  if (trades.length === 0)
    return {
      n: 0,
      hitTarget: 0,
      hitStop: 0,
      expired: 0,
      winRatePct: null,
      avgReturnPct: null,
      avgDaysToResolution: null,
    };
  const hitTarget = trades.filter((t) => t.status === "HIT_TARGET").length;
  const hitStop = trades.filter((t) => t.status === "HIT_STOPLOSS").length;
  const expired = trades.filter((t) => t.status === "EXPIRED_OPEN").length;
  const wins = trades.filter((t) => t.returnPct > 0).length;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    n: trades.length,
    hitTarget,
    hitStop,
    expired,
    winRatePct: (wins / trades.length) * 100,
    avgReturnPct: avg(trades.map((t) => t.returnPct)),
    avgDaysToResolution: avg(trades.map((t) => t.daysToResolution)),
  };
}

function printReport(label: string, a: Aggregate): void {
  if (a.n === 0) {
    console.log(`  ${label.padEnd(10)} | no resolved trades`);
    return;
  }
  const wr = a.winRatePct != null ? `${a.winRatePct.toFixed(1)}%` : "n/a";
  const ar = a.avgReturnPct != null ? `${a.avgReturnPct >= 0 ? "+" : ""}${a.avgReturnPct.toFixed(2)}%` : "n/a";
  const dd = a.avgDaysToResolution != null ? `${a.avgDaysToResolution.toFixed(0)}d` : "n/a";
  console.log(
    `  ${label.padEnd(10)} | trades ${String(a.n).padStart(4)} | ` +
      `🎯 ${String(a.hitTarget).padStart(3)}  🛑 ${String(a.hitStop).padStart(3)}  ⌛ ${String(a.expired).padStart(3)} | ` +
      `win ${wr.padStart(6)} | avgRet ${ar.padStart(8)} | avgDays ${dd.padStart(5)}`,
  );
}

function writeCsv(trades: BacktestTrade[]): void {
  const header = [
    "entryDate",
    "ticker",
    "category",
    "entryPrice",
    "target",
    "stopLoss",
    "horizonDays",
    "exitDate",
    "exitPrice",
    "status",
    "returnPct",
    "daysToResolution",
  ].join(",");
  const rows = trades.map((t) =>
    [
      t.entryDate,
      t.ticker,
      t.category,
      t.entryPrice,
      t.target,
      t.stopLoss,
      t.horizonDays,
      t.exitDate,
      t.exitPrice,
      t.status,
      t.returnPct,
      t.daysToResolution,
    ].join(","),
  );
  const outPath = path.resolve(process.cwd(), BACKTEST_PARAMS.csvOutputPath);
  fs.writeFileSync(outPath, [header, ...rows].join("\n") + "\n", "utf8");
  console.log(`\nCSV written: ${outPath} (${trades.length} trades)`);
}

async function main(): Promise<void> {
  console.log("\n=== Backtest: replaying scoring over ~2y of history ===\n");
  console.log("Fetching universe history (this takes ~1 min)...\n");

  const byCategory: Record<CapCategory, StockData[]> = {
    largecap: await fetchUniverse(UNIVERSE.largecap, "largecap"),
    midcap: await fetchUniverse(UNIVERSE.midcap, "midcap"),
    smallcap: await fetchUniverse(UNIVERSE.smallcap, "smallcap"),
  };

  const cats: CapCategory[] = ["largecap", "midcap", "smallcap"];
  const all: BacktestTrade[] = [];
  const perCat: Record<CapCategory, BacktestTrade[]> = {
    largecap: [],
    midcap: [],
    smallcap: [],
  };

  for (const cat of cats) {
    console.log(`\nBacktesting ${cat}...`);
    const trades = backtestCategory(byCategory[cat], cat);
    perCat[cat] = trades;
    all.push(...trades);
    console.log(`  ${trades.length} resolved trades.`);
  }

  console.log("\n============================ BACKTEST REPORT ============================");
  console.log(
    "  (win rate = % of trades with positive return; sampling weekly; " +
      "fundamentals use current snapshot — see module header)\n",
  );
  printReport("OVERALL", aggregate(all));
  console.log("  " + "-".repeat(96));
  for (const cat of cats) printReport(cat, aggregate(perCat[cat]));
  console.log("========================================================================\n");

  writeCsv(all);
}

main().catch((err) => {
  console.error("FATAL: backtest failed:", err);
  process.exitCode = 1;
});
