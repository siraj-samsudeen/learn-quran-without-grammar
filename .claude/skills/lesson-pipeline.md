# Skill: Lesson Creation Pipeline

## When to Use
When the teacher says "let's create a new lesson", "start lesson N", "prepare for lesson N", or asks about the lesson creation workflow.

## Phase 1a — Prepare data BEFORE asking the teacher anything

**This happens automatically on "prepare for lesson N" — do not wait for teacher input.**

1. **Check which root(s) the anchor phrase introduces.** For each root:
   - If `docs/roots/{root}.json` already exists and has `verses` populated with > 20 entries → reuse. No fetching.
   - Otherwise → fetch complete inventory from `corpus.quran.com` for that root, populate every form + every verse, and save the JSON. Use batch fetching via `tools/fetch-verses.py REF REF REF ...` (accepts many refs in one call).
2. **Check that previous lessons' roots also have complete JSONs.** These are needed for Recall candidates. If any are thin, fetch and complete them too.
3. **Generate the picker HTML** by copying `tools/selection-picker/template.html` to `.claude/tmp/lesson-NN-picker.html` and replacing the `LESSON_CONFIG` block with data drawn from the root JSONs:
   - `verses` array = all candidate verses (current-lesson root + previous-lesson roots for Recall), filtering out verses already `status: "used"` in earlier lessons.
   - Pre-assign `defaultSection` based on the AI's best guess (top-scored verses → `learn`, next tier → `practice`, existing recall picks → `recall`, rest → `none` or `pipeline`).
4. **Open the picker** with `open .claude/tmp/lesson-NN-picker.html`.
5. **Tell the teacher what you did in 2 sentences** and let them work in the picker. Wait for them to paste the JSON back.

**The point:** the teacher should never have to wait for you to fetch verses one-by-one while they're staring at a blank UI. Do all fetching upfront, once, and cache it in the root JSON.

## Pipeline Phases

### Phase 1: Content Selection (interactive via HTML picker)
**Skill:** `.claude/skills/verse-selection.md`
**Tool:** `tools/selection-picker/template.html`
**Input:** Anchor phrase from teacher + pre-populated picker
**Output:** JSON selections pasted back from picker UI (learn / practice / recall / pipeline)
**Gate:** Teacher pastes the final JSON

### Phase 2: Lesson Writing
**Skill:** `.claude/skills/add-lesson.md` (Steps 1–4)
**Template:** `.claude/skills/templates/lesson-template.md`
**Input:** 12 approved phrases with reciter assignments
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
