"""Tests for parsing raw morphology / uthmani / sahih lines."""
from pathlib import Path

from tools.quran_db.parse import (
    parse_morphology_file,
    parse_morphology_line,
    parse_sahih_file,
    parse_uthmani_file,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


def test_parse_particle_with_prefix() -> None:
    # From real file: 1:1:1:1 \t بِ \t P \t P|PREF|LEM:ب
    result = parse_morphology_line("1:1:1:1\tبِ\tP\tP|PREF|LEM:ب")
    assert result == {
        "surah": 1,
        "verse": 1,
        "word": 1,
        "segment": 1,
        "arabic": "بِ",
        "pos": "P",
        "features": "P|PREF|LEM:ب",
        "root": None,
        "lemma": "ب",
    }


def test_parse_noun_with_root() -> None:
    # 1:2:1:2 \t حَمْدُ \t N \t ROOT:حمد|LEM:حَمْد|M|NOM
    result = parse_morphology_line("1:2:1:2\tحَمْدُ\tN\tROOT:حمد|LEM:حَمْد|M|NOM")
    assert result["root"] == "حمد"
    assert result["lemma"] == "حَمْد"
    assert result["pos"] == "N"
    assert result["surah"] == 1
    assert result["verse"] == 2
    assert result["word"] == 1
    assert result["segment"] == 2


def test_parse_verb_with_verb_form() -> None:
    # 1:5:2:1 \t نَعْبُدُ \t V \t IMPF|VF:1|ROOT:عبد|LEM:عَبَدَ|1P|MOOD:IND
    result = parse_morphology_line("1:5:2:1\tنَعْبُدُ\tV\tIMPF|VF:1|ROOT:عبد|LEM:عَبَدَ|1P|MOOD:IND")
    assert result["root"] == "عبد"
    assert result["lemma"] == "عَبَدَ"
    assert result["pos"] == "V"


def test_parse_no_lemma() -> None:
    # 1:6:1:2 \t نَا \t N \t PRON|SUFF|1P (no LEM)
    result = parse_morphology_line("1:6:1:2\tنَا\tN\tPRON|SUFF|1P")
    assert result["lemma"] is None
    assert result["root"] is None


def test_parse_morphology_file_full_count() -> None:
    """The canonical file should have ~128K-131K morphology segments."""
    rows = list(parse_morphology_file(DATA_DIR / "quran-morphology.txt"))
    assert 128_000 <= len(rows) <= 131_000, f"got {len(rows)}"
    # Spot check first row
    assert rows[0]["surah"] == 1 and rows[0]["verse"] == 1 and rows[0]["word"] == 1
    assert rows[0]["lemma"] == "ب"


def test_parse_uthmani_file_full_count() -> None:
    rows = list(parse_uthmani_file(DATA_DIR / "quran-uthmani.txt"))
    assert len(rows) == 6236
    first = rows[0]
    assert first["surah"] == 1 and first["verse"] == 1
    # Byte-exact Arabic is covered by v6_uthmani_byte_match in Task 5.
    # Here we assert structural shape only (Arabic diacritic byte-ordering
    # between NFC/NFD forms trips up literal comparison).
    assert first["arabic"].startswith("بِسْمِ")
    assert len(first["arabic"]) > 20


def test_parse_sahih_file_full_count() -> None:
    rows = list(parse_sahih_file(DATA_DIR / "quran-trans-en-sahih.txt"))
    assert len(rows) == 6236
    assert rows[0]["surah"] == 1 and rows[0]["verse"] == 1
    assert "In the name of Allah" in rows[0]["english"]
