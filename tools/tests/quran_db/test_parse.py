"""Tests for parsing raw morphology / uthmani / sahih lines."""
from tools.quran_db.parse import parse_morphology_line


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
