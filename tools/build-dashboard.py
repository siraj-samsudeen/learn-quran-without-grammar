#!/usr/bin/env python3
"""
build-dashboard.py — Rebuild teacher/local.html with embedded pipeline data.

Reads pipeline-status.json and lesson-summary.json, inlines them into the
dashboard HTML so it works as a local file:// page (no fetch needed).

Usage:
  python3 tools/build-dashboard.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent


def main() -> int:
    html_path = PROJECT / "teacher/local.html"
    status_path = PROJECT / "teacher/pipeline-status.json"
    summary_path = PROJECT / "teacher/lesson-summary.json"

    if not html_path.exists():
        print("ERR  teacher/local.html not found")
        return 1

    html = html_path.read_text()

    # Read data files
    status_json = status_path.read_text() if status_path.exists() else "{}"
    summary_json = summary_path.read_text() if summary_path.exists() else '{"lessons":[]}'

    # Replace the fetch block with inline data
    old_init = re.search(
        r'async function init\(\) \{.*?renderRoots\(\);\s*\}',
        html, re.DOTALL
    )

    if not old_init:
        print("ERR  Could not find init() function in local.html")
        return 1

    new_init = f"""function init() {{
  const status = {status_json.strip()};
  const summary = {summary_json.strip()};

  renderStats(status, summary);
  renderPipeline(status, summary);
  renderRoots();
}}"""

    html = html[:old_init.start()] + new_init + html[old_init.end():]

    html_path.write_text(html)
    print("OK   Rebuilt teacher/local.html with embedded data")
    return 0


if __name__ == "__main__":
    sys.exit(main())
