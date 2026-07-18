# NSE Positional Research & Tracking System

A personal, zero-cost stock-research assistant for the **Indian market (NSE)**,
built for **medium-term positional investing (2–3+ month holds)** — not day
trading or short-term tactical trades.

Every weekday at **5pm IST** it analyzes a curated universe of large/mid/small
cap NSE stocks and sends you a **Telegram message with the top 5 picks per cap
category (15 total)** — each with a composite score, entry band, target,
stop-loss, and suggested holding period.

Crucially, it is **not a one-way broadcast**. It keeps a **persistent ledger**
of every pick, checks each one against the market over time, and sends a
**weekly performance summary** so you can judge whether it's actually working
with *evidence instead of vibes*. A **backtesting module** lets you sanity-check
the logic against ~2 years of history before trusting any live pick.

> ⚠️ **This is a heuristic research tool, NOT financial advice.** It generates
> scores mechanically from public data that may be delayed or inaccurate. Do
> your own research and manage your own risk.

---

## What it does (at a glance)

| Piece | File(s) | What it does |
|---|---|---|
| Universe | `src/config.ts` | ~90 curated NSE tickers (large/mid/small), easily editable |
| Data | `src/dataFetcher.ts` | 2y OHLCV + fundamentals via `yahoo-finance2` (no API key) |
| Indicators | `src/indicators.ts` | Pure math: SMA, RSI, ATR, momentum, support/resistance |
| Scoring | `src/scoring.ts` | Medium-term composite: 58% fundamental / 42% technical |
| Ranking | `src/analyzer.ts` | Top 5 per cap category with full diagnostics |
| Delivery | `src/telegramNotifier.ts` | Formats + sends via Telegram Bot API (global `fetch`) |
| Daily job | `src/main.ts` | Status-check → analyze → log → send (one run) |
| Ledger | `src/ledger.ts` | JSON-file pick ledger + status-check routine |
| Weekly | `src/weeklySummary.ts` | 30-day performance rollup → Telegram |
| Backtest | `src/backtest.ts` | Replays scoring over ~2y, reports win rate etc. |

---

## Setup

### 1. Install

```bash
npm install
```

Requires **Node 20+** (uses the global `fetch`).

### 2. Create a Telegram bot & get your chat ID

1. In Telegram, message **@BotFather** → `/newbot` → follow prompts. It gives you
   a **bot token** like `123456789:AA...`.
2. **Send your new bot any message** (e.g. "hi") — this is required so it can
   message you back.
3. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser.
   Find `"chat":{"id":123456789,...}` — that number is your **chat ID**.

### 3. Configure environment

```bash
cp .env.example .env
# then edit .env:
#   TELEGRAM_BOT_TOKEN=...
#   TELEGRAM_CHAT_ID=...
```

### 4. Local test (no messages sent)

Set `DRY_RUN=true` in `.env` to print messages to the console instead of
sending them, then:

```bash
npm run dev:daily      # full daily run against live Yahoo data (prints message)
npm test               # synthetic scoring sanity tests (no network)
```

Remove `DRY_RUN` (or set it to `false`) to actually send to Telegram.

### 5. Scheduling with GitHub Actions (100% free)

The repo ships two workflows:

- `.github/workflows/daily.yml` — Mon–Fri **11:30 UTC (17:00 IST)**: runs the
  daily analysis, sends the message, and **commits the updated ledger** back to
  the repo.
- `.github/workflows/weekly.yml` — Sunday **13:00 UTC (18:30 IST)**: sends the
  weekly performance summary.

To enable:

1. Push this repo to GitHub.
2. Go to **Settings → Secrets and variables → Actions → New repository secret**
   and add:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
3. Ensure Actions can write to the repo: **Settings → Actions → General →
   Workflow permissions → "Read and write permissions"** (the workflows also
   declare `permissions: contents: write`).
4. You can trigger either workflow manually from the **Actions** tab
   ("Run workflow") to test.

> GitHub Actions cron is UTC-only and best-effort — it may fire a few minutes
> late under load. That's fine for an end-of-day positional job.

---

## How scoring works

The horizon is months, so the model **deliberately favors fundamentals and
medium-term trend** over short-term noise. All weights live in `src/config.ts`.

**Composite = 58% Fundamental + 42% Technical** (`COMPOSITE_WEIGHTS`).

**Technical** (`scoreTechnical`, weights in `TECHNICAL_WEIGHTS`):
- **Trend (60%)** — price vs the **50-day** and **200-day** SMA plus the
  **golden-cross** condition (50-SMA above 200-SMA). Longer-term signals are
  weighted a touch more.
- **Momentum (40%)** — **~6-month** return.
- **RSI is only a gate** — an entry that is clearly overbought (>72) or oversold
  (<28) gets a small penalty so we don't chase extremes. RSI never drives the
  score *up*.

**Fundamental** (`scoreFundamental`, weights in `FUNDAMENTAL_WEIGHTS`), each
mapped to 0–1 via tunable curves in `FUNDAMENTAL_CURVES`:
- **ROE (25%)**, **P/E (20%, relative — cheaper better, losses penalized)**,
  **Debt/Equity (20%, lower better)**, **Earnings growth (20%)**,
  **Profit margin (15%)**.
- **Missing data degrades to a neutral 0.5** (common for smaller NSE names) —
  the model never crashes on missing fundamentals, it just expresses "no
  opinion" on that metric. Picks with missing fundamentals are flagged with
  `⚠️fund?` in the Telegram message.

**Trade levels** (`computeTradeLevels`, params in `TRADE_PARAMS`):
- **Entry band** = current price ± 0.5×ATR.
- **Target** = price + 4×ATR, raised to at least the **120-day resistance**.
- **Stop-loss** = price − 2.5×ATR, extended down to the **120-day support** if
  that's lower (gives the thesis room).
- **Suggested holding period** is configurable per cap category (large ~90d,
  mid ~120d, small ~150d) — all in the 2–6 month range.

To retune, edit the constants in `src/config.ts`; everything downstream (daily
picks, ledger, backtest) uses them automatically.

---

## The ledger & weekly summary (the feedback loop)

**Storage: a single committed JSON file — `data/ledger.json`.**
Why JSON over SQLite? Volume is tiny (~15 picks/day), it needs zero native
dependencies (no `node-gyp`/prebuild breakage in CI), it's git-diffable, and it
lets GitHub Actions **commit updated statuses back to the repo** as our free
stateless-runner persistence. The tradeoff (no concurrent writers, no SQL) is
irrelevant for a single serial daily job. See the header comment in
`src/ledger.ts`.

**Each daily run:**
1. Fetches current prices for all **OPEN** picks and updates each to
   `HIT_TARGET`, `HIT_STOPLOSS`, `EXPIRED_OPEN` (past its horizon with neither
   hit), or leaves it `STILL_OPEN` (marked-to-market).
2. Logs today's 15 picks — **skipping any ticker that's already OPEN**, so the
   same idea isn't double-counted in performance stats.

**Weekly summary** (`npm run weekly-summary`) reads the ledger, refreshes open
picks, and reports the **last 30 days**: counts of target/stop/expired/open,
**win rate** (share of *closed* picks that ended positive), **average return on
closed positions**, and marked-to-market average on still-open picks — all
broken down **by cap category**.

---

## Backtesting

```bash
npm run backtest        # build first with `npm run build`, or use `npm run dev:backtest`
```

It fetches ~2y of history once, then **steps through history weekly**. On each
sampled day it scores every stock **using only data up to that day** (no price
lookahead), "buys" the top picks at that day's close, and walks forward until
the first of {target hit, stop hit, horizon reached} resolves the trade.

**Reading the report** — per cap category and overall, you get:
- `trades` — number of resolved hypothetical trades.
- `🎯 / 🛑 / ⌛` — counts resolved by target / stop / expiry.
- `win` — % of trades that ended with a positive return.
- `avgRet` — average return across all resolved trades.
- `avgDays` — average calendar days to resolution.

A full per-trade dump is written to `backtest-results.csv`.

**Important caveat:** Yahoo only exposes *current* fundamentals, so the
fundamental sub-score uses today's snapshot for every historical entry. Price
and technical signals are strictly point-in-time; **backtest fundamentals are
an approximation**, so treat backtest numbers as indicative, not exact. (See the
header comment in `src/backtest.ts`.)

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run build` | Type-check + compile to `dist/` |
| `npm start` / `npm run daily` | Daily run (compiled) |
| `npm run weekly-summary` | Weekly summary (compiled) |
| `npm run backtest` | Backtest (compiled) |
| `npm run dev:daily` / `dev:weekly` / `dev:backtest` | Same, via `ts-node` (no build) |
| `npm test` | Synthetic scoring sanity tests (no network) |

---

## Limitations (read these)

- **Not financial advice.** A mechanical heuristic, not a recommendation.
- **Data quality.** `yahoo-finance2` is an unofficial, free source. Prices can
  be delayed and fundamentals are often **missing or stale for smaller NSE
  stocks** — those are scored neutrally and flagged, but treat them with extra
  skepticism.
- **Static universe.** The ticker lists in `src/config.ts` are a snapshot;
  index membership drifts. **Review and refresh them every few months.**
- **Backtest fundamentals are approximate** (current snapshot applied to the
  past — see above). The backtest validates the *technical/structural* logic
  more faithfully than the fundamental component.
- **No transaction costs / slippage / taxes** are modeled in the backtest.
- **Survivorship bias.** The universe is today's list; historically delisted or
  fallen names aren't included, which can flatter backtest results.
- **Rate limits.** A polite delay is used between requests, but heavy repeated
  runs against Yahoo's free endpoints may still get throttled.
```
