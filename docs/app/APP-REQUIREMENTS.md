# App Requirements — "Learn Qur'an Without Grammar" Companion App

> **Status:** Draft v1.0
> **Last updated:** July 2025
> **Author:** Synthesised from conversation with Siraj Samsudeen
> **Purpose:** Complete product vision, feature list, and phased roadmap

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [Target Users](#target-users)
3. [Core Learning Loop](#core-learning-loop)
4. [Feature List by Phase](#feature-list-by-phase)
5. [Content Architecture](#content-architecture)
6. [Audio System](#audio-system)
7. [Spaced Repetition (SRS)](#spaced-repetition-srs)
8. [Multi-Language Support](#multi-language-support)
9. [Offline-First Architecture](#offline-first-architecture)
10. [User Data & Privacy](#user-data--privacy)
11. [Teacher/Analytics Features](#teacher-analytics-features)
12. [Open Platform Vision](#open-platform-vision)
13. [Technical Stack](#technical-stack)
14. [Non-Requirements (Out of Scope)](#non-requirements)
15. [Success Metrics](#success-metrics)
16. [Open Questions](#open-questions)

---

## Product Vision

> **"A Glossika-style audio immersion app for Qur'anic Arabic — offline-first, multi-language, open to any teacher."**

The app makes Muslims *recognise* Qur'anic Arabic through:
- **Root-word families** — not isolated vocabulary, but patterns (كَبُرَ → أَكْبَر → كَبِير)
- **Audio immersion** — real Qur'anic recitation paired with spoken translations
- **Worship anchoring** — every lesson starts from phrases the student already says daily
- **Spaced repetition** — FSRS algorithm ensures long-term retention
- **No grammar** — pure meaning recognition, no terminology, no memorisation pressure

The student's experience: *"I opened my app on the bus. I heard Husary recite a verse from Surah Al-Baqarah. I knew the meaning before the English translation played. I tapped 'Good' and the next card appeared."*

### What This Is NOT

- Not a Quran reader (use Quran.com for that)
- Not a memorisation tool (use Tarteel for that)
- Not a grammar course (use Bayyinah for that)
- Not a tajweed trainer (use a human teacher for that)

**This is a recognition trainer.** The student learns to *understand* what they already *hear* in ṣalāh, in Jumu'ah khutbahs, and when listening to Quran recitation.

---

## Target Users

### Primary: Self-Study Muslims

| Persona | Description | Key Need |
|---------|-------------|----------|
| **Aisha** (35, UK) | Prays 5x daily, doesn't understand Arabic. Tried Bayyinah but found grammar overwhelming. | Understand what she says in ṣalāh |
| **Kamil** (22, Malaysia) | University student, listens to Quran on commute. Wants to catch meanings. | Background audio learning on the go |
| **Fatima** (50, India, Tamil-speaking) | Reads Quran in Arabic script but understands nothing. English is second language. | Tamil translations, simple interface |
| **Omar** (40, Pakistan, Urdu-speaking) | Attends Islamic classes, wants to supplement with daily practice. | Urdu translations, offline use (spotty internet) |

### Secondary: Teachers & Schools

| Persona | Description | Key Need |
|---------|-------------|----------|
| **Ustadh Abdus Samad** | Teaches "Understand Quran" courses. Has his own curriculum. | Load his content into the app framework |
| **Weekend Islamic School** | Teaches children Arabic, needs homework tool. | Track student progress, assign lessons |

---

## Core Learning Loop

The app's UX revolves around two modes, inspired by Glossika:

### Mode 1: Learn (New Material)

```
[Lesson Introduction — what roots you'll learn]
    ↓
[Anchor Phrase — e.g., "Allahu Akbar" — you already know this!]
    ↓
[Root Exploration — hear 5 Qur'anic sentences with this root]
    ↓
For each sentence:
    🔊 Arabic recitation (real reciter, 3-15 seconds)
        ↓ 2 second pause
    🔊 Translation audio (English/Tamil/Urdu TTS)
        ↓
    📖 Show Arabic text + translation on screen
        ↓
    [Tap to continue]
    ↓
[Lesson Summary — all phrases with root highlighting]
    ↓
[Quick Check — low-stakes self-assessment]
```

### Mode 2: Review (Spaced Repetition)

```
[FSRS selects due card from all learned sentences]
    ↓
🔊 Arabic recitation plays
    ↓
[Student tries to recall meaning]
    ↓
[Tap to reveal translation]
    ↓
🔊 Translation audio plays
    ↓
[Rate: Again | Hard | Good | Easy]
    ↓
[FSRS schedules next review]
    ↓
[Next card...]
    ↓
[Session complete — show stats]
```

### Mode 3: Listen (Background Audio)

```
[Select scope: Current Lesson / All Lessons / Custom Mix]
    ↓
[Select mode: Sequential / Shuffle]
    ↓
🔊 Plays sentence pairs continuously
    ↓
[Lock screen controls — play/pause/skip]
    ↓
[Continues playing with screen off / in background]
```

This is the "Glossika Full Practice" equivalent — passive immersion while driving, walking, cooking.

---

## Feature List by Phase

### MVP (Phase 1) — Core Learning Loop

> **Goal:** One course (Siraj's), English only, fully functional offline.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1.1 | **Lesson viewer** — display lesson content (Arabic + English) | Must | Replicate current web lesson layout |
| 1.2 | **Audio playback — Learn mode** — sequential sentence pairs | Must | Arabic reciter audio + English TTS |
| 1.3 | **Audio playback — Review mode** — FSRS-scheduled cards | Must | Core SRS loop |
| 1.4 | **Audio playback — Listen mode** — background audio with lock screen controls | Must | `react-native-track-player` |
| 1.5 | **FSRS engine** — `ts-fsrs` integration with SQLite | Must | Card scheduling, review log |
| 1.6 | **Offline-first** — all content + audio available without internet | Must | Download lesson packs on first use |
| 1.7 | **Lesson navigation** — browse lessons, see progress | Must | Simple list with completion status |
| 1.8 | **Progress dashboard** — cards learned, review streak, due today | Must | Motivational, simple |
| 1.9 | **Settings** — playback speed, auto-advance, session length | Should | User customisation |
| 1.10 | **Onboarding** — 3-screen intro explaining the method | Should | First-run experience |
| 1.11 | **Daily reminder notification** — configurable time | Should | Push notification |
| 1.12 | **Data export** — export all progress as JSON file | Should | No lock-in |

### Phase 2 — Multi-Language + Teacher Tools

> **Goal:** Tamil and Urdu translations, teacher analytics, more lessons.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 2.1 | **Tamil translations + TTS** | Must | On-device TTS + pre-built MP3 fallback |
| 2.2 | **Urdu translations + TTS** | Must | Same approach |
| 2.3 | **Language switcher** — change translation language per session | Must | Settings + in-session toggle |
| 2.4 | **Teacher dashboard** — view aggregate student progress | Should | Anonymous stats, opt-in |
| 2.5 | **Class management** — teacher creates class, students join via code | Should | Simple group feature |
| 2.6 | **Root explorer** — browse root families across all lessons | Should | "I learned كَبُرَ — show me all forms I've seen" |
| 2.7 | **Customisable SRS parameters** — adjust FSRS settings | Could | Advanced users / teachers |
| 2.8 | **Review filters** — review only specific lessons/roots | Should | Targeted study |
| 2.9 | **Lesson bookmarks** — mark sentences for extra review | Could | Personal curation |
| 2.10 | **20+ lessons of content** | Must | Content pipeline output |

### Phase 3 — Open Platform

> **Goal:** Any teacher can create and distribute their own course.

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 3.1 | **Course packaging format** — documented JSON/YAML spec | Must | The "Anki deck" equivalent |
| 3.2 | **Course browser** — discover and install courses | Must | In-app or external catalogue |
| 3.3 | **Multi-course support** — switch between installed courses | Must | Separate SRS decks per course |
| 3.4 | **Course creator CLI** — generate course packages from content files | Must | For teachers/developers |
| 3.5 | **Understand Quran integration** — pilot with Siraj's teacher's content | Should | Proof of open platform |
| 3.6 | **Content marketplace** — optional paid courses | Could | Sustainability model |
| 3.7 | **Additional languages** — community-contributed translations | Should | Open translation format |
| 3.8 | **Web companion** — sync progress between app and website | Could | PWA companion to native app |
| 3.9 | **Share progress** — social sharing of milestones | Could | Growth mechanic |
| 3.10 | **Accessibility** — screen reader support, font size options | Should | Inclusive design |

---

## Content Architecture

### Lesson Structure (from existing course design)

Each lesson contains:
- **2 anchor phrases** — from adhān, ṣalāh, or common duʿā (student already knows these)
- **5 learning phrases** — Qur'anic verses showcasing root forms
- **5 practice phrases** — mixed review from current + previous lessons
- **= 12 sentence pairs per lesson**

### Content Package Format

Each lesson is a self-contained package:

```
lesson-01/
├── manifest.json          ← Metadata, root info, phrase list
├── content/
│   ├── en.json            ← English translations
│   ├── ta.json            ← Tamil translations
│   └── ur.json            ← Urdu translations
├── audio/
│   ├── arabic/
│   │   ├── phrase-01.mp3  ← Reciter audio (from EveryAyah, trimmed)
│   │   ├── phrase-02.mp3
│   │   └── ...
│   ├── en/
│   │   ├── phrase-01.mp3  ← English TTS (pre-built via edge-tts)
│   │   └── ...
│   ├── ta/
│   │   ├── phrase-01.mp3  ← Tamil TTS
│   │   └── ...
│   └── ur/
│       ├── phrase-01.mp3  ← Urdu TTS
│       └── ...
└── metadata/
    ├── roots.json         ← Root families covered
    └── reciters.json      ← Which reciter per phrase
```

### Manifest Schema (conceptual)

```json
{
  "id": "lesson-01",
  "slug": "allahu-akbar",
  "title": "Allahu Akbar — The Greatness of God",
  "version": "1.0.0",
  "roots": [
    { "arabic": "إِلَٰه", "transliteration": "ilah", "meaning": "god/deity" },
    { "arabic": "كَبُرَ", "transliteration": "kabura", "meaning": "to be great" }
  ],
  "phrases": [
    {
      "index": 1,
      "role": "anchor",
      "arabic": "ٱللَّهُ أَكْبَرُ",
      "source": "adhan",
      "reciter": "Husary_128kbps",
      "audio_ref": "arabic/phrase-01.mp3",
      "translations": {
        "en": "God is the Greatest",
        "ta": "அல்லாஹ் மிகப் பெரியவன்",
        "ur": "اللہ سب سے بڑا ہے"
      }
    }
  ]
}
```

---

## Audio System

### Sources

| Content Type | Source | Format | Notes |
|-------------|--------|--------|-------|
| Qur'anic recitation | EveryAyah CDN → trimmed clips | MP3, ~190kbps, mono | 12 approved reciters, one per phrase |
| English translation | `edge-tts` (build-time) | MP3, ~190kbps, mono | Male voice pool: Andrew, Brian, Christopher |
| Tamil translation | `edge-tts` (build-time) | MP3, ~190kbps, mono | `ta-IN-ValluvarNeural` or best available |
| Urdu translation | `edge-tts` (build-time) | MP3, ~190kbps, mono | `ur-PK-AsadNeural` or best available |

### Playback Architecture

| Mode | Library | Behaviour |
|------|---------|-----------|
| **Learn** | `react-native-track-player` | Sequential pairs with configurable pause between |
| **Review** | `react-native-track-player` | Single pair per card, waits for rating |
| **Listen** | `react-native-track-player` | Continuous background playback, lock screen controls |

### Audio Caching Strategy

1. **App ships with Lesson 1** audio pre-bundled (~10MB)
2. **Lessons 2+ download on demand** when student opens lesson for first time
3. **Downloaded audio persists** in app filesystem (never re-downloaded)
4. **Download over WiFi only** option (for data-conscious users)
5. **Storage manager** — shows total audio storage, option to delete specific lessons
6. **Estimated storage:** ~10MB per lesson per language × 50 lessons × 3 languages = ~1.5GB maximum

### On-Device TTS Fallback

If pre-built MP3s not yet downloaded for a language:
1. `react-native-tts` speaks the translation using native OS voice
2. Quality indicator shown: "📡 Using device voice — download lesson for best audio"
3. Background download triggers automatically

---

## Spaced Repetition (SRS)

### Algorithm: FSRS via `ts-fsrs`

| Parameter | Default | Adjustable? |
|-----------|---------|-------------|
| Request retention | 0.90 (90%) | ✅ Per user |
| Maximum interval | 365 days | ✅ Per user |
| New cards/day | 5 | ✅ Per user |
| Review cards/day | 50 | ✅ Per user |
| Learning steps | 1m, 10m | ✅ Per user |

### Card Model

Each sentence pair becomes a card:
- **Front:** Arabic audio plays automatically
- **Back:** Translation text + translation audio
- **Rating:** Again (1) / Hard (2) / Good (3) / Easy (4)

### Review Session Flow

1. Show due count: "12 reviews due, 5 new cards available"
2. Interleave reviews and new cards (reviews first)
3. For each card:
   - Play Arabic audio
   - Student tries to recall meaning (internal)
   - Tap to reveal translation (text appears + audio plays)
   - Rate recall quality
4. Session ends when all due cards reviewed or time limit reached
5. Show session summary: cards reviewed, accuracy, streak

### Data Storage (SQLite)

All SRS data lives in local SQLite:
- `cards` table — one row per sentence pair, FSRS state columns
- `review_log` table — every review event (for analytics + FSRS optimisation)
- `lessons` table — lesson metadata, download status
- `settings` table — user preferences

### Undo

Last rating can be undone (single-level undo). Important for tap mistakes.

---

## Multi-Language Support

### Translation Languages (Phase 1 → Phase 2)

| Phase | Languages |
|-------|-----------|
| MVP | English only |
| Phase 2 | + Tamil (ta), Urdu (ur) |
| Phase 3 | Community-contributed (any language) |

### Implementation

| Component | How |
|-----------|-----|
| **Translation text** | JSON files per language per lesson |
| **Translation audio** | Pre-built MP3s via `edge-tts` (primary) + on-device TTS fallback |
| **UI strings** | i18n library (e.g., `i18next` with `react-i18next`) |
| **Arabic text** | Always Arabic (never transliterated) |
| **Script direction** | Arabic and Urdu: RTL; English and Tamil: LTR |

### Language Selection UX

- **App language** (UI strings): English, Tamil, Urdu
- **Translation language** (lesson content): Independent of app language
- A Tamil-speaking user might want the app UI in English but translations in Tamil
- Switchable per session: "Today I want to review in Urdu"

---

## Offline-First Architecture

### Design Principle

> **The app must work identically with zero internet connectivity.** Network is only needed for: (a) initial app install, (b) downloading new lesson packs, (c) optional data sync.

### What's Stored Locally

| Data | Storage | Size |
|------|---------|------|
| Lesson content (text) | SQLite | ~50KB per lesson |
| Arabic audio (reciters) | Filesystem | ~5MB per lesson |
| Translation audio (per language) | Filesystem | ~5MB per lesson per language |
| SRS card state | SQLite | ~1KB per card |
| Review history | SQLite | ~100 bytes per review |
| User settings | SQLite | ~1KB |
| App assets (icons, fonts, images) | App bundle | ~5MB |

### Sync Strategy

**No server sync in MVP.** All data is local-only.

For Phase 2+ (teacher features):
- Student **opts in** to share anonymous progress data
- Sharing mechanism: export JSON file → email to teacher, OR
- Simple endpoint (serverless function) for class progress aggregation
- **Never required** — the app always works without any server

### Data Export/Import

- **Export:** Generate JSON file of all SRS data + review history → share via system share sheet
- **Import:** Open JSON file → merge into local database
- **Use case:** Switch phones, back up data, share with teacher
- **Format:** Documented, human-readable JSON

---

## Teacher / Analytics Features

### For Self-Study Students (Phase 1)

| Metric | Display |
|--------|---------|
| Cards learned (total) | Counter on home screen |
| Cards due today | Counter + notification |
| Review streak (days) | Streak counter |
| Lessons completed | Progress bar |
| Average recall accuracy | Percentage |
| Time spent today | Timer |
| Root families learned | Visual map |

### For Teachers (Phase 2)

| Feature | Description |
|---------|-------------|
| **Class creation** | Teacher generates class code, students join |
| **Aggregate dashboard** | Cards learned, accuracy, active students (all anonymous) |
| **Lesson assignment** | "Complete Lesson 3 by Friday" |
| **Struggling alerts** | "5 students have >30% lapse rate on Lesson 2" |
| **Export class data** | CSV export for teacher's own analysis |

### Privacy Principles

1. **No data leaves the device without explicit consent**
2. Teacher sees aggregate stats, never individual review details
3. Student can leave a class at any time (data stays local)
4. No ads, no tracking, no analytics SDKs
5. Open-source = auditable privacy

---

## Open Platform Vision

### The "Duolingo for Qur'anic Arabic — but open" idea

The app is a **player** (like a podcast app or Anki). It plays **courses** (like podcast feeds or Anki decks). Anyone can create a course.

### Course Creator Workflow

```
Teacher writes content (Markdown/YAML/JSON)
    ↓
Runs course-creator CLI tool
    ↓
Tool generates audio (via edge-tts), validates content, packages into .lqwg file
    ↓
Teacher distributes .lqwg file (GitHub, website, email, app catalogue)
    ↓
Students install course in app
    ↓
App treats it like any other course (SRS, audio, progress tracking)
```

### Example Course Creators

| Creator | Course | Content |
|---------|--------|---------|
| Siraj Samsudeen | "Learn Qur'an Without Grammar" | Root-family-based Qur'anic Arabic |
| Understand Quran org | "Understand Quran Course" | Word-frequency-based Qur'anic vocabulary |
| Weekend Islamic School | "Grade 5 Arabic" | Textbook-aligned content |
| Community volunteer | "Juz Amma Vocabulary" | Focus on last 30th of Quran |
| University Arabic dept | "Classical Arabic 101" | Academic Qur'anic Arabic |

### What the Platform Provides

1. **Content format spec** — documented, versioned, validated
2. **CLI tool** — generates audio, validates, packages
3. **App player** — installs courses, runs SRS, tracks progress
4. **Course catalogue** (Phase 3) — discover and install community courses

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | Expo (React Native) | Cross-platform, managed workflow, OTA updates |
| **Language** | TypeScript | Type safety, ecosystem, `ts-fsrs` compatibility |
| **Database** | `expo-sqlite` | Native SQLite, synchronous API, Drizzle ORM support |
| **SRS Engine** | `ts-fsrs` v5.0 | FSRS algorithm, MIT license, actively maintained |
| **Audio Playback** | `react-native-track-player` | Background audio, lock screen controls, queue management |
| **TTS (runtime)** | `react-native-tts` | On-device TTS fallback for any language |
| **TTS (build-time)** | `edge-tts` (Python) | Pre-generate high-quality translation MP3s |
| **Qur'anic Audio** | EveryAyah CDN (build-time download) | 12+ reciters, free, stable |
| **Navigation** | React Navigation v7 | Standard for Expo apps |
| **State Management** | Zustand or React Context | Simple, no boilerplate |
| **i18n** | `i18next` + `react-i18next` | Mature, supports RTL |
| **File System** | `expo-file-system` | Audio caching, data export |
| **OTA Updates** | `expo-updates` | Push new lessons without app store review |
| **Build/Deploy** | EAS Build + EAS Submit | Cloud CI/CD for iOS + Android |

### Build Pipeline

```
Content (Markdown/YAML)
    ↓
build-lesson-audio.py (existing tool, extended)
    ↓
Generates: trimmed Arabic MP3s + English/Tamil/Urdu TTS MP3s + manifest.json
    ↓
Packages into lesson bundle
    ↓
Bundled into app (Lesson 1) or hosted for download (Lessons 2+)
    ↓
Expo build → iOS + Android binaries
    ↓
EAS Submit → App Store + Play Store
    ↓
New lessons deployed via expo-updates (no store review needed)
```

---

## Non-Requirements

Things we are **explicitly not building** (to maintain focus):

| Not Building | Why |
|-------------|-----|
| Server/backend | Zero cost, full privacy, offline-first |
| User accounts/auth | No server = no accounts. Data is local. |
| Social features | Not a social app. Learning is personal. |
| Grammar instruction | Fundamental to our pedagogy — no grammar ever |
| Tajweed analysis | Different domain — use Tarteel |
| Quran reader | Different use case — use Quran.com |
| Chat/AI tutor | Adds complexity, needs server, not core |
| Transliteration | Students should learn Arabic script, not avoid it |
| Video content | Audio-first design; video adds storage/bandwidth burden |
| Real-time sync | No server; export/import is sufficient |
| Gamification (streaks, XP, leagues) | Opt-in streak only; no addictive dark patterns |

---

## Success Metrics

### MVP Success (3 months post-launch)

| Metric | Target |
|--------|--------|
| Downloads | 500+ |
| Daily active users | 50+ |
| Lesson completion rate (Lesson 1) | 80%+ |
| 7-day retention | 40%+ |
| 30-day retention | 20%+ |
| Average daily study time | 5+ minutes |
| App store rating | 4.5+ stars |

### Phase 2 Success (6 months)

| Metric | Target |
|--------|--------|
| Total lessons available | 20+ |
| Multi-language users (TA/UR) | 100+ |
| Teacher accounts | 5+ |
| Classes created | 10+ |

### Phase 3 Success (12 months)

| Metric | Target |
|--------|--------|
| Third-party courses created | 3+ |
| Total users across all courses | 5,000+ |
| Community translations | 5+ languages |

---

## Open Questions

These need answers before or during Phase 1 development:

| # | Question | Impact | Who Decides |
|---|----------|--------|-------------|
| 1 | **How many lessons before launch?** 5? 10? 20? | Content pipeline throughput | Siraj |
| 2 | **iOS-first or both platforms simultaneously?** | Development speed vs reach | Siraj + mentor |
| 3 | **App name?** "Learn Qur'an Without Grammar" is long. "Siraj" (path)? Something else? | Branding, app store | Siraj |
| 4 | **Pre-bundle audio or download-on-demand?** | App size (30MB vs 200MB+) | Technical trade-off |
| 5 | **How to handle lesson updates?** OTA via expo-updates? Re-download lesson pack? | Content versioning | Technical |
| 6 | **Review card: show Arabic text or audio-only?** | Pedagogy — audio-only is harder but more effective | Siraj |
| 7 | **Should the app also host the course website content?** (course intro, how to study) | Scope | Siraj |
| 8 | **What's the migration path from current website users?** | User retention | Siraj |
| 9 | **Should FSRS parameters be tunable by teachers?** | Complexity vs flexibility | Phase 2 decision |
| 10 | **Monetisation model?** Free forever? Donations? Premium courses? | Sustainability | Siraj + mentor |

---

## Appendix: Glossary

| Term | Definition |
|------|-----------|
| **Anchor phrase** | A phrase from daily worship (adhān, ṣalāh) that the student already knows |
| **Root** | An Arabic root word family (e.g., كَبُرَ) from which multiple forms derive |
| **Form** | A specific derivation of a root (e.g., أَكْبَر, كَبِير, الْكِبْرِيَاء from root كَبُرَ) |
| **Sentence pair** | Arabic audio clip + translation audio clip — the atomic unit of learning |
| **Card** | A sentence pair registered in the SRS system for spaced review |
| **FSRS** | Free Spaced Repetition Scheduler — the algorithm used for review scheduling |
| **Lesson pack** | Downloadable bundle containing all content + audio for one lesson |
| **Course** | A complete collection of lesson packs (e.g., "Learn Qur'an Without Grammar" = 50 lessons) |
| **edge-tts** | Microsoft's text-to-speech engine used at build time to generate translation audio |
| **EveryAyah** | CDN providing Qur'anic recitation audio from 40+ reciters |

---

*This document is the authoritative source for what we're building. All design decisions should trace back to a requirement here.*
