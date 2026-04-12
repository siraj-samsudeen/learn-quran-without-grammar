#!/usr/bin/env python3
"""
sync-picker-configs-to-data.py — copy every
lessons/<lesson-slug>/picker-config.json into
_data/picker_configs/<lesson-slug>.json so Jekyll can read
lesson-level metadata (title, description, seed_phrase,
current_roots, targets, opening, closing, whats_next) via
site.data.picker_configs["<lesson-slug>"].

Jekyll's _data/ is build-time private, but picker-config.json
lives inside each lesson folder (per D22/D9 folder convention),
which is NOT under _data/. This script is the bridge. Run it
whenever a picker-config.json is edited.

Usage:
  tools/.venv/bin/python tools/sync-picker-configs-to-data.py

No arguments — it syncs every lessons/*/picker-config.json it
finds.

Output: one JSON file per lesson folder, e.g.
  _data/picker_configs/lesson-01-allahu-akbar.json
  _data/picker_configs/lesson-02-shahida.json

Jekyll access:
  {% assign cfg = site.data.picker_configs["lesson-01-allahu-akbar"] %}
  {{ cfg.title }}
  {{ cfg.opening | markdownify }}

Note: hyphens in the lesson-slug require bracket notation in
Liquid — dot notation would parse hyphens as subtraction.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent


def main() -> int:
    src_dir = PROJECT / "lessons"
    out_dir = PROJECT / "_data/picker_configs"

    if not src_dir.exists():
        print(f"ERR  {src_dir.relative_to(PROJECT)} not found")
        return 1

    out_dir.mkdir(parents=True, exist_ok=True)

    found = sorted(src_dir.glob("*/picker-config.json"))
    if not found:
        print(f"No picker-config.json files found under {src_dir.relative_to(PROJECT)}")
        return 1

    for pcfg in found:
        lesson_slug = pcfg.parent.name
        out_path = out_dir / f"{lesson_slug}.json"
        try:
            data = json.loads(pcfg.read_text())
        except json.JSONDecodeError as e:
            print(f"ERR  {lesson_slug}: invalid JSON — {e}")
            continue
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        print(f"OK   {lesson_slug}: wrote {out_path.relative_to(PROJECT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
