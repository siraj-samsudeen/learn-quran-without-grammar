# Lesson 1 Migration Flags — Teacher Review Required

_Created during data migration to the new `_data/` architecture. These items need a decision before they can be migrated. Review at computer time (not phone)._

---

## Orphan `sentence_patterns` from `docs/roots/ilah.json`

Two patterns in the old `ilah.json` have **no teaching verse assigned** — they cannot be automatically folded into a `lesson_use.notes` field because there is no existing verse entry for them in the lesson.

### Pattern 1: `إِلَٰهَهُ هَوَاهُ`

- **Gloss:** "took his desire as his god"
- **Note from original JSON:** "Striking metaphor — appears in 25:43 and 45:23"
- **Relevant verses:** 25:43 and 45:23 (both use this phrase)
- **Status in old data:** not assigned to any lesson or verse entry
- **Options:**
  - Add verses 25:43 or 45:23 to `_data/verses/` as pipeline candidates
  - Discard if the pattern is not relevant to any planned lesson
- **Teacher decision needed:** Add as pipeline verse(s), or discard?

### Pattern 2: `أَإِلَٰهٌ مَعَ اللّٰه`

- **Gloss:** "Is there a god with Allah?"
- **Note from original JSON:** "Five rhetorical questions in 27:60-64"
- **Relevant verses:** 27:60, 27:61, 27:62, 27:63, 27:64
- **Status in old data:** not assigned to any lesson or verse entry
- **Options:**
  - Add any of the 27:60-64 verses to `_data/verses/` as pipeline candidates
  - Discard if the pattern is not relevant to any planned lesson
- **Teacher decision needed:** Add as pipeline verse(s), or discard?

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
