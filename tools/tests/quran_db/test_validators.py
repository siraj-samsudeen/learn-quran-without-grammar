"""Tests for all 25+ validators against a real-data Layer 1 DB."""
import sqlite3
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1
from tools.quran_db import validators as V

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


@pytest.fixture(scope="module")
def full_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db_path = tmp_path_factory.mktemp("dbs") / "full.db"
    init_db(db_path)
    load_layer1(
        db_path,
        morphology=DATA_DIR / "quran-morphology.txt",
        uthmani=DATA_DIR / "quran-uthmani.txt",
        sahih=DATA_DIR / "quran-trans-en-sahih.txt",
    )
    return db_path


def test_v1_verse_count(full_db: Path) -> None:
    ok, detail = V.v1_verse_count(full_db)
    assert ok, detail


def test_v2_morphology_count(full_db: Path) -> None:
    ok, detail = V.v2_morphology_count(full_db)
    assert ok, detail


def test_v3_translation_coverage(full_db: Path) -> None:
    ok, detail = V.v3_translation_coverage(full_db)
    assert ok, detail


def test_v4_no_orphan_morphology(full_db: Path) -> None:
    ok, detail = V.v4_no_orphan_morphology(full_db)
    assert ok, detail


def test_v5_root_count(full_db: Path) -> None:
    ok, detail = V.v5_root_count(full_db)
    assert ok, detail


def test_v6_uthmani_byte_match(full_db: Path) -> None:
    ok, detail = V.v6_uthmani_byte_match(full_db, DATA_DIR / "quran-uthmani.txt")
    assert ok, detail


def test_v7_no_duplicate_refs(full_db: Path) -> None:
    ok, detail = V.v7_no_duplicate_refs(full_db)
    assert ok, detail
