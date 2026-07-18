/**
 * Synthetic-data sanity tests for the scoring logic — NO network calls.
 * Run with: npm test   (ts-node src/scoring.test.ts)
 *
 * This is intentionally a tiny hand-rolled harness (no jest) to keep deps
 * minimal. It exits non-zero if any assertion fails, so CI/build scripts can
 * gate on it.
 */

import assert from "assert";
import { Candle, CapCategory, StockData } from "./types";
import { sma, rsi, atr, momentum, supportResistance } from "./indicators";
import {
  clamp01,
  linScore,
  linScoreInverted,
  scoreTechnical,
  scoreFundamental,
  computeTradeLevels,
  scoreStock,
} from "./scoring";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n      ${(err as Error).message}`);
  }
}

// --- Synthetic candle builders --------------------------------------------

/** Build `n` candles trending linearly from `start` to `end`, ±1 intraday. */
function makeTrend(start: number, end: number, n: number): Candle[] {
  const candles: Candle[] = [];
  let prevClose = start;
  const base = new Date("2023-01-01T00:00:00Z").getTime();
  for (let i = 0; i < n; i++) {
    const close = start + ((end - start) * i) / (n - 1);
    candles.push({
      date: new Date(base + i * 24 * 3600 * 1000),
      open: prevClose,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000,
    });
    prevClose = close;
  }
  return candles;
}

function makeStock(candles: Candle[], category: CapCategory = "largecap"): StockData {
  return {
    ticker: "TEST.NS",
    name: "Test Co",
    category,
    candles,
    fundamentals: {},
    fundamentalsMissing: true,
  };
}

// ===========================================================================
//  Indicator math
// ===========================================================================
console.log("\nIndicators:");

check("sma of last 3 of [1..5] = 4", () => {
  assert.strictEqual(sma([1, 2, 3, 4, 5], 3), 4);
});

check("sma returns null when not enough data", () => {
  assert.strictEqual(sma([1, 2], 5), null);
});

check("rsi of monotonic uptrend is ~100", () => {
  const closes = makeTrend(100, 200, 60).map((c) => c.close);
  const r = rsi(closes, 14);
  assert.ok(r != null && r > 95, `expected >95, got ${r}`);
});

check("rsi of monotonic downtrend is ~0", () => {
  const closes = makeTrend(200, 100, 60).map((c) => c.close);
  const r = rsi(closes, 14);
  assert.ok(r != null && r < 5, `expected <5, got ${r}`);
});

check("atr is positive for ranging data", () => {
  const a = atr(makeTrend(100, 120, 60), 14);
  assert.ok(a != null && a > 0, `expected >0, got ${a}`);
});

check("momentum over 20 bars on uptrend is positive", () => {
  const closes = makeTrend(100, 200, 60).map((c) => c.close);
  const m = momentum(closes, 20);
  assert.ok(m != null && m > 0, `expected >0, got ${m}`);
});

check("supportResistance brackets the data", () => {
  const { support, resistance } = supportResistance(makeTrend(100, 200, 60), 120);
  assert.ok(support != null && support <= 100, `support ${support}`);
  assert.ok(resistance != null && resistance >= 200, `resistance ${resistance}`);
});

// ===========================================================================
//  Score helpers
// ===========================================================================
console.log("\nScore helpers:");

check("clamp01 clamps", () => {
  assert.strictEqual(clamp01(-1), 0);
  assert.strictEqual(clamp01(2), 1);
  assert.strictEqual(clamp01(0.5), 0.5);
});

check("linScore higher-is-better", () => {
  assert.strictEqual(linScore(0, 0, 10), 0);
  assert.strictEqual(linScore(10, 0, 10), 1);
  assert.strictEqual(linScore(5, 0, 10), 0.5);
});

check("linScoreInverted lower-is-better", () => {
  assert.strictEqual(linScoreInverted(0, 0, 10), 1);
  assert.strictEqual(linScoreInverted(10, 0, 10), 0);
  assert.strictEqual(linScoreInverted(5, 0, 10), 0.5);
});

// ===========================================================================
//  Technical score
// ===========================================================================
console.log("\nTechnical score:");

check("strong uptrend scores high technically", () => {
  const t = scoreTechnical(makeTrend(100, 200, 260));
  assert.ok(t.score > 0.6, `expected >0.6, got ${t.score.toFixed(3)}`);
  assert.ok(t.trend > 0.8, `trend expected >0.8, got ${t.trend.toFixed(3)}`);
});

check("strong downtrend scores low technically", () => {
  const t = scoreTechnical(makeTrend(200, 100, 260));
  assert.ok(t.score < 0.4, `expected <0.4, got ${t.score.toFixed(3)}`);
});

check("overbought uptrend triggers rsi gate (<1)", () => {
  const t = scoreTechnical(makeTrend(100, 200, 260));
  assert.ok(t.rsiGate < 1, `expected gate <1, got ${t.rsiGate}`);
});

// ===========================================================================
//  Fundamental score
// ===========================================================================
console.log("\nFundamental score:");

check("great fundamentals score high", () => {
  const f = scoreFundamental({
    peRatio: 12,
    roe: 0.25,
    debtToEquity: 0.2,
    earningsGrowth: 0.3,
    profitMargin: 0.25,
  });
  assert.ok(f.score > 0.85, `expected >0.85, got ${f.score.toFixed(3)}`);
  assert.strictEqual(f.missingCount, 0);
});

check("poor fundamentals score low", () => {
  const f = scoreFundamental({
    peRatio: 60,
    roe: 0.02,
    debtToEquity: 2.0,
    earningsGrowth: -0.1,
    profitMargin: 0.01,
  });
  assert.ok(f.score < 0.2, `expected <0.2, got ${f.score.toFixed(3)}`);
});

check("missing fundamentals degrade to ~neutral (0.5)", () => {
  const f = scoreFundamental({});
  assert.strictEqual(f.missingCount, 5);
  assert.ok(Math.abs(f.score - 0.5) < 1e-9, `expected 0.5, got ${f.score}`);
});

check("negative P/E is penalized, not neutral", () => {
  const f = scoreFundamental({ peRatio: -10 });
  assert.ok(f.pe < 0.5, `expected <0.5, got ${f.pe}`);
});

// ===========================================================================
//  Trade levels
// ===========================================================================
console.log("\nTrade levels:");

check("levels satisfy stop < entryLow <= price <= entryHigh < target, all > 0", () => {
  const lv = computeTradeLevels(makeTrend(100, 150, 260), "midcap");
  assert.ok(lv.stopLoss > 0, "stop > 0");
  assert.ok(lv.stopLoss < lv.entryLow, "stop < entryLow");
  assert.ok(lv.entryLow <= lv.currentPrice + 1e-9, "entryLow <= price");
  assert.ok(lv.currentPrice <= lv.entryHigh + 1e-9, "price <= entryHigh");
  assert.ok(lv.entryHigh < lv.target, "entryHigh < target");
});

check("holding period comes from category config (midcap=120)", () => {
  const lv = computeTradeLevels(makeTrend(100, 150, 260), "midcap");
  assert.strictEqual(lv.suggestedHoldingDays, 120);
});

// ===========================================================================
//  Composite
// ===========================================================================
console.log("\nComposite:");

check("scoreStock returns 0..100 composite with diagnostics", () => {
  const s = scoreStock(makeStock(makeTrend(100, 200, 260)));
  assert.ok(s.compositeScore >= 0 && s.compositeScore <= 100, `composite ${s.compositeScore}`);
  assert.ok(s.technical.score >= 0 && s.technical.score <= 1);
  assert.ok(s.fundamental.score >= 0 && s.fundamental.score <= 1);
  assert.ok(s.levels.target > s.levels.stopLoss);
});

check("uptrend beats downtrend on composite (same neutral fundamentals)", () => {
  const up = scoreStock(makeStock(makeTrend(100, 200, 260)));
  const down = scoreStock(makeStock(makeTrend(200, 100, 260)));
  assert.ok(
    up.compositeScore > down.compositeScore,
    `up ${up.compositeScore} !> down ${down.compositeScore}`,
  );
});

// ===========================================================================
//  Summary
// ===========================================================================
console.log(`\n${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
