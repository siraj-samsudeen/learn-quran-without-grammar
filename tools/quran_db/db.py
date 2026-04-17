"""Database init helper."""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def init_db(db_path: Path) -> None:
    """Create all tables + indexes. Idempotent."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with sqlite3.connect(db_path) as conn:
        conn.executescript(sql)
        conn.commit()


def connect(db_path: Path) -> sqlite3.Connection:
    """Open a connection with foreign_keys ON + row_factory = sqlite3.Row.

    Caller is responsible for closing the connection (or using it as a
    context manager, which commits/rolls back but does not close).
    """
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn
