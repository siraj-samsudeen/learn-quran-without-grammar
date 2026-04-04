# App Requirements — Learn Qur'an Without Grammar

**Date:** 2025-07-12  
**Status:** Draft — for discussion with mentor and research agents

---

## Vision

A companion app for "Learn Qur'an Without Grammar" that makes Qur'anic Arabic learning accessible through audio immersion, spaced repetition, and root-word-family teaching — in multiple languages (English, Tamil, Urdu), offline-first, with zero server costs.

The app should be usable not just by the original teacher, but by **any Arabic teacher** who wants to create and distribute their own course using this infrastructure.

---

## Core Principles

1. **Offline-first, zero server cost** — SQLite on device, free APIs only (EveryAyah, Quran Foundation)
2. **Audio is king** — The learning method is listening-based (Glossika/Assimil/Michel Thomas inspired)
3. **Multiple languages** — English, Tamil, Urdu immediately; architecture supports unlimited languages
4. **Open platform** — Any teacher can clone the repo and create their own course
5. **No grammar terminology** — The app teaches recognition through patterns, not rules
6. **Root-word families** — The organizing principle for vocabulary, not frequency lists

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Expo (React Native)** | Teacher knows it well, cross-platform, EAS Build |
| Storage | **expo-sqlite** | Offline-first, no server, fast |
| Audio | **react-native-track-player** | Background play, lock-screen controls, CDN streaming |
| TTS | **react-native-tts** (runtime) + **edge-tts** (build-time) | Free on-device TTS for playback; high-quality neural TTS for downloadable MP3s |
| SRS | **ts-fsrs** | State-of-the-art algorithm, TypeScript, 622 stars |
| State | **Zustand** | Simple, lightweight |
| Content updates | **expo-updates** (OTA) | New lessons without app store review |
| i18n | **react-i18next** | Proven, supports RTL |

---

## Feature Requirements

### MVP (Phase 1)

#### Lesson Reader
- [ ] Display lesson content (Arabic text, translation, root explanations, hooks)
- [ ] Language toggle: EN ↔ Tamil ↔ Urdu (remembers preference)
- [ ] Inline audio playback for each verse (EveryAyah CDN with `#t=` fragments, or cached local)
- [ ] Root word tables with meaning in active language
- [ ] Hide/show translations toggle
- [ ] Verse cards styled as in current Jekyll site

#### Audio Player
- [ ] Sequential playback: Arabic recitation → pause → translation TTS
- [ ] Translation TTS via on-device `react-native-tts` (language follows user preference)
- [ ] Shuffle mode (random order within a lesson)
- [ ] Background playback with lock-screen controls
- [ ] Download full-lesson MP3 for offline (pre-built with edge-tts)
- [ ] Filter by role: All / Learn / Practice

#### SRS & Review
- [ ] Track which phrases have been encountered (first encounter = State.New)
- [ ] Daily review queue: "Here are the phrases due today"
- [ ] Simple quiz: hear Arabic → select meaning from 4 choices (recognition)
- [ ] FSRS scheduling via ts-fsrs (desired_retention = 0.85)
- [ ] Pass/fail rating after quiz → updates FSRS card state
- [ ] "Mark as known" for salah phrases students already know

#### Progress & Motivation
- [ ] Phrases learned count (total + per lesson)
- [ ] Daily streak counter (1 review session = streak extended)
- [ ] Lesson progress: "7/12 phrases learned"

#### User Tags
- [ ] Mark phrases as: ⭐ Favorite / 🔴 Hard / ✅ Learnt
- [ ] Favorites playlist (devotional listening mode, not SRS-driven)
- [ ] "Hard" tag optionally decreases stability (shows up sooner)
- [ ] "Learnt" tag sets high initial stability (shows up rarely)

#### Offline Support
- [ ] All lesson content bundled in app
- [ ] Arabic audio cached locally after first play (expo-file-system)
- [ ] Translation TTS generated on-device (no network needed)
- [ ] Full SRS scheduling works offline

### Phase 2

#### Search & Browse
- [ ] Search by Arabic word, root, English/Tamil/Urdu meaning
- [ ] Browse by surah: "Show all phrases from Surah Al-Baqarah"
- [ ] Browse by root family: "Show all words from root ك ب ر"
- [ ] "These are my favorite surahs" personalization

#### User Profiles
- [ ] "What do you already know?" placement quiz on first launch
- [ ] Surah familiarity profile: "I often hear these surahs in salah"
- [ ] Learning level: Beginner / Intermediate / Advanced
- [ ] Daily goal setting: 5 / 10 / 15 minutes per day

#### Enhanced Quiz
- [ ] Multiple quiz types: audio → meaning, meaning → audio, multiple choice, type answer
- [ ] Response-time-based auto-rating (< 2s = Easy, < 5s = Good, > 5s = Hard)
- [ ] Quiz streaks and accuracy tracking
- [ ] Phrase-level play count analytics

#### Device Transfer
- [ ] Export all user data to JSON file
- [ ] Import from JSON file on new device
- [ ] Share via email/messaging

### Phase 3

#### Teacher Dashboard
- [ ] Firebase Analytics for aggregate student data (optional, adds cost)
- [ ] Per-lesson completion rates
- [ ] Most difficult phrases (highest lapse rate)
- [ ] Student activity trends
- [ ] Teacher can see which phrases need better hooks/explanations

#### Open Platform
- [ ] Content packaging format (YAML/JSON) that any teacher can author
- [ ] Course loader: switch between different teachers' courses
- [ ] Community translations: crowdsource Tamil, Urdu, Malay, etc.
- [ ] School mode: teacher creates a class, students join, teacher sees progress

#### Advanced Audio
- [ ] Word-by-word highlighting during playback (using Quran Foundation timestamps)
- [ ] Tajweed color coding
- [ ] Multiple reciter selection per phrase
- [ ] Speed control for Arabic playback

---

## Content Model

### Lesson package format

```yaml
lesson_id: lesson-01
title:
  en: "Lesson 1: Allahu Akbar"
  ta: "பாடம் 1: அல்லாஹு அக்பர்"
  ur: "سبق 1: اللہ اکبر"

roots:
  - arabic: "أ ل ه"
    transliteration: "alif lam ha"
    core_meaning:
      en: "worship, devotion"
      ta: "வணக்கம், பக்தி"
    forms:
      - arabic: "إِلَٰه"
        meaning: { en: "god", ta: "கடவுள்", ur: "خدا" }
      - arabic: "آلِهَة"
        meaning: { en: "gods", ta: "கடவுள்கள்", ur: "خدا" }

sentences:
  - id: anchor-ilah
    role: anchor
    root: "أ ل ه"
    form: "إِلَٰه"
    ref: "59:22"
    reciter: Hani_Rifai_192kbps
    arabic_source:
      surah: 59
      ayah: 22
      end: 5.5
    arabic_text: "هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ"
    translation:
      en: "He is Allah — there is no god but He"
      ta: "அவன் அல்லாஹ் — அவனைத் தவிர வேறு இறைவன் இல்லை"
      ur: "وہ اللہ ہے جس کے سوا کوئی معبود نہیں"
    hook:
      en: "This is the phrase to carry with you. Six words that contain the entire message of tawhid."
      ta: "இந்தச் சொற்றொடரை உங்களுடன் கொண்டு செல்லுங்கள். தவ்ஹீதின் முழுச் செய்தியும் ஆறு வார்த்தைகளில்."
```

### Data flow

```
Teacher writes lesson YAML (English master)
  ↓
LLM generates Tamil/Urdu translations (teacher reviews)
  ↓
Build script generates:
  - Downloadable MP3s (edge-tts for each language)
  - manifest.json with all translations
  ↓
App bundles content
  - JSON lesson data (all languages)
  - Pre-built Arabic audio (or streams from CDN)
  - Translation audio: on-device TTS at runtime
  ↓
App store / OTA update delivers to users
```

---

## Research Prompts for Deep-Dive Agents

### Agent 1: Glossika Deep Dive
Research every feature of Glossika (ai.glossika.com): sentence-based audio immersion method, SRS algorithm, how they handle 60+ languages, "Full Practice" vs "Listening Only" modes, spaced repetition scheduling, difficulty adaptation, how they pair native audio with translation, offline mode, progress tracking. Map every feature to our Qur'anic Arabic use case.

### Agent 2: Assimil + Michel Thomas Methodology
Research the Assimil method (passive→active waves, bilingual dialogues) and Michel Thomas method (no memorization, building-block approach). What makes them work for rapid language acquisition. How to digitize these approaches — what an app needs to replicate their learning loops. Reference: teacher reached B2 French in 8 months using these.

### Agent 3: Expo + SQLite Offline Architecture
Concrete architecture for Expo app with SQLite (expo-sqlite): schema design, TTS via react-native-tts for Tamil/Urdu/English, audio playback via react-native-track-player streaming from EveryAyah CDN, offline caching with expo-file-system, export/import user data (JSON file via share sheet or email), no server costs. How edge-tts fits (build-time only). Content packaging and OTA updates via expo-updates.

### Agent 4: Open Platform Design
How to make this app/infrastructure usable by other Arabic teachers. How another course creator clones the repo and creates their own course. Content packaging format. How a school could load Arabic textbook content. Internationalization architecture for unlimited languages. Open-source patterns (like Anki's shared deck ecosystem). The "Duolingo for Qur'anic Arabic — but open" vision.

---

## Key Decisions Still Open

1. **Firebase or no Firebase?** — Analytics for teacher dashboard adds server cost. Could use local-only analytics and export CSV for the teacher.
2. **Content format:** YAML (human-readable, git-friendly) vs JSON (smaller, faster parsing)?
3. **How does a new teacher onboard?** Fork the repo? Upload content to a marketplace?
4. **Monetization:** Free/donation (like Quran.com) or freemium? Affects architecture decisions.
5. **When to add Urdu?** Architecture should support it from day 1; content can come in Phase 2.
