# TradingAgents Daily Report Dashboard

A self contained, browser openable, bilingual dashboard for the daily
analyst output produced by the TradingAgents framework.

Editorial style: the layout follows a Bloomberg/FT cover-and-article
shape. The home page lists every ticker covered for the active date as
cards; each card is a link to a dedicated article-style detail page
with a "Decision History" timeline pulled from prior days' coverage.

## What's here

```
reports/
  index.html              the dashboard
  data.js                 every day's reports embedded as JS
  update_dashboard.py     helper that appends a new day to data.js
  README.md               this file
  2026-05-05/             one folder per trade date
    CRCL.md               full English markdown
    ORCL.md
    PLTR.md
    summary.md
```

## Open the dashboard

Just double click `index.html` in any modern browser. No build step,
no server required. Internet connection is needed only for the marked.js
markdown library on first load (cached after that).

## Daily workflow

When a new run completes for a date (e.g. 2026-05-12):

1. Drop the markdown files into `reports/2026-05-12/`:
   * `CRCL.md`, `ORCL.md`, `PLTR.md`, `summary.md` (English)
   * `CRCL.zh.md`, `ORCL.zh.md`, `PLTR.zh.md`, `summary.zh.md` (Chinese, optional but recommended)
2. Add a `meta.json` in the same folder describing the rating, title,
   tagline, action, horizon, and key risk for each ticker plus a one
   line macro context. Template below.
3. Run:
   ```
   cd D:\tradingagents-skill\reports
   python update_dashboard.py 2026-05-12
   ```
4. Refresh the dashboard. The new date will show up in the date dropdown.

`update_dashboard.py` is idempotent. Running it twice for the same
date overwrites the entry rather than duplicating it.

## meta.json template

```json
{
  "macro": {
    "en": "One line macro context for the day in English.",
    "zh": "当日宏观一句话。"
  },
  "tickers": {
    "CRCL": {
      "rating": "Hold",
      "title_en": "Circle Internet Group",
      "title_zh": "Circle Internet 集团",
      "tagline_en": "Stablecoin issuer",
      "tagline_zh": "稳定币发行方",
      "action_en": "No new exposure pre print",
      "action_zh": "财报前不新增",
      "horizon_en": "1 to 3 months",
      "horizon_zh": "1 至 3 个月",
      "key_risk_en": "Soft Q1 print",
      "key_risk_zh": "Q1 偏弱"
    }
  }
}
```

## Design notes

* Single page application with hash routing:
  * `index.html#/` — home (cover) page for the active date
  * `index.html#/ticker/CRCL` — CRCL detail page for the active date
  * `index.html#/ticker/CRCL/2026-05-04` — CRCL on a specific past date
* Editorial typography: Source Serif body, Inter sans for chrome and
  metadata, JetBrains Mono for code. Light warm background, restrained
  brick accent, generous whitespace.
* Decision metadata (rating, action, horizon, key risk) renders as a
  stat strip beneath the headline, plus a sticky sidebar with the
  decision history timeline.
* Rating pill colour coding: green (Buy / Overweight), amber (Hold),
  red (Underweight / Sell).
* The decision history sidebar is automatic. Every date in `data.js`
  that contains the same ticker becomes a row in the sidebar; current
  date is highlighted; past dates are clickable.
* Language preference is persisted in `localStorage`.
* Markdown rendering is pure client side; no Python or server needed
  to view, just to update `data.js` with new days.

## Why a JS data file rather than fetching JSON

`file://` browsers block `fetch()` for security. Loading data via a
sibling `<script>` tag is the simplest way to keep the dashboard
double click openable on every OS without spinning up a local server.
