# Daily Refresh Runbook

**Status:** binding cookbook. Every daily refresh follows this exact sequence.
**Companion files:** `WORKFLOW.md` (the why), `SUBAGENT_TEMPLATE.md` (per-ticker prompt), `GENERATOR_TEMPLATE.js` (data.js writer), `MEMORY_LOG_TEMPLATE.md` (round summary), `WORKFLOW_REVIEW_0601.md` (retrospective).

**Time budget:** 105 to 130 minutes for a clean 22-ticker EOD round.

---

## Step 0 — Pre-flight (5 min)

```bash
# Real wall-clock time, ET
TZ=America/New_York date +"%Y-%m-%d %H:%M %Z (%a)"

# Confirm market state: pre-market | regular | post-market | overnight | closed (holiday/weekend)
# Last verifiable session anchor:
#   pre-market or regular -> yesterday's close
#   post-market or overnight -> today's close
#   weekend or holiday -> prior Friday or last-open day

# Read the most recent entry to know prior date + prior ratings
cd /sessions/<session>/mnt/tradingagents-skill/reports
node -e 'global.window={}; require("./data.js"); var d=Object.keys(window.REPORTS_DATA).sort(); console.log("Latest:",d[d.length-1]); var prior=window.REPORTS_DATA[d[d.length-1]]; console.log("Prior ratings:"); Object.keys(prior.tickers).forEach(k=>console.log(" ",k,prior.tickers[k].rating));'
```

Deliverable: confirmed `DATE`, `PRIOR_DATE`, `SESSION_STATE`, list of 22 prior ratings.

---

## Step 1 — Macro & market data pull (10 min, parallel)

Run 4 to 6 WebSearch calls in one message. Required data:

| Data | Search query pattern |
| --- | --- |
| Index closes | `S&P 500 Nasdaq Dow close <DATE>` |
| Crypto | `Bitcoin Ethereum price <DATE>` |
| Oil + currency | `WTI Brent oil USD <DATE>` |
| HK market | `Hang Seng Xiaomi Tencent <DATE>` |
| Catalyst-of-the-day | `<top news event> <DATE>` |
| Earnings/catalyst | `<TICKER with binary in <=7 days> earnings preview <DATE>` |

Deliverable: 6-bullet macro summary string ready to inline into subagent prompts (see SUBAGENT_TEMPLATE section 2).

---

## Step 2 — Tier classification (10 min)

Produce the 22-line tier table. Default is TIGHT; STANDARD or FULL is opt-in with one-line rationale.

```
TICKER  TIER     RATIONALE (one line)
USO     FULL     pre-commit mechanical cover trigger likely fires on oil +8%
GOOGL   FULL     highest-conviction long, AI capex chain confirmation extends
SNDK    FULL     just upgraded Buy, follow-through critical
PDD     STANDARD post-print T+2, watch for buyback signal
AAPL    STANDARD WWDC binary T-7
ORCL    STANDARD Q4 print T-9, round-trip accounting overhang
1810    STANDARD post-print T+3 at 52w low
TCEHY   STANDARD HK +0.67% confirmation, KWEB flow
META    STANDARD Overweight maintained, watch ATT/IDFA distribution
BRKB    STANDARD Overweight defensive, oil-shock favorable
MSTR    STANDARD BTC $72K danger zone, mNAV pressure
IBIT    STANDARD BTC drop tests Hold rating
ETHB    TIGHT    ETH at $2K floor, no specific catalyst
LITE    TIGHT    Buy maintained, no specific news
CRCL    TIGHT    no specific news, Fed-pinned
APP     TIGHT    no specific news, WWDC indirect
PLTR    TIGHT    SNOW pattern continues, no catalyst
INTC    TIGHT    no specific news, share-bleed thesis
LULU    TIGHT    no specific news, basing pattern
TSLA    TIGHT    no specific news, robotaxi gradual
BMNR    TIGHT    ETH follow-through
NASA    TIGHT    starter only, no specific catalyst
```

Deliverable: tier-classified ticker list.

---

## Step 3 — Dispatch subagents (45 min, batched 3-in-parallel)

For each batch, copy SUBAGENT_TEMPLATE section 2, fill placeholders, dispatch via Agent tool. Cap at 3 parallel per message.

**Order:** FULL tier first, then STANDARD, then TIGHT.

**Watchdog rule:** if a subagent doesn't respond in 5 minutes or returns `Stream idle timeout` / `Socket closed`:
1. Retry once with TIGHT-tier downgrade (shorter prompt)
2. If second fail, write a single-voice fallback body via Python (see `write_fallback_<date>.py` pattern) and FLAG it explicitly

**Track progress as you go.** After each batch:

```bash
ls /sessions/<session>/mnt/outputs/t_*_<DATE>.json | wc -l
# should match running count
```

Deliverable: 22 ticker JSON files in `/sessions/<session>/mnt/outputs/t_<TICKER>_<DATE>.json`.

---

## Step 4 — Normalize (5 min)

Copy `normalize_<prior>.py` to `normalize_<DATE>.py`, change the date suffix, run:

```bash
cd /sessions/<session>/mnt/outputs
cp normalize_<prior>.py normalize_<DATE>.py
sed -i 's/<prior_date_suffix>/<new_date_suffix>/g' normalize_<DATE>.py
python3 normalize_<DATE>.py
# Inspect output table. Body lengths >500 chars per language is the bar.
```

This step produces `t_<TICKER>_norm<DATE>.json` for each ticker with the canonical schema (defensive against subagent schema drift).

**Watchpoints from history:**
* IBIT often writes flat schema — verify `body.en` length > 0; if zero, reconstruct manually from `debate_en` / `key_levels` / etc.
* INTC or other tickers may have rating with parens — the cleaner strips them
* TCEHY may have fullwidth quotes — re-encode if JSON parse fails

Deliverable: 22 `_norm<DATE>.json` files, all with `body.en` and `body.zh` as strings.

---

## Step 5 — Generator splice + validate (5 min)

```bash
cd /sessions/<session>/mnt/outputs
cp GENERATOR_TEMPLATE.js gen_<DATE>.js

# Edit gen_<DATE>.js:
# - DATE
# - PRIOR_DATE
# - STAMP
# - NORM_SUFFIX (auto-derived from DATE)
# - macro.en / macro.zh
# - marketBrief.tagline / stance / body

node gen_<DATE>.js
# Exits non-zero on validation fail. Re-run after fix.
```

The generator validates twice:
1. Pre-splice: every ticker norm has valid rating, body.en/zh are non-empty strings, all required keys present
2. Post-splice: re-parse data.js and confirm shape

Deliverable: `data.js` with the new date entry appended and validated.

---

## Step 6 — Web design sync (0 to 10 min, only if structural change)

If you added new categories, new top-level fields (like `valuationBrief` on 5/27), or new render sections:

```bash
# Edit index.html:
# - window.CATEGORIES taxonomy block (data.js)
# - parseRoute() and render() (index.html) for new section
# - renderHome() for new home-page card
# - renderXxxx() detail render function for new route
```

If no structural change, skip this step.

Deliverable: dashboard renders the new date correctly. Spot-check:
1. Date dropdown shows new date as default
2. Macro callout shows today's tape
3. Lead Story (marketBrief) card displays
4. Valuation Brief card displays (if present)
5. Each section grid shows tickers with current ratings
6. Rating-change badges appear for changed tickers
7. Detail pages show fresh `Trade date:` and `Last verifiable session:`

---

## Step 7 — Memory log append (5 min)

Open `MEMORY_LOG_TEMPLATE.md` and fill the daily-round entry skeleton. Append to `tradingagents-skill/memory/trading_memory.md`.

```bash
cat >> /sessions/<session>/mnt/tradingagents-skill/tradingagents-skill/memory/trading_memory.md << 'EOF'
[2026-MM-DD | MARKET | n/a | pending | <one-line subject>]

DECISION:
**Rating**: n/a (round summary)

**Executive Summary**: ...

**Investment Thesis**: ...

**Time Horizon**: Daily refresh cadence.

<!-- ENTRY_END -->
EOF
```

Deliverable: memory log appended with the round summary.

---

## Step 8 — Final verification + handoff (10 min)

```bash
cd /sessions/<session>/mnt/tradingagents-skill/reports
node -e '
global.window={};
require("./data.js");
var dates = Object.keys(window.REPORTS_DATA).sort();
console.log("Dates ["+dates.length+"]:", dates.join(", "));
var d = window.REPORTS_DATA["<DATE>"];
console.log("New date lastRefreshed:", d.lastRefreshed);
console.log("Tickers:", Object.keys(d.tickers).length);

// Check for fallback flags
var fb = 0;
Object.keys(d.tickers).forEach(k => {
  if ((d.tickers[k].body.en||"").indexOf("Multi-agent debate not run") >= 0) fb++;
});
console.log("Fallback flags:", fb, "(should be 0 if 80/20 met)");

// Rating-change summary
var prior = window.REPORTS_DATA["<PRIOR_DATE>"];
var changes = [];
Object.keys(d.tickers).forEach(k => {
  var p = prior.tickers[k] && prior.tickers[k].rating;
  var n = d.tickers[k].rating;
  if (p && n && p !== n) changes.push(k+": "+p+" -> "+n);
});
console.log("Rating changes:", changes.length);
changes.forEach(c => console.log("  "+c));
'
```

Hand off with:
* dashboard link `computer://D:\tradingagents-skill/reports/index.html`
* 3-5 bullet summary of rating changes + key new evidence + watch items
* Sources section (markdown links to the WebSearch results)

---

## Failure modes and recovery

| Symptom | Cause | Recovery |
| --- | --- | --- |
| `Stream idle timeout` | Subagent prompt too long or system overload | Shorten prompt to TIGHT tier and retry |
| `Socket closed unexpectedly` | Same as above, intermittent | Retry once; if persistent, switch to single-voice fallback |
| `You've hit your session limit` | Too many subagents dispatched in this session | Wait for reset time, then continue with remaining tickers |
| Subagent wrote `body: null` | IBIT pattern (recurring) | Reconstruct body manually from flat fields; OR rely on generator's `asString()` defensive fallback |
| `JSON parse error at char N` | Fullwidth quote in CJK string | `sed`-fix or regex-replace fullwidth `"`/`"` to halfwidth or curly |
| Rating "Hold (qualifier)" | Subagent ignored bare-rating rule | The cleanRating() helper strips it; but log as a defect for future prompt tuning |
| `cannot locate <prior> IIFE` in generator | data.js shape changed | Manually inspect data.js head/tail; the generator expects the `\n})();` close marker |
| Edit tool truncated a JS file | Edit on long file | Re-Write the file from scratch; do not use Edit on auto-generated long files |

---

## Quick-reference: the 4 files you actually copy each round

| File | What to do |
| --- | --- |
| `SUBAGENT_TEMPLATE.md` section 2 | Copy verbatim per ticker, fill placeholders |
| `GENERATOR_TEMPLATE.js` | Copy to `gen_<DATE>.js`, edit 5 placeholders, run with node |
| `normalize_<prior>.py` | Copy + sed-rename suffix |
| `MEMORY_LOG_TEMPLATE.md` | Copy entry skeleton, fill paragraphs |

No other manual file authoring required.
