# Trading Dashboard — File Map

**Purpose:** single authoritative entry point for understanding, running, and maintaining the daily refresh workflow that publishes to `index.html`.

The workflow has TWO concentric layers:
* **Outer layer (this folder, `reports/`)** — operational documents for the human/Claude orchestrating daily refreshes against the dashboard.
* **Inner layer (`tradingagents-skill/`)** — the Python TradingAgents framework (LangGraph) for programmatic per-ticker analysis.

The dashboard publishing workflow is run via the OUTER layer. The Python inner layer is the canonical reference for the 11-agent dialectic that the subagent prompts simulate.

---

## File map (outer layer — `reports/`)

| File | Purpose | When to touch |
| --- | --- | --- |
| `WORKFLOW.md` | Binding workflow specification with hard rules (#7 action format, #8 fresh derivation, #9 80/20 standard) | Reference always; update if a hard rule changes |
| `WORKFLOW_REVIEW_0601.md` | Retrospective on 5/22 to 6/1 rounds + improvement plan | Reference for lessons learned |
| `ROUND_RUNBOOK.md` | Step-by-step cookbook for one refresh (Steps 0 to 8) | Open at the start of every round |
| `SUBAGENT_TEMPLATE.md` | Canonical per-ticker subagent prompt format + 5-role definitions + schema-strict rules | Copy verbatim per ticker |
| `GENERATOR_TEMPLATE.js` | Parameterized data.js writer with pre- and post-splice validation | Copy to `gen_<DATE>.js` per round |
| `MEMORY_LOG_TEMPLATE.md` | Memory log entry skeletons (round summary, per-ticker, scope-flag, remediation) | Copy at Step 7 of every round |
| `data.js` | All daily entries (append-only history), categories taxonomy | Touched only via `gen_<DATE>.js` (never edit by hand) |
| `index.html` | Dashboard renderer (vanilla JS + marked for markdown) | Touch only on structural change (new category, new top-level field, new route) |
| `README.md` | Brief project README | Reference |
| `DEPLOY.md` | Hosting / deployment notes | Reference on deploy |

## File map (inner layer — `tradingagents-skill/`)

| File | Purpose |
| --- | --- |
| `SKILL.md` | Python framework documentation, agent roster, self-LLM mode |
| `ARCHITECTURE.md` | Architecture diagram + invariants |
| `README.md` | Project README |
| `tradingagents/` | LangGraph Python package |
| `examples/run_analysis.py` | Runnable example |
| `memory/trading_memory.md` | Durable decision log (append-only) |
| `requirements.txt` | Python deps |
| `data_cache/` | yfinance / API response cache |

---

## Run order for a daily refresh

Follow `ROUND_RUNBOOK.md` Steps 0 to 8. The dependency graph:

```
                Step 0  Pre-flight
                       |
            Step 1  Macro data pull (parallel WebSearch)
                       |
            Step 2  Tier classification (22-line table)
                       |
            Step 3  Subagent dispatch (3-at-a-time, SUBAGENT_TEMPLATE)
                       |
            Step 4  Normalize (`normalize_<DATE>.py`)
                       |
            Step 5  Splice + validate (`gen_<DATE>.js` from GENERATOR_TEMPLATE)
                       |
            Step 6  Web design sync (only if structural change in index.html)
                       |
            Step 7  Memory log append (from MEMORY_LOG_TEMPLATE)
                       |
            Step 8  Final verification + handoff
```

Total budget: 105 to 130 minutes for a clean 22-ticker EOD round.

---

## Concept map

```
                  WORKFLOW.md (the WHY: hard rules, phases, invariants)
                         |
                         | binds
                         v
  ROUND_RUNBOOK.md (the HOW: numbered steps with copy-paste)
   |        |             |              |               |
   |        v             v              v               v
   |  SUBAGENT_       GENERATOR_     MEMORY_LOG_    WORKFLOW_REVIEW_
   |  TEMPLATE.md    TEMPLATE.js    TEMPLATE.md     0601.md
   |  (per-ticker    (data.js       (memory entry   (lessons learned)
   |   prompt)        writer)        skeletons)
   |
   |  dispatched           |              |
   |  subagent             writes         appended
   v  output               v              v
  /outputs/         data.js (history    tradingagents-skill/
  t_TICKER.json     append-only)         memory/trading_memory.md
                         |
                         | rendered by
                         v
                  index.html (dashboard)
```

---

## When to update which file

| Change | Update |
| --- | --- |
| Add a new ticker to the universe | `data.js` (new ticker object), `gen_<DATE>.js` ticker list, possibly `index.html` if new category needed |
| Add a new category to taxonomy | `data.js` `window.CATEGORIES` block, ticker's `.category` field |
| Add a new top-level field on the entry (like `valuationBrief` on 5/27) | `index.html` `renderHome()` for a card and a new `renderXxxx()` for detail route, `parseRoute()` for the new path |
| Change a hard rule | `WORKFLOW.md` (the rule body) and reference it in `SUBAGENT_TEMPLATE.md` if it affects prompts |
| Discover a new subagent schema-drift pattern | Add to `SUBAGENT_TEMPLATE.md` section 5 anti-patterns + add a normalize/defensive handler to `GENERATOR_TEMPLATE.js` |
| Find a process improvement | Add to `WORKFLOW_REVIEW_0601.md` (or a new dated review file) and propagate to `WORKFLOW.md` / `ROUND_RUNBOOK.md` |

---

## The 80/20 hard standard — the framework's binding constraint

* `WORKFLOW.md` Rule #9 requires that ≥17/22 tickers receive genuine multi-agent debate per round.
* Single-voice fallbacks (>5 of them) MUST be flagged with a `[Multi-agent debate not run]` banner per ticker AND a scope-flag entry in the memory log.
* Silent publication of single-voice-as-multi-agent is the worst process failure mode. The 5/22 round had this caught and remediated; the 6/1 round had it disclosed and remediated within the same day.

The framework's value depends entirely on the user trusting the scope flag. Never compromise that.
