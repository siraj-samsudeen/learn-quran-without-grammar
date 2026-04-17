# Plan 1 — SQLite Data Layer + Validators

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `tools/data/quran.db` — a SQLite database of the full Qur'an with waqf-split sentences, per-root form mappings, and Phase A1 scores — verified by 25+ validators from the audit spec.

**Architecture:** Five-step Python pipeline parses `quran-morphology.txt` + `quran-uthmani.txt` + `quran-trans-en-sahih.txt` into Layer 1 tables (verses, morphology, translations), splits verses at waqf marks (ۛ ۚ ۖ ۗ) into a `sentences` table, builds a universal `sentence_forms` mapping (which lemmas/roots appear in each sentence), and scores every sentence on D1 (avg word freq), D2 (content coverage %), D3 (length sweet spot). **No InstantDB, no migration from JSONs** — those are later plans. Existing `docs/roots/*.json` are used only as validation reference for form counts.

**Tech Stack:** Python 3 stdlib (sqlite3, re), pytest, repo's existing `tools/.venv`. No new runtime deps beyond pytest.

**Authoritative specs:**
- [Picker UX Audit §7](../specs/2026-04-17-picker-ux-audit-and-validators.md#7--quran-db-prep-validators) — validator definitions (wins over original spec where they diverge)
- [Slice 1 Picker Spec §7–8](../specs/2026-04-17-slice-1-verse-picker-design.md#7--schema-additions-for-slice-1) — schema (sentences entity) + A1 scoring formulas
- [SCORING.md](../../SCORING.md) — D1/D2/D3 formulas, اللَّه exclusion, function-word list

**Out of scope for this plan:**
- InstantDB schema, seed, auth → Plan 2
- Any UI → Plan 3
- `migrate-json-to-sqlite.py` (preserving teacher's Tier-2 scores) → Plan 4
- Phase A2 (hookScore), B (curriculum), C (student state)

---

## File Structure

```
tools/
├── build-quran-db.py             # NEW — CLI entry (argparse). Runs steps 1-4 end-to-end.
├── validate-quran-db.py          # NEW — standalone validator runner (reads quran.db, prints pass/fail table)
├── quran_db/                     # NEW — package
│   ├── __init__.py
│   ├── schema.sql                # CREATE TABLE statements for all 5 tables
│   ├── parse.py                  # Step 1: parsers for morphology / uthmani / sahih
│   ├── waqf.py                   # Step 2: verse → sentences via waqf splitting
│   ├── narrow.py                 # Step 3: sentence_forms population
│   ├── score_a1.py               # Step 4: D1/D2/D3 + raw-value computation
│   └── validators.py             # All 25+ validator functions (one per audit-spec row)
├── requirements.txt              # MODIFY — add pytest
└── tests/                        # NEW
    └── quran_db/
        ├── __init__.py
        ├── fixtures/
        │   ├── sample_morphology.txt   # Extracted header of real file, <20 lines
        │   ├── sample_uthmani.txt
        │   └── sample_sahih.txt
        ├── test_parse.py
        ├── test_waqf.py
        ├── test_narrow.py
        ├── test_score_a1.py
        └── test_validators.py
```

**Why this split:** Each module maps 1:1 to a pipeline step from the audit spec (Steps 1–5). Validators live together so they can be run as one suite (`validate-quran-db.py`). Tests mirror module structure — a subagent working on `waqf.py` reads `test_waqf.py`, not a 2000-line monolith.

**Tables (all in `tools/data/quran.db`):**

| Table | Populated by | Rows |
|---|---|---|
| `verses` | Step 1 | 6,236 |
| `translations` | Step 1 | 6,236 |
| `morphology` | Step 1 | ~128,000-130,000 |
| `sentences` | Step 2 | ≥6,236 (waqf fragments) |
| `sentence_forms` | Step 3 | many — one row per (sentence, root, lemma) |
| `sentence_scores_a1` | Step 4 | one per sentence |

---

## Task 0: Package bootstrap + pytest setup

**Files:**
- Create: `tools/quran_db/__init__.py`
- Create: `tools/tests/__init__.py`
- Create: `tools/tests/quran_db/__init__.py`
- Modify: `tools/requirements.txt`

- [ ] **Step 1: Add pytest to requirements**

Edit `tools/requirements.txt` — current contents is just `pyyaml`. Change to:

```
pyyaml
pytest
```

- [ ] **Step 2: Create empty package files**

Run these three commands (empty files — Python uses them as package markers):

```bash
mkdir -p tools/quran_db tools/tests/quran_db tools/tests/quran_db/fixtures
touch tools/quran_db/__init__.py tools/tests/__init__.py tools/tests/quran_db/__init__.py
```

- [ ] **Step 3: Install pytest in the venv**

Run: `tools/.venv/bin/pip install pytest`
Expected: `Successfully installed pytest-...`

If `tools/.venv` doesn't exist, run `tools/install-hooks.sh` first (it creates the venv and installs deps).

- [ ] **Step 4: Verify pytest can discover the empty test package**

Run: `tools/.venv/bin/python -m pytest tools/tests/ --collect-only`
Expected: `no tests collected` (not an error — just no tests yet).

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/__init__.py tools/tests/__init__.py tools/tests/quran_db/__init__.py tools/requirements.txt
git commit -m "chore: bootstrap quran_db package + pytest harness"
```

---

## Task 1: SQLite schema

**Files:**
- Create: `tools/quran_db/schema.sql`
- Create: `tools/quran_db/db.py`
- Create: `tools/tests/quran_db/test_db.py`

- [ ] **Step 1: Write the failing test**

Create `tools/tests/quran_db/test_db.py`:

```python
"""Tests that init_db creates all expected tables and indexes."""
import sqlite3
from pathlib import Path

from tools.quran_db.db import init_db

EXPECTED_TABLES = {
    "verses",
    "translations",
    "morphology",
    "sentences",
    "sentence_forms",
    "sentence_scores_a1",
}


def test_init_db_creates_all_tables(tmp_path: Path) -> None:
    db_path = tmp_path / "test.db"
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
    actual = {r[0] for r in rows}
    assert EXPECTED_TABLES.issubset(actual), f"missing tables: {EXPECTED_TABLES - actual}"


def test_init_db_is_idempotent(tmp_path: Path) -> None:
    db_path = tmp_path / "test.db"
    init_db(db_path)
    init_db(db_path)  # second call must not raise
```

- [ ] **Step 2: Run test to verify it fails**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_db.py -v`
Expected: `ModuleNotFoundError: No module named 'tools.quran_db.db'`

- [ ] **Step 3: Write schema.sql**

Create `tools/quran_db/schema.sql`:

```sql
-- Layer 1: raw data parsed from morphology / uthmani / sahih
CREATE TABLE IF NOT EXISTS verses (
  ref TEXT PRIMARY KEY,           -- e.g. "2:255"
  surah INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  arabic TEXT NOT NULL,           -- Uthmani text including inline waqf marks
  UNIQUE(surah, verse)
);

CREATE TABLE IF NOT EXISTS translations (
  ref TEXT PRIMARY KEY,
  english TEXT NOT NULL,
  FOREIGN KEY (ref) REFERENCES verses(ref)
);

CREATE TABLE IF NOT EXISTS morphology (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  word INTEGER NOT NULL,
  segment INTEGER NOT NULL,
  arabic TEXT NOT NULL,
  pos TEXT NOT NULL,              -- P, N, V
  features TEXT NOT NULL,         -- raw "P|PREF|LEM:ب" etc.
  root TEXT,                      -- extracted from "ROOT:xxx"
  lemma TEXT,                     -- extracted from "LEM:xxx"
  UNIQUE(surah, verse, word, segment)
);
CREATE INDEX IF NOT EXISTS idx_morphology_root ON morphology(root);
CREATE INDEX IF NOT EXISTS idx_morphology_lemma ON morphology(lemma);
CREATE INDEX IF NOT EXISTS idx_morphology_verse ON morphology(surah, verse);

-- Step 2: waqf-delimited sentences
CREATE TABLE IF NOT EXISTS sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_ref TEXT NOT NULL,        -- "2:255"
  start_word INTEGER NOT NULL,    -- 1-based inclusive
  end_word INTEGER NOT NULL,      -- inclusive
  arabic TEXT NOT NULL,           -- fragment text (no waqf marks in content)
  word_count INTEGER NOT NULL,
  FOREIGN KEY (verse_ref) REFERENCES verses(ref),
  UNIQUE(verse_ref, start_word)
);
CREATE INDEX IF NOT EXISTS idx_sentences_verse ON sentences(verse_ref);

-- Step 3: sentence ↔ (root, lemma) many-to-many
CREATE TABLE IF NOT EXISTS sentence_forms (
  sentence_id INTEGER NOT NULL,
  root TEXT NOT NULL,
  lemma TEXT NOT NULL,
  PRIMARY KEY (sentence_id, root, lemma),
  FOREIGN KEY (sentence_id) REFERENCES sentences(id)
);
CREATE INDEX IF NOT EXISTS idx_sentence_forms_root ON sentence_forms(root);
CREATE INDEX IF NOT EXISTS idx_sentence_forms_lemma ON sentence_forms(lemma);

-- Step 4: Phase A1 universal scores (pre-normalization raw values)
CREATE TABLE IF NOT EXISTS sentence_scores_a1 (
  sentence_id INTEGER PRIMARY KEY,
  d1_raw REAL NOT NULL,           -- Σ(lemma_freq) / word_count
  d2_raw REAL NOT NULL,           -- Σ(unique content-lemma freq) / total_segments * 100
  d3 REAL NOT NULL,               -- piecewise on word_count (see SCORING.md)
  FOREIGN KEY (sentence_id) REFERENCES sentences(id)
);
```

- [ ] **Step 4: Write db.py**

Create `tools/quran_db/db.py`:

```python
"""Database init helper."""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def init_db(db_path: Path) -> None:
    """Create all tables + indexes. Idempotent."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with sqlite3.connect(db_path) as conn:
        conn.executescript(sql)
        conn.commit()


def connect(db_path: Path) -> sqlite3.Connection:
    """Open a connection with foreign_keys ON + row_factory dict-like."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_db.py -v`
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add tools/quran_db/schema.sql tools/quran_db/db.py tools/tests/quran_db/test_db.py
git commit -m "feat(quran_db): SQLite schema + init_db"
```

---

## Task 2: Parse morphology line → structured dict

**Files:**
- Create: `tools/quran_db/parse.py`
- Create: `tools/tests/quran_db/test_parse.py`

- [ ] **Step 1: Write the failing test**

Create `tools/tests/quran_db/test_parse.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_parse.py::test_parse_particle_with_prefix -v`
Expected: `ModuleNotFoundError: No module named 'tools.quran_db.parse'`

- [ ] **Step 3: Write parse.py (morphology-line function only)**

Create `tools/quran_db/parse.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_parse.py -v`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/parse.py tools/tests/quran_db/test_parse.py
git commit -m "feat(quran_db): parse_morphology_line"
```

---

## Task 3: Parse full files (morphology, uthmani, sahih)

**Files:**
- Modify: `tools/quran_db/parse.py`
- Modify: `tools/tests/quran_db/test_parse.py`

- [ ] **Step 1: Write failing tests**

Append to `tools/tests/quran_db/test_parse.py`:

```python
from pathlib import Path

from tools.quran_db.parse import (
    parse_morphology_file,
    parse_uthmani_file,
    parse_sahih_file,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


def test_parse_morphology_file_full_count() -> None:
    """The canonical file should have ~128K-130K morphology segments."""
    rows = list(parse_morphology_file(DATA_DIR / "quran-morphology.txt"))
    assert 128_000 <= len(rows) <= 130_000, f"got {len(rows)}"
    # Spot check first row
    assert rows[0]["surah"] == 1 and rows[0]["verse"] == 1 and rows[0]["word"] == 1
    assert rows[0]["lemma"] == "ب"


def test_parse_uthmani_file_full_count() -> None:
    rows = list(parse_uthmani_file(DATA_DIR / "quran-uthmani.txt"))
    assert len(rows) == 6236
    assert rows[0] == {"surah": 1, "verse": 1, "arabic": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"}


def test_parse_sahih_file_full_count() -> None:
    rows = list(parse_sahih_file(DATA_DIR / "quran-trans-en-sahih.txt"))
    assert len(rows) == 6236
    assert rows[0]["surah"] == 1 and rows[0]["verse"] == 1
    assert "In the name of Allah" in rows[0]["english"]
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_parse.py -v`
Expected: 3 new tests fail with `ImportError: cannot import name 'parse_morphology_file'`.

- [ ] **Step 3: Implement the three file parsers**

Append to `tools/quran_db/parse.py`:

```python
from pathlib import Path
from typing import Iterator, TypedDict


class VerseRow(TypedDict):
    surah: int
    verse: int
    arabic: str


class TranslationRow(TypedDict):
    surah: int
    verse: int
    english: str


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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_parse.py -v`
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/parse.py tools/tests/quran_db/test_parse.py
git commit -m "feat(quran_db): file-level parsers for morphology / uthmani / sahih"
```

---

## Task 4: Load Step 1 tables into SQLite

**Files:**
- Create: `tools/quran_db/loader.py`
- Create: `tools/tests/quran_db/test_loader.py`

- [ ] **Step 1: Write the failing test**

Create `tools/tests/quran_db/test_loader.py`:

```python
"""End-to-end test: build Layer 1 tables from real data."""
import sqlite3
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


@pytest.fixture(scope="module")
def layer1_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Module-scoped DB so we parse the 128K morphology rows only once."""
    db_path = tmp_path_factory.mktemp("dbs") / "layer1.db"
    init_db(db_path)
    load_layer1(
        db_path,
        morphology=DATA_DIR / "quran-morphology.txt",
        uthmani=DATA_DIR / "quran-uthmani.txt",
        sahih=DATA_DIR / "quran-trans-en-sahih.txt",
    )
    return db_path


def test_verses_count(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (count,) = conn.execute("SELECT COUNT(*) FROM verses").fetchone()
    assert count == 6236


def test_translations_coverage(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (count,) = conn.execute("SELECT COUNT(*) FROM translations").fetchone()
    assert count == 6236


def test_morphology_row_count(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (count,) = conn.execute("SELECT COUNT(*) FROM morphology").fetchone()
    assert 128_000 <= count <= 130_000, f"got {count}"


def test_morphology_has_roots_and_lemmas(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (root_count,) = conn.execute(
        "SELECT COUNT(DISTINCT root) FROM morphology WHERE root IS NOT NULL"
    ).fetchone()
    assert 1_600 <= root_count <= 1_700, f"got {root_count} distinct roots"


def test_allah_lemma_is_extracted(layer1_db: Path) -> None:
    conn = sqlite3.connect(layer1_db)
    (count,) = conn.execute(
        "SELECT COUNT(*) FROM morphology WHERE lemma = 'اللَّه'"
    ).fetchone()
    assert count > 2500, f"expected >2500 occurrences of اللَّه, got {count}"
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_loader.py -v`
Expected: `ModuleNotFoundError: No module named 'tools.quran_db.loader'`

- [ ] **Step 3: Implement the loader**

Create `tools/quran_db/loader.py`:

```python
"""Bulk-insert Layer 1 tables from parsed streams."""
from __future__ import annotations

from pathlib import Path

from tools.quran_db.db import connect
from tools.quran_db.parse import (
    parse_morphology_file,
    parse_sahih_file,
    parse_uthmani_file,
)


def load_layer1(
    db_path: Path,
    morphology: Path,
    uthmani: Path,
    sahih: Path,
    chunk_size: int = 5000,
) -> None:
    """Populate verses, translations, morphology tables. Safe to re-run
    on a freshly-initialised DB; will fail on duplicate keys if re-run
    on a populated DB (by design — caller should use a fresh DB)."""
    with connect(db_path) as conn:
        # verses
        conn.executemany(
            "INSERT INTO verses (ref, surah, verse, arabic) VALUES (?, ?, ?, ?)",
            (
                (f"{r['surah']}:{r['verse']}", r["surah"], r["verse"], r["arabic"])
                for r in parse_uthmani_file(uthmani)
            ),
        )
        # translations
        conn.executemany(
            "INSERT INTO translations (ref, english) VALUES (?, ?)",
            (
                (f"{r['surah']}:{r['verse']}", r["english"])
                for r in parse_sahih_file(sahih)
            ),
        )
        # morphology — chunked to keep peak memory low
        buf: list[tuple] = []
        for r in parse_morphology_file(morphology):
            buf.append(
                (
                    r["surah"], r["verse"], r["word"], r["segment"],
                    r["arabic"], r["pos"], r["features"], r["root"], r["lemma"],
                )
            )
            if len(buf) >= chunk_size:
                conn.executemany(
                    "INSERT INTO morphology (surah, verse, word, segment, arabic, pos, features, root, lemma) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    buf,
                )
                buf.clear()
        if buf:
            conn.executemany(
                "INSERT INTO morphology (surah, verse, word, segment, arabic, pos, features, root, lemma) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                buf,
            )
        conn.commit()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_loader.py -v`
Expected: 5 tests pass. First test (`layer1_db` fixture) may take 20-30s — it parses 128K rows.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/loader.py tools/tests/quran_db/test_loader.py
git commit -m "feat(quran_db): Step 1 loader — populate verses/translations/morphology"
```

---

## Task 5: Step 1 validators

**Files:**
- Create: `tools/quran_db/validators.py`
- Create: `tools/tests/quran_db/test_validators.py`

The seven Step 1 validators from audit spec §7 Step 1. Each validator returns a `(ok: bool, detail: str)` tuple. A `run_all_step1` helper lets the CLI invoke them in order.

- [ ] **Step 1: Write the failing test**

Create `tools/tests/quran_db/test_validators.py`:

```python
"""Tests for all 25+ validators. Uses the module-scoped layer1_db fixture
from test_loader.py via conftest (we duplicate the fixture here for clarity)."""
import sqlite3
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1
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
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_validators.py -v`
Expected: `ImportError: cannot import name 'v1_verse_count'`

- [ ] **Step 3: Implement the seven Step 1 validators**

Create `tools/quran_db/validators.py`:

```python
"""Validators from the audit spec (docs/superpowers/specs/2026-04-17-picker-ux-audit-and-validators.md §7).

Each validator returns (ok: bool, detail: str). `detail` is always human-readable
and always populated — both on pass and fail — so the CLI can print it.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Callable

from tools.quran_db.db import connect
from tools.quran_db.parse import parse_uthmani_file


# ── Step 1: Parse raw data → Layer 1 ──────────────────────────────────────

def v1_verse_count(db_path: Path) -> tuple[bool, str]:
    """Expect exactly 6236 verses (the full Qur'an)."""
    with connect(db_path) as conn:
        (n,) = conn.execute("SELECT COUNT(*) FROM verses").fetchone()
    return (n == 6236, f"verses.count = {n} (expected 6236)")


def v2_morphology_count(db_path: Path) -> tuple[bool, str]:
    """Expect ~128K-130K morphology segments."""
    with connect(db_path) as conn:
        (n,) = conn.execute("SELECT COUNT(*) FROM morphology").fetchone()
    ok = 128_000 <= n <= 130_000
    return (ok, f"morphology.count = {n} (expected 128000..130000)")


def v3_translation_coverage(db_path: Path) -> tuple[bool, str]:
    """Every verse has a translation."""
    with connect(db_path) as conn:
        (missing,) = conn.execute(
            "SELECT COUNT(*) FROM verses WHERE ref NOT IN (SELECT ref FROM translations)"
        ).fetchone()
    return (missing == 0, f"verses without translation = {missing}")


def v4_no_orphan_morphology(db_path: Path) -> tuple[bool, str]:
    """Every morphology row's (surah, verse) exists in verses."""
    with connect(db_path) as conn:
        (orphans,) = conn.execute(
            "SELECT COUNT(*) FROM morphology m "
            "LEFT JOIN verses v ON v.surah = m.surah AND v.verse = m.verse "
            "WHERE v.ref IS NULL"
        ).fetchone()
    return (orphans == 0, f"orphan morphology rows = {orphans}")


def v5_root_count(db_path: Path) -> tuple[bool, str]:
    """Audit spec says ~1651 distinct roots. Accept 1600-1700."""
    with connect(db_path) as conn:
        (n,) = conn.execute(
            "SELECT COUNT(DISTINCT root) FROM morphology WHERE root IS NOT NULL"
        ).fetchone()
    ok = 1_600 <= n <= 1_700
    return (ok, f"distinct roots = {n} (expected 1600..1700)")


def v6_uthmani_byte_match(db_path: Path, uthmani_path: Path) -> tuple[bool, str]:
    """verses.arabic matches quran-uthmani.txt byte-for-byte."""
    with connect(db_path) as conn:
        stored = {
            (r["surah"], r["verse"]): r["arabic"]
            for r in conn.execute("SELECT surah, verse, arabic FROM verses")
        }
    mismatches = 0
    for r in parse_uthmani_file(uthmani_path):
        if stored.get((r["surah"], r["verse"])) != r["arabic"]:
            mismatches += 1
    return (mismatches == 0, f"uthmani byte mismatches = {mismatches}")


def v7_no_duplicate_refs(db_path: Path) -> tuple[bool, str]:
    """No duplicate (surah, verse) pairs."""
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT ref, COUNT(*) c FROM verses GROUP BY ref HAVING c > 1"
        ).fetchall()
    return (len(rows) == 0, f"duplicate refs = {len(rows)}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_validators.py -v`
Expected: 7 tests pass (the fixture may take 20-30s).

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/validators.py tools/tests/quran_db/test_validators.py
git commit -m "feat(quran_db): Step 1 validators (7 checks from audit spec)"
```

---

## Task 6: Detect waqf marks in verse text

**Files:**
- Create: `tools/quran_db/waqf.py`
- Create: `tools/tests/quran_db/test_waqf.py`

Waqf marks in Unicode:
- `ۚ` U+06DA — Strong stop (SMALL HIGH JEEM)
- `ۖ` U+06D6 — Permissible stop (SMALL HIGH LIGATURE SAD WITH LAM WITH ALEF MAKSURA)
- `ۗ` U+06D7 — Preferred continue (SMALL HIGH LIGATURE QAF WITH LAM WITH ALEF MAKSURA)

Note: ۛ U+06DB ("three dots") seen in 2:2 is **NOT** one of the three splitting marks per the spec; it's the "THREE DOTS" ihmal mark (roughly "stop is permissible in one recitation tradition"). The audit spec lists only ۚ ۖ ۗ as boundaries. ۛ stays inline.

- [ ] **Step 1: Write the failing test**

Create `tools/tests/quran_db/test_waqf.py`:

```python
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
    # Al-Fatiha 1:1 has no waqf marks
    text = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
    assert find_waqf_positions(text) == []


def test_find_waqf_positions_ayat_al_kursi() -> None:
    # 2:255 has 8 waqf marks → 9 sentences
    positions = find_waqf_positions(AYAT_AL_KURSI)
    assert len(positions) == 8, f"expected 8, got {len(positions)}"


def test_split_verse_short_no_waqf() -> None:
    text = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
    fragments = split_verse_at_waqf(text)
    assert fragments == [
        {"start_word": 1, "end_word": 4, "arabic": text, "word_count": 4}
    ]


def test_split_ayat_al_kursi_9_sentences() -> None:
    fragments = split_verse_at_waqf(AYAT_AL_KURSI)
    assert len(fragments) == 9
    # Contiguity: first start_word == 1, last end_word == total words
    assert fragments[0]["start_word"] == 1
    # Each sentence should have at least 3 words (Ayat al-Kursi's shortest is 3)
    for f in fragments:
        assert f["word_count"] >= 3, f
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_waqf.py -v`
Expected: `ModuleNotFoundError: No module named 'tools.quran_db.waqf'`

- [ ] **Step 3: Implement waqf detection + splitting**

Create `tools/quran_db/waqf.py`:

```python
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
    # Normalise: split on whitespace. Waqf marks are stand-alone tokens
    # in the source — they're whitespace-separated in Tanzil Uthmani.
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
            # waqf marks carry no word index (they're not words)
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_waqf.py -v`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/waqf.py tools/tests/quran_db/test_waqf.py
git commit -m "feat(quran_db): waqf-mark detection + verse splitting"
```

---

## Task 7: Populate sentences table from all verses

**Files:**
- Modify: `tools/quran_db/loader.py`
- Modify: `tools/tests/quran_db/test_loader.py`

- [ ] **Step 1: Write the failing test**

Append to `tools/tests/quran_db/test_loader.py`:

```python
from tools.quran_db.loader import populate_sentences


@pytest.fixture(scope="module")
def sentences_db(layer1_db: Path, tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Reuse layer1_db but add sentences to it. Copy to avoid cross-test pollution."""
    import shutil
    db_path = tmp_path_factory.mktemp("dbs2") / "sentences.db"
    shutil.copy(layer1_db, db_path)
    populate_sentences(db_path)
    return db_path


def test_sentences_count_at_least_verse_count(sentences_db: Path) -> None:
    conn = sqlite3.connect(sentences_db)
    (n,) = conn.execute("SELECT COUNT(*) FROM sentences").fetchone()
    assert n >= 6236, f"got {n} sentences (expected >=6236)"


def test_ayat_al_kursi_9_sentences(sentences_db: Path) -> None:
    conn = sqlite3.connect(sentences_db)
    (n,) = conn.execute(
        "SELECT COUNT(*) FROM sentences WHERE verse_ref = '2:255'"
    ).fetchone()
    assert n == 9, f"2:255 produced {n} sentences (expected 9)"


def test_al_baqarah_282_around_17_sentences(sentences_db: Path) -> None:
    """Longest verse (2:282) should produce ~17 sentences per audit spec."""
    conn = sqlite3.connect(sentences_db)
    (n,) = conn.execute(
        "SELECT COUNT(*) FROM sentences WHERE verse_ref = '2:282'"
    ).fetchone()
    assert 14 <= n <= 20, f"2:282 produced {n} sentences (expected ~17)"


def test_al_fatiha_verse_1_one_sentence(sentences_db: Path) -> None:
    """Short verses with no waqf marks produce a single sentence."""
    conn = sqlite3.connect(sentences_db)
    rows = conn.execute(
        "SELECT start_word, end_word, word_count FROM sentences WHERE verse_ref = '1:1'"
    ).fetchall()
    assert len(rows) == 1
    assert rows[0] == (1, 4, 4)  # "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" has 4 words
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_loader.py::test_sentences_count_at_least_verse_count -v`
Expected: `ImportError: cannot import name 'populate_sentences'`

- [ ] **Step 3: Implement populate_sentences**

Append to `tools/quran_db/loader.py`:

```python
from tools.quran_db.waqf import split_verse_at_waqf


def populate_sentences(db_path: Path) -> None:
    """Read every verse, split at waqf, insert into sentences table."""
    with connect(db_path) as conn:
        rows = list(conn.execute("SELECT ref, arabic FROM verses"))
        inserts: list[tuple] = []
        for row in rows:
            ref = row["ref"]
            fragments = split_verse_at_waqf(row["arabic"])
            for f in fragments:
                inserts.append(
                    (ref, f["start_word"], f["end_word"], f["arabic"], f["word_count"])
                )
        conn.executemany(
            "INSERT INTO sentences (verse_ref, start_word, end_word, arabic, word_count) "
            "VALUES (?, ?, ?, ?, ?)",
            inserts,
        )
        conn.commit()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_loader.py -v`
Expected: all tests pass (4 new + prior).

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/loader.py tools/tests/quran_db/test_loader.py
git commit -m "feat(quran_db): Step 2 — populate sentences from waqf splits"
```

---

## Task 8: Step 2 validators

**Files:**
- Modify: `tools/quran_db/validators.py`
- Modify: `tools/tests/quran_db/test_validators.py`

Eight validators from audit §7 Step 2.

- [ ] **Step 1: Write failing tests**

Append to `tools/tests/quran_db/test_validators.py`:

```python
from tools.quran_db.loader import populate_sentences


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
    fn: Callable = getattr(V, fn_name)
    ok, detail = fn(sentences_db)
    assert ok, detail
```

(Note: Python imports are at the top of the file; `Callable` is from `typing` — add to the imports in this file.)

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_validators.py -v -k step2`
Expected: `AttributeError: module 'tools.quran_db.validators' has no attribute 'v8_sentence_coverage'`

- [ ] **Step 3: Implement the eight Step 2 validators**

Append to `tools/quran_db/validators.py`:

```python
# ── Step 2: Waqf fragmentation ────────────────────────────────────────────

def v8_sentence_coverage(db_path: Path) -> tuple[bool, str]:
    """Every verse produces >=1 sentence."""
    with connect(db_path) as conn:
        (missing,) = conn.execute(
            "SELECT COUNT(*) FROM verses v "
            "WHERE NOT EXISTS (SELECT 1 FROM sentences s WHERE s.verse_ref = v.ref)"
        ).fetchone()
    return (missing == 0, f"verses with 0 sentences = {missing}")


def v9_sentence_contiguity(db_path: Path) -> tuple[bool, str]:
    """For each verse, sentences' (start_word, end_word) ranges are contiguous
    with no gaps and no overlaps, starting at 1."""
    with connect(db_path) as conn:
        bad = 0
        cur = conn.execute(
            "SELECT verse_ref, start_word, end_word FROM sentences "
            "ORDER BY verse_ref, start_word"
        )
        last_ref = None
        expected_next = 1
        for row in cur:
            if row["verse_ref"] != last_ref:
                if row["start_word"] != 1:
                    bad += 1
                last_ref = row["verse_ref"]
            else:
                if row["start_word"] != expected_next:
                    bad += 1
            expected_next = row["end_word"] + 1
    return (bad == 0, f"sentences with gap/overlap = {bad}")


def v10_word_reassembly(db_path: Path) -> tuple[bool, str]:
    """Concatenating sentences for a verse (words only, no waqf marks)
    reconstructs the verse's word sequence."""
    from tools.quran_db.waqf import WAQF_MARKS
    mismatches = 0
    with connect(db_path) as conn:
        for v in conn.execute("SELECT ref, arabic FROM verses"):
            expected = " ".join(
                tok for tok in v["arabic"].split() if tok not in WAQF_MARKS
            )
            rows = conn.execute(
                "SELECT arabic FROM sentences WHERE verse_ref = ? ORDER BY start_word",
                (v["ref"],),
            ).fetchall()
            actual = " ".join(r["arabic"] for r in rows)
            if actual != expected:
                mismatches += 1
    return (mismatches == 0, f"word-reassembly mismatches = {mismatches}")


def v11_waqf_verse_ratio(db_path: Path) -> tuple[bool, str]:
    """Audit: ~50% of verses (3,100 ± 100) have >=2 sentences."""
    with connect(db_path) as conn:
        (n,) = conn.execute(
            "SELECT COUNT(*) FROM ("
            "  SELECT verse_ref, COUNT(*) c FROM sentences GROUP BY verse_ref HAVING c >= 2"
            ")"
        ).fetchone()
    ok = 3_000 <= n <= 3_200
    return (ok, f"verses with >=2 sentences = {n} (expected ~3100±100)")


def v12_length_distribution(db_path: Path) -> tuple[bool, str]:
    """~70% of sentences fall in the 4-12 word sweet spot. Accept 65-75%."""
    with connect(db_path) as conn:
        (total,) = conn.execute("SELECT COUNT(*) FROM sentences").fetchone()
        (sweet,) = conn.execute(
            "SELECT COUNT(*) FROM sentences WHERE word_count BETWEEN 4 AND 12"
        ).fetchone()
    pct = 100.0 * sweet / total if total else 0.0
    ok = 65.0 <= pct <= 75.0
    return (ok, f"sentences with 4-12 words = {sweet}/{total} = {pct:.1f}% (expected ~70%)")


def v13_ayat_al_kursi_9(db_path: Path) -> tuple[bool, str]:
    """2:255 splits into exactly 9 sentences."""
    with connect(db_path) as conn:
        (n,) = conn.execute(
            "SELECT COUNT(*) FROM sentences WHERE verse_ref = '2:255'"
        ).fetchone()
    return (n == 9, f"2:255 sentence count = {n} (expected 9)")


def v14_al_baqarah_282_length(db_path: Path) -> tuple[bool, str]:
    """2:282 (longest verse) splits into ~17 sentences. Accept 14-20."""
    with connect(db_path) as conn:
        (n,) = conn.execute(
            "SELECT COUNT(*) FROM sentences WHERE verse_ref = '2:282'"
        ).fetchone()
    ok = 14 <= n <= 20
    return (ok, f"2:282 sentence count = {n} (expected ~17)")


def v15_no_empty_sentences(db_path: Path) -> tuple[bool, str]:
    """No sentence has word_count = 0."""
    with connect(db_path) as conn:
        (n,) = conn.execute("SELECT COUNT(*) FROM sentences WHERE word_count = 0").fetchone()
    return (n == 0, f"empty sentences = {n}")
```

Also add to the `from typing import` line at the top of `validators.py`: nothing new needed (Callable isn't used there).

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_validators.py -v -k step2`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/validators.py tools/tests/quran_db/test_validators.py
git commit -m "feat(quran_db): Step 2 validators (8 checks)"
```

---

## Task 9: Populate sentence_forms

**Files:**
- Create: `tools/quran_db/narrow.py`
- Modify: `tools/tests/quran_db/test_loader.py`

A form = a (root, lemma) pair. For each sentence, we find all (root, lemma) pairs touched by any morphology segment whose (surah, verse, word) lies in the sentence's range.

- [ ] **Step 1: Write the failing test**

Append to `tools/tests/quran_db/test_loader.py`:

```python
from tools.quran_db.narrow import populate_sentence_forms


@pytest.fixture(scope="module")
def forms_db(sentences_db: Path, tmp_path_factory: pytest.TempPathFactory) -> Path:
    import shutil
    p = tmp_path_factory.mktemp("dbs3") / "forms.db"
    shutil.copy(sentences_db, p)
    populate_sentence_forms(p)
    return p


def test_sentence_forms_nonempty(forms_db: Path) -> None:
    conn = sqlite3.connect(forms_db)
    (n,) = conn.execute("SELECT COUNT(*) FROM sentence_forms").fetchone()
    assert n > 100_000, f"got {n} rows"


def test_ilah_form_count(forms_db: Path) -> None:
    """Root 'أله' (ilah) has 4 distinct lemmas per existing docs/roots/ilah.json."""
    conn = sqlite3.connect(forms_db)
    (n,) = conn.execute(
        "SELECT COUNT(DISTINCT lemma) FROM sentence_forms WHERE root = 'أله'"
    ).fetchone()
    assert n == 4, f"ilah has {n} forms (expected 4)"


def test_kabura_form_count(forms_db: Path) -> None:
    conn = sqlite3.connect(forms_db)
    (n,) = conn.execute(
        "SELECT COUNT(DISTINCT lemma) FROM sentence_forms WHERE root = 'كبر'"
    ).fetchone()
    assert n == 14, f"kabura has {n} forms (expected 14)"
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_loader.py::test_ilah_form_count -v`
Expected: `ModuleNotFoundError: No module named 'tools.quran_db.narrow'`

- [ ] **Step 3: Implement populate_sentence_forms**

Create `tools/quran_db/narrow.py`:

```python
"""Build the sentence_forms table — for every (sentence, root, lemma) touched."""
from __future__ import annotations

from pathlib import Path

from tools.quran_db.db import connect


def populate_sentence_forms(db_path: Path) -> None:
    """For each sentence, insert one row per distinct (root, lemma) whose
    morphology segments overlap the sentence's word range. Skips NULL
    roots and NULL lemmas (particles with no ROOT tag).
    """
    with connect(db_path) as conn:
        # Join via (surah, verse, word) — parse verse_ref to surah/verse.
        # We stream results to keep memory flat.
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_loader.py -v`
Expected: all tests pass. First `forms_db` fixture invocation takes ~10-30s on the full corpus.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/narrow.py tools/tests/quran_db/test_loader.py
git commit -m "feat(quran_db): Step 3 — populate sentence_forms"
```

---

## Task 10: Narrowing helper + اللَّه exclusion

**Files:**
- Modify: `tools/quran_db/narrow.py`
- Create: `tools/tests/quran_db/test_narrow.py`

The narrowing helper is called at query time (not stored in DB). It returns sentence IDs for a given set of roots, optionally excluding sentences that contain ONLY a given set of lemmas (for اللَّه exclusion).

- [ ] **Step 1: Write the failing test**

Create `tools/tests/quran_db/test_narrow.py`:

```python
"""Narrowing query: ilāh + kabura with اللَّه exclusion → ~290 sentences."""
import sqlite3
from pathlib import Path

import pytest

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1, populate_sentence_forms, populate_sentences
from tools.quran_db.narrow import get_narrowed_pool

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


@pytest.fixture(scope="module")
def forms_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db = tmp_path_factory.mktemp("narrow") / "forms.db"
    init_db(db)
    load_layer1(db,
        morphology=DATA_DIR / "quran-morphology.txt",
        uthmani=DATA_DIR / "quran-uthmani.txt",
        sahih=DATA_DIR / "quran-trans-en-sahih.txt")
    populate_sentences(db)
    populate_sentence_forms(db)
    return db


def test_narrow_ilah_alone(forms_db: Path) -> None:
    """All sentences touching root أله (includes اللَّه-only)."""
    ids = get_narrowed_pool(forms_db, roots=["أله"])
    assert len(ids) > 2000, f"got {len(ids)} — expected >2000 (includes اللَّه)"


def test_narrow_ilah_kabura_excluding_allah(forms_db: Path) -> None:
    """The 290-sentence pool from the audit spec."""
    ids = get_narrowed_pool(
        forms_db, roots=["أله", "كبر"], exclude_only_lemmas={"اللَّه"}
    )
    assert 270 <= len(ids) <= 320, f"got {len(ids)} — expected ~290"


def test_narrow_rasul_alone(forms_db: Path) -> None:
    """Rasul has no اللَّه-exclusion issue; result = all sentences with root رسل."""
    ids = get_narrowed_pool(forms_db, roots=["رسل"])
    assert 300 <= len(ids) <= 500, f"got {len(ids)} — audit says ~429 verses"
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_narrow.py -v`
Expected: `ImportError: cannot import name 'get_narrowed_pool'`

- [ ] **Step 3: Implement get_narrowed_pool**

Append to `tools/quran_db/narrow.py`:

```python
def get_narrowed_pool(
    db_path: Path,
    roots: list[str],
    exclude_only_lemmas: set[str] | None = None,
) -> list[int]:
    """Return sentence IDs containing any form from `roots`, optionally
    excluding sentences whose ONLY touched forms (across these roots) are
    in `exclude_only_lemmas`.

    Example (Lesson 1):
      get_narrowed_pool(db, roots=['أله', 'كبر'], exclude_only_lemmas={'اللَّه'})
      → ~290 sentences (excludes sentences where the only ilah/kabura lemma
      is اللَّه).
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_narrow.py -v`
Expected: 3 tests pass. First fixture invocation takes ~30s.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/narrow.py tools/tests/quran_db/test_narrow.py
git commit -m "feat(quran_db): narrowing helper with اللَّه exclusion"
```

---

## Task 11: Step 3 validators

**Files:**
- Modify: `tools/quran_db/validators.py`
- Modify: `tools/tests/quran_db/test_validators.py`

Four validators from audit §7 Step 3. `EXPECTED_FORM_COUNTS` comes from CURRENT-STATE.md + the 10 root JSONs.

- [ ] **Step 1: Write failing tests**

Append to `tools/tests/quran_db/test_validators.py`:

```python
from tools.quran_db.narrow import populate_sentence_forms


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
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_validators.py -v -k step3`
Expected: `AttributeError: ... v16_per_root_form_counts`

- [ ] **Step 3: Implement the four Step 3 validators**

Append to `tools/quran_db/validators.py`:

```python
# ── Step 3: Root-closure narrowing ────────────────────────────────────────

# Arabic root strings as they appear in the morphology data, mapped to
# expected form counts from docs/roots/*.json. Sourced from CURRENT-STATE.md
# "Phase 1 acceptance criteria" table. If a root's Arabic string doesn't
# match morphology's ROOT:xxx value, the validator will fail loudly.
EXPECTED_FORM_COUNTS: dict[str, int] = {
    "أله": 4,    # ilah
    "كبر": 14,   # kabura
    "شهد": 9,    # shahida
    "رسل": 7,    # rasul
    "حيي": 13,   # hayiya
    "صلو": 4,    # salah
    "فلح": 2,    # falaha
    "خير": 5,    # khayr
    "نوم": 3,    # nawm
    "قوم": 22,   # qama
}


def v16_per_root_form_counts(db_path: Path) -> tuple[bool, str]:
    """Forms per root match existing docs/roots/*.json counts."""
    mismatches: list[str] = []
    with connect(db_path) as conn:
        for root, expected in EXPECTED_FORM_COUNTS.items():
            (n,) = conn.execute(
                "SELECT COUNT(DISTINCT lemma) FROM sentence_forms WHERE root = ?",
                (root,),
            ).fetchone()
            if n != expected:
                mismatches.append(f"{root}: got {n}, expected {expected}")
    return (len(mismatches) == 0, "; ".join(mismatches) or "all form counts match")


def v17_allah_exclusion_290(db_path: Path) -> tuple[bool, str]:
    """ilah+kabura narrowed (excluding اللَّه-only) = ~290 sentences."""
    from tools.quran_db.narrow import get_narrowed_pool
    ids = get_narrowed_pool(
        db_path, roots=["أله", "كبر"], exclude_only_lemmas={"اللَّه"}
    )
    n = len(ids)
    ok = 270 <= n <= 320
    return (ok, f"ilah+kabura narrowed = {n} (expected ~290)")


def v18_no_lost_forms(db_path: Path) -> tuple[bool, str]:
    """Every (root, lemma) pair in existing root JSONs must exist in sentence_forms
    (we spot-check the 10 roots from EXPECTED_FORM_COUNTS — if count matches, no
    form is lost for that root)."""
    # This is implied by v16 — but we verify there's at least one sentence
    # per root, which catches 'forms exist but touch no sentence' bugs.
    missing: list[str] = []
    with connect(db_path) as conn:
        for root in EXPECTED_FORM_COUNTS:
            (n,) = conn.execute(
                "SELECT COUNT(DISTINCT sentence_id) FROM sentence_forms WHERE root = ?",
                (root,),
            ).fetchone()
            if n == 0:
                missing.append(root)
    return (len(missing) == 0, f"roots with zero sentences: {missing}")


def v19_verse_cross_reference(db_path: Path) -> tuple[bool, str]:
    """Every sentence_forms row references a real sentence whose verse exists."""
    with connect(db_path) as conn:
        (orphans,) = conn.execute(
            "SELECT COUNT(*) FROM sentence_forms sf "
            "LEFT JOIN sentences s ON s.id = sf.sentence_id "
            "LEFT JOIN verses v ON v.ref = s.verse_ref "
            "WHERE s.id IS NULL OR v.ref IS NULL"
        ).fetchone()
    return (orphans == 0, f"orphan sentence_forms = {orphans}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_validators.py -v -k step3`
Expected: 4 tests pass. **If `v16_per_root_form_counts` fails**, the Arabic root string in `EXPECTED_FORM_COUNTS` may not match the morphology data — the failure message will tell you which root; verify the actual `root` value in the data via `SELECT DISTINCT root FROM morphology WHERE ... LIKE ...` and adjust the mapping.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/validators.py tools/tests/quran_db/test_validators.py
git commit -m "feat(quran_db): Step 3 validators (form counts + اللَّه exclusion)"
```

---

## Task 12: D3 (length sweet spot)

**Files:**
- Create: `tools/quran_db/score_a1.py`
- Create: `tools/tests/quran_db/test_score_a1.py`

D3 is the simplest dimension — pure function of word count. Write it first.

- [ ] **Step 1: Write the failing test**

Create `tools/tests/quran_db/test_score_a1.py`:

```python
"""Tests for Phase A1 scoring: D1 (avg freq), D2 (content coverage), D3 (length)."""
import pytest

from tools.quran_db.score_a1 import compute_d3


@pytest.mark.parametrize("wc, expected", [
    (1, 4.0),
    (2, 4.0),
    (3, 7.0),
    (4, 7.0),
    (5, 10.0),
    (8, 10.0),
    (9, 9.0),
    (12, 9.0),
    (13, 6.0),
    (15, 6.0),
    (16, 3.0),
    (20, 3.0),
    (21, 1.0),
    (50, 1.0),
])
def test_d3_piecewise(wc: int, expected: float) -> None:
    assert compute_d3(wc) == expected
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_score_a1.py -v`
Expected: `ModuleNotFoundError: No module named 'tools.quran_db.score_a1'`

- [ ] **Step 3: Implement compute_d3**

Create `tools/quran_db/score_a1.py`:

```python
"""Phase A1 scoring: three universal dimensions per sentence.

D1: normalise(Σ(lemma_freq) / word_count) across candidate pool
D2: normalise(Σ(unique content-lemma freq) / total_segments * 100) across pool
D3: piecewise on word_count (deterministic; SCORING.md §D3)
"""
from __future__ import annotations


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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_score_a1.py -v`
Expected: 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/score_a1.py tools/tests/quran_db/test_score_a1.py
git commit -m "feat(quran_db): D3 length-sweet-spot scoring"
```

---

## Task 13: Lemma frequency table + D1 raw values

**Files:**
- Modify: `tools/quran_db/score_a1.py`
- Modify: `tools/tests/quran_db/test_score_a1.py`

D1 raw = sum(lemma_freq for each word in sentence) / word_count.

"Each word" means each DISTINCT word position, not each morphology segment. A word can have multiple segments (prefix + stem + suffix); we use the content segment's lemma. If a word has multiple segments we sum their lemma frequencies (to match the audit spec's "all token lemma frequencies" wording).

- [ ] **Step 1: Write the failing test**

Append to `tools/tests/quran_db/test_score_a1.py`:

```python
import sqlite3
from pathlib import Path

from tools.quran_db.db import init_db
from tools.quran_db.loader import load_layer1, populate_sentences
from tools.quran_db.narrow import populate_sentence_forms
from tools.quran_db.score_a1 import (
    build_lemma_frequency_table,
    compute_d1_raw_for_all_sentences,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "tools" / "data"


@pytest.fixture(scope="module")
def scored_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    db = tmp_path_factory.mktemp("score") / "scored.db"
    init_db(db)
    load_layer1(db,
        morphology=DATA_DIR / "quran-morphology.txt",
        uthmani=DATA_DIR / "quran-uthmani.txt",
        sahih=DATA_DIR / "quran-trans-en-sahih.txt")
    populate_sentences(db)
    populate_sentence_forms(db)
    return db


def test_lemma_frequency_table(scored_db: Path) -> None:
    freqs = build_lemma_frequency_table(scored_db)
    # اللَّه is one of the most common lemmas (>2500 occurrences per Task 4's test)
    assert freqs.get("اللَّه", 0) > 2500
    # Total distinct lemmas is thousands
    assert len(freqs) > 1000


def test_d1_raw_populated_for_all_sentences(scored_db: Path) -> None:
    compute_d1_raw_for_all_sentences(scored_db)
    conn = sqlite3.connect(scored_db)
    (missing,) = conn.execute(
        "SELECT COUNT(*) FROM sentences s "
        "WHERE NOT EXISTS (SELECT 1 FROM sentence_scores_a1 a WHERE a.sentence_id = s.id)"
    ).fetchone()
    # After running, every sentence has a row in sentence_scores_a1 (even if d2/d3 not set)
    assert missing == 0
    # Spot check: D1 raw values should be non-negative
    (min_raw,) = conn.execute("SELECT MIN(d1_raw) FROM sentence_scores_a1").fetchone()
    assert min_raw >= 0.0
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_score_a1.py -v -k "lemma_freq or d1_raw"`
Expected: `ImportError: cannot import name 'build_lemma_frequency_table'`

- [ ] **Step 3: Implement lemma frequencies + D1 raw**

Append to `tools/quran_db/score_a1.py`:

```python
import sqlite3
from pathlib import Path

from tools.quran_db.db import connect


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
    d2_raw, d3). Subsequent tasks fill those.

    D1 raw = Σ(lemma_freq for each morphology segment in the sentence's word range)
           / sentence.word_count

    Using "each morphology segment" matches the audit spec's wording
    "all token lemma frequencies" — a 3-segment word contributes 3 lookups.
    """
    freq = build_lemma_frequency_table(db_path)
    with connect(db_path) as conn:
        # Pull all morphology segments, aggregated by sentence.
        # Using the same join as populate_sentence_forms.
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

        inserts: list[tuple] = []
        for sid, wc in wcs.items():
            d1_raw = totals.get(sid, 0.0) / wc if wc else 0.0
            inserts.append((sid, d1_raw, 0.0, 0.0))

        conn.executemany(
            "INSERT OR REPLACE INTO sentence_scores_a1 "
            "(sentence_id, d1_raw, d2_raw, d3) VALUES (?, ?, ?, ?)",
            inserts,
        )
        conn.commit()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_score_a1.py -v`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/score_a1.py tools/tests/quran_db/test_score_a1.py
git commit -m "feat(quran_db): D1 raw (avg lemma frequency per sentence)"
```

---

## Task 14: D2 raw (content coverage %)

**Files:**
- Modify: `tools/quran_db/score_a1.py`
- Modify: `tools/tests/quran_db/test_score_a1.py`

D2 raw = Σ(unique content-lemma freq in sentence) / total_morphology_segments * 100

"Content-lemma" means NOT one of the function-word lemmas from SCORING.md.

- [ ] **Step 1: Write failing test**

Append to `tools/tests/quran_db/test_score_a1.py`:

```python
from tools.quran_db.score_a1 import (
    FUNCTION_WORD_LEMMAS,
    compute_d2_raw_for_all_sentences,
)


def test_function_word_lemmas_contains_wa() -> None:
    """Function words from SCORING.md: و ال ل مِن ف ب ما لا إِلّا إِنّ فِي ..."""
    for w in ["و", "ال", "ل", "مِن", "ف", "ب", "ما", "لا", "فِي", "عَلَى"]:
        assert w in FUNCTION_WORD_LEMMAS, f"expected {w} in FUNCTION_WORD_LEMMAS"


def test_d2_raw_populated(scored_db: Path) -> None:
    compute_d1_raw_for_all_sentences(scored_db)
    compute_d2_raw_for_all_sentences(scored_db)
    conn = sqlite3.connect(scored_db)
    (min_d2,) = conn.execute("SELECT MIN(d2_raw) FROM sentence_scores_a1").fetchone()
    (max_d2,) = conn.execute("SELECT MAX(d2_raw) FROM sentence_scores_a1").fetchone()
    assert min_d2 >= 0.0
    # Ayat al-Kursi's first sentence is the cited >8% example — overall max should be well above 1%
    assert max_d2 > 1.0
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_score_a1.py::test_d2_raw_populated -v`
Expected: `ImportError: cannot import name 'FUNCTION_WORD_LEMMAS'`

- [ ] **Step 3: Implement D2 raw**

Append to `tools/quran_db/score_a1.py`:

```python
# Function-word lemmas excluded from D2 (content coverage).
# List from SCORING.md §D2: و, ال, ل, مِن, ف, ب, ما, لا, إِلّا, إِنّ, فِي, عَلَى,
# إِلَى, أَن, أَنّ, يا, قَد, ثُمَّ, بَل, لَم
FUNCTION_WORD_LEMMAS: frozenset[str] = frozenset({
    "و", "ال", "ل", "مِن", "ف", "ب", "ما", "لا", "إِلّا", "إِنّ",
    "فِي", "عَلَى", "إِلَى", "أَن", "أَنّ", "يا", "قَد", "ثُمَّ",
    "بَل", "لَم",
})


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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_score_a1.py -v`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/score_a1.py tools/tests/quran_db/test_score_a1.py
git commit -m "feat(quran_db): D2 raw (content coverage %)"
```

---

## Task 15: D3 populate for all sentences + final score_all driver

**Files:**
- Modify: `tools/quran_db/score_a1.py`
- Modify: `tools/tests/quran_db/test_score_a1.py`

- [ ] **Step 1: Write the failing test**

Append to `tools/tests/quran_db/test_score_a1.py`:

```python
from tools.quran_db.score_a1 import score_all_sentences


def test_score_all_sentences_populates_everything(scored_db: Path) -> None:
    score_all_sentences(scored_db)
    conn = sqlite3.connect(scored_db)
    (total,) = conn.execute("SELECT COUNT(*) FROM sentences").fetchone()
    (scored,) = conn.execute(
        "SELECT COUNT(*) FROM sentence_scores_a1 "
        "WHERE d1_raw >= 0 AND d2_raw >= 0 AND d3 >= 1 AND d3 <= 10"
    ).fetchone()
    assert scored == total, f"{scored}/{total} sentences have valid scores"


def test_d3_matches_word_count_for_every_sentence(scored_db: Path) -> None:
    """Determinism check: recompute d3 from word_count, must match stored."""
    from tools.quran_db.score_a1 import compute_d3
    conn = sqlite3.connect(scored_db)
    rows = conn.execute(
        "SELECT s.word_count, a.d3 FROM sentences s "
        "JOIN sentence_scores_a1 a ON a.sentence_id = s.id"
    ).fetchall()
    mismatches = [r for r in rows if compute_d3(r[0]) != r[1]]
    assert len(mismatches) == 0, f"{len(mismatches)} d3 mismatches"
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_score_a1.py::test_score_all_sentences_populates_everything -v`
Expected: `ImportError: cannot import name 'score_all_sentences'`

- [ ] **Step 3: Implement score_all_sentences driver**

Append to `tools/quran_db/score_a1.py`:

```python
def compute_d3_for_all_sentences(db_path: Path) -> None:
    """Populate d3 by recomputing from sentences.word_count."""
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_score_a1.py -v`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/score_a1.py tools/tests/quran_db/test_score_a1.py
git commit -m "feat(quran_db): score_all_sentences driver + D3 populate"
```

---

## Task 16: Step 4 validators

**Files:**
- Modify: `tools/quran_db/validators.py`
- Modify: `tools/tests/quran_db/test_validators.py`

Five validators from audit §7 Step 4.

- [ ] **Step 1: Write failing tests**

Append to `tools/tests/quran_db/test_validators.py`:

```python
from tools.quran_db.score_a1 import score_all_sentences


@pytest.fixture(scope="module")
def scored_db(forms_db: Path, tmp_path_factory: pytest.TempPathFactory) -> Path:
    import shutil
    p = tmp_path_factory.mktemp("dbs4") / "scored.db"
    shutil.copy(forms_db, p)
    score_all_sentences(p)
    return p


@pytest.mark.parametrize("fn_name", [
    "v20_score_completeness",
    "v21_score_ranges",
    "v22_d3_determinism",
    "v23_d1_raw_non_negative",
    "v24_composite_spot_check",
])
def test_step4_validator(scored_db: Path, fn_name: str) -> None:
    ok, detail = getattr(V, fn_name)(scored_db)
    assert ok, detail
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_validators.py -v -k step4`
Expected: `AttributeError: ... v20_score_completeness`

- [ ] **Step 3: Implement the five Step 4 validators**

Append to `tools/quran_db/validators.py`:

```python
# ── Step 4: Phase A1 scoring ──────────────────────────────────────────────

def v20_score_completeness(db_path: Path) -> tuple[bool, str]:
    """Every sentence has a row in sentence_scores_a1."""
    with connect(db_path) as conn:
        (missing,) = conn.execute(
            "SELECT COUNT(*) FROM sentences s "
            "WHERE NOT EXISTS ("
            "  SELECT 1 FROM sentence_scores_a1 a WHERE a.sentence_id = s.id"
            ")"
        ).fetchone()
    return (missing == 0, f"sentences without A1 scores = {missing}")


def v21_score_ranges(db_path: Path) -> tuple[bool, str]:
    """D3 ∈ {1, 3, 4, 6, 7, 9, 10} per SCORING.md piecewise."""
    expected = {1.0, 3.0, 4.0, 6.0, 7.0, 9.0, 10.0}
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT DISTINCT d3 FROM sentence_scores_a1"
        ).fetchall()
    actual = {r[0] for r in rows}
    unexpected = actual - expected
    return (not unexpected, f"d3 values outside piecewise set: {unexpected}")


def v22_d3_determinism(db_path: Path) -> tuple[bool, str]:
    """Recompute d3 from word_count — no mismatches."""
    from tools.quran_db.score_a1 import compute_d3
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT s.word_count, a.d3 FROM sentences s "
            "JOIN sentence_scores_a1 a ON a.sentence_id = s.id"
        ).fetchall()
    mismatches = sum(1 for r in rows if compute_d3(r["word_count"]) != r["d3"])
    return (mismatches == 0, f"d3 mismatches = {mismatches}")


def v23_d1_raw_non_negative(db_path: Path) -> tuple[bool, str]:
    """D1/D2 raw values are >= 0."""
    with connect(db_path) as conn:
        (bad,) = conn.execute(
            "SELECT COUNT(*) FROM sentence_scores_a1 WHERE d1_raw < 0 OR d2_raw < 0"
        ).fetchone()
    return (bad == 0, f"negative raw scores = {bad}")


def v24_composite_spot_check(db_path: Path) -> tuple[bool, str]:
    """For 50 random sentences, recompute composite with D1/D2 normalised to
    [0, 10] via min-max across all sentences. Composite = (D1n*35 + D2n*25 + D3*40)/100.
    This just verifies the scoring pipeline produces non-trivial variance."""
    import random
    with connect(db_path) as conn:
        rows = conn.execute(
            "SELECT d1_raw, d2_raw, d3 FROM sentence_scores_a1"
        ).fetchall()
    if not rows:
        return (False, "no scored sentences")
    d1s = [r["d1_raw"] for r in rows]
    d2s = [r["d2_raw"] for r in rows]
    d1_min, d1_max = min(d1s), max(d1s)
    d2_min, d2_max = min(d2s), max(d2s)
    if d1_max == d1_min or d2_max == d2_min:
        return (False, "D1 or D2 raw has zero variance — normalisation would fail")
    # Sample 50
    sample = random.Random(42).sample(rows, min(50, len(rows)))
    for r in sample:
        d1n = 10 * (r["d1_raw"] - d1_min) / (d1_max - d1_min)
        d2n = 10 * (r["d2_raw"] - d2_min) / (d2_max - d2_min)
        composite = (d1n * 35 + d2n * 25 + r["d3"] * 40) / 100
        if not (0.0 <= composite <= 10.0):
            return (False, f"composite out of range: {composite}")
    return (True, f"composite spot-check: 50/50 in [0, 10], variance OK")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_validators.py -v -k step4`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/quran_db/validators.py tools/tests/quran_db/test_validators.py
git commit -m "feat(quran_db): Step 4 validators (score completeness + ranges + determinism)"
```

---

## Task 17: CLI — `tools/build-quran-db.py`

**Files:**
- Create: `tools/build-quran-db.py`
- Create: `tools/tests/quran_db/test_cli.py`

- [ ] **Step 1: Write the failing test**

Create `tools/tests/quran_db/test_cli.py`:

```python
"""Smoke test for the CLI. Invokes the subprocess and asserts exit code 0."""
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_cli_help() -> None:
    r = subprocess.run(
        [sys.executable, str(REPO_ROOT / "tools" / "build-quran-db.py"), "--help"],
        capture_output=True, text=True,
    )
    assert r.returncode == 0, r.stderr
    assert "--all" in r.stdout
    assert "--db" in r.stdout
```

- [ ] **Step 2: Run test to confirm failure**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_cli.py -v`
Expected: `FileNotFoundError: ... build-quran-db.py`

- [ ] **Step 3: Write the CLI**

Create `tools/build-quran-db.py`:

```python
#!/usr/bin/env python3
"""Build tools/data/quran.db end-to-end from raw datasets.

Pipeline steps (order matters):
  1. init_db        — create schema
  2. load_layer1    — parse morphology / uthmani / sahih → verses / morphology / translations
  3. sentences      — split verses at waqf marks
  4. sentence_forms — populate (sentence, root, lemma) mapping
  5. score          — compute D1/D2/D3 raw values

Usage:
  tools/build-quran-db.py --all                     # full rebuild
  tools/build-quran-db.py --all --db /tmp/q.db     # custom DB path
  tools/build-quran-db.py --step layer1             # run one step only
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))  # so 'tools.quran_db' imports work

from tools.quran_db.db import init_db
from tools.quran_db.loader import (
    load_layer1,
    populate_sentences,
)
from tools.quran_db.narrow import populate_sentence_forms
from tools.quran_db.score_a1 import score_all_sentences


DEFAULT_DB = REPO_ROOT / "tools" / "data" / "quran.db"
DATA_DIR = REPO_ROOT / "tools" / "data"

STEPS = ["init", "layer1", "sentences", "forms", "score"]


def run_step(name: str, db_path: Path) -> None:
    print(f"[{name}] …", flush=True)
    if name == "init":
        init_db(db_path)
    elif name == "layer1":
        load_layer1(
            db_path,
            morphology=DATA_DIR / "quran-morphology.txt",
            uthmani=DATA_DIR / "quran-uthmani.txt",
            sahih=DATA_DIR / "quran-trans-en-sahih.txt",
        )
    elif name == "sentences":
        populate_sentences(db_path)
    elif name == "forms":
        populate_sentence_forms(db_path)
    elif name == "score":
        score_all_sentences(db_path)
    else:
        raise SystemExit(f"unknown step: {name}")
    print(f"[{name}] done", flush=True)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--db", type=Path, default=DEFAULT_DB, help="output SQLite path")
    p.add_argument("--all", action="store_true", help="run all steps")
    p.add_argument("--step", choices=STEPS, help="run a single step (requires --db to exist for steps after 'init')")
    args = p.parse_args()

    if not args.all and not args.step:
        p.error("pass --all or --step")

    if args.all:
        if args.db.exists():
            args.db.unlink()  # fresh start
        for s in STEPS:
            run_step(s, args.db)
    else:
        run_step(args.step, args.db)
    print(f"OK — {args.db}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Make it executable and run test**

```bash
chmod +x tools/build-quran-db.py
tools/.venv/bin/python -m pytest tools/tests/quran_db/test_cli.py -v
```

Expected: test passes.

- [ ] **Step 5: Commit**

```bash
git add tools/build-quran-db.py tools/tests/quran_db/test_cli.py
git commit -m "feat(quran_db): CLI — tools/build-quran-db.py"
```

---

## Task 18: Standalone validator runner

**Files:**
- Create: `tools/validate-quran-db.py`

- [ ] **Step 1: Write the validator runner**

Create `tools/validate-quran-db.py`:

```python
#!/usr/bin/env python3
"""Run all quran.db validators and print a pass/fail table.

Exit code is 0 iff every validator passes.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from tools.quran_db import validators as V

DEFAULT_DB = REPO_ROOT / "tools" / "data" / "quran.db"

ALL_VALIDATORS = [
    # Step 1
    ("v1_verse_count", lambda db: V.v1_verse_count(db)),
    ("v2_morphology_count", lambda db: V.v2_morphology_count(db)),
    ("v3_translation_coverage", lambda db: V.v3_translation_coverage(db)),
    ("v4_no_orphan_morphology", lambda db: V.v4_no_orphan_morphology(db)),
    ("v5_root_count", lambda db: V.v5_root_count(db)),
    ("v6_uthmani_byte_match",
     lambda db: V.v6_uthmani_byte_match(db, REPO_ROOT / "tools/data/quran-uthmani.txt")),
    ("v7_no_duplicate_refs", lambda db: V.v7_no_duplicate_refs(db)),
    # Step 2
    ("v8_sentence_coverage", lambda db: V.v8_sentence_coverage(db)),
    ("v9_sentence_contiguity", lambda db: V.v9_sentence_contiguity(db)),
    ("v10_word_reassembly", lambda db: V.v10_word_reassembly(db)),
    ("v11_waqf_verse_ratio", lambda db: V.v11_waqf_verse_ratio(db)),
    ("v12_length_distribution", lambda db: V.v12_length_distribution(db)),
    ("v13_ayat_al_kursi_9", lambda db: V.v13_ayat_al_kursi_9(db)),
    ("v14_al_baqarah_282_length", lambda db: V.v14_al_baqarah_282_length(db)),
    ("v15_no_empty_sentences", lambda db: V.v15_no_empty_sentences(db)),
    # Step 3
    ("v16_per_root_form_counts", lambda db: V.v16_per_root_form_counts(db)),
    ("v17_allah_exclusion_290", lambda db: V.v17_allah_exclusion_290(db)),
    ("v18_no_lost_forms", lambda db: V.v18_no_lost_forms(db)),
    ("v19_verse_cross_reference", lambda db: V.v19_verse_cross_reference(db)),
    # Step 4
    ("v20_score_completeness", lambda db: V.v20_score_completeness(db)),
    ("v21_score_ranges", lambda db: V.v21_score_ranges(db)),
    ("v22_d3_determinism", lambda db: V.v22_d3_determinism(db)),
    ("v23_d1_raw_non_negative", lambda db: V.v23_d1_raw_non_negative(db)),
    ("v24_composite_spot_check", lambda db: V.v24_composite_spot_check(db)),
]


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = p.parse_args()
    if not args.db.exists():
        print(f"ERROR: {args.db} does not exist. Run build-quran-db.py first.", file=sys.stderr)
        return 2

    any_fail = False
    for name, fn in ALL_VALIDATORS:
        ok, detail = fn(args.db)
        mark = "✓" if ok else "✗"
        print(f"{mark}  {name:<32}  {detail}")
        if not ok:
            any_fail = True

    print()
    print("FAIL" if any_fail else "ALL PASS")
    return 1 if any_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Commit**

```bash
chmod +x tools/validate-quran-db.py
git add tools/validate-quran-db.py
git commit -m "feat(quran_db): validate-quran-db.py runner"
```

---

## Task 19: Integration smoke — full build + all validators pass

**Files:**
- Create: `tools/tests/quran_db/test_integration.py`
- Create: `tools/data/.gitignore` (keep raw files, ignore `quran.db`)

- [ ] **Step 1: Add .gitignore to not commit the built DB**

Create `tools/data/.gitignore`:

```
quran.db
```

- [ ] **Step 2: Write the integration test**

Create `tools/tests/quran_db/test_integration.py`:

```python
"""End-to-end: run CLI then validator, assert all pass."""
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_full_build_and_validate(tmp_path: Path) -> None:
    db = tmp_path / "quran.db"
    build = subprocess.run(
        [sys.executable, str(REPO_ROOT / "tools" / "build-quran-db.py"),
         "--all", "--db", str(db)],
        capture_output=True, text=True, timeout=600,
    )
    assert build.returncode == 0, build.stderr

    validate = subprocess.run(
        [sys.executable, str(REPO_ROOT / "tools" / "validate-quran-db.py"),
         "--db", str(db)],
        capture_output=True, text=True,
    )
    assert validate.returncode == 0, validate.stdout + validate.stderr
    assert "ALL PASS" in validate.stdout
```

- [ ] **Step 3: Run the integration test**

Run: `tools/.venv/bin/python -m pytest tools/tests/quran_db/test_integration.py -v --timeout=600`
Expected: passes in 1-3 minutes (builds full DB from scratch, runs 24 validators).

If `v17_allah_exclusion_290` is near but outside the 270-320 range, that's a signal the morphology's اللَّه-lemma string isn't `"اللَّه"` verbatim — inspect it via `SELECT DISTINCT lemma FROM morphology WHERE lemma LIKE '%لَّه%'` and update the exclusion set in `v17` accordingly. Commit the fix in the same commit.

- [ ] **Step 4: Run the build once for the tracked DB location**

```bash
tools/.venv/bin/python tools/build-quran-db.py --all
tools/.venv/bin/python tools/validate-quran-db.py
```

Expected: `ALL PASS` in the terminal. The DB is NOT committed (it's in `.gitignore`), but running this once locally makes sure the tracked file paths work end-to-end.

- [ ] **Step 5: Commit**

```bash
git add tools/data/.gitignore tools/tests/quran_db/test_integration.py
git commit -m "test(quran_db): integration — full build + all 24 validators pass"
```

---

## Task 20: Update CLAUDE.md + add an ADR

**Files:**
- Modify: `CLAUDE.md`
- Create: `docs/decisions/ADR-012-quran-db-schema.md`

- [ ] **Step 1: Write the ADR**

Create `docs/decisions/ADR-012-quran-db-schema.md`:

```markdown
# ADR-012 — quran.db schema (waqf-split sentences + A1 scores)

## Status
Accepted, 2026-04-17.

## Context
[Slice 1 Picker Spec §7](../superpowers/specs/2026-04-17-slice-1-verse-picker-design.md#7--schema-additions-for-slice-1) introduces the `sentences` entity (waqf-delimited fragments) as the scorable unit. The [Audit §7](../superpowers/specs/2026-04-17-picker-ux-audit-and-validators.md#7--quran-db-prep-validators) defines 24 validators across five pipeline steps.

## Decision
`tools/data/quran.db` is a SQLite-based build artifact with six tables:

| Table | Step | Notes |
|---|---|---|
| `verses` | 1 | Full Qur'an (6,236 rows), byte-match against `quran-uthmani.txt` |
| `translations` | 1 | Sahih International draft, one per verse |
| `morphology` | 1 | ~128-130K segments with extracted `root` + `lemma` |
| `sentences` | 2 | Waqf-split fragments, one or more per verse |
| `sentence_forms` | 3 | Many-to-many: sentence ↔ (root, lemma). اللَّه exclusion happens at query time via `get_narrowed_pool(exclude_only_lemmas=...)`. |
| `sentence_scores_a1` | 4 | Raw D1, D2, D3 per sentence. Normalisation is query-time (depends on candidate pool). |

### Why raw scores (not normalised) in the DB

D1 and D2 normalisation is min-max against a candidate pool. A teacher scoring just-ilah has a different pool than a teacher scoring ilah+kabura. Storing raw values + normalising at query time keeps the DB pool-agnostic.

### Why `sentence_forms` is universal (not lesson-scoped)

Every (sentence, root, lemma) mapping is true independent of which lesson the teacher is authoring. Lesson-specific narrowing is a query over this table, not a separate stored view.

## Consequences
- `quran.db` is regenerable from `tools/data/*.txt` in <3 minutes. It is gitignored.
- Plan 2 (InstantDB seed) reads this SQLite DB and pushes narrowed data up.
- Plan 4 (Tier-2 scoring) writes `hookScore` to InstantDB, not SQLite — SQLite holds only universal A1 scores.
```

- [ ] **Step 2: Update CLAUDE.md "Deep Context" table**

Edit [CLAUDE.md](../../CLAUDE.md) — in the "Deep Context — Read When Needed" table, find the row for `build-quran-db.py` (currently marked `planned`) and replace with:

```
| **Building `quran.db` from scratch** | `docs/decisions/ADR-012-quran-db-schema.md` + `tools/build-quran-db.py --all` |
| **Validating `quran.db`** | `tools/validate-quran-db.py` — runs all 24 checks from audit §7 |
```

Also update the file tree in CLAUDE.md: replace the `build-quran-db.py` line's `[planned]` marker with a clean listing plus the new files:

```
│   ├── build-quran-db.py            ← ⭐ Builds tools/data/quran.db (SQLite, ADR-012)
│   ├── validate-quran-db.py         ← Runs all 24 validators from audit §7
│   ├── quran_db/                    ← Python package: parse / waqf / narrow / score_a1 / validators
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/decisions/ADR-012-quran-db-schema.md
git commit -m "docs: ADR-012 — quran.db schema + CLAUDE.md updates for Plan 1"
```

---

## Self-Review Checklist (for the orchestrator before dispatching)

- [ ] **Spec coverage:** Every Step-1-to-Step-4 validator from audit spec §7 has a `vNN` function (v1–v24). Step 5 validators (InstantDB seed parity) are deliberately deferred to Plan 2.
- [ ] **No placeholders:** Every code block shows real code, not "implement X". Every command has a concrete expected output.
- [ ] **Type consistency:** `get_narrowed_pool` returns `list[int]` everywhere. `Fragment` TypedDict fields are identical between `waqf.py` and usages. Validator signatures are uniform: `(db_path: Path) -> tuple[bool, str]`.
- [ ] **No backwards-compat shims:** No renamed imports, no "transition" comments.
- [ ] **No over-engineering:** Function-word list is a frozenset literal, not a config file. No logging framework.

---

## Acceptance Criteria

Plan 1 is done when:

1. `tools/.venv/bin/python -m pytest tools/tests/quran_db/ -v` — **all tests pass** (<2 min excluding the integration test).
2. `tools/build-quran-db.py --all` — builds `tools/data/quran.db` in <3 min.
3. `tools/validate-quran-db.py` — prints `ALL PASS`.
4. The per-root form counts (ilah=4, kabura=14, shahida=9, rasul=7, hayiya=13, salah=4, falaha=2, khayr=5, nawm=3, qama=22) match `docs/roots/*.json`.
5. ilāh+kabura narrowing with اللَّه exclusion produces 270–320 sentences (target ~290).
6. `docs/decisions/ADR-012` + CLAUDE.md updates committed.
7. No InstantDB work, no UI work, no JSON-to-SQLite migration.
