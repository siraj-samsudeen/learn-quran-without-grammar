# Skill: InstantDB Picker Workflow (Slice 1)

## When to Use
When the teacher says "start picking verses for lesson N", "open the picker", "add a new root to the course", or otherwise enters the Slice-1 authoring loop against the InstantDB picker app. Era-1 equivalents (the static HTML picker, `tools/build-root-inventory.py`, per-root JSON under `docs/roots/`) are retired — see [docs/archive/skills/lesson-pipeline-era1.md](../../docs/archive/skills/lesson-pipeline-era1.md) and [docs/archive/skills/verse-selection-era1.md](../../docs/archive/skills/verse-selection-era1.md) for the old flow.

## Prerequisites (Foundation — ADR-010 Phase 1)

Before the picker can present verses for any root, the Foundation must be built:

1. **`tools/data/quran.db` is seeded and current.** Built by `tools/build-quran-db.py` from the vendored morphology + Tanzil + Sahih files in `tools/data/`. Contains all 1,651 roots with Layer-1 facts: verse Arabic + word count, root → lemma partitions, form buckets per the 6-tuple rule in [FORMS-LEMMAS-ROOTS §10.2](../../docs/FORMS-LEMMAS-ROOTS.md).
2. **InstantDB has Layer 1 + Layer 2 schema applied.** Layer 1 = corpus facts replicated from SQLite. Layer 2 = teacher-authorable entities per [DATA-MODEL.md](../../docs/DATA-MODEL.md): `rootCurriculum`, `forms`, `formLemmaBindings`, `verseScores`, `verseRootScores`, `selections`, `formLessonDecision`, `audioJobs`, `llmDrafts`.
3. **Sync path verified** — `sync-from-cloud.py` pulls InstantDB state into local SQLite for offline tools (audio build, validators). See [ADR-010](../../docs/decisions/ADR-010-sqlite-data-architecture.md).

If any of these are missing, stop and build Foundation first. Do NOT fall back to building `docs/roots/{root}.json`.

## The 3-Phase Authoring Flow (PRD §5.F0-F4)

The picker is organised around a **form-first sidebar**: every root in the lesson expands to 5-7 pedagogical forms, and the teacher works through one form at a time. All scores feed the ranking but stay hidden from the UI; only `hookReason` is visible.

### Phase F0 — Content preparation

The teacher never hand-builds data. Each step has a "Run" button in the picker header and writes to InstantDB.

| Step | What happens | Reads / writes |
|------|--------------|---------------|
| **F0.1 Add root to course** | One action: create `rootCurriculum(root, lesson)` row + default `forms` rows (5-7 per root) + `formLemmaBindings` via the 6-tuple `(root, lemma, pos, verb_form, tense, number, gender)` partition from Layer 1. | W: `rootCurriculum`, `forms`, `formLemmaBindings` |
| **F0.2 Tier 1 auto-scoring** | Deterministic job: computes `lengthScore`, `formFreq`, `formDominance`, `curriculumScore` from Layer 1 facts + current lesson order. No LLM. | W: `verseRootScores` |
| **F0.3 Tier 2 LLM scoring** | Background LLM job: produces `hookScore` (0-10, collapsed from the old story + familiarity + teaching_fit dimensions) and `hookReason` (LLM justification). Every draft logs to `llmDrafts` for audit. `hookReason` is **offered** as a starting draft when the teacher later writes `selection.remark` — never auto-applied. | W: `verseScores`, `llmDrafts`, `audioJobs` |
| **F0.4 Translation drafts** | **PARKED for Slice 1.** Teacher writes translations manually in F2. | — |
| **F0.5 Synonym/antonym** | **PARKED for Slice 1.** Future synonym pass (Lesson 8+) will populate `rootRelations`. | — |
| **F0.6 Job status UI** | Teacher sees per-root `queued / running / done / failed` with a retry button. Extends the `audioJobs` queue pattern. | R/W: `audioJobs` |
| **F0.7 Recompute triggers** | Out of Slice 1 (no lesson-reorder in Slice 1). | — |

### Phase F1 — Verse picker (the teacher's core authoring surface)

Form-first, hidden scores, visible ranking.

- **Sidebar:** roots grouped by lesson position; each root expands to its `forms` (5-7 max). Teacher clicks a form; right pane shows verses ranked by `finalScore` (hidden).
- **3-state selector per verse:** `selected` · `pipeline` · `none`. Mutually exclusive. `selected` = this verse joins the lesson; `pipeline` = queue for a future lesson; `none` = out. Never both `selected` + `pipeline`.
- **Hidden scores, visible ranking:** `hookScore` / `finalScore` drive sort order but are never rendered. Teacher works on relative ordering, not "is 24.6 good?"
- **`hookReason` visible:** shown as a small grey caption under each verse. Teacher audit signal: "why did the LLM rank this high?"
- **Form-header actions:** per-form budget card (e.g., "Picked 2 of max 4, 18 of 100 words"), "Done with this form", "Skip form with reason".
- **Skip-form-with-reason is mandatory to surface on every form** — writes `formLessonDecision(course, lesson, form, status=skipped, reason)`. Teacher cannot silently skip.

### Phase F2 — Lesson annotation

Per-selection annotations. Slice-1 scope is intentionally small.

- **`selection.remark`** — the teacher's plain-English note for the student (what the phrase means / why it matters). **Student-audible: will be TTS'd into the audio pair.** Seeded with `hookReason` as a draft; teacher accepts, edits, or discards.
- **Root notes + form notes** — teaching context for the student, surfaces under the verse card.
- **Inline translation** — teacher writes English translation directly on the `selection` row.
- **LLM hookReason is teacher-audit-only** — never exposed to students. Keep this boundary explicit.
- Synonym / antonym annotations are **PARKED** until Slice 5.

### Phase F3 — Audio production

- **TTS preview** — teacher types remark + translation, plays TTS inline to catch bad pronunciation before committing.
- **Reciter-specific fragment timestamps** — `tools/auto-timestamps.py` / `tools/find-audio-fragment.py` still produce timestamps. Timestamps are **reciter-specific** — never reuse across reciters (see CLAUDE.md Common Mistakes).
- **`audioJobs` queue** — build, stitch, duration-check all run as jobs; teacher sees status per phrase.
- Output is `{id}.mp3` (EN) + `{id}-ta.mp3` (Tamil) pair files per selection; aggregate `lesson-NN-full(-ta).mp3` per lesson.

### Phase F4 — Publish & audit

- **Publish gate** — lesson must have every form either `taught` (≥1 selected verse) or `skipped` (with reason) or `unassigned` (waived at course level). No silent gaps.
- **`formLessonDecision` log** — per `(course, lesson, form)` audit trail: taught / skipped / unassigned + reason + history. Retained forever for provenance.
- **Phase-gate UI** — teacher can't publish until all four gates green (F0 done, F1 picks exist, F2 remarks present, F3 audio built).

## Key Schema Entities the Picker Reads/Writes

See [DATA-MODEL.md](../../docs/DATA-MODEL.md) for the full 24-entity schema. The picker touches:

| Entity | Purpose | Phase |
|--------|---------|-------|
| `rootCurriculum` | Per-course lesson assignment for each root | F0.1 |
| `forms` | 5-7 pedagogical forms per root (built from lemma 6-tuple) | F0.1, F1 |
| `formLemmaBindings` | `(form, lemma, tense?, number?, gender?)` — how a form is assembled | F0.1 |
| `verseRoots` | Layer-1: which roots appear in which verse | F0.2 |
| `verseScores` | `hookScore` + `hookReason` + `fragment` per `(course, verse)` | F0.3, F1 |
| `verseRootScores` | Per-root scores: `lengthScore`, `formFreq`, `formDominance`, `curriculumScore`, `starBonus`, `finalScore` | F0.2, F1 |
| `selections` | Teacher's pick: verse + role + remark + translation | F1, F2 |
| `formLessonDecision` | Audit: form taught / skipped / unassigned with reason | F1, F4 |
| `audioJobs` | Queue for all background work (TTS, LLM, stitching) | F0.3, F3 |
| `llmDrafts` | Every LLM output logged for teacher audit | F0.3, F2 |

## Common Errors / Things to Watch For

Translated from the Era-1 anti-patterns for the new stack:

| Mistake | Rule |
|---------|------|
| Treating forms as per-root — 5-7 total per lesson | **5-7 forms per root**, not per lesson. A 2-root lesson can legitimately show 10-14 forms in the sidebar. |
| Showing scores in the UI | **Scores drive ranking, never displayed.** Only `hookReason` is visible. |
| Auto-applying `hookReason` to `selection.remark` | **Offer as draft only** — teacher accepts / edits / discards. Every draft logs to `llmDrafts`. |
| Letting a form be silently skipped | **Skip-form-with-reason is mandatory** — every form ends in `formLessonDecision` with a status. Publish gate enforces this. |
| `selected` + `pipeline` on the same verse | **3-state selector is mutually exclusive.** One of `selected` / `pipeline` / `none`. |
| Confusing `selection.remark` (student-audible) with `hookReason` (teacher-audit-only) | **Remark is TTS'd for students.** `hookReason` is never surfaced to students. |
| Reusing timestamps across reciters | **Reciter-specific** — recompute when changing reciter. Applies to the picker's audio preview too. |
| Building `docs/roots/{root}.json` | **Retired.** Data lives in SQLite + InstantDB per ADR-010. Root JSONs stay in git history for reference only. |
| Running `tools/generate-picker.py` | **Retired.** InstantDB app replaces the static HTML picker. Marked `[RETIRED]` in CLAUDE.md. |

## Slice-1 Scope Reminders

- **Greenfield Lesson 1 re-authoring.** Teacher re-picks ilāh + kabura through the new flow. Live Jekyll Lesson 1 stays untouched as a memory aid — do not edit it.
- **F0.4 LLM translation drafts: PARKED.** Teacher translates manually.
- **F0.5 synonym/antonym: PARKED.** Future synonym-pass lessons (Lesson 8+).
- **F0.7 recompute triggers: PARKED** (no reorder in Slice 1).
- **No student-facing surface in Slice 1.** F5-F12 are Slice 2+.
- **Out of Slice 1:** `modules` entity promotion, `verses` → `phrases` rename, `verseWords` seed.

## References

- [docs/PRD.md](../../docs/PRD.md) — product spec; §5.F0-F4 defines this workflow, §6 explains the Tier-2 collapse
- [docs/DATA-MODEL.md](../../docs/DATA-MODEL.md) — 24-entity schema incl. new `formLessonDecision`, `llmDrafts`, `audioJobs`
- [docs/FORMS-LEMMAS-ROOTS.md](../../docs/FORMS-LEMMAS-ROOTS.md) — root / lemma / form conceptual foundation; §10.2 defines the 6-tuple partition
- [docs/decisions/ADR-010-sqlite-data-architecture.md](../../docs/decisions/ADR-010-sqlite-data-architecture.md) — SQLite + InstantDB split
- [docs/decisions/ADR-011-instantdb-student-experience.md](../../docs/decisions/ADR-011-instantdb-student-experience.md) — web-first, Expo-later
- [docs/SCORING.md](../../docs/SCORING.md) — scoring algorithm; §Tier-2 now collapsed to `hookScore`
- Era-1 archives: [lesson-pipeline-era1](../../docs/archive/skills/lesson-pipeline-era1.md), [verse-selection-era1](../../docs/archive/skills/verse-selection-era1.md)
