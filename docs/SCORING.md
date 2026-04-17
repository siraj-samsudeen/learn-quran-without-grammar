# Verse Scoring Algorithm (v4)

> **Status (2026-04-17):** Major revision. Scoring unit changed from **full verse** to **waqf sentence** (waqf-mark-delimited fragments). Tier 1 dimensions reduced from 4 to 3 (D1 avg frequency, D3 content coverage, D4 length sweet spot). Tier 2 collapsed to single `hookScore`. اللَّه excluded from form partitioning. See [Slice 1 Picker Spec](superpowers/specs/2026-04-17-slice-1-verse-picker-design.md) for the full design context and interactive mockups.

This document defines the scoring system used to rank Qur'anic **sentences** (waqf-delimited fragments) for lesson inclusion.

---

## Scoring Unit: Waqf Sentence

Long verses are pre-split at waqf (stop) marks during `build-quran-db.py`:

| Mark | Meaning | Effect |
|---|---|---|
| ۚ | Strong stop — end of complete thought | Sentence boundary |
| ۖ | Permissible stop | Sentence boundary |
| ۗ | Preferred continue — gentle pause | Sentence boundary |

Each fragment becomes a **sentence** — the scorable, pickable, teachable unit. Short verses (no waqf marks) remain as whole ayahs. Each sentence stores its parent verse reference + word range (`startWord:endWord`).

**Validated on Lesson 1 data:** 1,978 candidate verses (ilāh + kabura) produce 2,512 sentences. After excluding اللَّه-only sentences: 290 candidates. 70% fall in the 4-12 word sweet spot.

---

## Four-Phase Scoring Architecture

| Phase | When | Dimensions | Varies by |
|---|---|---|---|
| **A1: Universal objective** | Once, after Layer 1 seed | D1, D3, D4 | Nothing — same for every teacher, lesson, course |
| **A2: Universal subjective** | After LLM scoring run | hookScore (0-10) | Nothing (scored once per sentence per course) |
| **B: Authoring-time** | When teacher creates a lesson | Curriculum overlap | Lesson order |
| **C: Student-time** | Live, per student | Memorization, affinity | Per student |

Phases are additive — later phases layer on top of earlier ones. Phase A1 is always available; A2 requires an LLM run; B requires lesson context; C requires student state.

---

## Phase A1 — Three Deterministic Dimensions

All normalized to **0-10**. Computed from Layer 1 data alone.

### D1: Average Word Frequency

How common are the words in this sentence across the entire Qur'an?

**Formula:** `normalize(Σ(all token lemma frequencies) / word count)`

For each word in the sentence, look up its lemma's frequency across all 130,000 morphological segments in the Qur'an. Sum and divide by word count. Normalize to 0-10 across all candidate sentences.

| Scenario | Raw value | Meaning |
|---|---|---|
| All ultra-common words (اللَّه, عَلِمَ, أَرْض) | ~3,000+ | Student learns words they'll see everywhere |
| Mix of common + rare | ~1,000-2,000 | Balanced |
| Mostly rare words | <500 | Student learns niche vocabulary |

**Includes function words** (و, ال, ب, etc.) — for Lesson 1, even function words are new to the student.

### D3: Content Coverage %

What percentage of the Qur'an's content vocabulary does this sentence unlock?

**Formula:** `normalize(Σ(unique content-lemma frequencies) / total Qur'an word segments × 100)`

For each **unique content lemma** (excluding function words: و, ال, ل, مِن, ف, ب, ما, لا, إِلّا, إِنّ, فِي, عَلَى, إِلَى, أَن, أَنّ, يا, قَد, ثُمَّ, بَل, لَم), sum its Qur'an-wide frequency **once** (no double-counting if a lemma appears multiple times in the sentence). Divide by total segments. Normalize to 0-10.

| Value | Example | Meaning |
|---|---|---|
| >8% | Ayat al-Kursi (sentence 1) | One sentence unlocks ~8% of Qur'anic content vocabulary |
| 2-5% | Typical good candidate | Solid vocabulary return |
| <1% | Short sentence with rare words | Low coverage value |

**Why not D2 (Total Coverage)?** D2 (including function words in coverage) was dropped as redundant — its signal is already captured by D1. High-frequency words produce high coverage automatically. Keeping D2 only inflated scores for long sentences without adding new information.

### D4: Length Sweet Spot

Is this sentence the right size for student learning?

**Formula (piecewise):**

| Word count | Score | Rationale |
|---|---|---|
| 1-2 | 4 | Too short — no story context |
| 3-4 | 7 | Short phrase — workable |
| 5-8 | **10** | **Sweet spot** — ideal for working memory |
| 9-12 | 9 | Comfortable — still learnable |
| 13-15 | 6 | Getting long |
| 16-20 | 3 | Challenging |
| 21+ | 1 | Needs further splitting |

The sweet spot (5-12 words) aligns with cognitive load research for language learners and covers 64% of candidate sentences after waqf splitting.

---

## Phase A2 — LLM-Subjective

### hookScore (0-10)

Collapsed from the previous three-dimension Tier 2 (story + familiarity + teaching_fit). The LLM produces a single 0-10 score with a `hookReason` justification. See `.claude/rules/scoring-t2-guidelines.md` for the prompt.

The `hookReason` is visible to the teacher as a caption under each sentence card. Teacher can click "Use as remark" to seed `selection.remark` — offered, not auto-applied.

**Slice 1:** No API. Teacher exports a scoring kit, runs in a separate Claude Code session, imports results via `tools/tier2-scores/{root}.json`.

---

## Phase B — Authoring-Time

### Curriculum Overlap

Computed when the teacher creates a lesson. Rewards sentences containing roots/forms already taught in previous lessons (spaced review).

| Condition | Score |
|---|---|
| Root is NEW (not in any previous lesson) | 0 |
| Root was taught in a previous lesson | 5 |
| Exact FORM was already taught | 10 |

Must be recomputed when lesson order changes.

---

## Phase C — Student-Time (future)

Three student-specific signals, all deferred past Slice 1:

1. **Memorization match** — does this sentence come from a surah the student has memorized? Higher familiarity → better for teaching (student already knows the sound).
2. **Student affinity** — does the student love this verse/surah? Emotional connection aids retention.
3. **Review scheduling** — FSRS-driven: is this sentence due for review? (Drives interleaved review, not picker ranking.)

---

## Composite Score

```
Phase A1: composite = (D1n × w1 + D3n × w3 + D4 × w4) / (w1 + w3 + w4)
Phase A1+A2: composite = (D1n × w1 + D3n × w3 + D4 × w4 + hookScore × w_hook) / (w1 + w3 + w4 + w_hook)
```

**Recommended weights:** D1=35, D3=25, D4=40 (teacher-adjustable via sliders in the picker).

**Three presets:**

| Preset | D1 | D3 | D4 | Character |
|---|---|---|---|---|
| **Recommended** | 35 | 25 | 40 | Balanced — short common-word sentences |
| Short & Sweet | 20 | 20 | 60 | Aggressive brevity |
| Frequency | 50 | 25 | 25 | Common words prioritized |

---

## Form Diversity

Form diversity is a **presentation** constraint, not a scoring dimension. After ranking by composite score, the picker applies a **diminishing returns decay** (default 0.7) to prevent any single form from monopolizing the top-N:

```
effective_score = composite × (decay ^ times_this_form_already_picked)
```

The greedy algorithm picks the sentence with the highest effective score, increments that form's count, repeats until top-N is filled. This ensures all forms get at least one representative while high-scoring forms can still earn 2-3 slots.

**Decay factor:** 0.7 default, teacher-adjustable. Lower = more aggressive diversity; higher = more score-pure.

---

## اللَّه Exclusion

The proper noun اللَّه (lemma of root أله) appears in 92% of candidate verses. It is excluded from form partitioning:

- Sentences are kept only if they contain a non-اللَّه target form (إِلٰه, اللَّهُمَّ, or any kabura form)
- اللَّه is not counted in form diversity
- This reduces ilāh + kabura candidates from 2,512 to 290 sentences

Rationale: the word "Allah" is already recognized by every Muslim child. The lesson teaches the root أله through the concept-word إِلٰه ("a god"), not the proper noun.

---

## Teacher Modifiers (Tier 3)

### Teacher Star (+5 additive)

The teacher can **star** a sentence for a priority boost:

| Star | Modifier | Effect |
|---|---|---|
| Unstarred | +0 | Default |
| ⭐ Starred | +5 | Floats above similar-quality unstarred sentences |

### Fragment Penalty — Eliminated

The previous ×0.7 fragment penalty for long verses is **no longer needed**. Waqf-based pre-fragmentation means every candidate is already a sentence-sized unit. D4 (length sweet spot) naturally penalizes any sentence that's still too long after waqf splitting.

---

## Where Scores Live

Scores live in InstantDB across two entities (see [DATA-MODEL.md](DATA-MODEL.md)):

- **`verseScores`** — one row per `(course, sentence)`. Holds sentence-level dimensions: `hookScore` · `hookReason` · `updatedAt`.
- **`verseRootScores`** — one row per `(course, sentence, root)`. Holds per-root dimensions: `d1_avg_freq` · `d3_content_coverage` · `d4_length` · `curriculumScore` · `starBonus` · `compositeScore` · `scoreNotes` · `updatedAt`.

---

## When to Score

- **Phase A1** — during `build-quran-db.py`, computed from Layer 1 morphology + lemma frequencies. Available instantly after seed.
- **Phase A2** — on-demand LLM scoring via Tier-2 kit export/import. Produces `hookScore` + `hookReason`.
- **Phase B** — recomputed when lesson order changes or a new root joins the course.
- **Phase C** — live per-student, driven by FSRS state + memorization claims.

---

## Origin

v1: derived from teacher's selection decisions in Lesson 1. v2: three-tier pipeline. v3: fragment penalty, teacher star, automated roles. **v4 (this version):** sentence-level scoring via waqf fragmentation, 3-dimension model (D1/D3/D4), four-phase architecture (A1/A2/B/C), اللَّه exclusion, diminishing-returns diversity. Designed interactively via the 2026-04-17 brainstorm session; validated on all 1,978 ilāh+kabura candidate verses with interactive HTML prototypes.
