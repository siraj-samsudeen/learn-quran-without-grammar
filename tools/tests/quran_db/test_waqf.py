"""Waqf detection + verse splitting."""
from tools.quran_db.waqf import WAQF_MARKS, find_waqf_positions, split_verse_at_waqf


AYAT_AL_KURSI = (
    "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ "
    "لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ "
    "لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ "
    "مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ ۚ "
    "يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ "
    "وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ ۚ "
    "وَسِعَ كُرْسِيُّهُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ ۖ "
    "وَلَا يَـُٔودُهُۥ حِفْظُهُمَا ۚ "
    "وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ"
)


def test_waqf_marks_constant() -> None:
    assert WAQF_MARKS == frozenset("\u06DA\u06D6\u06D7")  # ۚ ۖ ۗ


def test_find_waqf_positions_no_marks() -> None:
    text = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
    assert find_waqf_positions(text) == []


def test_find_waqf_positions_ayat_al_kursi() -> None:
    # 2:255 has 8 waqf marks → 9 sentences
    positions = find_waqf_positions(AYAT_AL_KURSI)
    assert len(positions) == 8, f"expected 8, got {len(positions)}"


def test_split_verse_short_no_waqf() -> None:
    text = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
    fragments = split_verse_at_waqf(text)
    assert len(fragments) == 1
    f = fragments[0]
    assert f["start_word"] == 1
    assert f["end_word"] == 4
    assert f["word_count"] == 4


def test_split_ayat_al_kursi_9_sentences() -> None:
    fragments = split_verse_at_waqf(AYAT_AL_KURSI)
    assert len(fragments) == 9
    assert fragments[0]["start_word"] == 1
    # Each sentence should have at least 3 words (Ayat al-Kursi's shortest is 3)
    for f in fragments:
        assert f["word_count"] >= 3, f
    # Contiguity: each fragment starts right after the previous one ended
    for prev, nxt in zip(fragments, fragments[1:]):
        assert nxt["start_word"] == prev["end_word"] + 1


def test_non_split_three_dots_mark_skipped() -> None:
    """ۛ U+06DB is stripped from output text and NOT counted as a word.
    Verse 2:2 has 7 real words with two ۛ pause marks interleaved."""
    text = "ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ"
    fragments = split_verse_at_waqf(text)
    assert len(fragments) == 1  # no splitting mark
    assert fragments[0]["word_count"] == 7, fragments[0]
    assert "ۛ" not in fragments[0]["arabic"]
