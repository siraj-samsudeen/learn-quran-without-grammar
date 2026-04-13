# ADR-011: InstantDB for Teacher + Student Experience — Expo Pinned for Long-Term

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | April 2026 |
| **Decision** | Extend the InstantDB Next.js app to serve both teacher and student. Build SRS, real-time sync, and student preferences on InstantDB. Keep Expo/React Native pinned for future native app. |
| **Supersedes** | Partially supersedes ADR-008 (Expo timing — not the choice itself) |
| **Deciders** | Siraj Samsudeen (course creator) |

---

## Revisions

**2026-04-14 — amendments after brainstorming session (ADR-010 amendments).** The following refinements apply; superseded portions below are retained for historical context.

1. **All student-scoped entities now include `courseId`** — because a student can enroll in multiple courses and each course has its own SRS state, lesson ordering, and forms. Affected: `students` (add `enrolledCourses` JSON array), `studentCards` (add `courseId`), `reviewSessions` (add `courseId`), `streaks` (add `courseId` — streak is per-course).

2. **Root Explorer data is now unblocked.** Per ADR-010 amendment #3, `verse_words` (130K word-level morphology rows) is seeded to InstantDB. This means Root Explorer — the deferred Phase 2+ feature allowing students to browse any surah freely — no longer needs a backend API or WASM SQLite escape hatch. Still deferred from MVP scope to keep Phase 1 minimal, but unblocked on the data layer.

3. **Student verse cards can do exact word-level highlighting from day one** — no fuzzy string matching needed. The SRS engine queries `studentCards` → `selections` → `forms` → `form_lemma_bindings` → `verse_words` to find the exact word positions to bold.

4. **Permissions model extends with course scoping**: students read their enrolled courses' published lessons; teachers edit only courses they author (multi-teacher deferred; `teachers` table is a future additive change per ADR-010).

5. **See [docs/FORMS-LEMMAS-ROOTS.md](../FORMS-LEMMAS-ROOTS.md)** for the authoritative spec on how forms relate to lemmas in the student app.

---

## Context

### What exists today

Three separate systems serve different audiences:

1. **Jekyll static site** (GitHub Pages) — student-facing lessons. Markdown → HTML at build time. No login, no progress tracking, no SRS. Student feedback trapped in localStorage (never reaches teacher).

2. **InstantDB Next.js app** (prototype) — teacher-facing dashboard + verse picker. Real-time reactive via WebSocket subscriptions. 4 entities: `lessons`, `verses`, `selections`, `issues`. Mutations propagate to all connected browsers in <100ms.

3. **Expo native app** (ADR-008, unbuilt) — envisioned offline-first student app with SQLite, FSRS, background audio, App Store distribution.

### The gap

The teacher builds lessons in the InstantDB app. The student consumes them on a static site. These worlds don't talk to each other:

- Teacher corrects a translation → must rebuild Jekyll site and deploy (minutes to hours)
- Student flags an issue → trapped in localStorage, teacher never sees it
- No SRS, no progress tracking, no personalization
- No way to drip-feed lessons based on student readiness

### Why not jump straight to Expo?

ADR-008 chose Expo for three capabilities a browser can't match: background audio playback (screen off), unlimited offline storage (GB+), and App Store distribution. These remain valid for the long-term vision.

But building Expo first means:

- **Months before a testable student experience** — Expo setup, native builds, EAS pipeline, app review
- **No real-time teacher↔student loop** — the offline-first architecture (SQLite + sync queue) doesn't support instant content updates
- **Iteration friction** — every change requires a native rebuild or OTA push
- **The teacher can't see student struggles** in real-time

The InstantDB prototype already has the hardest piece working: real-time reactive data with instant sync. Extending it to students is days of work, not months.

---

## Decision

### Two-track strategy

**Track 1 — InstantDB Web App (now → working product)**

Extend the existing InstantDB Next.js app to serve both teacher and student:

- Add student-facing views (lesson study, SRS review, progress dashboard)
- Add FSRS-powered spaced repetition (ts-fsrs running client-side)
- Real-time bidirectional sync: teacher publishes → student sees immediately; student flags issue → teacher dashboard updates
- Student preferences (language, reciter, daily goal) stored in InstantDB
- Authentication via InstantDB auth (email magic link or Google OAuth)
- Role-based permissions: teacher can edit content, student can only read content + write their own SRS state

**Track 2 — Expo Native App (pinned for later)**

When the web app proves the pedagogy and SRS design work:

- Port the proven UI and data model to Expo/React Native
- Add capabilities impossible on web: background audio, offline-first SQLite, push notifications
- InstantDB client SDK available for React Native (same data layer)
- Or migrate to SQLite + QF API sync if InstantDB proves too expensive at scale

### What InstantDB gives us that the static site cannot

| Capability | Jekyll Static | InstantDB Web |
|---|---|---|
| Teacher edits → student sees | Deploy cycle (minutes–hours) | <100ms (WebSocket) |
| Student flags issue → teacher sees | Never (localStorage) | <100ms (WebSocket) |
| SRS card scheduling | Impossible (no state) | FSRS in browser + persisted to cloud |
| Progress tracking | None | Cards mastered, streak, study time |
| Personalized card order | Random shuffle only | FSRS-driven: due cards first |
| Student preferences | Per-device localStorage | Synced across devices |
| Lesson access control | All-or-nothing | Teacher controls which lessons are live |
| Teacher analytics | None | Aggregate struggle points, completion rates |

### What we defer to Expo (Track 2)

| Capability | Why it needs native |
|---|---|
| Background audio (screen off) | Browser audio dies when tab loses focus |
| Offline-first (no internet) | InstantDB needs initial connection; Service Worker cache limited |
| Unlimited audio storage | Cache API ~100MB limit vs filesystem GB+ |
| Push notifications | iOS Safari doesn't support Web Push reliably |
| App Store presence | Discoverability, trust, install UX |
| On-device TTS fallback | Web Speech API quality varies by device |

---

## Data Model Extension

The InstantDB schema expands from 4 entities (teacher-only) to support students:

### New entities

```
students
├── id              (InstantDB UUID)
├── email           (auth identity)
├── displayName     (optional)
├── role            ("teacher" | "student")
├── language        ("en" | "ta")
├── reciterId       (preferred reciter for audio)
├── dailyGoalMin    (minutes per day target)
├── newCardsPerDay  (SRS drip rate, default 5)
├── theme           ("light" | "dark" | "auto")
├── enrolledCourses (JSON array of course_id — REVISED 2026-04-14, supports multi-course enrollment)
├── createdAt       (timestamp)

studentCards
├── id             (InstantDB UUID)
├── studentId      (→ students)
├── courseId       (→ courses — REVISED 2026-04-14, SRS state is per-course)
├── lessonNumber   (which lesson within the course)
├── verseRef       ("59:22")
├── rootKey        ("ilah")
├── formId         (→ forms — REVISED 2026-04-14, which specific pedagogical form this card teaches)
├── stability      (FSRS: how well-memorized, float)
├── difficulty     (FSRS: how hard for this user, float)
├── due            (ISO date: when to review next)
├── reps           (total reviews done)
├── lapses         (times forgotten after learning)
├── state          ("new" | "learning" | "review" | "relearning")
├── lastMode       ("active" | "background")
├── lastReviewedAt (timestamp)

reviewSessions
├── id                  (InstantDB UUID)
├── studentId           (→ students)
├── courseId            (→ courses — REVISED 2026-04-14)
├── lessonNumber        (which lesson, or null for mixed review)
├── mode                ("active" | "background")
├── startedAt           (timestamp)
├── endedAt             (timestamp)
├── cardsReviewed       (count)
├── minutesStudied      (computed from start/end)
├── newCardsIntroduced  (count of cards that went from "new" to "learning")

streaks
├── id              (InstantDB UUID)
├── studentId       (→ students)
├── courseId        (→ courses — REVISED 2026-04-14, streak is per-course because courses have different pacing)
├── currentStreak   (days)
├── longestStreak   (days)
├── lastStudyDate   (ISO date)
```

### Modified existing entities

```
issues (extended)
├── ... (existing fields)
├── reportedBy     (studentId — who flagged it)
├── status         ("open" | "resolved" | "dismissed")
├── resolvedAt     (timestamp)
├── teacherReply   (text response from teacher)
```

### Permissions model

```
Teacher:
  - lessons: read + write
  - verses: read + write
  - selections: read + write
  - issues: read + write (resolve/dismiss)
  - studentCards: read (aggregate only — no individual student details)
  - reviewSessions: read (aggregate only)

Student:
  - lessons: read (only where phasePublished = "done")
  - verses: read (only for published lessons)
  - selections: read (only for published lessons)
  - issues: create + read own
  - studentCards: read + write OWN only
  - reviewSessions: read + write OWN only
  - streaks: read + write OWN only
  - students: read + write OWN profile only
```

---

## SRS Design

### Algorithm: FSRS via ts-fsrs

FSRS (Free Spaced Repetition Scheduler) v5.0, same algorithm adopted by Anki. Runs client-side in the browser — no server computation needed. State persisted to InstantDB after each review.

### Card lifecycle

```
Teacher publishes lesson (phasePublished → "done")
    ↓
Student opens lesson for first time
    ↓
studentCards auto-created for each verse in lesson (state: "new")
    ↓
FSRS selects cards: reviews first (due today), then new cards (capped at newCardsPerDay)
    ↓
Student reviews card:
  - Sees Arabic text → hears recitation → reveals translation → rates
  - Rating: "Know it" / "Almost" / "Don't know" (3-button, maps to FSRS Good/Hard/Again)
    ↓
FSRS computes next review date → updates studentCard → synced to InstantDB
    ↓
Card moves through: new → learning → review (with possible relearning on lapses)
```

### Dual modes (from Glossika research)

| Mode | Interaction | SRS weight | Use case |
|---|---|---|---|
| **Active Review** | Screen on, rate each card | Full FSRS retention | Focused study (desk, before bed) |
| **Background Listening** | Audio loop, no interaction | Shorter retention multiplier (×0.7) | Commute, chores, walking |

Both modes advance the same card through the SRS — but background listening cards come back sooner because passive exposure builds less durable memory (validated by Glossika's research).

### Review queue priority

1. **Overdue reviews** (due date < today, oldest first)
2. **Due today** (due date = today)
3. **New cards** (state = "new", up to daily cap)
4. **Ahead-of-schedule** (optional: review future cards if queue is empty)

### Audio in SRS

The SRS drives both card display AND audio playback:

- **Active mode**: Play Arabic recitation → pause → student reveals translation → rates → next card
- **Background mode**: Play Arabic recitation → pause → play translation TTS → pause → next card (auto-advance, no rating needed — inferred as "background listen")

The shuffle player from the Jekyll site becomes SRS-aware: instead of random order, it plays cards in FSRS priority order.

---

## Student Experience: Key Screens

### Home Dashboard
```
Welcome back, [name]
🔥 12-day streak

Today's study:
  [8 reviews due] → Start Review
  [3 new cards available] → Learn New

Progress:
  Lesson 1: 47/52 cards mastered (90%)
  Lesson 2: 12/38 cards learning (32%)
  Lesson 3: not started

Recent: studied 15 min yesterday
```

### Lesson View
- Same verse card layout as Jekyll site, but:
  - Cards ordered by SRS priority (not page order)
  - Cards the student hasn't reached yet are locked/dimmed
  - Teacher's hook text, Arabic, audio, translation — all from InstantDB
  - "Flag issue" sends to teacher's dashboard in real-time
  - Progress bar showing cards mastered in this lesson

### Active Review
- Full-screen single card at a time
- Arabic text (large) + audio auto-plays
- "Show translation" button → reveals answer
- Three rating buttons: Know it / Almost / Don't know
- Progress: "Card 5 of 8 · 3 remaining"
- Session summary at end: "8 cards reviewed · 2 new learned · 6 min"

### Background Listen (web limitations acknowledged)
- Audio player bar (bottom of screen, stays visible while browsing)
- Plays: Arabic recitation → 2s pause → translation TTS → 3s pause → next
- Can only work while browser tab is open and focused (web limitation)
- Track 2 (Expo) removes this limitation

---

## What Changes in the Codebase

### InstantDB app extensions (Track 1)

| What | File(s) | Notes |
|---|---|---|
| Auth (magic link or Google) | New: auth setup in `instant.ts` | InstantDB has built-in auth |
| Student home dashboard | New: `src/app/student/page.tsx` | Streak, due cards, progress |
| Lesson study view | New: `src/app/student/lesson/[n]/page.tsx` | SRS-ordered cards |
| Active review screen | New: `src/app/student/review/page.tsx` | Single-card review flow |
| SRS engine | New: `src/lib/srs.ts` | Wraps ts-fsrs, manages card state |
| Student types | Update: `src/lib/types.ts` | Add StudentCard, ReviewSession, etc. |
| Issue resolution flow | Update: `src/components/IssueBar.tsx` | Add status, teacherReply |
| Permission rules | New: `instant.perms.ts` | Role-based read/write rules |
| Student nav/layout | Update or new layout | Student vs teacher routing |

### Jekyll site (no changes needed immediately)

The static site continues working as-is. Students who prefer it keep using it. The InstantDB app is an alternative with SRS and progress tracking — not a replacement.

### Data flow (new)

```
Teacher (InstantDB dashboard)
    ↓ writes lessons, selections, content
InstantDB Cloud (real-time sync)
    ↓ subscriptions push to all clients
Student (InstantDB web app)
    ↓ reviews cards, rates, flags issues
InstantDB Cloud
    ↓ subscription pushes issue to teacher
Teacher sees issue → resolves → student sees resolution
```

---

## Migration Path to Expo (Track 2)

When the web app is proven and the pedagogy works:

1. **Port UI components** — React (web) → React Native (mostly the same JSX)
2. **Data layer options**:
   - **Option A**: Keep InstantDB as backend (React Native SDK exists) — simplest, keeps real-time sync
   - **Option B**: Migrate to SQLite + QF API sync (ADR-008 original vision) — better offline, more complex
   - **Option C**: Hybrid — InstantDB for teacher content sync, SQLite for SRS state (best of both)
3. **Add native capabilities**: `react-native-track-player` for background audio, `expo-sqlite` for offline SRS, push notifications
4. **Publish**: EAS Build → App Store + Play Store

The choice between A/B/C depends on what we learn from running the web app — specifically:
- Do students actually need true offline (no internet at all)?
- Is background audio (screen off) a top student request?
- Does InstantDB's pricing scale acceptably for our student count?

---

## Consequences

### Positive

1. **Weeks to student-testable product, not months** — the hardest piece (real-time data) already works
2. **Teacher↔student feedback loop closes** — issues flow bidirectionally in real-time
3. **SRS validated before native investment** — prove the pedagogy on web, then port proven UX to native
4. **Single data layer** — teacher and student share one InstantDB database; no sync gap
5. **Iteration speed** — web deploys are instant; no app store review cycles
6. **Progressive enhancement** — students who only want to listen can use the Jekyll site; students who want SRS use the web app

### Negative

1. **No background audio** — browser audio stops when tab loses focus. Addressed in Track 2
2. **Online required** — InstantDB needs initial connection (has offline optimistic updates, but not true offline-first). Addressed in Track 2
3. **Audio storage limits** — browser cache ~100MB, insufficient for 50+ lessons. Mitigated by streaming from EveryAyah CDN rather than caching
4. **InstantDB pricing risk** — free tier may not scale. Mitigated by monitoring usage and having Track 2 as escape hatch
5. **Two web apps** — Jekyll site + Next.js app create UX fragmentation. Can address by linking between them or eventually replacing Jekyll with the InstantDB app

### Risks

| Risk | Mitigation |
|---|---|
| InstantDB free tier limits | Monitor usage; Track 2 (Expo + SQLite) is the escape hatch |
| Browser audio unreliability | Accept limitation for Track 1; document as reason for Track 2 |
| Student data in third-party cloud | InstantDB stores only study progress, not personal data; FSRS state is non-sensitive |
| Feature creep delaying Track 1 | Keep student MVP minimal: auth, lesson view, active review, streak |
| ts-fsrs browser bundle size | ts-fsrs is ~15KB minified; negligible impact |

---

## Student MVP Scope (Track 1, Phase 1)

To avoid scope creep, the first student release includes ONLY:

1. **Auth** — email magic link (InstantDB built-in)
2. **Lesson list** — published lessons only
3. **Lesson study view** — verse cards with audio (SRS-ordered)
4. **Active review** — single-card review with 3-button rating
5. **Basic progress** — cards mastered per lesson, streak counter
6. **Issue flagging** — flag reaches teacher dashboard

NOT in Phase 1:
- Background listening mode (web limitation makes it weak)
- Root Explorer (valuable but not essential for SRS validation)
- Teacher analytics dashboard (can inspect InstantDB directly)
- Multi-language TTS (use pre-built MP3s only)
- Daily goal tracking (streak is sufficient)

---

## Related Documents

| Document | Purpose |
|---|---|
| ADR-008 | Expo/React Native architecture (long-term target) |
| ADR-010 | SQLite data architecture (local tools + data layer) |
| Platform PRD | Full vision including SRS design, dual modes, QF APIs |
| `docs/app/research-glossika.md` | Glossika SRS research (dual modes, retention, review-first) |
| `instantdb-app/CURRENT-STATE.md` | Current InstantDB prototype state |
