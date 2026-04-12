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

## What's NOT Done Yet

1. **Data not yet seeded** — seed script couldn't reach InstantDB from the sandbox. Run `node scripts/seed.mjs` locally.
2. **No auth** — anyone with the URL can edit. Fine for prototype.
3. **No schema enforcement** — InstantDB is schema-less by default. Can add `instant.schema.ts` later.
4. **No score breakdown** — picker shows `scoreFinal` but not the 7-dimension breakdown. The data is there in the verse records.
5. **No recall root grouping** — picker groups by `rootKey` within the current lesson but doesn't separate current vs recall roots (would need `picker-config.json` data).
6. **Verse score reasons** — T2 score reasons (story/familiarity/teaching_fit text) are not loaded, only the numeric scores. Could add if useful.

---

## To Run Locally

```bash
cd instantdb-app
npm install
node scripts/seed.mjs --clear    # load all data (needs internet)
npm run dev                       # http://localhost:3000
```

---

## Branch

`claude/instantdb-minimal-prototype-pDk3M`

All commits on this branch. Ready for PR against `main`.
