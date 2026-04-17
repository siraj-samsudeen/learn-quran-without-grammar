"""Parsers for the three raw input files."""
from __future__ import annotations

from typing import Optional, TypedDict


class MorphRow(TypedDict):
    surah: int
    verse: int
    word: int
    segment: int
    arabic: str
    pos: str
    features: str
    root: Optional[str]
    lemma: Optional[str]


def parse_morphology_line(line: str) -> MorphRow:
    """Parse one tab-separated line from quran-morphology.txt.

    Format: `surah:verse:word:segment \\t arabic \\t pos \\t features`
    Features are pipe-separated; we extract ROOT:xxx and LEM:xxx if present.
    """
    ref, arabic, pos, features = line.rstrip("\n").split("\t")
    surah_s, verse_s, word_s, segment_s = ref.split(":")
    root: Optional[str] = None
    lemma: Optional[str] = None
    for token in features.split("|"):
        if token.startswith("ROOT:"):
            root = token[len("ROOT:"):]
        elif token.startswith("LEM:"):
            lemma = token[len("LEM:"):]
    return {
        "surah": int(surah_s),
        "verse": int(verse_s),
        "word": int(word_s),
        "segment": int(segment_s),
        "arabic": arabic,
        "pos": pos,
        "features": features,
        "root": root,
        "lemma": lemma,
    }
