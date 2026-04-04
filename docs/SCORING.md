# Verse Scoring Algorithm

This document defines the scoring system used to rank Qur'anic verse candidates for lesson inclusion. Scores are computed per verse and stored in `docs/roots/{root}.json`.

---

## Scoring Dimensions

### 1. Curriculum Connection (0–2 points)

| Condition | Score |
|-----------|-------|
| Root is NEW (not in any previous lesson) | 0 |
| Root was taught in a previous lesson (spaced review) | 1 |
| Exact FORM was already taught (deepening recognition) | 2 |

### 2. Verse Length (0–2 points)

| Condition | Score |
|-----------|-------|
| Long (15+ words) | 0 |
| Medium (8–14 words) | 1 |
| Short (≤7 words) | 2 |

### 3. Story & Memorability (0–3 points) ⭐

| Condition | Score |
|-----------|-------|
| Abstract / no narrative hook | 0 |
| Emotional weight but no story (ruling, warning) | 1 |
| Story hook (who said what to whom) | 2 |
| Iconic story most Muslims know (Ibrahim, Mūsā, Iblīs, Yūnus) | 3 |

### 4. Worship Connection (0–3 points) ⭐

| Condition | Score |
|-----------|-------|
| No connection to daily practice | 0 |
| Occasional practice (Ramadan, Jumu'ah) | 1 |
| Daily practice (ṣalāh, adhān, dhikr) | 2 |
| In a surah recited VERY frequently in ṣalāh / IS the adhān or shahādah phrase | 3 |

### 5. Surah Familiarity (0–2 points)

| Condition | Score |
|-----------|-------|
| Long surah, rarely recited aloud | 0 |
| Well-known but not commonly in ṣalāh | 1 |
| Juz' 30 (surahs 78–114) or commonly recited short surahs | 2 |

### 6. Self-Contained Completeness (0–1 point)

| Condition | Score |
|-----------|-------|
| Needs heavy context / fragment of longer sentence | 0 |
| Complete thought / self-contained sentence | 1 |

### 7. Emotional Impact (0–2 points)

| Condition | Score |
|-----------|-------|
| Neutral / informational | 0 |
| Thought-provoking / personally challenging | 1 |
| Powerful emotional punch (awe, fear, love, tears) | 2 |

### 8. Role Fit (0–1 point, scored separately for Learn and Practice)

| Condition | Learn Score | Practice Score |
|-----------|-----------|----------------|
| Story/narrative verse | 1 | 0 |
| Famous ruling / well-known / practical verse | 0 | 1 |
| Either role works | 1 | 1 |

---

## Total Score Calculation

Each verse gets **two totals** — one for Learn role, one for Practice role:

```
total_learn = curriculum + length + story + worship + surah_familiarity + completeness + emotion + fit_learn
total_practice = curriculum + length + story + worship + surah_familiarity + completeness + emotion + fit_practice
```

**Maximum possible:** 16 points

---

## Score Ranges

| Range | Label | Action |
|-------|-------|--------|
| 12–16 | ⭐ Excellent | Present first, strongly recommend |
| 8–11 | 🟢 Good | Solid candidate |
| 5–7 | 🟡 Acceptable | Present if no better options |
| 0–4 | 🔴 Weak | Skip unless teacher asks |

---

## Deduction Rules

| Condition | Deduction |
|-----------|-----------|
| Same form already used in THIS lesson | −3 |
| Very long AND no story hook | −2 |
| Audio already downloaded from previous work | +1 (bonus) |

---

## Where Scores Live

Scores are stored per verse in `docs/roots/{root}.json`:

```json
{
  "ref": "6:74",
  "scores": {
    "curriculum": 0,
    "length": 1,
    "story": 3,
    "worship": 0,
    "surah_familiarity": 1,
    "completeness": 1,
    "emotion": 2,
    "fit_learn": 1,
    "fit_practice": 0,
    "total_learn": 9,
    "total_practice": 8
  },
  "score_notes": "Ibrahim confronting his father — iconic story"
}
```

---

## When to Score

- **During verse selection** — the LLM scores each candidate before presenting to the teacher
- **Scores are written to the root JSON** so future LLMs can rank candidates without re-evaluating
- **Curriculum scores update** when a new lesson introduces a form — all remaining verses for that root get their curriculum score recalculated

---

## Origin

This algorithm was derived from the teacher's actual selection decisions in Lesson 1 (see `docs/selections/lesson-01.md`). The weights reflect observed patterns:
- Story & worship connection (3 points each) are the highest-weighted because the teacher consistently prioritised memorable narratives and daily-practice connections
- Length matters (short phrases preferred) but can be overridden by story quality
- The "stories for Learn, practical for Practice" pattern (preference #5) is encoded in the role-fit dimension
