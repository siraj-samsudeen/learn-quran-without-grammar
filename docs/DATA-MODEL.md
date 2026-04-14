# Data Model — Complete InstantDB + SQLite Schema

_Status: design spec, April 2026. Authoritative for implementation per ADR-010 + ADR-011._

## Purpose

This document defines the complete data model for the Learn Qur'an Without Grammar platform across SQLite (offline tools) and InstantDB (the live teacher + student app). It is the **authoritative reference for implementation** — when the schema file `instantdb-app/instant.schema.ts` and the SQLite builder `tools/build-quran-db.py` are written, they implement what this document specifies.

**Read these first:**

1. [FORMS-LEMMAS-ROOTS.md](FORMS-LEMMAS-ROOTS.md) — conceptual foundation (root vs lemma vs form)
2. [ADR-010](decisions/ADR-010-sqlite-data-architecture.md) + its 2026-04-14 revisions — why SQLite + InstantDB
3. [ADR-011](decisions/ADR-011-instantdb-student-experience.md) + its 2026-04-14 revisions — student experience architecture
4. **This document** — the full schema specification

---

## Entity overview

**24 entities** across 5 logical groups:

| Group | Entities | Rows at launch |
|---|---|---|
| **Layer 1: Qur'anic reference** (immutable, shared) | surahs, verses, roots, lemmas, verseWords, verseRoots | 114 / 6,236 / 1,651 / ~4,000 / ~130,000 / ~45,000 |
| **Layer 2: Identity** | users, courses, courseMembers | 1 (you) / 1 (lqwg-v1) / 1 |
| **Layer 2: Teacher curriculum + scores + selections** (per course) | rootCurriculum, forms, formLemmaBindings, sentencePatterns, lessons, verseScores, verseRootScores, selections | Scales with course |
| **Layer 2: Student state** (per student, per course) | studentCards, reviewSessions, streaks | Scales with usage |
| **Layer 2: Interaction** | issues | Sporadic |
| **Layer 2: Operations** (ops cache + audit) | audioFragments, audioJobs, llmDrafts | Grows with teacher activity |

**Layer 1** is immutable reference data built deterministically from three vendored text files (Kais Dukes morphology, Tanzil Uthmani, Saheeh International draft). Seeded into both SQLite (`tools/data/quran.db`) and InstantDB. Shared across all courses.

**Layer 2** is all mutable state: course definitions, teacher curriculum, student SRS. InstantDB is the source of truth; SQLite syncs down for offline tools.

All teacher-scoped Layer 2 rows carry a `course` link so data is scoped by course. Multiple courses are supported from day one even though the initial UX is single-course.

---

## Layer 1: Qur'anic reference

### surahs

Catalog of 114 surahs.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `surahNum` | number | unique + indexed | 1..114 |
| `nameEn` | string | | "Al-Fatihah" |
| `nameAr` | string | | "الفاتحة" |
| `verseCount` | number | | Total ayat in surah |
| `juzStart` | number | indexed | Which juz this surah starts in (Hafs standard) |

### verses

All 6,236 verses of the Qur'an. Stored **once**; no duplication across roots.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `ref` | string | unique + indexed | "59:22" — canonical human key |
| `surahNum` | number | indexed | 59 |
| `ayahNum` | number | | 22 |
| `arabicFull` | string | | Uthmani text |
| `translation` | string | | Saheeh International (draft — teacher overrides via `selections`) |
| `wordCount` | number | indexed | Pre-computed |
| `juz` | number | indexed | Pre-computed from juz boundaries (Hafs) |
| `surahName` | string | | Denormalized for display |

**Links:** `verse.surah → surahs`

### roots

1,651 Qur'anic roots (three-letter consonantal skeletons).

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `rootAr` | string | unique + indexed | "ك ب ر" — canonical human key |
| `transliteration` | string | indexed | "kabura" |
| `threeLetter` | string | | "ك ب ر" |
| `threeLetterEn` | string | | "kaf ba ra" |
| `morphKey` | string | indexed | Buckwalter root key — external joins (Quran Corpus) |
| `occurrenceCount` | number | | Total word occurrences across all verses |

### lemmas

~4,000 Kais Dukes lemmas (canonical dictionary headwords). See FORMS-LEMMAS-ROOTS.md for the definition.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `arabicCanonical` | string | indexed | "رَسُول" |
| `transliteration` | string | | "rasūl" |
| `morphKey` | string | unique + indexed | Kais Dukes LEM: tag (Buckwalter, e.g. `rasuwl`) |
| `pos` | string | indexed | "NOUN" \| "VERB" \| "PN" \| "ADJ" \| "PART" \| ... |
| `verbForm` | string | | "I".."X" \| null (non-verbs) |
| `count` | number | | Global occurrences in Qur'an |

**Links:** `lemma.root → roots` (many lemmas per root)

### verseWords

~130,000 word-segment-level morphology rows. Seeded to InstantDB per 2026-04-14 decision (enables exact word highlighting, form resolution, Root Explorer).

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `verseRef` | string | indexed | "59:22" — direct-lookup key |
| `wordIndex` | number | indexed | Word position in verse (1-based) |
| `segmentIndex` | number | | Segment within word (1-based) |
| `surface` | string | | "إِلَٰهَ" — as appears |
| `pos` | string | indexed | POS tag |
| `tense` | string | | "past" \| "imperfect" \| "imperative" \| null |
| `number` | string | | "sg" \| "du" \| "pl" \| null |
| `gender` | string | | "masc" \| "fem" \| null |
| `person` | string | | "1" \| "2" \| "3" \| null — snapshot only; NOT used to distinguish forms |
| `featuresJson` | string | | Full Kais Dukes features (raw) — for debugging + advanced queries |

**Links:**
- `verseWord.verse → verses`
- `verseWord.lemma → lemmas` (nullable — particles/pronouns have no lemma)
- `verseWord.root → roots` (nullable)

### verseRoots

~45,000 pre-aggregated junction rows: which roots appear in which verses.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `verseRef` | string | indexed | "59:22" |
| `rootAr` | string | indexed | "ك ب ر" |
| `primaryLemmaArabic` | string | | Display hint: most-frequent lemma of this root in this verse |
| `lemmaCount` | number | | Total word occurrences of this root in this verse |
| `allLemmaKeys` | string | | JSON array of `morphKey`s for multi-lemma verses |

**Links:**
- `verseRoot.verse → verses`
- `verseRoot.root → roots`
- `verseRoot.primaryLemma → lemmas`

This is the **picker's primary query target**: "for root X, list all candidate verses ranked by score."

---

## Layer 2: Identity

### users

Every person: teachers, TAs, testers, students. One identity, many course memberships (with per-course roles).

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `email` | string | unique + indexed | Auth identity (InstantDB magic link) |
| `displayName` | string | | |
| `language` | string | | "en" \| "ta" — UI preference |
| `reciterId` | string | | Preferred reciter (EveryAyah folder) |
| `dailyGoalMin` | number | | Minutes per day target |
| `newCardsPerDay` | number | | SRS drip rate, default 5 |
| `theme` | string | | "light" \| "dark" \| "auto" |
| `createdAt` | number | | |

**Note:** no top-level `role` field. Role is per-course via `courseMembers`.

### courses

Each course is a distinct curriculum: its own forms, scores, lessons, members.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `courseId` | string | unique + indexed | "lqwg-v1" — human-readable primary key |
| `title` | string | | "Learn Qur'an Without Grammar" |
| `description` | string | | |
| `visibility` | string | indexed | "public" (self-enrollable as student) \| "private" (invite-only) |
| `targetAudience` | string | | "adults, beginner Arabic" |
| `primaryLanguage` | string | | "en" |
| `supportedLanguages` | string | | JSON: `["en","ta"]` |
| `createdAt` | number | | |
| `updatedAt` | number | | |

**Links:** `course.author → users` (immutable creator; separate from owner role)

### courseMembers

Many-to-many between users and courses, carrying role.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `role` | string | indexed | "owner" \| "assistant" \| "tester" \| "student" |
| `status` | string | indexed | "active" \| "invited" \| "revoked" |
| `addedAt` | number | | |
| `revokedAt` | number | | null while active |

**Links:**
- `courseMember.user → users`
- `courseMember.course → courses`
- `courseMember.addedBy → users` (owner who granted the role; or self for public student self-enroll)

**Unique constraint (application-enforced):** one active membership per (user, course).

**Role semantics:**
- **owner**: full control; can publish lessons, add/remove members. Course-wide write. Multiple owners allowed (co-teaching).
- **assistant** (TA): course-wide write on curriculum/scores/selections; cannot publish; cannot modify members.
- **tester**: reads lessons once `phaseReview ≥ "ready"`; writes only own SRS state; flags issues tagged as tester.
- **student**: reads only `phasePublished = "done"` lessons; writes only own SRS state; flags issues tagged as student.

---

## Layer 2: Teacher curriculum (per course)

### rootCurriculum

Teacher metadata per root, per course.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `rootAr` | string | indexed | |
| `introducedInLesson` | number | | Which lesson first teaches this root in this course |
| `categoryLabel` | string | | Teacher's human label |
| `gloss` | string | | "messenger-ness / sending" |
| `notes` | string | | Teacher prose |
| `updatedAt` | number | | |

**Links:**
- `rootCurriculum.course → courses`
- `rootCurriculum.root → roots`
- `rootCurriculum.updatedBy → users`

**Unique constraint:** (course, root)

### forms

Teacher's pedagogical word-shapes. Per-course. See [FORMS-LEMMAS-ROOTS.md](FORMS-LEMMAS-ROOTS.md) §9 for formal definition.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `arabicCanonical` | string | indexed | "رَسُول" — what students see |
| `transliteration` | string | | "rasūl" |
| `categoryLabel` | string | | "Noun (plural)" — human label |
| `gloss` | string | | "messenger" |
| `taughtInLesson` | number | indexed | null = not yet assigned |
| `taughtRole` | string | | "anchor" \| "learning" \| null |
| `notes` | string | | |
| `sortOrder` | number | | Display order within a root in the picker |
| `updatedAt` | number | | |

**Links:**
- `form.course → courses`
- `form.root → roots`
- `form.updatedBy → users`

**Unique constraint:** (course, root, arabicCanonical)

### formLemmaBindings

How each form binds to one or more lemmas + feature filters.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `tenseFilter` | string | | "past" \| "imperfect" \| "imperative" \| "all" \| null (ignore tense) |
| `numberFilter` | string | | "sg" \| "du" \| "pl" \| "all" \| null |
| `genderFilter` | string | | "masc" \| "fem" \| "all" \| null |

**Links:**
- `binding.form → forms`
- `binding.lemma → lemmas`

**Constraint:** bindings for the same lemma within a form must be **disjoint** (no overlapping feature filters) — enforced in the picker UI.

### sentencePatterns

Per-root sentence patterns the teacher wants to highlight (e.g., "لَا إِلَٰهَ إِلَّا").

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `patternAr` | string | | "لَا إِلَٰهَ إِلَّا" |
| `gloss` | string | | "there is no god but..." |
| `note` | string | | |
| `updatedAt` | number | | |

**Links:**
- `sentencePattern.course → courses`
- `sentencePattern.root → roots`
- `sentencePattern.updatedBy → users`

### lessons

Lesson metadata + phase tracking.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `lessonNumber` | number | indexed | 1, 2, 3, ... (unique per course) |
| `slug` | string | | "lesson-01-allahu-akbar" |
| `title` | string | | "Allāhu Akbar" |
| `seedArabic` | string | | Adhan/salah phrase |
| `seedEnglish` | string | | "Allah is Greater" |
| `currentPhase` | string | indexed | One of the phase names below |
| `phaseScoring` | string | | "done" \| "ready" \| "wip" \| "blocked" |
| `phasePicking` | string | | same enum |
| `phaseWriting` | string | | same |
| `phaseTamil` | string | | same |
| `phaseAudio` | string | | same |
| `phaseReview` | string | indexed | same — **tester visibility gate**: status ≥ "ready" unlocks for testers |
| `phasePublished` | string | indexed | same — **student visibility gate**: status = "done" unlocks for public students |
| `notes` | string | | |
| `updatedAt` | number | | |

**Links:**
- `lesson.course → courses`
- `lesson.updatedBy → users`

**Unique constraint:** (course, lessonNumber)

---

## Layer 2: Scores (per course)

### verseScores

Verse-level scores — properties of the verse itself, same regardless of which root you're teaching.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `story` | number | | 0–10 |
| `storyReason` | string | | |
| `familiarity` | number | | 0–10 |
| `familiarityReason` | string | | |
| `fragment` | boolean | indexed | Is verse too long to use whole? |
| `updatedAt` | number | | |

**Links:**
- `verseScore.course → courses`
- `verseScore.verse → verses`
- `verseScore.updatedBy → users`

**Unique constraint:** (course, verse)

### verseRootScores

Scores specific to a (verse, root) pair within a course.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `teachingFit` | number | | 0–10 |
| `teachingFitReason` | string | | |
| `formFreq` | number | | Computed from lemma frequency |
| `formDominance` | number | | Is this root central or incidental? |
| `lengthScore` | number | | Computed from wordCount |
| `curriculumScore` | number | | Bonus for adhan/salah connection |
| `starBonus` | number | | Teacher override |
| `baseScore` | number | | Sum of dimensions |
| `finalScore` | number | indexed | `base × fragment_multiplier` |
| `scoreNotes` | string | | Teacher/LLM remark |
| `updatedAt` | number | | |

**Links:**
- `verseRootScore.course → courses`
- `verseRootScore.verse → verses`
- `verseRootScore.root → roots`
- `verseRootScore.updatedBy → users`

**Unique constraint:** (course, verse, root)

---

## Layer 2: Selections (per lesson)

### selections

Which verses go into which lesson, with the form they teach.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `lessonNumber` | number | indexed | Denormalized for fast queries |
| `section` | string | indexed | "learning" \| "recall" \| "pipeline" \| "none" |
| `role` | string | | "anchor" \| "learning" \| "review" \| null |
| `roleOrder` | number | | Display order within the lesson |
| `remark` | string | | Teacher's note |
| `arabicFragment` | string | | Teacher-trimmed portion (for audio) |
| `translationOverride` | string | | Overrides default translation |
| `reciter` | string | | EveryAyah folder name |
| `audioFragment` | string | | "#t=0,7" timestamp |
| `crossRoots` | string | | JSON array of other roots this verse reinforces |
| `updatedAt` | number | | |

**Links:**
- `selection.course → courses`
- `selection.lesson → lessons`
- `selection.verse → verses`
- `selection.root → roots`
- `selection.form → forms` (nullable — null while verse is in `pipeline`)
- `selection.updatedBy → users`

**Unique constraint:** (course, lesson, verse, root)

---

## Layer 2: Student state (per student, per course)

### studentCards

SRS card state per (user, selection).

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `verseRef` | string | indexed | "59:22" |
| `rootAr` | string | indexed | |
| `stability` | number | | FSRS: how well memorized |
| `difficulty` | number | | FSRS: how hard for this user |
| `due` | string | indexed | ISO date: next review |
| `reps` | number | | Total reviews done |
| `lapses` | number | | Times forgotten after learning |
| `state` | string | indexed | "new" \| "learning" \| "review" \| "relearning" |
| `lastMode` | string | | "active" \| "background" |
| `lastReviewedAt` | number | | |
| `memberRole` | string | indexed | Snapshot at creation: "tester" \| "student" |
| `isTesterRun` | boolean | indexed | Computed: `memberRole === "tester"` |

**Links:**
- `studentCard.user → users`
- `studentCard.course → courses`
- `studentCard.lesson → lessons`
- `studentCard.selection → selections`
- `studentCard.form → forms`

**Unique constraint:** (user, selection)

### reviewSessions

A single study session.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `mode` | string | indexed | "active" \| "background" |
| `startedAt` | number | indexed | |
| `endedAt` | number | | |
| `cardsReviewed` | number | | |
| `minutesStudied` | number | | |
| `newCardsIntroduced` | number | | |
| `isTesterRun` | boolean | indexed | |

**Links:**
- `reviewSession.user → users`
- `reviewSession.course → courses`
- `reviewSession.lesson → lessons` (nullable — mixed review has no single lesson)

### streaks

Per-student per-course streak.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `currentStreak` | number | | Days |
| `longestStreak` | number | | Days |
| `lastStudyDate` | string | | ISO date |
| `isTesterRun` | boolean | indexed | |

**Links:**
- `streak.user → users`
- `streak.course → courses`

**Unique constraint:** (user, course)

---

## Layer 2: Interaction

### issues

Flags from testers or students to teachers.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `verseRef` | string | indexed | |
| `lessonNumber` | number | indexed | |
| `type` | string | indexed | "Arabic" \| "Eng" \| "Audio" \| "Hook" \| "Other" |
| `note` | string | | |
| `reporterRole` | string | indexed | Snapshot at creation: "tester" \| "student" |
| `status` | string | indexed | "open" \| "resolved" \| "dismissed" |
| `createdAt` | number | | |
| `resolvedAt` | number | | |
| `teacherReply` | string | | |

**Links:**
- `issue.reporter → users`
- `issue.course → courses`
- `issue.verse → verses`
- `issue.resolvedBy → users` (nullable)

---

## Layer 2: Operations

Tables that capture operational state: computed audio timings (cached per reciter), background build jobs (visibility into TTS/audio queues), and LLM draft + teacher-correction audit trail (training signal for future scoring passes).

### audioFragments

Cached word-level audio timings per (verse, reciter, word-range). Decoupled from `selections` so switching a selection's reciter never discards previously computed timings — the old entry stays, and the new entry is computed (or looked up) on demand. Populated by [tools/auto-timestamps.py](../tools/auto-timestamps.py) or silence-detect fallback ([find-audio-fragment.py](../tools/find-audio-fragment.py)), surfaced via `audioJobs`.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `verseRef` | string | indexed | "29:45" |
| `reciter` | string | indexed | EveryAyah folder, e.g. "Abdul_Basit_Murattal_192kbps" |
| `startWord` | number | indexed | 1-based word index into the verse |
| `endWord` | number | | Inclusive; = verse.wordCount for full ayah |
| `startMs` | number | | Cue-in, milliseconds from audio start |
| `endMs` | number | | Cue-out |
| `source` | string | | "api" \| "silence-detect" \| "manual" |
| `confidence` | number | | 0–1; API = 1.0, silence-detect ~0.7, manual = 1.0 |
| `computedAt` | number | | |

**Links:**
- `audioFragment.verse → verses`

**Unique constraint:** (verseRef, reciter, startWord, endWord) — full-ayah fragments share a canonical row per reciter regardless of which course/selection references them.

**Why no `course` link:** timings are a property of (verse, reciter), not a course choice. A fragment computed for one course's selection is automatically reusable by any other course or lesson that picks the same word range.

### audioJobs

Queue + status surface for background audio builds (TTS batch, fragment timestamping, full-lesson audio assembly). Replaces the "blind shell script" feel of [rebuild-lesson-audio.sh](../tools/rebuild-lesson-audio.sh) — teacher sees queued/running/failed per row instead of waiting for terminal output.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `jobType` | string | indexed | "tts" \| "fragment_timing" \| "lesson_assembly" |
| `status` | string | indexed | "queued" \| "running" \| "done" \| "failed" |
| `target` | string | | Human label, e.g. "Lesson 3 — full audio" or "TTS Tamil sentence #4" |
| `params` | string | | JSON payload (verseRef, reciter, text, lang, etc.) |
| `progress` | number | | 0–100 or count `done/total` encoded |
| `errorMessage` | string | | Populated when status = "failed" |
| `logUrl` | string | | Optional link to full log (S3 / local path) |
| `startedAt` | number | | |
| `completedAt` | number | | null while queued/running |

**Links:**
- `audioJob.course → courses`
- `audioJob.lesson → lessons` (nullable — some jobs are course-wide)
- `audioJob.triggeredBy → users`

**Retention:** keep last 30 days of `done` jobs; `failed` jobs stay until manually dismissed so the teacher can triage.

### llmDrafts

Every piece of text drafted by the LLM (score reasons, hook text, translations, glosses, category labels) is logged here. When the teacher edits and saves, the edited text lands in `acceptedText` and `acceptedAt` fires — producing a `(draft, accepted)` pair. Future LLM scoring passes use these pairs as few-shot examples so the model progressively sounds like the teacher instead of generic.

| Attribute | Type | Index | Notes |
|---|---|---|---|
| `draftType` | string | indexed | "score_reason" \| "hook" \| "translation" \| "root_gloss" \| "form_gloss" \| "pattern_gloss" |
| `targetAttribute` | string | | The field this drafts, e.g. "teachingFitReason", "translationOverride", "gloss" |
| `draftText` | string | | Raw LLM output |
| `acceptedText` | string | | Final teacher-approved version; null while unreviewed |
| `rejected` | boolean | indexed | True if teacher discarded the draft entirely (wrote their own without using it) |
| `model` | string | | "claude-opus-4-6" etc. |
| `promptHash` | string | indexed | SHA of the prompt used; lets us group drafts from the same prompt version |
| `contextJson` | string | | JSON: surrounding signals the LLM was given (verse text, root, scores, teacher rules) — reproducibility |
| `createdAt` | number | indexed | |
| `acceptedAt` | number | | null while unreviewed |

**Links:**
- `llmDraft.course → courses`
- `llmDraft.verseScore → verseScores` (nullable)
- `llmDraft.verseRootScore → verseRootScores` (nullable)
- `llmDraft.selection → selections` (nullable)
- `llmDraft.form → forms` (nullable)
- `llmDraft.rootCurriculum → rootCurriculum` (nullable)
- `llmDraft.sentencePattern → sentencePatterns` (nullable)
- `llmDraft.acceptedBy → users` (nullable)

**Invariant (application-enforced):** exactly one of the target links is non-null per draft.

**Training-signal queries:**

```ts
// Recent accepted edits on teachingFitReason for Lesson 3 — few-shot examples
db.useQuery({
  llmDrafts: {
    $: {
      where: {
        "course.courseId": "lqwg-v1",
        draftType: "score_reason",
        targetAttribute: "teachingFitReason",
        rejected: false,
        acceptedAt: { $not: null },
      },
      order: { acceptedAt: "desc" },
      limit: 20,
    },
    verseRootScore: { verse: { }, root: { } },
  },
});
```

```ts
// Which prompt versions produce the most rejected drafts? (Prompt-quality regression signal)
db.useQuery({
  llmDrafts: {
    $: { where: { "course.courseId": "lqwg-v1", rejected: true } },
  },
});
// Aggregate by promptHash client-side.
```

---

## Permissions model

Authoritative InstantDB perms will be in `instantdb-app/instant.perms.ts`. Sketch (InstantDB rule DSL semantics):

```
// Role predicates (evaluated via active courseMembers):
isOwner(course)     = exists active membership where role = "owner"
isAssistant(course) = exists active membership where role in ["owner", "assistant"]
isTester(course)    = exists active membership where role in ["owner", "assistant", "tester"]
isMember(course)    = exists any active membership

// Layer 1 (shared reference data):
Layer 1 entities:
  read  → any authenticated user
  write → admin token only (seed script)

// Layer 2 identity:
users:
  read  → own + any user in a shared course (for displayName)
  write → own profile only
courses:
  read  → isMember
  write → isOwner
courseMembers:
  read  → isMember (see co-members)
  write → isOwner (invite/revoke)

// Layer 2 teacher curriculum + scores + selections (per course):
rootCurriculum, forms, formLemmaBindings, sentencePatterns, verseScores, verseRootScores, selections:
  read  → isMember
  write → isAssistant

lessons:
  read:
    isAssistant                                               → always
    isTester (role=tester, or owner/assistant)                → where phaseReview ∈ ["ready","wip","done"]
    student                                                   → where phasePublished = "done"
  write → isAssistant
  special: publish (phasePublished → "done") → isOwner only

// Layer 2 student state:
studentCards, reviewSessions, streaks:
  read  → own record, or isOwner of the course (aggregate only, filter by isTesterRun as needed)
  write → own record only

// Layer 2 interaction:
issues:
  create → isTester or student
  read   → reporter + isAssistant of the course
  write  → isAssistant (resolve / reply)

// Layer 2 operations:
audioFragments:
  read  → any authenticated user (timings are not sensitive; reused across courses)
  write → isAssistant of any course that triggered the compute, or admin token (batch seeds)
audioJobs:
  read  → isAssistant of the course
  write → isAssistant (enqueue); runner updates status via admin token
llmDrafts:
  read  → isAssistant of the course
  write → isAssistant (accept / reject / edit); create → isAssistant or admin token (batch LLM pass)
```

---

## Query patterns

### Picker: load candidates for Lesson 3 (root ر س ل, course lqwg-v1)

```ts
db.useQuery({
  verseRoots: {
    $: { where: { rootAr: "ر س ل" } },
    verse: { },
    primaryLemma: { },
    root: { },
  },
  verseRootScores: {
    $: { where: { "course.courseId": "lqwg-v1", "root.rootAr": "ر س ل" } },
  },
  verseScores: {
    $: { where: { "course.courseId": "lqwg-v1" } },
  },
  selections: {
    $: { where: { "course.courseId": "lqwg-v1", lessonNumber: 3 } },
    form: { },
  },
  forms: {
    $: { where: { "course.courseId": "lqwg-v1", "root.rootAr": "ر س ل" } },
    bindings: { lemma: { } },
  },
});
// Client joins in memory: verseRoots × verseScores × verseRootScores × selections × forms.
```

### Picker: inline score edit (teacher changes story score for verse 59:22)

```ts
db.transact(
  tx.verseScores[scoreId].update({ story: 9, updatedAt: Date.now() })
    .link({ updatedBy: currentUserId })
);
```

### Student SRS: due cards for today

```ts
db.useQuery({
  studentCards: {
    $: {
      where: {
        "user.id": currentUserId,
        "course.courseId": "lqwg-v1",
        due: { $lte: todayIso },
        state: { $in: ["new", "learning", "review", "relearning"] },
      },
      order: { due: "asc" },
      limit: 50,
    },
    selection: {
      verse: { },
      form: { bindings: { lemma: { } } },
    },
  },
});
```

### Student card: highlight form positions in verse 59:22

```ts
db.useQuery({
  verseWords: {
    $: { where: { verseRef: "59:22" } },
    lemma: { },
  },
});
// Client joins verseWords against card.form.bindings to pick word positions to bold.
```

### Owner dashboard: course retention excluding testers

```ts
db.useQuery({
  studentCards: {
    $: {
      where: {
        "course.courseId": "lqwg-v1",
        isTesterRun: false,
        state: "review",
      },
    },
  },
});
// Aggregate client-side.
```

---

## Seed order (build + seed dependencies)

`build-quran-db.py` builds SQLite from raw files. `seed-instantdb-from-sqlite.py` then pushes to InstantDB in this order:

**Layer 1** (order matters due to links):
1. `surahs`
2. `verses` (requires surahs)
3. `roots`
4. `lemmas` (requires roots)
5. `verseWords` (requires verses, lemmas, roots)
6. `verseRoots` (requires verses, roots, lemmas)

**Layer 2 identity:**
7. `users` (at least the course author — you)
8. `courses` (requires users as author)
9. `courseMembers` (requires users, courses)

**Layer 2 curriculum** (migrated from existing 10 root JSONs):
10. `rootCurriculum`
11. `forms`
12. `formLemmaBindings` (requires forms, lemmas)
13. `sentencePatterns`
14. `lessons`

**Layer 2 scores and selections** (migrated from JSONs):
15. `verseScores`
16. `verseRootScores`
17. `selections` (requires lessons, verses, roots, forms)

**Student-scoped tables** (`studentCards`, `reviewSessions`, `streaks`) start empty; they grow via user interaction.

---

## SQLite ↔ InstantDB parity

Both stores carry the same logical schema. Surface differences:

| Aspect | SQLite | InstantDB |
|---|---|---|
| Primary keys | Composite natural keys (e.g. `(surah_num, ayah_num)`) | UUIDs; human keys as indexed+unique fields |
| Relations | Foreign keys on columns | Links between entity pairs |
| Queries | SQL JOINs, views | Nested reactive queries |
| Writes | Direct INSERT/UPDATE | Transactions via `@instantdb/core` |
| Sync | None (built offline, read-only source) | Real-time pub/sub to connected clients |

**Sync model:**

- SQLite Layer 1 is built once from raw files. Never changes outside of morphology updates.
- SQLite Layer 2 is periodically synced from InstantDB via `sync-from-cloud.py` (for offline Python tools that need full data access).
- Bulk LLM scoring writes land via `sync-to-cloud.py` (SQLite → InstantDB), using batched transactions to respect InstantDB rate limits.

---

## Multi-course implications (UX deferred, schema ready)

The schema supports multiple courses per teacher and multiple courses per student from day one. UX in v1 hides the course concept using a default course (`lqwg-v1`).

**Adding a second course later (no schema change):**
1. Owner creates a new `courses` row.
2. Owner creates new `courseMembers` for relevant users.
3. Optional: auto-seed default forms from Layer 1 morphology per FORMS-LEMMAS-ROOTS.md §10.2.
4. Teacher curates forms, selections, lessons as usual.

**Multi-teacher** (multiple owners per course) is immediately supported: multiple `courseMembers` rows with `role="owner"`.

**Cross-course data** (e.g., "show me all verses for root X across every course"): trivial InstantDB query without course filter.

---

## Indexes summary

All indexes listed above in the per-entity tables. Grouped by purpose:

- **Identity lookup**: users.email, courses.courseId, courseMembers.role+status
- **Reference lookup by natural key**: verses.ref, roots.rootAr, lemmas.morphKey, surahs.surahNum
- **Picker hot path**: verseRoots.rootAr, verseRootScores.finalScore, forms.taughtInLesson, selections.section + lessonNumber
- **Student SRS hot path**: studentCards.due + state, studentCards.memberRole / isTesterRun
- **Phase gates**: lessons.phaseReview, lessons.phasePublished
- **Issue triage**: issues.status + reporterRole

---

## Open questions (documented for future sessions)

- **Form merges across courses:** When a teacher creates a new course, can they import forms from an existing course? (Deferred; likely a copy+edit flow.)
- **Root Explorer uncurated lemmas:** How to display lemmas a student encounters in a surah that aren't in any course form yet? See [FORMS-LEMMAS-ROOTS.md §14 Q3](FORMS-LEMMAS-ROOTS.md).
- **Bulk data-entry patterns:** LLM scoring writes thousands of rows at once. InstantDB rate limits mean `sync-to-cloud.py` needs batched transactions with retry. Pattern TBD at implementation.
- **Course-level analytics:** Aggregation queries for "Lesson 5 retention excluding testers" — resolved via `isTesterRun` filter; UI for owner dashboard TBD.
- **Tester phase threshold:** Currently testers see lessons from `phaseReview = "ready"`. If teachers want earlier access (e.g., Tamil review), temporary role promotion to `assistant` is the mechanism.

---

_Maintainers: update this document whenever entities, attributes, links, or permissions change. Treat as authoritative — `instant.schema.ts` and `build-quran-db.py` implement what this document specifies._
