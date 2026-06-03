# Workflow Retrospective and Improvement Plan (post 6/1 round)

**Author:** Self-review after 6/1 remediation completed.
**Scope:** 5/22 EOD → 6/1 remediation. Six daily refresh rounds, ~$2.4M data.js, 13 historical date entries, 22 tickers + 1 valuation section.
**Status:** binding. The improvements below replace prior assumptions where they conflict.

---

## 1. What actually happened — round by round

| Round | Tickers | Time (wall) | Multi-agent at first publish | Final state | Key failure mode |
|---|---|---|---|---|---|
| 2026-05-22 | 20 | ~3 hours | 4/20 | 20/20 after remediation | "Single voice masquerading as multi-agent" — caught by user via diagnostic question |
| 2026-05-25 | 20 | ~2 hours | 20/20 | 20/20 | Several subagents wrote dict-bodies (phase_1_*) requiring normalize step |
| 2026-05-27 | 20 | ~2.5 hours | 20/20 | 20/20 | TCEHY JSON had fullwidth-quote breaking parse; AAPL had wrong top-level shape |
| 2026-05-31 | 22 | ~2 hours | 16/22 | 22/22 with 6 single-voice flagged | Session limit cascade; IBIT wrote flat schema (no body field) |
| 2026-06-01 | 22 | ~5 hours total | 2/22 | 22/22 after multi-stage remediation | API instability (`Stream idle timeout`, `Socket closed`); session limit hit twice; IBIT pattern repeated; Edit tool truncated a JS file mid-patch |

**Aggregate**: roughly 12-15 hours of wall time across 6 rounds, with at least 3 hours of that on remediation work (single-voice→multi-agent rebuilds, IBIT body reconstruction, normalize-step patches).

## 2. Failure modes ranked by cost

### 2.1 Subagent API instability (highest cost)
The single biggest waster of time on 6/1 was the subagent system itself: `Stream idle timeout - partial response received`, `Socket connection closed unexpectedly`, `Session limit reset 1:40pm`. Each failure required a full retry. Some tickers (TCEHY, BMNR, PLTR) required 2-3 attempts.

**Root cause hypothesis:** large parallel dispatches (5-10 subagents in one message) appear to overload the subagent infrastructure. The longest prompts (1700-2200 word target bands) seem to hit timeouts more often than the shorter ones.

### 2.2 Schema drift from subagents (recurring)
At least 6 distinct schema variations observed across rounds:
* Canonical: `{rating, tagline{en,zh}, keyRisk{en,zh}, horizon{en,zh}, body{en,zh STRING}, action{en,zh}}`
* Body-as-dict: `body: {en: {phase_1_situation: "...", phase_2_bull: "..."}, zh: {...}}`
* Flat-top-level: `{ticker, company, anchor_close, action, body: {en, zh STRING}}` (no rating/tagline/keyRisk at top)
* Flat-no-body: `{ticker, debate_en, debate_zh, key_levels, watch_signals, action}` (IBIT pattern — twice)
* TCEHY 5/27 had fullwidth quotes `"中国敞口"` that broke JSON parse
* AAPL 5/25 created a top-level `"zh": {body: "..."}` key instead of `body.zh`

**Each variation required a normalize step.** The python normalize_05XX.py / normalize_0601.py scripts are 80% of the codebase friction in this workflow.

### 2.3 ZH length spec ambiguity
The original spec said "EN 1500-2000 words, ZH 1500-2000 chars". Chinese characters are 2-3x denser than English words. Subagents either:
* Over-wrote ZH (4000+ chars when 1500-2000 was specified) — common in early rounds
* Under-wrote ZH (1000-1300 chars matching EN word count literally) — common in late rounds

Neither matches what was actually wanted, which is "equivalent content depth in both languages".

### 2.4 Macro pack indirect reference
Each subagent does `Read /sessions/.../macro_05XX.md` as its first tool call. Per-subagent: ~1 tool call + ~3K tokens of context. Across 20 subagents per round: 20 calls + 60K tokens of duplicated context.

**The macro pack should be inlined into each subagent prompt** rather than referenced.

### 2.5 Generator / Edit fragility
On 6/1 I tried to use `Edit` to modify a long JS file (gen_0601.js) and the file got truncated to 178 lines (the last `console.log` was cut mid-string, causing SyntaxError). Took several minutes to recover.

**Edit on large generated files is unsafe.** Prefer `Write` for full rewrites, or never edit generator scripts in place — generate them fresh each round.

### 2.6 Memory log narrative drift
The memory log entries are increasingly formulaic but written by hand each round. They could be generated programmatically from the data.js delta vs prior date.

## 3. What actually worked well

* **The IIFE clone-and-override pattern in data.js** is structurally clean. Splicing new entries after the prior IIFE's `})();` is reliable.
* **Pre-committed mechanical triggers** (USO Sell cover at $148, IBIT $50 calls CLOSE, etc.) fired correctly in real-time on 6/1. The framework's risk discipline saved a 5.3% gain from being given back.
* **Brief but real 5-role debate** (proven on 6/1 with 800-1100 word bodies): produced acceptable quality at ~30-50K subagent tokens versus 80-100K for the longer 1700-2200 word target. Quality difference is marginal; cost difference is 2x.
* **Two-pass dispatch** (most-material tickers first, then fill-in) is the right mental model.
* **WORKFLOW Hard Rule #9 80/20 standard is a binding constraint** that the user has consistently enforced. Remediation cost is the price of getting it right.

## 4. Concrete improvements (binding from next round forward)

### 4.1 Subagent prompt template — strict schema
Every subagent prompt MUST contain this exact JSON schema instruction (no improvisation):

```
OUTPUT: <absolute path> (OVERWRITE)
STRICT JSON, top-level keys EXACTLY:
  rating: one of "Buy" | "Overweight" | "Hold" | "Underweight" | "Sell" (string, no parens, no qualifiers)
  tagline: {en: STRING, zh: STRING}
  keyRisk: {en: STRING, zh: STRING}
  horizon: {en: STRING, zh: STRING}
  body:    {en: STRING markdown, zh: STRING markdown}    <-- both MUST be strings, NOT dicts
  action:  {en: STRING, zh: STRING}

Reject these shapes (do NOT emit):
  - body.en as a dict with phase_N_* keys
  - top-level "ticker"/"date"/"company" fields
  - top-level "debate_en"/"debate_zh"/"key_levels" fields without body field
  - rating with parens like "Hold (negative bias)" — strip qualifiers
  - fullwidth quotes inside string values (use ' or escape ")
```

### 4.2 Length tiers (per ticker classification)
| Tier | When | EN body | ZH body | Subagent token target |
|---|---|---|---|---|
| TIGHT | NON-MATERIAL, carry-forward thesis | 800 to 1100 words | 1500 to 2500 CJK chars | < 50K tokens |
| STANDARD | MATERIAL Hold or single-rating-change ticker | 1100 to 1500 words | 2500 to 3500 CJK chars | 50 to 70K tokens |
| FULL | Highest-conviction long, MATERIAL with binary in <7 days, post-print follow-up | 1500 to 2000 words | 3500 to 5000 CJK chars | 70 to 100K tokens |

**Default is TIGHT.** STANDARD or FULL is opt-in per ticker, justified by today's evidence.

### 4.3 Inline macro context (no file reads)
Each subagent prompt must inline the 5-8 line macro summary that the ticker needs, rather than asking the subagent to `Read /sessions/.../macro_05XX.md`. Saves a tool call and 3K context tokens per subagent.

Format:
```
MACRO 6/1 11:30 ET intraday:
* S&P 7,580.55 (+0.01%), Nasdaq 27,021 (+0.18%) record, Dow 50,901 (-0.26%)
* OIL +8%: WTI ~$94 on Iran 60-day truce NOT signed over weekend
* BTC $72,145 (-3% from 5/29), ETH $2,006 at $2K floor
* HK +0.67%, Tencent +2.4%, Xiaomi +2.1%
* Computex Taipei AI headlines, DELL/HPE/SMCI cohort follow-through

TICKER-SPECIFIC ANCHOR: <prior close>, <prior rating>, <today-relevant cross-read>
```

### 4.4 Dispatch batch ceiling: 3 in parallel
Empirical observation 5/22 to 6/1: parallel dispatches of 5-10 hit session limits / socket errors. 1-3 in parallel completed reliably.

**Hard rule:** dispatch no more than 3 subagents per message turn. If a dispatch fails, retry once with the same prompt before falling through to single-voice flag.

### 4.5 Generator script is a one-shot
Per refresh, write a fresh `gen_<DATE>.js` rather than editing a prior one. The generator is short (200 lines) and templated; rewriting is cheaper than patching.

Add at the end of every generator a self-validate block:
```js
// Validate
var d = window.REPORTS_DATA["<DATE>"];
var problems = [];
Object.keys(d.tickers).forEach(function(k){
  var t = d.tickers[k];
  if (!["Buy","Overweight","Hold","Underweight","Sell"].includes(t.rating)) problems.push(k + " bad rating: " + t.rating);
  if (typeof (t.body && t.body.en) !== "string") problems.push(k + " body.en not string");
  if (typeof (t.body && t.body.zh) !== "string") problems.push(k + " body.zh not string");
  if (!t.action || !t.action.en) problems.push(k + " missing action.en");
});
if (problems.length) { console.error("Validation:", problems); process.exit(1); }
console.log("Validated " + Object.keys(d.tickers).length + " tickers");
```

This catches the IBIT-style missing-body and the rating-with-qualifier issues before they reach the dashboard.

### 4.6 Memory log auto-draft
After the generator runs, auto-generate the memory log entry skeleton from the data.js diff vs prior date. Manual editing only for the executive summary paragraph.

### 4.7 Tiered fallback discipline
If a subagent fails twice, switch to TIGHT-tier single-voice fallback BUT:
* The fallback body must still cite the day's specific evidence (price, key cross-read, the binary in flight)
* The fallback flag is mandatory: `[Multi-agent debate not run for this refresh — single-voice fallback]`
* The 80/20 standard is met only if ≥17/22 (~80%) of tickers receive genuine multi-agent debates
* If fewer than 17/22, the round is FLAGGED in the brief stance line — not silently published

### 4.8 Pre-flight ticker tier classification (Phase 2 enhancement)
Before dispatch, the Phase 2 classification step must produce a 22-line table:
```
TICKER  TIER     RATIONALE (one line)
USO     FULL     pre-commit mechanical cover trigger likely fires
PDD     STANDARD post-print T+2, watch for buyback signal
GOOGL   FULL     highest-conviction long, AI capex chain confirmation extends
CRCL    TIGHT    no specific news, Fed-pinned float yield
...
```

This drives the per-ticker length-tier dispatch decision.

### 4.9 Don't use Edit on long generated files
Long auto-generated JS / Python files (gen_*.js, normalize_*.py) — always `Write` full file, never `Edit` segment-by-segment. The Edit tool has shown a truncation pattern on long files.

### 4.10 IBIT specifically
IBIT subagents have written the wrong schema (no body field) on 5/25, 5/31, 6/1 — 3 rounds in a row. Document this as a known issue. Either:
(a) hardcode an extra-explicit schema reminder in the IBIT prompt
(b) build a IBIT-specific fallback that knows how to reconstruct body from `debate_en`/`debate_zh`/`key_levels`

## 5. Updated time budget reference (replaces WORKFLOW.md Section 14)

For a clean 22-ticker daily refresh under the new tiering:

| Phase | Time |
|---|---|
| 0 Pre-flight + time check | 5 min |
| 1 Market data pull (parallel 4 searches) | 10 min |
| 2 Tier classification (22-line table) | 10 min |
| 3 Generator skeleton + macro/brief prose | 15 min |
| 4 Subagent dispatch (3-at-a-time, ~22 tickers × ~5 min each / 3 parallel = ~37 min) | 45 min (with retries) |
| 5 Normalize + validate | 5 min |
| 6 Web design sync | 0 to 10 min (only if structural change) |
| 7 Memory log append (auto-drafted) | 5 min |
| 8 Verification + sources | 10 min |
| **Total** | **105 to 130 min** |

This is ~30% faster than the prior 120 to 175 budget by virtue of TIGHT-tier default, inline macro, validation in generator, and bounded parallel dispatch.

## 6. The next round will use these rules

The next daily refresh will:
1. Use the TIGHT length default
2. Inline 5-8 line macro per subagent
3. Dispatch 3 parallel max
4. Generator runs self-validate before splice
5. Memory log auto-drafted from diff
6. Tier table emitted in Phase 2

If any of these slip, the round is FLAGGED, not silently published.
