#!/usr/bin/env python3
"""Build tools/data/quran.db end-to-end from raw datasets.

Pipeline steps (order matters):
  1. init          — create schema
  2. layer1        — parse morphology / uthmani / sahih → verses / morphology / translations
  3. sentences     — split verses at waqf marks
  4. forms         — populate (sentence, root, lemma) mapping
  5. score         — compute D1/D2/D3 raw values

Usage:
  tools/build-quran-db.py --all                     # full rebuild
  tools/build-quran-db.py --all --db /tmp/q.db      # custom DB path
  tools/build-quran-db.py --step layer1             # run one step only
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1, populate_sentences
from tools.quran_db.narrow import populate_sentence_forms
from tools.quran_db.score_a1 import score_all_sentences


DEFAULT_DB = REPO_ROOT / "tools" / "data" / "quran.db"
DATA_DIR = REPO_ROOT / "tools" / "data"

STEPS = ["init", "layer1", "sentences", "forms", "score"]


def run_step(name: str, db_path: Path) -> None:
    print(f"[{name}] …", flush=True)
    if name == "init":
        init_db(db_path)
    elif name == "layer1":
        load_layer1(
            db_path,
            morphology=DATA_DIR / "quran-morphology.txt",
            uthmani=DATA_DIR / "quran-uthmani.txt",
            sahih=DATA_DIR / "quran-trans-en-sahih.txt",
        )
    elif name == "sentences":
        populate_sentences(db_path)
    elif name == "forms":
        populate_sentence_forms(db_path)
    elif name == "score":
        score_all_sentences(db_path)
    else:
        raise SystemExit(f"unknown step: {name}")
    print(f"[{name}] done", flush=True)


def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--db", type=Path, default=DEFAULT_DB, help="output SQLite path")
    p.add_argument("--all", action="store_true", help="run all steps")
    p.add_argument(
        "--step", choices=STEPS,
        help="run a single step (requires --db to exist for steps after 'init')",
    )
    args = p.parse_args()

    if not args.all and not args.step:
        p.error("pass --all or --step")

    if args.all:
        if args.db.exists():
            args.db.unlink()
        for s in STEPS:
            run_step(s, args.db)
    else:
        run_step(args.step, args.db)
    print(f"OK — {args.db}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
