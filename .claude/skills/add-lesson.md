# Skill: Add a New Lesson

## Before you start

1. Read `.claude/skills/lesson-pipeline.md` — it maps the full 5-phase workflow
2. Read `docs/LESSON-PLAN.md` — lesson structure, teacher preferences, learning science conventions
3. Check `docs/selections/pipeline.md` — it may have verses already queued

---

## Step 0 — Content Selection

**Use the verse selection skill:** `.claude/skills/verse-selection.md`

This is the most important and interactive step. Do NOT skip to file creation until phrases are locked in:
- 1 anchor phrase
- Up to 9 learning phrases (10 phrases / 100 words budget for new content)
- Up to 5 recall phrases (50 words budget for spaced review from previous lessons)

---

## Step 1 — Determine lesson number and slug

```bash
ls lessons/   # check what exists
```

- Pattern: `lesson-NN-slug` — lowercase kebab-case, ASCII only, no diacritics
- ✓ `lesson-02-bismillah` / ✗ `lesson-02-Bismillāh`

---

## Step 2 — Create the lesson file

**Copy the template:** `.claude/skills/templates/lesson-template.md`

**Path:** `lessons/lesson-NN-slug.md`

Fill in all `{{slots}}` following these principles:
- `layout: lesson` (not `layout: default`)
- No grammar terminology in descriptions
- Hook text explains language/pattern, NOT verse meaning
- Story Context Principle — include enough text for a story hook
- Root letters: show both Arabic + English: `**أ ل ه** (alif lām hā)`
- Each Qur'anic phrase uses a **different reciter** — see `.claude/skills/lesson-audio.md` → "Reciter assignment"

---

## Step 3 — Assign reciters and find timestamps

For each Qur'anic phrase:
1. Pick a reciter (no repeats) matched by speed to segment length
2. Find timestamps:
   - **Primary:** `python tools/auto-timestamps.py SS:AA --reciter FOLDER --words FROM-TO` (7 reciters)
   - **Fallback:** `python tools/find-audio-fragment.py SS:AA --reciter FOLDER` (all reciters)
3. Add `<audio>` tag with the correct EveryAyah CDN URL + `#t=` fragment
4. Always include `preload="none"`

---

## Step 4 — Create the YAML for the audio pipeline

**Copy the template:** `.claude/skills/templates/lesson-audio-template.yaml`

**Path:** `tools/lesson-audio/lesson-NN.yaml`

⚠️ The `english:` field must be **plain ASCII** — no transliteration characters. TTS produces gibberish otherwise.

---

## Step 5 — Generate Tamil translations

Generate Tamil translations for all lesson content. The teacher writes English only; Tamil is LLM-generated and reviewed by the teacher (who can read Tamil).

**What to translate:**
- All verse card translations (quoted lines → add `{: .ta}` line after English)
- All hook paragraphs (add `{: .hook-ta}` paragraph after English hook)
- Root explanation prose (wrap EN and TA in `<div class="lang-en/ta" markdown="1">`)
- Root tables — Tamil transliteration + Tamil meaning (wrap in div, NOT IAL on table)
- Pair-tables (teaching phrases) — wrap in div per language
- Quiz prompts + answers (inline spans)
- Summary words table + phrases list
- Closing and What's Next sections
- Study tip, lesson preview

**YAML:** Add `tamil:` field alongside `english:` for each sentence in `tools/lesson-audio/lesson-NN.yaml`

**Critical rules:**
- Tamil table columns: அரபி | தமிழ் | பொருள் (use Tamil script transliteration, not English)
- Never put `.lang-ta` directly on a `<table>` — wrap in `<div class="lang-ta" markdown="1">`
- See `CLAUDE.md` → "Multi-Language Support" for all content patterns

---

## Step 6 — Build the audio

```bash
# English + Tamil audio
python tools/build-lesson-audio.py tools/lesson-audio/lesson-NN.yaml --lang all
python tools/validate-lesson-consistency.py lesson-NN
```

Fix any warnings before proceeding.

---

## Step 7 — Add a lesson card to `index.md`

```html
<div class="lesson-card" markdown="0" onclick="location.href='{{ '/lessons/lesson-NN-slug' | relative_url }}';">
<div class="lesson-card-title"><a href="{{ '/lessons/lesson-NN-slug' | relative_url }}">Lesson N — Short Title</a></div>
<div class="lesson-card-arabic">Arabic anchor phrase</div>
<div class="lesson-card-meta">Roots: Root1 · Root2 &nbsp;·&nbsp; N words · M phrases &nbsp;·&nbsp; Anchor: source</div>
</div>
```

---

## Step 8 — Record selections

1. Create `docs/selections/lesson-NN.md` — see Lesson 1 for format
2. Update `docs/roots/{root}.json` — set verse statuses and lesson assignments
3. Update `docs/selections/pipeline.md` — add deferred items

---

## Step 9 — Review

Run the checklist: `.claude/skills/lesson-review-checklist.md`

---

## Step 10 — Commit

```bash
git add .
git commit -m "lesson: add lesson N — Anchor phrase (root1, root2)"
git push
```

GitHub Pages rebuilds automatically — live in ~1 minute.

---

## Pre-flight checklist (quick summary)

Full checklist: `.claude/skills/lesson-review-checklist.md`

- [ ] File at `lessons/lesson-NN-slug.md` — all lowercase
- [ ] `layout: lesson` in front matter
- [ ] No grammar terminology
- [ ] All headings single-word form
- [ ] Learning phrases ordered appropriately (shorter early, longer later)
- [ ] Each phrase uses a different reciter
- [ ] All `<audio>` tags have `preload="none"`
- [ ] YAML `english:` fields are plain ASCII
- [ ] Summary: Words table + Phrases list
- [ ] Review sections: "Review in Order" + "Review Shuffled"
- [ ] Lesson card added to `index.md`
- [ ] Root JSONs updated in `docs/roots/`
- [ ] Selection log created
- [ ] `pipeline.md` updated
- [ ] Tamil translations for all verse cards, hooks, root explanations, tables, quiz, summary, closing
- [ ] Tamil `tamil:` field in YAML for all sentences
- [ ] Audio built with `--lang all` (EN + Tamil MP3 pairs)
- [ ] Root tables wrapped in `<div class="lang-en/ta">`, NOT IAL on table
- [ ] Pair-tables (teaching phrases) have Tamil version
- [ ] Validation passes
