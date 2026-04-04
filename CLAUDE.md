# CLAUDE.md — AI Assistant Context

Read this first. It gives you instant orientation for every new session.

---

## Project Purpose

**Learn Qur'an Without Grammar** — a self-study course teaching Qur'anic Arabic recognition through root-word families, audio immersion, and phrases from daily prayers (adhān, ṣalāh). No grammar terminology, no memorisation pressure.

Live site: **https://siraj-samsudeen.github.io/learn-quran-without-grammar/**

---

## ⚠️ Common Mistakes

- **Never reuse timings across reciters** — `#t=` fragments are reciter-specific. Run `tools/auto-timestamps.py` or `tools/find-audio-fragment.py` when changing reciters.
- **Never use grammar terms in lessons** — no "singular", "plural", "feminine", "Form X", "prefix", "occurs N times". Plain English about meaning only.
- **Never put transliteration chars in YAML `english:` fields** — no ʿ ā ī ū ṣ ḍ ṭ ẓ ḥ. Use plain ASCII (e.g., `Aad` not `ʿĀd`). TTS produces gibberish.
- **Never omit `markdown="0"` on divs with Arabic text** — Kramdown wraps Arabic in incorrect `<p>` tags and breaks RTL layout.
- **Never repeat a reciter in one lesson** — each Qur'anic phrase needs a different reciter from the pool in `docs/decisions/ADR-005-reciters.md`.

---

## File & Folder Structure

```
learn-quran-without-grammar/
├── CLAUDE.md                        ← (this file) AI hub — read first
├── .claude/
│   ├── rules/                       ← Path-scoped rules (auto-load by file type)
│   │   ├── lesson-content.md        ← Rules for lessons/*.md
│   │   ├── audio-conventions.md     ← Rules for tools/ and assets/audio/
│   │   └── jekyll-html.md           ← Rules for layouts and all .md
│   └── skills/
│       ├── lesson-pipeline.md       ← Master workflow: 5 phases + gates
│       ├── add-lesson.md            ← Step-by-step lesson file creation
│       ├── verse-selection.md       ← Root inventory + verse scoring + teacher approval
│       ├── lesson-audio.md          ← Audio pipeline (YAML, build, TTS, reciters)
│       ├── lesson-review-checklist.md ← Pre-commit structural checks
│       ├── learning-science-review.md ← 4-lens pedagogical review
│       ├── jekyll-publish-page.md    ← Publishing draft files
│       └── templates/
│           ├── lesson-template.md   ← Fill-in-the-blanks lesson skeleton
│           └── lesson-audio-template.yaml ← Fill-in-the-blanks YAML skeleton
├── lessons/
│   └── lesson-01-allahu-akbar.md    ← Lesson 1: roots إِلَٰه + كَبُرَ
├── docs/
│   ├── LESSON-PLAN.md               ← Lesson structure, selection process, teacher preferences
│   ├── SCORING.md                   ← 8-dimension verse scoring algorithm
│   ├── AUDIO-SYSTEM.md              ← Audio pipeline design (TTS, build, web player)
│   ├── ARCHITECTURE.md              ← Tech stack, deployment, roadmap
│   ├── roots/                       ← Root inventory JSONs (forms + verses + scores)
│   │   ├── ilah.json                ← Root إِلَٰه — all forms, verses, scores
│   │   └── kabura.json              ← Root كَبُرَ — all forms, verses, scores
│   ├── selections/
│   │   ├── lesson-01.md             ← Selection log: what was picked and why
│   │   └── pipeline.md              ← Verse queue for future lessons
│   └── decisions/
│       ├── ADR-001 to ADR-005       ← Architecture decision records
│       ├── ADR-006-auto-timestamps.md ← Word-level timestamps via Quran Foundation API
│       └── ADR-007-audio-apis-research.md ← All audio API alternatives evaluated
├── tools/
│   ├── auto-timestamps.py           ← Word-level timestamps from Quran Foundation API
│   ├── find-audio-fragment.py       ← Silence-based timestamp fallback (5 reciters)
│   ├── build-lesson-audio.py        ← Builds MP3s + manifest from YAML
│   ├── rebuild-lesson-audio.sh      ← Wrapper: clean + build + copy to _site
│   ├── validate-lesson-consistency.py ← Checks YAML/MD sync, reciters, timestamps
│   ├── check-text-audio-sync.py     ← Verifies text matches audio
│   ├── verify-verse.py              ← Verifies verse text against API
│   ├── generate-tts.sh              ← Single-sentence English TTS
│   ├── generate-tts-batch.py        ← Batch English TTS generation
│   ├── pre-commit-hook.sh           ← Auto-validates lessons before commit
│   └── lesson-audio/
│       └── lesson-01.yaml           ← Audio definition for Lesson 1
├── assets/ (audio/, css/, js/)
├── _layouts/ (default.html, lesson.html)
├── index.md, course_intro.md, how-to-study.md
└── _config.yml
```

---

## Key Commands

```bash
# Deploy
git add . && git commit -m "message" && git push   # Live in ~1 minute

# Audio timestamps (primary — 7 reciters)
python tools/auto-timestamps.py 29:45 --reciter Abdul_Basit_Murattal_192kbps --words 15-17

# Audio timestamps (fallback — all reciters)
python tools/find-audio-fragment.py 29:45 --reciter Yasser_Ad-Dussary_128kbps

# Build lesson audio
tools/rebuild-lesson-audio.sh lesson-NN

# Validate lesson
python tools/validate-lesson-consistency.py lesson-NN

# Verify verse text
python tools/verify-verse.py 29:45
```

---

## Deep Context — Read When Needed

| When | Read |
|------|------|
| **Creating a new lesson** | `.claude/skills/lesson-pipeline.md` first, then follow each phase |
| **Selecting verses** | `.claude/skills/verse-selection.md` + `docs/LESSON-PLAN.md` + `docs/roots/{root}.json` |
| **Writing lesson content** | `.claude/skills/templates/lesson-template.md` + `.claude/skills/add-lesson.md` |
| **Working on audio** | `.claude/skills/lesson-audio.md` + `docs/decisions/ADR-005-reciters.md` |
| **Finding timestamps** | `docs/decisions/ADR-006-auto-timestamps.md` |
| **Reviewing a lesson** | `.claude/skills/lesson-review-checklist.md` |
| **Learning science review** | `.claude/skills/learning-science-review.md` |
| **Publishing a page** | `.claude/skills/jekyll-publish-page.md` |
| **Starting a new lesson** | Check `docs/selections/pipeline.md` FIRST, then `docs/roots/` for existing inventory |
| **Scoring verses** | `docs/SCORING.md` — 8-dimension algorithm |
