#!/usr/bin/env python3
"""Run all quran.db validators and print a pass/fail table.

Exit code is 0 iff every validator passes.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from tools.quran_db import validators as V

DEFAULT_DB = REPO_ROOT / "tools" / "data" / "quran.db"

ALL_VALIDATORS = [
    # Step 1
    ("v1_verse_count", lambda db: V.v1_verse_count(db)),
    ("v2_morphology_count", lambda db: V.v2_morphology_count(db)),
    ("v3_translation_coverage", lambda db: V.v3_translation_coverage(db)),
    ("v4_no_orphan_morphology", lambda db: V.v4_no_orphan_morphology(db)),
    ("v5_root_count", lambda db: V.v5_root_count(db)),
    ("v6_uthmani_byte_match",
     lambda db: V.v6_uthmani_byte_match(db, REPO_ROOT / "tools/data/quran-uthmani.txt")),
    ("v7_no_duplicate_refs", lambda db: V.v7_no_duplicate_refs(db)),
    # Step 2
    ("v8_sentence_coverage", lambda db: V.v8_sentence_coverage(db)),
    ("v9_sentence_contiguity", lambda db: V.v9_sentence_contiguity(db)),
    ("v10_word_reassembly", lambda db: V.v10_word_reassembly(db)),
    ("v11_waqf_verse_ratio", lambda db: V.v11_waqf_verse_ratio(db)),
    ("v12_length_distribution", lambda db: V.v12_length_distribution(db)),
    ("v13_ayat_al_kursi_9", lambda db: V.v13_ayat_al_kursi_9(db)),
    ("v14_al_baqarah_282_length", lambda db: V.v14_al_baqarah_282_length(db)),
    ("v15_no_empty_sentences", lambda db: V.v15_no_empty_sentences(db)),
    # Step 3
    ("v16_per_root_form_counts", lambda db: V.v16_per_root_form_counts(db)),
    ("v17_allah_exclusion_290", lambda db: V.v17_allah_exclusion_290(db)),
    ("v18_no_lost_forms", lambda db: V.v18_no_lost_forms(db)),
    ("v19_verse_cross_reference", lambda db: V.v19_verse_cross_reference(db)),
    # Step 4
    ("v20_score_completeness", lambda db: V.v20_score_completeness(db)),
    ("v21_score_ranges", lambda db: V.v21_score_ranges(db)),
    ("v22_d3_determinism", lambda db: V.v22_d3_determinism(db)),
    ("v23_d1_raw_non_negative", lambda db: V.v23_d1_raw_non_negative(db)),
    ("v24_composite_spot_check", lambda db: V.v24_composite_spot_check(db)),
]


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = p.parse_args()
    if not args.db.exists():
        print(f"ERROR: {args.db} does not exist. Run build-quran-db.py first.", file=sys.stderr)
        return 2

    any_fail = False
    for name, fn in ALL_VALIDATORS:
        ok, detail = fn(args.db)
        mark = "PASS" if ok else "FAIL"
        print(f"[{mark}]  {name:<32}  {detail}")
        if not ok:
            any_fail = True

    print()
    print("FAIL" if any_fail else "ALL PASS")
    return 1 if any_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
