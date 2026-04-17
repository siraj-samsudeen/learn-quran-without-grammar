"""Tests for all 25+ validators against a real-data Layer 1 DB."""
import sqlite3
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1, populate_sentences
from tools.quran_db.narrow import populate_sentence_forms
from tools.quran_db import validators as V

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


@pytest.fixture(scope="module")
def full_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db_path = tmp_path_factory.mktemp("dbs") / "full.db"
    init_db(db_path)
    load_layer1(
        db_path,
        morphology=DATA_DIR / "quran-morphology.txt",
        uthmani=DATA_DIR / "quran-uthmani.txt",
        sahih=DATA_DIR / "quran-trans-en-sahih.txt",
    )
    return db_path


def test_v1_verse_count(full_db: Path) -> None:
    ok, detail = V.v1_verse_count(full_db)
    assert ok, detail


def test_v2_morphology_count(full_db: Path) -> None:
    ok, detail = V.v2_morphology_count(full_db)
    assert ok, detail


def test_v3_translation_coverage(full_db: Path) -> None:
    ok, detail = V.v3_translation_coverage(full_db)
    assert ok, detail


def test_v4_no_orphan_morphology(full_db: Path) -> None:
    ok, detail = V.v4_no_orphan_morphology(full_db)
    assert ok, detail


def test_v5_root_count(full_db: Path) -> None:
    ok, detail = V.v5_root_count(full_db)
    assert ok, detail


def test_v6_uthmani_byte_match(full_db: Path) -> None:
    ok, detail = V.v6_uthmani_byte_match(full_db, DATA_DIR / "quran-uthmani.txt")
    assert ok, detail


def test_v7_no_duplicate_refs(full_db: Path) -> None:
    ok, detail = V.v7_no_duplicate_refs(full_db)
    assert ok, detail


# ── Step 2 validator tests ────────────────────────────────────────────────

@pytest.fixture(scope="module")
def sentences_db(full_db: Path, tmp_path_factory: pytest.TempPathFactory) -> Path:
    import shutil
    p = tmp_path_factory.mktemp("dbs2") / "sentences.db"
    shutil.copy(full_db, p)
    populate_sentences(p)
    return p


@pytest.mark.parametrize("fn_name", [
    "v8_sentence_coverage",
    "v9_sentence_contiguity",
    "v10_word_reassembly",
    "v11_waqf_verse_ratio",
    "v12_length_distribution",
    "v13_ayat_al_kursi_9",
    "v14_al_baqarah_282_length",
    "v15_no_empty_sentences",
])
def test_step2_validator(sentences_db: Path, fn_name: str) -> None:
    fn = getattr(V, fn_name)
    ok, detail = fn(sentences_db)
    assert ok, detail


# ── Step 3 validator tests ────────────────────────────────────────────────

@pytest.fixture(scope="module")
def forms_db(sentences_db: Path, tmp_path_factory: pytest.TempPathFactory) -> Path:
    import shutil
    p = tmp_path_factory.mktemp("dbs3") / "forms.db"
    shutil.copy(sentences_db, p)
    populate_sentence_forms(p)
    return p


@pytest.mark.parametrize("fn_name", [
    "v16_per_root_form_counts",
    "v17_allah_exclusion_290",
    "v18_no_lost_forms",
    "v19_verse_cross_reference",
])
def test_step3_validator(forms_db: Path, fn_name: str) -> None:
    ok, detail = getattr(V, fn_name)(forms_db)
    assert ok, detail
