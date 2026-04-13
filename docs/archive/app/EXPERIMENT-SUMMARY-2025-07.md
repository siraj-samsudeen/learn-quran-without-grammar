# Experiment Summary: Offline-First Mobile App with Convex

**Date:** July 2025  
**Status:** Proof-of-concept validated  
**Files created during this experiment:** See appendix at bottom

---

## What We Set Out to Answer

1. Can Convex handle offline-first sync for an SRS study app?
2. What's the best architecture for serving lessons on both browser and mobile?
3. Can we avoid the expensive audio build pipeline (stitching, concatenating)?
4. What content format should we author in?

---

## Answer 1: Convex Offline Sync — YES, It Works

**Convex does NOT have native offline support.** But we proved a simple pattern that works:

```
All writes → local store FIRST (IndexedDB on web, expo-sqlite on mobile)
  ↓
Sync queue tracks unsynced reviews
  ↓
When online → flush queue to Convex via bulkSyncReviews mutation
  ↓
On app open → pull server state, merge into local
```

### What was tested (playground/)

| Test | Result |
|------|--------|
| Online write → Convex | ✅ Instant, data in dashboard |
| Local-first write (UI speed) | ✅ Instant, no spinners |
| Offline write (DevTools offline) | ✅ Writes to IndexedDB, UI updates |
| Reconnect → auto-sync | ✅ Pending reviews flush to Convex |
| Cross-tab sync | ✅ Data appears in second tab |

### Why NOT CRDTs

SRS review data is **append-only** (each review is an immutable event). No conflicts possible. Card state uses "more reviews wins." CRDTs are overkill.

### Alternatives evaluated

| Option | Verdict |
|--------|---------|
| **Convex + local store** | ✅ Chosen. Pattern proven. Free tier sufficient. |
| `@trestleinc/replicate` | Too young (~10 months). Uses Yjs CRDTs — unnecessary for append-only data. Svelte-focused. |
| PowerSync + Supabase | Good but adds paid dependency + complex setup. |
| InstantDB | Partial offline only (cache, no offline writes). |

### Convex schema

```typescript
// convex/schema.ts
cardReviews: defineTable({
  cardId: v.string(),       // "lesson-01-phrase-03"
  lessonId: v.string(),     // "lesson-01"
  rating: v.number(),       // 1-4 (Again/Hard/Good/Easy)
  reviewedAt: v.number(),   // timestamp
  deviceId: v.string(),     // device identifier
  syncedAt: v.optional(v.number()),
})

cardState: defineTable({
  cardId: v.string(),
  lessonId: v.string(),
  totalReviews: v.number(),
  lastReviewedAt: v.number(),
  lastRating: v.number(),
})
```

### Key Convex functions

- `recordReview` — single review mutation
- `bulkSyncReviews` — batch sync (for offline queue flush)
- `getCardStates` — query card states for a lesson
- `getAllCardStates` — query all card states (full sync on app open)

---

## Answer 2: One Expo Codebase → Web + Android + iOS

**Decision:** Use Expo/React Native for all three platforms. Jekyll becomes optional (marketing/existing users).

```
One Codebase (Expo / React Native)
  ├──→ Web (any free host — Vercel, Netlify, GitHub Pages)
  ├──→ Android (Play Store, $25 one-time)
  └──→ iOS (App Store, $99/year)
```

### Why not keep Jekyll for browser?

Jekyll was a stepping stone. The Expo web build gives the same browser experience AND shares code with mobile. Students visit the web URL and get the full lesson. Students who want offline mobile download the app. Same progress syncs via Convex.

### Cost breakdown

| Component | Cost |
|-----------|------|
| Convex (free tier) | $0 — 1M calls/month, 1GB storage |
| GitHub (content hosting) | $0 |
| EveryAyah CDN (Arabic audio) | $0 — free, public |
| edge-tts (translation audio) | $0 — runs on author's machine |
| Google Play | $25 one-time |
| Apple Developer | $99/year (only if needed) |
| Virtual server | **Not needed** — Convex is the server |

---

## Answer 3: Audio Architecture — No More Stitching

### Old pipeline (per lesson)
```
Author's machine:
  1. Download Arabic from EveryAyah CDN
  2. Clip to timestamps
  3. Generate English TTS (edge-tts)
  4. Generate Tamil TTS (edge-tts)
  5. Stitch: Arabic + 2s silence + TTS → combined pair MP3
  6. Concatenate all pairs → full-lesson MP3
  7. Upload everything to GitHub
```

### New pipeline (per lesson)
```
Author's machine:
  1. Generate English TTS (edge-tts) → small MP3 per card
  2. Generate Tamil TTS (edge-tts) → small MP3 per card
  3. Upload TTS files to GitHub

App at runtime:
  1. Arabic recitation → streams from EveryAyah CDN (free)
  2. Pause → app logic (2 seconds)
  3. Translation → plays pre-built TTS MP3 from GitHub
```

### Size comparison (Lesson 1)

| | Old (combined pairs) | New (separate) |
|---|---|---|
| Arabic audio | Embedded in pairs | From CDN (0 bytes stored) |
| EN translation TTS | Embedded in pairs | **456 KB** (12 files) |
| TA translation TTS | Embedded in pairs | **468 KB** (12 files) |
| Full-lesson concatenated MP3 | 2.1 MB EN + 2.2 MB TA | **Not needed** |
| **Total per lesson** | **~4.3 MB** | **~972 KB** |

### What still needs pre-building

- **Translation TTS MP3s** — edge-tts quality is much better than on-device TTS (tested and confirmed: device TTS is bad)
- **Teaching phrases** — non-Qur'anic Arabic text needs Arabic TTS (can't come from EveryAyah)

### What comes from CDN at runtime

- **All Qur'anic recitations** — EveryAyah provides per-ayah audio for 12+ reciters
- The app knows which reciter to use from the lesson YAML (`reciter` field)
- URL pattern: `https://everyayah.com/data/{reciter}/{surah_padded}{ayah_padded}.mp3`

### Current limitation

Some cards use **partial ayah clips** (e.g., `start: 20.2, end: 24` for a specific phrase within a long ayah). EveryAyah serves full ayahs only. Options:
- Accept full ayah playback (most phrases are full ayahs anyway)
- Pre-build only the few partial clips
- Use the Quran Foundation word-level audio API (if available)

---

## Answer 4: Content Format — Enriched YAML

### Decision

Author lessons in a single YAML file per lesson that contains **everything**: prose, root explanations, vocabulary, cards, hooks, quiz, closing. The YAML is the single source of truth.

### File location

`tools/lesson-content/lesson-01.yaml`

### Structure

```yaml
lesson_id: lesson-01
title: "Lesson 1: Allāhu Akbar"
slug: lesson-01-allahu-akbar
description: "..."

intro:
  en: |
    English introduction prose with **markdown bold**...
  ta: |
    Tamil introduction prose...

preview:
  en: "..."
  ta: "..."

anchor:
  arabic: "اللهُ أَكْبَرُ"
  en: "Allah is Greater"
  ta: "..."
  context: { en: "...", ta: "..." }

roots:
  - id: root-ilah
    root_letters: "أ ل ه"
    root_name: "إِلَٰه"
    meaning: "god"
    explanation: { en: "...", ta: "..." }
    vocabulary:
      - arabic: "إِلَٰه"
        transliteration: "ilāh"
        en: "god"
        ta: "கடவுள்"
        ta_transliteration: "இலாஹ்"
    cards:
      - id: anchor-ilah
        role: anchor
        form: "إِلَٰه"
        ref: "59:22"
        reciter: Hani_Rifai_192kbps
        arabic_source: { surah: 59, ayah: 22, end: 5.5 }
        arabic_text: "هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ"
        en: "He is Allah — there is no god but He"
        ta: "..."
        hook:
          en: "Six words that contain the entire message of tawḥīd."
          ta: "..."

practice:
  intro: { en: "...", ta: "..." }
  cards: [...]

quiz:
  intro: { en: "...", ta: "..." }
  items:
    - arabic_context: "هُوَ اللَّهُ الَّذِي لَا **إِلَٰهَ** إِلَّا هُوَ"
      highlighted_word: "إِلَٰهَ"
      answer_en: "god"
      answer_ta: "கடவுள்"

closing: { en: "...", ta: "..." }
next_lesson: { en: "...", ta: "..." }
```

### Bilingual pattern

All text content uses the `{ en: "...", ta: "..." }` pattern. Prose uses YAML block literals (`|`) which preserve line breaks and allow **markdown bold**.

### What's NOT in the YAML

- "How to study" guide → app-level content, not per-lesson
- Review/Summary sections → app features generated from card data
- Audio file paths/durations → computed at runtime (CDN URLs + TTS URLs)

### Build process

```bash
# 1. Author the YAML
vim tools/lesson-content/lesson-02.yaml

# 2. Generate translation TTS
python3 tools/generate-lesson-tts.py tools/lesson-content/lesson-02.yaml
# → outputs: assets/tts/lesson-02/{card-id}-en.mp3, {card-id}-ta.mp3

# 3. Convert YAML → JSON for the app
python3 -c "import yaml, json; ..."
# → outputs: lesson-02.json (consumed by the app)

# 4. Push TTS files + JSON to GitHub
```

---

## Files Created During This Experiment

### Convex Offline Sync Test (`playground/`)

| File | Purpose |
|------|---------|
| `playground/convex/schema.ts` | Convex schema: `cardReviews` + `cardState` tables |
| `playground/convex/cardReviews.ts` | Mutations: `recordReview`, `bulkSyncReviews`. Queries: `getCardStates`, `getAllCardStates`, `getCardReviews` |
| `playground/src/offlineStore.ts` | IndexedDB local persistence layer (reviews + card state + sync queue) |
| `playground/src/useOfflineSync.ts` | React hook bridging local IndexedDB ↔ Convex cloud |
| `playground/src/App.tsx` | Test UI with 8 word cards + rating buttons + sync status |

### Expo App Prototype (`playground-app/`)

| File | Purpose |
|------|---------|
| `playground-app/App.tsx` | Entry point — loads lesson JSON, renders LessonScreen |
| `playground-app/src/types.ts` | TypeScript types for lesson data (Lesson, Card, RootSection, etc.) |
| `playground-app/src/audio.ts` | Audio URL construction (EveryAyah CDN for Arabic, GitHub for TTS) + sequenced playback |
| `playground-app/src/LessonScreen.tsx` | Full lesson renderer: intro, roots, vocab tables, cards with audio, sequential player, quiz, closing |
| `playground-app/assets/lesson-01.json` | Lesson 1 content as JSON (converted from YAML) |
| `playground-app/assets/tts/lesson-01/*.mp3` | 24 translation-only TTS files (12 EN + 12 TA, ~972KB total) |

### Content & Documentation

| File | Purpose |
|------|---------|
| `tools/lesson-content/lesson-01.yaml` | Enriched YAML — full lesson content (prose, cards, hooks, quiz, closing) |
| `docs/app/ADR-008-offline-sync-convex.md` | Architecture Decision Record for offline sync approach |
| `docs/app/LESSON-TO-APP-WALKTHROUGH.md` | Step-by-step walkthrough of what changes for cross-platform |
| `docs/app/EXPERIMENT-SUMMARY-2025-07.md` | This document |

---

## What's Next (Ordered by Priority)

### Phase 1: Polish the Expo app prototype
- Switch from combined pair MP3 fallback to separate Arabic (CDN) + TTS (GitHub) playback
- Host TTS files on GitHub and update URLs
- Add local caching so audio downloads once and works offline
- Improve card UI (better Arabic font, spacing, animations)

### Phase 2: Add offline state tracking
- Port the IndexedDB offline store from `playground/` to `expo-sqlite` in `playground-app/`
- Connect to the same Convex backend
- Track which cards studied, how many times, last rating
- Show progress indicators on cards and lesson list

### Phase 3: Build the TTS generation script
- `tools/generate-lesson-tts.py` — reads lesson YAML, generates translation-only TTS MP3s via edge-tts
- Also generates `lesson-NN.json` for the app
- Replaces the current `build-lesson-audio.py` for app purposes

### Phase 4: Multi-lesson & navigation
- Lesson list / home screen
- Lesson download manager (download TTS files on demand)
- Progress dashboard across lessons

### Phase 5: Auth & cross-device sync
- Convex Auth (email magic link)
- Tie reviews to userId
- Same progress on phone and browser

### Phase 6: SRS scheduling
- Integrate `ts-fsrs` into local store
- Rating buttons on cards feed into SRS algorithm
- "Review due today" screen
- Spaced repetition intervals

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Convex for cloud sync | Already familiar, free tier sufficient, proven in test |
| Local-first with manual sync (not CRDTs) | Append-only review data has no conflicts |
| Expo for all platforms | One codebase → web + Android + iOS |
| Arabic audio from EveryAyah CDN at runtime | Free, no build step, multiple reciters |
| Translation TTS pre-built with edge-tts | Device TTS quality is bad; edge-tts is free and excellent |
| No audio stitching | App plays Arabic → pause → TTS sequentially at runtime |
| YAML as content source of truth | Rich enough for prose + structured data; JSON generated from it |
| Jekyll site untouched | Existing users continue using it; Expo web eventually replaces it |

---

## Commands Reference

```bash
# Run the Convex offline sync test (Vite app)
cd playground && npm run dev

# Run the Expo lesson app (web)
cd playground-app && npx expo start --web

# Run on Android (requires Expo Go or dev build)
cd playground-app && npx expo start --android

# Generate translation TTS for a lesson
edge-tts --voice "en-US-AndrewMultilingualNeural" --text "..." --write-media output.mp3
edge-tts --voice "ta-IN-ValluvarNeural" --text "..." --write-media output.mp3

# Convert lesson YAML to JSON
python3 -c "
import yaml, json
with open('tools/lesson-content/lesson-01.yaml') as f:
    data = yaml.safe_load(f)
with open('playground-app/assets/lesson-01.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
"

# Deploy Convex functions
cd playground && npx convex dev --once
```
