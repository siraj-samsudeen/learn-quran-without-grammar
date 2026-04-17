"""Tests that init_db creates all expected tables, plus connect() wiring."""
import sqlite3
from pathlib import Path

from tools.quran_db.db import connect, init_db

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


def test_connect_enables_foreign_keys_and_row_factory(tmp_path: Path) -> None:
    db_path = tmp_path / "test.db"
    init_db(db_path)
    conn = connect(db_path)
    try:
        assert conn.execute("PRAGMA foreign_keys").fetchone()[0] == 1
        row = conn.execute("SELECT 'hello' AS greeting").fetchone()
        assert row["greeting"] == "hello"  # row_factory = sqlite3.Row
    finally:
        conn.close()
