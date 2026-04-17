"""Parsers for the three raw input files."""
from __future__ import annotations

from pathlib import Path
from typing import Iterator, Optional, TypedDict


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


class VerseRow(TypedDict):
    surah: int
    verse: int
    arabic: str


class TranslationRow(TypedDict):
    surah: int
    verse: int
    english: str


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


def parse_morphology_file(path: Path) -> Iterator[MorphRow]:
    """Stream-parse quran-morphology.txt. Skips the copyright/header lines
    (any line not starting with a digit)."""
    with path.open(encoding="utf-8") as f:
        for line in f:
            if not line or not line[0].isdigit():
                continue
            yield parse_morphology_line(line)


def parse_uthmani_file(path: Path) -> Iterator[VerseRow]:
    """Stream-parse quran-uthmani.txt. Format: `surah|verse|text`.
    Skips blank lines and any line starting with '#' (Tanzil footer)."""
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            surah_s, verse_s, arabic = line.split("|", 2)
            yield {"surah": int(surah_s), "verse": int(verse_s), "arabic": arabic}


def parse_sahih_file(path: Path) -> Iterator[TranslationRow]:
    """Stream-parse quran-trans-en-sahih.txt. Same pipe format as Uthmani."""
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            surah_s, verse_s, english = line.split("|", 2)
            yield {"surah": int(surah_s), "verse": int(verse_s), "english": english}
