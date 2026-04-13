# Audio Compilation System — Design Document

**Status:** Design complete, ready to build  
**Date:** 2025-04-02

---

## Overview

This system produces audio for two distinct listening modes:

1. **Sequential Download MP3** — a single file for phone/car background loop, playing every sentence in lesson order: `Arabic → 2s pause → English → 3s gap → next…`
2. **Random Repeat (Web Player)** — a JavaScript shuffle player embedded on the lesson page, playing sentence pairs randomly, eventually drawing from ALL lessons a student has covered

Both modes share the same underlying assets: individual sentence-pair MP3 files and a JSON manifest per lesson.

---

## Table of Contents

1. [English TTS Setup](#1-english-tts-setup)
2. [Arabic Clip Extraction](#2-arabic-clip-extraction)
3. [Asset Structure](#3-asset-structure)
4. [Lesson Audio Definition Format](#4-lesson-audio-definition-format)
5. [Build Script Design](#5-build-script-design)
6. [Web Player Design](#6-web-player-design)
7. [Cross-Lesson Manifest & Cumulative Review](#7-cross-lesson-manifest--cumulative-review)
8. [File Size Estimates](#8-file-size-estimates)
9. [Open Questions](#9-open-questions)

---

## 1. English TTS Setup

### Technology: edge-tts (Microsoft Azure Neural TTS)

**Why edge-tts:** Free, no API key, no account, excellent neural voice quality (same as Edge browser's Read Aloud). 400+ voices with rate/pitch control. Tested and compared against macOS `say` (robotic), gTTS (decent), OpenAI TTS (best but costs money), and Google Cloud TTS (overkill setup).

**Installation:**
```bash
pip3 install edge-tts
```

**Recommended voice:** `en-US-AvaNeural` — female, expressive, warm. Alternatives: `en-US-AndrewNeural` (male), `en-US-JennyNeural` (female, friendly), `en-GB-SoniaNeural` (British).

### Scripts in `tools/`

#### `tools/generate-tts.sh` — Single sentence

```bash
# Basic usage
./tools/generate-tts.sh "And the remembrance of Allah is greater" output.mp3

# With specific voice
./tools/generate-tts.sh "And the remembrance of Allah is greater" output.mp3 en-US-AvaNeural
```

If no voice is specified, picks randomly from a pool of male voices (Andrew, Brian, Christopher) for variety.

#### `tools/generate-tts-batch.py` — Batch generation

```bash
# Single file
python3 tools/generate-tts-batch.py "Text here" output.mp3

# Batch from JSON
python3 tools/generate-tts-batch.py --batch sentences.json --outdir ./audio/

# With specific voice for all files
python3 tools/generate-tts-batch.py --batch sentences.json --outdir ./audio/ --voice en-US-AvaNeural
```

**Batch JSON format:**
```json
[
  {"text": "And the remembrance of Allah is greater", "filename": "29-45-en.mp3"},
  {"text": "Grave is the word that comes out of their mouths", "filename": "18-5-en.mp3"}
]
```

### Direct edge-tts usage

```bash
# Basic
edge-tts --voice en-US-AvaNeural --text "Your text here" --write-media output.mp3

# Slower rate (for educational audio)
edge-tts --voice en-US-AvaNeural --rate=-10% --text "Your text here" --write-media output.mp3

# List all available voices
edge-tts --list-voices
```

---

## 2. Arabic Clip Extraction

### Source

All Quranic audio comes from the EveryAyah CDN:

```
https://everyayah.com/data/Husary_128kbps/{SSS}{AAA}.mp3
```

Where `SSS` = 3-digit surah, `AAA` = 3-digit ayah. Example: surah 21, ayah 87 → `021087.mp3`.

### Download a full ayah

```bash
curl -o 021087.mp3 "https://everyayah.com/data/Husary_128kbps/021087.mp3"
```

Or with wget:
```bash
wget -O 021087.mp3 "https://everyayah.com/data/Husary_128kbps/021087.mp3"
```

### Extract a time fragment with ffmpeg

When a sentence is only part of an ayah (e.g., `وَلَذِكْرُ اللَّهِ أَكْبَرُ` occurs at ~30-36s of 29:45):

```bash
# Extract seconds 30.0 to 36.0, re-encode to consistent format
ffmpeg -y -hide_banner -loglevel error \
  -ss 30.0 -to 36.0 \
  -i 029045.mp3 \
  -ar 44100 -ac 1 \
  -c:a libmp3lame -q:a 2 \
  fragment-029045-30-36.mp3
```

**Key flags:**
- `-ss 30.0` — seek to start time (before `-i` for fast seek)
- `-to 36.0` — stop at end time (absolute, not relative to `-ss`)
- `-ar 44100 -ac 1` — normalize to 44.1kHz mono
- `-c:a libmp3lame -q:a 2` — VBR MP3, quality 2 (~190kbps, excellent)

### Fragment only at the start (no end specified)

When the fragment starts partway through the ayah and runs to the end:

```bash
ffmpeg -y -hide_banner -loglevel error \
  -ss 8.0 \
  -i 002034.mp3 \
  -ar 44100 -ac 1 \
  -c:a libmp3lame -q:a 2 \
  fragment-002034-8-end.mp3
```

### Fragment only at the end (no start specified)

When the fragment is the opening of the ayah:

```bash
ffmpeg -y -hide_banner -loglevel error \
  -to 12.0 \
  -i 047019.mp3 \
  -ar 44100 -ac 1 \
  -c:a libmp3lame -q:a 2 \
  fragment-047019-0-12.mp3
```

### Multi-ayah concatenation

For sources spanning multiple ayahs (e.g., 114:1-3), download each ayah separately, normalize, then concat:

```bash
# Normalize each ayah
ffmpeg -y -i 114001.mp3 -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 norm-114001.mp3
ffmpeg -y -i 114002.mp3 -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 norm-114002.mp3
ffmpeg -y -i 114003.mp3 -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 norm-114003.mp3

# Create concat list
cat > concat.txt << 'EOF'
file 'norm-114001.mp3'
file 'norm-114002.mp3'
file 'norm-114003.mp3'
EOF

# Concatenate
ffmpeg -y -f concat -safe 0 -i concat.txt \
  -c:a libmp3lame -q:a 2 \
  combined-114-1-3.mp3
```

### Hadith / non-Quranic Arabic audio

For hadith text where no Husary recitation exists, use Arabic TTS:

```bash
edge-tts --voice ar-SA-HamedNeural \
  --text "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللهُ أَكْبَرُ" \
  --write-media hadith-arabic.mp3
```

Then normalize:
```bash
ffmpeg -y -i hadith-arabic.mp3 -ar 44100 -ac 1 -c:a libmp3lame -q:a 2 hadith-arabic-norm.mp3
```

---

## 3. Asset Structure

### Decision: Store BOTH individual pair MP3s AND a combined sequential MP3

```
assets/audio/lessons/
├── lesson-01/
│   ├── manifest.json                    ← metadata for all sentences
│   ├── lesson-01-full.mp3               ← single sequential file for download
│   ├── learning-ilah-01.mp3             ← individual sentence pair (Arabic + 2s pause + English)
│   ├── learning-ilah-02.mp3
│   ├── learning-ilah-03.mp3
│   ├── ...
│   ├── hadith-01.mp3
│   └── .cache/                          ← raw EveryAyah downloads (gitignored)
│       ├── 021087.mp3
│       ├── 002163.mp3
│       └── ...
├── lesson-02/
│   ├── manifest.json
│   ├── lesson-02-full.mp3
│   ├── learning-xxx-01.mp3
│   └── ...
└── audio-manifest.json                  ← site-level manifest listing ALL lessons
```

### Why both?

| Asset | Purpose | Generated by |
|-------|---------|-------------|
| Individual `{id}.mp3` | Web shuffle player loads these one at a time | Build script |
| `lesson-NN-full.mp3` | Download for phone/car — single file, no internet needed | Build script (concat of all pairs + 3s gaps) |
| `manifest.json` (per lesson) | Web player reads this to know what files exist | Build script |
| `audio-manifest.json` (site level) | Web player reads this for cumulative/multi-lesson mode | Build script or manual |

**Trade-off:** This roughly doubles storage (individual pairs ≈ full sequential). But the files are small (~3-5 MB per lesson total for 21 sentence pairs), and the web player *needs* individual files to shuffle. Generating on-the-fly in the browser would require either the Web Audio API (complex, memory-intensive) or server-side processing (impossible on GitHub Pages).

### Sentence pair MP3 format

Each individual MP3 contains:

```
[Arabic clip: 3–15s] → [2s silence] → [English TTS: 3–8s]
```

Typical duration: 8–25 seconds per pair.

### Sequential MP3 format

The full download MP3 concatenates all sentence pairs with 3-second gaps between them:

```
[Pair 1] → [3s silence] → [Pair 2] → [3s silence] → ... → [Pair 21]
```

Lesson playback order (same as lesson page, same as YAML definition order):
1. **Anchor** (1 sentence — if applicable)
2. **Learning — إِلَٰه** (sentences, one per form/pattern)
3. **Learning — كَبُرَ** (sentences, one per form)
4. **Hadith** (1+ sentences)

Total: ~21 sentence pairs per lesson.

---

## 4. Lesson Audio Definition Format

Each lesson has a YAML definition file at `tools/lesson-audio/lesson-NN.yaml`. This is the single source of truth for what audio to build.

### Full schema

```yaml
# tools/lesson-audio/lesson-01.yaml

lesson_id: lesson-01                           # unique identifier
title: "Lesson 1: Allāhu Akbar"               # human-readable title
slug: lesson-01-allahu-akbar                   # matches lesson filename

sentences:
  # ── Each sentence entry ──

  - id: learning-ilah-01                        # unique sentence ID → becomes filename
    role: learning                             # anchor | learning | hadith
    root: إِلَٰه                                # which root word this belongs to
    form: "لَا إِلَٰهَ إِلَّا"                    # specific form or pattern being taught
    ref: "21:87"                               # human-readable reference

    arabic_source:                             # how to get the Arabic audio
      surah: 21                                # 3-digit surah number
      ayah: 87                                 # 3-digit ayah number
      start: null                              # (optional) start time in seconds
      end: null                                # (optional) end time in seconds

    arabic_text: "فَنَادَىٰ فِي الظُّلُمَاتِ..."    # Arabic text (for display in player)
    english: "He called out in the darkness..." # English translation (for TTS + display)
```

### Arabic source variations

**Full ayah (no trimming):**
```yaml
arabic_source:
  surah: 21
  ayah: 87
```

**Time-ranged fragment:**
```yaml
arabic_source:
  surah: 29
  ayah: 45
  start: 30.0    # start at 30 seconds
  end: 36.0      # end at 36 seconds
```

**Start-only fragment (play from start to end of ayah):**
```yaml
arabic_source:
  surah: 2
  ayah: 34
  start: 8.0
```

**End-only fragment (play from beginning to end time):**
```yaml
arabic_source:
  surah: 47
  ayah: 19
  end: 12.0
```

**Multi-ayah (concatenate multiple ayahs):**
```yaml
arabic_source:
  - surah: 114
    ayah: 1
  - surah: 114
    ayah: 2
  - surah: 114
    ayah: 3
```

**Hadith / non-Quranic (use Arabic TTS instead of EveryAyah):**
```yaml
arabic_source:
  use_arabic_tts: true
arabic_text: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ..."
```

### Validation rules

The build script should validate:
1. Every `id` is unique within the lesson
2. Every `id` is safe for filenames (lowercase alphanumeric + hyphens only)
3. `surah` is 1–114, `ayah` is 1–286
4. `start` < `end` when both are specified
5. `role` is one of: `anchor`, `learning`, `hadith`
6. `english` is non-empty (required for TTS)
7. `arabic_text` is non-empty (required for player display)

---

## 5. Build Script Design

**File:** `tools/build-lesson-audio.py`  
**Already exists** with a working implementation. The design below documents the architecture and any refinements needed.

### Usage

```bash
# Build lesson 01 (output defaults to assets/audio/lessons/lesson-01/)
python tools/build-lesson-audio.py tools/lesson-audio/lesson-01.yaml

# Build with custom output directory
python tools/build-lesson-audio.py tools/lesson-audio/lesson-01.yaml -o /tmp/test-output

# Build the test file (3 sentences, for quick validation)
python tools/build-lesson-audio.py tools/lesson-audio/test-3-sentences.yaml
```

### Dependencies

```bash
pip install edge-tts pyyaml
brew install ffmpeg   # or already installed
```

### Processing pipeline (pseudocode)

```python
def build_lesson(yaml_path, output_dir):
    lesson = load_yaml(yaml_path)
    
    # Create output directories
    mkdir(output_dir)
    mkdir(output_dir / ".cache")  # for raw EveryAyah downloads
    
    # Pre-generate reusable silence files
    silence_2s = generate_silence(2.0)   # Arabic→English gap
    silence_3s = generate_silence(3.0)   # between sentence pairs
    
    pair_files = []
    manifest_entries = []
    
    for sentence in lesson.sentences:
        # ── Step 1: Get Arabic audio ──
        if sentence.arabic_source.use_arabic_tts:
            arabic_clip = generate_arabic_tts(sentence.arabic_text)
        elif isinstance(sentence.arabic_source, list):
            # Multi-ayah: download each, concat
            parts = []
            for src in sentence.arabic_source:
                raw = download_ayah(src.surah, src.ayah, cache_dir)
                parts.append(normalize(raw))
            arabic_clip = concat(parts)
        else:
            # Single ayah (with optional fragment)
            raw = download_ayah(src.surah, src.ayah, cache_dir)
            if src.start or src.end:
                arabic_clip = extract_fragment(raw, src.start, src.end)
            else:
                arabic_clip = normalize(raw)
        
        # ── Step 2: Generate English TTS ──
        english_clip = edge_tts(sentence.english, voice="en-US-AvaNeural")
        english_clip = normalize(english_clip)
        
        # ── Step 3: Build sentence pair ──
        # [Arabic] → [2s silence] → [English]
        pair_file = concat([arabic_clip, silence_2s, english_clip])
        save(pair_file, output_dir / f"{sentence.id}.mp3")
        
        pair_files.append(pair_file)
        manifest_entries.append({
            id, file, role, root, form, ref,
            arabic_text, english, duration
        })
    
    # ── Step 4: Build full sequential MP3 ──
    # Interleave pair files with 3s silence gaps
    full_parts = []
    for i, pair in enumerate(pair_files):
        if i > 0:
            full_parts.append(silence_3s)
        full_parts.append(pair)
    
    full_file = concat(full_parts)
    save(full_file, output_dir / f"{lesson.lesson_id}-full.mp3")
    
    # ── Step 5: Write manifest.json ──
    manifest = {
        lesson_id, title, slug,
        full_audio: f"{lesson_id}-full.mp3",
        full_duration: ...,
        sentences: manifest_entries
    }
    save_json(manifest, output_dir / "manifest.json")
```

### Audio normalization

All audio (Arabic clips, English TTS, silence) is normalized to a consistent format before concatenation:

| Parameter | Value | Why |
|-----------|-------|-----|
| Sample rate | 44100 Hz | Standard, good quality |
| Channels | 1 (mono) | Halves file size, speech doesn't need stereo |
| Codec | libmp3lame | Universal compatibility |
| Quality | VBR q:a 2 | ~190kbps — excellent quality for speech |

### Caching strategy

- **Raw EveryAyah downloads** are cached in `{output_dir}/.cache/`. If the file already exists, skip the download. This avoids re-downloading the same ayah when rebuilding.
- **`.cache/` directories are gitignored** (`assets/audio/lessons/*/.cache/` in `.gitignore`).
- **English TTS** is NOT cached — regenerated each build. TTS is fast (~1s per sentence) and the text may change between builds.

### Output per lesson

After building lesson 01 (21 sentences):

```
assets/audio/lessons/lesson-01/
├── manifest.json                    (~3 KB)
├── lesson-01-full.mp3               (~3-5 MB)
├── learning-ilah-01.mp3             (~100-300 KB each)
├── learning-ilah-02.mp3
├── learning-ilah-03.mp3
├── learning-ilah-04.mp3
├── learning-ilah-05.mp3
├── learning-kabura-01.mp3
├── learning-kabura-02.mp3
├── learning-kabura-03.mp3
├── learning-kabura-04.mp3
├── learning-kabura-05.mp3
├── hadith-01.mp3
└── .cache/                          (gitignored)
    ├── 021087.mp3
    ├── 002163.mp3
    └── ...
```

---

## 6. Web Player Design

**File:** `assets/js/shuffle-player.js`  
**Already exists** with a working implementation. The design below documents the architecture.

### Embedding in a lesson page

```html
<!-- In lessons/lesson-01-allahu-akbar.md -->

## 🔀 Random Review Player

<div id="shuffle-player"></div>

<script src="{{ '/assets/js/shuffle-player.js' | relative_url }}"></script>
<script>
  ShufflePlayer.init('shuffle-player', {
    manifests: [
      '{{ "/assets/audio/lessons/lesson-01/manifest.json" | relative_url }}'
    ]
  });
</script>
```

For cumulative review (lesson 3 page loads all previous lessons):

```html
<script>
  ShufflePlayer.init('shuffle-player', {
    manifests: [
      '{{ "/assets/audio/lessons/lesson-01/manifest.json" | relative_url }}',
      '{{ "/assets/audio/lessons/lesson-02/manifest.json" | relative_url }}',
      '{{ "/assets/audio/lessons/lesson-03/manifest.json" | relative_url }}'
    ]
  });
</script>
```

### How shuffle play works

```
┌──────────────────────────────────────────────────┐
│                  Shuffle Player                   │
│                                                   │
│   1. Load manifest(s) → collect all sentences     │
│   2. Apply role filter (all/learning)             │
│   3. Fisher-Yates shuffle → build playlist        │
│   4. Play playlist[0] → auto-advance on ended     │
│   5. When playlist exhausted → re-shuffle → loop  │
│                                                   │
│   Each "play" = load sentence-pair MP3 into       │
│   HTML5 <audio> and call .play()                  │
└──────────────────────────────────────────────────┘
```

### Pseudocode

```javascript
// ── State ──
let sentences = [];      // flat array of all loaded sentences
let playlist = [];       // shuffled indices into sentences[]
let currentIndex = 0;    // position in playlist
let audio = new Audio(); // single shared audio element
let roleFilter = 'all';  // 'all' | 'learning'

// ── Load manifests ──
async function loadManifests(urls) {
    for (const url of urls) {
        const resp = await fetch(url);
        const data = await resp.json();
        const baseUrl = url.substring(0, url.lastIndexOf('/'));
        
        for (const s of data.sentences) {
            sentences.push({
                ...s,
                _baseUrl: baseUrl,      // for resolving audio file path
                _lessonId: data.lesson_id,
                _lessonTitle: data.title
            });
        }
    }
    buildPlaylist();
}

// ── Build shuffled playlist ──
function buildPlaylist() {
    const indices = sentences
        .map((s, i) => i)
        .filter(i => roleFilter === 'all' || sentences[i].role === roleFilter);
    playlist = fisherYatesShuffle(indices);
    currentIndex = 0;
}

// ── Playback ──
function playCurrent() {
    const s = sentences[playlist[currentIndex]];
    audio.src = s._baseUrl + '/' + s.file;
    audio.play();
    updateUI(s);   // show Arabic text, English, reference, progress
}

audio.addEventListener('ended', () => {
    setTimeout(() => {
        currentIndex++;
        if (currentIndex >= playlist.length) {
            buildPlaylist();  // re-shuffle for next cycle
        }
        playCurrent();
    }, 1500);  // 1.5s pause between sentences
});

// ── Controls ──
function playPause() { audio.paused ? audio.play() : audio.pause(); }
function next()      { currentIndex++; if (currentIndex >= playlist.length) buildPlaylist(); playCurrent(); }
function previous()  { currentIndex = Math.max(0, currentIndex - 1); playCurrent(); }
function setFilter(role) { roleFilter = role; buildPlaylist(); updateUI(); }
```

### UI layout

```
┌──────────────────────────────────────────────────┐
│                                                   │
│     فَنَادَىٰ فِي الظُّلُمَاتِ أَن لَّا إِلَٰهَ        │  ← Arabic text (RTL, gold)
│     إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ           │
│                  الظَّالِمِينَ                      │
│                                                   │
│  He called out in the darkness: There is no       │  ← English text (gray)
│  god but You, glory to You — I was among          │
│  the wrongdoers                                   │
│                                                   │
│  21:87 · Learning · إِلَٰه                         │  ← Metadata (dim)
│                                                   │
│              ⏮    ▶    ⏭                          │  ← Controls
│                                                   │
│  ━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Progress bar
│                                                   │
│            [All]   [Learning]                      │  ← Role filter buttons
│                                                   │
│              3 / 21 sentences                     │  ← Counter
│                                                   │
└──────────────────────────────────────────────────┘
```

### Mobile considerations

- Large touch targets (48px minimum for buttons)
- iOS autoplay policy: first `play()` must be triggered by user gesture. The play button handles this — subsequent auto-advances work because they chain from the first user-initiated play.
- `preload="none"` is not needed here (the Audio() element is created programmatically)

---

## 7. Cross-Lesson Manifest & Cumulative Review

### Problem

As lessons accumulate, the shuffle player should be able to draw from ALL sentences the student has covered — not just the current lesson. On a static site, we need a way for the player to discover all available lessons.

### Solution: Site-level `audio-manifest.json`

```
assets/audio/lessons/audio-manifest.json
```

```json
{
  "generated": "2025-04-02T10:00:00Z",
  "lessons": [
    {
      "lesson_id": "lesson-01",
      "title": "Lesson 1: Allāhu Akbar",
      "slug": "lesson-01-allahu-akbar",
      "manifest_url": "lesson-01/manifest.json",
      "sentence_count": 21,
      "full_audio": "lesson-01/lesson-01-full.mp3",
      "full_duration": 285.3
    },
    {
      "lesson_id": "lesson-02",
      "title": "Lesson 2: Bismillāh",
      "slug": "lesson-02-bismillah",
      "manifest_url": "lesson-02/manifest.json",
      "sentence_count": 21,
      "full_audio": "lesson-02/lesson-02-full.mp3",
      "full_duration": 310.7
    }
  ]
}
```

### How the cumulative player works

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  1. Player loads audio-manifest.json                     │
│  2. Shows lesson checkboxes (all checked by default)     │
│  3. For each checked lesson, fetch its manifest.json     │
│  4. Collect all sentences into one pool                  │
│  5. Shuffle and play as normal                           │
│                                                          │
│  UI addition:                                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Lessons:                                         │    │
│  │ ☑ Lesson 1: Allāhu Akbar (21 sentences)         │    │
│  │ ☑ Lesson 2: Bismillāh (21 sentences)            │    │
│  │ ☑ Lesson 3: ... (21 sentences)                   │    │
│  │ ───────────────────                              │    │
│  │ Total: 63 sentences                              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Generating the site-level manifest

Two options:

**Option A: Build script appends** — after building a lesson, the script reads the existing `audio-manifest.json`, adds/updates the lesson entry, and writes it back.

**Option B: Separate script** — a `tools/build-audio-manifest.py` that scans `assets/audio/lessons/*/manifest.json` and generates the site-level manifest.

**Recommendation: Option B.** Keeps concerns separate. Run it after building any lesson:

```bash
# After building one or more lessons
python tools/build-audio-manifest.py
```

### Pseudocode for `tools/build-audio-manifest.py`

```python
def build_site_manifest():
    lessons_dir = Path("assets/audio/lessons")
    lessons = []
    
    for manifest_path in sorted(lessons_dir.glob("*/manifest.json")):
        manifest = json.load(manifest_path)
        lesson_dir = manifest_path.parent.name
        
        lessons.append({
            "lesson_id": manifest["lesson_id"],
            "title": manifest["title"],
            "slug": manifest["slug"],
            "manifest_url": f"{lesson_dir}/manifest.json",
            "sentence_count": len(manifest["sentences"]),
            "full_audio": f"{lesson_dir}/{manifest['full_audio']}",
            "full_duration": manifest["full_duration"],
        })
    
    site_manifest = {
        "generated": datetime.utcnow().isoformat() + "Z",
        "lessons": lessons,
    }
    
    output = lessons_dir / "audio-manifest.json"
    json.dump(site_manifest, output, indent=2, ensure_ascii=False)
```

### Cumulative review page

A dedicated page (e.g., `review.md`) could host the player with lesson selection:

```html
<!-- review.md -->
---
layout: default
title: Audio Review
---

# 🔀 Cumulative Review

<div id="shuffle-player"></div>

<script src="{{ '/assets/js/shuffle-player.js' | relative_url }}"></script>
<script>
  ShufflePlayer.initCumulative('shuffle-player', {
    audioManifest: '{{ "/assets/audio/lessons/audio-manifest.json" | relative_url }}'
  });
</script>
```

The `initCumulative` method would:
1. Fetch the site-level manifest
2. Show lesson checkboxes
3. Fetch individual manifests for selected lessons
4. Build the combined sentence pool

---

## 8. File Size Estimates

### Per sentence pair

| Component | Typical duration | File size (mono, ~190kbps VBR) |
|-----------|-----------------|-------------------------------|
| Arabic clip | 3–15s | 70–350 KB |
| 2s silence | 2s | ~1 KB (silence compresses well) |
| English TTS | 3–8s | 70–190 KB |
| **Sentence pair total** | **8–25s** | **~140–540 KB** |

Average: ~15s duration, ~250 KB per sentence pair.

### Per lesson (21 sentences)

| Asset | Estimate |
|-------|----------|
| 21 individual pair MP3s | ~5 MB |
| 1 full sequential MP3 | ~5 MB (same content + 3s gaps) |
| manifest.json | ~3 KB |
| **Total per lesson** | **~10 MB** |

### Cumulative (10 lessons)

| Asset | Estimate |
|-------|----------|
| All individual pairs | ~50 MB |
| All full sequential MP3s | ~50 MB |
| **Total for 10 lessons** | **~100 MB in repo** |

This is within GitHub Pages' limits (1 GB repo soft limit, 100 MB per file). Git LFS is not needed at this scale.

### Bandwidth for web player

The shuffle player loads one sentence pair at a time (~250 KB). Even on a slow connection, this loads in under a second. No need to preload the full lesson.

---

## 9. Open Questions

### Q1: Should the anchor phrase have audio?

The anchor phrase (e.g., Allahu Akbar from the adhan) currently uses a local MP3 (`assets/audio/adhan-allahu-akbar.mp3`). Should this be included in the sequential download MP3 as the first item? **Recommendation: Yes** — include it as the first sentence in the YAML definition with `role: anchor`.

### Q2: Fine-tuning time fragments

The YAML definition includes `start` and `end` values for time fragments, but these are **approximate** until someone listens and adjusts. The workflow:

1. First build: use estimated times from the lesson Markdown
2. Listen to the output
3. Adjust `start`/`end` in the YAML (0.5s increments)
4. Rebuild

**Future improvement:** A small web tool that plays the EveryAyah audio with a waveform and lets you click to set start/end times, then copies the values to clipboard.

### Q3: Should we normalize volume across Arabic and English?

Husary's recordings and edge-tts output may have different loudness. Consider adding an ffmpeg loudnorm filter:

```bash
ffmpeg -i input.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 output.mp3
```

**Recommendation:** Try it on the first build. If Arabic and English sound balanced without it, skip it (simpler pipeline). If not, add loudnorm as a post-processing step on each clip before concatenation.

### Q4: Git strategy for audio files

Audio files are binary and don't diff well. Options:
- **Commit directly** (current approach) — simple, works up to ~100 MB total
- **Git LFS** — if the repo grows past ~500 MB
- **External hosting** — if the repo grows past 1 GB

**Recommendation:** Commit directly for now. Revisit at ~30 lessons.

### Q5: Anchor section — should we include adhan audio in the sequential MP3?

Lesson 1's anchor is the Adhan clip (`assets/audio/adhan-allahu-akbar.mp3`). Including it in the sequential download creates a natural opening. Future lessons may have different anchors (e.g., a dua, a salah phrase).

**Recommendation:** Add an optional `anchor` section to the YAML that can reference either a local file or EveryAyah source.

---

## Summary of files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `tools/lesson-audio/lesson-01.yaml` | **Exists** | Lesson 1 audio definition |
| `tools/build-lesson-audio.py` | **Exists** | Build script |
| `tools/build-audio-manifest.py` | **Create** | Site-level manifest generator |
| `assets/js/shuffle-player.js` | **Exists** | Web shuffle player |
| `tools/shuffle-player-demo.html` | **Exists** | Standalone test page |
| `assets/audio/lessons/audio-manifest.json` | **Generated** | Site-level manifest |
| `assets/audio/lessons/lesson-NN/` | **Generated** | Per-lesson audio assets |
| `review.md` | **Create** | Cumulative review page |
| `.gitignore` | **Updated** | Already ignores `.cache/` dirs |
| `_config.yml` | **May need update** | Exclude `tools/` from Jekyll build |

### Build workflow (end to end)

```bash
# 1. Define the lesson audio (manually, from selection log)
vim tools/lesson-audio/lesson-01.yaml

# 2. Build the lesson audio assets
python tools/build-lesson-audio.py tools/lesson-audio/lesson-01.yaml

# 3. Listen and fine-tune time fragments
# (adjust start/end in YAML, rebuild)

# 4. Rebuild site-level manifest
python tools/build-audio-manifest.py

# 5. Commit and push
git add assets/audio/lessons/ tools/lesson-audio/
git commit -m "Add lesson 01 audio assets"
git push
```


## Known Issues

1. **Time fragment extraction mismatch (29:45)** — The Arabic clip for 29:45 with `start: 30.0, end: 36.0` does not accurately capture the fragment وَلَذِكْرُ اللَّهِ أَكْبَرُ. The start/end times need to be fine-tuned by listening to the full ayah and adjusting. This applies to any sentence that uses time fragments rather than full ayahs — each needs manual verification.
