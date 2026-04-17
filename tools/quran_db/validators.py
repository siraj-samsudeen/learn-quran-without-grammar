"""Validators from the audit spec (docs/superpowers/specs/2026-04-17-picker-ux-audit-and-validators.md §7).

Each validator returns (ok: bool, detail: str). `detail` is always human-readable
and always populated — both on pass and fail — so the CLI can print it.
"""
from __future__ import annotations

from pathlib import Path

from tools.quran_db.db import connect
from tools.quran_db.parse import parse_uthmani_file


# ── Step 1: Parse raw data → Layer 1 ──────────────────────────────────────

def v1_verse_count(db_path: Path) -> tuple[bool, str]:
    """Expect exactly 6236 verses (the full Qur'an)."""
    with connect(db_path) as conn:
        (n,) = conn.execute("SELECT COUNT(*) FROM verses").fetchone()
    return (n == 6236, f"verses.count = {n} (expected 6236)")


def v2_morphology_count(db_path: Path) -> tuple[bool, str]:
    """Expect ~128K-131K morphology segments (actual ~130,030)."""
    with connect(db_path) as conn:
        (n,) = conn.execute("SELECT COUNT(*) FROM morphology").fetchone()
    ok = 128_000 <= n <= 131_000
    return (ok, f"morphology.count = {n} (expected 128000..131000)")


def v3_translation_coverage(db_path: Path) -> tuple[bool, str]:
    """Every verse has a translation."""
    with connect(db_path) as conn:
        (missing,) = conn.execute(
            "SELECT COUNT(*) FROM verses WHERE ref NOT IN (SELECT ref FROM translations)"
        ).fetchone()
    return (missing == 0, f"verses without translation = {missing}")


def v4_no_orphan_morphology(db_path: Path) -> tuple[bool, str]:
    """Every morphology row's (surah, verse) exists in verses."""
    with connect(db_path) as conn:
        (orphans,) = conn.execute(
            "SELECT COUNT(*) FROM morphology m "
            "LEFT JOIN verses v ON v.surah = m.surah AND v.verse = m.verse "
            "WHERE v.ref IS NULL"
        ).fetchone()
    return (orphans == 0, f"orphan morphology rows = {orphans}")


def v5_root_count(db_path: Path) -> tuple[bool, str]:
    """Audit spec says ~1651 distinct roots. Accept 1600-1700."""
    with connect(db_path) as conn:
        (n,) = conn.execute(
            "SELECT COUNT(DISTINCT root) FROM morphology WHERE root IS NOT NULL"
        ).fetchone()
    ok = 1_600 <= n <= 1_700
    return (ok, f"distinct roots = {n} (expected 1600..1700)")


def v6_uthmani_byte_match(db_path: Path, uthmani_path: Path) -> tuple[bool, str]:
    """verses.arabic matches quran-uthmani.txt byte-for-byte."""
    with connect(db_path) as conn:
        stored = {
            (r["surah"], r["verse"]): r["arabic"]
            for r in conn.execute("SELECT surah, verse, arabic FROM verses")
        }
    mismatches = 0
    for r in parse_uthmani_file(uthmani_path):
        if stored.get((r["surah"], r["verse"])) != r["arabic"]:
            mismatches += 1
    return (mismatches == 0, f"uthmani byte mismatches = {mismatches}")


def v7_no_duplicate_refs(db_path: Path) -> tuple[bool, str]:
    """No duplicate (surah, verse) pairs."""
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT ref, COUNT(*) c FROM verses GROUP BY ref HAVING c > 1"
        ).fetchall()
    return (len(rows) == 0, f"duplicate refs = {len(rows)}")
