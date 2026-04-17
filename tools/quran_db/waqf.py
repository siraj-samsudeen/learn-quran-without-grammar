"""Waqf-mark detection and verse splitting.

Only the three splitting marks from the audit spec are recognised:
  ۚ U+06DA — Strong stop (end of thought)
  ۖ U+06D6 — Permissible stop
  ۗ U+06D7 — Preferred continue (gentle pause)

ۛ U+06DB ("three dots") is NOT a split boundary.
"""
from __future__ import annotations

from typing import TypedDict

WAQF_MARKS = frozenset("\u06DA\u06D6\u06D7")  # ۚ ۖ ۗ


class Fragment(TypedDict):
    start_word: int   # 1-based inclusive
    end_word: int     # inclusive
    arabic: str       # fragment with waqf marks removed + trimmed
    word_count: int


def find_waqf_positions(text: str) -> list[int]:
    """Return character indices of each waqf split mark in `text`."""
    return [i for i, ch in enumerate(text) if ch in WAQF_MARKS]


def split_verse_at_waqf(text: str) -> list[Fragment]:
    """Split a verse into waqf-delimited fragments.

    Invariants:
    - Every fragment has word_count >= 1
    - Concatenating fragments' word lists (in order) reconstructs the
      original word sequence (without waqf marks).
    - start_word / end_word are 1-based positions in the ORIGINAL verse's
      word sequence (with waqf marks removed).
    """
    # Waqf marks are whitespace-separated tokens in Tanzil Uthmani.
    words = text.split()
    fragments: list[Fragment] = []
    buffer: list[str] = []
    start_word = 1
    current_word = 0
    for tok in words:
        if tok in WAQF_MARKS:
            if buffer:
                fragments.append({
                    "start_word": start_word,
                    "end_word": current_word,
                    "arabic": " ".join(buffer),
                    "word_count": len(buffer),
                })
                buffer = []
                start_word = current_word + 1
        else:
            current_word += 1
            buffer.append(tok)
    if buffer:
        fragments.append({
            "start_word": start_word,
            "end_word": current_word,
            "arabic": " ".join(buffer),
            "word_count": len(buffer),
        })
    return fragments
