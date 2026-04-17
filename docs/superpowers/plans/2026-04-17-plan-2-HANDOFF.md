# Plan 2 — Handoff Summary

_Written 2026-04-17. Read after Plan 1's handoff._

## TL;DR

✅ **Plan 2 code is complete.** Typed schema, seed script, validator, auth helpers, and ADR-013 all written and committed on `feature/plan-2-instantdb-schema`.

⏸ **Two destructive ops deferred to you.** The actual `schema push` to live InstantDB and the `seed --clear` weren't run autonomously because they wipe the existing shared app's data. Documented step-by-step below — run when you're ready.

---

## 1. What's on disk

**Branch:** `feature/plan-2-instantdb-schema` (off `feature/plan-1-sqlite-data-layer`) at `.worktrees/plan-2-instantdb/`.

**New files:**

```
instantdb-app/
├── instant.schema.ts                # 13 entities + 11 links, type-checks clean
├── src/lib/
│   ├── instant.ts                   # MODIFIED — typed init({appId, schema})
│   └── auth.ts                      # NEW — magic-link helpers + dev fallback
├── scripts/
│   ├── push-schema.sh               # NEW — wraps instant-cli push
│   └── seed-from-sqlite.mjs         # NEW — primary seed: quran.db → InstantDB
└── package.json                     # MODIFIED — added schema:push, seed*, lint scripts

tools/validate-instantdb.py          # NEW — parity check vs quran.db

docs/decisions/ADR-013-instantdb-schema-strategy.md
docs/superpowers/plans/
├── 2026-04-17-plan-2-instantdb-schema-seed.md  # the plan doc
└── 2026-04-17-plan-2-HANDOFF.md                # this file
```

**Deps added:** `better-sqlite3@^12` (seed script reads `quran.db`).

---

## 2. Run-it manually (when you're ready)

These three commands are **destructive to the live shared InstantDB
app**. Do them in this order and confirm at each step:

```bash
cd .worktrees/plan-2-instantdb/instantdb-app

# 1. Verify the seed plan against your local quran.db (read-only, safe)
npm run seed:dry
#   expect: "Verses: 6236", "Sentences: 10493", "Sentence_forms (in-scope): 4588"

# 2. Push the typed schema to live InstantDB.
#    DESTRUCTIVE: any inferred attributes that conflict get rewritten.
npm run schema:push
#   The instant-cli will print the diff and ask for confirmation.
#   After: open https://instantdb.com/dash?app=b1c9a636-2a46-4be6-a055-16d6f2ebd233
#   and confirm 13 entities exist.

# 3. Wipe + reseed.
#    DESTRUCTIVE: deletes all rows in the typed entities, then reseeds
#    deterministically from tools/data/quran.db.
npm run seed:clear
#   takes ~5-10 minutes for the 6236 verses + 10493 sentences (chunked).

# 4. Verify parity with quran.db
cd ..   # back to worktree root
tools/.venv/bin/python tools/validate-instantdb.py
#   expect: ALL PASS (5 checks)

# 5. (Optional) Verify the Next.js app still builds against the typed schema
cd instantdb-app && npm run build
#   may surface picker-UI typed-query errors that Plan 3 will fix.
```

---

## 3. Design decisions baked in (review these)

1. **13-entity subset** (rest deferred). See ADR-013 §"Picker-minimal subset" for the table.
2. **No direct links to `$users`** — wrapped via `userProfiles` mirror keyed by email. (InstantDB schema validation rejects `$users` as a link target.)
3. **Nuke-and-reseed** instead of migration of inferred data. See ADR-013.
4. **Dev fallback for auth** via `NEXT_PUBLIC_DEV_USER_EMAIL` env var — flagged with `console.warn` + `TODO`. Production-ready magic-link works the same flow as the dev path.
5. **In-scope roots only for sentenceForms + sentenceScoresA1.** The 10 roots from CURRENT-STATE.md (ilah, kabura, shahida, rasul, hayiya, salah, falaha, khayr, nawm, qama). All 1,651 roots in quran.db are not pushed — only what the picker needs. If/when more roots become in scope, expand the `IN_SCOPE_ROOTS` list in `seed-from-sqlite.mjs` and reseed.
6. **`sentenceScoresA1` collapses `verseScores` + `verseRootScores`** from DATA-MODEL.md. When Plan 4 adds hookScore + hookReason it can either extend this entity or split out then.

---

## 4. Known gaps to address in Plan 3 (Picker UI)

- Existing dashboard at `src/app/page.tsx` and picker at `src/app/picker/[lessonNumber]/page.tsx` query the schema-less verses/lessons. After schema:push, those queries will fail at the type level. Plan 3 rewrites them.
- The 13 Playwright tests in `instantdb-app/tests/` will likewise need rewrites.
- The current `instantdb-app/scripts/seed.mjs` (legacy) is left in place but obsoleted by `seed-from-sqlite.mjs`. Delete it as part of Plan 3 cleanup.

---

## 5. What I deliberately did NOT do

| Skipped | Why |
|---|---|
| Run `instant-cli push schema` against live | Destructive. You should review the schema diff against the dashboard first. |
| Run `seed:clear` | Destructive. Wipes any in-progress teacher selections. |
| Run `npm run build` | Will fail until schema:push is done — testing it before would just produce confusing errors. |
| Update or rewrite the Playwright tests | Belongs to Plan 3 (UI rewrite) so the test changes land alongside the code they cover. |
| Add a courseMember for someone other than Siraj | Per CURRENT-STATE.md you're the only owner. Multi-user is later. |
| Implement the magic-link UI page | Plan 3 owns UI. The auth.ts helpers are ready; a `<MagicLinkForm/>` component lands when the picker page is rewritten. |

---

## 6. Resume prompt for Plan 3

```
Plan 2 code is committed on feature/plan-2-instantdb-schema (worktree
.worktrees/plan-2-instantdb/). Read docs/superpowers/plans/2026-04-17-plan-2-HANDOFF.md.

Before starting Plan 3, run the three manual commands in §2 of that
handoff and confirm `python tools/validate-instantdb.py` shows ALL PASS.

Then start Plan 3 (picker UI). Branch off feature/plan-2-instantdb-schema.
Per the audit spec §2-4 + docs/design/picker-ui-reference.md, the picker
needs: controls bar with 3 preset pills + collapsible sliders, sticky
two-row selection bar (budget gauges + traffic-light heatmap chips
that double as filter controls), 8-column table with row-as-checkbox
selection, and auto-select-top-10 on load. All data via typed InstantDB
queries against the schema from Plan 2.
```

---

## 7. Why I stopped before Plan 3

Same reasons from Plan 1's handoff §4, plus:

- Plan 3 is the largest UI plan (Audit §2-4 specs are dense). Realistic
  4-6 hours of focused work even with subagents.
- It depends on Plan 2 being LIVE in InstantDB — which depends on you
  running the three manual commands above.
- Picker UI has subjective rendering details (preset pill exact spacing,
  chip-as-filter feel) that benefit from screenshots-in-the-loop.

If you want me to proceed to Plan 3 anyway, do steps in §2 first then
say "proceed to plan 3" and I'll work on the assumption that InstantDB
has the typed data live.
