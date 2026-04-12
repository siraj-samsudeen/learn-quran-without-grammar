#!/usr/bin/env python3
"""
merge-t2-scores.py — Merge Tier 2 LLM scores into root inventory JSON.

Reads a scores JSON file with format:
[
  {
    "ref": "2:87",
    "story": {"score": 5, "reason": "..."},
    "familiarity": {"score": 3, "reason": "..."},
    "teaching_fit": {"score": 7, "reason": "..."}
  },
  ...
]

Merges into docs/roots/{root}.json and recomputes base/final scores.

Usage:
  python3 tools/merge-t2-scores.py --root rasul --scores /tmp/rasul-scores.json
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent


def compute_final(scores: dict) -> dict:
    """Recompute base and final from all dimensions."""
    length = scores.get("length") or 0
    form_freq = scores.get("form_freq") or 0
    form_dominance = scores.get("form_dominance") or 0
    curriculum = scores.get("curriculum") or 0

    story_obj = scores.get("story")
    fam_obj = scores.get("familiarity")
    fit_obj = scores.get("teaching_fit")

    story = story_obj["score"] if isinstance(story_obj, dict) else (story_obj or 0)
    fam = fam_obj["score"] if isinstance(fam_obj, dict) else (fam_obj or 0)
    fit = fit_obj["score"] if isinstance(fit_obj, dict) else (fit_obj or 0)

    base = length + form_freq + form_dominance + curriculum + story + fam + fit
    starred = scores.get("starred", False)
    fragment = scores.get("fragment", False)

    starred_score = base + (5 if starred else 0)
    final = round(starred_score * (0.7 if fragment else 1.0), 1)

    scores["base"] = base
    scores["final"] = final
    return scores


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge Tier 2 scores into root JSON")
    parser.add_argument("--root", required=True, help="Root key (e.g., rasul)")
    parser.add_argument("--scores", required=True, help="Path to scores JSON file")
    args = parser.parse_args()

    root_path = PROJECT / f"docs/roots/{args.root}.json"
    if not root_path.exists():
        print(f"ERR  Root '{args.root}' not found")
        return 1

    scores_path = Path(args.scores)
    if not scores_path.exists():
        print(f"ERR  Scores file not found: {args.scores}")
        return 1

    root_data = json.loads(root_path.read_text())
    score_entries = json.loads(scores_path.read_text())

    # Build lookup by ref
    score_map = {e["ref"]: e for e in score_entries}

    updated = 0
    for verse in root_data.get("verses", []):
        ref = verse["ref"]
        if ref not in score_map:
            continue

        entry = score_map[ref]
        scores = verse.setdefault("scores", {})

        # Merge Tier 2
        for dim in ("story", "familiarity", "teaching_fit"):
            if dim in entry:
                scores[dim] = entry[dim]

        # Merge starred/fragment if provided
        if "starred" in entry:
            scores["starred"] = entry["starred"]
        if "fragment" in entry:
            scores["fragment"] = entry["fragment"]

        # Recompute final
        compute_final(scores)

        # Also set word_count if provided
        if "word_count" in entry:
            verse["word_count"] = entry["word_count"]

        updated += 1

    root_path.write_text(json.dumps(root_data, ensure_ascii=False, indent=2) + "\n")
    print(f"OK   Merged {updated} scores into docs/roots/{args.root}.json")

    # Show top 15 by final score
    scored = [(v["ref"], v["scores"].get("final", 0), v.get("word_count", 0))
              for v in root_data["verses"] if v.get("scores", {}).get("final") is not None]
    scored.sort(key=lambda x: x[1], reverse=True)
    print(f"     Top 15 by final score:")
    for ref, final, wc in scored[:15]:
        print(f"       {ref:10s}  final={final:5.1f}  words={wc}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
