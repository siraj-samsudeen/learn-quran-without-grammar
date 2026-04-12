# Lesson 1 Migration Flags — Teacher Review

_Created during data migration to the new `_data/` architecture. **All items resolved 2026-04-11 late evening** — see Resolution section at the bottom. File kept as a historical record; safe to delete after the next migration run._

---

## ✅ Orphan `sentence_patterns` from `docs/roots/ilah.json` — BOTH DISCARDED

Two patterns in the old `ilah.json` had **no teaching verse assigned** — they could not be automatically folded into a `lesson_use.notes` field because there was no existing verse entry for them in Lesson 1.

### Pattern 1: `إِلَٰهَهُ هَوَاهُ` — DISCARDED

- **Gloss:** "took his desire as his god"
- **Note from original JSON:** "Striking metaphor — appears in 25:43 and 45:23"
- **Candidate verses shown to teacher:** 25:43 (Al-Furqān, 10 words, tight rhetorical question) and 45:23 (Al-Jāthiyah, 29 words, expands into consequences)
- **Resolution:** Discarded. Does not fit the adhān-driven L1–L5 progression. Raw verses remain retrievable from `tools/data/quran-uthmani.txt` if a future lesson wants them.

### Pattern 2: `أَإِلَٰهٌ مَعَ اللّٰه` — DISCARDED

- **Gloss:** "Is there a god with Allah?"
- **Note from original JSON:** "Five rhetorical questions in 27:60-64"
- **Candidate verses shown to teacher:** 27:60–64 (the full rhetorical chain — creation, cosmic ordering, personal response, guidance, epistemological challenge — each followed by the refrain)
- **Resolution:** Discarded. Same rationale — does not fit current lesson progression. Raw verses remain retrievable.

---

## Background

Per Decision D21 (Session 2, 2026-04-11):

> The 3 `sentence_patterns` in `ilah.json` that already have teaching verses fold into those verses' `lesson_use.notes` during migration:
> - `لَا إِلَٰهَ إِلَّا` → `59:22` notes
> - `إِلَٰهٌ وَاحِدٌ` → `2:163` notes (pipeline)
> - `مِنْ إِلَٰهٍ غَيْرُهُ` → `7:59` notes (pipeline)
>
> The 2 orphan patterns (above) go into this flags file for teacher review — not silently migrated into synthetic verses.

The 3 non-orphan patterns have been folded into `lesson_use.notes` in the migrated verse files.

---

## Resolution (2026-04-11 late evening)

Teacher reviewed both orphans at computer time per session 3 handoff. Decision on each: **discard**. Rationale:

- Neither pattern is part of the adhān-driven lesson progression for L1–L5.
- Both orphans are retrievable from `tools/data/quran-uthmani.txt` any time a future lesson wants them — no information loss.
- Keeping them as pipeline candidates would add noise to `_data/verses/` without a concrete plan to teach them.

No `_data/verses/` changes needed. File preserved as a historical record of the decision.
