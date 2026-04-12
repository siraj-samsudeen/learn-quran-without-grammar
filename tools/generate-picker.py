#!/usr/bin/env python3
"""
generate-picker.py — Generate a lesson selection picker HTML from root JSONs.

Reads the picker template (tools/selection-picker/template.html), reads root
inventory JSONs (docs/roots/*.json), builds a LESSON_CONFIG, and writes a
self-contained picker HTML file.

Usage:
  python3 tools/generate-picker.py --lesson 3 \
    --anchor "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ" \
    --current-root rasul \
    --recall-root ilah --recall-root kabura --recall-root shahida \
    --output lessons/lesson-03-rasul/picker.html

Verses with status "used" in earlier lessons are excluded.
Verses with non-null scores get default section assignments (top N by
final score → learning). Unscored verses default to "none".
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent


def load_root(key: str) -> dict:
    path = PROJECT / f"docs/roots/{key}.json"
    if not path.exists():
        print(f"ERR  Root '{key}' not found at {path.relative_to(PROJECT)}")
        sys.exit(1)
    return json.loads(path.read_text())


def build_verses(root_data: dict, lesson_num: int, kind: str, targets: dict,
                  recall_slots: int = 2) -> list[dict]:
    """Build picker verse entries from a root JSON.

    kind: "current" or "recall"
    recall_slots: how many recall slots this root gets (targets.recall / num_recall_roots)
    """
    key = root_data["root_word_transliteration"]
    raw = root_data.get("verses", [])

    candidates = [
        v for v in raw
        if not (v.get("status") == "used" and v.get("lesson") is not None and v["lesson"] < lesson_num)
    ]

    scored = [v for v in candidates if v.get("scores") is not None]

    scored_refs_learning = set()
    scored_refs_recall = set()

    if kind == "current":
        target_learning = targets.get("learning", 10)
        if len(scored) >= target_learning:
            scored.sort(key=lambda v: v["scores"].get("final", 0), reverse=True)
            scored_refs_learning = {v["ref"] for v in scored[:target_learning]}
    else:
        if scored:
            scored.sort(key=lambda v: v["scores"].get("final", 0), reverse=True)
            scored_refs_recall = {v["ref"] for v in scored[:recall_slots]}

    entries = []
    for v in candidates:
        ref = v["ref"]
        score_obj = v.get("scores") or {}
        total = score_obj.get("final", 0)

        if ref in scored_refs_learning:
            default_section = "learning"
        elif ref in scored_refs_recall:
            default_section = "recall"
        elif v.get("status") == "pipeline":
            default_section = "pipeline"
        else:
            default_section = "none"

        arabic = v.get("arabic_fragment") or v.get("arabic_full", "")
        english = v.get("translation", "") or ""
        why = v.get("score_notes", "") or ""

        entries.append({
            "ref": ref,
            "group": key,
            "form": v.get("form", ""),
            "score": total,
            "defaultSection": default_section,
            "arabic": arabic,
            "english": english,
            "why": why,
            "word_count": v.get("word_count", 0),
            "surah_name": v.get("surah_name", ""),
        })

    return entries


def build_config(args) -> dict:
    lesson_num = args.lesson
    anchor = args.anchor or ""
    targets = {"learning": 10, "recall": 5}

    current_groups = []
    recall_groups = []
    all_verses = []

    for key in args.current_root:
        root_data = load_root(key)
        current_groups.append({
            "key": key,
            "arabic": root_data["root_word"],
            "title": f"{root_data['root_word']} — This lesson",
        })
        verses = build_verses(root_data, lesson_num, "current", targets)
        all_verses.extend(verses)

    recall_roots = args.recall_root or []
    recall_per_root = -(-targets["recall"] // len(recall_roots)) if recall_roots else 0
    for key in recall_roots:
        root_data = load_root(key)
        recall_groups.append({
            "key": key,
            "arabic": root_data["root_word"],
            "title": f"{root_data['root_word']} — Recall",
        })
        verses = build_verses(root_data, lesson_num, "recall", targets, recall_slots=recall_per_root)
        all_verses.extend(verses)

    return {
        "lesson_number": lesson_num,
        "anchor": anchor,
        "targets": targets,
        "current_groups": current_groups,
        "recall_groups": recall_groups,
        "verses": all_verses,
    }


def generate_html(config: dict, template_text: str) -> str:
    lesson_num = config["lesson_number"]
    anchor = config["anchor"]
    config_json = json.dumps(config, ensure_ascii=False, indent=2)

    pattern = re.compile(
        r'const LESSON_CONFIG = \{.*?^\};',
        re.DOTALL | re.MULTILINE
    )
    html = pattern.sub(f'const LESSON_CONFIG = {config_json};', template_text)

    html = re.sub(
        r'<title>.*?</title>',
        f'<title>Lesson {lesson_num} — Selection Picker</title>',
        html, count=1
    )
    html = re.sub(
        r'<h1>Lesson \d+</h1>',
        f'<h1>Lesson {lesson_num}</h1>',
        html, count=1
    )
    html = re.sub(
        r'<div class="sub">Anchor: .*?</div>',
        f'<div class="sub">Anchor: {anchor}</div>',
        html, count=1
    )

    return html


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate lesson selection picker HTML")
    parser.add_argument("--lesson", type=int, required=True, help="Lesson number")
    parser.add_argument("--anchor", type=str, default="", help="Anchor phrase (Arabic)")
    parser.add_argument("--current-root", action="append", required=True, help="Current lesson root key(s)")
    parser.add_argument("--recall-root", action="append", default=[], help="Recall root key(s)")
    parser.add_argument("--output", type=str, help="Output HTML path")
    args = parser.parse_args()

    template_path = PROJECT / "tools/selection-picker/template.html"
    if not template_path.exists():
        print(f"ERR  Template not found: {template_path.relative_to(PROJECT)}")
        return 1

    template_text = template_path.read_text()

    config = build_config(args)

    html = generate_html(config, template_text)

    if args.output:
        out_path = Path(args.output)
        if not out_path.is_absolute():
            out_path = PROJECT / out_path
    else:
        pad = str(args.lesson).zfill(2)
        out_path = PROJECT / f".workspace/lesson-{pad}/picker.html"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html)

    current_counts = {}
    recall_counts = {}
    for v in config["verses"]:
        group = v["group"]
        if any(g["key"] == group for g in config["current_groups"]):
            current_counts[group] = current_counts.get(group, 0) + 1
        else:
            recall_counts[group] = recall_counts.get(group, 0) + 1

    try:
        display_path = out_path.relative_to(PROJECT)
    except ValueError:
        display_path = out_path
    print(f"OK   Generated {display_path}")
    for key, count in current_counts.items():
        scored = sum(1 for v in config["verses"] if v["group"] == key and v["score"] > 0)
        print(f"     Current root: {key} ({count} candidates, {scored} scored)")
    for key, count in recall_counts.items():
        print(f"     Recall root:  {key} ({count} candidates)")
    print(f"     Total verses: {len(config['verses'])}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
