# LQWG Current State

_Last updated: 2026-04-14_

> **Read this first** when resuming work in a new session. Gives you everything needed to pick up where we stopped.

---

## What LQWG is

**Learn Qur'an Without Grammar** — a self-study course teaching Qur'anic Arabic recognition through root-word families, audio immersion, and phrases from daily prayers. No grammar terminology, no memorisation pressure.

- Live site: https://siraj-samsudeen.github.io/learn-quran-without-grammar/
- Repo: `/Users/siraj/Dropbox/Siraj/Projects/learn-quran-without-grammar`

---

## Published + pipeline content

| Lesson | Root(s) | Status |
|---|---|---|
| 1 · Allāhu Akbar | ilah, kabura | LIVE |
| 2 · Shahida | shahida | LIVE |
| 3 · Rasul | rasul | Picker ready, not written |
| 4 · Ṣalāh | hayiya, salah | Picker ready, not written |
| 5 · Falaha | falaha | Picker ready, not written |
| 6 · Khayr | khayr, nawm | Picker ready, not written |
| 7 · Qama | qama | Picker ready, not written |

---

## Why this rewrite (motivation)

Every step in the current (Era 1) file-based workflow creates friction:

| Pain point | Current workflow | v2 workflow |
|------------|-----------------|-------------|
| **Root inventory** | Run Python script → get JSON → copy to docs/roots/ → git commit | Click "New root" in dashboard → system builds inventory → saved to DB |
| **Verse scoring** | LLM pass writes to JSON → teacher reviews in picker HTML → edits JSON | LLM scores in background → teacher reviews in dashboard → click to approve |
| **Lesson authoring** | Edit YAML + Markdown + JSON → run validators → git push → wait for deploy | Fill in forms in dashboard → real-time validation → publish instantly |
| **Audio** | Edit YAML → run build script → download from CDN + generate TTS → copy MP3s → git push | Qur'anic audio streams from CDN at runtime. TTS generated on teacher's machine, uploaded via dashboard. |
| **Student experience** | Static page, same for everyone | Dynamic, personalized per student profile |
| **Multi-device** | Desktop only (needs terminal + git) | Dashboard works on phone too |

(Extracted from the former `docs/system-v2-real-backend.md` before it was archived.)

---

## Active work streams

### Stream 1: Architecture rewrite (DESIGN COMPLETE, IMPLEMENTATION NOT STARTED)

Migrating from per-root JSON files to SQLite + InstantDB. Consolidating teacher and student experience in one app. Adding multi-role support (owner / assistant / tester / student) and multi-course support.

**Authoritative design docs (read in order):**

1. [docs/FORMS-LEMMAS-ROOTS.md](FORMS-LEMMAS-ROOTS.md) — conceptual foundation (root vs lemma vs form)
2. [docs/DATA-MODEL.md](DATA-MODEL.md) — complete schema spec (21 entities, links, permissions, query patterns)
3. [docs/decisions/ADR-010-sqlite-data-architecture.md](decisions/ADR-010-sqlite-data-architecture.md) — with 2026-04-14 revisions
4. [docs/decisions/ADR-011-instantdb-student-experience.md](decisions/ADR-011-instantdb-student-experience.md) — with 2026-04-14 revisions

**Implementation plan** (per ADR-010, "Approach B — Layered Build"):

| Phase | Deliverable | Verification |
|---|---|---|
| 1 | `tools/build-quran-db.py` + `tools/migrate-json-to-sqlite.py` → `tools/data/quran.db` with Layer 1 + Layer 2 | Compare SQLite row counts and content against existing 10 JSONs |
| 2 | `instantdb-app/instant.schema.ts` (full schema per DATA-MODEL.md) + `tools/seed-instantdb-from-sqlite.py` | Query InstantDB; compare counts against SQLite |
| 3 | Picker evolution: normalized queries, inline score editing, multi-form verse display; dashboard + role-aware routing | Teacher workflow end-to-end |
| 4 | Port `merge-t2-scores.py` + `generate-lesson-summary.py` to SQLite. Retire `generate-picker.py` + `build-dashboard.py`. Archive `docs/roots/*.json`. Update `lesson-pipeline.md` skill. | Clean cutover |

**Phase 1 acceptance criteria** — `tools/build-quran-db.py` + `migrate-json-to-sqlite.py` must produce SQLite rows that match these per-root counts from the existing JSONs:

| Root | Forms | Verses |
|---|---:|---:|
| ilah | 4 | 17 |
| kabura | 14 | 12 |
| shahida | 9 | 20 |
| rasul | 7 | 429 |
| hayiya | 13 | 166 |
| salah | 4 | 90 |
| falaha | 2 | 40 |
| khayr | 5 | 178 |
| nawm | 3 | 9 |
| qama | 22 | 597 |

Byte-for-byte match on verse text and translations; score dimensions (Tier 1 + Tier 2) preserved.

**Pedagogical reference:** the "root word" naming convention (each root identified by a representative word, typically the Form I verb or basic noun) is defined in [docs/LESSON-PLAN.md](LESSON-PLAN.md#root-word-convention) — complements FORMS-LEMMAS-ROOTS.md.

### Stream 2: Lesson production (BLOCKED on Stream 1)

Lessons 3-7 have scored verses and picker-ready state. Writing blocked because current picker uses JSON files; lesson content on old schema would be throwaway work.

### Stream 3: Student companion experience (DEFERRED)

ADR-011 student SRS, magic-link auth, streaks, progress tracking. Schema ready; implementation waits for Stream 1 to complete.

---

## InstantDB project

| Key | Value |
|-----|-------|
| **App ID** | `b1c9a636-2a46-4be6-a055-16d6f2ebd233` |
| **Admin Token** | `5ca3a1a8-a25e-49e3-bf10-3bc6d70000db` |
| **Dashboard** | https://instantdb.com/dash?app=b1c9a636-2a46-4be6-a055-16d6f2ebd233 |

Used in `instantdb-app/src/lib/instant.ts` (client, App ID only) and `instantdb-app/scripts/seed.mjs` (server, App ID + Admin Token).

**Current runtime state:** schema-less (`init({ appId })`). Four entities inferred from usage: `lessons`, `verses` (per-lesson-per-root, ~1,558 rows), `selections`, `issues`. Per DATA-MODEL.md, migrating to explicit `instant.schema.ts` with 21 entities.

---

## Current InstantDB app architecture

Three Next.js App Router pages:

| Route | Purpose | File |
|-------|---------|------|
| `/` | Pipeline dashboard (7 lessons, phase dots, expandable notes) | `instantdb-app/src/app/page.tsx` |
| `/picker/[lessonNumber]` | Verse picker with audio, issue flagging, reciter selection | `instantdb-app/src/app/picker/[lessonNumber]/page.tsx` |
| `/seed` | Seed UI (status counts, reset button) | `instantdb-app/src/app/seed/page.tsx` |

CLI seed: `node instantdb-app/scripts/seed.mjs [--clear | --lesson N | --status | --lessons-only]`

13 Playwright E2E tests in `instantdb-app/tests/`, all passing.

UI was reworked April 2026: warm parchment background, Amiri Arabic font, 6px left-border coloring, solid-active section buttons, always-visible remark field, app-level sidebar with route-aware content, responsive mobile with hamburger, issue flagging bar (Option C chosen).

---

## Where we stopped in the brainstorm (2026-04-14)

**Design phase complete.** The brainstorming session produced four new/updated canonical docs plus amendments:

- [docs/FORMS-LEMMAS-ROOTS.md](FORMS-LEMMAS-ROOTS.md) — new conceptual foundation
- [docs/DATA-MODEL.md](DATA-MODEL.md) — new complete schema spec
- [docs/decisions/ADR-010-...](decisions/ADR-010-sqlite-data-architecture.md) — amended with 2026-04-14 revisions block
- [docs/decisions/ADR-011-...](decisions/ADR-011-instantdb-student-experience.md) — amended with 2026-04-14 revisions block
- Audit fixes: lesson-template.md, lesson-01 description, SCORING.md, CLAUDE.md tool listing, lesson-pipeline.md Phase 1a, GLOSSARY.md

**Decisions locked in this session:**

- Keep `lemma` as first-class concept (Kais Dukes compatibility) alongside `form` (our pedagogical unit)
- Form granularity: (root, lemma, pos, verb_form, tense, number, gender) — finer than a lemma; teacher has override to merge/split
- Governing principle: "If the student can see it and feel it, then it is one form"
- Multi-course schema now (with `courseId` FK everywhere), single-course UX now
- Multi-role schema now (owner / assistant / tester / student), single-role UX now
- `verse_words` (130K rows) seeded to InstantDB (enables exact word highlighting + Root Explorer)
- Inline score editing in picker (teacher adjusts scores directly)
- `verse_scores` (verse-level) separate from `verse_root_scores` (verse-root-level)
- Multi-lemma verses are first-class data (common, not rare)
- Build B = Layered Build approach (4 phases)

**Implementation is the next step.** No code has been written for the new architecture yet.

---

## Resume prompt

Paste this into a fresh Claude session to pick up cleanly:

```
Continue the LQWG architecture rewrite from where we stopped.

Read these in order, then summarize what you understand before touching anything:
1. docs/CURRENT-STATE.md — where we stopped and what's next
2. docs/FORMS-LEMMAS-ROOTS.md — root/lemma/form conceptual foundation
3. docs/DATA-MODEL.md — complete 21-entity schema spec (authoritative)
4. docs/decisions/ADR-010-sqlite-data-architecture.md + its 2026-04-14 revisions
5. docs/decisions/ADR-011-instantdb-student-experience.md + its 2026-04-14 revisions

The design is complete. We agreed on Approach B (Layered Build, 4 phases).
Phase 1 is the starting point: build `tools/build-quran-db.py` + `tools/migrate-json-to-sqlite.py` so `tools/data/quran.db` contains full Layer 1 (from raw files in tools/data/*.txt) and Layer 2 (migrated from the 10 existing docs/roots/*.json files).

Use /feather:workflow and show me the implementation plan for Phase 1 step by step before writing any code. I want to review and question your approach.

Rules from CLAUDE.md still apply: ask questions one at a time, push back with critique, show URLs for unfamiliar concepts, don't over-engineer.
```

---

## Recent commits (most recent first)

```
1a7f1039  docs: align terminology + data model after FORMS-LEMMAS-ROOTS decisions
d2db33a3  docs: FORMS-LEMMAS-ROOTS foundation doc
93dd34be  docs: update CURRENT-STATE.md with full UI rework details
03ced467  docs: ADR-010 — SQLite data architecture (replaces per-root JSONs)
cc26656e  feat: picker redesign mockups — form-aware two-panel layout
2aebfe80  feat: picker UI rework — app sidebar, card redesign, issue flagging
456dd0d3  seed data + Playwright E2E tests for dashboard and picker
```

---

## Archived references

Pre-Era-3 docs (Era 1 Jekyll + Era 2 InstantDB-prototype research) now live under [docs/archive/](archive/). They are retained for history but **are not authoritative** — always prefer the Era 3 canonical docs above. Key archived items:

- [archive/ARCHITECTURE.md](archive/ARCHITECTURE.md) — Era 1 Jekyll site architecture (still governs live Lessons 1-2)
- [archive/AUDIO-SYSTEM.md](archive/AUDIO-SYSTEM.md) — Era 1 audio pipeline (TTS + EveryAyah); most still valid as reference
- [archive/system-v2-real-backend.md](archive/system-v2-real-backend.md) — April 12 draft; motivation preserved in "Why this rewrite" section above
- [archive/session-history-2026-04-11.md](archive/session-history-2026-04-11.md) — April 11 session handoff
- [archive/app/](archive/app/) — July 2025 platform research (PLATFORM-PRD, APP-REQUIREMENTS, RESEARCH-SYNTHESIS, 5× research-\*.md) — Expo-first assumptions superseded by ADR-011 two-track strategy

---

## Things that must not break during the rewrite

1. **Live production site** — `https://siraj-samsudeen.github.io/...` serving Lessons 1-2 must keep working. Don't touch `_config.yml`, `_layouts/`, `lessons/lesson-01/`, `lessons/lesson-02/` destructively.
2. **13 Playwright tests** — `instantdb-app/tests/*.spec.ts` currently pass against the schema-less InstantDB. Update them as part of Phase 2 schema migration, not piecemeal.
3. **`docs/roots/*.json`** — source of truth for the current pipeline. Keep in place until Phase 1 migration is verified byte-for-byte.
4. **Git hooks venv** — `tools/install-hooks.sh` + `tools/.venv/` required for pre-commit validation. If Python version changes (e.g., Homebrew bumps 3.13 → 3.14), `rm -rf tools/.venv && tools/install-hooks.sh` fixes it.
5. **Forms vs lemmas vocabulary** — per FORMS-LEMMAS-ROOTS.md: in code and UI, use "form" as the pedagogical concept and "lemma" as the Kais Dukes concept. Never treat them as synonyms.
