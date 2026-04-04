# CLAUDE.md — AI Assistant Context

This file gives you instant context for every new session. Read this first.

---

## Project Purpose

**Learn Qur'an Without Grammar** is a self-study course that teaches Qur'anic Arabic recognition — not academic study. It starts from phrases every Muslim already knows (adhān, ṣalāh) and expands outward through root-word families. The method: repeated listening + audio immersion → natural pattern recognition, with no grammar terminology and no memorisation pressure.

Live site: **https://siraj-samsudeen.github.io/learn-quran-without-grammar/**

---

## File & Folder Structure

```
learn-quran-without-grammar/
├── CLAUDE.md                        ← (this file) AI assistant context
├── README.md                        ← Human-readable project overview
├── course_intro.md                  ← Full course introduction (published page, linked from homepage)
├── _config.yml                      ← Jekyll config + exclude list
├── index.md                         ← Home page with lesson cards
├── lessons/
│   └── lesson-01-allahu-akbar.md    ← Lesson 1: root ك ب ر
├── _layouts/
│   └── default.html                 ← Single HTML layout
├── assets/
│   ├── audio/
│   │   └── adhan-allahu-akbar.mp3   ← Trimmed local MP3 for non-Quranic audio
│   └── css/
│       └── style.css
├── tools/
│   ├── build-lesson-audio.py        ← Builds sequential MP3 + individual pairs from YAML
│   ├── generate-tts.sh              ← Single-sentence English TTS (edge-tts)
│   ├── generate-tts-batch.py        ← Batch English TTS generation
│   ├── shuffle-player-demo.html     ← Web player prototype (random repeat mode)
│   └── lesson-audio/
│       └── lesson-01.yaml           ← Audio definition for Lesson 1
└── docs/
    ├── ARCHITECTURE.md              ← Tech stack, deployment, roadmap
    ├── AUDIO-SYSTEM.md              ← Audio pipeline design (TTS, compilation, web player)
    ├── LESSON-PLAN.md               ← Lesson structure + teacher selection preferences
    ├── selections/
    │   ├── lesson-01.md             ← Selection log: what was picked and why
    │   └── pipeline.md              ← Sentence queue for future lessons (check FIRST)
    └── decisions/
        ├── ADR-001-hosting.md
        ├── ADR-002-audio.md
        ├── ADR-003-file-structure.md
        └── ADR-004-jekyll-html.md
```

---

## Key Conventions

### Lesson file naming
- Pattern: `lessons/lesson-NN-slug.md` — all lowercase kebab-case
- Example: `lessons/lesson-02-bismillah.md`
- Jekyll URL: `/lessons/lesson-02-bismillah/`

### Front matter (every lesson)
```yaml
---
layout: default
title: 'Lesson N: English Title'
description: One-sentence description for SEO/social sharing.
---
```

### Lesson content — use Markdown, not HTML
- **Tables**: always use standard markdown pipe syntax (`| Arabic | English |`), never HTML `<table>` tags
- Use Kramdown IAL to add CSS classes: `{: .root-table}` after the table
- Root table columns: **Arabic | English | Meaning** (not "Transliteration" — saves mobile space)
- **Verse sections**: use the `### N · form-name (english)` heading pattern — `lesson-cards.js` transforms these into styled verse cards
- Anchor phrase headings use `### ⭐ Anchor · description` (no number, so JS skips them)
- Keep everything in Markdown — HTML is only for `<audio>` tags, `<p class="audio-label">` labels, and `<div>` blocks explicitly needed (with `markdown="0"`)

### Learning section — keep phrases short
- **Learn phrases should be as short as possible** — they must be memorizable, even by weaker students
- **Practice phrases can be longer** — the student has already met the words
- **Story context principle**: include enough text so the phrase has a story hook (who said what to whom), but trim anything beyond that. Example: "And when Ibrahim said to his father Azar: Do you take idols as gods?" keeps the story, while "I see you and your people in clear error" is extra detail to cut.
- **Hook text principle**: the note/hook beneath each phrase should explain **what we are teaching** (the language aspect, the root, the form) — NOT the meaning of the verse. The student can read the meaning in the translation. The hook should help them notice the word or pattern.
- **Translation style**: use simple, everyday English — "King of kings" not "Owner of all sovereignty". Ar-Raḥmān = "the Most Merciful", Ar-Raḥīm = "the Continuously Merciful". See `docs/LESSON-PLAN.md` → "Translation Style" for the full table.
- **TTS-safe English**: in the YAML `english:` field (used for TTS audio), avoid special transliteration characters (ʿ ā ī ū ṣ ḍ ṭ ẓ ḥ) — they cause gibberish. Use plain ASCII equivalents (e.g., `Aad` not `ʿĀd`). The lesson page `.md` can still use proper transliteration.
- **Practice order**: shortest phrases first, longest last — progressive difficulty
- **Headings**: always a single word form, never multi-word phrases (e.g., `### 6 · إِلَٰه (god)` not `### 6 · إِلَٰهٌ وَاحِدٌ (one God)`)
- **Surah references**: in brackets at the end — `(Al-Baqarah 2:34)` — not before the Arabic text
- **Review audio uses full ayahs**: learning cards on the page use trimmed fragments for precision, but the review audio (Review in Order / Review Shuffled) plays the full ayah — this trains recognition in context, mimicking real ṣalāh experience
- **Root letters**: show both Arabic and English — `**أ ل ه** (alif lām hā)` — for students who can't read Arabic well on mobile
- See `docs/LESSON-PLAN.md` → "Story Context Principle" for the full rule

### Audio — two sources
1. **EveryAyah CDN** for Qur'anic verses — **use different reciters** (see `docs/decisions/ADR-005-reciters.md`):
   ```html
   <audio controls preload="none" src="https://everyayah.com/data/{RECITER_FOLDER}/SSSAAA.mp3#t=START,END"></audio>
   ```
   Format: `SSSAAA.mp3` where SSS = surah (3 digits), AAA = ayah (3 digits).
   Time fragments `#t=START,END` trim to the specific phrase (seconds, decimals OK).
   Match reciter speed to segment length: slow reciters for short segments, faster reciters for longer ones.
   Use `tools/find-audio-fragment.py` to analyze silence points and find correct time fragments.
   ⚠️ CDN cache is ~296 days — existing URLs are stable; avoid unnecessary changes.

2. **Local MP3s** in `assets/audio/` for non-Quranic content (adhān, duʿā, etc.):
   ```liquid
   <audio controls preload="none" src="{{ '/assets/audio/filename.mp3' | relative_url }}"></audio>
   ```

### HTML blocks inside Markdown
Use `markdown="0"` on the wrapper div to prevent Kramdown from mangling inline HTML:
```html
<div class="lesson-card" markdown="0" onclick="...">
```
See ADR-004 for details.

### Lesson card links (index.md)
```liquid
{{ '/lessons/lesson-NN-slug' | relative_url }}
```

---

## How to Deploy

```bash
git add .
git commit -m "your message"
git push
```

GitHub Actions builds Jekyll and deploys to GitHub Pages automatically. Live in ~1 minute.

---

## How to Add a New Lesson

1. Create `lessons/lesson-NN-slug.md` (copy front matter from an existing lesson)
2. Add a lesson card div to `index.md` pointing to the new URL
3. Commit and push

---

## Deeper Context → Docs & ADRs

| File | Topic |
|------|-------|
| `docs/LESSON-PLAN.md` | **Lesson structure, root word convention, sentence selection, teacher preferences, learning science conventions** |
| `docs/selections/lesson-NN.md` | Per-lesson selection logs — what was picked and why |
| `docs/selections/pipeline.md` | **Sentence pipeline — check this FIRST when starting a new lesson** |
| `docs/AUDIO-SYSTEM.md` | Audio pipeline: TTS, clip extraction, sequential MP3, web shuffle player |
| `tools/build-lesson-audio.py` | Builds all audio assets from a lesson YAML definition |
| `tools/lesson-audio/lesson-01.yaml` | Audio definition for Lesson 1 (all 20 sentences + hadith) |
| `docs/ARCHITECTURE.md` | Tech stack, deployment, roadmap |
| `docs/decisions/ADR-001-hosting.md` | Why GitHub Pages + Jekyll |
| `docs/decisions/ADR-002-audio.md` | Why HTML5 `#t=` fragments + EveryAyah |
| `docs/decisions/ADR-003-file-structure.md` | Naming conventions + `lessons/` folder |
| `docs/decisions/ADR-004-jekyll-html.md` | `markdown="0"` for HTML blocks |
| `how-to-study.md` | Study guide page — 15-min session, passive listening, spaced schedule |
| `.claude/skills/learning-science-review.md` | **Skill: 4-lens learning science review for lessons** |
