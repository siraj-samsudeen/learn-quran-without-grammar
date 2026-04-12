#!/usr/bin/env python3
"""
generate-lesson-summary.py — Generate lesson summary JSON from root inventories.

Reads all picker-config.json files and root JSONs to produce a summary of
each lesson's verse selection state: how many scored, how many auto-picked,
word counts, phrase counts.

Outputs JSON to stdout or a file.

Usage:
  python3 tools/generate-lesson-summary.py > /tmp/lesson-summary.json
  python3 tools/generate-lesson-summary.py --output teacher/lesson-summary.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent


def load_root(key: str) -> dict:
    path = PROJECT / f"docs/roots/{key}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def get_auto_picks(root_data: dict, lesson_num: int, budget_phrases: int, budget_words: int) -> list[dict]:
    """Simulate the auto-assignment algorithm from SCORING.md."""
    verses = root_data.get("verses", [])

    # Filter: exclude used in earlier lessons
    candidates = [
        v for v in verses
        if not (v.get("status") == "used" and v.get("lesson", 999) < lesson_num)
    ]

    # Only scored verses can be auto-picked
    scored = [
        v for v in candidates
        if v.get("scores", {}).get("final") is not None
    ]

    # Rank by final score descending
    scored.sort(key=lambda v: v["scores"]["final"], reverse=True)

    # Take until budget exhausted
    picks = []
    total_words = 0
    for v in scored:
        wc = v.get("word_count") or len(v.get("arabic_full", "").split())
        if len(picks) >= budget_phrases:
            break
        if total_words + wc > budget_words:
            break
        picks.append(v)
        total_words += wc

    # Sort picks by word count (shortest first)
    picks.sort(key=lambda v: v.get("word_count") or len(v.get("arabic_full", "").split()))

    return picks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=str, help="Output file path")
    args = parser.parse_args()

    lessons_dir = PROJECT / "lessons"
    lesson_dirs = sorted(lessons_dir.glob("lesson-*"))

    lessons = []
    for ld in lesson_dirs:
        config_path = ld / "picker-config.json"
        if not config_path.exists():
            continue

        config = json.loads(config_path.read_text())
        ln = config["lesson_number"]
        seed = config.get("seed_phrase", {})

        # Gather current root stats
        current_roots = config.get("current_roots", [])
        recall_roots = config.get("recall_roots", [])
        targets = config.get("targets", {})

        learning_budget_phrases = targets.get("learning", 10)
        learning_budget_words = 100
        recall_budget_phrases = targets.get("recall", 5)
        recall_budget_words = 50

        # Auto-pick from current roots
        all_learning_picks = []
        root_stats = []
        for rk in current_roots:
            rd = load_root(rk)
            total_verses = len(rd.get("verses", []))
            scored_verses = sum(1 for v in rd.get("verses", [])
                                if v.get("scores", {}).get("final") is not None)
            forms = len(rd.get("forms", []))
            occurrences = rd.get("total_occurrences_in_quran", 0)

            picks = get_auto_picks(rd, ln, learning_budget_phrases, learning_budget_words)
            all_learning_picks.extend(picks)

            root_stats.append({
                "key": rk,
                "arabic": rd.get("root_word", ""),
                "three_letter": rd.get("three_letter_root", ""),
                "total_verses": total_verses,
                "scored_verses": scored_verses,
                "forms": forms,
                "occurrences": occurrences,
                "auto_picked": len(picks),
            })

        # Re-sort all learning picks by word count and trim to budget
        all_learning_picks.sort(key=lambda v: v.get("word_count") or len(v.get("arabic_full", "").split()))
        total_learning_words = 0
        trimmed_picks = []
        for v in all_learning_picks:
            wc = v.get("word_count") or len(v.get("arabic_full", "").split())
            if len(trimmed_picks) >= learning_budget_phrases:
                break
            if total_learning_words + wc > learning_budget_words:
                break
            trimmed_picks.append(v)
            total_learning_words += wc

        # Auto-pick recall
        all_recall_picks = []
        recall_per_root = -(-recall_budget_phrases // len(recall_roots)) if recall_roots else 0
        for rk in recall_roots:
            rd = load_root(rk)
            picks = get_auto_picks(rd, ln, recall_per_root, recall_budget_words)
            all_recall_picks.extend(picks)

        all_recall_picks.sort(key=lambda v: v.get("word_count") or len(v.get("arabic_full", "").split()))
        total_recall_words = sum(
            v.get("word_count") or len(v.get("arabic_full", "").split())
            for v in all_recall_picks[:recall_budget_phrases]
        )

        # Build pick details
        pick_details = []
        for i, v in enumerate(trimmed_picks):
            wc = v.get("word_count") or len(v.get("arabic_full", "").split())
            role = "anchor" if i == 0 else "learning"
            pick_details.append({
                "ref": v["ref"],
                "form": v.get("form", ""),
                "role": role,
                "word_count": wc,
                "final_score": v.get("scores", {}).get("final", 0),
                "arabic_short": (v.get("arabic_full", ""))[:60] + "…" if len(v.get("arabic_full", "")) > 60 else v.get("arabic_full", ""),
            })

        lessons.append({
            "lesson": ln,
            "slug": config["slug"],
            "title": config["title"],
            "seed_arabic": seed.get("arabic", ""),
            "seed_english": seed.get("english", ""),
            "current_roots": root_stats,
            "recall_root_count": len(recall_roots),
            "auto_picked_learning": len(trimmed_picks),
            "learning_word_count": total_learning_words,
            "auto_picked_recall": min(len(all_recall_picks), recall_budget_phrases),
            "recall_word_count": total_recall_words,
            "total_phrases": len(trimmed_picks) + min(len(all_recall_picks), recall_budget_phrases),
            "total_words": total_learning_words + total_recall_words,
            "picks": pick_details,
        })

    summary = {"generated": "auto", "lessons": lessons}

    output = json.dumps(summary, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        out_path = Path(args.output)
        if not out_path.is_absolute():
            out_path = PROJECT / out_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(output)
        print(f"OK   Wrote summary to {out_path.relative_to(PROJECT)}", file=sys.stderr)
    else:
        print(output)

    return 0


if __name__ == "__main__":
    sys.exit(main())
