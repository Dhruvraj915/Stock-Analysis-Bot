/// <reference path="./yahoo-finance2.d.ts" />
/**
 * Data fetching via `yahoo-finance2` (free, no API key).
 *
 * Responsibilities:
 *   - Pull ~2 years of daily OHLCV history per ticker.
 *   - Pull available fundamentals (P/E, ROE, D/E, earnings growth, margin).
 *   - Degrade gracefully: missing/partial fundamentals are common for smaller
 *     NSE names, so we NEVER throw on missing fields — we return whatever we
 *     have and flag `fundamentalsMissing`.
 *   - Be polite: a configurable delay between requests + light retry.
 */

import {
  Candle,
  CapCategory,
  Fundamentals,
  StockData,
  UniverseEntry,
} from "./types";
import { DATA_PARAMS } from "./config";

/**
 * yahoo-finance2 v4 is published as an ESM-only package (its `exports` map
 * exposes only an `import` condition), and its default export is a CLASS
 * that must be instantiated with `new` (calling methods on the class itself
 * throws "X is not a function"). We keep the rest of this project as
 * CommonJS for simplicity, so we load + instantiate it through a cached
 * DYNAMIC import() — which resolves in ESM context and works at runtime on
 * Node 20+. Typed loosely (`any`) on purpose: Yahoo's response shapes drift
 * across versions and we defensively null-check every field we read anyway.
 */
let yahooPromise: Promise<any> | null = null;
async function getYahoo(): Promise<any> {
  if (!yahooPromise) {
    yahooPromise = import("yahoo-finance2").then((mod) => {
      const YahooFinance = (mod as any).default ?? mod;
      const yf = new YahooFinance();
      // Silence noisy "notices" (survey / schema-change banners) if supported.
      try {
        yf.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
      } catch {
        /* helper absent on some versions — safe to ignore */
      }
      return yf;
    });
  }
  return yahooPromise;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convert a fraction that Yahoo sometimes reports as a percent to a fraction. */
function normalizeDebtToEquity(
  raw: number | undefined | null,
): number | undefined {
  if (raw === undefined || raw === null || Number.isNaN(raw)) return undefined;
  // Yahoo reports D/E as a percentage for many tickers (e.g. 45 => 0.45x),
  // but occasionally as a plain multiple. Heuristic: values > 5 are treated
  // as percentages. (A genuine 5x+ D/E is rare and will still score as "bad".)
  return raw > 5 ? raw / 100 : raw;
}

/**
 * Fetch daily OHLCV candles for a ticker over the configured history window.
 * Uses the `chart` endpoint (the modern replacement for `historical`).
 */
export async function fetchCandles(ticker: string): Promise<Candle[]> {
  const period2 = new Date();
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - DATA_PARAMS.historyYears);

  const yf = await getYahoo();
  const result = await yf.chart(ticker, {
    period1,
    period2,
    interval: "1d",
  });

  const quotes = result?.quotes ?? [];
  const candles: Candle[] = [];
  for (const q of quotes) {
    // Skip rows with any missing OHLC field (Yahoo occasionally returns nulls).
    if (
      q.date == null ||
      q.open == null ||
      q.high == null ||
      q.low == null ||
      q.close == null
    ) {
      continue;
    }
    candles.push({
      date: new Date(q.date),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume ?? 0,
    });
  }
  return candles;
}

/**
 * Fetch fundamentals. Returns a partial object plus a `missing` flag that is
 * true when we couldn't get ANY of the five metrics.
 */
export async function fetchFundamentals(
  ticker: string,
): Promise<{ fundamentals: Fundamentals; missing: boolean }> {
  try {
    const yf = await getYahoo();
    const summary = await yf.quoteSummary(ticker, {
      modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
    });

    const fin = summary.financialData;
    const stats = summary.defaultKeyStatistics;
    const detail = summary.summaryDetail;

    const peRatio =
      (detail?.trailingPE as number | undefined) ??
      (stats?.forwardPE as number | undefined);
    const roe = fin?.returnOnEquity as number | undefined;
    const debtToEquity = normalizeDebtToEquity(
      fin?.debtToEquity as number | undefined,
    );
    const earningsGrowth =
      (fin?.earningsGrowth as number | undefined) ??
      (stats?.earningsQuarterlyGrowth as number | undefined);
    const profitMargin =
      (fin?.profitMargins as number | undefined) ??
      (stats?.profitMargins as number | undefined);

    const fundamentals: Fundamentals = {};
    if (peRatio != null && !Number.isNaN(peRatio))
      fundamentals.peRatio = peRatio;
    if (roe != null && !Number.isNaN(roe)) fundamentals.roe = roe;
    if (debtToEquity != null) fundamentals.debtToEquity = debtToEquity;
    if (earningsGrowth != null && !Number.isNaN(earningsGrowth))
      fundamentals.earningsGrowth = earningsGrowth;
    if (profitMargin != null && !Number.isNaN(profitMargin))
      fundamentals.profitMargin = profitMargin;

    const missing = Object.keys(fundamentals).length === 0;
    return { fundamentals, missing };
  } catch {
    // Any failure => degrade to fully-neutral fundamentals rather than crash.
    return { fundamentals: {}, missing: true };
  }
}

/**
 * Fetch everything for one ticker, with light retry on the candles call
 * (the part we actually need — a stock with no price history is skipped).
 */
export async function fetchStock(
  entry: UniverseEntry,
  category: CapCategory,
): Promise<StockData | null> {
  let candles: Candle[] | null = null;
  for (let attempt = 0; attempt <= DATA_PARAMS.maxRetries; attempt++) {
    try {
      candles = await fetchCandles(entry.ticker);
      break;
    } catch (err) {
      if (attempt === DATA_PARAMS.maxRetries) {
        console.warn(
          `  ! ${entry.ticker}: price history fetch failed (${(err as Error).message}) — skipping`,
        );
        return null;
      }
      await sleep(DATA_PARAMS.requestDelayMs);
    }
  }

  if (!candles || candles.length === 0) {
    console.warn(`  ! ${entry.ticker}: no price history — skipping`);
    return null;
  }

  const { fundamentals, missing } = await fetchFundamentals(entry.ticker);
  if (missing) {
    console.warn(`  ~ ${entry.ticker}: fundamentals missing — scoring neutral`);
  }

  return {
    ticker: entry.ticker,
    name: entry.name,
    category,
    candles,
    fundamentals,
    fundamentalsMissing: missing,
  };
}

/**
 * Fetch a whole list of tickers serially with a polite delay between each.
 * Serial (not parallel) on purpose — it's gentler on the free endpoint and
 * total runtime (~1 min for 90 tickers at 600ms) is fine for a daily job.
 */
export async function fetchUniverse(
  entries: UniverseEntry[],
  category: CapCategory,
): Promise<StockData[]> {
  const out: StockData[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    process.stdout.write(
      `  [${category}] ${i + 1}/${entries.length} ${entry.ticker} ... `,
    );
    const data = await fetchStock(entry, category);
    if (data) {
      out.push(data);
      console.log(`ok (${data.candles.length} candles)`);
    }
    // Polite delay between tickers (skip after the last one).
    if (i < entries.length - 1) await sleep(DATA_PARAMS.requestDelayMs);
  }
  return out;
}

/**
 * Fetch just the latest close for a set of tickers — used by the ledger
 * status-check routine, which only needs current prices, not full history.
 */
export async function fetchLatestPrices(
  tickers: string[],
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const yf = await getYahoo();
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    try {
      const q = await yf.quote(ticker);
      const price = (q?.regularMarketPrice as number | undefined) ?? undefined;
      if (price != null && !Number.isNaN(price)) prices.set(ticker, price);
    } catch {
      console.warn(`  ! ${ticker}: latest price fetch failed`);
    }
    if (i < tickers.length - 1) await sleep(DATA_PARAMS.requestDelayMs);
  }
  return prices;
}
