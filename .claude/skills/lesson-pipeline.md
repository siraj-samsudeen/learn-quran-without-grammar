# Skill: Lesson Creation Pipeline

## When to Use
When the teacher says "let's create a new lesson", "start lesson N", or asks about the lesson creation workflow.

## Pipeline Phases

### Phase 1: Content Selection (interactive)
**Skill:** `.claude/skills/verse-selection.md`
**Input:** Anchor phrase from teacher
**Output:** 12 approved phrases (2 anchor + 5 learn + 5 practice)
**Gate:** Teacher approves all 12 phrases

### Phase 2: Lesson Writing
**Skill:** `.claude/skills/add-lesson.md` (Steps 1–4)
**Template:** `.claude/skills/templates/lesson-template.md`
**Input:** 12 approved phrases with reciter assignments
**Output:** `lessons/lesson-NN-slug.md` draft
**Gate:** Teacher reviews draft on live site

### Phase 3: Audio Preparation
**Skill:** `.claude/skills/lesson-audio.md`
**Template:** `.claude/skills/templates/lesson-audio-template.yaml`
**Tools:** `tools/auto-timestamps.py` (primary), `tools/find-audio-fragment.py` (fallback)
**Input:** Draft lesson file with reciter assignments
**Output:** YAML definition + built MP3s + manifest.json
**Gate:** `python tools/validate-lesson-consistency.py lesson-NN` passes

### Phase 4: Review & Polish
**Skills (can run in parallel):**
- `.claude/skills/lesson-review-checklist.md` — structural/formatting checks
- `.claude/skills/learning-science-review.md` — pedagogical review (4 lenses)
**Input:** Complete lesson with audio
**Output:** Approved lesson with all checks passed
**Gate:** Teacher signs off

### Phase 5: Publish
**Skill:** `.claude/skills/add-lesson.md` (Steps 7–9)
**Input:** Approved lesson
**Steps:** Add card to `index.md` → create selection log → update pipeline → commit + push
**Gate:** Teacher confirms live site looks correct

## Quick Reference — What to Read When

| Phase | Read first |
|-------|-----------|
| Starting a new lesson | `docs/selections/pipeline.md` — check queued material |
| Content selection | `docs/LESSON-PLAN.md` + `docs/roots/{root}.json` + `docs/SCORING.md` |
| Writing the lesson | `.claude/skills/templates/lesson-template.md` |
| Audio preparation | `.claude/skills/lesson-audio.md` + `docs/decisions/ADR-005-reciters.md` |
| Finding timestamps | `tools/auto-timestamps.py --help` (7 reciters) or `tools/find-audio-fragment.py --help` (fallback) |
| Before committing | `.claude/skills/lesson-review-checklist.md` |
