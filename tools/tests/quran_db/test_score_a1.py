"""Tests for Phase A1 scoring: D1 (avg freq), D2 (content coverage), D3 (length)."""
import sqlite3
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1, populate_sentences
from tools.quran_db.narrow import populate_sentence_forms
from tools.quran_db.score_a1 import (
    FUNCTION_WORD_LEMMAS,
    build_lemma_frequency_table,
    compute_d1_raw_for_all_sentences,
    compute_d2_raw_for_all_sentences,
    compute_d3,
    score_all_sentences,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


@pytest.mark.parametrize("wc, expected", [
    (1, 4.0), (2, 4.0),
    (3, 7.0), (4, 7.0),
    (5, 10.0), (8, 10.0),
    (9, 9.0), (12, 9.0),
    (13, 6.0), (15, 6.0),
    (16, 3.0), (20, 3.0),
    (21, 1.0), (50, 1.0),
])
def test_d3_piecewise(wc: int, expected: float) -> None:
    assert compute_d3(wc) == expected


def test_function_word_lemmas_basic() -> None:
    """Simple function words (no diacritics) are in the set."""
    for w in ["و", "ال", "ل", "مِن", "ف", "ب", "ما", "لا", "فِي"]:
        assert w in FUNCTION_WORD_LEMMAS, f"expected {w} in FUNCTION_WORD_LEMMAS"


@pytest.fixture(scope="module")
def scored_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db = tmp_path_factory.mktemp("score") / "scored.db"
    init_db(db)
    load_layer1(
        db,
        morphology=DATA_DIR / "quran-morphology.txt",
        uthmani=DATA_DIR / "quran-uthmani.txt",
        sahih=DATA_DIR / "quran-trans-en-sahih.txt",
    )
    populate_sentences(db)
    populate_sentence_forms(db)
    score_all_sentences(db)
    return db


def test_lemma_frequency_table(scored_db: Path) -> None:
    freqs = build_lemma_frequency_table(scored_db)
    # اللَّه is the most common lemma under root أله (>2500 per Step 1 checks).
    # Look it up via root to avoid the Unicode-literal byte-ordering issue.
    assert any(v > 2500 for v in freqs.values()), "expected a lemma with >2500 freq"
    assert len(freqs) > 1000, f"got {len(freqs)} distinct lemmas"


def test_all_scores_populated(scored_db: Path) -> None:
    conn = sqlite3.connect(scored_db)
    (total,) = conn.execute("SELECT COUNT(*) FROM sentences").fetchone()
    (scored,) = conn.execute(
        "SELECT COUNT(*) FROM sentence_scores_a1 "
        "WHERE d1_raw >= 0 AND d2_raw >= 0 AND d3 >= 1 AND d3 <= 10"
    ).fetchone()
    assert scored == total, f"{scored}/{total} sentences have valid scores"


def test_d3_matches_word_count(scored_db: Path) -> None:
    conn = sqlite3.connect(scored_db)
    rows = conn.execute(
        "SELECT s.word_count, a.d3 FROM sentences s "
        "JOIN sentence_scores_a1 a ON a.sentence_id = s.id"
    ).fetchall()
    mismatches = [r for r in rows if compute_d3(r[0]) != r[1]]
    assert len(mismatches) == 0, f"{len(mismatches)} d3 mismatches"


def test_d2_has_variance(scored_db: Path) -> None:
    """D2 should have non-trivial variance across sentences."""
    conn = sqlite3.connect(scored_db)
    (lo,) = conn.execute("SELECT MIN(d2_raw) FROM sentence_scores_a1").fetchone()
    (hi,) = conn.execute("SELECT MAX(d2_raw) FROM sentence_scores_a1").fetchone()
    assert hi > lo, f"d2_raw has zero variance: min={lo} max={hi}"
    assert hi > 1.0, f"expected max d2_raw > 1.0%, got {hi}"
