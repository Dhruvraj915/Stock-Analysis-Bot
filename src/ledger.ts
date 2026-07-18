/**
 * ============================================================================
 *  PERSISTENT PICK LEDGER
 * ============================================================================
 *  Storage choice: a single JSON file (data/ledger.json).
 *
 *  WHY JSON (and not SQLite / better-sqlite3):
 *   - Volume is tiny: ~15 picks/day => a few thousand rows/year. No indexes
 *     or query planner needed.
 *   - Truly zero-infra & zero native deps. better-sqlite3 needs node-gyp /
 *     prebuilt binaries that frequently break in CI; a JSON file never does.
 *   - Git-friendly: GitHub Actions can commit the updated ledger back to the
 *     repo after each run, which is our free, stateless-runner persistence
 *     mechanism. A binary .sqlite file would produce noisy, unmergeable diffs.
 *   - Tradeoff we accept: no concurrent writers and no ad-hoc SQL. Irrelevant
 *     here — a single serial daily job is the only writer. If this ever grew
 *     to many writers or millions of rows, SQLite/Postgres would be the move.
 * ============================================================================
 */

import * as fs from "fs";
import * as path from "path";
import {
  CapCategory,
  LedgerEntry,
  PickStatus,
  ScoredStock,
} from "./types";
import { LEDGER_PARAMS } from "./config";

const LEDGER_PATH = path.resolve(process.cwd(), LEDGER_PARAMS.filePath);

/** Statuses that mean a pick is still active (subject to future updates). */
const ACTIVE_STATUSES: PickStatus[] = ["OPEN", "STILL_OPEN"];

export function isActive(status: PickStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** ISO date (YYYY-MM-DD) for a Date, in UTC. */
export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Load the whole ledger. Returns [] if the file doesn't exist yet. */
export function loadLedger(): LedgerEntry[] {
  try {
    if (!fs.existsSync(LEDGER_PATH)) return [];
    const raw = fs.readFileSync(LEDGER_PATH, "utf8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LedgerEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`! Failed to read ledger (${(err as Error).message}); starting empty`);
    return [];
  }
}

/** Persist the whole ledger (pretty-printed for readable git diffs). */
export function saveLedger(entries: LedgerEntry[]): void {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

/** Set of tickers that currently have an active (OPEN/STILL_OPEN) entry. */
export function openTickers(entries: LedgerEntry[]): Set<string> {
  const s = new Set<string>();
  for (const e of entries) if (isActive(e.status)) s.add(e.ticker);
  return s;
}

/**
 * Append today's picks to the ledger.
 * Per the confirmed design, a pick is SKIPPED if that ticker already has an
 * active entry (avoids double-counting the same idea in performance stats).
 * Returns the entries actually added.
 */
export function logPicks(
  picks: ScoredStock[],
  date: string = isoDate(),
): LedgerEntry[] {
  const ledger = loadLedger();
  const alreadyOpen = openTickers(ledger);
  // Also guard against re-running the same day (idempotent-ish): skip an exact
  // same-day+ticker id that already exists.
  const existingIds = new Set(ledger.map((e) => e.id));

  const added: LedgerEntry[] = [];
  for (const p of picks) {
    const id = `${date}:${p.ticker}`;
    if (alreadyOpen.has(p.ticker) || existingIds.has(id)) continue;

    added.push({
      id,
      date,
      ticker: p.ticker,
      name: p.name,
      category: p.category,
      compositeScore: p.compositeScore,
      technicalScore: Math.round(p.technical.score * 1000) / 10,
      fundamentalScore: Math.round(p.fundamental.score * 1000) / 10,
      entryLow: round2(p.levels.entryLow),
      entryHigh: round2(p.levels.entryHigh),
      entryReference: round2(p.levels.currentPrice),
      target: round2(p.levels.target),
      stopLoss: round2(p.levels.stopLoss),
      suggestedHoldingDays: p.levels.suggestedHoldingDays,
      status: "OPEN",
    });
  }

  if (added.length > 0) {
    saveLedger([...ledger, ...added]);
  }
  return added;
}

/**
 * Result of a status-check pass, for reporting in the daily message.
 */
export interface StatusCheckResult {
  checked: number;
  transitions: Array<{
    ticker: string;
    from: PickStatus;
    to: PickStatus;
    price: number;
    returnPct: number;
  }>;
}

/**
 * Update all active picks against `currentPrices` and the calendar.
 * Resolution priority on each check:
 *   1. Price >= target        => HIT_TARGET
 *   2. Price <= stop-loss      => HIT_STOPLOSS
 *   3. Past suggested horizon  => EXPIRED_OPEN (closed at current price)
 *   4. Otherwise               => STILL_OPEN (marked-to-market, stays active)
 *
 * `asOf` is injectable for testing/backtests; defaults to now.
 */
export function updateStatuses(
  currentPrices: Map<string, number>,
  asOf: Date = new Date(),
): StatusCheckResult {
  const ledger = loadLedger();
  const result: StatusCheckResult = { checked: 0, transitions: [] };
  const today = isoDate(asOf);

  for (const e of ledger) {
    if (!isActive(e.status)) continue;
    const price = currentPrices.get(e.ticker);
    if (price == null) continue; // couldn't fetch; leave untouched
    result.checked++;

    const from = e.status;
    const ageDays = daysBetween(e.date, today);
    const returnPct = ((price - e.entryReference) / e.entryReference) * 100;

    let to: PickStatus;
    if (price >= e.target) {
      to = "HIT_TARGET";
    } else if (price <= e.stopLoss) {
      to = "HIT_STOPLOSS";
    } else if (ageDays >= e.suggestedHoldingDays) {
      to = "EXPIRED_OPEN";
    } else {
      to = "STILL_OPEN";
    }

    e.status = to;
    e.lastCheckedDate = today;
    e.lastCheckedPrice = round2(price);

    if (to === "HIT_TARGET" || to === "HIT_STOPLOSS" || to === "EXPIRED_OPEN") {
      // Terminal state — record resolution details.
      e.resolvedDate = today;
      e.resolvedPrice = round2(price);
      e.returnPct = round2(returnPct);
    } else {
      // STILL_OPEN — keep marking to market so weekly summary can show it.
      e.returnPct = round2(returnPct);
    }

    if (to !== from) {
      result.transitions.push({ ticker: e.ticker, from, to, price: round2(price), returnPct: round2(returnPct) });
    }
  }

  saveLedger(ledger);
  return result;
}

// ---------------------------------------------------------------------------
//  Small utilities
// ---------------------------------------------------------------------------

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Whole calendar days between two ISO dates (b - a). */
export function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + "T00:00:00Z").getTime();
  const b = new Date(bIso + "T00:00:00Z").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** Entries suggested within the last `days` days (by suggestion date). */
export function entriesWithinDays(
  entries: LedgerEntry[],
  days: number,
  asOf: Date = new Date(),
): LedgerEntry[] {
  const today = isoDate(asOf);
  return entries.filter((e) => daysBetween(e.date, today) <= days && daysBetween(e.date, today) >= 0);
}

/** Group entries by cap category. */
export function groupByCategory(
  entries: LedgerEntry[],
): Record<CapCategory, LedgerEntry[]> {
  const out: Record<CapCategory, LedgerEntry[]> = {
    largecap: [],
    midcap: [],
    smallcap: [],
  };
  for (const e of entries) out[e.category].push(e);
  return out;
}
