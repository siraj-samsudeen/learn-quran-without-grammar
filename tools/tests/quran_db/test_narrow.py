"""Narrowing query: ilāh + kabura with اللَّه exclusion → ~290 sentences."""
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1, populate_sentences
from tools.quran_db.narrow import (
    get_allah_lemma,
    get_narrowed_pool,
    populate_sentence_forms,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


@pytest.fixture(scope="module")
def forms_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db = tmp_path_factory.mktemp("narrow") / "forms.db"
    init_db(db)
    load_layer1(
        db,
        morphology=DATA_DIR / "quran-morphology.txt",
        uthmani=DATA_DIR / "quran-uthmani.txt",
        sahih=DATA_DIR / "quran-trans-en-sahih.txt",
    )
    populate_sentences(db)
    populate_sentence_forms(db)
    return db


def test_narrow_ilah_alone(forms_db: Path) -> None:
    """All sentences touching root أله (includes اللَّه-dominated ones)."""
    ids = get_narrowed_pool(forms_db, roots=["أله"])
    assert len(ids) > 2000, f"got {len(ids)} — expected >2000 (includes اللَّه)"


def test_narrow_ilah_kabura_excluding_allah(forms_db: Path) -> None:
    """The 290-sentence pool from the audit spec."""
    allah = get_allah_lemma(forms_db)
    ids = get_narrowed_pool(
        forms_db, roots=["أله", "كبر"], exclude_only_lemmas={allah}
    )
    assert 270 <= len(ids) <= 320, f"got {len(ids)} — expected ~290"


def test_narrow_rasul_alone(forms_db: Path) -> None:
    """Rasul has no اللَّه-exclusion issue."""
    ids = get_narrowed_pool(forms_db, roots=["رسل"])
    assert 300 <= len(ids) <= 500, f"got {len(ids)} — audit says ~429 verses"
