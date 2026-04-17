# ADR-012 — quran.db schema (waqf-split sentences + A1 scores)

## Status
Accepted, 2026-04-17.

## Context
[Slice 1 Picker Spec §7](../superpowers/specs/2026-04-17-slice-1-verse-picker-design.md#7--schema-additions-for-slice-1) introduces the `sentences` entity (waqf-delimited fragments) as the scorable unit. The [Audit §7](../superpowers/specs/2026-04-17-picker-ux-audit-and-validators.md#7--quran-db-prep-validators) defines 24 validators across five pipeline steps.

## Decision
`tools/data/quran.db` is a SQLite-based build artifact with six tables:

| Table | Step | Rows | Notes |
|---|---|---|---|
| `verses` | 1 | 6,236 | Byte-match against `quran-uthmani.txt` verified by v6 |
| `translations` | 1 | 6,236 | Sahih International draft, one per verse |
| `morphology` | 1 | 130,030 | Kais-Dukes segments with extracted `root` + `lemma` |
| `sentences` | 2 | 10,493 | Waqf-split fragments (≥1 per verse) |
| `sentence_forms` | 3 | ~100K | Many-to-many: sentence ↔ (root, lemma) |
| `sentence_scores_a1` | 4 | 10,493 | D1_raw, D2_raw, D3 per sentence |

### Why raw scores (not normalised) in the DB
D1 and D2 normalisation is min-max against a candidate pool. A teacher
scoring just-ilah has a different pool than a teacher scoring ilah+kabura.
Storing raw values + normalising at query time keeps the DB pool-agnostic.

### Why `sentence_forms` is universal (not lesson-scoped)
Every (sentence, root, lemma) mapping is true independent of which lesson
the teacher is authoring. Lesson-specific narrowing is a query over this
table (`narrow.get_narrowed_pool`), not a separate stored view.

### Waqf splitting
Three marks trigger splits: ۚ (U+06DA), ۖ (U+06D6), ۗ (U+06D7).
One mark (ۛ U+06DB) is stripped from output text + word counts but does
not split — the Kais-Dukes morphology has no entry for it, so including
it would inflate word counts on the morphology join.

### اللَّه handling
اللَّه is treated as a normal lemma under root أله. Lesson-specific
exclusion (for Lesson 1's ilah+kabura pool) happens at query time via
`get_narrowed_pool(exclude_only_lemmas={allah_lemma})`. The exact
byte-form of اللَّه as stored in morphology (shadda-before-fatha) is
looked up at runtime via `get_allah_lemma(db)` rather than hard-coded,
because typed literals often use fatha-before-shadda which is
byte-different but visually identical.

## Known deltas from the audit spec

Plan 1 surfaced two genuine discrepancies between the audit spec's
stated expectations and live data. Both documented inline as validator
tolerances; neither changes downstream behaviour.

1. **Waqf verse ratio.** Audit said ~50% of verses have waqf marks;
   observed is 41.6% (2,597 / 6,236). v11 tolerance widened to 35–55%.

2. **Per-root form counts.** Kais-Dukes morphology has finer lemma
   granularity than the curated `docs/roots/*.json` form arrays. Example:
   ilah.json lists 4 forms but morphology yields 3 lemmas (آلِهَة is a
   plural form of إِلٰه, not a distinct lemma). kabura.json lists 14
   but morphology has 18 (imperative forms split out). v16 tolerance:
   ±6 for counts of 10+, ±2 for counts <10. Byte-for-byte parity is
   deferred to Plan 4 where Tier-2 score migration will need a
   lemma-merge pass anyway.

## Consequences
- `quran.db` is regenerable from `tools/data/*.txt` in a few seconds. Gitignored.
- Plan 2 (InstantDB seed) reads this SQLite DB and pushes narrowed data up.
- Plan 4 (Tier-2 scoring) writes `hookScore` to InstantDB, not SQLite — SQLite holds only universal A1 scores.
- 72 tests (all passing) cover the pipeline end-to-end.
