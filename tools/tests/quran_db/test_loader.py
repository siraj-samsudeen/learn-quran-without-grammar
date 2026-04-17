"""End-to-end test: build Layer 1 tables from real data."""
import sqlite3
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1, populate_sentences

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


@pytest.fixture(scope="module")
def layer1_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Module-scoped DB so we parse the 130K morphology rows only once."""
    db_path = tmp_path_factory.mktemp("dbs") / "layer1.db"
    init_db(db_path)
    load_layer1(
        db_path,
        morphology=DATA_DIR / "quran-morphology.txt",
        uthmani=DATA_DIR / "quran-uthmani.txt",
        sahih=DATA_DIR / "quran-trans-en-sahih.txt",
    )
    return db_path


def test_verses_count(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (count,) = conn.execute("SELECT COUNT(*) FROM verses").fetchone()
    assert count == 6236


def test_translations_coverage(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (count,) = conn.execute("SELECT COUNT(*) FROM translations").fetchone()
    assert count == 6236


def test_morphology_row_count(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (count,) = conn.execute("SELECT COUNT(*) FROM morphology").fetchone()
    assert 128_000 <= count <= 131_000, f"got {count}"


def test_morphology_has_roots_and_lemmas(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (root_count,) = conn.execute(
        "SELECT COUNT(DISTINCT root) FROM morphology WHERE root IS NOT NULL"
    ).fetchone()
    assert 1_600 <= root_count <= 1_700, f"got {root_count} distinct roots"


def test_ilah_root_is_extracted(layer1_db: Path) -> None:
    """The root 'أله' (alif-lam-ha, no diacritics so byte-stable) should
    have >2500 occurrences — dominated by اللَّه across the Qur'an."""
    conn = sqlite3.connect(layer1_db)
    (count,) = conn.execute(
        "SELECT COUNT(*) FROM morphology WHERE root = 'أله'"
    ).fetchone()
    assert count > 2500, f"expected >2500 occurrences of root 'أله', got {count}"


# ── Step 2: sentences table (populated by populate_sentences) ─────────────

@pytest.fixture(scope="module")
def sentences_db(layer1_db: Path, tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Reuse layer1_db but add sentences to it. Copy to avoid cross-test pollution."""
    import shutil
    db_path = tmp_path_factory.mktemp("dbs2") / "sentences.db"
    shutil.copy(layer1_db, db_path)
    populate_sentences(db_path)
    return db_path


def test_sentences_count_at_least_verse_count(sentences_db: Path) -> None:
    conn = sqlite3.connect(sentences_db)
    (n,) = conn.execute("SELECT COUNT(*) FROM sentences").fetchone()
    assert n >= 6236, f"got {n} sentences (expected >=6236)"


def test_ayat_al_kursi_9_sentences(sentences_db: Path) -> None:
    conn = sqlite3.connect(sentences_db)
    (n,) = conn.execute(
        "SELECT COUNT(*) FROM sentences WHERE verse_ref = '2:255'"
    ).fetchone()
    assert n == 9, f"2:255 produced {n} sentences (expected 9)"


def test_al_baqarah_282_around_17_sentences(sentences_db: Path) -> None:
    """Longest verse (2:282) should produce ~17 sentences per audit spec."""
    conn = sqlite3.connect(sentences_db)
    (n,) = conn.execute(
        "SELECT COUNT(*) FROM sentences WHERE verse_ref = '2:282'"
    ).fetchone()
    assert 14 <= n <= 20, f"2:282 produced {n} sentences (expected ~17)"


def test_al_fatiha_verse_1_one_sentence(sentences_db: Path) -> None:
    """Short verses with no waqf marks produce a single sentence."""
    conn = sqlite3.connect(sentences_db)
    rows = conn.execute(
        "SELECT start_word, end_word, word_count FROM sentences WHERE verse_ref = '1:1'"
    ).fetchall()
    assert len(rows) == 1
    assert rows[0] == (1, 4, 4)
