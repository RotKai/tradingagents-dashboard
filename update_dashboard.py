"""Append a new day's reports to data.js so the dashboard picks them up.

Usage
=====

    python update_dashboard.py 2026-05-12

The script expects a folder layout like::

    reports/
      index.html
      data.js
      update_dashboard.py
      2026-05-12/
        CRCL.md            English markdown report
        CRCL.zh.md         Chinese markdown report (optional but recommended)
        ORCL.md
        ORCL.zh.md
        PLTR.md
        PLTR.zh.md
        summary.md         English summary
        summary.zh.md      Chinese summary (optional)
        meta.json          {"tickers": {"CRCL": {"rating": "Hold", "title_en": ..., ...}}, "macro": {"en": ..., "zh": ...}}

It then injects an entry into ``data.js`` of the canonical shape consumed
by ``index.html``.  The script is idempotent: running twice for the same
date overwrites the existing entry rather than duplicating it.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict


HERE = Path(__file__).resolve().parent
DATA_JS = HERE / "data.js"


def read_md(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def js_string(text: str) -> str:
    """Render a Python string as a JS template literal payload, properly escaped."""
    return (
        text.replace("\\", "\\\\")
            .replace("`", "\\`")
            .replace("${", "\\${")
    )


def build_entry(date: str, day_dir: Path, meta: Dict[str, Any]) -> str:
    tickers_meta: Dict[str, Dict[str, Any]] = meta.get("tickers", {})
    parts: list[str] = []
    parts.append(f"window.REPORTS_DATA[\"{date}\"] = {{")

    macro = meta.get("macro") or {}
    parts.append(
        "  macro: { en: `"
        + js_string(macro.get("en", ""))
        + "`, zh: `"
        + js_string(macro.get("zh", ""))
        + "` },"
    )

    summary_en = read_md(day_dir / "summary.md")
    summary_zh = read_md(day_dir / "summary.zh.md") or summary_en
    parts.append(
        "  summary: {\n"
        f"    en: `{js_string(summary_en)}`,\n"
        f"    zh: `{js_string(summary_zh)}`\n"
        "  },"
    )

    parts.append("  tickers: {")
    ticker_items: list[str] = []
    for ticker, tmeta in tickers_meta.items():
        body_en = read_md(day_dir / f"{ticker}.md")
        body_zh = read_md(day_dir / f"{ticker}.zh.md") or body_en

        rating   = tmeta.get("rating", "Hold")
        title_en = tmeta.get("title_en", ticker)
        title_zh = tmeta.get("title_zh", title_en)
        tag_en   = tmeta.get("tagline_en", "")
        tag_zh   = tmeta.get("tagline_zh", tag_en)
        act_en   = tmeta.get("action_en", "")
        act_zh   = tmeta.get("action_zh", act_en)
        hor_en   = tmeta.get("horizon_en", "")
        hor_zh   = tmeta.get("horizon_zh", hor_en)
        risk_en  = tmeta.get("key_risk_en", "")
        risk_zh  = tmeta.get("key_risk_zh", risk_en)

        item = (
            f"    {ticker}: {{\n"
            f"      rating: {json.dumps(rating)},\n"
            f"      title:   {{ en: {json.dumps(title_en)}, zh: {json.dumps(title_zh)} }},\n"
            f"      tagline: {{ en: {json.dumps(tag_en)}, zh: {json.dumps(tag_zh)} }},\n"
            f"      action:  {{ en: {json.dumps(act_en)}, zh: {json.dumps(act_zh)} }},\n"
            f"      horizon: {{ en: {json.dumps(hor_en)}, zh: {json.dumps(hor_zh)} }},\n"
            f"      keyRisk: {{ en: {json.dumps(risk_en)}, zh: {json.dumps(risk_zh)} }},\n"
            f"      body: {{\n"
            f"        en: `{js_string(body_en)}`,\n"
            f"        zh: `{js_string(body_zh)}`\n"
            f"      }}\n"
            f"    }}"
        )
        ticker_items.append(item)
    parts.append(",\n".join(ticker_items))
    parts.append("  }")
    parts.append("};")
    return "\n".join(parts)


# Match an existing block for a date so re-running overwrites in place.
ENTRY_RE = re.compile(
    r"window\.REPORTS_DATA\[\"(\d{4}-\d{2}-\d{2})\"\]\s*=\s*\{.*?^\};",
    re.DOTALL | re.MULTILINE,
)


def upsert_entry(date: str, entry_js: str) -> None:
    text = DATA_JS.read_text(encoding="utf-8") if DATA_JS.exists() else (
        "window.REPORTS_DATA = window.REPORTS_DATA || {};\n"
    )

    found = False
    def replace_match(m: re.Match[str]) -> str:
        nonlocal found
        if m.group(1) == date:
            found = True
            return entry_js
        return m.group(0)

    new_text = ENTRY_RE.sub(replace_match, text)
    if not found:
        if not new_text.endswith("\n"):
            new_text += "\n"
        new_text += "\n" + entry_js + "\n"

    DATA_JS.write_text(new_text, encoding="utf-8")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Update data.js with a day's reports.")
    parser.add_argument("date", help="ISO date, e.g. 2026-05-12")
    parser.add_argument(
        "--dir",
        type=Path,
        default=None,
        help="Folder with that day's markdown files. Defaults to ./<date>.",
    )
    args = parser.parse_args(argv[1:])

    day_dir = args.dir or (HERE / args.date)
    if not day_dir.is_dir():
        print(f"folder not found: {day_dir}", file=sys.stderr)
        return 2

    meta_path = day_dir / "meta.json"
    if not meta_path.exists():
        print(f"meta.json not found in {day_dir}", file=sys.stderr)
        return 2
    meta = json.loads(meta_path.read_text(encoding="utf-8"))

    entry_js = build_entry(args.date, day_dir, meta)
    upsert_entry(args.date, entry_js)
    print(f"data.js updated for {args.date}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
