# Research Synthesis — Companion App for Learn Qur'an Without Grammar

**Date:** 2025-07-12  
**Context:** Research conducted during Tamil translation implementation to evaluate whether to build a companion app and what architecture it should use.

---

## 1. Client-Side TTS — Eliminating Static Audio Builds

### Finding: Web Speech API can replace pre-built TTS for the web player

The browser's built-in `speechSynthesis` API supports Tamil (`ta-IN`) on all major platforms:
- **Android**: Google Tamil voice built-in (decent quality)
- **iOS**: Apple's Tamil voice (good quality)
- **Windows**: Microsoft Prabina (ta-IN) available as download
- **macOS**: System Tamil voice available

**Hybrid architecture** (recommended for web):
```
Arabic recitation (static MP3 from EveryAyah CDN)
  → 2s pause (setTimeout)
  → speechSynthesis.speak(translation_text)  ← live, no pre-built file needed
```

**What still needs pre-built TTS:** The downloadable `lesson-NN-full.mp3` for offline/car listening — because it's a single file that can't use browser TTS.

**Implication:** Adding a new language (Tamil, Urdu, Malay) to the web player = just adding a text field to the manifest JSON. No audio generation needed.

### For the React Native app

`react-native-tts` uses OS-level TTS engines (same voices as Web Speech API). Tamil and Urdu voices are available on Android and iOS. Quality is device-dependent but acceptable for translation audio.

`edge-tts` (Microsoft Neural voices) can only be used at **build time** (Python/Node), not from client-side code (CORS blocks it). Use it for:
- Generating downloadable full-lesson MP3s
- Generating high-quality audio for the app to cache locally

### Decision for the app

- **Interactive playback:** Use on-device TTS via `react-native-tts` (free, offline, instant)
- **Downloadable MP3s:** Pre-build with `edge-tts` at lesson creation time
- **Lesson YAML is the source of truth:** Contains text for all languages, used by both build-time TTS and runtime TTS

---

## 2. SRS — Spaced Repetition Scheduling

### Recommended algorithm: FSRS via `ts-fsrs`

**FSRS (Free Spaced Repetition Scheduler)** is the state-of-the-art SRS algorithm, now Anki's default since v23.10. Trained on 700 million reviews from 20,000 users.

- **TypeScript library:** `ts-fsrs` (622 GitHub stars, actively maintained)
- **npm:** `npm install ts-fsrs`
- **20-30% fewer reviews** than SM-2 for the same retention level
- **Configurable retention target:** Set to 0.85 for recognition tasks (vs default 0.90)

### Three-component memory model

| Variable | Meaning |
|---|---|
| **Retrievability (R)** | Probability of recall right now (decays over time) |
| **Stability (S)** | Days for R to drop from 100% to 90% |
| **Difficulty (D)** | Intrinsic difficulty of the card |

### For Qur'anic Arabic recognition

- **Recognition is 2-3x easier than recall** → set `desired_retention = 0.85` → fewer reviews
- **Rating system:** 3 buttons: "Didn't know" / "Got it" / "Easy" (maps to FSRS Again/Good/Easy)
- **Response time as signal:** < 2s = Easy, < 5s = Good, > 5s = Hard
- **Root family awareness:** Track phrases individually but note "family exposure" for siblings

### Data model (per phrase per user)

```typescript
interface UserCard {
  phraseId: string;         // 'lesson-03-phrase-07'
  // FSRS state
  due: Date;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: State;             // New | Learning | Review | Relearning
  // User tags
  tags: Set<'favorite' | 'hard' | 'learnt'>;
  // Analytics
  totalPlayCount: number;
  totalQuizAttempts: number;
  totalQuizCorrect: number;
}
```

### Storage estimate

2,400 phrases (200 lessons × 12) × ~200 bytes = ~480 KB for SRS state. With 5 years of review history: ~50 MB total. Easily fits in SQLite or IndexedDB.

---

## 3. App Technology — PWA vs React Native (Expo)

### Teacher's choice: React Native with Expo

The teacher knows React Native/Expo well. Key advantages:
- Background audio with lock-screen controls (`react-native-track-player`)
- Full offline support with SQLite (`expo-sqlite`)
- OTA content updates via `expo-updates` (no app store review for new lessons)
- EAS Build for cloud-based iOS/Android builds (no Mac required for iOS)

### Architecture

```
┌─────────────────────────────────────┐
│  Expo (React Native) App            │
├─────────────────────────────────────┤
│  UI: React components               │
│  - Lesson reader                    │
│  - Audio player with lock-screen    │
│  - Quiz / review screens            │
│  - Search / browse interface        │
├─────────────────────────────────────┤
│  State: Zustand or Redux Toolkit    │
│  - FSRS scheduler (ts-fsrs)        │
│  - Progress tracking                │
│  - Language preferences             │
├─────────────────────────────────────┤
│  Storage: expo-sqlite               │
│  - phrases, user_cards, review_log  │
│  - daily_activity, user_settings    │
├─────────────────────────────────────┤
│  Audio: react-native-track-player   │
│  - Stream from EveryAyah CDN        │
│  - Cache locally for offline        │
│  - On-device TTS for translations   │
├─────────────────────────────────────┤
│  Content: JSON manifests            │
│  - Bundled at build time            │
│  - Updated via expo-updates (OTA)   │
│  No server required for MVP!        │
└─────────────────────────────────────┘
```

### Arabic text rendering in React Native

React Native uses platform-native text rendering. Arabic with tashkeel works **if you bundle the right font** (Amiri, already used in the Jekyll site). Known issues:
- Some text clipping for specific phrases (RN issue #55220)
- RTL layout requires `I18nManager.forceRTL()` or per-component `writingDirection`
- Mixed Arabic + English per-screen works well with explicit `textAlign` and `writingDirection`

### Offline-first with no server costs

| Data | Storage | Sync |
|---|---|---|
| Lesson content (JSON) | Bundled in app + OTA | expo-updates (free tier: ~50 updates/month) |
| Arabic audio | EveryAyah CDN → local cache | Download once, cache in expo-file-system |
| TTS audio | On-device via react-native-tts | No sync needed |
| User progress | expo-sqlite | Export/import JSON for device transfer |
| Settings | expo-sqlite | Included in export/import |

### Device transfer (no server)

Options for transferring user data between devices:
1. **Export to JSON file** → share via email/messaging → import on new device
2. **QR code** containing a compact export URL
3. **Optional future:** Dexie Cloud or Firebase for real-time sync (adds server cost)

---

## 4. Competitive Landscape

### No existing app combines all three differentiators:

1. **Root-word-family teaching** — unique, no competitor does this
2. **Audio immersion (recitation + translation TTS)** — unique, all others treat Arabic audio and translation as separate
3. **Salah-first entry point** — validated by Quran Progress (500K+ users) and Understand Quran Academy

### Key competitors analyzed:

| App | What it does | Gap we fill |
|---|---|---|
| **Quran.com** | Reading/reference, 50+ translations, word-by-word | No active teaching, no SRS, no audio immersion |
| **Quranic** | Frequency-based vocabulary, SRS, 500K+ downloads | Word-list based (not root families), no audio immersion, no Tamil |
| **Quran Progress** | "125 words = 50%", salah-first, SRS | Word-list based, no root families, no audio immersion, no Tamil |
| **Tarteel AI** | AI recitation checking, memorization | For people who already read Arabic, not for understanding |
| **Bayyinah TV** | Video lectures, heavy grammar ($15/mo) | Opposite approach (grammar-heavy), passive, expensive |
| **Understand Quran** | Video courses, "50% of words in 9 hours" | Teacher's own teacher; video-based, no interactive app, no SRS |

### Tamil is massively underserved

- Quran.com has Tamil translations but no Tamil UI
- Standalone "Tamil Quran" apps exist (500K+ downloads) but are reading-only
- **No learning app supports Tamil as a primary language**
- Significant demand: physical "Qur'an Word-by-Word Translation in Tamil" book sells out

### UX patterns worth adopting

1. "X roots = Y% of the Quran" hook (like Quran Progress's "125 words = 50%")
2. 5-minute micro-session framing (Duolingo, Quran Progress)
3. Streaks and reading goals (Quran.com, Duolingo)
4. Word-by-word click-to-explore (Quran.com)
5. Offline-first architecture (critical for this audience)
6. Progress visualization (satisfying progress bars)
7. Two modes: Study (SRS-driven) + Listen (devotional, user-driven)

---

## 5. Audio Learning Methodologies

### Three methods that inform this course:

1. **Glossika** — Sentence-based audio immersion, SRS, 60+ languages. "Full Practice" (listen → repeat) and "Listening Only" modes. **Most similar to our approach.** Need deep-dive research.

2. **Assimil** — Passive → active waves. Listen to bilingual dialogues daily. First wave = passive comprehension. Second wave = active production. Known for rapid results.

3. **Michel Thomas** — No memorization pressure. Teacher builds complexity through "building blocks." Audio-only. The teacher takes responsibility for the student's learning.

### Key insight from teacher's experience

The teacher learned French to B2 level in 8 months using Assimil + Michel Thomas. This course applies the same principles to Qur'anic Arabic:
- **Repeated listening** (Glossika/Assimil pattern)
- **No memorization pressure** (Michel Thomas principle)
- **Root families as building blocks** (Michel Thomas "building block" approach adapted for Arabic)
- **Audio immersion** (Glossika's core methodology)

---

## 6. Open Platform Vision

### Design for other teachers to use

The infrastructure should allow:
- **Another teacher** (e.g., from understandquran.com) to clone the repo and create their own course
- **School Arabic teachers** to load textbook content into the same app framework
- **Content packaging format** that any teacher can author

### Content as data

```yaml
# Universal lesson format
lesson_id: lesson-01
title: "Lesson 1: Allāhu Akbar"
translations:
  en: "Lesson 1: Allahu Akbar"
  ta: "பாடம் 1: அல்லாஹு அக்பர்"
  ur: "سبق 1: اللہ اکبر"
sentences:
  - id: anchor-ilah
    arabic_text: "هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ"
    translations:
      en: "He is Allah — there is no god but He"
      ta: "அவன் அல்லாஹ் — அவனைத் தவிர வேறு இறைவன் இல்லை"
      ur: "وہ اللہ ہے جس کے سوا کوئی معبود نہیں"
    audio:
      reciter: Hani_Rifai_192kbps
      surah: 59
      ayah: 22
```

### Open-source model

Like Anki's shared deck ecosystem:
- Course creators author content in YAML/JSON
- App loads any course package
- Students can switch between courses
- Community can contribute translations

---

## Research Still Needed

The following require dedicated deep-dive agents:

1. **Glossika deep dive** — Every feature, methodology, UX pattern, how to adapt for Qur'anic Arabic
2. **Assimil + Michel Thomas analysis** — How to digitize these approaches for an app
3. **Expo + SQLite offline architecture** — Concrete implementation details, TTS integration, audio caching
4. **Open platform design** — How to make the app/content usable by other teachers
