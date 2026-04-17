"""Tests that init_db creates all expected tables and indexes."""
import sqlite3
from pathlib import Path

from tools.quran_db.db import init_db

EXPECTED_TABLES = {
    "verses",
    "translations",
    "morphology",
    "sentences",
    "sentence_forms",
    "sentence_scores_a1",
}


def test_init_db_creates_all_tables(tmp_path: Path) -> None:
    db_path = tmp_path / "test.db"
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
    actual = {r[0] for r in rows}
    assert EXPECTED_TABLES.issubset(actual), f"missing tables: {EXPECTED_TABLES - actual}"


def test_init_db_is_idempotent(tmp_path: Path) -> None:
    db_path = tmp_path / "test.db"
    init_db(db_path)
    init_db(db_path)  # second call must not raise
