# ADR-010: SQLite Data Architecture (replaces per-root JSON files)

## Status: Proposed (2026-04-14)

## Revisions

**2026-04-14 (same day) — amendments after brainstorming session.** The following refinements were captured before implementation began. They supersede the corresponding portions of the original proposal below.

1. **Forms are NOT the same as lemmas.** The original schema had a `form_curriculum` table keyed on `(lemma_ar, root_ar)`, treating one lemma as one pedagogical form. This is wrong — a form is finer-grained than a lemma (e.g., past vs imperfect of the same verb = 2 forms). The authoritative model is defined in [`docs/FORMS-LEMMAS-ROOTS.md`](../FORMS-LEMMAS-ROOTS.md). Schema effect:
   - Keep `lemmas` as Kais Dukes truth (unchanged).
   - **Replace `form_curriculum`** with two tables: `forms` (per-course pedagogical units) + `form_lemma_bindings` (many-to-many with optional tense/number/gender filters).

2. **Multi-course schema now, single-course UX now.** Add a `courses` table. Add `course_id` FK (NOT NULL) to every Layer 2 table: `root_curriculum`, `forms`, `form_lemma_bindings`, `verse_scores`, `verse_root_scores`, `selections`, `sentence_patterns`, `lessons`. Seed one default course `"lqwg-v1"` and migrate all existing teacher data under it. The picker UI operates on the default course for now; multi-course UX is additive later.

3. **`verse_words` (130K rows) WILL be seeded to InstantDB.** The original proposal kept it local-only. Changed: seeding enables exact word-level highlighting in student cards, clean form-resolution queries, and unblocks Root Explorer (future ADR-011 feature) from needing a backend API. Scope cost is modest (~65MB); client sync is scoped by query (~5k rows for a student's enrolled lessons, not 130k).

4. **`roots` and `lemmas` are also seeded to InstantDB** (already covered by the "What goes to InstantDB" section, but made explicit for form-resolution joins).

5. **Verse-level vs verse-root-level score separation** (already in original schema) is confirmed correct.

6. **Multi-lemma verses are common and pedagogically valuable** (e.g., 7:138 contains both إِلَٰه sg and آلِهَة pl of the same root). The `verse_roots.all_lemmas` field is first-class data, not an edge case. The picker UI renders "multi-form verse" explicitly.

Sections below that contradict these amendments are retained for historical context but superseded. When implementing, follow the amendments and the [FORMS-LEMMAS-ROOTS.md](../FORMS-LEMMAS-ROOTS.md) spec.

## Context

The project currently stores Qur'anic root data as individual JSON files (`docs/roots/*.json`) — one per root. A Python script (`build-root-inventory.py`) reads three raw text files and produces these JSONs. Six scripts consume them. This was a bootstrapping decision (ADR-009) that worked for 10 curated roots.

### Why this must change

1. **Full-scale vision.** The Qur'an has 1,651 roots, ~4,000 lemma forms, and 6,236 verses. The teacher wants a complete morphological database — not 10 hand-curated files.

2. **Verse duplication.** ~207 verses appear in 2+ root files. Each copy carries the full Arabic text and translation. Scores for the same verse can drift between files.

3. **No cross-root queries.** "Show me all verses with story > 7 across all roots" requires loading all files. "Which verses contain BOTH root X and root Y?" is impossible without loading both.

4. **Form coverage gap.** Root `kabura` claims 38 اسْتَكْبَرَ occurrences (`count: 38`) but the JSON only contains 2 verses for this form. The pipeline curates a subset; the teacher wants ALL verses.

5. **Score conflation.** The current schema stores story/familiarity (verse-level properties) alongside teaching_fit (verse-root-level) in the same object. When a verse appears in two root files, verse-level scores get duplicated and can diverge.

6. **The teacher doesn't read JSON.** The picker UI and dashboard are the real interfaces. JSON was a data format, not a user experience.

## Decision

Replace per-root JSON files with a single SQLite database (`tools/data/quran.db`) containing ALL roots, forms, verses, and their relationships. The database has two layers:

- **Layer 1 (immutable):** Qur'anic reference data, built deterministically from the three raw text files already in `tools/data/`.
- **Layer 2 (mutable):** Teacher-authored data — scores, selections, lesson assignments, remarks. Source of truth is InstantDB (cloud); local SQLite is synced down for offline tools.

## Schema

### Layer 1: Immutable Qur'anic Reference Data

```sql
-- Surah catalog
CREATE TABLE surahs (
    surah_num    INTEGER PRIMARY KEY,
    name_en      TEXT NOT NULL,         -- "Al-Fatihah"
    name_ar      TEXT,                  -- "الفاتحة"
    verse_count  INTEGER NOT NULL,
    juz_start    INTEGER NOT NULL       -- which juz this surah starts in
);

-- Every verse in the Qur'an (stored ONCE)
CREATE TABLE verses (
    surah_num    INTEGER NOT NULL,
    ayah_num     INTEGER NOT NULL,
    arabic_full  TEXT NOT NULL,          -- Uthmani text
    translation  TEXT,                   -- Saheeh International English
    word_count   INTEGER NOT NULL,       -- pre-computed
    juz          INTEGER NOT NULL,       -- pre-computed from juz boundaries
    surah_name   TEXT NOT NULL,          -- denormalized for display
    PRIMARY KEY (surah_num, ayah_num)
);

-- Root catalog (1,651 roots)
CREATE TABLE roots (
    root_ar          TEXT PRIMARY KEY,   -- "رسل", "أله", "كبر"
    occurrence_count INTEGER NOT NULL    -- total word occurrences across all verses
);

-- Lemma/form catalog (~4,000 unique lemma+root pairs)
CREATE TABLE lemmas (
    lemma_ar         TEXT NOT NULL,      -- "رَسُول", "أَرْسَلَ"
    root_ar          TEXT NOT NULL REFERENCES roots(root_ar),
    pos              TEXT,               -- "N", "V", "ADJ"
    verb_form        INTEGER,            -- 1-10 for verbs, NULL for nouns
    occurrence_count INTEGER NOT NULL,   -- how many times this lemma appears in the Qur'an
    PRIMARY KEY (lemma_ar, root_ar)
);

-- Word-level morphology (130K rows)
-- REVISED 2026-04-14: previously marked "local only". Decision reversed: verse_words IS seeded to InstantDB
-- to enable exact word-level highlighting and clean form-resolution queries. Client sync is scoped by query.
CREATE TABLE verse_words (
    surah_num    INTEGER NOT NULL,
    ayah_num     INTEGER NOT NULL,
    word_num     INTEGER NOT NULL,       -- word position (1-based)
    segment_num  INTEGER NOT NULL,       -- segment within word (1-based)
    surface      TEXT NOT NULL,          -- Arabic surface form
    root_ar      TEXT,                   -- NULL for particles/pronouns
    lemma_ar     TEXT,                   -- NULL for particles
    pos          TEXT NOT NULL,
    verb_form    INTEGER,
    features     TEXT,                   -- full morphology feature string
    PRIMARY KEY (surah_num, ayah_num, word_num, segment_num)
);

-- Pre-aggregated junction: which roots appear in which verses (verse-level)
-- This is the picker's primary query target — fast, no GROUP BY needed
CREATE TABLE verse_roots (
    surah_num       INTEGER NOT NULL,
    ayah_num        INTEGER NOT NULL,
    root_ar         TEXT NOT NULL,
    primary_lemma   TEXT NOT NULL,       -- most frequent lemma of this root in this verse
    lemma_count     INTEGER NOT NULL,    -- word occurrences of this root in this verse
    all_lemmas      TEXT,                -- JSON array if multiple distinct lemmas
    PRIMARY KEY (surah_num, ayah_num, root_ar)
);
```

### Layer 2: Teacher-Authored Data

```sql
-- Root-level curriculum metadata
CREATE TABLE root_curriculum (
    root_ar              TEXT PRIMARY KEY REFERENCES roots(root_ar),
    root_word            TEXT,           -- "رَسُول" — representative form
    transliteration      TEXT,           -- "rasul"
    three_letter         TEXT,           -- "ر س ل"
    three_letter_en      TEXT,           -- "ra sin lam"
    corpus_key           TEXT,           -- legacy URL key
    introduced_in_lesson INTEGER
);

-- Form-level curriculum metadata
CREATE TABLE form_curriculum (
    lemma_ar             TEXT NOT NULL,
    root_ar              TEXT NOT NULL,
    form_transliteration TEXT,           -- "rasul"
    category             TEXT,           -- "Noun", "Verb (Form IV)"
    gloss                TEXT,           -- "messenger"
    taught_in_lesson     INTEGER,
    taught_role          TEXT,           -- "anchor", "learning"
    priority             TEXT,           -- "high", "medium", "low"
    notes                TEXT,
    PRIMARY KEY (lemma_ar, root_ar)
);

-- Verse-level scores (properties of the verse ITSELF, scored once)
CREATE TABLE verse_scores (
    surah_num    INTEGER NOT NULL,
    ayah_num     INTEGER NOT NULL,
    story        INTEGER,               -- 0-10
    story_reason TEXT,
    familiarity  INTEGER,               -- 0-10
    familiarity_reason TEXT,
    fragment     BOOLEAN DEFAULT FALSE,  -- is the verse too long to use whole?
    scored_at    TEXT,                   -- ISO timestamp
    PRIMARY KEY (surah_num, ayah_num)
);

-- Verse-root-level scores (depends on WHICH ROOT you're teaching)
CREATE TABLE verse_root_scores (
    surah_num           INTEGER NOT NULL,
    ayah_num            INTEGER NOT NULL,
    root_ar             TEXT NOT NULL,
    teaching_fit        INTEGER,        -- 0-10
    teaching_fit_reason TEXT,
    form_freq           INTEGER,        -- computed from lemma frequency
    form_dominance      INTEGER,        -- is this root central or incidental?
    length_score        INTEGER,        -- computed from word_count
    curriculum_score    INTEGER,        -- bonus for adhaan/salah connection
    star_bonus          INTEGER DEFAULT 0,
    base_score          REAL,           -- sum of all dimensions
    final_score         REAL,           -- base × fragment_multiplier
    score_notes         TEXT,           -- teacher/LLM remark
    scored_at           TEXT,
    PRIMARY KEY (surah_num, ayah_num, root_ar)
);

-- Teacher selections: picking verses for lessons
CREATE TABLE selections (
    surah_num        INTEGER NOT NULL,
    ayah_num         INTEGER NOT NULL,
    root_ar          TEXT NOT NULL,
    lesson_num       INTEGER NOT NULL,
    section          TEXT NOT NULL CHECK (section IN ('learning', 'recall', 'pipeline', 'none')),
    role             TEXT,              -- "anchor", "learning", "review"
    role_order       INTEGER,           -- display order within the lesson
    remark           TEXT,              -- teacher's note on why this verse
    arabic_fragment  TEXT,              -- teacher-trimmed portion
    translation_override TEXT,          -- teacher-edited translation
    reciter          TEXT,              -- EveryAyah folder name
    audio_fragment   TEXT,              -- "#t=0,7"
    cross_roots      TEXT,              -- JSON array of other roots this verse reinforces
    updated_at       TEXT,
    PRIMARY KEY (surah_num, ayah_num, root_ar, lesson_num)
);

-- Sentence patterns (teacher-authored per root)
CREATE TABLE sentence_patterns (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    root_ar      TEXT NOT NULL REFERENCES roots(root_ar),
    pattern_ar   TEXT NOT NULL,
    gloss        TEXT,
    note         TEXT
);

-- Lesson metadata & pipeline phase tracking
CREATE TABLE lessons (
    lesson_num       INTEGER PRIMARY KEY,
    slug             TEXT NOT NULL,      -- "lesson-01-allahu-akbar"
    title            TEXT NOT NULL,
    seed_arabic      TEXT,
    seed_english     TEXT,
    current_phase    TEXT NOT NULL DEFAULT 'scoring',
    phase_scoring    TEXT NOT NULL DEFAULT 'blocked',
    phase_picking    TEXT NOT NULL DEFAULT 'blocked',
    phase_writing    TEXT NOT NULL DEFAULT 'blocked',
    phase_tamil      TEXT NOT NULL DEFAULT 'blocked',
    phase_audio      TEXT NOT NULL DEFAULT 'blocked',
    phase_review     TEXT NOT NULL DEFAULT 'blocked',
    phase_published  TEXT NOT NULL DEFAULT 'blocked',
    notes            TEXT
);
```

### Indexes

```sql
CREATE INDEX idx_verse_roots_root ON verse_roots(root_ar);
CREATE INDEX idx_verse_words_root ON verse_words(root_ar);
CREATE INDEX idx_verse_words_lemma ON verse_words(lemma_ar);
CREATE INDEX idx_verse_root_scores_root ON verse_root_scores(root_ar);
CREATE INDEX idx_selections_lesson ON selections(lesson_num);
CREATE INDEX idx_selections_root ON selections(root_ar);
CREATE INDEX idx_lemmas_root ON lemmas(root_ar);
```

### Useful Views

```sql
-- The picker's main query: all verse candidates for a root, ranked
CREATE VIEW verse_candidates AS
SELECT
    v.surah_num, v.ayah_num,
    v.surah_num || ':' || v.ayah_num AS ref,
    v.arabic_full, v.translation, v.word_count, v.juz, v.surah_name,
    r.root_ar,
    vr.primary_lemma, vr.all_lemmas,
    vs.story, vs.familiarity, vs.fragment,
    vrs.teaching_fit, vrs.final_score, vrs.score_notes,
    sel.section, sel.role, sel.lesson_num, sel.remark, sel.arabic_fragment
FROM verses v
JOIN verse_roots vr ON v.surah_num = vr.surah_num AND v.ayah_num = vr.ayah_num
JOIN roots r ON vr.root_ar = r.root_ar
LEFT JOIN verse_scores vs ON v.surah_num = vs.surah_num AND v.ayah_num = vs.ayah_num
LEFT JOIN verse_root_scores vrs ON v.surah_num = vrs.surah_num AND v.ayah_num = vrs.ayah_num AND vr.root_ar = vrs.root_ar
LEFT JOIN selections sel ON v.surah_num = sel.surah_num AND v.ayah_num = sel.ayah_num AND vr.root_ar = sel.root_ar;
```

## Data Flow

```
                    ┌─ quran-morphology.txt ─┐
  Raw text files    ├─ quran-uthmani.txt     ├─→ build-quran-db.py ─→ quran.db
  (immutable, git)  └─ quran-trans-en-sahih.txt┘      (Layer 1)
                                                          │
                                                   seed-instantdb.py ─→ InstantDB
                                                                          ↕
                                                                     Picker / Dashboard UI
                                                                     (teacher reads + writes)
                                                                          │
                                                   sync-from-cloud.py ←───┘
                                                          │
                                                     quran.db (Layer 2 updated)
                                                          │
                                          ┌───────────────┼───────────────┐
                                          ↓               ↓               ↓
                                   build-lesson-audio  validate-lesson  score-verses
```

### Source of truth

| Data | Source of truth | Reason |
|------|----------------|--------|
| Verse text, morphology | SQLite (built from raw files) | Immutable Qur'anic data |
| Scores (story, familiarity, teaching_fit) | InstantDB | Teacher authors via UI |
| Selections, remarks | InstantDB | Teacher authors via UI |
| Form curriculum (gloss, category) | InstantDB | Teacher authors via UI |

### What stays local-only (REVISED 2026-04-14)

- The three raw text files (`quran-morphology.txt`, `quran-uthmani.txt`, `quran-trans-en-sahih.txt`) — immutable, vendored in git
- That's it. All structured tables are seeded to InstantDB.

### What goes to InstantDB (REVISED 2026-04-14)

- Layer 1: `verses` (6,236), `roots` (1,651), `lemmas` (~4,000), `verse_roots` (~45,000), `verse_words` (~130,000), `surahs` (114)
- Layer 2 (per course): `courses`, `root_curriculum`, `forms`, `form_lemma_bindings`, `verse_scores`, `verse_root_scores`, `selections`, `sentence_patterns`, `lessons`
- Layer 2 (per student, per course): `students`, `studentCards`, `reviewSessions`, `streaks` — see ADR-011

## Row Count Estimates

| Table | Rows | Size estimate |
|-------|------|---------------|
| surahs | 114 | tiny |
| verses | 6,236 | ~2 MB |
| roots | 1,651 | tiny |
| lemmas | ~4,000 | tiny |
| verse_words | ~130,000 | ~10 MB |
| verse_roots | ~45,000 | ~3 MB |
| **Total quran.db** | | **~15-20 MB** |

## Scripts to Build

| Script | Replaces | Purpose |
|--------|----------|---------|
| `tools/build-quran-db.py` | `build-root-inventory.py` | Raw files → SQLite Layer 1 |
| `tools/migrate-json-to-sqlite.py` | (one-time) | Import teacher data from 10 JSONs → Layer 2 |
| `tools/seed-instantdb-from-sqlite.py` | `seed.mjs` | SQLite → InstantDB |
| `tools/sync-from-cloud.py` | (new) | InstantDB → local SQLite Layer 2 |
| `tools/sync-to-cloud.py` | (new) | Local bulk data (LLM scores) → InstantDB |

## What Gets Retired

- `docs/roots/*.json` — kept in git history, no longer edited
- `tools/build-root-inventory.py` — replaced by `build-quran-db.py`
- `tools/generate-picker.py` — static HTML picker replaced by InstantDB app
- `tools/build-dashboard.py` + `teacher/local.html` — replaced by Next.js dashboard
- `instantdb-app/scripts/seed.mjs` — replaced by `seed-instantdb-from-sqlite.py`

## Migration Plan

1. Build `quran.db` Layer 1 from raw files (all roots, all verses)
2. Run `migrate-json-to-sqlite.py` to import existing teacher data from 10 JSONs
3. Verify: every selection, score, and remark from JSON files exists in SQLite
4. Seed InstantDB from SQLite
5. Update picker app to use normalized InstantDB schema
6. Retire JSON files and old scripts

## Consequences

- **Positive:** Full Qur'anic coverage from day one. Cross-root queries. No data duplication. Clean score separation (verse-level vs verse-root-level).
- **Positive:** The picker can show ALL 38 اسْتَكْبَرَ verses, not just the 2 that were curated.
- **Note:** `quran.db` is committed to git (~15-20 MB). Layer 1 is immutable (Qur'anic text never changes), so there's no binary diff churn. Layer 2 (teacher data) lives in InstantDB, not in the committed file. This means zero-friction for new clones — no build step needed.
- **Negative:** Migration effort for existing scripts that read JSON. Estimated at 2-3 hours per script (6 scripts total).
- **REVISED 2026-04-14:** Word-level morphology IS synced to InstantDB. Exact word highlighting works client-side from MVP day one. Root Explorer (ADR-011 future phase) is unblocked on the data layer.

## References

- **[docs/FORMS-LEMMAS-ROOTS.md](../FORMS-LEMMAS-ROOTS.md) — authoritative spec for the three-concept data model** (read this first when implementing Layer 2)
- ADR-009: Local Root Inventory Pipeline (the JSON-based approach this supersedes)
- ADR-011: InstantDB Teacher + Student Experience (downstream consumer of this data architecture)
- `tools/data/quran-morphology.txt` source: mustafa0x/quran-morphology (GPL, v0.4)
- `tools/data/quran-uthmani.txt` source: Tanzil.net
- `tools/data/quran-trans-en-sahih.txt` source: Saheeh International (draft)
