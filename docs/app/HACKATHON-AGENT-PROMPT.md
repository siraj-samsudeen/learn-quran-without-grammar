# Hackathon Brainstorming Agent — Launch Prompt

Copy everything below the line and use it as the prompt for a new Claude session.

---

You are helping me brainstorm and plan a submission for the **Quran Foundation Hackathon**. Your job is to:

1. **Understand my project** by reading the context I provide
2. **Probe me with questions** to understand what I want to build and what excites me
3. **Do your own research** on the hackathon, the APIs, and competitor submissions
4. **Propose 2-3 concrete submission ideas** ranked by feasibility and impact
5. **Help me pick one** and draft a plan

## Key Files to Read

Before asking me questions, read these files in the repo to get full context:

- **`docs/app/research-hackathon-apis.md`** — Deep research on all Quran Foundation APIs (Content + User), how they map to our learning state, authentication flow, gaps, and proposed integration architecture
- **`docs/app/EXPERIMENT-SUMMARY-2025-07.md`** — Summary of the offline sync + Expo app experiments we just completed (what works, what was proven, architecture decisions, cost breakdown, what's next)
- **`docs/app/ADR-008-offline-sync-convex.md`** — Architecture decision record for Convex offline-first sync pattern
- **`playground/`** — Convex offline sync prototype (Vite + React + Convex + IndexedDB). Key files: `convex/schema.ts`, `convex/cardReviews.ts`, `src/offlineStore.ts`, `src/useOfflineSync.ts`
- **`playground-app/`** — Expo React Native lesson app prototype (runs on web + mobile). Key files: `src/LessonScreen.tsx`, `src/audio.ts`, `src/types.ts`, `assets/lesson-01.json`
- **`tools/lesson-content/lesson-01.yaml`** — The enriched YAML format: single source of truth for a lesson (prose, cards, hooks, vocab, quiz, all bilingual)
- **`lessons/lesson-01-allahu-akbar.md`** — The current live lesson on the Jekyll site (for reference on content quality and structure)

## My Project: Learn Qur'an Without Grammar

A self-study course teaching Qur'anic Arabic recognition through root-word families, audio immersion, and phrases from daily prayers (adhān, ṣalāh). No grammar terminology. The student hears Arabic recitation, sees the text, learns the root meaning, and gradually recognizes words across the Qur'an.

**Live site**: https://siraj-samsudeen.github.io/learn-quran-without-grammar/
**Lesson 1 (live)**: https://siraj-samsudeen.github.io/learn-quran-without-grammar/lessons/lesson-01-allahu-akbar

## What I've Already Built

### Lesson Content (1 lesson complete)
- Lesson 1: "Allāhu Akbar" — 2 root families (إِلَٰه and كَبُرَ), 8 vocabulary words, 12 Qur'anic phrases
- Bilingual: English + Tamil
- Audio: Arabic recitation (real reciters, different one per phrase) + English/Tamil TTS translation
- Sections: Anchor phrase → Root explanation + vocab table → Learning cards → Practice cards → Shuffle review player → Quiz → Closing

### Expo App Prototype (just built, not deployed)
- **Single Expo/React Native codebase** that runs on web + Android + iOS
- Renders the full lesson from a structured JSON file (converted from YAML)
- Arabic audio streams from **EveryAyah CDN** at runtime (no pre-built audio needed)
- Translation TTS generated via edge-tts (pre-built, ~970KB per lesson for both EN + Tamil)
- Language toggle (EN ↔ Tamil)
- Sequential/shuffle player for review
- Quiz section with tap-to-reveal

### Offline Sync (proven in prototype)
- **Convex** as cloud backend for state sync
- Local-first pattern: writes go to local store (IndexedDB/SQLite) first, sync to Convex when online
- Tested: offline writes → reconnect → auto-sync ✅
- No CRDTs needed (append-only review data)

### Content Authoring
- Single YAML file per lesson = source of truth (prose, cards, hooks, vocab, quiz, all bilingual)
- Build script generates translation TTS MP3s via edge-tts
- No stitching/concatenation needed — app orchestrates Arabic (CDN) → pause → TTS at runtime

## Hackathon Requirements

**Organiser**: Provision Launch (sponsored by Quran Foundation)
**Theme**: "Build technology that strengthens people's connection with the Qur'an"
**Prize pool**: $10,000 across 7 winners
**Deadline**: End of Shawwal 1447 (April 20, 2026)
**Key rule**: Must use at least one API from EACH of the two categories:

### Category 1 — Content API (must use ≥1)
- Quran APIs (verses, chapters, words)
- Audio APIs (reciter audio, timestamps)
- Tafsir APIs
- Translation APIs
- QuranReflect Post APIs (read reflections)

### Category 2 — User API (must use ≥1)
- Bookmarks, Collections
- Streak Tracking
- Post APIs (post a reflection)
- Activity & Goals APIs
- Notes API
- Reading Sessions
- Preferences

### Judging Criteria
| Criterion | Points |
|-----------|--------|
| Impact on Quran Engagement | 30 |
| Product Quality & UX | 20 |
| Technical Execution | 20 |
| Innovation & Creativity | 15 |
| Effective Use of APIs | 15 |

## Detailed API Research

I've done deep research on all the APIs. Here are the key findings:

### Most Relevant Content APIs
- **Verses API** — fetch verse text + word-by-word data dynamically
- **Audio API** — stream reciter audio with word-level timestamps (we already use EveryAyah CDN; could switch to the official API)
- **Translation API** — dynamically fetch translations in any language (expand beyond EN/Tamil)
- **Search API** — "where else does this word appear in the Qur'an?" (powerful for root-word exploration)
- **Tafsir API** — optional enrichment for anchor verses
- **QuranReflect Posts** — surface community reflections about the verses being studied

### Most Relevant User APIs
- **Activity Days** (`type=LESSON`) — log study time + verse ranges → automatically powers Streaks + Goals
- **Goals** (`type=COURSE`) — "Study 15 min/day" goals, auto-tracked via Activity Days
- **Streaks** — auto-derived from Activity Days, display as motivational widget
- **Bookmarks** — mark each studied ayah, `isReading=true` for current position
- **Collections** — group bookmarks by lesson or mastery level ("Mastered", "Needs Review")
- **Notes** — most flexible API: store JSON-encoded learning metadata (audio play count, recognition level, forms studied) in the note body, attached to verse ranges
- **Posts (QuranReflect)** — publish learning reflections after completing a lesson
- **Preferences** — sync reciter/language preferences with Quran.com ecosystem

### API Gaps to Know About
- All APIs work at ayah level, not word level (Notes API body is the workaround for word-level data)
- No native audio-play counter (must track client-side, sync via Notes)
- Streak type filter only supports `QURAN` currently — unclear if `LESSON` type generates streaks
- Preferences are pre-defined groups (can't create arbitrary keys)

### Auth: OAuth2 PKCE
- User authenticates via Quran Foundation
- Access token + client_id attached to every request
- React Native tutorial available: https://api-docs.quran.foundation/docs/tutorials/oidc/mobile-apps/react-native
- JS SDK exists for Content APIs; User APIs need manual fetch()

## What I Want You to Do

### Phase 1: Probe Me (ask 5-8 questions)
Ask me questions to understand:
- What excites me most about this hackathon?
- What's my capacity (solo? team? time available?)
- What features do I already want vs what's negotiable?
- Am I optimizing for winning, for building something I'll actually use, or both?
- Do I want to submit the Expo app, the Jekyll website, or something new?
- How important is the "post-Ramadan retention" angle vs other angles?

### Phase 2: Research (do this yourself)
- Check https://launch.provisioncapital.com/quran-hackathon for any updates
- Look at what kinds of apps typically win Islamic tech hackathons
- Think about what would score highest on "Impact on Quran Engagement" (30 points — biggest weight)
- Consider what's achievable given I have a working prototype already

### Phase 3: Propose 2-3 Submission Ideas
For each idea:
- **One-line pitch**
- **Which APIs it uses** (Category 1 + Category 2)
- **What needs to be built** (what exists vs what's new)
- **Estimated effort** (days/weeks)
- **Scoring prediction** per judging criterion
- **Risk assessment**

### Phase 4: Help Me Decide
Once I pick a direction, help me:
- Draft the submission title + description
- List exactly what to build before the deadline
- Identify the 2-3 demo moments for the video
