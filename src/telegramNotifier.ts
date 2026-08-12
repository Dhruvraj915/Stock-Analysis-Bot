/**
 * Telegram delivery via the Bot API using direct HTTPS calls (Node 20+ global
 * fetch — no polling library needed). Also owns all human-facing message
 * formatting so the entry points stay thin.
 *
 * Credentials come from env (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID). Set
 * DRY_RUN=true to format + print messages to the console without sending.
 */

import { CapCategory, LedgerEntry, ScoredStock } from "./types";
import { DISCLAIMER } from "./config";
import { daysBetween, StatusCheckResult } from "./ledger";

const TELEGRAM_MAX_CHARS = 4096;

const CATEGORY_LABEL: Record<CapCategory, string> = {
  largecap: "🟦 LARGE CAP",
  midcap: "🟨 MID CAP",
  smallcap: "🟥 SMALL CAP",
};

/** Escape the characters that matter for Telegram HTML parse mode. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Read + validate Telegram credentials. Returns null (and warns) if missing,
 * so callers can decide whether that's fatal.
 */
export function getTelegramConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn(
      "! TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — cannot send Telegram messages.",
    );
    return null;
  }
  return { token, chatId };
}

export function isDryRun(): boolean {
  return (process.env.DRY_RUN ?? "").toLowerCase() === "true";
}

/**
 * Send one message, splitting into multiple messages if it exceeds Telegram's
 * 4096-char limit. In DRY_RUN mode, prints to console instead of sending.
 */
export async function sendMessage(text: string): Promise<void> {
  if (isDryRun()) {
    console.log("\n----- [DRY_RUN] Telegram message -----\n");
    console.log(text.replace(/<\/?[^>]+>/g, "")); // strip HTML tags for console
    console.log("\n--------------------------------------\n");
    return;
  }

  const cfg = getTelegramConfig();
  if (!cfg) return;

  const chunks = splitForTelegram(text);
  for (const chunk of chunks) {
    const res = await fetch(
      `https://api.telegram.org/bot${cfg.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cfg.chatId,
          text: chunk,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Telegram send failed: ${res.status} ${res.statusText} ${body}`,
      );
    }
  }
}

/** Split on line boundaries so each chunk stays under the char limit. */
export function splitForTelegram(text: string): string[] {
  if (text.length <= TELEGRAM_MAX_CHARS) return [text];
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > TELEGRAM_MAX_CHARS) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// ---------------------------------------------------------------------------
//  Message builders
// ---------------------------------------------------------------------------

/**
 * One pick, formatted as a compact multi-line block.
 * `heldEntry` is the pick's active ledger row if it was already open before
 * today's run (a HELD position); undefined means it's a fresh NEW idea.
 */
function formatPick(
  p: ScoredStock,
  rank: number,
  dateIso: string,
  heldEntry?: LedgerEntry,
): string {
  const flag = p.fundamentalsMissing ? " ⚠️fund?" : "";
  let tag: string;
  if (heldEntry) {
    const age = daysBetween(heldEntry.date, dateIso);
    const sinceEntryPct =
      ((p.levels.currentPrice - heldEntry.entryReference) /
        heldEntry.entryReference) *
      100;
    tag = `📌 HELD day ${age}/${heldEntry.suggestedHoldingDays} (${fmtPct(sinceEntryPct)} since entry)`;
  } else {
    tag = "🆕 NEW";
  }
  return [
    `${tag}`,
    `<b>${rank}. ${esc(p.ticker.replace(".NS", ""))}</b> — ${esc(p.name)}${flag}`,
    `   Score <b>${p.compositeScore.toFixed(1)}</b> (T ${(p.technical.score * 100).toFixed(0)} / F ${(p.fundamental.score * 100).toFixed(0)})`,
    `   Price ₹${fmt(p.levels.currentPrice)} | Entry ₹${fmt(p.levels.entryLow)}–₹${fmt(p.levels.entryHigh)}`,
    `   🎯 Target ₹${fmt(p.levels.target)} | 🛑 SL ₹${fmt(p.levels.stopLoss)} | ⏳ ~${p.levels.suggestedHoldingDays}d`,
  ].join("\n");
}

/**
 * Build the full daily message: optional status-check summary at top, then the
 * top picks per category, then the disclaimer.
 *
 * `preExistingOpenTickers` is the set of tickers that already had an active
 * ledger position BEFORE today's picks were logged — used to tag each pick
 * as 🆕 NEW or 📌 HELD instead of re-presenting existing holds as if they
 * were fresh ideas. `activeLedgerByTicker` supplies the entry date/price for
 * HELD picks (age + return-since-entry).
 */
export function buildDailyMessage(
  picksByCategory: Record<CapCategory, ScoredStock[]>,
  dateIso: string,
  statusResult?: StatusCheckResult,
  preExistingOpenTickers: Set<string> = new Set(),
  activeLedgerByTicker: Map<string, LedgerEntry> = new Map(),
): string {
  const parts: string[] = [];
  parts.push(`📊 <b>NSE Positional Picks — ${dateIso}</b>`);
  parts.push(`<i>Medium-term (2-3+ month) research, top 5 per cap.</i>`);

  // Status-check summary (transitions since last run).
  if (statusResult) {
    parts.push("");
    if (statusResult.transitions.length === 0) {
      parts.push(
        `🔁 Ledger: ${statusResult.checked} open pick(s) checked, no status changes.`,
      );
    } else {
      parts.push(`🔁 <b>Ledger updates</b> (${statusResult.checked} checked):`);
      for (const t of statusResult.transitions) {
        const icon =
          t.to === "HIT_TARGET" ? "✅" : t.to === "HIT_STOPLOSS" ? "❌" : "⌛";
        parts.push(
          `   ${icon} ${esc(t.ticker.replace(".NS", ""))} → ${t.to} @ ₹${fmt(t.price)} (${fmtPct(t.returnPct)})`,
        );
      }
    }
  }

  const cats: CapCategory[] = ["largecap", "midcap", "smallcap"];
  const allPicks = cats.flatMap((cat) => picksByCategory[cat]);
  const newCount = allPicks.filter(
    (p) => !preExistingOpenTickers.has(p.ticker),
  ).length;
  const heldCount = allPicks.length - newCount;
  parts.push("");
  parts.push(
    `🆕 ${newCount} new idea${newCount === 1 ? "" : "s"} today · 📌 ${heldCount} hold${heldCount === 1 ? "" : "s"}`,
  );

  for (const cat of cats) {
    const picks = picksByCategory[cat];
    parts.push("");
    parts.push(`${CATEGORY_LABEL[cat]}`);
    if (picks.length === 0) {
      parts.push("   (no qualifying stocks today)");
      continue;
    }
    picks.forEach((p, i) => {
      const heldEntry = preExistingOpenTickers.has(p.ticker)
        ? activeLedgerByTicker.get(p.ticker)
        : undefined;
      parts.push(formatPick(p, i + 1, dateIso, heldEntry));
    });
  }

  parts.push("");
  parts.push(esc(DISCLAIMER));
  return parts.join("\n");
}

/**
 * Build the weekly performance summary message from pre-computed stats.
 */
export interface CategoryStats {
  total: number;
  hitTarget: number;
  hitStop: number;
  expired: number;
  open: number; // still active (OPEN / STILL_OPEN)
  closed: number; // resolved (target + stop + expired)
  winRatePct: number | null; // wins / closed
  avgReturnClosedPct: number | null; // avg return over closed
  avgReturnOpenPct: number | null; // marked-to-market avg over open
}

export function buildWeeklyMessage(
  windowDays: number,
  overall: CategoryStats,
  byCategory: Record<CapCategory, CategoryStats>,
  dateIso: string,
): string {
  const parts: string[] = [];
  parts.push(`📈 <b>Weekly Performance Summary — ${dateIso}</b>`);
  parts.push(`<i>Picks suggested in the last ${windowDays} days.</i>`);
  parts.push("");

  const block = (label: string, s: CategoryStats): string[] => {
    if (s.total === 0) return [`${label}: no picks in window.`];
    const winRate =
      s.winRatePct == null ? "n/a" : `${s.winRatePct.toFixed(0)}%`;
    const avgClosed =
      s.avgReturnClosedPct == null ? "n/a" : fmtPct(s.avgReturnClosedPct);
    const avgOpen =
      s.avgReturnOpenPct == null ? "n/a" : fmtPct(s.avgReturnOpenPct);
    return [
      `<b>${label}</b> — ${s.total} picks`,
      `   ✅ target ${s.hitTarget} | ❌ stop ${s.hitStop} | ⌛ expired ${s.expired} | 🔓 open ${s.open}`,
      `   Win rate (closed): <b>${winRate}</b> | Avg return closed: <b>${avgClosed}</b>`,
      `   Avg return still-open (M2M): ${avgOpen}`,
    ];
  };

  parts.push(...block("OVERALL", overall));
  parts.push("");
  parts.push(...block("Large cap", byCategory.largecap));
  parts.push(...block("Mid cap", byCategory.midcap));
  parts.push(...block("Small cap", byCategory.smallcap));
  parts.push("");
  parts.push(esc(DISCLAIMER));
  return parts.join("\n");
}

/** Utility used by weekly summary to format the "since" date, exported for reuse. */
export function pickDisplayName(e: LedgerEntry): string {
  return `${e.ticker.replace(".NS", "")} (${e.name})`;
}
