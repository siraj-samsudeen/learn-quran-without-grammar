# Slice 1 — Verse Picker Design Spec

_Created: 2026-04-17 · Brainstormed interactively with Claude. Authoritative for Slice 1 picker implementation._

> **Companion artifacts:** Interactive picker mockups in [docs/design/mockups/picker-scoring/](../../design/mockups/picker-scoring/) (v1 through v4). Open `verse-picker-explorer-v4.html` for the final prototype — it's a functional picker with real data from ilāh + kabura.

---

## 1 · Objective

The teacher starts with a seed phrase ("Allahu akbar"), adds its roots (ilāh + kabura), and sees **every Qur'anic sentence containing those roots**, ranked by an objective score. The teacher picks 10-12 sentences for Lesson 1. That's the core loop.

---

## 2 · Key Design Decisions

All decisions made during the 2026-04-17 brainstorm session.

### 2.1 Sentence as the teaching unit (not verse)

Long ayahs (e.g., Ayat al-Kursi at 50 words) are too large for a student to learn as one unit. The Qur'an's **waqf (stop) marks** — scholarly-sanctioned pause points refined over 1,400 years — provide natural sentence boundaries:

| Mark | Meaning | Our use |
|---|---|---|
| ۚ | Strong stop — end of complete thought | Sentence boundary |
| ۖ | Permissible stop | Sentence boundary |
| ۗ | Preferred continue — gentle pause | Sentence boundary |

**Pre-fragmentation:** All verses in Layer 1 are split at waqf marks during `build-quran-db.py`. Each fragment becomes a **sentence** — the scorable, pickable, teachable unit. Sentences inherit their parent verse reference (`surah:verse` + `startWord:endWord`).

**Validated on real data:**
- Ayat al-Kursi (2:255) → 9 sentences of 3-9 words each
- Al-Baqarah 2:282 (longest verse) → 17 sentences of 3-18 words
- 3,102 of 6,236 verses (50%) have waqf marks
- 70% of resulting sentences fall in the 4-12 word sweet spot

**Audio implication:** Reciters naturally pause at waqf marks → silence in audio → clean cut points. This largely eliminates manual audio-fragment timestamp work.

**Translation implication:** Sentence-level translation aligns naturally with Sahih International (which translates sentence by sentence). No forced mid-sentence cuts.

### 2.2 اللَّه excluded from form partitioning

The proper noun اللَّه appears in 92% of all candidate verses (1,821 of 1,978). Including it as a "form" makes it dominate every ranking. Since every Muslim child already recognizes the word "Allah" by sound, its teaching value in Lesson 1 is minimal — the lesson teaches the root أله through the concept-word إِلٰه ("a god"), not the proper noun.

**Decision:** Exclude اللَّه from the forms list entirely. Sentences containing اللَّه are kept only if they ALSO contain إِلٰه, اللَّهُمَّ, or a kabura form. This reduces the candidate pool from 2,512 to 290 sentences — a clean, manageable size.

### 2.3 Three-dimension scoring model

D2 (Total Coverage %) was dropped as redundant — its signal is already captured by D1 (high-frequency words produce high coverage). Three dimensions remain:

| Dimension | What it measures | Formula | Range |
|---|---|---|---|
| **D1: Avg Word Frequency** | How common are the words in the Qur'an? | Σ(all token freqs) / word count | 0-10 normalized |
| **D3: Content Coverage %** | What % of new vocabulary does this sentence unlock? | Σ(unique content-lemma freqs) / total Qur'an words | 0-10 normalized |
| **D4: Length Sweet Spot** | Is the sentence an ideal learning size? | 5-8w=10, 9-12w=9, 4w=7, 13-15w=6, 16-20w=3, 21+=1 | 0-10 |

**Recommended weights:** D1=35, D3=25, D4=40 (teacher-adjustable via sliders).

**Composite score** = (D1n × w1 + D3n × w3 + D4 × w4) / (w1 + w3 + w4)

### 2.4 Four-phase scoring architecture

Scoring is layered by when it can be computed:

| Phase | When computed | Dimensions | Varies by |
|---|---|---|---|
| **A1: Universal objective** | Once, after Layer 1 seed | D1, D3, D4 | Nothing — same for every teacher, every lesson, forever |
| **A2: Universal subjective** | After LLM scoring run | hookScore (story + familiarity + teaching fit) | Nothing (scored once per verse per course) |
| **B: Authoring-time** | When teacher creates a lesson | Curriculum overlap (which roots are already taught?) | Lesson order |
| **C: Student-time** | Live, per student | Memorized this surah? Student affinity? | Per student |

**Slice 1 builds Phase A1 first** (fully deterministic, available instantly after seed). Phase A2 comes via the Tier-2 scoring kit (see §5). Phases B and C layer on in later slices.

### 2.5 Form diversity via diminishing returns

Without diversity control, high-frequency forms (like إِلٰه at 131 sentences) dominate the top-30. A **decay factor** (default 0.7) reduces the effective score for each additional pick from the same form:

- 1st pick from form X: full score (×1.00)
- 2nd pick: ×0.70
- 3rd pick: ×0.49

This ensures all forms get at least one representative while still letting high-scoring forms get 2-3 slots. Decay is teacher-adjustable.

### 2.6 Seed phrases for phrase-to-root mapping

New entity `seedPhrases` with InstantDB link to `roots`. Pre-populated with the 7 Adhān phrases + their root mappings during the P3 seed step. Teacher types phrase → system suggests roots → teacher confirms → F0.1 fires.

### 2.7 Picker is DB-only (no student surface)

Slice 1 deliverable is DB-only. Teacher authors through the picker, all data lives in InstantDB. No Jekyll export, no student preview, no rendering. Publish = phase-state transition (`phasePublished = "done"`).

### 2.8 Tier-2 LLM scoring via separate Claude Code session

No API integration in Slice 1. Teacher clicks "Prepare scoring kit" → app exports prompt + candidate JSON to `tools/tier2-scores/`. Teacher runs it in a separate Claude Code session, saves result to `tools/tier2-scores/{root}.json`. Teacher clicks "Import" in app → scores written to DB.

---

## 3 · Architecture

Three cooperating processes, one cloud:

```
                   ┌───────────────────────────┐
                   │       InstantDB cloud     │
                   │  (source of truth for L1  │
                   │   narrowed + L2 + jobs)   │
                   └──────────────┬────────────┘
                                  │ realtime sync
           ┌──────────────────────┼────────────────────────┐
           │                      │                        │
     (1) Next.js app         (2) Python daemon       (3) Python tooling
     instantdb-app/          tools/worker.py         tools/build-quran-db.py
     - /picker               - polls audioJobs       tools/seed-instantdb-from-sqlite.py
     - /seed                 - edge-tts              tools/sync-from-cloud.py
     - /api/tier2-scan       - auto-timestamps       tools/export-tier2-kit.py
     - /api/tier2-import     - uploads to $files
     - /audio-phase          - writes back to DB
     - magic-link auth
```

**Auth:** InstantDB magic-link from day 1. `courseMembers` row pre-seeded for Siraj as `owner`.

**Audio storage:** InstantDB `$files` — MP3s never touch git.

**Layer 1 narrowing:** Root-closure (only ilāh + kabura's forms/lemmas/verses), not verse-closure.

**Sync:** Pull-only (cloud is source of truth after seed).

---

## 4 · Picker UI

### 4.1 Layout (validated in v4 prototype)

```
┌─ Header ──────────────────────────────────────────────────────────────┐
│ Sentence Picker · Lesson 1                                           │
├─ Controls ────────────────────────────────────────────────────────────┤
│ [D1 slider 35] [D3 slider 25] [D4 slider 40] [Decay slider 0.70]    │
│ Root: [All] [ilāh] [kabura]  Show: [30▾]  ☑ Diversity               │
│ Presets: [★Recommended] [Short] [Frequency]                         │
├─ Sticky Selection Bar ────────────────────────────────────────────────┤
│ 10 /10-12 · ilāh ██ 1(1f) · kabura ██████ 9(9f) · 10 forms         │
│ [chips: إِلٰه×1 كَبِير×2 أَكْبَر×1 ...]  [Auto Top 10] [Clear] [Details▼] │
├─ Detail Panel (expandable) ───────────────────────────────────────────┤
│ FORM COVERAGE        │ SELECTION STATS      │ BUDGET                  │
│ ilāh (1 form)        │ 10 sentences         │ 10 of 20 forms covered  │
│   إِلٰه ██ 1          │ 86 total words       │ MISSING:                │
│ kabura (9 forms)     │ 8.6 avg words        │ [كَبِيرَة] [كِبَر] ...    │
│   اسْتَكْبَرَ ████ 2   │ 5 shortest           │                         │
│   كَبِير ██ 1         │ 12 longest           │                         │
│   ...                │                      │                         │
├─ Table ───────────────────────────────────────────────────────────────┤
│ # │ Score │ Ref        │ Forms      │ Arabic          │ ✓ │ English   │
│ 1 │  7.7  │ Al-Jath... │ كَبِيرَة(k) │ وَلَهُ ٱلْكِب... │ ☑ │ And to H..│
│ 2 │  7.0  │ Muhammad   │ إِلٰه(i)   │ فَٱعْلَمْ أَنّ... │ ☑ │ So know..│
│ ...                                                                   │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 Interaction model

1. **Auto-select top 10** on load based on composite score + diversity
2. **Click any row** to toggle selection
3. **Sticky bar** updates in real-time: count, root balance, form chips, word totals
4. **Details panel** expands to show form coverage tables (sorted by count, bold if >1) + missing forms + budget
5. **Adjust sliders** → ranking recomputes instantly → teacher can re-run Auto Top 10
6. **Filter by root** to focus on ilāh or kabura sentences
7. **Three presets:** Recommended (35/25/40), Short & Sweet (20/20/60), Frequency (50/25/25)

### 4.3 Visual indicators

- **Solid blue right-border** on Arabic = full āyah (no split)
- **Dashed gray right-border** = waqf sentence (fragment of longer verse)
- **Green row highlight** = selected
- **Gold rank badge** = top 10, **blue** = 11-20, **gray** = 21+
- **Stacked color bar** shows D1/D3/D4 contribution to score
- **Form chips** colored by root: blue = ilāh, pink = kabura

### 4.4 formLessonDecision gate

Soft gate at Publish. Three states per form:
- `taught` — form used in this lesson
- `unassigned` — default, no explicit decision needed
- `skipped` — teacher explicitly rejects with reason (first-class action, not edge case)

No hard gate: `unassigned` is a valid terminal state. Publish just flips `phasePublished`.

### 4.5 Budget ranges (soft warning)

| Budget | Range | Enforcement |
|---|---|---|
| Forms | 5-7 | Soft warning if outside |
| Sentences | 10-12 | Soft warning if outside |
| Words | 100-120 | Soft warning if outside |

PRD says "ranges, never hard caps" — the picker shows green/yellow indicators but never blocks Publish.

---

## 5 · Tier-2 LLM Scoring Flow

No API in Slice 1. The flow is manual but app-assisted:

1. Teacher clicks "Prepare Tier-2 scoring for ilāh" in the picker
2. App generates a scoring kit: prompt (rewritten from `.claude/rules/scoring-t2-guidelines.md` to output collapsed `hookScore` + `hookReason`) + candidate sentences as JSON
3. Kit saved to `tools/tier2-scores/`; app shows "paste into Claude Code" instructions
4. Teacher runs in separate session → saves result to `tools/tier2-scores/ilah.json`
5. Teacher clicks "Import Tier-2 scores" → app scans `tools/tier2-scores/`, lists matches
6. Teacher clicks Import → app validates schema, writes `hookScore` + `hookReason`, logs to `llmDrafts`
7. Picker re-ranks with Phase A1 + A2 combined

`hookReason` appears as a small gray caption under each sentence card. Teacher can click "Use as remark" to seed `selection.remark` — not auto-applied.

---

## 6 · Thin-Slice Build Order

Build order B (thin-slice vertical): build a trivial end-to-end first, then widen each feature.

| Day | Deliverable |
|---|---|
| 1-2 | P1: `build-quran-db.py` with waqf fragmentation + root-closure narrowing |
| 3 | P3: seed InstantDB + `seedPhrases` (7 Adhān phrases) |
| 4-5 | F0.1: Add root → form partition. F0.2: Phase A1 scoring (D1/D3/D4) |
| 6-8 | F1: Picker UI (sentence list + sliders + diversity + selection + summary bar) |
| 9-10 | F0.3: Tier-2 scoring kit export + import. Picker re-ranks with hookScore |
| 11-12 | F2: Annotation (remark, root/form notes, inline translation) |
| 13-15 | F3: Audio production (TTS preview, fragment timestamps, audioJobs queue via worker daemon) |
| 16-17 | F4: Publish + formLessonDecision log |
| 18-19 | Full coverage tests (unit + E2E via feather-testing DSL) |
| 20 | Polish + acceptance: teacher authors Lesson 1 end-to-end |

---

## 7 · Schema Additions for Slice 1

### New entity: `seedPhrases`

```
seedPhrases {
  id              : string
  arabic          : string      // "اللَّهُ أَكْبَرُ"
  transliteration : string      // "Allāhu akbar"
  english         : string      // "Allah is greatest"
  category        : enum        // adhan | salah | dhikr
  notes           : string?
}
```

Link: `seedPhrases ↔ roots` (many-to-many, InstantDB first-class link).

Populated via `seed-instantdb-from-sqlite.py` (P3) with 7 Adhān phrases inline.

### New entity: `sentences` (waqf fragments)

```
sentences {
  id          : string
  verse       : link → verses
  startWord   : number         // 1-based position in verse
  endWord     : number
  arabic      : string         // fragment text
  wordCount   : number
}
```

Pre-computed during P1 build. Scoring dimensions (D1, D3, D4) stored on `verseRootScores` keyed by sentence (not verse).

---

## 8 · Scoring Algorithm (Phase A1)

See [SCORING.md](../../SCORING.md) for the full algorithm. Summary of changes from the previous version:

| Aspect | Previous (SCORING.md v3) | New (this spec) |
|---|---|---|
| Scoring unit | Full verse | Waqf sentence |
| Dimensions (Tier 1) | 4: length, formFreq, formDominance, curriculumScore | 3: D1 (avg freq), D3 (content coverage), D4 (length sweet spot) |
| Form partitioning | All forms including اللَّه | اللَّه excluded |
| Diversity | None (implicit in form-first navigation) | Diminishing returns decay (default 0.7) |
| Fragment penalty | ×0.7 multiplier for long verses | Eliminated — waqf fragmentation handles long verses |
| Presentation | Form-first sidebar → verses within form | Score-first ranking → root/form as filter |

---

## 9 · Acceptance Criteria

Slice 1 is done when:

1. Teacher opens the picker, sees 290 waqf-split sentences ranked by Phase A1 score
2. Teacher adjusts weights via sliders, sees ranking update in real-time
3. Teacher toggles sentences, sees selection summary update (count, roots, forms, words, missing forms)
4. Teacher runs Tier-2 scoring kit, imports results, sees hookScore captions appear
5. Teacher picks 10-12 sentences, writes remarks/annotations, generates audio
6. Teacher clicks Publish → lesson marked as `phasePublished = "done"` in InstantDB
7. Jekyll Lesson 1 remains untouched throughout
8. Full test suite passes (unit tests for scoring math + E2E for the authoring flow)

---

## 10 · Mockup Index

All in `docs/design/mockups/picker-scoring/`:

| File | What it shows | Key insight |
|---|---|---|
| `ayat-al-kursi-analysis.html` | Single verse word-frequency analysis | Color-coded word chips by lemma frequency |
| `verse-scoring-comparison.html` | M1 vs M2 metrics comparison (10 verses) | Why M2 (token coverage) exceeds 100% |
| `three-metrics-comparison.html` | M1 vs True Coverage vs Content Coverage | Why D2 is redundant, stacked function/content bars |
| `verse-picker-explorer-v1.html` | 1,978 verses, 4 dimensions, verse-level | First interactive prototype with sliders |
| `verse-picker-explorer-v3.html` | 290 sentences, 3 dimensions, waqf-split | Sentence-level scoring, اللَّه excluded |
| `verse-picker-explorer-v4.html` | Interactive picker with selection + summary | Final prototype: checkboxes, detail panel, form tables, missing-forms |

---

_Maintainers: this spec is the authoritative design for Slice 1's picker and scoring. SCORING.md reflects the algorithm; this spec covers the full UX + architecture + decisions. When they diverge, resolve together._
