/**
 * ============================================================================
 *  DAILY ENTRY POINT  (npm start / npm run daily)
 * ============================================================================
 *  One combined run, in this order (as confirmed in the plan):
 *    1. Status-check existing OPEN picks against fresh prices.
 *    2. Fetch the universe, score, and rank -> top 5 per cap (15 total).
 *    3. Log new picks to the ledger (skipping tickers already OPEN).
 *    4. Send ONE Telegram message: ledger updates + today's picks.
 *
 *  Intended to run Mon-Fri 17:00 IST via GitHub Actions (see workflows).
 * ============================================================================
 */

import "dotenv/config";
import { CapCategory, ScoredStock, StockData } from "./types";
import { UNIVERSE } from "./config";
import { fetchUniverse, fetchLatestPrices } from "./dataFetcher";
import { analyzeAll, flattenPicks } from "./analyzer";
import {
  isActive,
  isoDate,
  loadLedger,
  logPicks,
  openTickers,
  updateStatuses,
} from "./ledger";
import { buildDailyMessage, sendMessage } from "./telegramNotifier";

async function main(): Promise<void> {
  const today = isoDate();
  console.log(`\n=== NSE Positional Daily Run — ${today} ===\n`);

  // --- 1. Status-check existing OPEN picks -------------------------------
  const ledger = loadLedger();
  const active = [...openTickers(ledger)];
  let statusResult;
  if (active.length > 0) {
    console.log(
      `Checking ${active.length} open pick(s) for target/stop/expiry...`,
    );
    const prices = await fetchLatestPrices(active);
    statusResult = updateStatuses(prices);
    console.log(
      `  -> ${statusResult.checked} checked, ${statusResult.transitions.length} status change(s).`,
    );
  } else {
    console.log("No open picks to check.");
  }

  // --- 2. Fetch + score + rank the universe ------------------------------
  console.log("\nFetching universe (this takes ~1 min)...");
  const byCategory: Record<CapCategory, StockData[]> = {
    largecap: await fetchUniverse(UNIVERSE.largecap, "largecap"),
    midcap: await fetchUniverse(UNIVERSE.midcap, "midcap"),
    smallcap: await fetchUniverse(UNIVERSE.smallcap, "smallcap"),
  };

  const picksByCategory = analyzeAll(byCategory);
  const allPicks: ScoredStock[] = flattenPicks(picksByCategory);
  console.log(`\nSelected ${allPicks.length} picks across categories.`);

  // Snapshot which tickers were ALREADY open before today's picks are logged,
  // so the message can tell fresh ideas apart from existing holds.
  const preExistingOpenTickers = openTickers(loadLedger());

  // --- 3. Log new picks (skip tickers already OPEN) ----------------------
  const added = logPicks(allPicks, today);
  console.log(
    `Logged ${added.length} NEW pick(s) to ledger (skipped already-open).`,
  );

  // --- 4. Send the combined daily Telegram message -----------------------
  const activeLedgerByTicker = new Map(
    loadLedger()
      .filter((e) => isActive(e.status))
      .map((e) => [e.ticker, e]),
  );
  const message = buildDailyMessage(
    picksByCategory,
    today,
    statusResult,
    preExistingOpenTickers,
    activeLedgerByTicker,
  );
  await sendMessage(message);
  console.log(
    "\nDaily run complete. Telegram message sent (or printed in DRY_RUN).\n",
  );
}

main().catch((err) => {
  console.error("FATAL: daily run failed:", err);
  process.exitCode = 1;
});
