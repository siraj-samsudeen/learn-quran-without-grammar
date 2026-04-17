# ADR-013 — InstantDB schema strategy (typed, picker-minimal subset)

## Status
Accepted, 2026-04-17.

## Context
DATA-MODEL.md defines 21 entities for the full LQWG platform. The
existing InstantDB app (`instantdb-app/`) is schema-less — entities are
inferred from usage. Plan 1 produced `tools/data/quran.db` (SQLite) as
the local source of truth. Plan 2 needs to push a typed schema to the
shared InstantDB app and seed it from the SQLite layer.

## Decision

### Picker-minimal subset (13 entities now, rest later)

Plan 2 declares 13 entities in `instantdb-app/instant.schema.ts`:

| Cluster | Entities | Source |
|---|---|---|
| Identity | `userProfiles`, `courses`, `courseMembers` | seed (Siraj as owner) |
| Content | `seedPhrases`, `roots`, `lemmas`, `forms` | inline + quran.db |
| Qur'an | `verses`, `translations`, `sentences` | quran.db |
| Picker | `sentenceForms`, `sentenceScoresA1` | quran.db (filtered to in-scope roots) |
| Authoring | `lessons`, `selections` | seed (lessons), empty (selections) |

Deferred to later plans:
- `verseScores` + `verseRootScores` per DATA-MODEL.md → folded into `sentenceScoresA1` for now; hookScore + hookReason (Plan 4) can either extend this entity or split out then.
- `studentRecitation`, FSRS state, knowledge map entities → Plan 7+ student-side work.
- `formLessonDecision` → retired per the audit spec; traffic-light chips supersede it.
- `llmDrafts`, `audioJobs`, `issues` → land in Plans 4 / 6 alongside the features that need them.

### No direct links to `$users`

InstantDB's built-in `$users` entity can't be the target of forward links
in user-defined schemas (verified at type-check time). Wrapped via a
`userProfiles` mirror keyed by email. Magic-link auth populates
`userProfiles` lazily on first login (see `src/lib/auth.ts`).

### Nuke-and-reseed instead of migration

The existing schema-less data was inferred from `lessons / verses /
selections / issues` with `verses` being per-lesson-per-root scored
snapshots (~1,558 rows). Plan 2's typed schema introduces `sentences`
(waqf-split fragments) as the canonical scorable unit — a structural
change. Reshaping inferred-schema rows to typed-schema rows would
require an ad-hoc migration script that has lower information density
than the SQLite source.

Decision: deletion of inferred data is acceptable because (a) it derives
from `docs/roots/*.json` which is in git, (b) Plan 1's pipeline regenerates
it deterministically, (c) there are no irreplaceable teacher selections
yet. The seed script's `--clear` flag wipes everything before reseeding.

### Dev fallback for auth

Production magic-link auth would mail a code on every dev page-reload —
prohibitive. `auth.ts` honours `NEXT_PUBLIC_DEV_USER_EMAIL` to bypass
auth and pretend the seeded courseMember is logged in. Wrapped in a
`console.warn` and `// TODO: remove for prod` comment.

## Consequences

- `instant.schema.ts` is the single source of truth; pushed via
  `npm run schema:push` (wraps `instant-cli push schema`).
- Seeding is deterministic: `npm run seed:clear` from
  `tools/data/quran.db` produces identical row counts every time.
- The 13 existing Playwright tests in `instantdb-app/tests/` will need
  updates as the picker UI is rewritten in Plan 3 against the typed
  schema; Plan 2 does not modify them.
- `tools/validate-instantdb.py` provides parity checks between
  InstantDB and SQLite, callable in CI.

## Live operations

Plan 2 wrote all the code but **did not run the destructive operations**
(`schema:push` and `seed:clear`). The user runs them manually after
reviewing this ADR and Plan 2's handoff document. Commands documented in
the handoff `## Run-it manually` section.
