"""End-to-end test: build Layer 1 tables from real data."""
import sqlite3
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1

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
