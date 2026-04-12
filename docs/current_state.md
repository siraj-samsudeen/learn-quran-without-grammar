# Scoring v3 Migration — Current State

**Created:** 2026-04-12
**Status:** In progress

---

## What Changed (v2 → v3)

### Role Simplification
| Old | New | Notes |
|-----|-----|-------|
| `anchor` | `anchor` | No change |
| `learn` | `learning` | Rename |
| `practice` | `learning` | **Merge** into learning — no separate practice section |
| `recall` | `recall` | No change |
| `pipeline` | `pipeline` | No change |
| `candidate` | `candidate` | No change |

### Scoring Changes
- **7 dimensions**, all normalized 0–10 (was 8 unnormalized)
- Dimensions: `length`, `form_freq`, `form_dominance`, `curriculum`, `story`, `familiarity`, `teaching_fit`
- Dropped: `worship`, `surah_familiarity` (merged into `familiarity`), `completeness` (merged into `teaching_fit`), `emotion` (merged into `story`), `fit_learn`/`fit_practice` (replaced by single `teaching_fit`)
- **Fragment penalty**: ×0.7 multiplier for verses not used as full ayah (binary)
- **Teacher star**: +5 additive boost (replaces old teacher_adj slider)
- Score fields: `base`, `final` (replaces `total_learn`, `total_practice`)
- New flags: `starred: bool`, `fragment: bool`

### Lesson Budgets
- **New content**: 10 phrases, 100 words (whichever hits first)
- **Recall**: 5 phrases, 50 words (50% of new content budget)
- **Total lesson ceiling**: 15 phrases, 150 words

### Automated Role Assignment
1. Score all verses → apply fragment ×0.7 and star +5
2. Rank by final score → take until budget exhausted
3. Sort selected by word count (shortest first), starred float above same-length
4. 1st = Anchor, rest = Learning, overflow = Pipeline
5. Recall has separate budget, never crowds new content

### Lesson Structure Change
Old: `Immerse → Anchor → Root → Learn phrases → Practice phrases → Recall → Review`
New: `Immerse → Anchor → Root → Learning phrases → Recall → Review`

---

## Migration Plan

### Phase 1 — Docs ✅ DONE
- [x] `docs/SCORING.md` — updated to v3 (fragment penalty, star, budgets, roles)
- [x] `docs/LESSON-PLAN.md` — budget updated, practice section removed
- [x] `docs/GLOSSARY.md` — role definitions, hierarchy, budgets updated
- [x] `docs/AUDIO-SYSTEM.md` — role enum updated, playback order updated
- [x] `docs/selections/lesson-01.md` — role counts, section names
- [x] `docs/selections/lesson-02.md` — role counts, recall budget
- [x] `docs/selections/pipeline.md` — terminology verified and updated

### Phase 2 — Root Inventory JSONs ✅ DONE (by separate agent)
- [x] `docs/roots/ilah.json` — role renames + scoring schema (fit_learn/fit_practice → teaching_fit, totals → final)
- [x] `docs/roots/kabura.json` — role renames + scoring schema
- [x] `docs/roots/shahida.json` — role renames + scoring schema
- [x] `docs/roots/rasul.json` — role renames, 78 verses have full v3 scores, 1480 have T1 only
- [x] Fragment flag set automatically (arabic_fragment ≠ arabic_full → fragment: true, ×0.7 penalty)

### Phase 3 — Skills & Templates ✅ DONE
- [x] `.claude/skills/lesson-pipeline.md` — section list, output descriptions
- [x] `.claude/skills/verse-selection.md` — scoring field names, dimension list
- [x] `.claude/skills/add-lesson.md` — phrase budget checklist, section names
- [x] `.claude/skills/lesson-review-checklist.md` — learning budget checks
- [x] `.claude/skills/templates/lesson-template.md` — merged learn+practice sections
- [x] `.claude/skills/templates/lesson-audio-template.yaml` — role values, reciter checklist

### Phase 4 — Python Tools ✅ DONE
- [x] `tools/generate-picker.py` — section arrays, target keys, scoring fields → final
- [x] `tools/build-root-inventory.py` — no changes needed (taught_role always null)
- [x] `tools/validate-lesson-consistency.py` — practice checks → learning checks
- [x] `tools/build-lesson-audio.py` — role default updated

### Phase 5 — Picker UI & Teacher Tools ✅ DONE
- [x] `tools/selection-picker/template.html` — CSS vars, JS arrays, counters, buttons, section logic
- [x] `teacher/scoring-review.html` — badge classes, data role values
- [x] `lessons/lesson-02-shahida/picker.html` — generated picker updated
- [x] `lessons/lesson-03-rasul/picker.html` — generated picker updated

### Phase 6 — Lesson Content & Audio YAML ✅ DONE
- [x] `lessons/lesson-01-allahu-akbar/index.md` — practice section → learning
- [x] `lessons/lesson-02-shahida/index.md` — same + recall stays
- [x] `lessons/lesson-01-allahu-akbar/picker-config.json` — target keys merged
- [x] `lessons/lesson-02-shahida/picker-config.json` — target keys merged
- [x] `lessons/lesson-02-shahida/lesson2-selections.json` — section keys merged
- [x] `tools/lesson-audio/lesson-01.yaml` — all roles → learning
- [x] `tools/lesson-audio/lesson-02.yaml` — same + recall stays
- [x] Audio manifests (lesson-01, lesson-02) — role values updated
- [x] `_data/audio/`, `_data/verses/`, `_data/picker_configs/` — all updated

### Phase 7 — Frontend JS ✅ DONE
- [x] `assets/js/shuffle-player.js` — filter buttons updated (All/Learning)
- [x] `assets/js/lesson-cards.js` — no changes needed (anchor detection via ⭐)
- [x] `assets/css/style.css` — no changes needed (.anchor-card stays)

### Phase 8 — Final ✅ DONE
- [x] `CLAUDE.md` — no learn/practice references found
- [x] Grep sweep: zero remaining `"learn"`, `"practice"`, `fit_learn`, `fit_practice`, `total_learn`, `total_practice` in code/data
- [x] `.workspace/` migrated to `docs/` (session-history + migration-flags)
- [ ] Commit

---

## Key Decisions Made

1. **Fragment penalty = ×0.7 multiplier** (not additive) — fragments must score 30% higher to compete
2. **Teacher star = +5 additive** (not multiplier) — consistent boost regardless of base score
3. **Order of operations**: `final = (base + star) × fragment_multiplier`
4. **No Learn/Practice distinction** — length ordering IS the difficulty gradient
5. **Separate recall budget** (50% of new) — recall never crowds new content
6. **Budget limits**: whichever hits first (phrases or words)
7. **Roles**: anchor, learning, recall, pipeline (dropped practice as separate role)

---

## Root JSON Scoring Schema

Old (v1/v2):
```json
"scores": {
  "curriculum": 2, "length": 1, "story": 3,
  "worship": 2, "surah_familiarity": 1,
  "completeness": 1, "emotion": 2,
  "fit_learn": 1, "fit_practice": 1,
  "total_learn": 10, "total_practice": 11
}
```

New (v3):
```json
"scores": {
  "length": 2, "form_freq": 8, "form_dominance": 0,
  "curriculum": 0,
  "story": 9, "familiarity": 2, "teaching_fit": 8,
  "starred": false, "fragment": false,
  "base": 29, "final": 29
}
```

---

## Instructions for Root Agent

If a separate agent is updating root JSONs, it should:
1. Rename `"taught_role": "learn"` → `"taught_role": "learning"` (form level)
2. Rename `"taught_role": "practice"` → `"taught_role": "learning"` (form level)
3. Rename `"role": "learn"` → `"role": "learning"` (verse level)
4. Rename `"role": "practice"` → `"role": "learning"` (verse level)
5. Leave `"anchor"`, `null`, `"pipeline"`, `"candidate"` unchanged
6. Restructure scoring objects from old schema to new v3 schema (see above)
7. For Tier 1 scores, compute deterministically:
   - `length = max(0, 10 - word_count)`
   - `form_freq = min(10, round(log10(count) * 4))`
   - `form_dominance = round(dominance_pct / 10)`
8. For Tier 2 scores (story, familiarity, teaching_fit), pull from `teacher/scoring-review.html` DATA array
9. Set `starred: false`, `fragment: true/false` based on whether verse is used as full ayah
10. Compute `base = sum of 7 dimension scores`, `final = (base + star_bonus) * fragment_multiplier`
