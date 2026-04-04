# Technical Architecture Research: Expo Offline-First Companion App

**Project:** Learn Qur'an Without Grammar — Mobile Companion App  
**Date:** July 2025  
**Status:** Research complete, ready for implementation planning

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [expo-sqlite & Drizzle ORM](#2-expo-sqlite--drizzle-orm)
3. [Data Model for SRS](#3-data-model-for-srs)
4. [react-native-track-player](#4-react-native-track-player)
5. [Text-to-Speech Strategy](#5-text-to-speech-strategy)
6. [edge-tts Build Pipeline](#6-edge-tts-build-pipeline)
7. [Offline Caching & File Management](#7-offline-caching--file-management)
8. [Content Packaging & Distribution](#8-content-packaging--distribution)
9. [Data Export & Import](#9-data-export--import)
10. [OTA Updates via expo-updates](#10-ota-updates-via-expo-updates)
11. [Recommended Architecture](#11-recommended-architecture)
12. [Performance & Storage Estimates](#12-performance--storage-estimates)
13. [Edge Cases & Failure Modes](#13-edge-cases--failure-modes)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    EXPO APP (on device)                   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  expo-sqlite │  │ track-player │  │   expo-speech   │  │
│  │  + Drizzle   │  │  (audio)     │  │   (TTS fallback)│  │
│  │  + ts-fsrs   │  │              │  │                 │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                │                    │           │
│  ┌──────┴────────────────┴────────────────────┴────────┐ │
│  │              React Native UI Layer                   │ │
│  │         (expo-router, lesson screens, SRS)           │ │
│  └──────────────────────┬───────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────┴───────────────────────────────┐ │
│  │              expo-file-system                         │ │
│  │    (downloaded audio packs, cached lesson content)    │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌───────────┐ ┌──────────────┐
   │EveryAyah CDN│ │GitHub Rel.│ │ expo-updates  │
   │(Qur'an MP3) │ │(lesson    │ │ (JS bundle   │
   │             │ │ packs)    │ │  OTA)         │
   └─────────────┘ └───────────┘ └──────────────┘
```

**Key design principle:** Everything runs on-device. Network is only needed for initial content download and optional OTA updates. Once a lesson pack is downloaded, it works fully offline.

---

## 2. expo-sqlite & Drizzle ORM

### Current API (Expo SDK 55, expo-sqlite ~55.0.x)

The `expo-sqlite` package was completely rewritten in SDK 51+. The current API uses **synchronous database opening** with **async query methods**:

```typescript
import * as SQLite from 'expo-sqlite';

// Synchronous open — available immediately
const expoDb = SQLite.openDatabaseSync('quran-app.db');

// Async query methods
const rows = await expoDb.getAllAsync('SELECT * FROM cards WHERE due <= ?', [Date.now()]);

// execAsync for bulk operations (no parameter binding — use for DDL only)
await expoDb.execAsync(`PRAGMA journal_mode = WAL;`);

// runAsync for writes (returns lastInsertRowId, changes)
const result = await expoDb.runAsync(
  'INSERT INTO cards (lesson_id, sentence_id) VALUES (?, ?)',
  ['lesson-01', 'anchor-ilah']
);
```

There is also a fully synchronous API via `openDatabaseSync` + `.getAllSync()`, `.runSync()`, etc. — useful for blocking reads in non-UI contexts.

### WAL Mode

**Always enable WAL mode** on first database open. WAL (Write-Ahead Logging) provides:
- Concurrent reads during writes
- Better performance for mixed read/write workloads
- Crash safety (no corruption on unexpected shutdown)

```typescript
expoDb.execAsync('PRAGMA journal_mode = WAL;');
```

### Drizzle ORM Integration

Drizzle ORM works with `expo-sqlite` but has important caveats:

**Setup (current stable — drizzle-orm v0.38+, drizzle-kit v0.30+):**

```typescript
// db/client.ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const expoDb = SQLite.openDatabaseSync('quran-app.db');
export const db = drizzle(expoDb, { schema });
```

**Critical caveat:** The Drizzle `expo-sqlite` driver is currently **synchronous under the hood** — it uses `openDatabaseSync` and blocks the JS thread during queries. The `await` syntax is a thin wrapper. For our use case (small SRS dataset, < 10K rows), this is acceptable. For bulk operations (importing review history), wrap in `requestAnimationFrame` or use `InteractionManager.runAfterInteractions`.

**Migration strategy:** Drizzle Kit generates SQL migration files into a `drizzle/` folder. On app startup, run migrations:

```typescript
// db/migrate.ts
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';
import { db } from './client';

export async function runMigrations() {
  await migrate(db, migrations);
}
```

The `drizzle/migrations.js` file is auto-generated by `npx drizzle-kit generate`. Each migration is a numbered SQL file. **This is the recommended approach for mobile** — avoids the issues with Drizzle's `push` command on mobile.

**Alternative: skip Drizzle, use raw expo-sqlite.** Given the simplicity of our schema (4-5 tables), raw SQL with typed helpers may be simpler and avoids the Drizzle sync-blocking issue. Decision: **start with raw expo-sqlite**, add Drizzle later if schema grows.

### Performance Characteristics

- **SQLite on mobile handles millions of rows** without issue for simple queries.
- For our app: ~50 lessons × ~12 sentences = ~600 cards, ~10K review_log entries after a year of daily use. **Performance is not a concern.**
- Index `cards(due)` and `review_log(card_id, reviewed_at)` for fast lookups.
- **Bulk inserts**: use transactions — 1,000 inserts in a single transaction complete in <100ms on modern phones.

---

## 3. Data Model for SRS

### Schema (SQL)

```sql
-- Enable WAL mode
PRAGMA journal_mode = WAL;

-- Core SRS card table (maps to ts-fsrs Card interface)
CREATE TABLE IF NOT EXISTS cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id     TEXT NOT NULL,           -- 'lesson-01'
  sentence_id   TEXT NOT NULL,           -- 'anchor-ilah'
  -- ts-fsrs Card fields
  due           TEXT NOT NULL,           -- ISO 8601 datetime
  stability     REAL NOT NULL DEFAULT 0,
  difficulty    REAL NOT NULL DEFAULT 0,
  elapsed_days  INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  reps          INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  state         INTEGER NOT NULL DEFAULT 0,  -- 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review   TEXT,                    -- ISO 8601 datetime, NULL if never reviewed
  -- Denormalized content (for offline display without loading lesson JSON)
  arabic_text   TEXT,
  english_text  TEXT,
  UNIQUE(lesson_id, sentence_id)
);

CREATE INDEX idx_cards_due ON cards(due);
CREATE INDEX idx_cards_lesson ON cards(lesson_id);

-- Review history (for analytics and ts-fsrs parameter optimization)
CREATE TABLE IF NOT EXISTS review_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id     INTEGER NOT NULL REFERENCES cards(id),
  rating      INTEGER NOT NULL,          -- 1=Again, 2=Hard, 3=Good, 4=Easy
  state       INTEGER NOT NULL,          -- state BEFORE review
  due         TEXT NOT NULL,             -- due date BEFORE review
  stability   REAL NOT NULL,
  difficulty  REAL NOT NULL,
  elapsed_days INTEGER NOT NULL,
  scheduled_days INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL,             -- ISO 8601 when review happened
  duration_ms INTEGER                    -- time spent on card (optional)
);

CREATE INDEX idx_review_log_card ON review_log(card_id);
CREATE INDEX idx_review_log_date ON review_log(reviewed_at);

-- Lesson metadata and download state
CREATE TABLE IF NOT EXISTS lessons (
  id            TEXT PRIMARY KEY,        -- 'lesson-01'
  title         TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  is_bundled    INTEGER NOT NULL DEFAULT 0,  -- 1 if included in app binary
  is_downloaded INTEGER NOT NULL DEFAULT 0,
  download_size INTEGER,                 -- bytes
  downloaded_at TEXT
);

-- User settings
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Schema version tracking (if not using Drizzle migrations)
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

### ts-fsrs Integration

```typescript
import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';

const f = fsrs(); // Uses FSRS-6 defaults

// Create a new card when user starts a lesson
function createCardForSentence(lessonId: string, sentenceId: string) {
  const card = createEmptyCard(); // { due: now, stability: 0, difficulty: 0, ... }
  db.runSync(
    `INSERT INTO cards (lesson_id, sentence_id, due, stability, difficulty,
     elapsed_days, scheduled_days, reps, lapses, state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [lessonId, sentenceId, card.due.toISOString(), card.stability,
     card.difficulty, card.elapsed_days, card.scheduled_days,
     card.reps, card.lapses, card.state]
  );
}

// Process a review
function reviewCard(cardId: number, rating: Rating) {
  const row = db.getFirstSync('SELECT * FROM cards WHERE id = ?', [cardId]);
  const card: Card = {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };

  const now = new Date();
  const result = f.repeat(card, now);
  const updated = result[rating].card;
  const log = result[rating].log;

  db.runSync(
    `UPDATE cards SET due=?, stability=?, difficulty=?, elapsed_days=?,
     scheduled_days=?, reps=?, lapses=?, state=?, last_review=? WHERE id=?`,
    [updated.due.toISOString(), updated.stability, updated.difficulty,
     updated.elapsed_days, updated.scheduled_days, updated.reps,
     updated.lapses, updated.state, now.toISOString(), cardId]
  );

  // Log the review
  db.runSync(
    `INSERT INTO review_log (card_id, rating, state, due, stability,
     difficulty, elapsed_days, scheduled_days, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cardId, rating, log.state, log.due.toISOString(), log.stability,
     log.difficulty, log.elapsed_days, log.scheduled_days, now.toISOString()]
  );
}
```

---

## 4. react-native-track-player

### Package Status (v4.1 stable, v5 forthcoming)

- **Current stable:** `react-native-track-player@4.1.1` — 47K weekly npm downloads, 3.7K GitHub stars.
- **v5 announced** (commercial license, new architecture) but v4.1 is the production choice for now.
- **Requires Expo development build** — not compatible with Expo Go. Add to `app.json` plugins and run `npx expo prebuild`.

### Setup with Expo

```json
// app.json
{
  "expo": {
    "plugins": [
      [
        "react-native-track-player",
        {
          "android": {
            "foregroundServiceType": "mediaPlayback"
          }
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["audio"]
      }
    }
  }
}
```

```typescript
// service.ts — registered in index.js
import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.paused) {
      await TrackPlayer.pause();  // Phone call, other audio interruption
    } else if (event.permanent) {
      await TrackPlayer.stop();
    } else {
      await TrackPlayer.play();   // Resume after interruption
    }
  });
}
```

```typescript
// index.js
import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './service';

AppRegistry.registerComponent('main', () => App);
TrackPlayer.registerPlaybackService(() => PlaybackService);
```

### Background Audio & Lock Screen Controls

- **iOS:** Works automatically once `UIBackgroundModes: ["audio"]` is set. Lock screen shows track metadata (title, artist, artwork).
- **Android:** Uses a foreground service with a persistent notification. Notification shows play/pause/skip controls.
- **Audio focus:** The `RemoteDuck` event handles interruptions (phone calls, navigation audio, other apps). Configure with `TrackPlayer.updateOptions({ capabilities: [...] })`.

### Queue Management for Lesson Playback

The "Arabic clip → pause → English translation" pattern requires careful queue design:

**Approach: Silent tracks as pause separators**

```typescript
import TrackPlayer, { Track } from 'react-native-track-player';

interface LessonSentence {
  id: string;
  arabicAudioPath: string;  // local file path
  englishAudioPath: string; // local file path (pre-generated by edge-tts)
  arabicText: string;
  englishText: string;
}

async function buildLessonQueue(sentences: LessonSentence[]): Promise<Track[]> {
  const tracks: Track[] = [];

  for (const s of sentences) {
    // Arabic recitation clip
    tracks.push({
      id: `${s.id}-ar`,
      url: s.arabicAudioPath,          // file:///...
      title: s.arabicText,
      artist: 'Qur\'anic Recitation',
      artwork: require('../assets/quran-icon.png'),
    });

    // 2-second silence (a pre-generated silent MP3, bundled with app)
    tracks.push({
      id: `${s.id}-pause`,
      url: require('../assets/audio/silence-2s.mp3'),
      title: '...',
      artist: 'Pause',
    });

    // English translation audio
    tracks.push({
      id: `${s.id}-en`,
      url: s.englishAudioPath,
      title: s.englishText,
      artist: 'Translation',
    });

    // 3-second gap before next sentence pair
    tracks.push({
      id: `${s.id}-gap`,
      url: require('../assets/audio/silence-3s.mp3'),
      title: '...',
      artist: 'Gap',
    });
  }

  return tracks;
}

// Usage
await TrackPlayer.setupPlayer({ waitForBuffer: true });
await TrackPlayer.updateOptions({
  capabilities: [
    TrackPlayer.CAPABILITY_PLAY,
    TrackPlayer.CAPABILITY_PAUSE,
    TrackPlayer.CAPABILITY_SKIP_TO_NEXT,
    TrackPlayer.CAPABILITY_SKIP_TO_PREVIOUS,
  ],
  compactCapabilities: [
    TrackPlayer.CAPABILITY_PLAY,
    TrackPlayer.CAPABILITY_PAUSE,
  ],
});
const queue = await buildLessonQueue(lessonSentences);
await TrackPlayer.reset();
await TrackPlayer.add(queue);
await TrackPlayer.play();
```

**Alternative: use `PlaybackTrackChanged` event to programmatically pause.** Listen for track completion and insert a delay via `setTimeout` before calling `TrackPlayer.play()`. Downside: less reliable in background mode, the silent-track approach is more robust.

### Shuffle Mode

For "Review Shuffled" (random sentence pairs from all studied lessons):

```typescript
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Shuffle sentence pairs (keep Arabic-pause-English together)
const shuffledSentences = shuffleArray(allStudiedSentences);
const queue = await buildLessonQueue(shuffledSentences);
```

---

## 5. Text-to-Speech Strategy

### Two-Tier Approach

1. **Build-time (primary):** `edge-tts` generates high-quality MP3s for all three translation languages. These are included in lesson packs.
2. **Runtime fallback:** `expo-speech` (or `react-native-tts`) for on-device TTS when pre-generated audio is unavailable.

### expo-speech (Recommended over react-native-tts for Expo)

`expo-speech` is Expo's built-in TTS module — works in Expo Go, no config plugin needed, simpler API:

```typescript
import * as Speech from 'expo-speech';

// Check available voices
const voices = await Speech.getAvailableVoicesAsync();
const tamilVoices = voices.filter(v => v.language.startsWith('ta'));
const urduVoices = voices.filter(v => v.language.startsWith('ur'));
const englishVoices = voices.filter(v => v.language.startsWith('en'));

// Speak with specific voice
Speech.speak('And the remembrance of Allah is greater', {
  language: 'en-US',
  voice: 'com.apple.voice.compact.en-US.Samantha', // iOS
  rate: 0.9,
  onDone: () => console.log('Done speaking'),
  onError: (error) => console.log('TTS error:', error),
});
```

### Voice Availability by Platform

| Language | iOS | Android |
|----------|-----|---------|
| **English (en-US)** | Samantha (default), Siri voices (premium — user must download) | Google TTS built-in, multiple voices |
| **Tamil (ta-IN)** | iOS 16+: "Vani" voice available (compact quality). Premium voices via Settings → Accessibility → Spoken Content → Voices | Google TTS: "ta-IN" voices available if Google TTS data is installed |
| **Urdu (ur-PK)** | iOS 17+: basic Urdu voice available. Coverage is limited | Google TTS: "ur-PK" voices if language pack installed. Many Android devices have it pre-installed in South Asian markets |

### Fallback Strategy

```typescript
async function speakTranslation(text: string, lang: 'en' | 'ta' | 'ur'): Promise<boolean> {
  const langMap = { en: 'en-US', ta: 'ta-IN', ur: 'ur-PK' };
  const voices = await Speech.getAvailableVoicesAsync();
  const available = voices.some(v => v.language.startsWith(lang));

  if (available) {
    return new Promise((resolve) => {
      Speech.speak(text, {
        language: langMap[lang],
        rate: 0.9,
        onDone: () => resolve(true),
        onError: () => resolve(false),
      });
    });
  }

  // Fallback: try English if target language unavailable
  if (lang !== 'en') {
    console.warn(`No TTS voice for ${lang}, falling back to showing text only`);
    return false; // UI should show text with "no audio available" indicator
  }
  return false;
}
```

### Can TTS Output Be Cached to File?

**`expo-speech` cannot save to file.** It only plays through the device speaker.

**`react-native-tts`** also cannot natively save to file. There is a fork (`react-native-tts-export`) that adds file export, but it has 5 stars and is unmaintained.

**Recommendation:** Do NOT rely on runtime TTS file caching. Instead, pre-generate all translation audio at build time using `edge-tts`. Use on-device TTS only as a live fallback for display purposes (e.g., user taps a "hear this" button when offline without downloaded audio).

---

## 6. edge-tts Build Pipeline

### Available Voices

**Tamil (ta-IN):**
- `ta-IN-PallaviNeural` (Female) — good quality, clear pronunciation
- `ta-IN-ValluvarNeural` (Male) — good quality

**Urdu (ur-PK):**
- `ur-PK-AsadNeural` (Male) — good quality, natural prosody
- `ur-PK-UzmaNeural` (Female) — good quality

**English (en-US) — already in use:**
- `en-US-AvaNeural` (Female) — warm, expressive (current choice)
- `en-US-AndrewNeural` (Male) — clear, professional

### Build Pipeline

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────┐
│ lesson-NN.   │────▶│ build-lesson│────▶│ edge-tts     │────▶│ lesson     │
│ yaml         │     │ -audio.py   │     │ (3 languages)│     │ pack .zip  │
│ (definitions)│     │             │     │              │     │            │
└──────────────┘     └─────────────┘     └──────────────┘     └────────────┘
```

**Extended build script for multi-language TTS:**

```python
#!/usr/bin/env python3
"""build-lesson-audio-multilang.py — Generate TTS for EN, TA, UR"""

import asyncio
import edge_tts

VOICES = {
    'en': 'en-US-AvaNeural',
    'ta': 'ta-IN-PallaviNeural',
    'ur': 'ur-PK-UzmaNeural',
}

async def generate_tts(text: str, lang: str, output_path: str):
    voice = VOICES[lang]
    communicate = edge_tts.Communicate(text, voice, rate='-10%')
    await communicate.save(output_path)

async def build_lesson_tts(lesson_yaml: dict):
    tasks = []
    for sentence in lesson_yaml['sentences']:
        sid = sentence['id']
        # English
        if sentence.get('english'):
            tasks.append(generate_tts(
                sentence['english'], 'en',
                f"output/{sid}-en.mp3"
            ))
        # Tamil
        if sentence.get('tamil'):
            tasks.append(generate_tts(
                sentence['tamil'], 'ta',
                f"output/{sid}-ta.mp3"
            ))
        # Urdu (if present in YAML)
        if sentence.get('urdu'):
            tasks.append(generate_tts(
                sentence['urdu'], 'ur',
                f"output/{sid}-ur.mp3"
            ))
    await asyncio.gather(*tasks)
```

### Quality Notes

- **English:** Excellent — indistinguishable from human in short sentences.
- **Tamil:** Good — accent is natural, handles Tamil script well. Occasional issues with transliterated Arabic names (e.g., "Ibrahim" may have unexpected pronunciation).
- **Urdu:** Good — natural Nastaliq-influenced prosody. Handles Arabic loanwords well since Urdu TTS is trained on Arabic-origin vocabulary.
- **Arabic:** Not generated via TTS — we use actual Qur'anic recitations from EveryAyah CDN.

---

## 7. Offline Caching & File Management

### expo-file-system Directory Structure

```typescript
import * as FileSystem from 'expo-file-system';

const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;
const LESSONS_DIR = `${FileSystem.documentDirectory}lessons/`;

// Directory layout:
// {documentDirectory}/
// ├── audio/
// │   ├── lesson-01/
// │   │   ├── anchor-ilah-ar.mp3      (Arabic recitation)
// │   │   ├── anchor-ilah-en.mp3      (English TTS)
// │   │   ├── anchor-ilah-ta.mp3      (Tamil TTS)
// │   │   ├── anchor-ilah-ur.mp3      (Urdu TTS)
// │   │   ├── learn-ilah-01-ar.mp3
// │   │   ├── learn-ilah-01-en.mp3
// │   │   └── ...
// │   ├── lesson-02/
// │   │   └── ...
// │   └── shared/
// │       ├── silence-2s.mp3
// │       └── silence-3s.mp3
// ├── lessons/
// │   ├── lesson-01.json              (lesson manifest/content)
// │   ├── lesson-02.json
// │   └── ...
// └── quran-app.db                    (SQLite database)
```

### Download Manager

```typescript
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';

interface DownloadProgress {
  lessonId: string;
  totalFiles: number;
  downloadedFiles: number;
  totalBytes: number;
  downloadedBytes: number;
}

async function downloadLessonPack(
  lessonId: string,
  manifestUrl: string,
  onProgress: (p: DownloadProgress) => void,
  wifiOnly: boolean = true
): Promise<boolean> {
  // Check connectivity
  const netState = await NetInfo.fetch();
  if (wifiOnly && netState.type !== 'wifi') {
    throw new Error('WiFi-only download requested but not on WiFi');
  }

  // Fetch manifest
  const manifest = await fetch(manifestUrl).then(r => r.json());
  const lessonDir = `${AUDIO_DIR}${lessonId}/`;
  await FileSystem.makeDirectoryAsync(lessonDir, { intermediates: true });

  const progress: DownloadProgress = {
    lessonId,
    totalFiles: manifest.files.length,
    downloadedFiles: 0,
    totalBytes: manifest.totalSize,
    downloadedBytes: 0,
  };

  for (const file of manifest.files) {
    const localPath = `${lessonDir}${file.name}`;

    // Skip if already downloaded (resume support)
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size === file.size) {
      progress.downloadedFiles++;
      progress.downloadedBytes += file.size;
      onProgress({ ...progress });
      continue;
    }

    // Download with retry
    let retries = 3;
    while (retries > 0) {
      try {
        const download = FileSystem.createDownloadResumable(
          file.url,
          localPath,
          {},
          (dp) => {
            // Per-file progress callback
          }
        );
        await download.downloadAsync();
        progress.downloadedFiles++;
        progress.downloadedBytes += file.size;
        onProgress({ ...progress });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
      }
    }
  }

  // Update database
  db.runSync(
    'UPDATE lessons SET is_downloaded = 1, downloaded_at = ? WHERE id = ?',
    [new Date().toISOString(), lessonId]
  );

  return true;
}
```

### Storage Management

```typescript
async function getLessonStorageSize(lessonId: string): Promise<number> {
  const dir = `${AUDIO_DIR}${lessonId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return 0;

  // Calculate total size of all files in directory
  const files = await FileSystem.readDirectoryAsync(dir);
  let total = 0;
  for (const f of files) {
    const fi = await FileSystem.getInfoAsync(`${dir}${f}`);
    if (fi.exists && fi.size) total += fi.size;
  }
  return total;
}

async function deleteLessonAudio(lessonId: string): Promise<void> {
  const dir = `${AUDIO_DIR}${lessonId}/`;
  await FileSystem.deleteAsync(dir, { idempotent: true });
  db.runSync(
    'UPDATE lessons SET is_downloaded = 0, downloaded_at = NULL WHERE id = ?',
    [lessonId]
  );
  // Note: SRS data (cards, review_log) is NOT deleted — only audio files
}

async function getTotalAppStorage(): Promise<{ audio: number; database: number }> {
  const audioDir = await FileSystem.getInfoAsync(AUDIO_DIR);
  const dbFile = await FileSystem.getInfoAsync(
    `${FileSystem.documentDirectory}quran-app.db`
  );
  return {
    audio: audioDir.exists ? /* sum all files */ 0 : 0,
    database: dbFile.exists && dbFile.size ? dbFile.size : 0,
  };
}
```

### Storage Limits

- **iOS:** No hard limit. Apps can use as much storage as available. iOS may purge files in `cacheDirectory` under storage pressure, but `documentDirectory` is permanent (backed up to iCloud).
- **Android:** No hard limit on internal storage. Some Android versions show "App storage" in Settings. Users may manually clear app data.
- **Practical guideline:** Keep total lesson audio under 2 GB. A 50-lesson course with 3 language tracks ≈ 500 MB (see estimates below).

---

## 8. Content Packaging & Distribution

### Lesson 1: Bundled with App Binary

Lesson 1 must always be available (first-run experience):

```json
// app.json
{
  "expo": {
    "assetBundlePatterns": [
      "assets/bundled-lessons/**"
    ]
  }
}
```

Bundle structure:
```
assets/bundled-lessons/
├── lesson-01.json           (manifest + content)
└── lesson-01/
    ├── anchor-ilah-ar.mp3
    ├── anchor-ilah-en.mp3
    ├── anchor-ilah-ta.mp3
    ├── anchor-ilah-ur.mp3
    └── ... (all 12 sentence pairs × 4 audio files)
```

On first launch, copy bundled assets to `documentDirectory`:

```typescript
import { Asset } from 'expo-asset';

async function extractBundledLesson() {
  // Use expo-asset to get the bundled file URI, then copy to documentDirectory
  const asset = Asset.fromModule(require('../assets/bundled-lessons/lesson-01.json'));
  await asset.downloadAsync();
  // Copy to working directory...
}
```

**App binary size impact:** Lesson 1 with all 4 audio tracks (Arabic + 3 translations) for 12 sentences ≈ 8-12 MB. Acceptable for app store.

### Downloadable Lesson Packs: GitHub Releases

**Recommended hosting: GitHub Releases** on the existing project repository.

```
# Release naming: v1.0.0-lesson-02, v1.0.0-lesson-03, etc.
# Each release contains:
#   lesson-02-manifest.json   (file list, sizes, checksums)
#   lesson-02-pack.zip        (all audio files + lesson content JSON)

# Download URL pattern:
# https://github.com/{user}/{repo}/releases/download/{tag}/{filename}
```

**Why GitHub Releases:**
- Free, reliable, globally CDN'd via GitHub's infrastructure
- No server to maintain
- Version-controlled alongside source code
- 2 GB per file limit (more than enough)
- Direct download URLs (no authentication needed for public repos)

**Alternative for scale:** If download volumes become significant (>1 GB/day), switch to Cloudflare R2 (free egress) or a dedicated CDN.

### Content Manifest

```json
// hosted at a stable URL, checked periodically
// https://raw.githubusercontent.com/{user}/{repo}/main/content-manifest.json
{
  "version": 3,
  "lessons": [
    {
      "id": "lesson-01",
      "title": "Lesson 1: Allāhu Akbar",
      "version": 2,
      "bundled": true,
      "downloadUrl": null,
      "manifestUrl": null,
      "sizeBytes": 10485760
    },
    {
      "id": "lesson-02",
      "title": "Lesson 2: Bismillāh",
      "version": 1,
      "bundled": false,
      "downloadUrl": "https://github.com/.../releases/download/v1.0.0/lesson-02-pack.zip",
      "manifestUrl": "https://github.com/.../releases/download/v1.0.0/lesson-02-manifest.json",
      "sizeBytes": 9437184
    }
  ]
}
```

### Lesson Pack Format

**Recommended: Individual files (not zip).** Reasons:
- Simpler download/resume logic (retry individual files)
- Can show per-file progress
- Can partially download (e.g., only English TTS, skip Tamil/Urdu)
- No need for zip extraction library

Each lesson pack manifest:
```json
{
  "lessonId": "lesson-02",
  "version": 1,
  "totalSize": 9437184,
  "files": [
    { "name": "lesson-02.json", "url": "https://...", "size": 4096, "sha256": "abc..." },
    { "name": "anchor-hamid-ar.mp3", "url": "https://...", "size": 245760, "sha256": "def..." },
    { "name": "anchor-hamid-en.mp3", "url": "https://...", "size": 98304, "sha256": "ghi..." },
    { "name": "anchor-hamid-ta.mp3", "url": "https://...", "size": 102400, "sha256": "..." },
    { "name": "anchor-hamid-ur.mp3", "url": "https://...", "size": 106496, "sha256": "..." }
  ]
}
```

---

## 9. Data Export & Import

### Export

```typescript
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

async function exportUserData(): Promise<void> {
  // Gather all user data
  const cards = db.getAllSync('SELECT * FROM cards');
  const reviewLog = db.getAllSync('SELECT * FROM review_log');
  const settings = db.getAllSync('SELECT * FROM settings');
  const lessons = db.getAllSync('SELECT * FROM lessons');

  const exportData = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    cards,
    reviewLog,
    settings,
    lessons: lessons.map(l => ({ id: l.id, version: l.version })), // metadata only
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const filePath = `${FileSystem.cacheDirectory}quran-app-backup-${
    new Date().toISOString().split('T')[0]
  }.json`;

  await FileSystem.writeAsStringAsync(filePath, jsonStr);

  // Share via system share sheet (AirDrop, Email, Files, etc.)
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Export Study Progress',
      UTI: 'public.json',
    });
  }
}
```

### Import

```typescript
import * as DocumentPicker from 'expo-document-picker';

async function importUserData(): Promise<{ imported: number; skipped: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return { imported: 0, skipped: 0 };

  const jsonStr = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const data = JSON.parse(jsonStr);

  if (data.exportVersion !== 1) {
    throw new Error(`Unsupported export version: ${data.exportVersion}`);
  }

  let imported = 0;
  let skipped = 0;

  // Use a transaction for atomicity
  db.execSync('BEGIN TRANSACTION');
  try {
    for (const card of data.cards) {
      // Conflict resolution: keep the card with more reviews (more study progress)
      const existing = db.getFirstSync(
        'SELECT * FROM cards WHERE lesson_id = ? AND sentence_id = ?',
        [card.lesson_id, card.sentence_id]
      );

      if (existing) {
        if (card.reps > existing.reps) {
          // Imported card has more progress — update
          db.runSync(
            `UPDATE cards SET due=?, stability=?, difficulty=?, elapsed_days=?,
             scheduled_days=?, reps=?, lapses=?, state=?, last_review=?
             WHERE id=?`,
            [card.due, card.stability, card.difficulty, card.elapsed_days,
             card.scheduled_days, card.reps, card.lapses, card.state,
             card.last_review, existing.id]
          );
          imported++;
        } else {
          skipped++; // Local card has equal or more progress
        }
      } else {
        // New card — insert
        db.runSync(
          `INSERT INTO cards (lesson_id, sentence_id, due, stability, difficulty,
           elapsed_days, scheduled_days, reps, lapses, state, last_review)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [card.lesson_id, card.sentence_id, card.due, card.stability,
           card.difficulty, card.elapsed_days, card.scheduled_days,
           card.reps, card.lapses, card.state, card.last_review]
        );
        imported++;
      }
    }

    // Import review logs (append-only, skip duplicates by timestamp)
    for (const log of data.reviewLog) {
      const exists = db.getFirstSync(
        'SELECT 1 FROM review_log WHERE card_id = ? AND reviewed_at = ?',
        [log.card_id, log.reviewed_at]
      );
      if (!exists) {
        db.runSync(
          `INSERT INTO review_log (card_id, rating, state, due, stability,
           difficulty, elapsed_days, scheduled_days, reviewed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [log.card_id, log.rating, log.state, log.due, log.stability,
           log.difficulty, log.elapsed_days, log.scheduled_days, log.reviewed_at]
        );
      }
    }

    // Import settings (overwrite)
    for (const s of data.settings) {
      db.runSync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [s.key, s.value]
      );
    }

    db.execSync('COMMIT');
  } catch (err) {
    db.execSync('ROLLBACK');
    throw err;
  }

  return { imported, skipped };
}
```

### Conflict Resolution Strategy

| Scenario | Resolution |
|----------|-----------|
| Card exists on both devices | Keep the one with more `reps` (more study activity) |
| Card exists only in import | Insert it |
| Card exists only locally | Keep it (import doesn't delete) |
| Review logs | Append all, skip exact duplicates (same card_id + reviewed_at) |
| Settings | Import overwrites local (latest export wins) |

---

## 10. OTA Updates via expo-updates

### What CAN Be Updated OTA

| Updatable | Examples |
|-----------|---------|
| ✅ JavaScript bundle | All React Native code, business logic, UI screens |
| ✅ Static assets (images, fonts, JSON) | Lesson content JSON, UI images |
| ✅ JS-based configuration | SRS parameters, lesson definitions |
| ✅ New screens/features | Add a statistics screen, update review UI |

### What CANNOT Be Updated OTA

| Not Updatable | Examples |
|---------------|---------|
| ❌ Native modules | Adding a new native package (e.g., switching from expo-speech to react-native-tts) |
| ❌ Native configuration | ios/Info.plist changes, Android permissions |
| ❌ Expo SDK version | Major SDK upgrades |
| ❌ Large binary assets | Audio files > ~50 MB (update bundle has size limits) |

### Update Strategy for This App

```typescript
// In App.tsx or a startup hook
import * as Updates from 'expo-updates';

async function checkForUpdates() {
  if (__DEV__) return; // Skip in development

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Optionally notify user, then reload
      await Updates.reloadAsync();
    }
  } catch (err) {
    // Silently fail — app continues with current version
    console.log('Update check failed:', err);
  }
}
```

**Recommended update checking schedule:**
- Check on every app foreground (cold start and return from background)
- Don't block app launch — check in background, apply on next launch
- For lesson content updates: the content manifest JSON can be updated via OTA. New lesson JSON files and audio references ship with the JS bundle update. Actual audio MP3s are downloaded separately via the download manager.

### How Lesson Content Updates Work

1. **Fix a typo in lesson text:** Update lesson JSON → push OTA update → users get it within 24h.
2. **Add a new lesson:** Add lesson entry to content manifest + lesson JSON → push OTA update. Audio files remain separate downloads.
3. **Fix audio timing:** Re-generate the audio file → upload to GitHub Releases → update manifest URL in JS bundle → push OTA. Users re-download the lesson pack.

---

## 11. Recommended Architecture

### Project File Structure

```
quran-companion-app/
├── app/                           # expo-router screens
│   ├── (tabs)/
│   │   ├── _layout.tsx            # Tab navigator
│   │   ├── index.tsx              # Home: due cards count, start review
│   │   ├── lessons.tsx            # Lesson list: download/delete/status
│   │   ├── player.tsx             # Audio player: lesson playback
│   │   └── settings.tsx           # Settings: language, export/import
│   ├── lesson/[id].tsx            # Individual lesson view
│   ├── review.tsx                 # SRS review session
│   └── _layout.tsx                # Root layout
├── src/
│   ├── db/
│   │   ├── client.ts              # SQLite connection + WAL setup
│   │   ├── schema.sql             # Table definitions
│   │   ├── migrations/            # Versioned SQL migrations
│   │   │   ├── 001-initial.sql
│   │   │   └── 002-add-tamil.sql
│   │   └── migrate.ts             # Migration runner
│   ├── srs/
│   │   ├── engine.ts              # ts-fsrs wrapper (create/review cards)
│   │   ├── queries.ts             # getDueCards(), getStats(), etc.
│   │   └── types.ts               # Card, ReviewLog TypeScript types
│   ├── audio/
│   │   ├── player.ts              # TrackPlayer setup + queue builder
│   │   ├── service.ts             # Playback service (background events)
│   │   └── tts-fallback.ts        # expo-speech fallback logic
│   ├── download/
│   │   ├── manager.ts             # Download lesson packs
│   │   ├── storage.ts             # Storage size calculations
│   │   └── manifest.ts            # Fetch/parse content manifest
│   ├── export/
│   │   ├── export.ts              # Export user data to JSON
│   │   └── import.ts              # Import + conflict resolution
│   ├── content/
│   │   ├── lesson-loader.ts       # Load lesson JSON (bundled or downloaded)
│   │   └── types.ts               # Lesson, Sentence types
│   └── hooks/
│       ├── useReviewSession.ts    # SRS review flow hook
│       ├── useAudioPlayer.ts      # Player state hook
│       └── useDownloadManager.ts  # Download progress hook
├── assets/
│   ├── bundled-lessons/           # Lesson 1 (always offline)
│   │   ├── lesson-01.json
│   │   └── lesson-01/
│   │       └── *.mp3
│   ├── audio/
│   │   ├── silence-2s.mp3
│   │   └── silence-3s.mp3
│   └── images/
├── drizzle/                       # (optional) Drizzle migration files
├── tools/                         # Build-time scripts
│   ├── build-lesson-pack.py       # YAML → audio generation → pack
│   └── generate-tts-multilang.py  # edge-tts for EN/TA/UR
├── app.json
├── metro.config.js
├── tsconfig.json
└── package.json
```

### Key Dependencies

```json
{
  "dependencies": {
    "expo": "~55.0.0",
    "expo-sqlite": "~55.0.0",
    "expo-file-system": "~18.0.0",
    "expo-speech": "~13.0.0",
    "expo-sharing": "~13.0.0",
    "expo-document-picker": "~13.0.0",
    "expo-updates": "~0.27.0",
    "expo-router": "~4.0.0",
    "expo-asset": "~11.0.0",
    "react-native-track-player": "^4.1.1",
    "@react-native-community/netinfo": "~12.0.0",
    "ts-fsrs": "^5.3.1"
  }
}
```

### Component Architecture

```
┌─────────────────────────────────────────────────┐
│                   App Root                       │
│  - Run migrations on startup                     │
│  - Initialize TrackPlayer                        │
│  - Check for OTA updates                         │
│  - Extract bundled Lesson 1 if first run         │
└─────────────┬───────────────────────────────────┘
              │
    ┌─────────┼─────────┬──────────────┐
    ▼         ▼         ▼              ▼
┌────────┐┌────────┐┌──────────┐┌──────────┐
│ Home   ││Lessons ││ Player   ││ Settings │
│ Tab    ││ Tab    ││ Tab      ││ Tab      │
│        ││        ││          ││          │
│ Due    ││ List   ││ Now      ││ Language │
│ count  ││ with   ││ Playing  ││ pref     │
│        ││ DL     ││ + Queue  ││          │
│ Start  ││ status ││          ││ Export / │
│ Review ││        ││ Lock     ││ Import   │
│ button ││ Size   ││ screen   ││          │
│        ││ mgmt   ││ controls ││ Storage  │
└────────┘└────────┘└──────────┘└──────────┘
```

---

## 12. Performance & Storage Estimates

### Audio File Sizes (per sentence pair)

| Audio Type | Duration | Bitrate | Size |
|-----------|----------|---------|------|
| Arabic recitation (full ayah) | 5-15s avg | 128 kbps | 80-240 KB |
| English TTS (edge-tts) | 3-8s avg | 48 kbps* | 18-48 KB |
| Tamil TTS (edge-tts) | 3-10s avg | 48 kbps* | 18-60 KB |
| Urdu TTS (edge-tts) | 3-10s avg | 48 kbps* | 18-60 KB |

*edge-tts outputs 48 kbps MP3 by default. Sufficient quality for speech.

### Per-Lesson Estimates

| Component | Size |
|-----------|------|
| 12 Arabic recitation clips | ~1.8 MB |
| 12 English TTS clips | ~400 KB |
| 12 Tamil TTS clips | ~450 KB |
| 12 Urdu TTS clips | ~450 KB |
| Lesson JSON manifest | ~5 KB |
| **Total per lesson (all 3 languages)** | **~3.1 MB** |
| **Total per lesson (English only)** | **~2.2 MB** |

### Full Course Estimates

| Scenario | Size |
|----------|------|
| 50 lessons, all 3 languages | ~155 MB |
| 50 lessons, English only | ~110 MB |
| Bundled Lesson 1 (in app binary) | ~3 MB |
| SQLite database (50 lessons, 1 year reviews) | ~2 MB |
| **App binary (with Lesson 1)** | **~25-35 MB** |

### Database Performance

| Operation | Expected Time |
|-----------|--------------|
| Get due cards (`WHERE due <= now`) | <5 ms |
| Insert review log entry | <2 ms |
| Full table scan (600 cards) | <10 ms |
| Export all data to JSON (10K review logs) | <100 ms |
| Import + merge 10K review logs | <500 ms |

---

## 13. Edge Cases & Failure Modes

### Storage Full

```typescript
async function safeDownload(url: string, path: string): Promise<boolean> {
  try {
    await FileSystem.downloadAsync(url, path);
    return true;
  } catch (err) {
    if (err.message?.includes('No space left') || err.message?.includes('ENOSPC')) {
      // Show user-friendly message with current usage
      Alert.alert(
        'Storage Full',
        'Not enough space to download this lesson. Free up space by deleting unused lessons.',
        [{ text: 'Manage Storage', onPress: () => navigation.navigate('settings') }]
      );
      // Clean up partial download
      await FileSystem.deleteAsync(path, { idempotent: true });
      return false;
    }
    throw err;
  }
}
```

### TTS Voice Not Available

```typescript
async function getAvailableTTSLanguages(): Promise<Set<string>> {
  const voices = await Speech.getAvailableVoicesAsync();
  const langs = new Set<string>();
  for (const v of voices) {
    if (v.language.startsWith('en')) langs.add('en');
    if (v.language.startsWith('ta')) langs.add('ta');
    if (v.language.startsWith('ur')) langs.add('ur');
  }
  return langs;
}

// In UI: show "Download voice" prompt for unavailable languages
// On Android: link to Settings → Language → Text-to-Speech
// On iOS: link to Settings → Accessibility → Spoken Content → Voices
```

### Download Fails Mid-Way

- Each file is downloaded individually with retry logic (3 attempts per file).
- `createDownloadResumable` supports resume — if app is killed mid-download, the partial file can be resumed.
- The manifest tracks which files are complete. Re-running download skips completed files (size check).
- If a lesson pack is partially downloaded, the UI shows "Incomplete — tap to retry" rather than treating it as available.

### App Killed During Review

- Each review is committed to SQLite immediately after the user taps a rating button (within the same synchronous call).
- SQLite in WAL mode is crash-safe — partially written transactions are rolled back.
- No data loss even if the app is force-killed mid-session.

### No Network on First Launch

- Lesson 1 is bundled with the app binary — always available.
- SRS engine works entirely offline.
- Content manifest check fails silently — app shows only Lesson 1 with a "Connect to download more lessons" message.

### Audio Playback Interruptions

- `RemoteDuck` event with `paused: true` → auto-pause playback.
- `RemoteDuck` event with `permanent: true` (e.g., Bluetooth disconnected) → stop playback.
- `RemoteDuck` with neither → resume playback (e.g., after brief navigation audio).
- Phone call → iOS/Android automatically pause; RNTP resumes when call ends if `RemoteDuck` is handled correctly.

### Database Migration Failures

```typescript
async function runMigrationsWithRecovery(db: SQLiteDatabase) {
  const currentVersion = db.getFirstSync<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_version'
  )?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    try {
      db.execSync('BEGIN TRANSACTION');
      db.execSync(migration.sql);
      db.runSync(
        'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
        [migration.version, new Date().toISOString()]
      );
      db.execSync('COMMIT');
    } catch (err) {
      db.execSync('ROLLBACK');
      console.error(`Migration ${migration.version} failed:`, err);
      // Don't crash — app runs on last successful schema version
      // Report error for debugging
      break;
    }
  }
}
```

---

## Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | Raw `expo-sqlite` (not Drizzle) | Simpler for 4-5 tables; avoids Drizzle's sync-blocking gotcha |
| TTS at runtime | `expo-speech` (not `react-native-tts`) | Built into Expo, no config plugin, works in Expo Go for dev |
| TTS at build time | `edge-tts` (Python) | Free, excellent quality, all 3 languages supported |
| Audio player | `react-native-track-player` v4.1 | Only real option for background + lock screen + queue |
| Pause between clips | Silent MP3 tracks in queue | More reliable than programmatic delays in background mode |
| Lesson pack format | Individual files (not zip) | Resumable downloads, partial download support |
| Content hosting | GitHub Releases | Free, reliable, no server to maintain |
| OTA updates | `expo-updates` on every foreground | Lesson text fixes ship instantly; audio via separate download |
| Export format | JSON via `expo-sharing` | Universal, human-readable, works with email/AirDrop/Files |
| Conflict resolution | Keep card with more reviews | Preserves study progress from most-active device |
