# Quran Foundation Hackathon — API Research & Integration Plan

> **Purpose**: Analyse the Quran Foundation's Content and User API ecosystems to determine how *Learn Qur'an Without Grammar* can participate in the Quran Foundation Hackathon, satisfy its technical requirements, and gain genuine value from the User APIs for learning-state tracking.
>
> **Hackathon URL**: <https://launch.provisioncapital.com/quran-hackathon>
>
> **API Docs**: <https://api-docs.quran.foundation>
>
> **Last Updated**: July 2025

---

## Table of Contents

1. [Hackathon Overview](#1-hackathon-overview)
2. [Technical Requirements](#2-technical-requirements)
3. [Category 1 — Content APIs](#3-category-1--content-apis)
4. [Category 2 — User APIs](#4-category-2--user-apis)
   - 4.1 [Activity Days API](#41-activity-days-api)
   - 4.2 [Goals API](#42-goals-api)
   - 4.3 [Streak Tracking API](#43-streak-tracking-api)
   - 4.4 [Bookmarks API](#44-bookmarks-api)
   - 4.5 [Collections API](#45-collections-api)
   - 4.6 [Notes API](#46-notes-api)
   - 4.7 [Reading Sessions API](#47-reading-sessions-api)
   - 4.8 [Preferences API](#48-preferences-api)
   - 4.9 [Posts API](#49-posts-api)
5. [Mapping User APIs to Learning State](#5-mapping-user-apis-to-learning-state)
6. [What the APIs Cannot Do (Gaps)](#6-what-the-apis-cannot-do-gaps)
7. [Proposed Integration Architecture](#7-proposed-integration-architecture)
8. [Authentication — OAuth2 PKCE](#8-authentication--oauth2-pkce)
9. [Judging Criteria Alignment](#9-judging-criteria-alignment)
10. [Action Items & Next Steps](#10-action-items--next-steps)

---

## 1. Hackathon Overview

| Field | Detail |
|-------|--------|
| **Organiser** | Provision Launch (sponsored by Quran Foundation) |
| **Theme** | Build technology that strengthens people's connection with the Qur'an |
| **Prize pool** | $10,000 across 7 winners ($3,000 / $2,500 / $1,750 / $1,250 / $750 / $500 / $250) |
| **Team size** | Solo or up to 4 members |
| **Timeline** | Ramadan 2026 launch → End of Shawwal 1447 (April 20, 2026) submission deadline |
| **Submission** | Title, description, live demo/app link, GitHub repo, 2–3 min demo video, API usage description |

### Core Challenge
> "Millions reconnect with the Quran during Ramadan — but many struggle to maintain that connection afterwards. This hackathon challenges you to build solutions that make that relationship lasting."

This maps perfectly to our course's mission: building lasting Qur'anic Arabic recognition through daily audio immersion and spaced repetition.

---

## 2. Technical Requirements

The project **must use at least one API from each of the two categories**:

### Category 1 — Content API (or Quran MCP)
- Quran APIs (verses, chapters, words)
- Audio APIs (reciter audio, timestamps)
- Tafsir APIs
- Translation APIs
- Post APIs (Lessons & Reflections from QuranReflect)

### Category 2 — User API
- Bookmarks
- Collections
- Streak Tracking
- Post APIs (Post a reflection)
- Activity & Goals APIs

We are already deeply familiar with the Content APIs (used in `tools/auto-timestamps.py`, `tools/verify-verse.py`, etc.). The strategic question is how to leverage the **User APIs** for genuine learning-state value.

---

## 3. Category 1 — Content APIs

**Base URL**: `https://api.quran.com/api/v4/` (currently used without auth; hackathon requires OAuth2 `client_credentials` grant with `content` scope)

### APIs We Already Use

| API | Current Usage | Hackathon Integration |
|-----|--------------|----------------------|
| **Verses** (`/verses/by_key/{key}`) | `verify-verse.py` — validate verse text | Fetch verse text + word-by-word data for lesson phrases dynamically |
| **Audio** (`/chapter_recitations/{reciter}/{chapter}`) | `auto-timestamps.py` — word-level segment timestamps | Serve reciter audio with precise timestamps; possibly stream from API instead of bundling |
| **Resources** (`/resources/recitations`) | Reciter ID lookup | List available reciters for user preferences |

### APIs We Could Add

| API | Value for Our Course |
|-----|---------------------|
| **Translations** (`/verses/by_key/{key}?translations={id}`) | Dynamically fetch translations for anchor verses in multiple languages (beyond our current EN/TA) |
| **Tafsir** (`/tafsirs/{tafsir_id}/by_ayah/{verse_key}`) | Optionally show brief tafsir for anchor verses — adds "Impact on Quran Engagement" for judging |
| **Quran Reflect Posts** (`/quran-reflect/v1/posts/feed`) | Surface community reflections about the specific verses being studied — social learning layer |
| **Search** (`/search?q=...`) | Let users search for a word they've learned and see where else it appears in the Qur'an |

### Content API Auth Change
Currently our tools hit the API without authentication. For the hackathon, all Content API calls require:
- OAuth2 `client_credentials` grant → get access token with `content` scope
- Headers: `x-auth-token` (JWT) + `x-client-id`

---

## 4. Category 2 — User APIs

**Base URL**: `https://api.quran.com/api/v1/` (user-related endpoints)

All User APIs require:
- OAuth2 Authorization Code flow (PKCE for web/mobile) — the **user** must authenticate and consent
- Headers: `x-auth-token` (user's JWT) + `x-client-id`
- Cursor-based pagination (`first`, `after`, `before`, `last`)

### 4.1 Activity Days API

**Endpoints**: `POST /v1/activity-days`, `GET /v1/activity-days`, `GET /v1/activity-days/estimate-reading-time`

**Relevance**: ⭐⭐⭐ **PRIMARY FIT** — tracks daily study time

The Activity Days API creates/updates one activity record per date per type. Critically, the `type` field accepts:
- `QURAN` — standard Qur'an reading
- **`LESSON`** — learning/course activity ← **this is us**
- `QURAN_READING_PROGRAM`

#### Request Body (type=QURAN)
```json
{
  "type": "QURAN",
  "seconds": 180,
  "ranges": ["59:22-59:24"],
  "mushafId": 4,
  "date": "2026-03-15"
}
```

#### Request Body (type=LESSON)
The `LESSON` type likely accepts a similar structure. The `ranges` field uses the format `{surah}:{ayah}-{surah}:{ayah}` which maps directly to our verse selections (e.g., Lesson 01 covers verses from Al-Ḥashr 59:22-24, Al-Aʿlā 87:1, Al-Ikhlāṣ 112:1-4, etc.).

#### How We'd Use It
- When a user completes a study section → POST with `type=LESSON`, time spent in `seconds`, verse ranges covered in `ranges`
- When a user plays shuffle audio → accumulate seconds, POST at end of session
- Optional `date` field allows backfilling if the user was offline and syncs later

#### Key Benefit
Activity Days **automatically power Streaks and Goals** — we get those features for free just by logging activity.

#### Headers
- `x-timezone` — important for accurate day-boundary calculation and streak computation

---

### 4.2 Goals API

**Endpoints**: `POST /v1/goals`, `GET /v1/goals/today`, `PUT /v1/goals/{id}`, `DELETE /v1/goals/{id}`, `GET /v1/goals/estimate`

**Relevance**: ⭐⭐⭐ **EXCELLENT FIT** — course progress goals

The Goals API has types that include **`COURSE`** and categories that include **`COURSE`** — this was literally designed for our use case.

#### Goal Types
| Type | Description |
|------|-------------|
| `QURAN_TIME` | Time-based Qur'an reading goal |
| `QURAN_PAGES` | Page-based reading goal |
| `QURAN_RANGE` | Verse-range-based reading goal |
| **`COURSE`** | **Course completion goal** ← our fit |
| `QURAN_READING_PROGRAM` | Structured reading program |
| `RAMADAN_CHALLENGE` | Ramadan-specific challenge |

#### How We'd Use It
- **Daily goal**: "Study Qur'anic Arabic for 15 minutes today" → `type=COURSE`, `amount=15` (minutes?), `category=COURSE`
- **Duration goal**: "Complete Lesson 01–05 in 30 days" → `type=COURSE`, `duration=30`
- Progress is auto-tracked when we log `type=LESSON` Activity Days
- `GET /v1/goals/today` returns whether today's goal is met — drives a "✓ Goal complete!" UI

#### Create Goal Request
```json
{
  "type": "COURSE",
  "amount": "15",
  "category": "COURSE",
  "duration": 30
}
```

Query param: `mushafId=4` (UthmaniHafs)

---

### 4.3 Streak Tracking API

**Endpoints**: `GET /v1/streaks`, `GET /v1/streaks/current`

**Relevance**: ⭐⭐ **AUTOMATIC BENEFIT** — no extra work needed

Streaks are **derived automatically from Activity Days**. We don't create or update streaks — we just read them.

#### Response Data
```json
{
  "id": "...",
  "startDate": "2026-03-01",
  "endDate": "2026-03-15",
  "status": "ACTIVE",
  "days": 15
}
```

#### Query Parameters
| Param | Use |
|-------|-----|
| `from` / `to` | Date range for streak history |
| `type` | Filter by `QURAN` (only type currently) |
| `status` | `ACTIVE` or `BROKEN` |
| `orderBy` | `startDate` or `days` |

#### How We'd Use It
- Show a "🔥 15-day streak!" badge on the lesson page
- Show streak history in a progress dashboard
- Motivational: "You've studied every day this week — keep going!"

#### Limitation
Currently the `type` filter only supports `QURAN`. It's unclear whether `LESSON`-type Activity Days generate their own streaks or contribute to the `QURAN` streak. This needs testing or clarification with the API team (Hackathon@quran.com).

---

### 4.4 Bookmarks API

**Endpoints**: `POST /v1/bookmarks`, `GET /v1/bookmarks`, `DELETE /v1/bookmarks/{id}`, `GET /v1/bookmarks/ayah-range`, `GET /v1/bookmarks/{id}`, `GET /v1/bookmarks/{id}/collections`

**Relevance**: ⭐⭐ **GOOD FIT** — track which phrases/verses have been studied

Bookmarks are keyed by Surah number + Ayah number + Mushaf ID.

#### Request Body (Ayah Bookmark)
```json
{
  "type": "ayah",
  "key": 59,
  "verseNumber": 22,
  "mushaf": 4,
  "isReading": false
}
```

#### How We'd Use It
- **Mark verses as "studied"**: When a user completes studying a verse card, bookmark that ayah
- **"Continue where you left off"**: Use `isReading: true` to mark the user's current study position (only one reading bookmark per user)
- **Query studied verses**: `GET /v1/bookmarks/ayah-range` can check which verses in a range are bookmarked — useful for showing "3/8 phrases studied" progress on a lesson card

#### Limitation
Bookmarks are at the **ayah level**, not word level. We can track "user studied verse 59:22" but not "user specifically studied the word إِلَٰه within that verse." For word-level tracking, see Notes API (§4.6).

---

### 4.5 Collections API

**Endpoints**: `POST /v1/collections`, `GET /v1/collections`, `POST /v1/collections/{id}/bookmarks`, `DELETE /v1/collections/{id}`, `GET /v1/collections/{id}/items`, `PUT /v1/collections/{id}`, `DELETE /v1/collections/{id}/bookmarks/{bookmarkId}`, `GET /v1/collections/items`

**Relevance**: ⭐⭐ **GOOD FIT** — organise bookmarks by lesson or mastery level

Collections are named groups of bookmarks. A collection has a `name` (string) and contains bookmark references.

#### How We'd Use It

| Collection Name | Purpose |
|----------------|---------|
| `"Lesson 01 – Allahu Akbar"` | All verses/phrases from Lesson 01 |
| `"Lesson 02 – ..."` | All verses from Lesson 02, etc. |
| `"Mastered Phrases"` | Verses the user recognises confidently |
| `"Needs Review"` | Verses the user struggles with (replays audio frequently) |

#### Workflow
1. When user starts Lesson 01 → create Collection "Lesson 01 – Allahu Akbar"
2. As they study each phrase → create Bookmark for that ayah → add to Collection
3. When they pass a review quiz → move bookmark to "Mastered Phrases" collection
4. Dashboard shows: "Lesson 01: 8/8 phrases studied, 5/8 mastered"

---

### 4.6 Notes API

**Endpoints**: `POST /v1/notes`, `GET /v1/notes`, `GET /v1/notes/by-verse`, `GET /v1/notes/by-attached-entity`, `GET /v1/notes/verse-range/count`, `GET /v1/notes/by-verse-range`, `GET /v1/notes/{id}`, `PUT /v1/notes/{id}`, `DELETE /v1/notes/{id}`, `POST /v1/notes/{id}/publish`

**Relevance**: ⭐⭐⭐ **CREATIVE FIT** — store detailed per-phrase learning metadata

The Notes API is the most flexible User API. Each note has:
- `body` (string, 6–10,000 characters) — free-form content
- `ranges` (array of `{surah}:{ayah}-{surah}:{ayah}` strings) — attached to specific verse ranges
- `attachedEntities` — can link to a QuranReflect reflection
- `saveToQR` — option to publish to QuranReflect
- Full CRUD (create, read, update, delete)
- Queryable by verse, by verse range, by attached entity

#### How We'd Use It — Structured Learning Metadata

Store JSON-encoded learning state in the note `body`, attached to the relevant verse range:

```json
{
  "source": "learn-quran-without-grammar",
  "lessonId": "lesson-01",
  "root": "إِلَٰه",
  "rootMeaning": "god",
  "formsStudied": ["إِلَٰه", "إِلَٰهَ", "إِلَٰهٌ"],
  "audioPlayCount": 7,
  "shufflePlayerSessions": 3,
  "lastStudied": "2026-03-15T14:30:00Z",
  "recognitionLevel": "familiar",
  "quizAttempts": 2,
  "quizCorrect": 1
}
```

Attached to `ranges: ["59:22-59:22"]`.

#### Per-Phrase Tracking Solved

This solves the specific requirements mentioned:
- **"What phrases they have studied"** → query notes by verse range, check which have notes
- **"How many times they played the audio"** → `audioPlayCount` field in note body, updated on each play
- **"Shuffle player sessions"** → `shufflePlayerSessions` counter
- **Recognition confidence** → `recognitionLevel` field, updated after quizzes

#### Update Flow
1. User plays audio for verse 59:22 → client increments local counter
2. After session ends (or periodically) → `PUT /v1/notes/{id}` with updated body
3. If note doesn't exist yet for that verse → `POST /v1/notes` to create it
4. Query `GET /v1/notes/by-verse-range?ranges=59:22-59:24` to load all study state for a lesson

#### Publish to QuranReflect
Users could optionally publish a note as a QuranReflect reflection — e.g., "I learned that إِلَٰه appears in the adhān, shahādah, and Āyat al-Kursī. Understanding this one root word opens up so many verses!" This doubles as the **Post API** requirement for the hackathon.

---

### 4.7 Reading Sessions API

**Endpoints**: `POST /v1/reading-sessions`, `GET /v1/reading-sessions`

**Relevance**: ⭐ **MODERATE FIT** — simple "resume" tracking

Tracks the user's most recent reading location (chapterNumber + verseNumber). Creates a new session if the last one is >20 minutes old; otherwise updates the existing one.

#### Request Body
```json
{
  "chapterNumber": 59,
  "verseNumber": 22
}
```

#### How We'd Use It
- Track which verse the user was last studying → "Resume: You were studying الحَشْر 59:22"
- Much simpler than Activity Days — this is just a cursor, not a progress tracker

#### Verdict
Nice-to-have but not essential. Activity Days + Bookmarks provide more value. Could use if we want a simple "Continue where you left off" feature.

---

### 4.8 Preferences API

**Endpoints**: `POST /v1/preferences`, `GET /v1/preferences`, `POST /v1/preferences/bulk`

**Relevance**: ⭐ **MINOR FIT** — store user settings

Preferences are key-value pairs grouped by category (`tafsirs`, `translations`, `audio`, `theme`, `quranReaderStyles`, `reading`, `language`, `userHasCustomised`).

#### How We'd Use It
- Store the user's preferred reciter for lessons
- Store preferred translation language (EN vs Tamil)
- Store audio playback speed preference
- Syncs with Quran.com's own preferences — the user's choices carry across apps

#### Limitation
The preference groups are pre-defined (focused on Quran reading). We can't create arbitrary preference keys like `"lesson-audio-repeat-count"`. The existing groups (`audio`, `translations`, `language`) do cover some of our needs, though.

---

### 4.9 Posts API (QuranReflect)

**Endpoints**: Full CRUD for QuranReflect posts — feed, create, update, delete, save, like, report

**Relevance**: ⭐⭐ **GOOD FIT** — satisfies the "Post a reflection" hackathon requirement

#### How We'd Use It
- After completing a lesson, prompt the user: "Share what you learned about this root word"
- Auto-attach the lesson's anchor verses as the post's verse references
- Users can read others' reflections about the same verses (community learning)
- Published notes (from Notes API) also appear as QuranReflect posts

#### Scopes Needed
`post.create`, `post.read`, `post.like` (minimum)

---

## 5. Mapping User APIs to Learning State

Here's how each piece of learning state maps to the available APIs:

| Learning State | Primary API | How |
|---------------|-------------|-----|
| **Time spent studying** | Activity Days (`type=LESSON`) | POST seconds + ranges after each session |
| **Which verses studied** | Bookmarks | One ayah bookmark per studied verse |
| **Which lesson the user is on** | Collections + Bookmarks | Collection per lesson; `isReading` bookmark for current position |
| **Daily study streak** | Streaks (auto from Activity Days) | GET streaks — display as motivational widget |
| **Course progress goals** | Goals (`type=COURSE`) | Create daily/duration goals; auto-tracked via Activity Days |
| **Audio play count per phrase** | Notes (JSON in body) | Update note body with incremented counter |
| **Shuffle player session count** | Notes (JSON in body) | Update note body with session counter |
| **Recognition/mastery level** | Notes (JSON in body) | Update after quizzes/self-assessment |
| **Root words learned per verse** | Notes (JSON in body) | Store `formsStudied` array in note body |
| **User's preferred reciter/language** | Preferences | Store in `audio` / `language` groups |
| **Resume position** | Reading Sessions | Simple chapter+verse cursor |
| **User reflections on learning** | Posts (QuranReflect) | Publish learning insights as reflections |
| **Phrases grouped by mastery** | Collections | "Mastered", "Needs Review" collections |

---

## 6. What the APIs Cannot Do (Gaps)

### 6.1 No Per-Word Tracking
All APIs work at the **ayah (verse) level**, not the word level. Our course teaches specific root-word forms *within* verses. The workaround is the Notes API — store word-level data as structured JSON in the note body, attached to the verse range.

### 6.2 No Native Audio-Play Counter
There's no "increment audio plays" endpoint. We must:
1. Track play counts client-side (localStorage or in-memory)
2. Periodically sync to the Notes API

### 6.3 No Custom Data Fields
The APIs are structured around Qur'an reading. There are no arbitrary key-value stores. The Notes API body field is our escape hatch for custom structured data.

### 6.4 Streak Types Limited
The Streaks API currently only filters by `type=QURAN`. It's unclear whether `LESSON`-type Activity Days contribute to streaks. Needs clarification with the API team.

### 6.5 Preferences Are Pre-Defined
We can't create custom preference groups. App-specific settings (e.g., "number of shuffle repeats") would need to go in localStorage or Notes.

### 6.6 Static Site Limitation
Our current Jekyll site (GitHub Pages) is static. OAuth2 PKCE can work client-side, but managing tokens and making authenticated API calls from a static site adds complexity. The companion app (ADR-008) would handle this more naturally.

---

## 7. Proposed Integration Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    USER STUDIES LESSON                    │
└──────────────┬───────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │   OAuth2 PKCE Login  │  ← User authenticates once via Quran Foundation
    │   (Quran Foundation) │     Gets JWT access token
    └──────────┬──────────┘
               │
    ┌──────────▼──────────────────────────────────────────┐
    │                CONTENT APIs (read-only)              │
    │                                                      │
    │  • Verses API → fetch word-by-word text              │
    │  • Audio API → stream reciter audio + timestamps     │
    │  • Translation API → fetch translations              │
    │  • Tafsir API → optional enrichment                  │
    │  • Search API → "where else does this word appear?"  │
    │  • QuranReflect → community reflections on verses    │
    └──────────┬──────────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────────┐
    │                USER APIs (read-write)                │
    │                                                      │
    │  ON EACH STUDY SESSION:                              │
    │  ├─ Activity Days (type=LESSON)                      │
    │  │    → log seconds + ayah ranges                    │
    │  │    → auto-feeds Streaks + Goals                   │
    │  │                                                   │
    │  ├─ Bookmarks                                        │
    │  │    → mark each studied ayah                       │
    │  │    → isReading=true for current position          │
    │  │                                                   │
    │  ├─ Collections                                      │
    │  │    → group bookmarks by lesson                    │
    │  │    → "Mastered" / "Needs Review" collections      │
    │  │                                                   │
    │  └─ Notes                                            │
    │       → per-verse JSON: audioPlayCount,              │
    │         formsStudied, recognitionLevel, etc.          │
    │                                                      │
    │  ON APP OPEN:                                        │
    │  ├─ Streaks → display "🔥 15-day streak!"           │
    │  ├─ Goals → "✓ Today's goal: 85% complete"          │
    │  └─ Reading Sessions → "Resume: Al-Ḥashr 59:22"    │
    │                                                      │
    │  ON LESSON COMPLETE (optional):                      │
    │  └─ Posts → publish reflection to QuranReflect       │
    └─────────────────────────────────────────────────────┘
```

---

## 8. Authentication — OAuth2 PKCE

The Quran Foundation uses standard OAuth2 with PKCE (Proof Key for Code Exchange) for web/mobile apps.

### Setup Steps
1. **Request access** at <https://api-docs.quran.foundation/request-access> → receive `client_id`
2. **Implement PKCE flow**:
   - Generate `code_verifier` + `code_challenge`
   - Redirect user to Quran Foundation authorization URL
   - Receive authorization code → exchange for access token + refresh token
3. **Store tokens** securely (httpOnly cookies for web, secure storage for mobile)
4. **Attach to every request**: `x-auth-token: {access_token}`, `x-client-id: {client_id}`

### Scopes We'd Request
```
content
bookmark bookmark.read bookmark.create bookmark.delete
collection collection.read collection.create collection.update collection.delete
reading_session reading_session.read reading_session.create reading_session.update
activity_day activity_day.read activity_day.create activity_day.update
goal goal.read goal.create goal.update goal.delete
streak streak.read
note note.read note.create note.update note.delete
post.create post.read
preference preference.read preference.update
```

### Tutorials Available
- [OAuth 2.0 Tutorial (PKCE)](https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2)
- [Web Integration Example](https://api-docs.quran.foundation/docs/tutorials/oidc/example-integration)
- [React Native](https://api-docs.quran.foundation/docs/tutorials/oidc/mobile-apps/react-native)
- [Offline-First Sync Patterns](https://api-docs.quran.foundation/docs/tutorials/sync/getting-started)

### JavaScript SDK
A JS/TS SDK is available: <https://api-docs.quran.foundation/docs/sdk/javascript>
Covers Chapters, Verses, Audio, Resources, Juzs, Search — but **not** the User APIs yet. User API calls would be manual `fetch()` with the auth headers.

---

## 9. Judging Criteria Alignment

| Criterion (points) | How We Score |
|--------------------|-------------|
| **Impact on Quran Engagement (30)** | Core mission: help people *understand* what they recite daily. Root-word recognition transforms passive recitation into active comprehension. Strong Ramadan → post-Ramadan retention story. |
| **Product Quality & UX (20)** | Existing polished lesson design, audio immersion player, shuffle player, bilingual support. Streaks + goals add motivational UX. |
| **Technical Execution (20)** | Clean codebase, existing tooling (audio pipeline, validation scripts), OAuth2 integration, offline-first patterns. |
| **Innovation & Creativity (15)** | Unique approach: no grammar, root-word families, audio-first, phrases from daily prayers. No competitor does exactly this. |
| **Effective Use of APIs (15)** | Deep integration across both categories: Content (verses, audio, translations, tafsir, search) + User (Activity Days, Goals, Streaks, Bookmarks, Collections, Notes, Posts). Not superficial usage — APIs genuinely power the learning state. |

---

## 10. Action Items & Next Steps

### Immediate
- [ ] **Request API access** at <https://api-docs.quran.foundation/request-access>
- [ ] **Email Hackathon@quran.com** to clarify:
  - Does `type=LESSON` in Activity Days auto-generate Streaks?
  - Can Notes body contain structured JSON (no schema validation on body)?
  - Is there a rate limit for Notes API updates (frequent audio-play-count syncs)?
  - Is the `COURSE` goal type fully supported or pre-live only?

### Build Phase
- [ ] Implement OAuth2 PKCE flow (web-first, can port to Expo app later)
- [ ] Migrate Content API calls to authenticated endpoints
- [ ] Build Activity Days integration (log study time + verse ranges)
- [ ] Build Bookmarks + Collections integration (track studied phrases)
- [ ] Build Notes integration (store per-phrase learning metadata as JSON)
- [ ] Build Goals + Streaks dashboard UI
- [ ] Optional: QuranReflect post integration for end-of-lesson reflections

### Platform Decision
The current static Jekyll site can support OAuth2 PKCE client-side, but the companion app (ADR-008: Expo/React Native) would be a more natural home for authenticated user features. The hackathon could serve as the catalyst to build an initial version of the companion app.

### Submission Requirements
- [ ] Project title
- [ ] Team member names
- [ ] Short + detailed description
- [ ] Live demo or working app link
- [ ] GitHub repository
- [ ] 2–3 minute demo video
- [ ] API usage description

---

## Appendix A — OAuth2 Scopes Reference

| Scope Category | Scopes |
|----------------|--------|
| Content | `content` |
| Search | `search` |
| Bookmarks | `bookmark`, `bookmark.read`, `bookmark.create`, `bookmark.delete` |
| Collections | `collection`, `collection.read`, `collection.create`, `collection.update`, `collection.delete` |
| Reading Sessions | `reading_session`, `reading_session.read`, `reading_session.create`, `reading_session.update` |
| Preferences | `preference`, `preference.read`, `preference.update` |
| Activity Days | `activity_day`, `activity_day.read`, `activity_day.create`, `activity_day.estimate`, `activity_day.update`, `activity_day.delete` |
| Goals | `goal`, `goal.read`, `goal.estimate`, `goal.create`, `goal.update`, `goal.delete` |
| Streaks | `streak`, `streak.read`, `streak.update` |
| Notes | `note`, `note.read`, `note.create`, `note.update`, `note.delete`, `note.publish` |
| Posts | `post`, `post.read`, `post.create`, `post.update`, `post.delete`, `post.save`, `post.like` |

Full reference: <https://api-docs.quran.foundation/docs/user_related_apis_versioned/scopes>

## Appendix B — API Endpoint Quick Reference

### Content APIs (v4)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/verses/by_key/{verse_key}` | Verse text + word-by-word |
| GET | `/chapter_recitations/{reciter_id}/{chapter}` | Audio + word timestamps |
| GET | `/resources/translations` | List available translations |
| GET | `/verses/by_key/{key}?translations={id}` | Verse with translation |
| GET | `/tafsirs/{tafsir_id}/by_ayah/{verse_key}` | Tafsir for verse |
| GET | `/search?q={query}` | Full-text search |
| GET | `/quran-reflect/v1/posts/feed` | QuranReflect posts feed |

### User APIs (v1)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/activity-days` | Log study session |
| GET | `/activity-days` | Get activity history |
| POST | `/goals` | Create course goal |
| GET | `/goals/today` | Check today's goal progress |
| GET | `/streaks` | Get streak history |
| GET | `/streaks/current` | Get current streak |
| POST | `/bookmarks` | Bookmark a studied verse |
| GET | `/bookmarks` | List studied verses |
| POST | `/collections` | Create lesson collection |
| POST | `/collections/{id}/bookmarks` | Add bookmark to collection |
| POST | `/notes` | Create per-verse study note |
| PUT | `/notes/{id}` | Update study note (play count, etc.) |
| GET | `/notes/by-verse-range` | Get notes for lesson's verses |
| POST | `/reading-sessions` | Save resume position |
| POST | `/preferences` | Save user settings |
