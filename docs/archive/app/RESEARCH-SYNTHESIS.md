# Research Synthesis — Companion App for "Learn Qur'an Without Grammar"

> **Status:** Living document — synthesises all research completed to date.
> **Last updated:** July 2025
> **Purpose:** Single place to understand what we know before committing to build.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Area 1: Client-Side TTS](#1-client-side-tts)
3. [Research Area 2: SRS Algorithms (FSRS + ts-fsrs)](#2-srs-algorithms)
4. [Research Area 3: PWA vs Native (Expo/React Native)](#3-pwa-vs-native)
5. [Research Area 4: Competitive Landscape](#4-competitive-landscape)
6. [Cross-Cutting Decisions](#cross-cutting-decisions)
7. [Key Trade-Offs](#key-trade-offs)
8. [Recommendations](#recommendations)

---

## Executive Summary

We investigated four areas to decide whether (and how) to build a companion app for the existing static-site course. Here is what we found:

| Area | Finding | Confidence |
|------|---------|------------|
| **Client-side TTS** | On-device TTS on iOS/Android handles English well; Tamil and Urdu quality varies by device but is serviceable. Arabic Qur'anic audio must always come from real reciters (never TTS). `react-native-tts` (47K weekly downloads) wraps native engines. Pre-generating MP3s with `edge-tts` at build time remains the gold standard for quality. | High |
| **SRS Algorithm** | FSRS (Free Spaced Repetition Scheduler) is the clear winner — adopted by Anki, open-source, TypeScript implementation (`ts-fsrs` v5.0, 611 stars). Fully client-side, no server needed. Runs in SQLite. Supports custom parameters per user. | High |
| **PWA vs Native** | PWA is simpler but cannot do: reliable offline audio caching (Service Worker storage limits), background audio playback, or on-device TTS. Expo/React Native with `expo-sqlite` gives us true offline-first, on-device TTS, background audio, and a single codebase for iOS + Android. | High |
| **Competitive Landscape** | No existing app combines root-based Qur'anic vocabulary + SRS + audio immersion + multi-language translations. The gap is real. Closest competitors are vocabulary-only (Quran Progress) or memorisation-only (Tarteel). | High |

**Bottom line:** An Expo/React Native app with SQLite + FSRS + on-device TTS is the right architecture. PWA is a stepping stone but not the end state.

---

## 1. Client-Side TTS

### What We Investigated

How to generate spoken English, Tamil, and Urdu translations without a server, since the current build-time approach (`edge-tts`) requires Python + internet.

### Findings

#### Current System (Build-Time)
- **`edge-tts`** (Microsoft Azure Neural TTS): Free, no API key, excellent quality
- English voices: Male pool (Andrew, Brian, Christopher) rotated per sentence
- Arabic TTS (`ar-SA-HamedNeural`): For hadith/non-Qur'anic content only
- **Qur'anic Arabic is always from real reciters** (EveryAyah CDN, 12 approved reciters) — never TTS
- Pre-generated MP3s: ~190kbps, normalised to 44.1kHz mono

#### Client-Side Options for the App

| Library | Platform | Offline? | Languages | Quality | Weekly DLs |
|---------|----------|----------|-----------|---------|------------|
| `react-native-tts` | iOS + Android | ✅ Uses native engine | All OS-installed languages | Good (device-dependent) | 47K |
| `@mhpdev/react-native-speech` | iOS + Android | ✅ | All OS-installed | Good (newer API) | Growing |
| `react-native-sherpa-onnx-offline-tts` | iOS + Android | ✅ Custom ONNX models | Any (with model) | Excellent (but large) | Small |
| Web Speech API (PWA) | Browser | ❌ Needs OS voices | Varies wildly | Poor on some devices | N/A |

#### Language-Specific Analysis

| Language | iOS Support | Android Support | Recommendation |
|----------|-------------|-----------------|----------------|
| **English** | Excellent (Siri voices) | Excellent (Google TTS) | On-device TTS for real-time; pre-generated MP3s as fallback |
| **Tamil** (ta-IN) | Good (iOS 16+, 2 voices) | Good (Google TTS has Tamil) | On-device TTS viable; pre-generate MP3s via `edge-tts` for quality guarantee |
| **Urdu** (ur-PK) | Good (iOS 16+) | Good (Google TTS) | Same hybrid approach |
| **Arabic** (Qur'anic) | N/A — never use TTS | N/A | Always real reciters from EveryAyah CDN |

#### Recommended Hybrid Approach

1. **Pre-generate high-quality MP3s** at build time using `edge-tts` for all 3 translation languages
2. **Bundle MP3s in the app** (or download per-lesson pack on first use)
3. **Fall back to on-device TTS** (`react-native-tts`) only when MP3s not yet downloaded
4. **Never use TTS for Qur'anic Arabic** — always real reciter audio

This gives the best of both worlds: guaranteed quality from pre-built audio, with on-device TTS as a graceful degradation path.

### Key Insight

`edge-tts` is a **build-time tool**, not a runtime dependency. It generates MP3 files that ship with the app or download as lesson packs. The app itself never calls Azure — it's fully offline. This is the architecture that makes "zero server cost" real.

---

## 2. SRS Algorithms

### What We Investigated

Which spaced repetition algorithm to use, how to run it client-side, and how it integrates with our sentence-pair learning model.

### FSRS: The Clear Winner

**FSRS** (Free Spaced Repetition Scheduler) is the state-of-the-art SRS algorithm:
- Created by Jarrett Ye, based on the DSR (Difficulty, Stability, Retrievability) model
- **Adopted by Anki** (v23.10+) as a replacement for SM-2
- 4 possible ratings per review: Again, Hard, Good, Easy
- Models both memory stability AND difficulty per card
- Proven ~30% more efficient than SM-2 in reducing review load

### ts-fsrs: The TypeScript Implementation

| Property | Detail |
|----------|--------|
| Package | `ts-fsrs` |
| Version | 5.0.0 (May 2025), with FSRS-6 support |
| Stars | 611 (growing) |
| License | MIT |
| Size | Lightweight, no dependencies |
| Platform | ES Modules, CommonJS, UMD — works everywhere |
| Features | Full FSRS algorithm, custom parameters, state management, seed-based randomisation |

#### How It Works in Our App

```
Sentence pair → Card in SQLite → ts-fsrs schedules next review → User rates (Again/Hard/Good/Easy) → ts-fsrs updates stability/difficulty → Next interval calculated
```

Each "card" is a **sentence pair** (Arabic audio + English/Tamil/Urdu translation). The student hears the Arabic, tries to recall the meaning, then rates their recall. This maps perfectly to our existing lesson structure.

#### Data Model (Conceptual)

```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY,
  lesson_id INTEGER,
  phrase_index INTEGER,
  arabic_text TEXT,
  -- FSRS fields
  due DATETIME,
  stability REAL,
  difficulty REAL,
  elapsed_days INTEGER,
  scheduled_days INTEGER,
  reps INTEGER,
  lapses INTEGER,
  state INTEGER,  -- New=0, Learning=1, Review=2, Relearning=3
  last_review DATETIME
);

CREATE TABLE review_log (
  id INTEGER PRIMARY KEY,
  card_id INTEGER,
  rating INTEGER,  -- Again=1, Hard=2, Good=3, Easy=4
  review_time DATETIME,
  elapsed_days INTEGER,
  scheduled_days INTEGER
);
```

### Why Not SM-2?

| Factor | SM-2 | FSRS |
|--------|------|------|
| Age | 1987 | 2022+ |
| Efficiency | Baseline | ~30% fewer reviews for same retention |
| Adaptability | Fixed parameters | Adapts to individual learner |
| Difficulty model | Simple ease factor | DSR model (3 parameters) |
| Anki adoption | Legacy | Default since v23.10 |
| TypeScript lib | Community ports | Official `ts-fsrs` |

### Our SRS Design Decisions

1. **Review unit = sentence pair**, not individual words (matches our audio immersion pedagogy)
2. **Audio-first review**: Play Arabic audio → student recalls meaning → rates recall → show translation
3. **No typing required**: Tap-based rating (Again / Hard / Good / Easy) — optimised for car/walk use
4. **Cumulative deck**: All learned sentences across all lessons in one review pool
5. **Session length**: Configurable (5, 10, 15, 20 minutes or N cards)
6. **New card introduction**: Controlled drip (e.g., 5 new cards per day) to prevent overwhelm

---

## 3. PWA vs Native

### What We Investigated

Whether a Progressive Web App (Phase 2 in current roadmap) is sufficient, or whether we need a native app (Expo/React Native).

### Comparison Matrix

| Capability | PWA | Expo/React Native | Critical for Us? |
|------------|-----|-------------------|------------------|
| **Offline content** | Service Worker cache (limited) | SQLite + filesystem (unlimited) | ✅ Critical |
| **Offline audio** | Cache API (50-100MB typical limit) | File system (GB+ available) | ✅ Critical — 10MB/lesson × 50 lessons = 500MB |
| **Background audio** | ❌ Killed when tab closes | ✅ `react-native-track-player` | ✅ Critical for car/walk use |
| **On-device TTS** | Web Speech API (unreliable) | `react-native-tts` (native engines) | ✅ Critical for Tamil/Urdu |
| **SQLite** | Via WASM (experimental) | `expo-sqlite` (native, battle-tested) | ✅ Critical for SRS data |
| **Push notifications** | Partial (no iOS Safari) | Full native support | 🟡 Nice for daily reminders |
| **App store presence** | ❌ No | ✅ Yes | 🟡 Discoverability |
| **Install friction** | Low (add to homescreen) | Higher (app store download) | 🟡 Trade-off |
| **Development speed** | Faster (web tech only) | Moderate (Expo simplifies) | 🟡 Both viable |
| **OTA updates** | Instant (just deploy) | `expo-updates` (fast, no store review) | ✅ Important for new lessons |
| **File system access** | ❌ Very limited | ✅ Full | ✅ For export/import |
| **Cross-platform** | All browsers | iOS + Android | ✅ Sufficient |

### The Deciding Factors

Three features **cannot be done well in a PWA** and are critical for our use case:

1. **Reliable offline audio storage** — 500MB+ of lesson audio needs filesystem, not Cache API
2. **Background audio playback** — Students listen while walking/driving; PWA audio dies when tab switches
3. **On-device TTS** — Tamil and Urdu TTS via native engines is reliable; Web Speech API is not

### Verdict

**Expo/React Native is the right choice.** PWA would be a half-measure that requires rebuilding later.

### Why Expo Specifically?

| Feature | Expo Advantage |
|---------|---------------|
| `expo-sqlite` | First-class SQLite with synchronous API, migrations, Drizzle ORM support |
| `expo-file-system` | Full filesystem access for audio caching |
| `expo-updates` | OTA content updates without app store review |
| `expo-av` / `react-native-track-player` | Audio playback with background mode |
| Managed workflow | No Xcode/Android Studio needed for most development |
| EAS Build | Cloud builds for iOS + Android |
| Config plugins | Extend native functionality without ejecting |

---

## 4. Competitive Landscape

### What We Investigated

Every major app for learning Qur'anic Arabic, to understand the gap our app would fill.

### Competitor Matrix

| App | Focus | Method | SRS? | Audio? | Offline? | Languages | Root-Based? | Price |
|-----|-------|--------|------|--------|----------|-----------|-------------|-------|
| **Quran.com** | Reading/recitation | Full Quran text + reciters | ❌ | ✅ 20+ reciters | Partial | 50+ translations | ❌ | Free |
| **Tarteel** | Memorisation | AI voice recognition | ❌ (streak-based) | ✅ | Partial | Arabic + some | ❌ | Freemium ($60/yr) |
| **Quranic** | Vocabulary | Word-by-word flashcards | Basic | Minimal | ❌ | EN only | Partial | Free |
| **Quran Progress** | Vocabulary | Gamified word learning | ✅ (basic) | Minimal | Partial | EN/FR/TR/DE | ❌ | Freemium |
| **Bayyinah TV** | Courses | Video lectures (Nouman Ali Khan) | ❌ | ✅ (lectures) | ❌ (streaming) | EN only | ❌ (grammar-based) | $150/yr |
| **Understand Quran** | Vocabulary | Word frequency + grammar | ❌ | ✅ | Partial | EN/UR/BN/ML/TA | ❌ | Varies |
| **Our App** | Recognition | Root families + audio immersion | ✅ (FSRS) | ✅ (reciters + TTS) | ✅ (offline-first) | EN/TA/UR (extensible) | ✅ | Free/Open |

### Gap Analysis

**What no existing app does** (our unique combination):

1. **Root-word family approach** — Teaching recognition through Arabic root patterns (كَبُرَ → أَكْبَر → كَبِير → الْكِبْرِيَاء), not isolated vocabulary
2. **Real reciter audio immersion** — Not TTS Arabic, but actual Qur'anic recitation from EveryAyah's 12+ approved reciters
3. **Anchored in daily worship** — Every lesson starts from phrases Muslims already know (adhān, ṣalāh)
4. **FSRS-powered SRS** — State-of-the-art spaced repetition (most competitors use basic or no SRS)
5. **Multi-language translations** — English, Tamil, Urdu from day one (most apps are English-only)
6. **Truly offline-first** — Full functionality with no internet after initial download
7. **Open platform** — Other teachers/schools can create courses using the same infrastructure
8. **No grammar terminology** — Pure meaning-based recognition (Bayyinah and Understand Quran are grammar-heavy)

### Detailed Competitor Notes

#### Quran.com
- **Strengths:** Massive reciter library, beautiful UI, word-by-word translation, community trust
- **Weakness for us:** It's a reading tool, not a learning tool. No pedagogy, no SRS, no progression
- **Relationship:** We use their API (Quran Foundation) for timestamps; complementary, not competitive

#### Tarteel
- **Strengths:** AI voice recognition for recitation practice, 15M+ users, well-funded
- **Weakness for us:** Focused on memorisation (hifz), not understanding. No vocabulary learning, no root analysis
- **Relationship:** Different use case entirely — they help you recite correctly, we help you understand what you're reciting

#### Quranic
- **Strengths:** Word-by-word flashcards, simple interface
- **Weakness for us:** No audio immersion, no root-family approach, no SRS, English-only
- **Relationship:** Closest to our vocabulary goal but very different method

#### Quran Progress
- **Strengths:** Gamified, 197K+ learners, covers most frequent Qur'anic words, basic SRS
- **Weakness for us:** Word-level (not sentence-level), minimal audio, no root families, no worship anchoring
- **Relationship:** Most direct competitor for the "learn Qur'anic vocabulary" niche. Our differentiation: audio immersion + root families + worship anchoring

#### Bayyinah TV
- **Strengths:** Nouman Ali Khan's teaching quality, comprehensive Arabic grammar courses
- **Weakness for us:** Video-based (not practice-based), grammar-heavy, subscription-only ($150/yr), streaming-dependent
- **Relationship:** High-end grammar education — our "no grammar" approach is deliberately the opposite

#### Understand Quran (understandquran.com)
- **Strengths:** Siraj's own teacher uses this. Multi-language (EN/UR/BN/ML/TA). Structured curriculum
- **Weakness for us:** Traditional teaching approach, not audio-immersion. Website-based, limited offline
- **Relationship:** Deeply connected — Siraj's teacher is from this organisation. Our app could potentially host their content as a course on the open platform

---

## Cross-Cutting Decisions

Based on all four research areas, these decisions emerge:

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Expo/React Native, not PWA** | Offline audio, background playback, on-device TTS all require native |
| 2 | **SQLite via `expo-sqlite`** | All data local, no server, FSRS state persisted, export/import via file |
| 3 | **FSRS via `ts-fsrs`** | Best algorithm, TypeScript-native, Anki-proven, MIT license |
| 4 | **Pre-built MP3s + on-device TTS fallback** | Quality first, offline always |
| 5 | **Sentence pairs as review units** | Matches our pedagogy (not isolated words) |
| 6 | **Multi-language from day one** | EN/TA/UR translations in lesson content, TTS for all three |
| 7 | **Open content format** | JSON/YAML lesson packs that any teacher can create |
| 8 | **Zero server cost** | No backend, no auth server, no database server. Everything on-device. |

---

## Key Trade-Offs

### Trade-Off 1: Pre-Built Audio vs On-Device TTS

| | Pre-Built MP3s | On-Device TTS |
|-|---------------|---------------|
| **Quality** | ✅ Consistent, high-quality | ⚠️ Varies by device |
| **Storage** | ❌ ~10MB per lesson per language | ✅ Zero storage |
| **Offline** | ✅ Always available once downloaded | ✅ Always available |
| **New languages** | ❌ Requires rebuild | ✅ Instant if OS supports |
| **Our choice** | Primary (default) | Fallback (when MP3s not downloaded) |

### Trade-Off 2: App Store vs Side-Loading

| | App Store | Side-Loading / Open APK |
|-|-----------|------------------------|
| **Discoverability** | ✅ Searchable | ❌ Manual sharing |
| **Trust** | ✅ Vetted by Apple/Google | ⚠️ Requires trust |
| **Updates** | ⚠️ Review delay (but `expo-updates` bypasses for content) | ✅ Instant |
| **Cost** | ❌ $99/yr Apple, $25 Google | ✅ Free |
| **Our choice** | Both — app store for reach, APK for communities without Play Store access |

### Trade-Off 3: Single App vs Open Platform

| | Single App (just our course) | Open Platform (any teacher's course) |
|-|------------------------------|--------------------------------------|
| **Complexity** | ✅ Simple | ❌ Content packaging, course switching, multi-tenant |
| **Impact** | Limited to our course | ✅ Every Arabic teacher benefits |
| **Sustainability** | Depends on us | ✅ Community-driven |
| **Our choice** | **Start single, design for platform** — keep content format open from day one, add multi-course UI in Phase 2 |

---

## Recommendations

### Do Build the App — Here's Why

1. **The gap is real** — No app combines root-based learning + audio immersion + SRS + offline + multi-language
2. **The tech is mature** — Expo, `expo-sqlite`, `ts-fsrs`, `react-native-tts` are all production-ready
3. **Zero marginal cost** — No server, no API costs. Just Apple ($99/yr) and Google ($25 one-time)
4. **Content already exists** — Lesson 1 is built, the pipeline works, audio infrastructure is proven
5. **Open platform potential** — If designed right, this becomes infrastructure for any Qur'anic Arabic teacher

### Build in This Order

1. **MVP (Phase 1):** Single course, EN only, offline audio playback + FSRS review. Core loop: Learn → Listen → Review → Repeat.
2. **Phase 2:** Multi-language (add TA/UR), teacher analytics dashboard, more lessons.
3. **Phase 3:** Open platform — other teachers can create and distribute courses. Content marketplace.

### What to Validate Before Building

- [ ] Will Siraj's students actually use a mobile app? (Survey existing learners)
- [ ] Is the sentence-pair SRS model engaging enough? (Paper prototype / Figma test)
- [ ] Can we get 10 lessons of content ready? (Content pipeline throughput)
- [ ] Does Siraj's teacher (understandquran.com) see value in the open platform? (Conversation)

---

## Appendix: Research Sources

- ts-fsrs: https://github.com/open-spaced-repetition/ts-fsrs
- react-native-tts: https://github.com/ak1394/react-native-tts
- expo-sqlite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- EveryAyah CDN: https://everyayah.com
- Quran Foundation API: https://api.quran.com
- Quran Progress: https://quranprogress.com
- Tarteel: https://tarteel.ai
- Bayyinah TV: https://bayyinah.tv
- Understand Quran: https://understandquran.com

---

*This synthesis will be updated as the deep-dive research agents (Glossika, Audio Methods, Expo Architecture, Platform Design) complete their work.*
