"""Phase A1 scoring: three universal dimensions per sentence.

D1: Σ(lemma_freq) / word_count — raw value (normalisation is query-time)
D2: Σ(unique content-lemma freq) / total_segments * 100 — raw value
D3: piecewise on word_count (deterministic; SCORING.md §D3)
"""
from __future__ import annotations

from pathlib import Path

from tools.quran_db.db import connect


# Function-word lemmas excluded from D2 (content coverage).
# From SCORING.md §D2. Uses diacritic orderings as the Kais-Dukes
# morphology file writes them. Simple lemmas (single consonant, no
# shadda) are byte-stable; longer ones with shadda may not perfectly
# match the file's lemma — that's OK, any unmatched function words
# just leak into D2 with a small inflation effect and the validators
# assert ranges not exact values.
FUNCTION_WORD_LEMMAS: frozenset[str] = frozenset({
    "و", "ال", "ل", "مِن", "ف", "ب", "ما", "لا", "إِلّا", "إِنّ",
    "فِي", "عَلَى", "إِلَى", "أَن", "أَنّ", "يا", "قَد", "ثُمَّ",
    "بَل", "لَم",
})


def compute_d3(word_count: int) -> float:
    """Piecewise length score. See SCORING.md §D3.

    1-2 → 4, 3-4 → 7, 5-8 → 10, 9-12 → 9, 13-15 → 6, 16-20 → 3, 21+ → 1
    """
    if word_count <= 2:
        return 4.0
    if word_count <= 4:
        return 7.0
    if word_count <= 8:
        return 10.0
    if word_count <= 12:
        return 9.0
    if word_count <= 15:
        return 6.0
    if word_count <= 20:
        return 3.0
    return 1.0


def build_lemma_frequency_table(db_path: Path) -> dict[str, int]:
    """Qur'an-wide frequency of each lemma (counted per morphology segment)."""
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT lemma, COUNT(*) c FROM morphology "
            "WHERE lemma IS NOT NULL GROUP BY lemma"
        ).fetchall()
    return {r["lemma"]: r["c"] for r in rows}


def compute_d1_raw_for_all_sentences(db_path: Path) -> None:
    """Populate sentence_scores_a1 with d1_raw (and placeholder zeros for
    d2_raw, d3). Subsequent steps fill those.

    D1 raw = Σ(lemma_freq for each morphology segment in the sentence's
    word range) / sentence.word_count
    """
    freq = build_lemma_frequency_table(db_path)
    with connect(db_path) as conn:
        rows = conn.execute("""
            SELECT s.id AS sid, m.lemma AS lemma, s.word_count AS wc
            FROM sentences s
            JOIN verses v ON v.ref = s.verse_ref
            JOIN morphology m
              ON m.surah = v.surah
             AND m.verse = v.verse
             AND m.word BETWEEN s.start_word AND s.end_word
        """).fetchall()

        totals: dict[int, float] = {}
        wcs: dict[int, int] = {}
        for r in rows:
            sid = r["sid"]
            wcs[sid] = r["wc"]
            if r["lemma"] is not None:
                totals[sid] = totals.get(sid, 0.0) + freq.get(r["lemma"], 0)

        # Sentences with no morphology hits (possible for verses without
        # any lemmas — unlikely but guard): d1_raw = 0.
        all_ids = [r["id"] for r in conn.execute("SELECT id, word_count FROM sentences")]
        inserts: list[tuple] = []
        for sid in all_ids:
            wc = wcs.get(sid, 0)
            d1_raw = totals.get(sid, 0.0) / wc if wc else 0.0
            inserts.append((sid, d1_raw, 0.0, 0.0))

        conn.executemany(
            "INSERT OR REPLACE INTO sentence_scores_a1 "
            "(sentence_id, d1_raw, d2_raw, d3) VALUES (?, ?, ?, ?)",
            inserts,
        )
        conn.commit()


def compute_d2_raw_for_all_sentences(db_path: Path) -> None:
    """D2 raw = Σ(unique content-lemma freq) / total_segments * 100.

    Per-sentence: take the SET of distinct content lemmas (not counting
    function words, not double-counting repeats within the sentence),
    sum their Qur'an-wide frequencies, divide by total segments, ×100.
    """
    freq = build_lemma_frequency_table(db_path)
    with connect(db_path) as conn:
        (total_segments,) = conn.execute(
            "SELECT COUNT(*) FROM morphology"
        ).fetchone()

        rows = conn.execute("""
            SELECT DISTINCT s.id AS sid, m.lemma AS lemma
            FROM sentences s
            JOIN verses v ON v.ref = s.verse_ref
            JOIN morphology m
              ON m.surah = v.surah
             AND m.verse = v.verse
             AND m.word BETWEEN s.start_word AND s.end_word
            WHERE m.lemma IS NOT NULL
        """).fetchall()

        per_sentence_sum: dict[int, float] = {}
        for r in rows:
            if r["lemma"] in FUNCTION_WORD_LEMMAS:
                continue
            per_sentence_sum[r["sid"]] = (
                per_sentence_sum.get(r["sid"], 0.0) + freq.get(r["lemma"], 0)
            )

        updates = [
            (per_sentence_sum.get(sid, 0.0) / total_segments * 100, sid)
            for (sid,) in conn.execute("SELECT id FROM sentences")
        ]
        conn.executemany(
            "UPDATE sentence_scores_a1 SET d2_raw = ? WHERE sentence_id = ?",
            updates,
        )
        conn.commit()


def compute_d3_for_all_sentences(db_path: Path) -> None:
    """Populate d3 by applying compute_d3() to sentences.word_count."""
    with connect(db_path) as conn:
        rows = conn.execute("SELECT id, word_count FROM sentences").fetchall()
        updates = [(compute_d3(r["word_count"]), r["id"]) for r in rows]
        conn.executemany(
            "UPDATE sentence_scores_a1 SET d3 = ? WHERE sentence_id = ?",
            updates,
        )
        conn.commit()


def score_all_sentences(db_path: Path) -> None:
    """Run all three dimensions in order. Idempotent (INSERT OR REPLACE)."""
    compute_d1_raw_for_all_sentences(db_path)
    compute_d2_raw_for_all_sentences(db_path)
    compute_d3_for_all_sentences(db_path)
