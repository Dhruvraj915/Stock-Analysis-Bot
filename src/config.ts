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

import { CapCategory, HoldingHorizon, UniverseEntry } from "./types";

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
 * Horizon Profile definition.
 */
export interface HorizonProfile {
  name: HoldingHorizon;
  displayName: string;
  holdingRangeLabel: string;
  historyYears: number;
  compositeWeights: {
    fundamental: number;
    technical: number;
  };
  technicalWeights: {
    trend: number;
    momentum: number;
    macd: number;
    nearHigh: number;
  };
  technicalParams: {
    smaShortPeriod: number;
    smaLongPeriod: number;
    momentumLookbackDays: number;
    rsiPeriod: number;
    rsiOverbought: number;
    rsiOversold: number;
    rsiPenalty: number;
    volumeConfirmation: boolean;
  };
  tradeParams: {
    atrPeriod: number;
    supportResistanceWindowDays: number;
    entryBandAtrMult: number;
    targetAtrMult: number;
    stopAtrMult: number;
    minRiskReward: number;
    defaultHoldingDays: number;
    holdingDaysMin: number;
    holdingDaysMax: number;
    holdingDaysByCategory: Record<CapCategory, number>;
  };
}

export const HORIZON_PROFILES: Record<HoldingHorizon, HorizonProfile> = {
  swing: {
    name: "swing",
    displayName: "Swing (10–15 Days)",
    holdingRangeLabel: "10–15 days",
    historyYears: 2,
    compositeWeights: {
      fundamental: 0.30, // 30% fundamentals
      technical: 0.70,   // 70% technicals (price action & momentum dominate)
    },
    technicalWeights: {
      trend: 0.35,
      momentum: 0.35,
      macd: 0.20,
      nearHigh: 0.10,
    },
    technicalParams: {
      smaShortPeriod: 10,
      smaLongPeriod: 50,
      momentumLookbackDays: 20, // ~1 month trading days
      rsiPeriod: 14,
      rsiOverbought: 75,
      rsiOversold: 28,
      rsiPenalty: 0.15,
      volumeConfirmation: true,
    },
    tradeParams: {
      atrPeriod: 14,
      supportResistanceWindowDays: 30,
      entryBandAtrMult: 0.3,
      targetAtrMult: 2.2,
      stopAtrMult: 1.4,
      minRiskReward: 1.2,
      defaultHoldingDays: 14,
      holdingDaysMin: 10,
      holdingDaysMax: 15,
      holdingDaysByCategory: {
        largecap: 12,
        midcap: 14,
        smallcap: 15,
      },
    },
  },
  positional: {
    name: "positional",
    displayName: "Positional (2–3 Months)",
    holdingRangeLabel: "2–3 months",
    historyYears: 2,
    compositeWeights: {
      fundamental: 0.58, // 58% fundamentals
      technical: 0.42,   // 42% technicals
    },
    technicalWeights: {
      trend: 0.45,
      momentum: 0.30,
      macd: 0.15,
      nearHigh: 0.10,
    },
    technicalParams: {
      smaShortPeriod: 50,
      smaLongPeriod: 200,
      momentumLookbackDays: 126, // ~6 months trading days
      rsiPeriod: 14,
      rsiOverbought: 72,
      rsiOversold: 28,
      rsiPenalty: 0.15,
      volumeConfirmation: true,
    },
    tradeParams: {
      atrPeriod: 14,
      supportResistanceWindowDays: 120,
      entryBandAtrMult: 0.5,
      targetAtrMult: 4.0,
      stopAtrMult: 2.5,
      minRiskReward: 1.4,
      defaultHoldingDays: 90,
      holdingDaysMin: 60,
      holdingDaysMax: 120,
      holdingDaysByCategory: {
        largecap: 90,
        midcap: 120,
        smallcap: 150,
      },
    },
  },
  longterm: {
    name: "longterm",
    displayName: "Long-Term (1–2 Years)",
    holdingRangeLabel: "1–2 years",
    historyYears: 3,
    compositeWeights: {
      fundamental: 0.75, // 75% fundamentals (business quality & valuation)
      technical: 0.25,   // 25% technicals (macro trend & golden cross)
    },
    technicalWeights: {
      trend: 0.60,
      momentum: 0.25,
      macd: 0.10,
      nearHigh: 0.05,
    },
    technicalParams: {
      smaShortPeriod: 50,
      smaLongPeriod: 200,
      momentumLookbackDays: 252, // 1 year lookback
      rsiPeriod: 14,
      rsiOverbought: 80, // More relaxed for multi-year compounders
      rsiOversold: 25,
      rsiPenalty: 0.10,
      volumeConfirmation: false,
    },
    tradeParams: {
      atrPeriod: 14,
      supportResistanceWindowDays: 365,
      entryBandAtrMult: 0.8,
      targetAtrMult: 8.0,
      stopAtrMult: 4.0,
      minRiskReward: 1.8,
      defaultHoldingDays: 450,
      holdingDaysMin: 365,
      holdingDaysMax: 730,
      holdingDaysByCategory: {
        largecap: 365,
        midcap: 450,
        smallcap: 540,
      },
    },
  },
};

/**
 * ----------------------------------------------------------------------------
 *  2. DEFAULT SCORING WEIGHTS & PARAMS (Backward Compatibility)
 * ----------------------------------------------------------------------------
 */
export const COMPOSITE_WEIGHTS = HORIZON_PROFILES.positional.compositeWeights;
export const TECHNICAL_WEIGHTS = HORIZON_PROFILES.positional.technicalWeights;
export const TECHNICAL_PARAMS = HORIZON_PROFILES.positional.technicalParams;
export const TRADE_PARAMS = HORIZON_PROFILES.positional.tradeParams;

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
 */
export const FUNDAMENTAL_CURVES = {
  pe: { good: 15, bad: 45, negativePenalty: 0.2 },
  roe: { bad: 0.05, good: 0.2 },
  debtToEquity: { good: 0.3, bad: 1.5 },
  earningsGrowth: { bad: 0.0, good: 0.25 },
  profitMargin: { bad: 0.03, good: 0.2 },
} as const;

/**
 * ----------------------------------------------------------------------------
 *  4. RANKING / DATA / LEDGER / BACKTEST PARAMETERS
 * ----------------------------------------------------------------------------
 */
export const RANKING_PARAMS = {
  topPicksPerCategory: 5, // Top N per cap category => 15 total
  minCandlesRequired: 210,
} as const;

export const DATA_PARAMS = {
  historyYears: 2, // Default history
  requestDelayMs: 600,
  maxRetries: 2,
} as const;

export const LEDGER_PARAMS = {
  filePath: "data/ledger.json",
};

export const BACKTEST_PARAMS = {
  sampleEveryNTradingDays: 5,
  topPicksPerCategory: 5,
  minForwardDaysToOpen: 30,
  csvOutputPath: "backtest-results.csv",
};

/**
 * ----------------------------------------------------------------------------
 *  5. DISCLAIMER
 * ----------------------------------------------------------------------------
 */
export const DISCLAIMER =
  "⚠️ Heuristic research tool, NOT financial advice. Scores are " +
  "generated by a mechanical model from public data that may be delayed or " +
  "inaccurate. Do your own research and manage your own risk.";

