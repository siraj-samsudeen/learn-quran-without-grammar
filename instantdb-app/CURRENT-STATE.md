# InstantDB Prototype — Current State

> **Read this first** when picking up this work. It gives you everything you need to continue.

---

## InstantDB Credentials

| Key | Value |
|-----|-------|
| **App ID** | `b1c9a636-2a46-4be6-a055-16d6f2ebd233` |
| **Admin Token** | `5ca3a1a8-a25e-49e3-bf10-3bc6d70000db` |
| **Dashboard** | https://instantdb.com/dash?app=b1c9a636-2a46-4be6-a055-16d6f2ebd233 |

These are used in:
- `src/lib/instant.ts` — client-side init (App ID only)
- `scripts/seed.mjs` — server-side admin SDK (App ID + Admin Token)

---

## What Exists

### Three pages (Next.js App Router):

| Route | What it does | File |
|-------|-------------|------|
| `/` | **Pipeline Dashboard** — all 7 lessons, phase dots (click to cycle status), expandable notes | `src/app/page.tsx` |
| `/picker/[lessonNumber]` | **Verse Picker** — assign verses to Learning/Recall/Pipeline/Skip, add remarks, export JSON | `src/app/picker/[lessonNumber]/page.tsx` |
| `/seed` | **Seed UI** — browser-based buttons to load lessons + verses (uses API route) | `src/app/seed/page.tsx` |

### API route:

| Route | What it does | File |
|-------|-------------|------|
| `GET /api/roots?lesson=N` | Reads `docs/roots/*.json` from disk, returns formatted verses | `src/app/api/roots/route.ts` |

### CLI seed script:

```bash
node scripts/seed.mjs                  # seed everything (idempotent — skips existing)
node scripts/seed.mjs --clear          # wipe + reseed
node scripts/seed.mjs --lesson 5       # seed only lesson 5
node scripts/seed.mjs --lessons-only   # metadata only, no verses
node scripts/seed.mjs --status         # show DB state
```

Features: exponential backoff (1s/2s/4s/8s/16s), 5 retries per chunk, idempotent dedup by `ref|rootKey`, progress saved to `scripts/.seed-progress.json`, resumable on interrupt.

### InstantDB entities (schema-less):

| Entity | Key fields | Count |
|--------|-----------|-------|
| `lessons` | `lessonNumber`, `slug`, `title`, `seedArabic`, `currentPhase`, `phaseScoring`..`phasePublished`, `notes` | 7 |
| `verses` | `ref`, `rootKey`, `form`, `arabicFull`, `translation`, `surahName`, `wordCount`, `scoreFinal`..`scoreTeachingFit`, `fragment`, `lessonNumber` | ~1,558 |
| `selections` | `lessonNumber`, `verseRef`, `section` (learning/recall/pipeline/none), `remark`, `rootKey`, `form`, `updatedAt` | 0 (created by teacher in picker) |

### Supporting files:

| File | Purpose |
|------|---------|
| `src/lib/instant.ts` | InstantDB client init |
| `src/lib/types.ts` | TypeScript types for phases, sections, data shapes |

---

## Data Flow

```
docs/roots/*.json  ──→  scripts/seed.mjs  ──→  InstantDB cloud
                         (admin SDK)            ↕ real-time sync
                                            Browser (useQuery)
                                                ↓
                                        Dashboard + Picker
                                                ↓
                                    Teacher clicks → tx.selections[id()].update()
                                                ↓
                                        "Copy JSON" → clipboard
                                    (same format as existing picker.html)
```

---

## Data Seeded

Seed script has been run successfully with `--clear`:
- **7 lessons** loaded with full pipeline metadata
- **1,558 verses** loaded across all 10 root JSONs
- Seed script fix: `import.meta.dirname` replaced with `fileURLToPath` + `dirname` for Node 20 compatibility

---

## Playwright E2E Tests

Tests added in `tests/` using `@playwright/test`. Run with `npx playwright test`.

| Test | What it verifies |
|------|-----------------|
| Dashboard: 7 lessons | All lesson rows render with titles and Arabic text |
| Dashboard: phase dots cycle | Clicking a phase dot changes its status |
| Dashboard: row expand | Clicking a lesson row shows slug, roots, notes |
| Dashboard: picker links | "Open" links appear for lessons with scoring done |
| Picker: verse count | Lesson 5 shows 40 falaha verses with scores |
| Picker: assign Learning | Clicking "Learning" highlights card, updates counter |
| Picker: assign Recall | Clicking "Recall" highlights card with blue styling |
| Picker: add remarks | Type remark, save, text persists on card |
| Picker: persist on refresh | Selections survive page reload (InstantDB sync) |
| Picker: Copy JSON | Clipboard contains valid JSON with lesson/selections structure |
| Picker: back nav | Dashboard link navigates to `/` |

**All 11 tests passing.**

---

## What's NOT Done Yet

1. **No auth** — anyone with the URL can edit. Fine for prototype.
2. **No schema enforcement** — InstantDB is schema-less by default. Can add `instant.schema.ts` later.
3. **No score breakdown** — picker shows `scoreFinal` but not the 7-dimension breakdown. The data is there in the verse records.
4. **No recall root grouping** — picker groups by `rootKey` within the current lesson but doesn't separate current vs recall roots (would need `picker-config.json` data).
5. **Verse score reasons** — T2 score reasons (story/familiarity/teaching_fit text) are not loaded, only the numeric scores. Could add if useful.
6. **Real-time multi-tab test** — not automated (InstantDB platform guarantee), but works manually.

---

## To Run Locally

```bash
cd instantdb-app
npm install
node scripts/seed.mjs --clear    # load all data (needs internet)
npm run dev                       # http://localhost:3000
npx playwright test               # run E2E tests (needs dev server or auto-starts it)
```
