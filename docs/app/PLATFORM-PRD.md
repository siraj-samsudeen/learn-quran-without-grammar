# Qur'anic Root Learning Platform — PRD & Roadmap

> **Purpose**: Single reference document for the platform vision, architecture decisions, and phased execution plan. Read this at the start of any new session.
>
> **Status**: Living document — updated as phases complete and learnings emerge.
>
> **Last Updated**: July 2025

---

## Table of Contents

1. [Mission & Problem](#1-mission--problem)
2. [Core Insight: Why Roots?](#2-core-insight-why-roots)
3. [The Glossika-Inspired Method](#3-the-glossika-inspired-method)
4. [User Personas](#4-user-personas)
5. [Product: Three Layers](#5-product-three-layers)
6. [Architecture Decisions](#6-architecture-decisions)
7. [Teacher Content Model](#7-teacher-content-model)
8. [Distribution & Sustainability](#8-distribution--sustainability)
9. [Hackathon Alignment](#9-hackathon-alignment)
10. [What This Is NOT](#10-what-this-is-not)
11. [Phased Roadmap](#11-phased-roadmap)
12. [Future Ideas (Post-Hackathon)](#12-future-ideas-post-hackathon)
13. [Open Questions](#13-open-questions)

---

## 1. Mission & Problem

**Problem**: Millions of Muslims recite the Qur'an daily in Arabic without understanding what they're saying. Existing solutions either require years of grammar study or offer shallow word-list memorization that doesn't stick.

**Mission**: Build a platform where anyone can learn to *recognize and understand* Qur'anic Arabic through root-word connections and audio immersion — no grammar terminology, no memorization pressure. The brain absorbs naturally through repeated listening.

**For teachers**: Provide infrastructure so that any teacher of Qur'anic Arabic can bring their curriculum and give their students a powerful study companion — with root analysis, audio immersion, and progress tracking built in.

---

## 2. Core Insight: Why Roots?

Arabic is a **root-based language**. Most words derive from a 3-letter root that carries a core meaning. For example:

- Root **كبر** (greatness): أَكْبَر (greatest), كَبِير (great), كُبْرَى (greatest fem.), كِبْرِيَاء (grandeur)
- Root **إله** (god/deity): إِلَٰه (god), آلِهَة (gods), اللّٰه (Allah)

Once you know a root, you can recognize its forms across the entire Qur'an. This is the **universal organizing principle** for Arabic — it works regardless of which teacher's methodology you follow.

**Key platform capability**: Given any Arabic sentence, the system can automatically identify each word's root and link to other Qur'anic verses containing that root. Even if a teacher doesn't explicitly teach roots, the platform enriches their content with root connections.

---

## 3. The Glossika-Inspired Method

Based on deep research of Glossika's mass-sentence audio immersion approach (see `docs/app/research-glossika.md`), the app offers **two study modes** sharing one SRS engine:

### Background Listening (Passive Mode)
- Audio plays hands-free: Arabic recitation → pause → translation
- Loop, shuffle, repeat — no screen interaction needed
- Ideal for commuting, walking, chores, or playing in the background
- Counts as SRS reps but with **shorter retention** (brain absorbs less without active engagement)

### Active Review (Focused Mode)
- User sits with screen, reviews cards one by one
- Sees Arabic text → hears recitation → optionally reveals translation
- Rates difficulty: "Know it ✓" / "Almost ○" / "Don't know ✗"
- FSRS schedules next review based on rating
- Root words highlighted within each sentence — tap to explore

### SRS Design (Simple)

Per card (one card = one sentence from any source):

| Field | Type | Purpose |
|---|---|---|
| `stability` | float | FSRS: how well-memorized |
| `difficulty` | float | FSRS: how hard for this user |
| `due` | date | When to review next |
| `reps` | int | Total reviews done |
| `lapses` | int | Times forgotten after learning |
| `state` | enum | new / learning / review / relearning |
| `last_mode` | enum | active / background |

Both modes feed the same engine. Background listening reps use a shorter retention multiplier (Glossika finding: listen-only decays faster → review sooner).

---

## 4. User Personas

### Self-Directed Learner
> "I've memorized Surah At-Takathur. I want to understand what I'm reciting."

- Opens **Root Explorer** → selects a surah they know
- Taps a word → sees its root → sees other verses with the same root
- Selects verses → studies them in Background Listening or Active Review
- Bookmarks verses into personal collections

### Guided Student
> "My teacher assigned Lesson 5. I need to study before next class."

- Opens their teacher's course → goes to the assigned lesson
- Studies the teacher's curated sentences with explanations
- Each sentence auto-linked to roots (even if teacher didn't explicitly teach roots)
- Discovers cross-lesson connections: "This word shares a root with Lesson 2!"

### Teacher
> "I teach 200 students. I want them to study between classes using audio immersion."

- Creates a course as YAML (or uses a web form, later)
- Provides: Arabic sentences + translations + explanations
- Platform auto-generates: root analysis, audio, SRS cards, cross-references
- Students subscribe to the course in the app
- (Future) Teacher sees analytics: where students struggle, completion rates

---

## 5. Product: Three Layers

### Layer 1: The Engine (universal, built once)

| Component | Description |
|---|---|
| **Root Intelligence** | Given any Arabic sentence, identify each word's root and link to other Qur'anic occurrences. Built incrementally — start with roots in current lessons, expand as content grows. |
| **Glossika Dual Player** | Background Listening + Active Review modes, sharing one SRS engine. |
| **FSRS Engine** | Lightweight spaced repetition running on-device in SQLite. ~7 fields per card. |
| **Audio Pipeline** | Arabic: QF Audio API for Qur'anic verses, TTS for non-Qur'anic. Translations: edge-tts in any supported language. |

### Layer 2: The Content Platform (multi-teacher)

| Component | Description |
|---|---|
| **Course Format** | YAML/JSON defining lessons → sentences → translations + explanations. |
| **Auto-Enrichment** | Platform adds root links, generates audio, creates SRS cards from teacher's minimal input. |
| **Content Packs** | Courses published as files (GitHub, URL, or platform). Students subscribe in the app. |

### Layer 3: Qur'anic Ecosystem (QF APIs)

| Component | Description |
|---|---|
| **Content APIs** | Verse text (word-by-word), audio (reciter + timestamps), translations, search, tafsir. |
| **User APIs** | Activity Days, Streaks, Goals, Bookmarks, Collections, Notes (SRS state sync), Posts, Preferences. |
| **Auth** | OAuth2 PKCE via Quran Foundation — single sign-on across the Qur'anic ecosystem. |

---

## 6. Architecture Decisions

### ADR-009: Drop Convex, Use SQLite Local + QF APIs Cloud

**Decision**: Remove the Convex backend entirely. Use on-device SQLite as the primary data store. Sync user state to Quran Foundation User APIs when online.

**Context**: The Convex prototype (playground/) was built for SRS card review tracking with real-time sync. The new platform vision changes the requirements:
- SRS runs on-device (FSRS in SQLite) — no need for cloud SRS computation
- Motivational tracking (streaks, goals, study time) maps directly to QF User APIs
- Study state (bookmarks, collections, notes) maps to QF User APIs
- Offline-first is achieved with SQLite + sync queue → QF APIs (same pattern as Convex prototype, simpler target)

**What we lose**: Real-time cross-device sync via WebSocket subscriptions, append-only event log in the cloud.

**What we gain**: No external backend to deploy/pay for, deep Quran.com ecosystem integration, maximum hackathon API usage score, one fewer auth system.

**Offline pattern**:
1. All writes go to local SQLite first (instant, works offline)
2. Sync queue accumulates pending API calls
3. When online, flush queue to QF APIs (Activity Days, Notes, Bookmarks, etc.)
4. On new device, pull from QF APIs → seed local SQLite

### ADR-010: Root Database — Incremental, Not Whole-Quran

**Decision**: Build root data incrementally as content is added, not as a whole-Quran download upfront.

**Context**: The existing `docs/roots/ilah.json` and `docs/roots/kabura.json` already contain the form → verse mapping for Lesson 1's roots. As lessons are added, new root JSONs are created. The Root Explorer feature initially only works for roots that have been inventoried.

**Phase 1**: Root data for Lesson 1's roots (already exists).
**Phase 2**: Root data for Lesson 2's roots (created during lesson authoring).
**Later**: Consider a full Quran root database (from corpus.quran.com) to enable exploration of ANY word. But this is an enhancement, not a prerequisite.

### ADR-011: Content Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXPO / REACT NATIVE APP                     │
├─────────────────────────────────────────────────────────────────┤
│  ON-DEVICE (offline-first)                                      │
│  ┌─────────────┐  ┌────────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Root Data    │  │ SRS State  │  │ Content  │  │ Sync      │  │
│  │ (per-lesson  │  │ (FSRS in   │  │ Cache    │  │ Queue     │  │
│  │  JSONs,      │  │  SQLite)   │  │ (SQLite) │  │ (SQLite)  │  │
│  │  incremental)│  │            │  │          │  │           │  │
│  └──────────────┘  └────────────┘  └──────────┘  └───────────┘  │
│                                                                 │
│  APP SCREENS                                                    │
│  🏠 Home — streak, goal, continue studying                      │
│  📚 My Courses — teacher-curated guided lessons                 │
│  🔍 Root Explorer — tap word → root → related verses            │
│  🎧 Background Listening — hands-free audio loop                │
│  📝 Active Review — SRS cards with difficulty rating            │
│  📂 My Collections — bookmarked verses, study lists             │
│  ⚙️  Settings — reciter, language, daily goal                    │
└────────────┬──────────────────────────────────┬─────────────────┘
             │ READ                             │ SYNC
             ▼                                  ▼
  ┌──────────────────────┐        ┌──────────────────────────┐
  │  QF Content APIs     │        │  QF User APIs            │
  │  Verses · Audio      │        │  Activity Days · Streaks │
  │  Translations        │        │  Goals · Bookmarks       │
  │  Search · Tafsir     │        │  Collections · Notes     │
  │  QuranReflect        │        │  Posts · Preferences     │
  └──────────────────────┘        └──────────────────────────┘
```

---

## 7. Teacher Content Model

### Minimum Viable Input

A teacher provides a YAML file with sentences, translations, and optional explanations:

```yaml
course:
  id: "learn-quran-without-grammar"
  name: "Learn Qur'an Without Grammar"
  teacher: "Siraj Samsudeen"
  languages: ["en", "ta"]       # translations available
  description: "Root-word recognition through audio immersion"

lessons:
  - id: "lesson-01"
    name: "Allahu Akbar"
    roots: ["إله", "كبر"]       # roots covered in this lesson

    sentences:
      - id: "anchor-ilah"
        arabic: "هُوَ ٱللَّهُ ٱلَّذِى لَآ إِلَـٰهَ إِلَّا هُوَ"
        ref: "59:22"            # Quranic reference
        reciter: "Hani_Rifai_192kbps"
        translations:
          en: "He is Allah — there is no god but He"
          ta: "அவன் அல்லாஹ் — அவனைத் தவிர இறைவன் இல்லை"
        explanation:
          en: "This is from Surah Al-Hashr. The word **ilah** means god..."
          ta: "இது சூரா அல்-ஹஷ்ரிலிருந்து..."

      - id: "teaching-phrase-01"
        arabic: "هُوَ كَبِيرٌ"
        type: "teaching"        # non-Quranic teaching phrase
        translations:
          en: "He is great"
          ta: "அவன் பெரியவன்"
```

### What the Platform Auto-Generates

| From teacher input | Platform generates |
|---|---|
| `ref: "59:22"` | Fetches word-by-word text from QF Verses API |
| `ref: "59:22"` + `reciter` | Streams audio from QF Audio API / EveryAyah CDN |
| `translations.en` | Generates English TTS audio via edge-tts |
| `translations.ta` | Generates Tamil TTS audio via edge-tts |
| `roots: ["إله"]` | Links to root data (forms, other verses) |
| Each sentence | Creates an SRS card (new state, no reviews yet) |
| `type: "teaching"` | Generates Arabic TTS (since no Quranic audio exists) |

### Compatibility with Existing Content

The existing `tools/lesson-content/lesson-01.yaml` and `playground-app/assets/lesson-01.json` contain all of Lesson 1's content in a rich format. The new course YAML format should be designed so that:
1. Lesson 1's existing content can be represented in it
2. A simpler teacher could provide less (no hooks, no quiz, just sentences)
3. The app gracefully handles both rich and minimal content

---

## 8. Distribution & Sustainability

### Distribution: Content Pack Model (like podcast apps)

One universal app, many content sources:

- Teacher publishes a course YAML (on GitHub, their website, or the platform)
- Student adds the course URL in the app (like subscribing to a podcast feed)
- App downloads content, auto-enriches with root data, generates audio
- Students don't need a different app per teacher

**For MVP**: One bundled course (Lesson 1). Course subscription by URL is a later feature.

### Sustainability

| Who | Free Tier | Paid Tier |
|---|---|---|
| **Students** | Always free — full app, all public courses | — |
| **Teachers** | Publish courses, modest student limit | More students, analytics, custom branding |
| **Institutions** | — | Self-hosted option, white-label, LMS integration |
| **Community** | Donate / sadaqah | Sponsor access for specific regions |

**Principle**: Never paywall students' access to Qur'anic learning. Teachers who monetize their teaching contribute to platform sustainability.

---

## 9. Hackathon Alignment

### Quran Foundation Hackathon Requirements

| Requirement | How We Meet It |
|---|---|
| Theme: "Strengthen people's connection with the Qur'an" | Root exploration transforms recitation into comprehension |
| Must use ≥1 Content API | Verses (words), Audio, Translations, Search, Tafsir, QuranReflect |
| Must use ≥1 User API | Activity Days, Streaks, Goals, Bookmarks, Collections, Notes, Posts, Preferences |
| Deadline: End of Shawwal 1447 | Phased roadmap targets hackathon-ready by Phase 4 |

### Developer Disclaimers Alignment

| Guideline | Our Approach |
|---|---|
| Scholarly alignment | Root data from corpus.quran.com (academic source). Qur'anic text from QF API (verified). No interpretation — we show meanings, not rulings. Platform enables teachers (who are the scholars) to curate content. |
| Verified sources / copyrights | All Qur'anic text via QF API (single source of truth, stays current). Audio from licensed reciters via EveryAyah/QF Audio API. Translations from QF Translation API. |
| Use API for accuracy | Qur'anic verse text is always fetched/verified against QF API, never hardcoded. If QF updates a translation or corrects text, our app reflects it. |
| Solve unique problems | No existing app combines: root-word exploration + Glossika-style audio immersion + multi-teacher content platform. |
| Ta'awun (collaboration) | The platform IS collaboration infrastructure — we build the technology, teachers bring the pedagogy, QF provides the data, students benefit. |

### Judging Criteria Mapping

| Criterion (pts) | Score Strategy |
|---|---|
| Impact on Quran Engagement (30) | Transforms passive recitation → active comprehension. "I memorized this surah — now I understand every word." |
| Product Quality & UX (20) | Polished Expo app, two listening modes, word-tap-to-explore, motivational dashboard. |
| Technical Execution (20) | Cross-platform Expo, on-device FSRS, offline-first SQLite, OAuth2 PKCE, 14 API integrations. |
| Innovation & Creativity (15) | Root exploration as primary learning paradigm + Glossika audio immersion applied to Qur'an. No one else does this. |
| Effective Use of APIs (15) | 6 Content + 8 User APIs, all used genuinely (not superficially). |

---

## 10. What This Is NOT

- **Not a Quran reader/mushaf app** — Quran.com already does that perfectly. We complement it.
- **Not a grammar course** — No morphology tables, no "Form X" discussions. Plain meaning only.
- **Not a memorization (hifz) app** — We help you *understand* what you've memorized or are reading.
- **Not a competitor to Quran.com** — We use their APIs, we sync with their ecosystem, we send users to them. Ta'awun.
- **Not an AI-generated content app** — Teachers provide the pedagogy. AI assists (TTS, enrichment), not replaces.

---

## 11. Phased Roadmap

### Phase 0: Foundation — Lesson 1 in the New App
**Goal**: Get the existing Lesson 1 working in a flexible architecture that can grow.

- [ ] Define the course YAML schema (accommodates Lesson 1's full richness)
- [ ] Convert existing `lesson-01.yaml` / `lesson-01.json` to the new schema
- [ ] Build the lesson rendering screen (adapt from existing `LessonScreen.tsx`)
- [ ] Arabic audio streaming from EveryAyah CDN (already working)
- [ ] Translation TTS playback (already working)
- [ ] Language toggle EN ↔ Tamil (already working)
- [ ] Basic navigation: lesson list → lesson → sections → cards

**Test with**: Your current students. Does it work? Is the content correct? Is the flow natural?
**Exit criteria**: A student can complete Lesson 1 in the app on web + mobile.

### Phase 1: Active Review + Basic SRS
**Goal**: Add the Glossika "Active Review" mode with simple spaced repetition.

- [ ] Set up SQLite (expo-sqlite) for local state
- [ ] Implement FSRS card scheduling (ts-fsrs library)
- [ ] Build Active Review screen: show card → hear audio → reveal translation → rate
- [ ] "Know it ✓" / "Almost ○" / "Don't know ✗" rating → FSRS update
- [ ] Review queue: on app open, show due cards first (Glossika's "reviews first" pattern)
- [ ] Daily stats tracking: reps done, minutes studied (local SQLite)

**Test with**: Your students over 1-2 weeks. Do they come back? Do reviews pile up? Is the rating UX natural?
**Exit criteria**: Students are using Active Review daily, SRS scheduling feels right.

### Phase 2: Background Listening Mode
**Goal**: Add the hands-free audio immersion mode.

- [ ] Build Background Listening player: Arabic → pause → translation → next, looping
- [ ] Shuffle mode for variety
- [ ] Background audio support (keeps playing when screen is off / app is backgrounded)
- [ ] Background listening reps count toward SRS (with shorter retention multiplier)
- [ ] Playback controls: speed, pause, skip, repeat current

**Test with**: Your family/friends during commute or chores. Is it useful? Is the pacing right?
**Exit criteria**: Users can study hands-free for 10+ minutes and it feels natural.

### Phase 3: Root Explorer (for Lesson 1's roots)
**Goal**: Let users tap a word and explore its root — using only the roots already inventoried.

- [ ] Load existing root data (`docs/roots/ilah.json`, `docs/roots/kabura.json`)
- [ ] Build word-tap interaction: tap a word in a verse → highlight → show root info
- [ ] Root detail view: root letters, meaning, forms, other Qur'anic verses
- [ ] Tap a related verse → hear its audio (QF Audio API) → see translation (QF Translation API)
- [ ] "Add to study list" — user can select related verses for Background Listening or Active Review

**Test with**: Students who completed Lesson 1. "You learned إِلَٰه — here are 89 other places it appears!"
**Exit criteria**: Users explore roots and add new verses to their study lists.

### Phase 4: QF API Integration (Hackathon-Ready)
**Goal**: Integrate Quran Foundation APIs for content and user state tracking.

- [ ] Implement OAuth2 PKCE authentication (QF React Native tutorial)
- [ ] Content APIs: Verses (word-by-word), Audio, Translations — for Root Explorer verses
- [ ] User APIs: Activity Days (log study time) → auto-powers Streaks + Goals
- [ ] User APIs: Bookmarks + Collections (save/organize studied verses)
- [ ] User APIs: Notes (sync SRS state as JSON in note body per verse range)
- [ ] User APIs: Preferences (reciter, language)
- [ ] Build Home dashboard: streak badge, goal progress, study time, continue button
- [ ] Offline sync queue: local writes → flush to QF APIs when online

**Test with**: Full user flow — login, study, track progress, see streak.
**Exit criteria**: Hackathon submission ready. Demo video can show: root exploration, dual study modes, progress tracking.

### Phase 5: Lesson 2 + Content Flexibility
**Goal**: Prove the system works for multiple lessons and validate the course schema.

- [ ] Author Lesson 2 content in the course YAML format
- [ ] Create root inventory for Lesson 2's roots
- [ ] Verify the app handles multi-lesson navigation
- [ ] Cross-lesson root connections: "This root also appeared in Lesson 1"
- [ ] Validate the schema works for another teacher's content (even a simplified version)

**Test with**: Students progressing from Lesson 1 to Lesson 2.
**Exit criteria**: The course schema is validated — confident it can accommodate other teachers' content.

### Phase 6+: Platform Features (Post-Hackathon)
- Teacher web dashboard for content creation
- Course subscription by URL (content pack model)
- Community translation layer
- Teacher analytics
- Full Quran root database (corpus.quran.com import)
- Hadith sentence support
- AI-assisted content generation
- WhatsApp/Telegram integration
- Self-hosted deployment option

---

## 12. Future Ideas (Post-Hackathon)

These are documented for future reference, not for immediate implementation:

| Idea | Description |
|---|---|
| **Community translations** | Teacher creates course in English → community translates to Tamil, Urdu, Turkish, Bahasa. Arabic + root analysis stays same. |
| **AI content assistant** | Teacher provides verse references → LLM generates explanations, hooks, context. Teacher curates/approves. |
| **Cross-course root connections** | Student studying Course A sees: "This root also appears in Course B, Lesson 12." Cross-pollination between teachers. |
| **Teacher analytics** | Dashboard showing: which sentences students struggle with, drop-off points, completion rates. |
| **Root of the Day** | Daily shared experience: one root, 3-5 verses, across all users. Social feature via QuranReflect. |
| **Import from existing curricula** | Parse understandquran.com, Bayyinah, etc. curriculum → convert to course YAML → instant content library. |
| **Recording & self-assessment** | User records themselves reciting → compare with reciter. Glossika has this in beta. |

---

## 13. Open Questions

These need answers before or during implementation:

| # | Question | Needed By |
|---|---|---|
| 1 | Does `type=LESSON` in Activity Days auto-generate Streaks? Or only `type=QURAN`? | Phase 4 |
| 2 | Can Notes API body contain arbitrary JSON? Any validation on body format? | Phase 4 |
| 3 | Rate limits on Notes API updates (frequent audio-play-count syncs)? | Phase 4 |
| 4 | Is the `COURSE` goal type fully functional or pre-live only? | Phase 4 |
| 5 | What's the best source for the root database? corpus.quran.com download vs GitHub repos vs build our own? | Phase 3 (small), Phase 6 (full) |
| 6 | How should the course YAML schema relate to the existing `lesson-01.yaml`? Superset? Separate format? | Phase 0 |
| 7 | Should the app work without QF authentication (guest mode with local-only state)? | Phase 4 |
| 8 | What's the right SRS rating scale? 3 buttons (know/almost/don't) vs 4 (FSRS default) vs implicit inference? | Phase 1 |

---

## Related Documents

| Document | Purpose |
|---|---|
| `docs/app/research-glossika.md` | Deep research on Glossika's method, modes, SRS, pricing |
| `docs/app/research-hackathon-apis.md` | Full analysis of all QF Content + User APIs |
| `docs/app/EXPERIMENT-SUMMARY-2025-07.md` | Offline sync + Expo prototype results |
| `docs/app/ADR-008-offline-sync-convex.md` | Original Convex decision (superseded by ADR-009 above) |
| `docs/app/HACKATHON-AGENT-PROMPT.md` | Original hackathon brainstorming prompt |
| `docs/app/APP-REQUIREMENTS.md` | Earlier app requirements (partially superseded by this PRD) |
| `tools/lesson-content/lesson-01.yaml` | Existing lesson content format |
| `docs/roots/ilah.json` | Root inventory example: إِلَٰه |
| `docs/roots/kabura.json` | Root inventory example: كَبُرَ |
