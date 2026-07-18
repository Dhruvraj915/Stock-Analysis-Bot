/**
 * ============================================================================
 *  CENTRAL CONFIGURATION
 * ============================================================================
 *  Everything you are likely to want to tune lives here:
 *    1. The stock universe (which NSE tickers get analyzed).
 *    2. Scoring weights (composite split, technical sub-weights, fundamental
 *       sub-weights and their scoring curves).
 *    3. Trade-level parameters (ATR multiples, support/resistance windows,
 *       suggested holding period).
 *    4. Ranking / ledger / backtest parameters.
 *
 *  This system targets MEDIUM-TERM POSITIONAL investing (2-3+ month holds),
 *  so the defaults deliberately weight FUNDAMENTALS and MEDIUM-TERM TREND
 *  more heavily than short-term momentum or intraday noise.
 * ============================================================================
 */

import { CapCategory, UniverseEntry } from "./types";

/**
 * ----------------------------------------------------------------------------
 *  1. STOCK UNIVERSE
 * ----------------------------------------------------------------------------
 *  Yahoo Finance uses the ".NS" suffix for NSE-listed stocks (e.g.
 *  "RELIANCE.NS"). Lists below are curated to roughly track
 *  Nifty 100 (large) / Nifty Midcap 150 (mid) / Nifty Smallcap 250 (small).
 *
 *  To edit: just add/remove ticker+name pairs. The `name` is only used for
 *  display in Telegram messages, so keep it short and human-readable.
 *
 *  NOTE: Index composition drifts over time. Review this list every few
 *  months (see README "Limitations").
 */
export const UNIVERSE: Record<CapCategory, UniverseEntry[]> = {
  largecap: [
    { ticker: "RELIANCE.NS", name: "Reliance Industries" },
    { ticker: "TCS.NS", name: "Tata Consultancy Svcs" },
    { ticker: "HDFCBANK.NS", name: "HDFC Bank" },
    { ticker: "ICICIBANK.NS", name: "ICICI Bank" },
    { ticker: "INFY.NS", name: "Infosys" },
    { ticker: "HINDUNILVR.NS", name: "Hindustan Unilever" },
    { ticker: "ITC.NS", name: "ITC" },
    { ticker: "SBIN.NS", name: "State Bank of India" },
    { ticker: "BHARTIARTL.NS", name: "Bharti Airtel" },
    { ticker: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
    { ticker: "LT.NS", name: "Larsen & Toubro" },
    { ticker: "AXISBANK.NS", name: "Axis Bank" },
    { ticker: "BAJFINANCE.NS", name: "Bajaj Finance" },
    { ticker: "ASIANPAINT.NS", name: "Asian Paints" },
    { ticker: "MARUTI.NS", name: "Maruti Suzuki" },
    { ticker: "TITAN.NS", name: "Titan Company" },
    { ticker: "SUNPHARMA.NS", name: "Sun Pharma" },
    { ticker: "ULTRACEMCO.NS", name: "UltraTech Cement" },
    { ticker: "NESTLEIND.NS", name: "Nestle India" },
    { ticker: "WIPRO.NS", name: "Wipro" },
    { ticker: "ONGC.NS", name: "ONGC" },
    { ticker: "NTPC.NS", name: "NTPC" },
    { ticker: "POWERGRID.NS", name: "Power Grid Corp" },
    { ticker: "TATAMOTORS.NS", name: "Tata Motors" },
    { ticker: "TATASTEEL.NS", name: "Tata Steel" },
    { ticker: "JSWSTEEL.NS", name: "JSW Steel" },
    { ticker: "HCLTECH.NS", name: "HCL Technologies" },
    { ticker: "ADANIENT.NS", name: "Adani Enterprises" },
    { ticker: "COALINDIA.NS", name: "Coal India" },
    { ticker: "BAJAJFINSV.NS", name: "Bajaj Finserv" },
  ],
  midcap: [
    { ticker: "TATAPOWER.NS", name: "Tata Power" },
    { ticker: "TVSMOTOR.NS", name: "TVS Motor" },
    { ticker: "PIIND.NS", name: "PI Industries" },
    { ticker: "ASHOKLEY.NS", name: "Ashok Leyland" },
    { ticker: "AUROPHARMA.NS", name: "Aurobindo Pharma" },
    { ticker: "MPHASIS.NS", name: "Mphasis" },
    { ticker: "PERSISTENT.NS", name: "Persistent Systems" },
    { ticker: "COFORGE.NS", name: "Coforge" },
    { ticker: "LUPIN.NS", name: "Lupin" },
    { ticker: "BALKRISIND.NS", name: "Balkrishna Inds" },
    { ticker: "GODREJPROP.NS", name: "Godrej Properties" },
    { ticker: "OBEROIRLTY.NS", name: "Oberoi Realty" },
    { ticker: "PAGEIND.NS", name: "Page Industries" },
    { ticker: "MRF.NS", name: "MRF" },
    { ticker: "CUMMINSIND.NS", name: "Cummins India" },
    { ticker: "TATACOMM.NS", name: "Tata Communications" },
    { ticker: "VOLTAS.NS", name: "Voltas" },
    { ticker: "JUBLFOOD.NS", name: "Jubilant FoodWorks" },
    { ticker: "BHARATFORG.NS", name: "Bharat Forge" },
    { ticker: "SRF.NS", name: "SRF" },
    { ticker: "INDHOTEL.NS", name: "Indian Hotels" },
    { ticker: "ABCAPITAL.NS", name: "Aditya Birla Capital" },
    { ticker: "MFSL.NS", name: "Max Financial Svcs" },
    { ticker: "FEDERALBNK.NS", name: "Federal Bank" },
    { ticker: "BANDHANBNK.NS", name: "Bandhan Bank" },
    { ticker: "ESCORTS.NS", name: "Escorts Kubota" },
    { ticker: "GMRINFRA.NS", name: "GMR Airports" },
    { ticker: "SUNTV.NS", name: "Sun TV Network" },
    { ticker: "LICHSGFIN.NS", name: "LIC Housing Finance" },
    { ticker: "CROMPTON.NS", name: "Crompton Greaves" },
  ],
  smallcap: [
    { ticker: "IRCTC.NS", name: "IRCTC" },
    { ticker: "CDSL.NS", name: "Central Depository" },
    { ticker: "ROUTE.NS", name: "Route Mobile" },
    { ticker: "KEI.NS", name: "KEI Industries" },
    { ticker: "AMBER.NS", name: "Amber Enterprises" },
    { ticker: "CAMS.NS", name: "Computer Age Mgmt" },
    { ticker: "RADICO.NS", name: "Radico Khaitan" },
    { ticker: "FINEORG.NS", name: "Fine Organic Inds" },
    { ticker: "GRINDWELL.NS", name: "Grindwell Norton" },
    { ticker: "CENTURYPLY.NS", name: "Century Plyboards" },
    { ticker: "GALAXYSURF.NS", name: "Galaxy Surfactants" },
    { ticker: "JKPAPER.NS", name: "JK Paper" },
    { ticker: "KAJARIACER.NS", name: "Kajaria Ceramics" },
    { ticker: "VGUARD.NS", name: "V-Guard Industries" },
    { ticker: "BLUESTARCO.NS", name: "Blue Star" },
    { ticker: "CARBORUNIV.NS", name: "Carborundum Univ" },
    { ticker: "SUPREMEIND.NS", name: "Supreme Industries" },
    { ticker: "TEAMLEASE.NS", name: "TeamLease Services" },
    { ticker: "AAVAS.NS", name: "Aavas Financiers" },
    { ticker: "CHAMBLFERT.NS", name: "Chambal Fertilisers" },
    { ticker: "JBCHEPHARM.NS", name: "JB Chemicals" },
    { ticker: "ORCHPHARMA.NS", name: "Orchid Pharma" },
    { ticker: "RITES.NS", name: "RITES" },
    { ticker: "HFCL.NS", name: "HFCL" },
    { ticker: "GRSE.NS", name: "Garden Reach Ship" },
    { ticker: "MAHSEAMLES.NS", name: "Maharashtra Seamless" },
    { ticker: "TIINDIA.NS", name: "Tube Investments" },
    { ticker: "ELGIEQUIP.NS", name: "Elgi Equipments" },
    { ticker: "SHILPAMED.NS", name: "Shilpa Medicare" },
    { ticker: "NH.NS", name: "Narayana Hrudayalaya" },
  ],
};

/**
 * ----------------------------------------------------------------------------
 *  2. SCORING WEIGHTS
 * ----------------------------------------------------------------------------
 */

/**
 * Composite split between fundamental and technical scores.
 * Horizon is medium-term, so fundamentals are weighted slightly heavier.
 * These MUST sum to 1.0.
 */
export const COMPOSITE_WEIGHTS = {
  fundamental: 0.58, // 58% fundamentals
  technical: 0.42, // 42% technicals
} as const;

/**
 * Technical sub-weights. Trend + medium-term momentum dominate; RSI is only a
 * gate (it can trim the score for a bad entry, but never drives it up).
 * `trend` + `momentum` should sum to 1.0 (rsiGate is applied multiplicatively).
 */
export const TECHNICAL_WEIGHTS = {
  trend: 0.6, // Price vs 50/200 SMA + golden cross
  momentum: 0.4, // 6-month momentum
} as const;

/**
 * Fundamental sub-weights. Each of the 5 inputs is scored 0..1 then combined.
 * These MUST sum to 1.0.
 */
export const FUNDAMENTAL_WEIGHTS = {
  pe: 0.2,
  roe: 0.25,
  debtToEquity: 0.2,
  earningsGrowth: 0.2,
  profitMargin: 0.15,
} as const;

/**
 * Neutral score used whenever a fundamental input is missing. 0.5 means "no
 * opinion" — a missing metric neither helps nor hurts the stock.
 */
export const NEUTRAL_SCORE = 0.5;

/**
 * ----------------------------------------------------------------------------
 *  2b. FUNDAMENTAL SCORING CURVES
 * ----------------------------------------------------------------------------
 *  Each metric is mapped to 0..1 using simple piecewise-linear thresholds.
 *  `good` scores ~1.0, `bad` scores ~0.0, values in between interpolate.
 *  Tune these to your own philosophy.
 */
export const FUNDAMENTAL_CURVES = {
  // P/E: cheaper is better, but negative earnings (loss-making) is penalized.
  // Below `good` P/E => great; above `bad` => expensive.
  pe: { good: 15, bad: 45, negativePenalty: 0.2 },
  // ROE (as fraction): higher is better.
  roe: { bad: 0.05, good: 0.2 },
  // Debt/Equity (as multiple): lower is better.
  debtToEquity: { good: 0.3, bad: 1.5 },
  // Earnings growth (as fraction): higher is better; negative is penalized.
  earningsGrowth: { bad: 0.0, good: 0.25 },
  // Profit margin (as fraction): higher is better.
  profitMargin: { bad: 0.03, good: 0.2 },
} as const;

/**
 * ----------------------------------------------------------------------------
 *  2c. TECHNICAL SCORING PARAMETERS
 * ----------------------------------------------------------------------------
 */
export const TECHNICAL_PARAMS = {
  smaShortPeriod: 50, // "50-day moving average"
  smaLongPeriod: 200, // "200-day moving average"
  momentumLookbackDays: 126, // ~6 months of trading days
  rsiPeriod: 14,
  // RSI gate: entries above `overbought` or below `oversold` get a small
  // penalty (we prefer not to chase extremes for a multi-month hold).
  rsiOverbought: 72,
  rsiOversold: 28,
  rsiPenalty: 0.15, // Multiply technical score by (1 - penalty) at extremes
} as const;

/**
 * ----------------------------------------------------------------------------
 *  3. TRADE LEVELS (entry band / target / stop-loss / horizon)
 * ----------------------------------------------------------------------------
 *  Levels are built from ATR + MEDIUM-TERM (90-120 day) support/resistance,
 *  NOT short 20-30 day windows, because the intent is a multi-month hold.
 */
export const TRADE_PARAMS = {
  atrPeriod: 14,
  // Medium-term window used to find support (recent low) & resistance (high).
  supportResistanceWindowDays: 120,
  // Entry band width around current price, in ATR multiples.
  entryBandAtrMult: 0.5,
  // Target distance in ATR multiples (clamped UP to medium-term resistance).
  targetAtrMult: 4.0,
  // Stop-loss distance in ATR multiples (clamped to medium-term support).
  stopAtrMult: 2.5,
  // Suggested holding period (calendar days). Configurable, defaults land in
  // the 2-6 month range per your stated horizon. Per-category overrides let
  // smaller/more volatile names get a slightly longer leash.
  defaultHoldingDays: 90, // ~3 months
  holdingDaysByCategory: {
    largecap: 90, // ~3 months
    midcap: 120, // ~4 months
    smallcap: 150, // ~5 months
  } as Record<CapCategory, number>,
} as const;

/**
 * ----------------------------------------------------------------------------
 *  4. RANKING / DATA / LEDGER / BACKTEST PARAMETERS
 * ----------------------------------------------------------------------------
 */
export const RANKING_PARAMS = {
  topPicksPerCategory: 5, // Top N per cap category => 15 total
  // Minimum candles required to score a stock at all (need >200 for SMA200).
  minCandlesRequired: 210,
} as const;

export const DATA_PARAMS = {
  historyYears: 2, // ~2 years of daily history
  // Polite delay between Yahoo requests (ms). ~600ms => ~1 min for 90 tickers.
  requestDelayMs: 600,
  maxRetries: 2, // Retries per ticker on transient fetch failure
} as const;

export const LEDGER_PARAMS = {
  // Path (relative to project root) of the JSON ledger "database".
  filePath: "data/ledger.json",
};

export const BACKTEST_PARAMS = {
  // Sample historical entry days every N trading days (weekly ~= 5) to keep
  // runtime reasonable across the universe.
  sampleEveryNTradingDays: 5,
  topPicksPerCategory: 5,
  // Don't open new hypothetical trades in the final `warmupTailDays` of
  // history — there wouldn't be enough forward data to resolve them.
  minForwardDaysToOpen: 30,
  csvOutputPath: "backtest-results.csv",
};

/**
 * ----------------------------------------------------------------------------
 *  5. DISCLAIMER (appended to every Telegram message)
 * ----------------------------------------------------------------------------
 */
export const DISCLAIMER =
  "⚠️ Heuristic research tool, NOT financial advice. Scores are " +
  "generated by a mechanical model from public data that may be delayed or " +
  "inaccurate. Do your own research and manage your own risk.";
