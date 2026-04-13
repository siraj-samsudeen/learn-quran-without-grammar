# Roots, Lemmas, and Forms — Conceptual Foundation

_Status: draft, April 2026. Companion to ADR-010 (SQLite data architecture) and ADR-011 (InstantDB teacher + student experience)._

This document fixes the vocabulary and data model for three related but distinct concepts that appear throughout this project:

1. **Root** — the three-letter consonantal skeleton carrying a meaning family. A linguistic primitive shared with Quran Corpus and Kais Dukes morphology.
2. **Lemma** — the canonical headword tagged by Kais Dukes morphology (what you would look up in an Arabic dictionary). A linguistic primitive shared with Quran Corpus.
3. **Form** — our own pedagogical unit: a distinct word-shape a student must learn to recognize. Not a linguistic primitive — a teacher's curation.

We deliberately keep **all three** as first-class concepts. Roots and lemmas interoperate with the wider Arabic NLP ecosystem; forms are our teaching innovation on top.

---

## 1. Why this matters

Everything downstream depends on a consistent understanding of these three terms:

- The **picker UI** surfaces verses grouped by root, filtered by form, scored per (verse, root).
- The **student SRS** schedules cards tied to forms, retrieved when the student studies a lesson.
- The **build pipeline** (`build-quran-db.py`) extracts roots and lemmas from `tools/data/quran-morphology.txt` — Kais Dukes data — and stores them unchanged.
- The **teacher curriculum** creates forms on top of lemmas and assigns them to lessons.
- The **Root Explorer** (future ADR-011 feature) lets students explore roots freely; it must know the difference between "what the morphology says" (lemmas) and "what the teacher teaches" (forms).

Confusing any of the three creates cascading bugs. This document pins them down.

---

## 2. The hierarchy at a glance

```
          ROOT  (e.g., ك ب ر — "greatness")
            │
            │  linguistic derivation (Kais Dukes truth)
            ▼
          LEMMAS  (e.g., kabīr, akbar, kabura, istakbara)
            │
            │  teacher curation (per course)
            ▼
          FORMS  (e.g., كَبِير, أَكْبَر, كُبْرَى, كَبُرَ, اِسْتَكْبَرَ, يَسْتَكْبِرُ ...)
            │
            │  assignment
            ▼
          LESSONS  (e.g., Lesson 1 teaches 5 of these forms)
            │
            ▼
          VERSES (chosen to showcase the assigned forms)
```

- One root → many lemmas → many forms → assigned to lessons → exemplified by verses.
- Root and lemma are **facts about the Qur'an**. Form and lesson are **facts about our curriculum**.

---

## 3. The three concepts in detail

### 3.1 Root

A **root** (جذر) is a sequence of three consonants (sometimes four, rarely more) that carry an underlying meaning. Arabic is a Semitic language — meaning lives in the consonantal skeleton, while vowels and affixes inflect shape and function.

- Example: **ك ب ر** carries "bigness / greatness."
- Example: **ر س ل** carries "sending / messenger-ness."
- Example: **أ ل ه** carries "deity / worshipped-ness."

**Source of truth:** The morphology file `tools/data/quran-morphology.txt` (Kais Dukes v0.4, via mustafa0x fork) tags every word segment with its root. We store 1,651 roots — every root that appears in the Qur'an.

**Quran Corpus compatibility:** Identical definition. Our `roots.arabic` field matches the `ROOT:` tag in the morphology file.

### 3.2 Lemma

A **lemma** (أصل اللفظ) is the canonical dictionary headword. Given a root and a word in context, the lemma is the "base shape" that word ultimately belongs to.

- From root ك ب ر: lemmas include `kabīr` (adjective "big"), `akbar` (elative "greater"), `kabura` (Form I verb "was great"), `istakbara` (Form X verb "was arrogant"), `mustakbir` (Form X active participle "arrogant one"), and more.
- From root ر س ل: lemmas include `rasūl` (noun "messenger"), `arsala` (Form IV verb "he sent"), `risāla` (noun "message"), `mursal` (passive participle "one sent"), and more.
- From root أ ل ه: lemmas include `ilāh` (common noun "god"), `Allah` (proper noun), and possibly `Allāhumma` depending on the morphology edition's treatment of this lexicalized vocative.

**What a lemma captures:**
- The derivational pattern (e.g., فَعِيل, مُفْعَل, فَعَلَ).
- The part of speech (noun, verb, adjective, proper noun, participle).
- For verbs, the Arabic form number (I through X, and the quadriliteral forms).

**What a lemma ignores (these are inflectional features, not lemma-defining):**
- Tense for verbs (past / imperfect / imperative all belong to the same lemma).
- Number (singular / dual / plural).
- Gender (masculine / feminine).
- Person (1st / 2nd / 3rd).
- Case (nominative / accusative / genitive).
- Definiteness (with or without `al-`).
- Mood (indicative / subjunctive / jussive for imperfect verbs).
- Attached affixes (prefixes like `wa-`, `fa-`, `bi-`; suffixes like `-hu`, `-nā`).

**Source of truth:** The morphology file's `LEM:` tag. We store ~4,000 lemmas in the `lemmas` table. Built once from the morphology file; immutable thereafter.

**Quran Corpus compatibility:** Identical concept. Our `lemmas.morph_key` field matches the `LEM:` tag. We keep Kais Dukes's lemma decisions unchanged — if Kais Dukes tags a broken plural as its own lemma, so do we; if they tag it as the singular lemma with NUMBER=pl, so do we.

### 3.3 Form

A **form** is **our own concept, not a linguistic standard.** It names a distinct word-shape that a beginner student should learn to recognize as meaning X. Forms belong to the teacher's curriculum, not to the Qur'an itself.

- Form is defined **per course**. A course teaching children may define forms differently than a course teaching adults for the same root.
- A form is **composed of one or more lemma-feature bindings.** Most often, one form corresponds to a single lemma restricted to certain features (e.g., "`istakbara` past tense only"). Occasionally, a form merges multiple lemmas the teacher considers visually equivalent.
- A form has **pedagogical metadata**: a human-friendly category label, a gloss in the course's primary language, a lesson assignment, a teaching role (anchor / learning), notes.

**Source of truth:** The `forms` and `form_lemma_bindings` tables in the SQLite Layer 2 / InstantDB. Created and edited by the teacher in the picker UI. Per-course.

**Quran Corpus compatibility:** None — forms are our own concept. We do not export forms back to Quran Corpus.

---

## 4. The governing principle

> **If the student can see it and feel it, then it is one form.**

This is the teacher's rule of thumb for splitting or merging forms. It is deliberately non-formal — recognition is experiential, not definitional.

Practical consequences:

- **Split** when surfaces diverge enough that a beginner would not connect them: كَبِير vs أَكْبَر (same root, different patterns) → 2 forms.
- **Merge** when surfaces are close enough that a beginner sees them as variants of one shape: كَبِير (masc) vs كَبِيرَة (fem, just adds ة) → can be one form in a beginner course, or two in a more detailed course.
- **Never split** by features that are just inflectional noise: case endings, definite article, attached prefixes, person-suffix on a verb.

`★ Teaching-first principle ─────────────────────`
**Recognition is the goal, not sarf logic.** Arabic grammarians distinguish فعل ماضٍ (past), مضارع (imperfect), and أمر (imperative) as different conjugations of one verb. A beginner doesn't need that taxonomy — they need to see the word كَبُرَ and hear "was great" in their head. Whether we call it "past tense of Form I verb kabura" or not is irrelevant to the learning outcome.
`─────────────────────────────────────────────────`

---

## 5. Structural relationship — how a form binds to lemmas

A form is defined by one or more **lemma bindings**. Each binding points to a lemma and optionally restricts to a subset of that lemma's inflectional features.

```
FORM F
  ├─ binding 1: lemma L_a, tense=T, number=N, gender=G  (or any filter = "all")
  ├─ binding 2: lemma L_b, tense=T', ...
  └─ binding 3: ...
```

A word occurrence W belongs to form F when **any** binding of F satisfies:
- `W.lemma_id == binding.lemma_id`, AND
- `binding.tense_filter` is `all` OR matches `W.tense`, AND
- `binding.number_filter` is `all` OR matches `W.number`, AND
- `binding.gender_filter` is `all` OR matches `W.gender`.

Bindings for the same lemma within a course must be **disjoint** — otherwise a word could match multiple forms, creating ambiguity in the picker. The UI prevents overlap.

### 5.1 The four structural relationships

A form relates to lemmas in exactly one of four ways:

**(a) Form = Lemma (full adoption).** One binding with all filters set to "all." The form covers every occurrence of that lemma.
- Example: Form `rasūl` binds to lemma `rasūl` with no feature restrictions. Every rasūl occurrence (sg, pl, any case) belongs to this form.

**(b) Form ⊂ Lemma (narrower).** One binding with feature filters. The form covers only part of a lemma's occurrences.
- Example: Form `istakbara (past)` binds to lemma `istakbara` with `tense=past`. The imperfect occurrences (`يَسْتَكْبِرُ`) belong to a different form.

**(c) Form ⊃ Lemmas (broader / merging).** Multiple bindings to different lemmas. The form merges surfaces the teacher considers visually equivalent.
- Example: Form `rasūl family` binds to both lemma `rasūl` and lemma `rusul` (if morphology treats them as distinct). Students learn them as one unit.

**(d) Form partitions Lemma (multiple narrower forms per lemma).** Several forms each take disjoint feature subsets of one lemma.
- Example: Forms `istakbara (past)` and `istakbara (imperfect)` both bind to lemma `istakbara` with mutually exclusive tense filters.

---

## 6. Features we ignore when identifying a form

Some morphological features never distinguish forms, regardless of teacher judgment. These are "noise" from a recognition standpoint.

| Feature | Why it's ignored | Example |
|---|---|---|
| Case (nom / acc / gen) | Only final vowel differs | إِلَٰهٌ / إِلَٰهًا / إِلَٰهٍ — all one form |
| Definiteness (with/without al-) | al- is a two-letter prefix | إِلَٰه / الْإِلَٰه — one form |
| Prefixes (`wa-`, `fa-`, `bi-`, `li-`, `sa-`) | Grammatical glue, not part of the word's identity | رَسُول / وَرَسُول / فَرَسُول — one form |
| Attached pronoun suffixes | Added referentially, stem unchanged | رَسُول / رَسُولُهُ / رَسُولُنَا — one form |
| Person (verbs) | Personal suffix on an identical stem | كَتَبَ / كَتَبْتُ / كَتَبْتَ / كَتَبْنَا — one form (stem كَتَبَ-) |
| Mood (imperfect indicative / subjunctive / jussive) | Only final vowel changes | يَكْتُبُ / يَكْتُبَ / يَكْتُبْ — one form |

**Decision confirmed April 2026:** person does not define forms. A past-tense verb stem (e.g., كَتَبَ-) is one form regardless of who the subject is.

---

## 7. The divergence catalog — form vs classical lemma

Where the two diverge, four cases emerge. This is the concrete table of outcomes.

### Category A — Form is NARROWER than lemma (teacher split a lemma)

Most common divergence. Teacher splits one lemma into multiple forms because students see different stems.

| # | Distinction | Classical lemma | Teacher's forms | Stem surfaces |
|---|---|---|---|---|
| A1 | Past vs imperfect verb | 1 lemma | 2 forms | اِسْتَكْبَرَ / يَسْتَكْبِرُ |
| A2 | Singular vs broken plural | Usually 1 lemma (with NUMBER feature) | 2 forms | رَسُول / رُسُل |
| A3 | Singular vs sound plural | 1 lemma | 2 forms | مُسْلِم / مُسْلِمُون |
| A4 | Singular vs dual | 1 lemma | 2 forms (if teacher teaches duals) | رَسُول / رَسُولَانِ |
| A5 | Masculine vs feminine adjective | 1 lemma | 1 or 2 forms (teacher judgment) | كَبِير / كَبِيرَة |
| A6 | Past of hollow verb (weak letter) | 1 lemma | 2 forms | قَالَ / يَقُولُ |

### Category B — Form EQUALS lemma (adopted unchanged)

The cleanest case. Teacher adopts the lemma as-is and attaches pedagogical metadata.

| # | Distinction | Classical lemma | Teacher's form |
|---|---|---|---|
| B1 | Common noun | 1 lemma | 1 form: رَسُول |
| B2 | Active participle | 1 lemma | 1 form: مُرْسِل |
| B3 | Passive participle | 1 lemma (separate from active) | 1 form: مُرْسَل |
| B4 | Verbal noun (maṣdar) | 1 lemma | 1 form: إِرْسَال |
| B5 | Elative (when only masc exists for this root) | 1 lemma | 1 form: أَكْبَر |

### Category C — Form is BROADER than lemma (merging)

Teacher merges multiple lemmas the beginner would see as one shape.

| # | Distinction | Classical lemmas | Teacher's form |
|---|---|---|---|
| C1 | Singular + sound plural (very close) | Usually 1 lemma anyway | 1 form |
| C2 | Two irregular plurals of same singular (rare) | 2 lemmas | 1 form (merged) |
| C3 | Elative masc + fem stems (if teacher chooses) | Usually 1 lemma (with GENDER feature) | 1 form |

### Category D — Inflectional noise we always ignore

Already listed in §6. Never causes form divergence either way.

---

## 8. The "feel it" test — teacher judgment heuristics

When the teacher is deciding between split or merge, these heuristics help:

**Split (create separate forms) when…**
- Patterns differ: فَعَلَ vs أَفْعَل vs اِسْتَفْعَلَ. Different template → different form.
- Participles: active (فَاعِل) vs passive (مَفْعُول). Different template → different form.
- Tenses: past stem vs imperfect stem. Different vowel pattern → different form.
- Elative vs base adjective: كَبِير vs أَكْبَر. Different template → different form.
- Broken plurals: singular vs broken plural when stems differ markedly (رَسُول vs رُسُل).

**Merge (one form) when…**
- The difference is purely a final vowel (case, mood).
- The difference is an attached affix (al-, wa-, -hu).
- The difference is a single inflectional suffix on an identical stem (person suffixes).
- The difference is a short vowel inside a sound plural that a beginner would pattern-match to the singular.
- The gender inflection adds only ة to an unchanged stem AND the teacher decides beginners won't be confused.

**When unsure, split.** Splitting is forgiving — the teacher can always merge later. Merging prematurely can lock in recognition errors that are harder to unwind.

---

## 9. Data model

### 9.1 Layer 1: Linguistic ground truth (immutable, shared with Quran Corpus)

```sql
-- Every root that appears in the Qur'an. 1,651 rows.
CREATE TABLE roots (
  id                 INTEGER PRIMARY KEY,
  arabic             TEXT NOT NULL UNIQUE,       -- "ك ب ر" (space-separated letters)
  transliteration    TEXT NOT NULL,              -- "kabura" (convention: most common verb lemma)
  three_letter       TEXT NOT NULL,              -- "ك ب ر" (canonical)
  three_letter_en    TEXT NOT NULL,              -- "kaf ba ra"
  morph_key          TEXT,                       -- Kais Dukes root key (Buckwalter)
  corpus_url         TEXT,                       -- https://corpus.quran.com link
  total_occurrences  INTEGER NOT NULL
);

-- Every lemma that appears in the Qur'an. ~4,000 rows.
CREATE TABLE lemmas (
  id                 INTEGER PRIMARY KEY,
  root_id            INTEGER NOT NULL REFERENCES roots(id),
  arabic_canonical   TEXT NOT NULL,              -- "رَسُول" (fully voweled)
  transliteration    TEXT NOT NULL,              -- "rasūl"
  morph_key          TEXT NOT NULL,              -- Kais Dukes LEM: tag (Buckwalter)
  pos                TEXT NOT NULL,              -- NOUN | VERB | PN | ADJ | PART | ...
  verb_form          TEXT,                       -- I, II, III, ..., X; null for non-verbs
  count              INTEGER NOT NULL,           -- global occurrences in Qur'an
  UNIQUE (root_id, morph_key, pos)
);

-- Every word segment. 130,000 rows. LOCAL ONLY — not seeded to InstantDB.
CREATE TABLE verse_words (
  id               INTEGER PRIMARY KEY,
  verse_id         INTEGER NOT NULL REFERENCES verses(id),
  word_index       INTEGER NOT NULL,
  segment_index    INTEGER NOT NULL,
  surface          TEXT NOT NULL,                -- word as appears, with diacritics
  lemma_id         INTEGER REFERENCES lemmas(id),
  root_id          INTEGER REFERENCES roots(id),
  pos              TEXT,
  tense            TEXT,                         -- past | imperfect | imperative | null
  number           TEXT,                         -- sg | du | pl | null
  gender           TEXT,                         -- masc | fem | null
  person           TEXT,                         -- 1 | 2 | 3 | null
  features_json    TEXT                          -- full Kais Dukes feature bundle
);
```

### 9.2 Layer 2: Pedagogical curation (mutable, per course, InstantDB-backed)

```sql
-- One row per course (see ADR-010 multi-course design).
CREATE TABLE courses (
  id                    TEXT PRIMARY KEY,        -- "lqwg-v1"
  title                 TEXT NOT NULL,           -- "Learn Qur'an Without Grammar"
  author_name           TEXT,                    -- "Siraj Samsudeen"
  target_audience       TEXT,
  primary_language      TEXT NOT NULL,           -- "en"
  supported_languages   TEXT,                    -- JSON: ["en","ta"]
  created_at            TIMESTAMP NOT NULL
);

-- Teacher's pedagogical form, per course.
CREATE TABLE forms (
  id                INTEGER PRIMARY KEY,
  course_id         TEXT NOT NULL REFERENCES courses(id),
  root_id           INTEGER NOT NULL REFERENCES roots(id),
  arabic_canonical  TEXT NOT NULL,               -- "رَسُول" — what the student sees
  transliteration   TEXT,                        -- "rasūl"
  category_label    TEXT,                        -- "Noun (plural)" — human, per-course
  gloss             TEXT,                        -- "messenger"
  taught_in_lesson  INTEGER,                     -- null if not yet assigned
  taught_role       TEXT,                        -- "anchor" | "learning" | null
  notes             TEXT,
  sort_order        INTEGER,
  UNIQUE (course_id, root_id, arabic_canonical)
);

-- How forms bind to lemmas + feature filters. Many-to-many with filters.
CREATE TABLE form_lemma_bindings (
  id              INTEGER PRIMARY KEY,
  form_id         INTEGER NOT NULL REFERENCES forms(id),
  lemma_id        INTEGER NOT NULL REFERENCES lemmas(id),
  tense_filter    TEXT,                          -- "past"|"imperfect"|"imperative"|"all"
  number_filter   TEXT,                          -- "sg"|"du"|"pl"|"all"
  gender_filter   TEXT,                          -- "masc"|"fem"|"all"
  UNIQUE (form_id, lemma_id, tense_filter, number_filter, gender_filter)
);
```

### 9.3 Aggregation helper (Layer 1, built by `build-quran-db.py`)

```sql
-- Pre-aggregated: which roots appear in which verses, with lemma details.
CREATE TABLE verse_roots (
  id                 INTEGER PRIMARY KEY,
  verse_id           INTEGER NOT NULL REFERENCES verses(id),
  root_id            INTEGER NOT NULL REFERENCES roots(id),
  lemma_count        INTEGER NOT NULL,
  primary_lemma_id   INTEGER REFERENCES lemmas(id),
  all_lemma_ids      TEXT NOT NULL,              -- JSON: [1821, 1822]
  UNIQUE (verse_id, root_id)
);
```

`primary_lemma_id` is the most frequent lemma of this root **in this verse** (not globally). Ties broken by the lemma's global count. `all_lemma_ids` preserves the full set for multi-lemma verses.

---

## 10. Build and curation flow

### 10.1 Build (once per morphology update)

`build-quran-db.py` runs on the three vendored raw files. It:

1. Parses `quran-morphology.txt` segment-by-segment.
2. Populates `roots` and `lemmas` tables (from ROOT: and LEM: tags).
3. Populates `verse_words` (one row per segment).
4. Aggregates `verse_roots` from `verse_words`.
5. Loads `verses` from `quran-uthmani.txt` + `quran-trans-en-sahih.txt`.

The build **does not touch Layer 2.** Forms, selections, scores, lessons — all empty after a fresh build.

### 10.2 Course bootstrap (first time the teacher creates a course)

When the teacher creates a new course:

1. Teacher picks root(s) to include in the course.
2. System **auto-seeds default forms** by partitioning lemmas using the 6-tuple `(root, lemma, pos, verb_form, tense, number, gender)`. Each distinct tuple appearing in `verse_words` for that root becomes one default form with a single strict binding.
3. Teacher reviews the seeded forms in the picker UI:
   - Delete any forms they won't teach.
   - **Merge** close-surface forms (binding row added, extra form row removed).
   - Add `gloss`, `category_label`, lesson assignment, role.
4. Once the teacher is satisfied, the form catalog for this course is set.

The **teacher can re-run seeding** for newly added roots at any time. Seeding is idempotent — it does not overwrite forms the teacher has already customized.

### 10.3 Ongoing curation

During lesson prep, the teacher can:
- Add a new form to a root (e.g., they want to teach a Form X imperfect they skipped before).
- Merge two forms if students are confusing them.
- Reassign a form to a different lesson.
- Adjust category_label or gloss.

Changes write to InstantDB, sync to SQLite for offline tools.

---

## 11. Worked examples

### 11.1 Root ك ب ر (kabura) — Lesson 1

**Lemmas** (from morphology; ~6 relevant for root k-b-r):

| lemma_id | morph_key | arabic_canonical | pos | verb_form | count |
|---|---|---|---|---|---|
| L_1 | kabiyr | كَبِير | ADJ | — | ~40 |
| L_2 | >akobar | أَكْبَر | ADJ (elative) | — | ~25 |
| L_3 | kabura | كَبُرَ | VERB | I | ~9 |
| L_4 | {isotakobara | اِسْتَكْبَرَ | VERB | X | ~48 |
| L_5 | musotakobir | مُسْتَكْبِر | NOUN (Form X active participle) | — | ~12 |
| L_6 | kubraY | كُبْرَى | ADJ (elative, feminine) | — | ~5 |

(Kais Dukes may treat L_2 and L_6 as the same lemma with GENDER feature. Our schema accommodates either choice — we just read what the morphology says.)

**Teacher's forms for course `lqwg-v1`** (Lesson 1 teaches 5):

| form_id | arabic_canonical | gloss | taught_in_lesson | taught_role | bindings |
|---|---|---|---|---|---|
| F_1 | كَبِير | great, big | 1 | learning | (L_1, tense=all, num=all, gen=all) |
| F_2 | أَكْبَر | greater, greatest | 1 | learning | (L_2, tense=all, num=all, gen=masc) |
| F_3 | كُبْرَى | greatest (fem) | 1 | learning | (L_2, tense=all, num=all, gen=fem) or (L_6, all) |
| F_4 | كَبُرَ | was great | 1 | learning | (L_3, tense=past, num=all, gen=all) |
| F_5 | اِسْتَكْبَرَ | was arrogant | 1 | anchor | (L_4, tense=past, num=all, gen=all) |

**What's NOT in Lesson 1** (not taught — students will meet these later or not at all):
- `يَسْتَكْبِرُ` — Form X imperfect of L_4. Could become form F_6 in a later lesson.
- `مُسْتَكْبِر` — L_5. Could become form F_7.

Note how F_2 and F_3 are two different forms both pointing to lemma L_2 — **Category A partitioning by gender.** If Kais Dukes tags أَكْبَر and كُبْرَى as separate lemmas (L_2 vs L_6), the bindings are simpler; either way the teacher's forms come out the same.

### 11.2 Verse 7:138 — multi-lemma within one root

"اجْعَل لَّنَآ إِلَـٰهًا كَمَا لَهُمْ ءَالِهَةٌ"

**`verse_words` rows for this verse, root أ ل ه:**

| word | segment surface | lemma_id | number |
|---|---|---|---|
| 4 | إِلَـٰهًا | ilāh (L_A) | sg |
| 8 | ءَالِهَةٌ | āliha (L_B, if separate) or ilāh (L_A) with NUMBER=pl | pl |

**`verse_roots` row:**

```
verse_id: 7:138
root_id: ilah
lemma_count: 2
primary_lemma_id: L_A   (ilāh — more frequent globally)
all_lemma_ids: [L_A, L_B]
```

**Teacher's forms for course lqwg-v1, root أ ل ه:**

| form_id | arabic_canonical | bindings |
|---|---|---|
| F_ilah_sg | إِلَٰه | (L_A, num=sg) |
| F_ilah_pl | آلِهَة | (L_A, num=pl) OR (L_B, all) |

**Picker behavior for verse 7:138:**

The picker joins `verse_roots.all_lemma_ids` against the teacher's `form_lemma_bindings` for this course. Result: this verse teaches **two forms** (F_ilah_sg and F_ilah_pl). The picker UI shows: "7:138 · teaches إِلَٰه (sg) AND آلِهَة (pl) — multi-form verse." This is a pedagogically rich case (both forms, same root, same verse), and the teacher may prioritize it for the lesson.

### 11.3 Multi-course divergence for the same root

Imagine two courses:
- `lqwg-v1` — teaches masc and fem elative separately (F_2: أَكْبَر, F_3: كُبْرَى).
- `lqwg-kids-v1` — merges elative into one form (F_kids: "big family" binding to masc AND fem).

Same lemmas underneath. Different forms on top. Different lesson designs, same Qur'an.

---

## 12. Relationship to Quran Corpus and Kais Dukes

- **Roots**: identical concept and identifiers. Our `roots.morph_key` round-trips to Kais Dukes. A URL like `https://corpus.quran.com/qurandictionary.jsp?q=rsl` maps to one of our roots.
- **Lemmas**: identical concept. Our `lemmas.morph_key` round-trips to Kais Dukes's LEM: tag. We never modify a lemma's identity or features — we use Kais Dukes as the source of truth.
- **Forms**: ours only. Not a Quran Corpus concept. Do not export forms back upstream; they are local curriculum decisions.

When communicating with students or other teachers familiar with Quran Corpus, we should:
- Use "root" freely — shared vocabulary.
- Use "lemma" only when discussing morphology or crossing into linguistic territory.
- Use "form" when teaching or discussing our curriculum; clarify it's our term if the audience might confuse it with lemma.

---

## 13. Student-facing implications

The student MVP (ADR-011 Phase 1) uses:
- `selections` — which verses are in which lesson.
- `forms` and `form_lemma_bindings` — to show what word-shape each verse card teaches.
- `verse_roots` — to show which roots are in a verse at a glance.
- `verse_words` — to highlight the exact word positions in the Arabic text (see §14 Q1).

Specifically, when rendering a verse card for a lesson, the SRS engine:
1. Fetches the `studentCards` row → gets `verse_ref`, `form_id` assigned to this card.
2. Fetches `form_lemma_bindings` for that form → gets the (lemma, feature) set.
3. Fetches `verse_words` rows for that verse from InstantDB to find word positions where `(lemma_id, tense, number, gender)` matches any binding.
4. Bolds those exact word positions in the Arabic text on the card.

**Root Explorer (future phase)** becomes straightforward: query `verse_roots` for any verse the student is looking at → join with `form_lemma_bindings` for the student's enrolled course → render which forms the teacher has taught (or noted as not-yet-taught) for words in this verse. No backend API needed.

---

## 14. Open questions

**Q1: What's seeded to InstantDB? (DECIDED 2026-04-14)**

Everything from Layer 1 is seeded: `roots` (1,651), `lemmas` (~4,000), `verses` (6,236), `verse_roots` (~45,000), `verse_words` (~130,000), `surahs` (114). Plus all Layer 2 tables per course and per student.

Earlier drafts of this doc and ADR-010 kept `verse_words` local-only. That was reversed: seeding it enables exact word-level highlighting from MVP day one, clean form-resolution joins, and unblocks Root Explorer. See ADR-010 Revisions for full reasoning.

**Q2: What if the teacher adds a binding that doesn't match any actual Qur'anic word?**
E.g., teacher defines a form with `tense=imperfect` but the lemma has no imperfect occurrences in the Qur'an. This binding is valid but produces zero matches. The picker should surface a warning: "This form has no verses." The teacher can delete or adjust.

**Q3: Root Explorer — do we expose raw lemmas, or only curated forms?**

Tension: a student exploring Surah Yāsīn on their own may hit words whose lemma is not yet covered by any form in their enrolled course. Do we:
- (a) Hide such words (only show curated forms).
- (b) Show them as "uncurated — lemma X, no lesson yet."
- (c) Auto-create a "raw lemma" form at display time.

**Recommendation:** defer until Root Explorer is designed. But flag (b) as the likely answer — honesty is better than hiding.

**Note (2026-04-14):** The data-layer blocker for Root Explorer is now removed — `verse_words` is in InstantDB. Feature is still deferred from Phase 1 MVP per ADR-011 scope, but implementation is unblocked.

**Q4: Inherited forms across courses (future).**
A second course might want to start from the first course's forms and diverge. Worth considering a "fork course" flow in the future. Out of scope for v1.

---

## 15. Summary (TL;DR)

- **Root**: consonantal skeleton. Linguistic fact. Same as Quran Corpus.
- **Lemma**: canonical dictionary headword. Linguistic fact. Same as Quran Corpus / Kais Dukes.
- **Form**: pedagogical word-shape the student learns to recognize. Our concept, per-course, built from one or more lemma bindings with optional feature filters.
- **Governing principle**: "If the student can see it and feel it, then it is one form."
- Features ignored when identifying forms: case, definiteness, prefixes, attached pronouns, person, mood.
- Features that can distinguish forms (teacher judgment): tense, number, gender. Patterns (فَاعِل vs مَفْعُول etc.) always distinguish.
- Data model: `roots` + `lemmas` in Layer 1 (shared with Quran Corpus); `forms` + `form_lemma_bindings` in Layer 2 per course.
- Build process generates default forms per (root, lemma, pos, verb_form, tense, number, gender) 6-tuple; teacher prunes and merges.

---

_This document is a living concept foundation. When design questions arise, update this doc and reference it from the relevant ADR or commit message._
