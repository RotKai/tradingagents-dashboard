# Subagent Prompt Template — Canonical Form

**Status:** binding. Every per-ticker subagent dispatch must follow this template.
**Purpose:** prevent the schema-drift, length-mismatch, and API-overload patterns documented in `WORKFLOW_REVIEW_0601.md`.
**Companion files:** `WORKFLOW.md` (Phase 4 + Appendix A), `GENERATOR_TEMPLATE.js`, `ROUND_RUNBOOK.md`, `MEMORY_LOG_TEMPLATE.md`.

---

## 1. The 5-role debate — role definitions

Every subagent runs the same 5 roles. Each role has a fixed lens and brings specific kinds of data points. Do not collapse them into one voice.

| Role | Lens | Brings (data points) |
| --- | --- | --- |
| Bull Researcher | strongest case for upside | revenue/EPS surprise vectors, TAM expansion, new product/partnership data, leading-indicator beats, share gain evidence, valuation expansion levers |
| Bear Researcher | strongest case for downside | cohort/peer underperformance, channel checks turning, deceleration in lead indicators, valuation compression history, regulatory/legal risk, competitive displacement |
| Aggressive Risk | tactical asymmetric leverage angle | options pricing skew, IV-implied move vs realized, strikes/expirations that maximize convexity, short-dated catalyst structure, where current price gives best-case upside |
| Conservative Risk | capital preservation, worst-case framing | drawdown history, stop placement math, position-sizing under tail scenarios, "if I am wrong by 25% where do I exit", correlation under stress |
| Neutral Risk | base rates, mean reversion, "most likely outcome" | rolling N-day base rate of post-print moves, regression-to-mean targets, what happens in 80% of historical analogues, why both extremes are usually wrong |

**Synthesis layer (you, the subagent, as Research Manager + Portfolio Manager):**

* **Research Manager (Phase 3 synthesis)** — re-weight the 5 debate outputs against today's specific evidence. The output is NOT an average of opinions; it is a re-derivation that explicitly says "Bull's TAM point is real but the Bear's cohort data trumps it because X". Calibrate language to strength of evidence.
* **Portfolio Manager (Phase 5 decision)** — final rating, position size, horizon. Must explicitly note unchanged-vs-revised from prior date.

---

## 2. Template (copy verbatim, fill placeholders)

```
TICKER: <TICKER> (<short company name>)
DATE: 2026-MM-DD <session state, e.g. "Monday intraday 14:30 ET" / "Sunday weekend wrap">
TIER: TIGHT | STANDARD | FULL

MACRO 6 lines:
* <Index 1 close + move>
* <Index 2 close + move>
* <Macro driver of the day, one line>
* <Crypto / oil / FX>
* <HK or other regional if relevant>
* <Pending binary calendar item>

TICKER ANCHOR:
* prior close: <$X.XX> on <DATE>
* prior rating: <Buy/Overweight/Hold/Underweight/Sell>
* today-relevant cross-read: <one line specific to this ticker>
* standing thesis (prior round): <one sentence>
* standing key risk (prior round): <one sentence>

TASK: run 5-role debate (Bull, Bear, Aggressive risk, Conservative risk, Neutral risk). Each role contributes >=2 specific data points the others don't have. Synthesize as Research Manager + PM Final Decision. Conclude with options structure.

OUTPUT: <ABS_PATH>/t_<TICKER>_<DATE>.json — OVERWRITE if exists.

STRICT JSON schema, top-level keys EXACTLY these and no others:
{
  "rating":  "Buy" | "Overweight" | "Hold" | "Underweight" | "Sell",  // NO parens, NO qualifiers
  "tagline": {"en": "STRING", "zh": "STRING"},                        // one-line headline
  "keyRisk": {"en": "STRING", "zh": "STRING"},                        // one-line single biggest risk
  "horizon": {"en": "3 to 6 months", "zh": "3 到 6 个月"},             // time horizon for the call
  "body":    {"en": "STRING markdown", "zh": "STRING markdown"},      // both MUST be strings, NOT dicts
  "action":  {"en": "STRING", "zh": "STRING"}                         // price-conditional
}

REJECT these output shapes (do NOT emit):
* body.en or body.zh as a dict with phase_N_* keys -> instead, write ONE long markdown string with "## Phase 1", "## Phase 2", etc. headers inline
* top-level "ticker" / "company" / "date" / "session" / "anchor_close" / "debate_en" / "debate_zh" / "key_levels" / "watch_signals" fields -> these are NOT in the schema, omit them
* rating with parens like "Hold (negative bias)" / "Buy (high conviction)" -> strip qualifiers, use bare rating
* fullwidth quotes inside string values (will break JSON parse) -> use ' or escape

LENGTH BANDS (must hit these or it's a defect):
| Tier     | EN body (words)  | ZH body (CJK chars) |
| TIGHT    | 800 to 1100      | 1500 to 2500        |
| STANDARD | 1100 to 1500     | 2500 to 3500        |
| FULL     | 1500 to 2000     | 3500 to 5000        |

ACTION FORMAT (Hard Rule #7):
"At ~$<price>: <BUY/HOLD/TRIM/SELL/WAIT/ADD/COVER>. <one-line why>. Next trigger $<level>. Stop $<level>."

RULE #10 — RATING IS PRICE-CONDITIONAL, NOT A QUALITY GRADE (binding, added 2026-06-03 per user):
Rate the ticker on whether the CURRENT price is attractive, not on whether it is a good company. The rating and the action must point the SAME direction at today's price:
* action ADD / BUY at current price  -> rating may be Buy / Overweight
* action HOLD / WAIT (do not add here) -> rating must be Hold, even for a great franchise
* action TRIM / SELL                  -> rating Underweight / Sell
A "Buy" on a name you would NOT buy at today's price is the exact error this rule forbids. In Phase 5, justify the rating in terms of the current price (e.g. "Hold: thesis strong but +10% above the entry zone makes today's price unattractive"), not in terms of franchise quality alone.

RULE #11 — NO OPTIONS RECOMMENDATIONS (binding, added 2026-06-03 per user):
Do NOT include any options strategy section. The body ENDS at Phase 5. Omit implied-vol reads, strikes, spreads, premium estimates, and the old "Phase 6 Options Strategy" block entirely. Keep the action field to spot entries, stops, trims, and triggers only (no option structures).

BODY MARKDOWN STRUCTURE (both en and zh, identical headings):
# <TICKER> — <Name>

**Trade date:** YYYY-MM-DD <session> · **Last verifiable session:** YYYY-MM-DD close $XXX. [one-line context]

## Phase 1 · Same-day market read
[2 to 3 paragraphs anchored to today's price + macro deltas + ticker-specific events]

## Phase 2 · Bull vs Bear
**Bull researcher.** [1 paragraph, >=2 specific data points or numbers]

**Bear researcher.** [1 paragraph, >=2 specific data points or numbers]

## Phase 3 · Risk debate (3-way)
**Aggressive risk view.** [1-2 sentences, asymmetric leveraged angle]

**Conservative risk view.** [1-2 sentences, capital preservation framing]

**Neutral risk view.** [1-2 sentences, base-rate / mean-reversion]

**Manager synthesis.** [1 paragraph re-weighting against today's evidence]

## Phase 4 · Trader plan
* **Action:** see action field
* **Tranche entries:** $X / $Y
* **Stop loss:** $Z
* **Sizing:** % NAV

**FINAL TRANSACTION PROPOSAL: <BUY/HOLD/etc>**

## Phase 5 · Portfolio Manager Final Decision
**Rating: <RATING>** (<unchanged from PRIOR_DATE> | <revised from X on PRIOR_DATE>).

**Executive Summary.** [1 paragraph]

**Time Horizon:** ...

[The body ENDS at Phase 5. Do NOT add an options section — see Rule #11 below.]

RETURN: only the line "Wrote <path> (rating=<X>, EN <W> words, ZH <C> chars)". Do NOT echo the JSON. Do NOT recap thesis.
```

---

## 3. Worked example — TIGHT tier prompt for a Hold ticker

```
TICKER: CRCL (Circle Internet Group)
DATE: 2026-06-01 Monday intraday 14:30 ET
TIER: TIGHT

MACRO 6 lines:
* S&P 7,580.55 (+0.01%), Nasdaq 27,021 (+0.18%) record
* Dow 50,901 (-0.26%) defensive lag
* OIL +8%: WTI ~$94 on Iran 60-day truce NOT signed over weekend
* BTC $72,145 (-3% from 5/29), ETH $2,006 at $2K floor
* HK +0.67%, Tencent +2.4%, Xiaomi +2.1%
* Computex Taipei AI headlines, DELL/HPE/SMCI cohort follow-through

TICKER ANCHOR:
* prior close: $115 on 5/29 (estimate)
* prior rating: Hold
* today-relevant cross-read: oil shock structurally irrelevant to stablecoin float-yield economics; Fed funds 3.50-3.75% unchanged is the only direct driver
* standing thesis: float yield engine intact at Fed-on-hold; range bound
* standing key risk: Fed dovish surprise compresses float yield OR stablecoin regulatory shift

TASK: ... (as in section 2 template)

OUTPUT: /sessions/determined-vibrant-goldberg/mnt/outputs/t_CRCL_0601.json — OVERWRITE

STRICT JSON schema ... (as in section 2)

LENGTH: EN 800 to 1100 words, ZH 1500 to 2500 chars (TIGHT tier).

ACTION FORMAT: "At ~$115: HOLD. <one-line why>. Next trigger $X. Stop $Y."

RETURN: confirmation line only.
```

---

## 4. Why each rule exists

* **Schema strictness** — observed 6 distinct schema drifts across 5/22 to 6/1 rounds. Each required a Python normalize step. The strict schema eliminates that.
* **body MUST be string** — IBIT subagent wrote `body: null` with content scattered in `debate_en`/`debate_zh`/`key_levels` on 5/25, 5/31, 6/1 (3 rounds in a row). The subagent must concatenate sections into one markdown string.
* **No parens in rating** — INTC wrote "Hold (negative bias)" on 5/25 and 5/27, breaking the dashboard's RATING_TIER lookup. IBIT wrote "Hold-with-add-bias" on 5/25.
* **No fullwidth quotes** — TCEHY 5/27 had `"中国敞口"桶` mid-string that broke JSON.loads at character 10445.
* **Inline macro (no file Read)** — saves ~3K tokens × N subagents = significant. Earlier rounds had each subagent Read macro_<date>.md as its first tool call.
* **Length bands tied to tier** — proven 6/1 that TIGHT (800-1100 EN words) at 30 to 50K subagent tokens is ~half the cost of FULL (1500-2200 words) at 80 to 100K, with marginal quality difference for NON-MATERIAL tickers.
* **Return only confirmation** — saves output tokens. Echoing JSON or recapping thesis = wasted output budget.
* **Explicit role definitions (section 1)** — without them, subagents tend to collapse 5 roles into one synthesizing voice (the "single voice masquerading as multi-agent" failure mode caught on 5/22).

---

## 5. Anti-patterns observed (do NOT do)

| Anti-pattern | Round | Cost |
| --- | --- | --- |
| Body as dict `{phase_1_situation: "...", phase_2_bull: "..."}` | 5/25 APP MSTR INTC META; 5/31 multiple | Python normalize step required |
| Flat schema `{ticker, company, anchor_close, action, body}` | 5/25 PLTR USO BMNR TSLA BRKB IBIT TCEHY PDD | Top-level fields missing |
| `body: null` + content in `debate_en`/`debate_zh` | 5/25 IBIT, 5/31 IBIT, 6/1 IBIT | Manual reconstruction each time |
| Rating with qualifier `"Hold (negative bias)"` | 5/25 INTC, 5/27 INTC | Dashboard tier-color mismatch |
| Rating string `"Hold-with-add-bias"` | 5/25 IBIT | RATING_TIER missing key |
| Fullwidth quote inside string | 5/27 TCEHY | JSON parse error |
| AAPL: top-level `"zh": {body: "..."}` instead of body.zh | 5/22 | Manual edit fix |
| 10 parallel subagent dispatch | 5/27, 5/31, 6/1 | Session limit cascade, socket timeouts |
| 5 roles collapsed into one narrating voice | 5/22 (caught by user) | "single voice masquerading as multi-agent" — full remediation |

---

## 6. Recommended dispatch pattern (proven 6/1)

```
Batch 1 (3 parallel max): top-3 MATERIAL / FULL-tier tickers
Wait for all 3 confirmations
Batch 2 (3 parallel max): next 3 MATERIAL / STANDARD-tier
Wait
... continue in batches of 3 until done
On failure: retry once with TIGHT-tier downgrade; if second fail, single-voice fallback flagged
```

Never dispatch more than 3 subagents in one message. The empirical pattern from 5/27, 5/31, 6/1 is that 5 to 10 parallel hits session limits.

## 7. Defensive normalization in the generator

`GENERATOR_TEMPLATE.js` includes an `asString(v)` helper that converts body-as-dict into markdown string as a defensive last line. This handles the IBIT-style schema even when the subagent ignored the schema strictness rule. It does NOT excuse non-canonical output — the rule is still binding — but it prevents the round from failing.
