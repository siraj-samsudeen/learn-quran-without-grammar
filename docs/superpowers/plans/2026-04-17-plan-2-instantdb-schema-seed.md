# Plan 2 — InstantDB Schema + Seed (from `quran.db`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Define a typed InstantDB schema for the picker subset of entities, push it to the live InstantDB app, and seed it deterministically from `tools/data/quran.db`. Magic-link auth wired but minimal — Siraj is the only seeded `courseMember`. After Plan 2 the picker can do read-only queries against typed data.

**Architecture:** Single Next.js app (`instantdb-app/`) using `@instantdb/react` for the client and `@instantdb/admin` for the seed script. Schema lives in `instantdb-app/instant.schema.ts` (single source of truth, pushed via `npx instant-cli push schema`). Seed reads from `tools/data/quran.db` via Node's `better-sqlite3` and uses the InstantDB admin SDK's transactional API.

**Tech Stack:** TypeScript (instant.schema.ts), Node ESM (seed script), `@instantdb/admin@^1.0.1`, `better-sqlite3@^11`, existing repo's Python venv to (re)build `quran.db` if missing.

**Q4 self-answer (from Plan 1 handoff):** Plan 2 scope = picker-minimal subset (13 entities). Other entities from DATA-MODEL.md (FSRS, recitation, hookReason, etc.) defer to later plans.

**Q5 self-answer:** InstantDB built-in magic-link from day 1 (per spec). Plan 2 wires it but the dev-only path is "skip auth and pretend you're Siraj" via a hardcoded fallback when there's no logged-in user — flagged with a TODO so it doesn't ship.

**Out of scope for this plan:**
- Picker UI changes — that's Plan 3 (existing picker keeps working in degraded mode against schema-less or new typed schema)
- Tier-2 hookScore migration from JSONs — Plan 4
- 21-entity DATA-MODEL.md full coverage — comes incrementally in later plans

---

## Schema entities (13 included)

| Entity | Source | Why now |
|---|---|---|
| `users` | InstantDB built-in `$users` | Magic-link auth |
| `courses` | hardcoded (single course "LQWG Adhān") | Multi-course schema, single-course UX |
| `courseMembers` | seed | Seed Siraj as `owner` |
| `seedPhrases` | hardcoded (7 Adhān phrases) | F0.1 seed → root mapping |
| `roots` | quran.db (1,651 distinct, but seed only the 10 in scope) | Picker filter |
| `lemmas` | quran.db (top N + all under in-scope roots) | Picker chips |
| `forms` | quran.db `sentence_forms` aggregated | Picker chips |
| `verses` | quran.db (all 6,236) | Backing for sentences |
| `translations` | quran.db (Sahih EN, all 6,236) | Picker English column |
| `sentences` | quran.db (all 10,493) | Picker rows |
| `sentenceForms` | quran.db | Picker filtering |
| `sentenceScoresA1` | quran.db | Picker ranking |
| `lessons` | seed (mirror existing pipeline-status) | Picker context |
| `selections` | empty | Teacher picks |

> `verseRootScores` and `verseScores` from DATA-MODEL.md collapse into `sentenceScoresA1` for now (no hookScore yet — that's Plan 4).

---

## File structure

```
instantdb-app/
├── instant.schema.ts          # NEW — typed schema (13 entities + links)
├── instant.perms.ts           # NEW — minimal perms (owner reads/writes all)
├── src/lib/instant.ts         # MODIFY — typed init({appId, schema})
├── src/lib/auth.ts            # NEW — magic-link helpers + dev fallback
├── scripts/
│   ├── seed-from-sqlite.mjs   # NEW — primary seed: quran.db → InstantDB
│   ├── push-schema.sh         # NEW — wraps `npx instant-cli push schema`
│   └── seed.mjs               # KEEP for now (legacy lessons-only seed)
└── tests/
    └── schema.spec.ts         # NEW — Playwright/Vitest? — see Task 9
```

---

## Tasks

(All tasks run from the Plan 2 worktree at `.worktrees/plan-2-instantdb/`.)

### Task 1: Typed schema in `instant.schema.ts`

Define all 13 entities + links per DATA-MODEL.md, scoped to the picker subset. Use InstantDB's `i.schema()` + `i.entity()` API.

Acceptance: `npx tsc --noEmit instant.schema.ts` passes (or whatever InstantDB's schema validation hook is). Don't push yet.

### Task 2: Push schema to live InstantDB app

Use `npx instant-cli push schema` against App ID `b1c9a636-2a46-4be6-a055-16d6f2ebd233`. **Destructive:** the existing schema-less data will become orphaned after a typed schema is enforced. The current ~1,558 inferred rows are lessons + verses (per-lesson scored snapshots) — they will be reseeded from quran.db in Task 5 with stronger structure.

Acceptance: visit InstantDB dashboard for the app, confirm 13 entities exist with correct attribute lists.

### Task 3: Wire typed client in `src/lib/instant.ts`

```ts
import { init } from "@instantdb/react";
import schema from "../../instant.schema";
const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";
export default init({ appId: APP_ID, schema });
```

Acceptance: `npm run build` in `instantdb-app/` passes — typed queries elsewhere in src don't break.

### Task 4: Magic-link auth helpers + dev fallback in `src/lib/auth.ts`

Three exports: `useCurrentUser()`, `useCurrentCourseMember()`, `signOut()`. Dev fallback: when `process.env.NEXT_PUBLIC_DEV_USER === "siraj"`, return a hardcoded user object pointing at the seeded Siraj courseMember. Flagged with a `// TODO: remove for prod` comment + `console.warn`.

Acceptance: visiting `/` while logged out shows a "send me a magic link" form; visiting after the dev env var is set shows the dashboard.

### Task 5: Seed script `seed-from-sqlite.mjs`

Reads `tools/data/quran.db` via `better-sqlite3`. Pushes in this order (each step idempotent via lookups):

1. `courses` — insert "LQWG Adhān"
2. `users` + `courseMembers` — insert Siraj
3. `seedPhrases` — 7 Adhān phrases inline
4. `roots` — 10 in-scope roots (ilah, kabura, shahida, rasul, hayiya, salah, falaha, khayr, nawm, qama)
5. `lemmas` + `forms` — distinct (root, lemma) pairs from quran.db `sentence_forms` filtered to in-scope roots
6. `verses` + `translations` — all 6,236 (chunked 100 per tx)
7. `sentences` — all 10,493 (chunked)
8. `sentenceForms` — filtered to in-scope roots
9. `sentenceScoresA1` — D1_raw, D2_raw, D3 for sentences in scope
10. `lessons` — 7 placeholders with `phasePicking` mapped from existing pipeline-status

Includes `--clear` flag for nuke-and-reseed and `--status` to print row counts.

Acceptance: `npm run seed` completes without errors, dashboard counts match expected (see Task 7).

### Task 6: Add `npm run` scripts in `package.json`

```json
{ "scripts": {
  "schema:push": "bash scripts/push-schema.sh",
  "seed": "node scripts/seed-from-sqlite.mjs",
  "seed:clear": "node scripts/seed-from-sqlite.mjs --clear",
  "seed:status": "node scripts/seed-from-sqlite.mjs --status"
}}
```

### Task 7: Validators (parity with quran.db)

`tools/validate-instantdb.py` — uses InstantDB admin REST query API to count entities and assert parity:

| Check | Expected |
|---|---|
| `verses` count | 6,236 |
| `sentences` count | 10,493 |
| `roots` count | 10 |
| `forms` count for ilah | 3 (matches v16 morphology count, not JSON's 4) |
| Sample verse Arabic byte-match | 0 mismatches |
| `courseMembers` Siraj exists | 1 row |

Acceptance: `python tools/validate-instantdb.py` exits 0 with all checks passing.

### Task 8: ADR-013 (InstantDB schema strategy)

Document: why the picker-minimal subset, why nuke-and-reseed, where the dev-fallback escape hatch lives, what's deferred to Plans 3–7.

### Task 9: Smoke test — query via the typed client

Add one Playwright test that loads `/picker/3` (existing route) and asserts the page renders without typed-query errors. The picker UI itself is Plan 3; this test only verifies the typed schema is consumable.

Acceptance: `npm run test` passes.

### Task 10: Plan 2 handoff doc

Mirror Plan 1's handoff format. Document: what's wired, what's deferred to Plan 3, any deviations from this plan, manual steps the user must run (e.g., `npm run schema:push` if I didn't push automatically).

---

## Risk / safety notes

1. **Destructive schema push.** Task 2 effectively wipes the existing schema-less data. Existing `instantdb-app/scripts/seed.mjs` has the lesson metadata that needs to be re-derived in Task 5. I will check `seed.mjs` for any hand-tuned per-lesson metadata before deleting (e.g., `notes` strings).
2. **Live InstantDB app shared with prod.** The App ID is the only one we have. There is no separate dev/staging app. The 13 Playwright tests in `instantdb-app/tests/` currently pass against the schema-less version; some will break with the typed schema until updated alongside the picker rewrite (Plan 3).
3. **Magic-link real emails.** Magic-link in InstantDB sends real emails via their SMTP. Dev fallback prevents mailing yourself constantly. Production mode is opt-in via env var.

---

## Acceptance for the whole plan

- `instant.schema.ts` exists, type-checks, pushes successfully.
- `npm run seed:clear` populates 6,236 verses + 10,493 sentences + 10 roots + Siraj as courseMember.
- `python tools/validate-instantdb.py` → all checks pass.
- The existing `npm run dev` Next.js server boots without typed-query errors against the new schema.
- ADR-013 + Plan 2 handoff committed.
