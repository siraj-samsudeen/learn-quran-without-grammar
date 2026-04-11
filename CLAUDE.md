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
- **Never put `.lang-en` / `.lang-ta` classes directly on a `<table>`** — `.root-table` has `display: table !important` which overrides `display: none`. Wrap tables in `<div class="lang-en/ta" markdown="1">` instead.
- **Never use two `<summary>` inside `<details>`** — HTML only allows one. Use `<span class="lang-en">` and `<span class="lang-ta">` inside a single `<summary>`.
- **Script load order in lesson.html matters** — `translation-toggle.js` must load before `language-toggle.js` (language toggle inserts into the float container created by translation toggle).

---

## Multi-Language Support (Tamil)

Lesson 01 has full Tamil translation. The system supports toggling between EN and Tamil.

### How it works
- **Language toggle**: `EN | தமிழ்` button floats bottom-right alongside Hide translations
- **CSS classes**: `.lang-en` / `.lang-ta` on elements — CSS shows/hides based on `body.lang-active-ta`
- **localStorage key**: `lqwg-language` → `'en'` (default) or `'ta'`
- **Tamil font**: Noto Sans Tamil loaded via Google Fonts, CSS var `--font-tamil`

### Content patterns in lesson .md files

**Prose blocks** (root explanations, hooks, closing):
```html
<div class="lang-en" markdown="1">
English prose here...
</div>

<div class="lang-ta" markdown="1">
Tamil prose here...
</div>
```

**Verse translations** — Tamil line after English, with `{: .ta}` IAL:
```markdown
"He is Allah — there is no **god** but He"

"அவன் அல்லாஹ் — அவனைத் தவிர வேறு **இறைவன்** இல்லை"
{: .ta}
```

**Hooks** — Tamil hook with `{: .hook-ta}` IAL:
```markdown
This is the English hook text.

Tamil hook text here.
{: .hook-ta}
```

**Root tables** — wrap in div, NOT IAL on table (see Common Mistakes):
```html
<div class="lang-en" markdown="1">

| Arabic | English | Meaning |
| --- | --- | --- |
| إِلَٰه | *ilāh* | god |
{: .root-table}

</div>

<div class="lang-ta" markdown="1">

| அரபி | தமிழ் | பொருள் |
| --- | --- | --- |
| إِلَٰه | *இலாஹ்* | கடவுள் |
{: .root-table}

</div>
```
**Tamil table columns**: அரபி (Arabic) | தமிழ் (Tamil transliteration) | பொருள் (Meaning). Use Tamil script transliteration, NOT English transliteration.

**Pair-tables** (teaching phrases) — wrap in div per language:
```html
<div class="lang-en" markdown="1">

| | |
|---|---|
| هُوَ **كَبِيرٌ** | "He is **great**" |
{: .pair-table}

</div>

<div class="lang-ta" markdown="1">

| | |
|---|---|
| هُوَ **كَبِيرٌ** | "அவன் **பெரியவன்**" |
{: .pair-table}

</div>
```

**Audio in verse cards** — two `<audio>` elements, CSS shows one:
```markdown
(Al-Ḥashr 59:22) · <audio class="lang-en" controls preload="none" src="{{ '/assets/audio/lessons/lesson-01/anchor-ilah.mp3' | relative_url }}"></audio><audio class="lang-ta" controls preload="none" src="{{ '/assets/audio/lessons/lesson-01/anchor-ilah-ta.mp3' | relative_url }}"></audio>
```
Each card plays a single pair MP3 (Arabic recitation + translation TTS). The `lang-en`/`lang-ta` classes control which one is visible.

**Inline spans** (inside `<summary>`, quiz prompts):
```html
<summary><span class="lang-en">إِلَٰهَ means…</span><span class="lang-ta">إِلَٰهَ என்றால்…</span></summary>
```

**Headings** — use IAL for simple headings:
```markdown
#### Phrases
{: .lang-en}

#### சொற்றொடர்கள்
{: .lang-ta}
```

**Review / Download audio** — separate elements per language:
```markdown
<audio class="review-audio-en" ...src="lesson-01-full.mp3">
<audio class="review-audio-ta" ...src="lesson-01-full-ta.mp3">
```

### Audio pipeline for Tamil
- **YAML**: add `tamil:` field alongside `english:` for each sentence
- **Build**: `python tools/build-lesson-audio.py tools/lesson-audio/lesson-NN.yaml --lang all`
- **Tamil TTS voice**: `ta-IN-ValluvarNeural` (male)
- **Output**: `{id}-ta.mp3` pair files + `lesson-NN-full-ta.mp3`
- **Manifest**: includes `file_tamil`, `tamil`, `duration_tamil` fields per sentence

### Shuffle player
The shuffle player reads `localStorage('lqwg-language')` and plays the matching pair audio (`s.file` for EN, `s.file_tamil` for TA). Text display also switches.

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
│   ├── app/
│   │   ├── PLATFORM-PRD.md          ← ⭐ Platform vision, architecture, phased roadmap (READ THIS for app work)
│   │   ├── RESEARCH-SYNTHESIS.md    ← Companion app research (TTS, SRS, tech, competitors)
│   │   ├── APP-REQUIREMENTS.md      ← Earlier app requirements (partially superseded by PLATFORM-PRD.md)
│   │   └── research-*.md            ← Deep-dive research (Glossika, Expo, methods, platform)
│   ├── selections/
│   │   ├── lesson-01.md             ← Selection log: what was picked and why
│   │   └── pipeline.md              ← Verse queue for future lessons
│   └── decisions/
│       ├── ADR-001 to ADR-005       ← Architecture decision records
│       ├── ADR-006-auto-timestamps.md ← Word-level timestamps via Quran Foundation API
│       ├── ADR-007-audio-apis-research.md ← All audio API alternatives evaluated
│       └── ADR-009-local-root-pipeline.md ← ⭐ Local morphology + Tanzil + Sahih replaces live corpus scraping
├── tools/
│   ├── data/                        ← Vendored datasets for offline builds (see SOURCE.md)
│   │   ├── quran-morphology.txt     ← mustafa0x/quran-morphology (GPL) — roots + lemmas
│   │   ├── quran-uthmani.txt        ← Tanzil full Uthmani text (matches our arabic_full)
│   │   └── quran-trans-en-sahih.txt ← Saheeh International draft translations
│   ├── build-root-inventory.py      ← ⭐ Builds docs/roots/*.json from local data (replaces corpus scraping)
│   ├── auto-timestamps.py           ← Word-level timestamps from Quran Foundation API
│   ├── find-audio-fragment.py       ← Silence-based timestamp fallback (5 reciters)
│   ├── build-lesson-audio.py        ← Builds MP3s + manifest from YAML
│   ├── rebuild-lesson-audio.sh      ← Wrapper: clean + build + copy to _site
│   ├── validate-lesson-consistency.py ← Checks YAML/MD sync, reciters, timestamps
│   ├── check-text-audio-sync.py     ← Verifies text matches audio
│   ├── verify-verse.py              ← Verifies verse text against API
│   ├── fetch-verses.py              ← Legacy ad-hoc verse fetch (no longer on critical path)
│   ├── generate-tts.sh              ← Single-sentence English TTS
│   ├── generate-tts-batch.py        ← Batch English TTS generation
│   ├── pre-commit-hook.sh           ← Auto-validates lessons before commit
│   └── lesson-audio/
│       └── lesson-01.yaml           ← Audio definition for Lesson 1
├── assets/
│   ├── audio/lessons/lesson-01/     ← EN + Tamil MP3 pairs, manifest.json
│   ├── css/style.css                ← Includes Tamil font + lang toggle CSS
│   └── js/
│       ├── lesson-cards.js          ← Verse card builder (handles .ta, .hook-ta)
│       ├── language-toggle.js       ← EN ↔ Tamil toggle (floating, localStorage)
│       ├── shuffle-player.js        ← Language-aware audio + text display
│       └── translation-toggle.js    ← Hide/show translations
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

# Build lesson audio (English only — default)
tools/rebuild-lesson-audio.sh lesson-NN

# Build lesson audio (English + Tamil)
python tools/build-lesson-audio.py tools/lesson-audio/lesson-NN.yaml --lang all

# Validate lesson
python tools/validate-lesson-consistency.py lesson-NN

# Verify verse text
python tools/verify-verse.py 29:45

# Build a new root inventory JSON (offline — see ADR-009)
python3 tools/build-root-inventory.py \
  --root رسل --root-word رَسُول --root-transliteration rasul \
  --three-letter "ر س ل" --three-letter-en "ra sin lam" \
  --corpus-key rsl --introduced-in-lesson 3 \
  --output docs/roots/rasul.json
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
| **Building a new root inventory** | `docs/decisions/ADR-009-local-root-pipeline.md` + `tools/build-root-inventory.py` (offline, local data only — do NOT scrape corpus.quran.com) |
| **Scoring verses** | `docs/SCORING.md` — 8-dimension algorithm |
| **Adding Tamil to a lesson** | `CLAUDE.md` → "Multi-Language Support" section above |
| **Platform vision & roadmap** | `docs/app/PLATFORM-PRD.md` — ⭐ start here for all app/platform work |
| **Companion app research** | `docs/app/RESEARCH-SYNTHESIS.md` → then specific `research-*.md` files |
| **App requirements (earlier)** | `docs/app/APP-REQUIREMENTS.md` (partially superseded by PLATFORM-PRD.md) |
