"""Build the sentence_forms table + query-time narrowing helper."""
from __future__ import annotations

from pathlib import Path

from tools.quran_db.db import connect


def populate_sentence_forms(db_path: Path) -> None:
    """For each sentence, insert one row per distinct (root, lemma) whose
    morphology segments overlap the sentence's word range. Skips NULL
    roots and NULL lemmas (particles with no ROOT tag)."""
    with connect(db_path) as conn:
        conn.execute("""
            INSERT OR IGNORE INTO sentence_forms (sentence_id, root, lemma)
            SELECT DISTINCT s.id, m.root, m.lemma
            FROM sentences s
            JOIN verses v ON v.ref = s.verse_ref
            JOIN morphology m
              ON m.surah = v.surah
             AND m.verse = v.verse
             AND m.word BETWEEN s.start_word AND s.end_word
            WHERE m.root IS NOT NULL
              AND m.lemma IS NOT NULL
        """)
        conn.commit()


def get_narrowed_pool(
    db_path: Path,
    roots: list[str],
    exclude_only_lemmas: set[str] | None = None,
) -> list[int]:
    """Return sentence IDs containing any form from `roots`, optionally
    excluding sentences whose ONLY touched forms (across these roots) are
    in `exclude_only_lemmas`.

    Example (Lesson 1):
      get_narrowed_pool(db, roots=['أله', 'كبر'], exclude_only_lemmas={'<اللَّه>'})
      → ~290 sentences.
    """
    placeholders = ",".join("?" * len(roots))
    with connect(db_path) as conn:
        if not exclude_only_lemmas:
            rows = conn.execute(
                f"SELECT DISTINCT sentence_id FROM sentence_forms "
                f"WHERE root IN ({placeholders})",
                roots,
            ).fetchall()
            return [r[0] for r in rows]
        # Exclusion case: keep sentence iff it has at least one (root,lemma)
        # match where lemma NOT in exclude_only_lemmas.
        ex_placeholders = ",".join("?" * len(exclude_only_lemmas))
        rows = conn.execute(
            f"SELECT DISTINCT sentence_id FROM sentence_forms "
            f"WHERE root IN ({placeholders}) "
            f"  AND lemma NOT IN ({ex_placeholders})",
            roots + list(exclude_only_lemmas),
        ).fetchall()
        return [r[0] for r in rows]


def get_allah_lemma(db_path: Path) -> str:
    """Return the exact byte-form of the اللَّه lemma as stored in morphology.

    Written literals of اللَّه can use fatha-before-shadda ordering while the
    Tanzil/Kais-Dukes morphology file uses shadda-before-fatha. To avoid
    Unicode combining-mark-order issues in callers, look it up from the DB:
    it's the most common lemma under root 'أله' (always اللَّه)."""
    with connect(db_path) as conn:
        row = conn.execute(
            "SELECT lemma FROM morphology WHERE root = 'أله' "
            "GROUP BY lemma ORDER BY COUNT(*) DESC LIMIT 1"
        ).fetchone()
    if row is None:
        raise RuntimeError("no 'أله' root found — check Step 1 data load")
    return row["lemma"]
