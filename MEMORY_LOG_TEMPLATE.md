# Memory Log Entry Template

**Status:** copy verbatim, fill placeholders. Append to `tradingagents-skill/memory/trading_memory.md` after every daily refresh.
**Companion files:** `WORKFLOW.md` Phase 7, `ROUND_RUNBOOK.md` Step 7.

The memory log is the durable record. The next same-ticker run reads back the most recent entries to fetch realised return and write a reflection (see SKILL.md "How to use this skill"). Entries must be machine-parseable AND human-skimmable.

---

## Daily round summary template (always append one per round)

```
[YYYY-MM-DD | MARKET | n/a | pending | <one-line headline>]

DECISION:
**Rating**: n/a (round summary, <N> rating changes)

**Executive Summary**: <ONE PARAGRAPH, 80 to 150 words>. Cover (a) session state — pre-market / intraday / EOD / weekend / holiday closed; (b) key anchor — index closes, VIX, 10Y; (c) major event of the day; (d) crypto / oil / FX deltas; (e) HK or other regional; (f) scope flag if relevant.

**Investment Thesis**: <ONE OR TWO PARAGRAPHS>. List each rating change explicitly:
1. **TICKER: PriorRating -> NewRating.** [why, in one or two sentences, with the specific evidence that crossed the threshold]
2. ...

Then summarize the final cohort distribution: Buy (N): list. Overweight (N): list. Hold (N). Underweight (N): list. Sell (N): list.

Note any pre-event positioning (T-N to binary) and post-print follow-ups.

**Time Horizon**: Daily refresh cadence. Next checkpoints: <upcoming binary dates>.

<!-- ENTRY_END -->
```

---

## Per-ticker pending entry (only on rating changes or material conviction shifts)

When a ticker's rating changes OR sizing/horizon changes materially, additionally append:

```
[YYYY-MM-DD | TICKER | NewRating | pending | <one-line subject>]

DECISION:
**Rating**: NewRating (revised from PriorRating).

**Executive Summary**: <2 to 3 sentences specific to this ticker>.

**Investment Thesis**: <2 to 4 sentences with the specific evidence + price target + horizon>.

**Time Horizon**: <e.g. 1 to 3 months>.

<!-- ENTRY_END -->
```

This is what the next same-ticker run reads back via `get_past_context()`.

---

## Scope-flag entry (when 80/20 standard is missed)

If fewer than 17/22 tickers received genuine multi-agent debate (i.e., > 5 single-voice fallbacks), the round MUST include a scope-flag entry:

```
[YYYY-MM-DD | SCOPE-FLAG | n/a | pending | Hard Rule #9 80/20 missed -- <X>/<22> multi-agent]

DECISION:
**Rating**: n/a (process integrity flag)

**Executive Summary**: This round's multi-agent dispatch came in at <X>/22, below the 17/22 threshold required by WORKFLOW Hard Rule #9. The <Y> single-voice fallback tickers are: <list>. Cause: <e.g. session limit / API timeout / time pressure>. Remediation: <e.g. scheduled for next round / accepted with reduced confidence>.

**Investment Thesis**: The single-voice fallback bodies preserve prior rating with price-anchor and action-field updates only. Treat all ratings on the listed tickers with reduced confidence until next round's full multi-agent rebuild.

**Time Horizon**: One-round flag.

<!-- ENTRY_END -->
```

The framework's value depends on the user knowing when the standard was met vs missed.

---

## Remediation entry (when scope-flag is later cleared)

```
[YYYY-MM-DD | REMEDIATION | n/a | pending | <ROUND-DATE> single-voice fallbacks rebuilt to multi-agent]

DECISION:
**Rating**: n/a (process-integrity remediation)

**Executive Summary**: Closing the scope-flag on YYYY-MM-DD entry. The <Y> single-voice fallback tickers (<list>) were re-dispatched as proper Bull/Bear/Aggressive/Conservative/Neutral debates and the entry was rebuilt. WORKFLOW Hard Rule #9 80/20 standard now MET for that round.

**Investment Thesis**: <list any rating changes that emerged from the proper multi-agent rebuild vs the prior single-voice; or "no rating changes from remediation" if all held>.

**Time Horizon**: One-round remediation.

<!-- ENTRY_END -->
```

---

## Worked example — 6/1 round summary entry

```
[2026-06-01 | MARKET | n/a | pending | Mon intraday -- oil +8% Iran miss, USO Sell to Hold pre-committed cover fired]

DECISION:
**Rating**: n/a (round summary, 1 rating change via pre-commitment trigger)

**Executive Summary**: 6/1 Mon ~11:30 ET intraday refresh. The dominant event: oil +8% (WTI ~$94, Brent ~$97) on the Iran 60-day truce extension NOT being signed over the weekend. Trump posted "it will all work out well" but produced no signature. Tape: S&P 7,580.55 (+0.01%), Nasdaq 27,021.06 (+0.18%) record, Dow 50,901.28 (-0.26%) defensive lag despite energy rip. VIX low ~14. Crypto risk-off: BTC $72,145 (down from 5/29 ~$75K), ETH $2,006 testing $2,000 floor. HK Mon positive: Hang Seng +0.67%, Tencent +2.4%, Xiaomi +2.1%.

**Investment Thesis**: 1 rating change via pre-commitment: **USO Sell -> Hold**. On 5/31 we pre-committed "mechanical cover at $148 close on Iran framework collapse signal." Oil +8% to $94 pushed USO into $148-152 band, triggering the cover. 75% of short closed, 25% vestige with $158 stop. The pre-commitment saved the 5.3% running gain. IBIT Hold maintained with tightened stop ($39.50); June $50 calls CLOSED per priority plan. Final 6/1 distribution: Buy (2): SNDK, LITE. Overweight (4): GOOGL, BRKB, META, TCEHY. Hold (14). Underweight (2): 1810, PDD.

**Time Horizon**: Daily refresh cadence. Next: Tue 6/2 open follow-through on Iran (will Trump sign?), AAPL WWDC 6/8 (T-7), ORCL Q4 6/10 (T-9).

<!-- ENTRY_END -->
```

---

## Auto-draft helper (suggested future tooling)

A Node helper could read `data.js`, compute the rating-change diff vs prior date, and emit a skeleton with the rating-change list pre-filled:

```js
// scaffold: D:\tradingagents-skill\reports\drafting\memory_diff.js
function diffRatings(date, priorDate) { ... }
function fmtMemoryEntry(date, diff, macroBullets) { ... }
```

For now, the template is filled by hand from the round's marketBrief body.
