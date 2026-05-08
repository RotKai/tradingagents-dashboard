# TradingAgents Daily Refresh — Standard Workflow

**Status:** binding template. Every daily refresh follows this sequence in order. Do not skip steps. Do not interleave. Do not "save time" by cloning yesterday — that violates the framework's core invariants and is the single biggest source of bugs in this codebase's history.

This document is generated from real failures encountered during 2026‑05‑05 → 2026‑05‑06 refresh. Every rule below has a specific bug it prevents.

---

## Phase 0 · Pre‑flight (5 minutes, mandatory)

Before touching `data.js`:

1. **Get the current real wall‑clock time** in ET. `TZ=America/New_York date +"%Y-%m-%d %H:%M %Z"`. This becomes the `lastRefreshed` timestamp for the new entry. **Do not invent timestamps. Do not reuse yesterday's.**
2. **Confirm market state.** Pre‑market (4 AM to 9:30 AM ET) / regular (9:30 AM to 4 PM ET) / post‑market (4 PM to 8 PM ET) / overnight. The "last verifiable session" anchor depends on this:
   * Pre‑market and regular hours → last verifiable session is yesterday's close.
   * Post‑market and overnight → last verifiable session is today's close.
3. **Read the most recent entry in `window.REPORTS_DATA`** to know what the prior date and prior ratings are. The `Decision History` sidebar and rating‑change badges all derive from the prior‑date diff.

---

## Phase 1 · Macro & market data pull (parallel web searches)

Pull EOD or current data for the full universe in **parallel batches of 4 search calls**. Wasted time here cascades into stale per‑ticker prices, which is the #1 thing the user has flagged as unacceptable.

Required data points before writing any analysis:

| Data | Source pattern | Why |
| --- | --- | --- |
| S&P 500 close | `stock market close <DATE>` | macro callout, market brief |
| Nasdaq close | same query | macro callout |
| WTI / Brent | `crude oil price <DATE>` | USO + macro |
| BTC / ETH | `Bitcoin price <DATE>` / `Ethereum` | MSTR, BMNR |
| VIX | `VIX volatility <DATE>` | market brief, options sections |
| Per‑ticker close | `<TICKER> stock close <DATE>` | every ticker body |

**Hard rule:** the macro callout cannot be written until the index closes are pulled. Per‑ticker bodies cannot be written until per‑ticker closes are pulled. **No "I'll guess based on yesterday."**

---

## Phase 2 · Breaking‑news scan + classification

For each of the 15 tickers, run one search:

```
<TICKER> earnings news <DATE>
```

Then classify each ticker by the **depth** of the rewrite needed (note: every ticker gets a fresh body — we do not clone; the only question is how much the analysis content changes):

* **MATERIAL event** — earnings released, guide change, M&A announcement, regulatory event, executive change, management commentary that **changes the underlying thesis** (Saylor's "never sell" reversal is the canonical example), single‑day move ≥ 5%. Full 7‑phase deep rewrite required, often with rating change.
* **NON‑MATERIAL** — small move, no specific catalyst, news confirms existing thesis. Still gets a fresh 7‑phase body anchored to today's price grid, but the analysis can acknowledge "thesis unchanged from prior date" and be ~50% the length of a material rewrite.

**Hard rule, no exceptions: every ticker in every new date entry gets a fresh body.** Clone-path was a tempting shortcut and we tried it for the 5/5 → 5/6 refresh; the user correctly rejected it. The framework's "fact-driven, history-anchored" invariant means **the body of every ticker on date X must reference date X minus one as its 'last verifiable session', not date X minus N.** A clone of yesterday's body inside today's date entry is structurally dishonest — it advertises today's date in the URL and timestamp but reads from yesterday's data.

---

## Phase 3 · Build the new date entry

In `data.js`, **always create a new top‑level date key**. Never overwrite a prior date key. The framework is `history-anchored`; daily entries are append‑only.

**Required updates to the new date entry (every single one mandatory, no exceptions):**

| Field | Updated to | Why mandatory |
| --- | --- | --- |
| `lastRefreshed` | today's audit time `YYYY-MM-DD HH:MM ET` | top of every page; if stale, user immediately distrusts the analysis |
| `macro` (EN + ZH) | one-paragraph today's tape recap | the home-page macro callout above the lead story |
| `marketBrief.refreshedAt` | today's audit time | byline of the lead-story article |
| `marketBrief.tagline` (EN + ZH) | reflects today's tape | home-page lead-story card subtitle |
| `marketBrief.stance` (EN + ZH) | reaffirmed or revised | shown as italic deck under the lead-story headline |
| **`marketBrief.body` (EN + ZH)** | **fully rewritten** for today | the full long-form macro article — readers click into this |
| Every ticker's `refreshedAt` | today's audit time | per-card timestamp on home page |
| Every ticker's `body` (EN + ZH) | freshly written for today (full or tighter) | the framework-anchored 7-phase analysis |
| Tickers with rating changes: `rating`, `tagline`, `action`, `keyRisk` | revised to reflect new direction | drives change-flag badge auto-detection |

Skeleton:

```js
window.REPORTS_DATA["YYYY-MM-DD"] = (function () {
  var base = JSON.parse(JSON.stringify(window.REPORTS_DATA["<PRIOR-DATE>"]));

  // ---- Date-level metadata ----
  base.lastRefreshed = "<YYYY-MM-DD HH:MM ET>";
  base.macro = { en: "...", zh: "..." };

  // ---- Market & Macro Brief (LEAD STORY) — fully rewritten ----
  base.marketBrief.refreshedAt = "<YYYY-MM-DD HH:MM ET>";
  base.marketBrief.tagline = { en: "...", zh: "..." };
  base.marketBrief.stance   = { en: "...", zh: "..." };
  base.marketBrief.body     = { en: "...", zh: "..." }; // ← MUST be fresh, not inherited

  // ---- Per-ticker fresh bodies ----
  var freshBodies = {
    // Every ticker has an entry here. MATERIAL gets full 7-phase rewrite;
    // NON-MATERIAL gets tighter rewrite (~50% length) but still fresh.
  };

  Object.keys(base.tickers).forEach(function (t) {
    var tk = base.tickers[t];
    tk.refreshedAt = "<YYYY-MM-DD HH:MM ET>";
    if (freshBodies[t]) {
      tk.body = freshBodies[t];
    }
    // No clone path. Every ticker must be in freshBodies.
  });

  // ---- Rating-change overrides (only for tickers whose rating shifted) ----
  // base.tickers.PLTR.rating = "Underweight";
  // base.tickers.PLTR.tagline = { en: "DOWNGRADED ...", zh: "..." };
  // (etc.)

  return base;
})();
```

**Three places that often get missed (the user has caught all three at different points; treat as mandatory checklist):**

1. **`base.marketBrief.body`** — the lead story is the most-read page; if it inherits from yesterday, it references yesterday's tape and contradicts today's macro callout one screen above. The 2026-05-07 refresh missed this initially.
2. **`base.tickers[T].body`** for every ticker, not just material ones — see Phase 5.
3. **Per-ticker `refreshedAt`** even on no-news days — see Phase 5.

---

## Phase 4 · Per‑ticker REWRITE path (full 7‑phase fresh body)

For every ticker classified MATERIAL in Phase 2, write a fresh body following this exact structure. Both EN and ZH.

```
# TICKER — Company Name

**Trade date:** YYYY-MM-DD · **Last verifiable session:** YYYY-MM-DD close $X.XX (intraday range, daily move %). [One‑line same‑day context.]

## Phase 1 · Same‑day market read
[Technical state, fundamentals as known, news flow, sentiment — anchored to today's price action and any breaking news. 2 to 3 paragraphs.]

## Phase 2 · Bull vs Bear
**Bull.** [Strongest data‑backed bull case in light of today's news. 1 paragraph.]

**Bear.** [Strongest data‑backed bear case in light of today's news. 1 paragraph.]

## Phase 3 · Research Manager + Risk synthesis
**Recommendation: <RATING>.** [1 to 2 paragraphs reweighting the debate against source data.]

**Strategic actions.** [Tranche entries, stop, sizing.]

## Phase 4 · Trader plan
* **Action:** Buy / Sell / Hold.
* **Tranche entries:** specific prices.
* **Stop loss:** specific level.
* **Sizing:** % NAV target and cap.

**FINAL TRANSACTION PROPOSAL: BUY/HOLD/SELL**

## Phase 5 · Portfolio Manager Final Decision
**Rating: <RATING>** (note any change vs prior).

**Executive Summary.** [1 to 2 paragraphs.]

**Time Horizon:** ...

## Phase 6 · Options Strategy
**Implied volatility:** [reading]
**Aligned structure:** [type with rationale]
**Specific levels:** [strikes, expiration, premium estimate]
**Risk budget:** [% NAV cap]
**Breakeven:** [price]
**Honest exit clause:** [when this is NOT a good options trade]
```

**Hard rules for the rewrite path:**

1. The `**Trade date:**` line is for the new date, not the prior date.
2. The `**Last verifiable session:**` price must be the actual close pulled in Phase 1, not an inherited 5/4‑style stale reading.
3. Every directional decision (Tranche prices, stops, profit targets) must be expressed in the new date's price grid. If the entry zone moved 5%+, the trader plan is revised, not copied.
4. If the rating is changing from the prior date, **state it explicitly** in Phase 5 (e.g. `**Rating: Underweight** (revised from Hold on YYYY‑MM‑DD).`). The home page change‑flag detection depends on this.
5. Options strategy must reflect today's IV regime, not yesterday's. Pre‑print IV crush, post‑print compression, and breakout‑day expansion all change the right structure.
6. **Named historical analogues must be explained the first time they appear.** Phrases like "SNOW analogue", "DDOG case", "Buffett-pillars test", "1973 oil shock parallel" are insider jargon that confuse general readers. The first time any such phrase appears in a body or tagline, follow it with a one-sentence explanation of what the historical case actually was. Example: ❌ `"SNOW analogue in execution"` → ✅ `"following the Snowflake 2020-2022 pattern (high-multiple software stock undergoing multi-quarter P/S compression even while revenue continued to grow 30%+)"`. Subsequent references in the same body can be shorter ("the SNOW pattern" / "the Snowflake-style compression") since the explanation has been established.

---

## Phase 5 · NON‑MATERIAL ticker rewrite (still fresh, just lighter)

For non‑material tickers, follow the same 7‑phase template as Phase 4 but tighter (~50% length). The analysis can explicitly say "thesis unchanged from <PRIOR-DATE>" inside Phase 1, but every other element — `Trade date:`, `Last verifiable session:`, entry zones, stops, options strikes — must reflect today's actual price grid pulled in Phase 1.

**The non-material rewrite is NOT a clone with cosmetic changes.** It is a deliberate fresh write that confirms or refines the thesis using today's price action and any incremental information. Examples of what a non-material 5/7 body must actually say:

* `Trade date: 2026-05-07` (not 2026-05-06)
* `Last verifiable session: 2026-05-06 close $X` (real number from Phase 1)
* Entry zones updated if today's close moved them (e.g. tranche 1 at $95 stays unrealistic at $108; new tranche 1 zone is $108-$112)
* Phase 1 paragraph references today's tape, not yesterday's
* Phase 5 reaffirms the rating with one-line "no thesis change" justification

**Do not:**

* Use the prior date's body verbatim. That is clone-path and is forbidden.
* Inject "morning audit" banners into the body. The user has explicitly flagged these as lazy — they explain staleness instead of fixing it.
* Compress the body to single-sentence Phases. The user has flagged this on 5/8 — "Bull. Tranche 1 working; thesis intact." is not a bull case, it's a conclusion masquerading as one. **Length is not the metric; substance is.**

**Do:**

* Write a fresh 30-50 line body (each language) that reflects today's information state honestly.
* Bump `refreshedAt`.
* Update `tagline`, `action`, `keyRisk` metadata if the prior versions no longer reflect today's price grid.

**Minimum-content rules (mandatory; failing any of these means the body is below NON-MATERIAL spec):**

| Phase | Minimum substance |
| --- | --- |
| Phase 1 (same-day market read) | At least 2 paragraphs. Must include: (1) today's specific price action with relative-strength comparison vs cohort/macro, (2) any new fundamental data points or absence thereof (cite the most recent reported quarter for that ticker), (3) cross-asset signals if relevant (BTC for crypto names, oil for USO, etc.) |
| Phase 2 (Bull vs Bear) | Each side ≥ 2 sentences with at least one specific data point or evidence. "Thesis intact" alone is not a bull case. |
| Phase 3 (Research Manager + Risk synthesis) | At least 1 paragraph explaining which side the data favors and why. Must include explicit strategic-actions sub-section with tranche zones, sizing, stop. |
| Phase 4 (Trader plan) | Bullet list with concrete entry zones, stop, sizing, action verb (Buy/Sell/Hold). |
| Phase 5 (Portfolio Manager Final Decision) | At least 1 paragraph executive summary. Time horizon explicit. |
| Phase 6/7 (Options Strategy) | Specific structure named, specific strikes/expiry, premium estimate, risk budget, breakeven, **honest exit clause**. The exit clause is not optional. |

**Anti-pattern: "conclusion as argument".** Phrases like "thesis intact", "论据完整", "trade working as designed" are conclusions, not arguments. They belong in Phase 5 (final synthesis) only. In Phase 1 and Phase 2, every claim must be supported by a specific number, fact, price level, or quote — the framework's "evidence first" invariant. If the only available evidence is "no new information today", say that explicitly and then explain what the absence of new information means for the standing thesis.

**Length isn't the goal but it's a useful tripwire.** A NON-MATERIAL body shorter than 30 lines (each language) almost certainly fails the minimum-content rules above; check it. A MATERIAL body shorter than 60 lines almost certainly does too.

---

## Phase 6 · Web design sync (the step the user flagged as easily forgotten)

Whenever the data structure or content states change, verify the page renders correctly. Common changes that require page updates:

| Data change | Page surface to update |
| --- | --- |
| New ticker added | none — auto‑renders by `Object.keys(tickers)` |
| New category added | `window.CATEGORIES` taxonomy block |
| Rating changed for a ticker today | `change-flag` badge auto‑detects via prior‑date diff (no code change needed) |
| New top‑level data field | `index.html` render function update (e.g. `marketBrief` required new render code) |
| Per‑ticker timestamp display | `.stamp` class in card meta (already wired) |
| Breaking‑news visual indicator | new CSS class + render branch |

**Verification:** open `index.html` in a browser. Check:

1. Date dropdown shows the new date as default (newest first).
2. Home macro callout shows today's tape.
3. Lead Story card shows today's stance.
4. Each section grid shows tickers with current ratings.
5. Tickers with rating changes show the `change-flag` badge.
6. Detail pages show fresh `Trade date:` and `Last verifiable session:` matching the new date.
7. Decision History sidebar shows both prior and current entry.
8. Refreshed timestamp on each card matches the new audit time.

---

## Phase 7 · Memory log append

Append one pending entry to `tradingagents-skill/memory/trading_memory.md` for every ticker analyzed. Canonical shape:

```
[YYYY-MM-DD | TICKER | RATING | pending]

DECISION:
**Rating**: <rating>

**Executive Summary**: ...

**Investment Thesis**: ...

**Time Horizon**: ...

<!-- ENTRY_END -->
```

This is what `propagate()` would do in the real Python pipeline. The append is what enables the next same‑ticker run on a later date to fetch realised return and write a reflection.

---

## Phase 8 · Verification (do this before saying "done")

1. **Bash sanity check (best effort).** Run `node -e` parser if the bash mount is fresh. If stale, skip — the file tool view is authoritative.
2. **File tool spot check.** Read the last 20 lines of `data.js`. Confirm `})();` closes the new IIFE. Confirm no stray characters at EOF.
3. **Per‑ticker spot check.** Read 3 random tickers' EN body first 5 lines. Confirm:
   * `Trade date:` is today's date.
   * `Last verifiable session:` cites today's actual price (not yesterday's).
   * `refreshedAt` matches the new audit time.
4. **Browser open.** The user's open of `index.html` is the final verification. Anything that fails to render is a bug.

---

## Anti‑patterns (failures that triggered this document)

| Anti‑pattern | What goes wrong | Correct alternative |
| --- | --- | --- |
| Overwriting prior date entry's fields in place | History is destroyed; can't compare prior decisions | Always append a new date key |
| Cloning yesterday's body verbatim into today's date | Body says "Trade date: yesterday" inside an entry keyed as today; "Last verifiable session" references the day before yesterday | Write fresh body for every ticker, every day; non-material gets tighter version |
| Cloning yesterday's body + adding "morning audit" banner | Body still references stale prices; banner explains staleness instead of fixing it | Same fix — fresh body required |
| Cloning yesterday's body + injecting "same-day price snapshot" blockquote on top | Reader sees today's price in the snapshot, but the analysis below uses yesterday's grid; they don't match | Same fix — fresh body required |
| Fabricating timestamps ("let's say 09:20") | Timestamps don't match reality; user notices and loses trust | Run `date` and use the real wall‑clock time |
| Skipping breaking‑news scan | Missed material events (MSTR Saylor reversal) get cloned forward at the wrong rating | Always run Phase 2; classify every ticker MATERIAL or NON‑MATERIAL |
| Not updating tranche entry prices when price moved 5%+ | INTC tranche 1 at $95 looks ridiculous when stock closed $108 | Phase 4/5 rewrite mandates revised entry zones |
| Not updating page after data change | Rating change exists in data but invisible on home card | Phase 6 sync — check every visible surface |
| Treating `refreshedAt` as cosmetic | User correctly flags stale timestamps as a sign nothing was actually refreshed | Bump on every audit pass, every ticker |
| Updating `marketBrief.tagline` and `refreshedAt` but forgetting `marketBrief.body` | Lead-story card looks fresh but the article body still references the prior date's tape; reader clicks in and sees stale content | Treat `marketBrief.body` as a required mandatory rewrite every day, same as ticker bodies — Phase 3 checklist enforces this |
| Using insider jargon analogues without explanation ("SNOW analogue in execution", "Buffett-pillars failed", "1973 oil shock parallel") | Reader who doesn't know the historical case is confused; thinks the report is mistakenly mixing tickers (e.g. user asked "why is PLTR's report referencing SNOW") | Phase 4 hard rule #6 — every named historical analogue must be explained the first time it appears in a body or tagline; subsequent references can be shorter |

---

## Time budget reference

For a clean 15‑ticker daily refresh:

| Phase | Time |
| --- | --- |
| 0 Pre‑flight | 5 min |
| 1 Market data pull (parallel) | 10 min |
| 2 Breaking‑news scan (parallel) | 15 min |
| 3 Build new date IIFE skeleton | 5 min |
| 4 Rewrite material tickers (avg 3 to 5 of 15, full 7‑phase) | 30 to 60 min |
| 5 Rewrite non-material tickers (avg 10 to 12 of 15, tighter) | 30 to 50 min |
| 6 Web design sync | 5 to 15 min (only if structural change) |
| 7 Memory log append | 5 min |
| 8 Verification | 10 min |
| **Total** | **120 to 175 min** |

If you find yourself going much faster than this, you are skipping steps. The 2026‑05‑05 → 2026‑05‑06 → 2026‑05‑07 evolution went through three failure modes (overwrite-history, clone-with-banner, clone-with-snapshot) before settling on "all-fresh" as the only honest path. The total time is the cost of evidence-first analysis; don't apologize for it and don't shortcut it.

---

## Glossary

* **Material event:** earnings released, guide change, executive change, regulatory event, single‑day move ≥ 5%, M&A, or any management commentary that changes the underlying thesis.
* **Last verifiable session:** the most recently completed and reported trading session whose close price has been published. Pre‑market and during regular hours, this is yesterday's close. Post‑market and overnight, this is today's close.
* **Audit timestamp:** the wall‑clock time at which the daily refresh begins. Stamped on `lastRefreshed` and every ticker's `refreshedAt`. Format: `YYYY-MM-DD HH:MM ET`.
* **Clone path:** ticker carries forward unchanged from prior date except `refreshedAt`. Permitted only for non‑material tickers.
* **Rewrite path:** ticker gets a fresh 7‑phase body anchored to today's prices and news. Required for material tickers.
