/**
 * ============================================================================
 *  WEEKLY PERFORMANCE SUMMARY  (npm run weekly-summary)
 * ============================================================================
 *  Reads the ledger, refreshes open picks against current prices (so the
 *  marked-to-market figures are fresh), then sends a Telegram message
 *  summarizing the LAST 30 DAYS of picks: target vs stop vs expired vs open,
 *  win rate, and average returns — broken down by cap category.
 *
 *  This is the "honest feedback loop" so you can trust/distrust the model with
 *  evidence instead of vibes. Intended to run Sunday evening via GitHub Actions.
 * ============================================================================
 */

import "dotenv/config";
import { CapCategory, LedgerEntry } from "./types";
import { fetchLatestPrices } from "./dataFetcher";
import {
  entriesWithinDays,
  groupByCategory,
  isActive,
  isoDate,
  loadLedger,
  openTickers,
  updateStatuses,
} from "./ledger";
import {
  buildWeeklyMessage,
  CategoryStats,
  sendMessage,
} from "./telegramNotifier";

const WINDOW_DAYS = 30;

/**
 * Compute performance stats for a set of ledger entries.
 * Win rate is defined as (closed picks with a positive return) / (closed
 * picks) — an honest measure that credits expired-but-profitable exits, not
 * just literal target hits.
 */
export function computeStats(entries: LedgerEntry[]): CategoryStats {
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
    // Closed / resolved.
    if (e.status === "HIT_TARGET") hitTarget++;
    else if (e.status === "HIT_STOPLOSS") hitStop++;
    else if (e.status === "EXPIRED_OPEN") expired++;

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
    winRatePct: closedReturns.length ? (wins / closedReturns.length) * 100 : null,
    avgReturnClosedPct: avg(closedReturns),
    avgReturnOpenPct: avg(openReturns),
  };
}

async function main(): Promise<void> {
  const today = isoDate();
  console.log(`\n=== Weekly Performance Summary — ${today} ===\n`);

  // Refresh open picks so marked-to-market returns are current.
  const active = [...openTickers(loadLedger())];
  if (active.length > 0) {
    console.log(`Refreshing ${active.length} open pick(s)...`);
    const prices = await fetchLatestPrices(active);
    const res = updateStatuses(prices);
    console.log(`  -> ${res.transitions.length} status change(s).`);
  }

  const ledger = loadLedger();
  const inWindow = entriesWithinDays(ledger, WINDOW_DAYS);
  console.log(`${inWindow.length} pick(s) suggested in the last ${WINDOW_DAYS} days.`);

  const overall = computeStats(inWindow);
  const grouped = groupByCategory(inWindow);
  const byCategory: Record<CapCategory, CategoryStats> = {
    largecap: computeStats(grouped.largecap),
    midcap: computeStats(grouped.midcap),
    smallcap: computeStats(grouped.smallcap),
  };

  const message = buildWeeklyMessage(WINDOW_DAYS, overall, byCategory, today);
  await sendMessage(message);
  console.log("\nWeekly summary complete. Telegram message sent (or printed in DRY_RUN).\n");
}

main().catch((err) => {
  console.error("FATAL: weekly summary failed:", err);
  process.exitCode = 1;
});
