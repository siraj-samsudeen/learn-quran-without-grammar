# Skill: Lesson Creation Pipeline

## When to Use
When the teacher says "let's create a new lesson", "start lesson N", "prepare for lesson N", or asks about the lesson creation workflow.

## Phase 1a — Prepare data BEFORE asking the teacher anything

**This happens automatically on "prepare for lesson N" — do not wait for teacher input.**

**AS OF 2026-04-14 (ADR-010 in flight):** the data pipeline is migrating from per-root JSON files to SQLite + InstantDB. During transition the steps below apply; after migration completes the workflow is simpler:
1. Verify `tools/data/quran.db` exists and is current (rebuild with `python3 tools/build-quran-db.py` if not).
2. Teacher opens the InstantDB picker for this lesson; candidate verses are already populated via a per-root query (no manual HTML generation needed). Teacher assigns learning/recall/pipeline and adjusts scores inline.
3. Claude reads finalized selections via the InstantDB query (or from an exported JSON the teacher pastes).

**Transition-state workflow (still uses root JSONs while `docs/roots/*.json` remains the source of truth):**

1. **Check which root(s) the anchor phrase introduces.** For each root:
   - If `docs/roots/{root}.json` already exists and has `verses` populated with > 20 entries → reuse. No building.
   - Otherwise → run **`tools/build-root-inventory.py`** (see ADR-009). Reads local vendored morphology + Tanzil text + draft translations, produces a complete JSON in under a second. **Do NOT use `WebFetch` on corpus.quran.com** — the vendored morphology file is authoritative.
2. **Check that previous lessons' roots also have complete JSONs** for Recall candidates.
3. **Generate the picker HTML** from `tools/selection-picker/template.html` with data drawn from root JSONs. (This step is retired post-migration — the InstantDB app replaces the static picker. See ADR-010.)
4. **Open the picker** and wait for the teacher to paste selections.

**Terminology note:** every mention of "form" in this skill refers to the pedagogical unit defined in [`docs/FORMS-LEMMAS-ROOTS.md`](../../docs/FORMS-LEMMAS-ROOTS.md). A form is built from one or more Kais Dukes lemmas with optional tense/number/gender filters — it is NOT synonymous with lemma.

## Pipeline Phases

### Phase 1: Content Selection (interactive via HTML picker)
**Skill:** `.claude/skills/verse-selection.md`
**Tool:** `tools/selection-picker/template.html`
**Input:** Anchor phrase from teacher + pre-populated picker
**Output:** JSON selections pasted back from picker UI (learning / recall / pipeline)
**Gate:** Teacher pastes the final JSON

### Phase 2: Lesson Writing
**Skill:** `.claude/skills/add-lesson.md` (Steps 1–4)
**Template:** `.claude/skills/templates/lesson-template.md`
**Input:** Approved phrases (1 anchor + up to 9 learning = 10 phrases / 100 words + 5 recall / 50 words) with reciter assignments
**Output:** `lessons/lesson-NN-slug.md` draft
**Gate:** Teacher reviews draft on live site

### Phase 2b: Tamil Translation
**Reference:** `CLAUDE.md` → "Multi-Language Support"
**Input:** Completed English lesson draft
**Output:** All Tamil content added to lesson .md + `tamil:` fields in YAML
**Steps:**
1. Generate Tamil translations for all content (LLM-generated, teacher reviews)
2. Add Tamil verse translations (`{: .ta}`), hooks (`{: .hook-ta}`), prose (`<div class="lang-ta">`)
3. Wrap root tables and pair-tables in `<div class="lang-en/ta">` containers
4. Add quiz Tamil prompts + answers, summary, closing
5. Add `tamil:` field to each sentence in the YAML
**Gate:** Teacher reviews Tamil text (can read but not type Tamil)

### Phase 3: Audio Preparation
**Skill:** `.claude/skills/lesson-audio.md`
**Template:** `.claude/skills/templates/lesson-audio-template.yaml`
**Tools:** `tools/auto-timestamps.py` (primary), `tools/find-audio-fragment.py` (fallback)
**Input:** Draft lesson file with reciter assignments + Tamil translations in YAML
**Output:** YAML definition + built MP3s (EN + Tamil) + manifest.json
**Build:** `python tools/build-lesson-audio.py tools/lesson-audio/lesson-NN.yaml --lang all`
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
