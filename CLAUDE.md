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
└── docs/
    ├── ARCHITECTURE.md              ← Tech stack, deployment, roadmap
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

### Audio — two sources
1. **EveryAyah CDN** for Qur'anic verses:
   ```html
   <audio controls preload="none" src="https://everyayah.com/data/Husary_128kbps/SSSAAA.mp3#t=START,END"></audio>
   ```
   Format: `SSSAAA.mp3` where SSS = surah (3 digits), AAA = ayah (3 digits).
   Time fragments `#t=START,END` trim to the specific phrase (seconds, decimals OK).
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
| `docs/LESSON-PLAN.md` | **Lesson structure, sentence selection process, curriculum design** |
| `docs/ARCHITECTURE.md` | Tech stack, deployment, roadmap |
| `docs/decisions/ADR-001-hosting.md` | Why GitHub Pages + Jekyll |
| `docs/decisions/ADR-002-audio.md` | Why HTML5 `#t=` fragments + EveryAyah |
| `docs/decisions/ADR-003-file-structure.md` | Naming conventions + `lessons/` folder |
| `docs/decisions/ADR-004-jekyll-html.md` | `markdown="0"` for HTML blocks |
