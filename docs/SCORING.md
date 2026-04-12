# Verse Scoring Algorithm (v2)

This document defines the scoring system used to rank Qur'anic verse candidates for lesson inclusion. Scores are computed per verse and stored in `docs/roots/{root}.json`.

---

## Three-Tier Pipeline

Scoring happens in three passes:

| Tier | Name | When | Method |
|------|------|------|--------|
| **1** | Deterministic | Build time (`build-root-inventory.py`) | Computed from verse text + form data |
| **1-late** | Deterministic (post-lesson) | After lesson finalization | Lookup against taught forms |
| **2** | LLM-subjective | On-demand scoring pass | LLM reads verse + translation, scores 0–10 with reason |
| **3** | Teacher adjustment | In the picker UI | Teacher nudges score up/down after reviewing |

---

## Scoring Dimensions

All dimensions are normalized to **0–10**.

### Tier 1 — Deterministic (computed at build time)

#### 1. Verse Length (0–10)

Formula: `max(0, 10 − word_count)`

| Words | Score | Feel |
|-------|-------|------|
| 3 | 7 | Short phrase — ideal for Learn |
| 5 | 5 | Comfortable |
| 7 | 3 | Medium — fine for Practice |
| 10+ | 0 | Long — needs strong story to justify |

#### 2. Form Frequency (0–10)

How common is this specific form in the Qur'an? Common forms are higher priority to teach.

Formula: `min(10, round(log₁₀(count) × 4))`

| Count | Score | Example |
|-------|-------|---------|
| 1 | 0 | Rare form (hapax) |
| 3 | 2 | mursila (3) |
| 10 | 4 | risala (10) |
| 30 | 6 | aliha (30) |
| 100 | 8 | arsala (130) |
| 300+ | 10 | rasul (332), ilah (2851 for Allah form) |

**Multi-form bonus:** If additional forms of the same root appear in the verse:
- +1 if one additional form
- +2 if two or more additional forms
- Still capped at 10

#### 3. Form Dominance (0–10)

What percentage of the root's total occurrences does this form represent? Higher dominance = teach first.

Formula: `round(dominance_pct / 10)`

| Dominance | Score | Meaning |
|-----------|-------|---------|
| 65% | 7 | Primary form (e.g., rasul = 64.7% of root) |
| 30% | 3 | Secondary form |
| 10% | 1 | Tertiary |
| 2% | 0 | Rare variant |

**Multi-form bonus:** Same as Form Frequency (+1/+2, capped at 10).

### Tier 1-late — Deterministic (after lesson finalization)

#### 4. Curriculum Connection (0–10)

Rewards verses containing roots/forms already taught in previous lessons (spaced review). Must be recalculated whenever lesson content changes.

| Condition | Score |
|-----------|-------|
| Root is NEW (not in any previous lesson) | 0 |
| Root was taught in a previous lesson | 5 |
| Exact FORM was already taught | 10 |

### Tier 2 — LLM-subjective (scored with reason)

Each Tier 2 dimension is scored as: `{ "score": N, "reason": "..." }`

The reason string serves as an audit trail — the teacher can review and override.

#### 5. Story, Memorability & Emotion (0–10)

Does this verse have a narrative hook? Is it emotionally powerful? Will the student remember it?

| Range | Criteria |
|-------|----------|
| 0–2 | Abstract, no narrative, emotionally neutral |
| 3–4 | Some emotional weight but no clear story (ruling, warning) |
| 5–6 | Story hook (who said what to whom) |
| 7–8 | Strong story + emotional punch |
| 9–10 | Iconic story every Muslim knows (Ibrahim, Mūsā, Iblīs, Yūnus) with powerful emotion |

#### 6. Familiarity & Worship Connection (0–10)

Is this verse from a surah that students already hear regularly? Connected to daily worship?

Scoring is anchored by a **teacher-curated surah reference list**:

| Tier | Surahs | Base signal |
|------|--------|-------------|
| **A — Universal** | Last 10–15 surahs (Juz' 30 short surahs), Al-Fatiha | Weekly exposure for virtually every Muslim |
| **B — Very common** | Yasin, Al-Mulk, Al-Kahf, As-Sajdah, Qaf, Al-A'la, Al-Baqarah last 2 ayat | Regional variation but widely known |
| **C — Well-known** | Ar-Rahman, Al-Waqi'ah, Ad-Dukhan, Maryam | Commonly recited but not universal |
| **D — Everything else** | Longer surahs, less commonly recited | Default |

The LLM uses this list as a strong signal. A Tier A surah verse starts high (7–10), Tier D starts low (0–3). The LLM adjusts for specific verse fame (e.g., Ayat al-Kursi in Al-Baqarah scores high despite Baqarah being Tier D overall).

Direct worship connection (adhān, shahādah, salāh phrases) adds further weight.

#### 7. Teaching Fit (0–10) — holistic

The LLM's overall assessment of how good this verse is for teaching this root. This is the catch-all subjective score that covers everything not captured by Story or Familiarity, including:

- **Completeness:** Does the verse stand alone or need surrounding context?
- **Root centrality:** Is the root word central to the verse's meaning, or incidental?
- **Teaching clarity:** Will the student understand the root's meaning from this verse?
- **Anything else** the LLM notices that makes this verse better or worse for teaching.

| Range | Criteria |
|-------|----------|
| 0–3 | Root is incidental, verse is a fragment, poor teaching value |
| 4–6 | Root is relevant, verse mostly works, decent teaching value |
| 7–10 | Root is central, verse is self-contained, excellent teaching value |

### Tier 3 — Teacher Adjustment

#### 8. Teacher Adjustment (−5 to +5)

Applied in the picker UI. The teacher sees computed scores and nudges:

| Adjustment | Meaning |
|------------|---------|
| +5 | "I love this verse, must include" |
| +3 | "Stronger than the score suggests" |
| 0 | "Score looks right" (default) |
| −3 | "Weaker than the score suggests" |
| −5 | "Skip this, score is misleading" |

---

## Total Score Calculation

```
tier1 = length + form_freq + form_dominance
tier1_late = curriculum
tier2 = story + familiarity + teaching_fit
total = tier1 + tier1_late + tier2 + teacher_adj
```

**Maximum possible:** 75 (7 × 10 + 5)
**Minimum possible:** −5 (all zeros, teacher pushes down)

---

## Score Ranges

| Range | Label | Action |
|-------|-------|--------|
| 55–75 | ⭐ Excellent | Present first, strongly recommend |
| 35–54 | 🟢 Good | Solid candidate |
| 18–34 | 🟡 Acceptable | Present if no better options |
| 0–17 | 🔴 Weak | Skip unless teacher asks |

---

## Where Scores Live

Scores are stored per verse in `docs/roots/{root}.json`:

```json
{
  "ref": "6:74",
  "scores": {
    "length": 1,
    "form_freq": 6,
    "form_dominance": 1,
    "curriculum": 0,
    "story": { "score": 9, "reason": "Ibrahim confronting his father about idols — iconic story every Muslim knows" },
    "familiarity": { "score": 2, "reason": "Al-An'am — Tier D surah, not commonly recited" },
    "teaching_fit": { "score": 8, "reason": "aliha (gods) is central to Ibrahim's challenge; complete standalone question" },
    "teacher_adj": 0,
    "total": 26
  }
}
```

---

## When to Score

- **Tier 1** — during `build-root-inventory.py`, computed automatically from verse text and form data
- **Tier 1-late** — after each lesson finalization; recalculated when lesson content changes
- **Tier 2** — on-demand LLM scoring pass before presenting candidates to the teacher
- **Tier 3** — in the picker UI during verse selection
- **All scores are written to the root JSON** so they persist across sessions

---

## Origin

v1 was derived from the teacher's actual selection decisions in Lesson 1. v2 (this document) restructured the flat 8-dimension system into a three-tier pipeline:
- Separated deterministic signals (computable from data) from subjective judgments (requiring LLM)
- Added form frequency and dominance signals to leverage morphological data
- Merged overlapping dimensions (Worship + Surah Familiarity; Emotional Impact into Story)
- Moved Role Fit out of scoring into picker-level classification
- Normalized all dimensions to 0–10 for direct comparison
- Added Teacher Adjustment as an explicit Tier 3 override
