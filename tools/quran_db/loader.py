"""Bulk-insert Layer 1 tables from parsed streams."""
from __future__ import annotations

from pathlib import Path

from tools.quran_db.db import connect
from tools.quran_db.parse import (
    parse_morphology_file,
    parse_sahih_file,
    parse_uthmani_file,
)
from tools.quran_db.waqf import split_verse_at_waqf


def load_layer1(
    db_path: Path,
    morphology: Path,
    uthmani: Path,
    sahih: Path,
    chunk_size: int = 5000,
) -> None:
    """Populate verses, translations, morphology tables. Safe to re-run
    on a freshly-initialised DB; will fail on duplicate keys if re-run
    on a populated DB (by design — caller should use a fresh DB)."""
    with connect(db_path) as conn:
        # verses
        conn.executemany(
            "INSERT INTO verses (ref, surah, verse, arabic) VALUES (?, ?, ?, ?)",
            (
                (f"{r['surah']}:{r['verse']}", r["surah"], r["verse"], r["arabic"])
                for r in parse_uthmani_file(uthmani)
            ),
        )
        # translations
        conn.executemany(
            "INSERT INTO translations (ref, english) VALUES (?, ?)",
            (
                (f"{r['surah']}:{r['verse']}", r["english"])
                for r in parse_sahih_file(sahih)
            ),
        )
        # morphology — chunked to keep peak memory low
        buf: list[tuple] = []
        for r in parse_morphology_file(morphology):
            buf.append(
                (
                    r["surah"], r["verse"], r["word"], r["segment"],
                    r["arabic"], r["pos"], r["features"], r["root"], r["lemma"],
                )
            )
            if len(buf) >= chunk_size:
                conn.executemany(
                    "INSERT INTO morphology (surah, verse, word, segment, arabic, pos, features, root, lemma) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    buf,
                )
                buf.clear()
        if buf:
            conn.executemany(
                "INSERT INTO morphology (surah, verse, word, segment, arabic, pos, features, root, lemma) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                buf,
            )
        conn.commit()


def populate_sentences(db_path: Path) -> None:
    """Read every verse, split at waqf, insert into sentences table."""
    with connect(db_path) as conn:
        rows = list(conn.execute("SELECT ref, arabic FROM verses"))
        inserts: list[tuple] = []
        for row in rows:
            ref = row["ref"]
            fragments = split_verse_at_waqf(row["arabic"])
            for f in fragments:
                inserts.append(
                    (ref, f["start_word"], f["end_word"], f["arabic"], f["word_count"])
                )
        conn.executemany(
            "INSERT INTO sentences (verse_ref, start_word, end_word, arabic, word_count) "
            "VALUES (?, ?, ?, ?, ?)",
            inserts,
        )
        conn.commit()
