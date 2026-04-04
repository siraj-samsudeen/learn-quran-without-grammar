# Open Platform Design: "Anki for Qur'anic Arabic"

> **Status:** Research Document — v1.0  
> **Author:** Platform Architecture Research  
> **Date:** July 2025  
> **Vision:** An open platform where any Arabic teacher can create and distribute courses using our app infrastructure — Duolingo for Qur'anic Arabic, but open.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Lessons from Anki's Shared Deck Ecosystem](#2-lessons-from-ankis-shared-deck-ecosystem)
3. [Content Packaging Format Design](#3-content-packaging-format-design)
4. [Course Package Specification](#4-course-package-specification)
5. [Course Creator Workflow](#5-course-creator-workflow)
6. [Multi-Course Architecture in a Local-First App](#6-multi-course-architecture-in-a-local-first-app)
7. [Content Distribution Strategy](#7-content-distribution-strategy)
8. [Internationalization Architecture](#8-internationalization-architecture)
9. [Quality Control Without Central Review](#9-quality-control-without-central-review)
10. [Open Source & Licensing Strategy](#10-open-source--licensing-strategy)
11. [Integration with Understand Quran](#11-integration-with-understand-quran)
12. [Course Creator's Guide (Outline)](#12-course-creators-guide-outline)
13. [Platform Roadmap](#13-platform-roadmap)

---

## 1. Executive Summary

The "Learn Qur'an Without Grammar" app currently serves a single course by a single author. This document researches how to evolve it into an **open platform** — a player that runs any course, designed by any teacher, distributed without a central server.

**The analogy:** Anki provides a flashcard player; anyone creates decks. Podcast apps provide a player; anyone creates feeds. We provide a Qur'anic Arabic learning player; anyone creates courses.

**Key design principles:**
- **Local-first:** All data on-device. No accounts required. No server dependency.
- **Open format:** Course packages are documented, inspectable, and creatable with free tools.
- **Progressive complexity:** A teacher can start with a Google Sheet and evolve to YAML + CLI.
- **Solo-developer buildable:** Every decision prioritises simplicity. No microservices, no backend, no admin panels.

---

## 2. Lessons from Anki's Shared Deck Ecosystem

### How Anki Decks Work

An Anki `.apkg` file is a ZIP archive containing:

```
deck.apkg (ZIP)
├── collection.anki2    ← SQLite database (notes, cards, models, decks)
├── media               ← JSON mapping: {"0": "audio.mp3", "1": "image.png"}
├── 0                   ← actual media file (renamed to numeric index)
├── 1                   ← actual media file
└── meta                ← version info (newer format)
```

The SQLite database stores `notes` (content), `cards` (review state), and `col` (collection metadata including card templates as JSON blobs inside a single column). The format evolved through three versions (Legacy 1 from 2012, Legacy 2 from 2018, and Latest from 2020+), but the core pattern remains: **zip of SQLite + media**.

AnkiWeb hosts ~100,000+ shared decks. Anyone with an AnkiWeb account can upload. There's a 5-star rating system and free-text search.

### What Makes Anki Successful

| Strength | Detail |
|----------|--------|
| **Open format** | `.apkg` can be created by any tool. Dozens of third-party generators exist. |
| **No gatekeeping** | Anyone can share a deck. No review process. |
| **Import is one click** | Double-click a file → it loads into Anki. Minimal friction. |
| **Ecosystem of tools** | CSV importers, Markdown-to-Anki converters, browser extensions, AI generators. |
| **SRS is universal** | The same scheduler works for any deck, any subject. |

### Anki's Weaknesses (Lessons for Us)

| Weakness | Our Response |
|----------|-------------|
| **No quality control** — many decks are abandoned, incomplete, or contain errors | Automated schema validation + optional "verified" badge |
| **Poor discoverability** — search is basic, ratings are often broken or gamed | Curated catalogue (JSON file) with categories, not a free-for-all upload site |
| **Inconsistent structure** — every deck has its own field names, layouts, workflows | We define a **strict course schema**. The player knows exactly what to expect. |
| **No guided learning** — cards are unordered flashcards | Our courses have **lessons with ordering**, progression, and anchor phrases |
| **No audio-first design** — audio is a bolt-on, not the core experience | Audio is mandatory and first-class in our format |

### Key Takeaway

Adopt Anki's openness (documented format, no gatekeeping, file-based sharing) but **reject its structurelessness**. Our courses are not loose flashcard piles — they are sequenced, audio-rich lessons with pedagogical intent.

---

## 3. Content Packaging Format Design

### Survey of Existing Formats

| Format | What It Does | Fit for Us |
|--------|-------------|------------|
| **SCORM** | Enterprise e-learning packaging (HTML + manifest XML) | ❌ Extremely complex, server-dependent, designed for LMS platforms |
| **xAPI** | Tracks learning activities via JSON statements to a Learning Record Store | ❌ Server-dependent, overkill for local-first app |
| **LTI** | Connects tools to LMS platforms via OAuth | ❌ Server-to-server protocol, irrelevant for offline app |
| **Podcast RSS** | XML feed pointing to audio files on a CDN | ✅ Good distribution model — a course is like a podcast feed |
| **Anki .apkg** | ZIP of SQLite + media files | ✅ Right idea — self-contained package. But SQLite is overkill for our simple structure |
| **Obsidian plugins** | Git repo + `manifest.json` + central `community-plugins.json` catalogue | ✅ Excellent distribution model — a single JSON file lists all available packages |

### Our Design: `.lqcourse` Package

Inspired by podcast feeds (simple, decentralised) and Obsidian's plugin model (Git-based, catalogue-driven), we define a course package as:

```
my-course.lqcourse (ZIP)
├── course.yaml              ← Course manifest (metadata, author, version)
├── lessons/
│   ├── lesson-01.yaml       ← Lesson definition (sentences, audio refs, roles)
│   ├── lesson-02.yaml
│   └── ...
├── i18n/
│   ├── en.yaml              ← English translations (default)
│   ├── ur.yaml              ← Urdu translations
│   ├── ta.yaml              ← Tamil translations
│   └── ...
├── audio/                   ← Pre-built audio files (optional)
│   ├── lesson-01/
│   │   ├── anchor-01-ar.mp3
│   │   ├── anchor-01-en.mp3
│   │   └── ...
│   └── lesson-02/
│       └── ...
└── README.md                ← Human-readable course description
```

**Why ZIP, not SQLite?** Our course data is simple YAML — no need for a query engine. ZIP is inspectable (anyone can unzip and read), editable (change a YAML file, re-zip), and tooling-universal. SQLite adds complexity with no benefit for static course content.

**Why YAML, not JSON?** Teachers will hand-edit these files. YAML supports comments, multi-line strings (for Arabic text), and is more readable. The CLI can validate and convert to JSON for the app runtime.

### Versioning Strategy

Each course package declares a [SemVer](https://semver.org/) version in `course.yaml`:
- **Patch** (1.0.1): Typo fix, audio quality improvement
- **Minor** (1.1.0): New lessons added
- **Major** (2.0.0): Breaking structure change, lessons reordered/removed

The app stores the installed version and checks the catalogue for updates.

---

## 4. Course Package Specification

### `course.yaml` — Course Manifest

```yaml
# Course Package Format v1
format_version: 1

# Course Identity
id: learn-quran-without-grammar        # unique slug, kebab-case
name: "Learn Qur'an Without Grammar"
version: "1.0.0"
description: >
  Learn Qur'anic Arabic recognition through root-word families,
  audio immersion, and phrases from daily prayers.

# Author
author:
  name: "Siraj Samsudeen"
  url: "https://siraj-samsudeen.github.io/learn-quran-without-grammar/"
  contact: "siraj@example.com"                    # optional

# Course Configuration
default_language: en                              # translation language code
supported_languages: [en, ta, ur]                 # available in i18n/
lesson_count: 30
sentences_per_lesson: 12

# Audio Configuration
audio_mode: hybrid                                # "bundled" | "remote" | "hybrid"
# hybrid = Qur'anic audio from EveryAyah CDN, TTS audio bundled
remote_audio_base: "https://everyayah.com/data/"
tts_engine: edge-tts                              # for generating translation audio

# Pedagogical Metadata
approach: root-word-families                      # free-text description
difficulty: beginner
prerequisites: []                                 # list of course IDs
tags: [quranic-arabic, vocabulary, prayer, roots]

# License
license: CC-BY-SA-4.0

# Catalogue Metadata (used by course directory)
icon: icon.png                                    # 256x256, bundled in package
banner: banner.png                                # 1200x400, optional
```

### `lessons/lesson-01.yaml` — Lesson Definition

```yaml
lesson_id: lesson-01
title: "Lesson 1: Allāhu Akbar"
slug: lesson-01-allahu-akbar
order: 1                                          # display order

roots:
  - id: ilah
    arabic: "إِلَٰه"
    meaning_key: roots.ilah                       # looked up in i18n files

  - id: kabura
    arabic: "كَبُرَ"
    meaning_key: roots.kabura

sentences:
  - id: anchor-ilah
    role: anchor                                  # anchor | learn | practice
    root: ilah
    form: "إِلَٰه"
    arabic_text: "هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ"
    translation_key: sentences.anchor-ilah        # looked up in i18n files
    audio:
      arabic:
        type: quran                               # quran | tts | bundled
        ref: "59:22"
        reciter: Hani_Rifai_192kbps
        start: 0
        end: 5.5
      arabic_full:                                # full ayah for review mode
        type: quran
        ref: "59:22"
        reciter: Hani_Rifai_192kbps
      translation:
        type: tts                                 # generated per-language
        # file path resolved by app: audio/lesson-01/anchor-ilah-{lang}.mp3

  - id: learn-ilah-01
    role: learn
    root: ilah
    form: "آلِهَة"
    arabic_text: "وَإِذْ قَالَ إِبْرَاهِيمُ لِأَبِيهِ آزَرَ أَتَتَّخِذُ أَصْنَامًا آلِهَةً"
    translation_key: sentences.learn-ilah-01
    audio:
      arabic:
        type: quran
        ref: "6:74"
        reciter: Abu_Bakr_Ash-Shaatree_128kbps
        end: 9.5
      translation:
        type: tts

  # ... remaining sentences follow same pattern
```

### `i18n/en.yaml` — Translation File

```yaml
language: en
language_name: English
direction: ltr

roots:
  ilah: "god / deity"
  kabura: "to be great / big"

sentences:
  anchor-ilah: "He is Allah — there is no god but He"
  learn-ilah-01: "And when Ibrahim said to his father Azar: Do you take idols as gods?"
  learn-ilah-02: "Say: O Allah, King of kings"
  # ... all sentence translations

ui:
  lesson_complete: "Lesson Complete!"
  next_lesson: "Next Lesson"
  review: "Review"
```

### Architecture Diagram: Package Structure

```
┌─────────────────────────────────────────────────┐
│                 .lqcourse (ZIP)                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  course.yaml ─── Metadata, config, author info   │
│                                                  │
│  lessons/                                        │
│  ├── lesson-01.yaml ─┐                          │
│  ├── lesson-02.yaml  ├── Arabic text, audio refs │
│  └── lesson-NN.yaml ─┘   roles, form/root data  │
│                                                  │
│  i18n/                                           │
│  ├── en.yaml ────────┐                          │
│  ├── ur.yaml         ├── Translations per lang   │
│  └── ta.yaml ────────┘                          │
│                                                  │
│  audio/                                          │
│  └── lesson-01/                                  │
│      ├── anchor-ilah-en.mp3 ── TTS translations  │
│      └── anchor-kabura-en.mp3                    │
│                                                  │
│  README.md ─── Human-readable description        │
│  icon.png ──── Course icon for catalogue         │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 5. Course Creator Workflow

### Audience: Who Creates Courses?

| Persona | Technical Skill | Workflow |
|---------|----------------|----------|
| **Siraj** (app creator) | High — uses Git, YAML, Python tools | Full CLI + YAML workflow |
| **Islamic school teacher** | Low — uses Google Docs/Sheets, maybe Word | Google Sheets → CLI conversion |
| **Understand Quran Academy** | Medium — has PDF course materials, IT support | Structured migration with templates |
| **Community contributor** | Variable | Fork a template repo on GitHub |

### The Two-Track Approach

**Track A: Google Sheets (Teacher-Friendly)**

A teacher fills in a structured Google Sheet:

| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
|----------|----------|----------|----------|----------|----------|----------|
| Lesson | Role | Root | Arabic Text | English | Verse Ref | Reciter |
| 1 | anchor | إِلَٰه | هُوَ اللَّهُ الَّذِي... | He is Allah... | 59:22 | Hani_Rifai |
| 1 | learn | إِلَٰه | وَإِذْ قَالَ إِبْرَاهِيمُ... | And when Ibrahim... | 6:74 | Abu_Bakr |

The CLI tool converts this to the YAML package format:

```bash
# Convert Google Sheet export to course package
lqwg import-sheet course-content.csv --course-id my-course

# Validate the generated YAML
lqwg validate my-course/

# Build audio files (TTS for translations, resolve Qur'anic refs)
lqwg build-audio my-course/

# Package into .lqcourse
lqwg package my-course/
```

**Track B: YAML-Native (Developer-Friendly)**

Power users write YAML directly, using templates:

```bash
# Scaffold a new course
lqwg init my-course --lessons 20 --template quranic-roots
# Creates my-course/ with course.yaml, lesson templates, i18n stubs

# Add a lesson interactively
lqwg add-lesson my-course/ --lesson 5
# Prompts for: root words, anchor phrase, verse references

# Validate everything
lqwg validate my-course/ --strict
# Checks: schema, Arabic text vs Quran API, reciter uniqueness, audio refs

# Build and package
lqwg build my-course/
lqwg package my-course/
# Outputs: my-course-1.0.0.lqcourse
```

### CLI Tool Design: `lqwg`

```
lqwg — Learn Qur'an Without Grammar CLI

Commands:
  init <dir>              Scaffold a new course from template
  import-sheet <csv>      Convert Google Sheet CSV to YAML lessons
  add-lesson <dir>        Add a new lesson interactively
  validate <dir>          Validate course against schema
  build-audio <dir>       Generate TTS audio, resolve Qur'anic refs
  package <dir>           Create .lqcourse ZIP package
  publish <file>          Upload to GitHub Release (optional)
  serve <dir>             Preview course in local web browser

Options:
  --template <name>       Course template (quranic-roots, vocabulary, custom)
  --language <code>       Add a translation language
  --strict                Fail on warnings, not just errors
```

### Audio Generation Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Qur'anic Text  │────▶│  EveryAyah CDN   │────▶│  Downloaded MP3 │
│  (verse refs)   │     │  (fetch + trim)   │     │  (per reciter)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Translations   │────▶│  edge-tts / TTS   │────▶│  Generated MP3  │
│  (from i18n/)   │     │  (per language)   │     │  (per language)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Teaching Phrases│────▶│  Arabic TTS      │────▶│  Generated MP3  │
│  (non-Qur'anic) │     │  (edge-tts ar)   │     │  (bundled)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

The build tool handles:
1. **Qur'anic recitation**: Downloads from EveryAyah CDN, trims to `start`/`end` timestamps
2. **Translation TTS**: Generates audio via edge-tts for each language in `i18n/`
3. **Teaching phrases**: Uses Arabic TTS for non-Qur'anic anchor phrases
4. **Validation**: Verifies verse text against Quran API, checks audio file presence

---

## 6. Multi-Course Architecture in a Local-First App

### Database Design: Shared DB with Course Isolation

**Decision: Single SQLite database with `course_id` column** — not separate databases per course.

Rationale:
- Expo's `expo-sqlite` makes it straightforward to open multiple databases, but a single DB simplifies cross-course queries (e.g., "show me all cards due today across all courses")
- FSRS review state can optionally be unified across courses, giving the scheduler a global view of the learner's workload
- Course install/uninstall is a SQL `DELETE WHERE course_id = ?`, not file management

```sql
-- Core tables (simplified)

CREATE TABLE courses (
  id            TEXT PRIMARY KEY,     -- 'learn-quran-without-grammar'
  name          TEXT NOT NULL,
  version       TEXT NOT NULL,        -- '1.0.0'
  author_name   TEXT,
  installed_at  INTEGER NOT NULL,     -- Unix timestamp
  metadata      TEXT                  -- JSON blob (full course.yaml content)
);

CREATE TABLE lessons (
  id            TEXT PRIMARY KEY,     -- 'lqwg:lesson-01'
  course_id     TEXT NOT NULL REFERENCES courses(id),
  title         TEXT NOT NULL,
  order_index   INTEGER NOT NULL,
  data          TEXT NOT NULL         -- JSON blob (full lesson YAML as JSON)
);

CREATE TABLE cards (
  id            TEXT PRIMARY KEY,     -- 'lqwg:lesson-01:anchor-ilah'
  course_id     TEXT NOT NULL REFERENCES courses(id),
  lesson_id     TEXT NOT NULL REFERENCES lessons(id),
  sentence_id   TEXT NOT NULL,
  role          TEXT NOT NULL,        -- 'anchor', 'learn', 'practice'
  arabic_text   TEXT NOT NULL,
  -- FSRS fields
  stability     REAL DEFAULT 0,
  difficulty    REAL DEFAULT 0,
  due           INTEGER,              -- Unix timestamp
  last_review   INTEGER,
  reps          INTEGER DEFAULT 0,
  lapses        INTEGER DEFAULT 0,
  state         INTEGER DEFAULT 0     -- 0=new, 1=learning, 2=review, 3=relearning
);

CREATE TABLE review_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id       TEXT NOT NULL REFERENCES cards(id),
  course_id     TEXT NOT NULL,
  rating        INTEGER NOT NULL,     -- 1=again, 2=hard, 3=good, 4=easy
  reviewed_at   INTEGER NOT NULL,
  elapsed_ms    INTEGER               -- time spent on card
);

-- Indices for fast queries
CREATE INDEX idx_cards_due ON cards(course_id, due);
CREATE INDEX idx_cards_lesson ON cards(lesson_id);
CREATE INDEX idx_review_log_card ON review_log(card_id);
```

### FSRS Scheduling: Per-Course vs Unified

**Recommendation: Per-course FSRS parameters, unified review queue.**

- **Per-course parameters**: Different courses may have different difficulty characteristics. FSRS can optimise weights per course after enough reviews accumulate.
- **Unified review queue**: The daily review screen shows cards due from ALL installed courses, interleaved. This prevents the "I only open one course" problem and leverages cross-course reinforcement (the same root word in two different courses reinforces learning).
- **Course-specific review**: A "Study [Course Name]" button filters to just that course when the user wants focus.

### UI: Course Switcher

```
┌─────────────────────────────────────────┐
│  ☰  Learn Qur'an                   ⚙️  │
├─────────────────────────────────────────┤
│                                         │
│  📚 My Courses                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📖 Learn Qur'an Without Grammar │   │
│  │    Lesson 5 of 30 · 23 due     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📖 Understand Quran Course 1    │   │
│  │    Lesson 3 of 20 · 12 due     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ➕ Browse Course Catalogue      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── Today's Review ──────────────────   │
│  [ 35 cards due · Start Review ]       │
│                                         │
└─────────────────────────────────────────┘
```

### Storage Management

- Course packages are stored in the app's document directory
- Audio files are cached to the device's cache directory (re-downloadable)
- The user can see per-course storage usage in Settings
- "Delete Course" removes all data: lessons, cards, review history, and cached audio
- "Reset Progress" keeps the course but wipes FSRS state

---

## 7. Content Distribution Strategy

### The "Podcast Model" for Course Distribution

Podcasts solved content distribution without a central server decades ago: an RSS feed (XML file) lists episodes with audio URLs. Any podcast app can subscribe. We adopt the same model.

### Three Distribution Channels

**Channel 1: Official Catalogue (Primary)**

A single JSON file hosted on GitHub, listing all known courses:

```
https://raw.githubusercontent.com/siraj-samsudeen/lqwg-catalogue/main/catalogue.json
```

```json
{
  "format_version": 1,
  "updated": "2025-07-01T00:00:00Z",
  "courses": [
    {
      "id": "learn-quran-without-grammar",
      "name": "Learn Qur'an Without Grammar",
      "author": "Siraj Samsudeen",
      "version": "1.0.0",
      "description": "Root-word families, audio immersion, prayer phrases",
      "download_url": "https://github.com/siraj-samsudeen/lqwg/releases/download/v1.0.0/lqwg-1.0.0.lqcourse",
      "size_mb": 45,
      "lesson_count": 30,
      "languages": ["en", "ta", "ur"],
      "tags": ["quranic-arabic", "roots", "prayer"],
      "verified": true,
      "icon_url": "https://raw.githubusercontent.com/.../icon.png"
    },
    {
      "id": "understand-quran-c1",
      "name": "Understand Quran — Course 1",
      "author": "Dr. Abdulazeez Abdulraheem",
      "version": "1.0.0",
      "description": "50% of Qur'anic words through frequency-based vocabulary",
      "download_url": "https://github.com/.../uq-c1-1.0.0.lqcourse",
      "size_mb": 30,
      "lesson_count": 20,
      "languages": ["en", "ur"],
      "tags": ["quranic-arabic", "vocabulary", "frequency"],
      "verified": true,
      "icon_url": "https://raw.githubusercontent.com/.../icon.png"
    }
  ]
}
```

**Listing in the catalogue** requires a pull request to the catalogue repo — light gatekeeping (similar to Obsidian's `community-plugins.json` model, which has 2,000+ plugins listed). This is not content review, just format validation.

**Channel 2: GitHub Releases (CDN-Backed)**

Each course lives in its own GitHub repo. Releases contain the `.lqcourse` file:

```
https://github.com/{author}/{course-repo}/releases/download/v1.0.0/course.lqcourse
```

GitHub Releases are:
- ✅ Free (up to 2 GB per release asset for free repos)
- ✅ CDN-backed via GitHub's global edge network
- ✅ Versioned (semantic release tags)
- ✅ Linkable (direct download URLs)

For even better CDN performance, jsDelivr can serve GitHub release assets:
```
https://cdn.jsdelivr.net/gh/{user}/{repo}@{tag}/course.lqcourse
```

**Channel 3: Direct Sharing (Peer-to-Peer)**

A `.lqcourse` file is just a ZIP. It can be shared via:
- Email attachment
- WhatsApp / Telegram file sharing
- AirDrop (iOS) / Nearby Share (Android)
- USB drive
- Any file hosting (Google Drive, Dropbox)

The app registers as a handler for `.lqcourse` files. Tapping a shared file opens the app and prompts to install.

### Update Flow

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐
│  App      │────▶│  Fetch       │────▶│  Compare      │
│  Launch   │     │  catalogue   │     │  versions     │
└──────────┘     │  .json       │     │  (installed   │
                  └──────────────┘     │  vs. latest)  │
                                       └───────┬───────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  Show badge:         │
                                    │  "Update available   │
                                    │  for Course X"       │
                                    │  [Update] [Skip]     │
                                    └─────────────────────┘
```

Check frequency: once per day (or on manual pull-to-refresh in the catalogue screen). Cache the catalogue JSON locally for offline use.

---

## 8. Internationalization Architecture

### The Challenge

Qur'anic Arabic learners speak hundreds of languages. The Arabic text is universal, but translations must support: English, Urdu, Tamil, Hindi, Bengali, Malay, Indonesian, Turkish, French, German, Somali, Swahili, and many more. Each has its own script and direction.

### Design: One i18n File Per Language Per Course

```
i18n/
├── en.yaml          ← English (default, ships with course)
├── ur.yaml          ← Urdu (RTL)
├── ta.yaml          ← Tamil
├── hi.yaml          ← Hindi (Devanagari)
├── bn.yaml          ← Bengali
├── ms.yaml          ← Malay
├── id.yaml          ← Indonesian
├── tr.yaml          ← Turkish
└── fr.yaml          ← French
```

Each file follows an identical schema — only the content values differ. This makes community translation straightforward: copy `en.yaml`, rename to your language code, translate the values.

### RTL Support Matrix

| Language | Script | Direction | Special Considerations |
|----------|--------|-----------|----------------------|
| Arabic | Arabic | RTL | Always present (source text). Amiri font. |
| Urdu | Arabic (Nastaliq) | RTL | Needs Nastaliq font variant (e.g., Noto Nastaliq Urdu) |
| Farsi | Arabic (Naskh) | RTL | Same Arabic script, different vocabulary |
| English | Latin | LTR | Default translation language |
| Tamil | Tamil | LTR | Unique script, needs Noto Sans Tamil |
| Hindi | Devanagari | LTR | Noto Sans Devanagari |
| Bengali | Bengali | LTR | Noto Sans Bengali |

**Implementation**: React Native's `I18nManager.forceRTL()` handles layout direction. The app detects the selected translation language's direction from the i18n file's `direction` field and adjusts accordingly. Arabic text always renders RTL regardless of the UI direction.

### Community Translation Workflow

```
1. Translator forks the course repo on GitHub
2. Copies i18n/en.yaml → i18n/{lang-code}.yaml
3. Translates all values (keys remain identical)
4. Runs: lqwg validate --language {lang-code}
   (checks: all keys present, no empty values, valid UTF-8)
5. Optionally runs: lqwg build-audio --language {lang-code}
   (generates TTS audio for the new language)
6. Opens a pull request
7. Course author merges → new release → catalogue updates
```

### TTS Language Support

edge-tts supports 400+ voices across 80+ languages. Key voices for our audience:

| Language | edge-tts Voice | Quality |
|----------|---------------|---------|
| English | `en-US-AriaNeural` | Excellent |
| Urdu | `ur-PK-AsadNeural` | Good |
| Arabic | `ar-SA-HamedNeural` | Good (for teaching phrases only) |
| Tamil | `ta-IN-ValluvarNeural` | Good |
| Hindi | `hi-IN-MadhurNeural` | Excellent |
| Bengali | `bn-IN-TanishaaNeural` | Good |
| Malay | `ms-MY-YasminNeural` | Good |
| Turkish | `tr-TR-AhmetNeural` | Good |
| French | `fr-FR-DeniseNeural` | Excellent |

---

## 9. Quality Control Without Central Review

### Automated Validation (Phase 1 — CLI)

The `lqwg validate` command checks:

| Check | What It Validates |
|-------|-------------------|
| **Schema validation** | YAML matches the course package schema (required fields, types, structure) |
| **Verse verification** | Arabic text matches the Quran API for claimed verse references |
| **Reciter uniqueness** | No reciter appears twice in the same lesson (per our pedagogical rule) |
| **Audio presence** | Every sentence has a valid audio source (bundled file or valid CDN reference) |
| **Translation completeness** | Every i18n file has translations for all sentence keys |
| **Role distribution** | Each lesson has the correct number of anchor/learn/practice sentences |
| **UTF-8 correctness** | Arabic text uses proper Unicode (no mangled encoding) |
| **File size limits** | Audio files within reasonable size bounds (no accidental raw WAV files) |

### Verified Badge (Phase 2)

Courses that pass all automated checks receive a "✓ Verified" badge in the catalogue. This doesn't mean the content is pedagogically reviewed — only that it's structurally sound.

Criteria for "Verified":
- ✅ All automated validation checks pass
- ✅ Course has been installed by 10+ users (based on GitHub release download count)
- ✅ Author has a linked GitHub account (accountability)

### Community Ratings (Phase 3)

If/when the platform grows, add simple feedback:
- 👍 / 👎 (binary — simpler and less gameable than 5-star ratings)
- Stored locally first, optionally submitted to a lightweight API (or a GitHub issue on the catalogue repo)

### How Anki Handles Quality (and Why We Can Do Better)

Anki has minimal quality control — anyone can upload anything. The rating system is broken (ratings can't be sorted, fake reviews exist, buttons are sometimes non-functional per AnkiWeb forum reports). Discoverability is poor (basic text search only).

We improve on this by:
1. **Structural enforcement**: Our strict schema prevents the "grab bag of random cards" problem
2. **Automated verification**: Verse text correctness is machine-checkable
3. **Curated catalogue**: The PR-based listing process provides light human review
4. **Fewer, better courses**: We're targeting a niche (Qur'anic Arabic), not all human knowledge. Dozens of high-quality courses, not thousands of random ones.

---

## 10. Open Source & Licensing Strategy

### Dual Licensing Model

| Component | License | Rationale |
|-----------|---------|-----------|
| **App code** (Expo/React Native) | MIT | Maximum adoption. Anyone can fork, modify, redistribute. |
| **CLI tools** (`lqwg`) | MIT | Same — tools should be freely usable. |
| **Course content** (YAML, translations) | CC BY-SA 4.0 | Creative Commons is designed for content, not code. ShareAlike ensures derivatives stay open. |
| **Qur'anic text** | Public domain | The Quran is not copyrightable. |
| **Recitation audio** | Per-reciter license | EveryAyah audio has its own terms. Course creators must respect them. |

### Why Not GPL?

GPL's copyleft would require anyone who embeds our app code to release their full app source. This discourages adoption — an Islamic school building a custom app shouldn't need to navigate GPL compliance. MIT is simpler and more permissive.

### Why CC BY-SA for Content?

- **BY (Attribution)**: Course creators get credited. "Based on Learn Qur'an Without Grammar by Siraj Samsudeen."
- **SA (ShareAlike)**: If someone modifies a course, they must share under the same terms. This prevents someone from taking an open course, making minor changes, and selling it as closed content.
- **Not NC (NonCommercial)**: We intentionally omit NC. If an Islamic school wants to sell a printed companion workbook alongside the course, that's fine. The openness of the digital format is what matters.

### Open Source Patterns from Education

**OpenStax** (Rice University): Publishes free, peer-reviewed textbooks under CC BY 4.0. Content is available as PDF, web, and editable formats. Authors create via a web editor or Google Docs import. Key lesson: **lower the authoring barrier as much as possible**.

**Open edX** (edX/2U): Open-source LMS platform. Course content is created via "Studio" (a web authoring tool) and stored as "OLX" (Open Learning XML). Key lesson: **the authoring tool matters as much as the format**. Their Studio UI made it possible for non-technical instructors to create courses.

For our solo-developer context, we can't build a Studio-equivalent web editor. The Google Sheets import path serves the same purpose — it's the teacher's "Studio."

---

## 11. Integration with Understand Quran

### About Understand Quran Academy

[understandquran.com](https://understandquran.com/) was founded by Dr. Abdulazeez Abdulraheem in 1998. Their methodology:

- **Frequency-based**: Course 1 teaches ~125 words that cover **50% of all Qur'anic word occurrences**
- **Progressive courses**: 5 courses covering increasingly rare vocabulary, plus Tajweed, Seerah, and reading courses
- **Structured lessons**: Each lesson (labeled A/B) covers a handful of words with Qur'anic examples
- **Multi-language**: Available in English, Urdu, French, German, and other languages
- **School program**: Adapted for weekend Islamic schools with teacher training
- **Free access**: Video courses are free online; physical books available for purchase

### Mapping Their Content to Our Format

| Understand Quran Concept | Our Format Equivalent |
|--------------------------|----------------------|
| Course 1 (50% words) | A single `.lqcourse` package with ~20 lessons |
| Lesson 1A, 1B | Two lessons in our format (or one with more sentences) |
| Vocabulary word + Qur'anic example | A `learn` sentence with the word as the `form` |
| Salah phrases | `anchor` sentences (phrases every Muslim knows) |
| Word frequency stats | Course metadata (`tags: [frequency-based]`) |
| PDF master sheets | Source data for the `import-sheet` workflow |

### Pilot Integration Plan

```
Phase A: Manual Conversion (1 week)
──────────────────────────────────
1. Download Course 1 English master sheet PDF
2. Extract vocabulary and Qur'anic examples into a Google Sheet
3. Map each lesson to our YAML format
4. Generate audio (TTS for translations, EveryAyah for Qur'anic examples)
5. Validate and package as understand-quran-c1.lqcourse
6. Test in the app alongside the LQWG course

Phase B: Author Collaboration (if Phase A succeeds)
──────────────────────────────────────────────────
1. Share the pilot package with Dr. Abdulraheem's team
2. Get feedback on accuracy, pedagogical mapping, and missing context
3. Discuss official listing in the catalogue (with their blessing)
4. Explore adapting their Urdu and other language versions

Phase C: Template for All 5 Courses
──────────────────────────────────
1. Create a repeatable pipeline for Courses 2-5
2. Document the conversion process for their team to take ownership
3. Each course becomes a separate .lqcourse package
```

### Sensitivity Considerations

- **Respect existing relationships**: The creator (Siraj) studies under this teacher. The integration should be collaborative, not extractive.
- **Attribution**: Full credit to Dr. Abdulraheem and the Academy. Course description links to understandquran.com.
- **No competition framing**: Position as "their course, available in a new format" — not "our alternative to their course."
- **Content accuracy**: Their pedagogical choices should be preserved, not editorialised. If they teach a word with a specific Qur'anic example, use that example.

---

## 12. Course Creator's Guide (Outline)

The full guide would be published as `docs/COURSE-CREATOR-GUIDE.md`. Here's the planned structure:

```
# Course Creator's Guide

## 1. Quick Start (30 minutes)
   - What is a course package?
   - Install the lqwg CLI
   - Create your first 3-lesson course from a template
   - Preview it in the app

## 2. Course Design
   - Choosing your pedagogical approach
   - Lesson structure: anchor → learn → practice
   - How many sentences per lesson (recommended: 10-12)
   - Selecting Qur'anic verses as examples
   - Writing effective translations

## 3. Content Creation: Google Sheets Path
   - Download the template spreadsheet
   - Fill in your content (with examples)
   - Export as CSV
   - Import with: lqwg import-sheet

## 4. Content Creation: YAML Path
   - The course.yaml manifest
   - Writing lesson files
   - Translation files (i18n/)
   - Tips for Arabic text entry

## 5. Audio
   - How Qur'anic recitation works (EveryAyah CDN)
   - Choosing reciters
   - Finding timestamps for partial-ayah clips
   - Generating translation audio (edge-tts)
   - Using custom audio files

## 6. Validation & Testing
   - Running lqwg validate
   - Common errors and fixes
   - Testing in the app (dev mode side-loading)

## 7. Publishing
   - Creating a GitHub repo for your course
   - Making a release
   - Submitting to the catalogue
   - Sharing directly (.lqcourse file)

## 8. Maintenance
   - Updating your course (new version)
   - Adding translations (community workflow)
   - Responding to feedback

## Appendix A: Complete course.yaml Schema Reference
## Appendix B: Supported Reciters List
## Appendix C: edge-tts Voice List
## Appendix D: Example Courses (links to repos)
```

---

## 13. Platform Roadmap

### Phase 1: Single Course, Single Author (Current → v1.0)

**Goal:** Ship the app with Siraj's "Learn Qur'an Without Grammar" course as the only content. But build the data model to support multiple courses from day one.

| Task | Detail |
|------|--------|
| SQLite schema with `course_id` | Even with one course, the column exists |
| Course package format v1 | Define `course.yaml` and `lesson.yaml` schemas |
| Build pipeline | Python tools already exist; formalise into `lqwg build` |
| FSRS integration | Per-course parameters, single review queue |
| Offline-first audio | Download EveryAyah files on first lesson open, cache indefinitely |

**Milestone:** App on TestFlight/Google Play beta with the LQWG course working end-to-end.

### Phase 2: Multi-Course + Distribution (v1.1 → v1.5)

**Goal:** A second course exists and can be installed. The catalogue works.

| Task | Detail |
|------|--------|
| `.lqcourse` import | Tap a file → app installs the course |
| In-app catalogue | Fetch `catalogue.json`, display available courses |
| Course install/uninstall | Download, unzip, import to SQLite, cache audio |
| Course switcher UI | Home screen shows installed courses + review summary |
| `lqwg` CLI v1.0 | `init`, `validate`, `build-audio`, `package` commands |
| Understand Quran pilot | Convert Course 1 as a proof-of-concept second course |
| Google Sheets import | `lqwg import-sheet` command |

**Milestone:** Two courses installable side-by-side. One external teacher has successfully created a course using the CLI.

### Phase 3: Community & Polish (v2.0)

**Goal:** The platform is genuinely open. Multiple teachers have published courses.

| Task | Detail |
|------|--------|
| Course update notifications | Badge when a newer version is available |
| Community translations | Workflow documented, i18n contributions flowing |
| Verified badge | Automated checks grant ✓ in the catalogue |
| Course Creator's Guide | Complete documentation published |
| Template courses | 2-3 template repos on GitHub for common approaches |
| Feedback mechanism | Simple 👍/👎 per course, stored locally |
| Course-specific theming | Optional accent colour and icon from `course.yaml` |

**Milestone:** 5+ courses in the catalogue from 3+ different authors. At least one non-English-primary course.

### Phase 4: Ecosystem (v3.0 — Future Vision)

| Task | Detail |
|------|--------|
| Web-based course editor | A simple web app for creating courses without CLI |
| Cross-course root reinforcement | If two courses teach the same root, SRS recognises this |
| Course prerequisites | "Install Course 1 before Course 2" enforcement |
| Analytics (opt-in) | Anonymous usage data to help course creators improve |
| Plugin system | Custom card types, gamification modules, leaderboards |

### Implementation Priority Matrix

```
                        HIGH IMPACT
                            │
          Phase 2           │          Phase 1
     (Catalogue +           │     (Single course +
      CLI tools)            │      core app)
                            │
  LOW EFFORT ───────────────┼─────────────── HIGH EFFORT
                            │
          Phase 3           │          Phase 4
     (Community +           │     (Web editor +
      translations)         │      ecosystem)
                            │
                        LOW IMPACT
```

The critical path is **Phase 1 → Phase 2**. Everything in Phase 1 is needed anyway (you're building an app). Phase 2 is the "platform unlock" — the point where a second person can create content. Phases 3-4 are driven by community demand.

---

## Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package format | ZIP of YAML + audio (`.lqcourse`) | Human-readable, inspectable, tooling-universal |
| Content format | YAML (not JSON) | Comments, readability, multi-line strings for Arabic |
| Database | Single SQLite, `course_id` column | Cross-course queries, simpler management |
| SRS | Per-course FSRS params, unified queue | Best of both worlds: course-tuned + global scheduling |
| Distribution | GitHub Releases + JSON catalogue | Free, CDN-backed, versioned, no server needed |
| Catalogue model | PR-based (like Obsidian) | Light gatekeeping without bureaucracy |
| Authoring | Two tracks: Google Sheets + YAML | Teachers get simplicity, developers get power |
| Audio | EveryAyah CDN + edge-tts | Free, high quality, no hosting cost |
| Translations | One YAML file per language | Simple to create, validate, and contribute |
| App license | MIT | Maximum adoption |
| Content license | CC BY-SA 4.0 | Open but protected from closed derivatives |
| First external course | Understand Quran Course 1 | Natural fit — same teacher lineage, proven content |

---

*This document is a living research artefact. As the platform evolves, decisions will be validated against real-world usage and updated accordingly.*
