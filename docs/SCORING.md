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

### Tier 3 — Teacher Modifiers

#### 8. Fragment Penalty (×0.7 multiplier)

Verses must be used as **full ayahs** — no extracting word fragments from longer verses. Fragments cause compounding problems: approximate audio timestamps, translation misalignment across languages (EN + Tamil), and manual correction effort.

If a verse is too long to use whole and would require trimming to a fragment, its score is multiplied by **0.7**:

```
fragment_score = base_score × 0.7
```

| Verse type | Multiplier | Effect |
|------------|------------|--------|
| Full ayah (used whole) | ×1.0 | No penalty |
| Fragment (needs trimming) | ×0.7 | Must score ~30% higher to compete with full ayahs |

This is binary — either the full ayah is used, or it isn't. A fragment must be genuinely outstanding to survive the penalty.

#### 9. Teacher Star (+5 additive)

The teacher can **star** a verse to give it a small priority boost. This is a simple flag, not a sliding scale:

| Star | Modifier | Effect |
|------|----------|--------|
| Unstarred | +0 | Default |
| ⭐ Starred | +5 | Floats above unstarred verses of similar quality |

The star is additive so the boost is consistent regardless of base score. It's enough to break ties and nudge a verse into the top N, without overriding the scoring system.

---

## Total Score Calculation

```
base = length + form_freq + form_dominance + curriculum + story + familiarity + teaching_fit
starred = base + (5 if starred, else 0)
final = starred × (0.7 if fragment, else 1.0)
```

**Maximum possible (full ayah, starred):** 75 (7 × 10 + 5)
**Maximum possible (full ayah, unstarred):** 70 (7 × 10)
**Fragment ceiling:** 52.5 (75 × 0.7) — even a perfect fragment can't reach "Excellent"

---

## Score Ranges

| Range | Label | Action |
|-------|-------|--------|
| 55–75 | ⭐ Excellent | Present first, strongly recommend |
| 35–54 | 🟢 Good | Solid candidate |
| 18–34 | 🟡 Acceptable | Present if no better options |
| 0–17 | 🔴 Weak | Skip unless teacher asks |

---

## Automated Role Assignment

Three roles: **Anchor**, **Learning**, **Recall**. Assigned automatically based on score and verse length — the teacher no longer picks them manually.

### Lesson Budgets

| Budget | Phrases | Words | Rule |
|--------|---------|-------|------|
| **New content** (Anchor + Learning) | 10 | 100 | Whichever limit hits first |
| **Recall** (previous lessons) | 5 | 50 | 50% of new content budget |
| **Total lesson ceiling** | 15 | 150 | |

### Roles

| Role | Purpose |
|------|---------|
| **Anchor** | 1st phrase — shortest, root meaning clicks. The seed everything builds on. |
| **Learning** | All remaining new content — ordered short→long, natural difficulty curve |
| **Recall** | Review from previous lessons — separate budget, never crowds out new content |
| **Pipeline** | Overflow verses below budget — queued for future use |

No Learn/Practice distinction. The length ordering *is* the easy→hard progression — short phrases are inherently easier, long phrases inherently harder. Labels on a gradient that already exists naturally are unnecessary.

### Process

1. **Score** all verses for a root (Tier 1 + Tier 2)
2. **Apply** fragment penalty (×0.7) and teacher star (+5)
3. **Rank** by final score — take verses until the new content budget is exhausted (10 phrases or 100 words, whichever hits first)
4. **Sort** the selected verses by word count (shortest first)
5. Within same word count, starred verses float above unstarred
6. **Assign**: 1st = Anchor, rest = Learning, overflow = Pipeline

### Recall (from previous lessons)

Recall has its own budget (5 phrases / 50 words) and never competes with new content:

1. Gather verses from all previous lessons
2. Score by **curriculum connection** (Tier 1-late) — exact form match scores highest
3. Rank by score, take until Recall budget is exhausted
4. Sort by word count (shortest first)
5. Assign as Recall phrases

### Teacher's reduced workload

Before: teacher manually selected role for every verse, found timestamps for fragments, corrected translations across languages.

After: teacher reviews scores, stars a few favorites, and the system handles role assignment and ordering. Full ayahs eliminate timestamp and translation problems entirely.

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
    "starred": false,
    "fragment": true,
    "base": 27,
    "final": 18.9
  }
}
```

---

## When to Score

- **Tier 1** — during `build-root-inventory.py`, computed automatically from verse text and form data
- **Tier 1-late** — after each lesson finalization; recalculated when lesson content changes
- **Tier 2** — on-demand LLM scoring pass before presenting candidates to the teacher
- **Tier 3** — in the picker/review UI: teacher sets star flags, fragment status is determined by verse word count
- **All scores are written to the root JSON** so they persist across sessions

---

## Origin

v1 was derived from the teacher's actual selection decisions in Lesson 1. v2 restructured the flat 8-dimension system into a three-tier pipeline. v3 (this document) added:
- Fragment penalty (×0.7 multiplier) to discourage partial-verse extraction
- Teacher star (+5 additive) replacing the −5 to +5 adjustment slider
- Simplified roles to three: Anchor, Learning, Recall (dropped Learn/Practice distinction — length ordering provides the difficulty gradient)
- Lesson budgets: 10 phrases / 100 words for new content, 5 phrases / 50 words for Recall (50% rule), whichever limit hits first
- Automated role assignment based on score rank + length sort
- Automated Recall with separate budget so it never crowds out new content
