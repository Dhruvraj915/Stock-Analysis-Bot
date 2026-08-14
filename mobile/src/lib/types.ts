/**
 * Mirrors the shapes written by the CLI (../../src/types.ts) — redeclared
 * locally since the mobile app is a separate Expo/Metro project that only
 * ever sees this data as JSON/CSV fetched over HTTP, never imports the CLI.
 */

export type CapCategory = 'largecap' | 'midcap' | 'smallcap';

export const CAP_CATEGORIES: CapCategory[] = ['largecap', 'midcap', 'smallcap'];

export type HoldingHorizon = 'swing' | 'positional' | 'longterm';

export const HOLDING_HORIZONS: HoldingHorizon[] = ['swing', 'positional', 'longterm'];

export type PickStatus =
  | 'OPEN'
  | 'HIT_TARGET'
  | 'HIT_STOPLOSS'
  | 'STILL_OPEN'
  | 'EXPIRED_OPEN';

export interface LedgerEntry {
  id: string;
  date: string;
  ticker: string;
  name: string;
  category: CapCategory;
  horizon?: HoldingHorizon;
  compositeScore: number;
  technicalScore: number;
  fundamentalScore: number;
  entryLow: number;
  entryHigh: number;
  entryReference: number;
  target: number;
  stopLoss: number;
  suggestedHoldingDays: number;
  riskRewardRatio?: number;
  status: PickStatus;
  resolvedDate?: string;
  resolvedPrice?: number;
  returnPct?: number;
  lastCheckedDate?: string;
  lastCheckedPrice?: number;
}

export type BacktestStatus = 'HIT_TARGET' | 'HIT_STOPLOSS' | 'EXPIRED_OPEN';

export interface BacktestTrade {
  entryDate: string;
  ticker: string;
  category: CapCategory;
  entryPrice: number;
  target: number;
  stopLoss: number;
  horizonDays: number;
  exitDate: string;
  exitPrice: number;
  status: BacktestStatus;
  returnPct: number;
  daysToResolution: number;
}
