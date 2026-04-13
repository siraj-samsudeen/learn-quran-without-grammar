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

## Architecture

### App-Level Sidebar (`src/components/AppSidebar.tsx`)

Route-aware sidebar using `usePathname()` + direct InstantDB queries (not React Context injection). The sidebar queries InstantDB directly — since `useQuery` is a reactive subscription, it stays in sync automatically.

Three modes:
- **`/`** (Dashboard) — clean lesson list (number + title), clickable to open picker
- **`/picker/N`** (Picker) — lesson info + Arabic seed + root groups with live section counts + jump links
- **`/seed`** (Seed) — DB status counts (Lessons, Verses, Selections)

Responsive: desktop shows 240px sidebar, mobile (<=900px) hides it behind hamburger button + overlay.

### Three Pages (Next.js App Router):

| Route | What it does | File |
|-------|-------------|------|
| `/` | **Pipeline Dashboard** — 7 lessons, phase dots (click to cycle), expandable notes | `src/app/page.tsx` |
| `/picker/[lessonNumber]` | **Verse Picker** — assign verses to Learning/Recall/Pipeline, audio player, issue flagging | `src/app/picker/[lessonNumber]/page.tsx` |
| `/seed` | **Seed UI** — browser-based buttons to load lessons + verses | `src/app/seed/page.tsx` |

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

### InstantDB entities (schema-less):

| Entity | Key fields | Count |
|--------|-----------|-------|
| `lessons` | `lessonNumber`, `slug`, `title`, `seedArabic`, `currentPhase`, `phaseScoring`..`phasePublished`, `notes` | 7 |
| `verses` | `ref`, `rootKey`, `form`, `arabicFull`, `translation`, `surahName`, `wordCount`, `scoreFinal`..`scoreTeachingFit`, `fragment`, `lessonNumber` | ~1,558 |
| `selections` | `lessonNumber`, `verseRef`, `section` (learning/recall/pipeline/none), `remark`, `rootKey`, `form`, `updatedAt` | teacher-created |
| `issues` | `verseRef`, `lessonNumber`, `type` (Arabic/Eng/Audio/Hook/Other), `note`, `createdAt` | teacher-created |

---

## UI Rework (April 2026)

The picker UI was redesigned from the original plain InstantDB prototype:

### Visual Changes
- **Warm parchment background** (`#faf8f3`) instead of grey
- **Amiri font** for Arabic text (1.4rem, line-height 2)
- **6px left-border color coding** on cards (green=learning, amber=recall, grey=pipeline)
- **Solid active section buttons** (white text on colored bg)
- **Color-coded score badges** (green >=10, yellow >=6, grey <6)
- **Always-visible inline remark field** with dashed border (not click-to-reveal)

### New Features
- **App-level sidebar** with route-aware contextual content
- **Audio player** per verse card with 11 reciters (EveryAyah CDN), mutual exclusion
- **Lesson selector dropdown** in sticky top bar for quick navigation
- **Issue flagging bar** (Option C — subtle grey bar with category chips: Arabic/Eng/Audio/Hook/Other, persisted to InstantDB)
- **Responsive mobile sidebar** (hamburger + overlay at <=900px)

### Removed (InstantDB makes redundant)
- "Copy JSON" button (selections are in InstantDB cloud)
- "Skip" section button (unassigned = none by default)

### Design Mockups
HTML mockups in `mockups/`:
- `issue-ui-options.html` — 3 issue UI options (Option C chosen)
- `sidebar-all-pages.html` — full app sidebar across all 3 pages
- `picker/option-a-two-panel.html` — redesigned picker with form-level sidebar (NOT YET IMPLEMENTED)

---

## Next Steps / Pending Work

1. **Form-level picker redesign** (`mockups/picker/option-a-two-panel.html`) — sidebar navigation by root→form with coverage dots, score dimension breakdown, sort by words/score. On hold pending system rearchitecture.
2. **feather-testing-core DSL** — rewrite Playwright tests using chainable DSL (rule saved in Obsidian vault + memory). Currently using vanilla Playwright.
3. **System rearchitecture** — major changes planned that will affect the picker and data model. See `docs/decisions/ADR-010-sqlite-data-architecture.md`.

---

## Playwright E2E Tests

13 tests in `tests/` using `@playwright/test`. Run with `npx playwright test`.

| Test | What it verifies |
|------|-----------------|
| Dashboard: 7 lessons | Sidebar + pipeline table render with all lessons |
| Dashboard: phase dots | Clicking a dot cycles its status |
| Dashboard: row expand | Click row → shows slug + roots |
| Dashboard: sidebar nav | Click sidebar lesson → navigates to picker |
| Picker: verses + audio | Lesson 5 shows 40 verses, audio elements present |
| Picker: assign Learning | Click Learning → card section updates, counter increments |
| Picker: toggle deselect | Click active button again → back to none |
| Picker: remark visible | Remark label + contenteditable always shown |
| Picker: issue chips | Click Eng → issue bar activates (data-has-issue=true) |
| Picker: lesson selector | Change dropdown → navigates to different lesson |
| Picker: persist refresh | Assign Pipeline → refresh → counter still shows it |
| Picker: sidebar context | Sidebar shows lesson title + root nav counts |
| Picker: dashboard nav | Click Dashboard in sidebar → navigates to / |

**All 13 tests passing.**

---

## To Run Locally

```bash
cd instantdb-app
npm install
node scripts/seed.mjs --clear    # load all data (needs internet)
npm run dev                       # http://localhost:3000
npx playwright test               # run E2E tests (needs dev server or auto-starts it)
```

---

## File Structure

```
instantdb-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout — grid with sidebar
│   │   ├── globals.css                   # Tailwind + color tokens + Amiri font
│   │   ├── page.tsx                      # Dashboard
│   │   ├── picker/[lessonNumber]/page.tsx # Verse picker (reworked)
│   │   ├── seed/page.tsx                 # Seed utility
│   │   └── api/roots/route.ts            # API: reads root JSONs from disk
│   ├── components/
│   │   ├── AppSidebar.tsx                # Route-aware sidebar (dashboard/picker/seed modes)
│   │   └── IssueBar.tsx                  # Subtle issue flagging bar with category chips
│   └── lib/
│       ├── instant.ts                    # InstantDB client init
│       └── types.ts                      # TypeScript types (phases, sections, issues)
├── tests/
│   ├── dashboard.spec.ts                 # 4 dashboard tests
│   └── picker.spec.ts                    # 9 picker tests
├── mockups/
│   ├── issue-ui-options.html             # Issue UI comparison (3 options)
│   ├── sidebar-all-pages.html            # Sidebar mockup (all pages)
│   └── picker/option-a-two-panel.html    # Form-level picker redesign (pending)
├── scripts/seed.mjs                      # CLI seed script
└── playwright.config.ts
```
