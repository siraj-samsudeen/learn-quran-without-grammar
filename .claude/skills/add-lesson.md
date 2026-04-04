# Skill: Add a New Lesson

## Before you start

Read `docs/LESSON-PLAN.md` first. It defines:
- Lesson structure (anchor phrases + learn + practice + summary + quiz)
- How to select root words and sentences from the Corpus
- Teacher selection preferences and translation style
- Learning science conventions that apply to every lesson

---

## Step 0 — Check the pipeline

**Always check `docs/selections/pipeline.md` first.** It may already have:
- **Ready to Place** verses assigned to this lesson
- **Strong Candidates** waiting for a slot
- **Deferred Forms** from previous roots
- **Deferred Hadith** flagged for future use

Pull these in before going to the corpus for fresh material.

---

## Step 0.5 — Content selection (interactive with teacher)

This is the most important step. Do NOT skip to file creation until all 20 sentences are locked in.

### Identify root words from the anchor phrase

Extract root words in **word order** from the anchor phrase. Use a representative root word (Form I verb or base noun), not the bare three-letter root:
- اللهُ أَكْبَرُ → root word 1: **إِلَٰه** (ilāh), root word 2: **كَبُرَ** (kabura)

### Pull root inventory from corpus

For each root word, fetch the complete form inventory from [corpus.quran.com/qurandictionary.jsp](https://corpus.quran.com/qurandictionary.jsp):
- Present in the **exact order the Corpus uses** (verbs by form, then nominals, then participles)
- Use **exact counts** — never approximate (~34). Always match the Corpus number.
- **Verify every verse** against the alquran.cloud API before presenting to the teacher

### Select 5 forms per root

Present the inventory and recommend 5 forms based on:
1. **Frequency** — highest count forms first
2. **Pedagogical importance** — teacher may override frequency
3. **Verse quality** — does it appear in a memorable, self-contained sentence?

When a root has **few morphological forms** (e.g., إِلَٰه has only 3), select 5 distinct **sentence patterns** instead.

### Present candidates with Why column

For each selected form, list ALL occurrences ranked by recommendation:
- **≤ 10 occurrences**: list all
- **> 10 occurrences**: list top 10, provide corpus link for the rest

Include a **Why** column explaining the recommendation. The teacher scans and picks.

| # | Ref | Arabic Context | Translation | Why |
|---|-----|---------------|-------------|-----|
| 1 | 29:45 | وَلَذِكْرُ ٱللَّهِ **أَكْبَرُ** | And the remembrance of Allah is greater | Ties to anchor — dhikr = ṣalāh |

### Teacher picks Learn + Practice

One sentence per form: **Learn** (stories preferred) + **Practice** (famous/practical verses preferred).

Record in `docs/selections/lesson-NN.md`:
- **AI-recommended reasons**: plain text
- **Teacher-override reasons**: **bold text** (these reveal teacher preferences for future agents)

### Select hadith/dua

Present candidates ranked with Why column. Teacher picks (typically 1–3). Unpicked ones go to pipeline.

### Feed the pipeline

After all selections, update `docs/selections/pipeline.md` with:
- Unpicked strong candidate verses
- Deferred forms not covered in this lesson
- Deferred hadith

### Anti-patterns to avoid during selection

| Mistake | Rule |
|---------|------|
| Hallucinating verse content | **Always verify against API before presenting** |
| Approximate counts | **Use exact corpus counts, never approximate** |
| Presenting without Why column | **Every candidate needs a reason** |
| Forgetting to check pipeline | **Pipeline is step 0, not an afterthought** |

---

## Step 1 — Determine the lesson number and slug

- Lesson number: next integer after the last lesson in `lessons/`
- Slug: lowercase kebab-case, ASCII only, no diacritics
  - ✓ `lesson-02-bismillah`
  - ✗ `lesson-02-Bismillāh` (mixed case, diacritic)
  - ✗ `lesson-02 bismillah` (space)

```bash
ls lessons/   # check what exists
```

---

## Step 2 — Create the lesson file

**Path:** `lessons/lesson-NN-slug.md`

**Front matter template:**

```yaml
---
layout: lesson
title: 'Lesson N: Transliterated Title'
description: One-sentence description for SEO — what root/anchor, what the student will recognise.
audio_manifest: /assets/audio/lessons/lesson-NN/manifest.json
audio_download: /assets/audio/lessons/lesson-NN/lesson-NN-full.mp3
---
```

- `layout: lesson` — not `layout: default`. Lessons use the lesson layout.
- `title:` uses proper transliteration with diacritics (ā, ī, ū, ṣ, etc.) — this is display only, not a URL
- `description:` plain prose, no Arabic script — used by jekyll-seo-tag

**Lesson structure** (see `docs/LESSON-PLAN.md` for full detail):

```markdown
# Lesson N: Title

[lesson-map nav bar]
[collapsible study tip]

## Anchor
[anchor phrase, local MP3 audio]

## Root word 1: Arabic (english)
{: #root-slug}
[curiosity gap paragraph]
[root table]
[5 learning phrase cards]

## Root word 2: Arabic (english)
{: #root-slug}
[same pattern]

---
[↑ Back to top](#lesson-map)

## Practice — Can You Spot the Roots?
[orienting line]
[5 practice phrase cards per root]

---
[↑ Back to top](#lesson-map)

## Summary
[summary table — all words]
[phrases list — stacked layout]

## Quick Check
[one quiz item per taught word]

### What's Next?
[2–3 sentence tease of next lesson]
```

---

## Step 3 — HTML conventions inside the lesson file

### Any div containing Arabic text or audio → add `markdown="0"`

```html
<div class="lesson-map" id="lesson-map" markdown="0">
  <a href="#anchor">Anchor</a>
  <span class="map-arrow">→</span>
  <a href="#root-kabur">كَبُرَ <span class="map-detail">(3 words)</span></a>
</div>
```

Without `markdown="0"`, Kramdown wraps Arabic text in incorrect `<p>` tags and breaks RTL layout. This is the single most common silent bug.

### Back-to-top links — place AFTER the `---` separator

```markdown
---
[↑ Back to top](#lesson-map)

## Next Section
```

Not before it. `lesson-cards.js` scans for extras before `---` and will delete the link.

### Heading format for verse cards

Single word/form per heading — the JS uses this as the label:

```markdown
### 3 · أَكْبَرُ (greater)
```

Not a full phrase. Multi-word headings overflow on mobile and break the card JS.

### Anchor phrase heading — star emoji skips JS processing

```markdown
### ⭐ · 1 Anchor Phrase
```

The star emoji tells `lesson-cards.js` not to parse this as a numbered verse card.

### Surah references — always at the end, in parentheses

```markdown
وَلَذِكْرُ ٱللَّهِ أَكْبَرُ (Al-ʿAnkabūt 29:45)
```

Never before the Arabic text.

---

## Step 4 — Inline audio

See the full skill: `.claude/skills/lesson-audio.md` → "Inline audio on the lesson page"

Quick reference:

```html
<p class="audio-label">🔊 29:45 · وَلَذِكْرُ ٱللَّهِ أَكْبَرُ</p>
<audio controls preload="none" src="https://everyayah.com/data/Husary_128kbps/029045.mp3#t=0,6"></audio>
```

- `preload="none"` — always
- Label always immediately above the audio tag
- Verify timestamps before pushing — 296-day CDN cache means wrong timestamps can't be corrected in students' browsers for ~a year
- Use `tools/find-audio-fragment.py` to find start/end times

For anchor phrase (non-Qur'anic content — adhān, teacher-made phrase):

```liquid
<audio controls preload="none" src="{{ '/assets/audio/filename.mp3' | relative_url }}"></audio>
```

---

## Step 5 — Create the YAML for the audio pipeline

**Path:** `tools/lesson-audio/lesson-NN.yaml`

This drives the build pipeline that produces the sequential MP3 and shuffle manifest. Copy the structure from an existing lesson YAML.

Key fields per sentence entry:

```yaml
- id: lesson-NN-001
  role: learn          # learn | practice | anchor
  root: kabura         # ASCII slug of the root word
  form: akbar          # the specific form being taught (ASCII)
  ref: "29:45"         # surah:ayah
  reciter: Husary_128kbps
  start: 0.0           # seconds — calibrated to THIS reciter
  end: 6.0
  arabic_source: وَلَذِكْرُ ٱللَّهِ أَكْبَرُ    # trimmed fragment (for learn card)
  arabic_source_full: ""                          # full ayah (for review audio) — leave blank to use full file
  arabic_text: وَلَذِكْرُ ٱللَّهِ أَكْبَرُ      # display text on page
  english: And the remembrance of Allah is greater   # plain ASCII — TTS reads this
```

⚠️ `english:` field must be **plain ASCII** — no transliteration characters (ʿ ā ī ū ṣ etc.). Edge-TTS produces gibberish otherwise. The lesson `.md` page can use proper transliteration; the YAML cannot.

---

## Step 6 — Build the audio

```bash
tools/rebuild-lesson-audio.sh lesson-NN
```

Then validate:

```bash
python tools/validate-lesson-consistency.py lesson-NN
```

Fix any warnings before proceeding.

---

## Step 7 — Add a lesson card to `index.md`

Find the lesson cards section and add:

```html
<div class="lesson-card" markdown="0" onclick="location.href='{{ '/lessons/lesson-NN-slug' | relative_url }}';">
<div class="lesson-card-title"><a href="{{ '/lessons/lesson-NN-slug' | relative_url }}">Lesson N — Short Title</a></div>
<div class="lesson-card-arabic">Arabic anchor phrase</div>
<div class="lesson-card-meta">Roots: Root1 · Root2 &nbsp;·&nbsp; N words · M phrases &nbsp;·&nbsp; Anchor: source</div>
</div>
```

- `markdown="0"` on the wrapper div — required (Arabic text inside)
- Both `onclick` and `href` use `relative_url` — required for GitHub Pages baseurl

---

## Step 8 — Record selections

Create `docs/selections/lesson-NN.md` with the selection log:

| # | Root | Form | Ref | Arabic | English | Why |
|---|------|------|-----|--------|---------|-----|
| 1 | kabura | akbar | 29:45 | وَلَذِكْرُ ٱللَّهِ أَكْبَرُ | And the remembrance of Allah is greater | Complete sentence, ties directly to anchor |

- AI-recommended reasons: plain text
- Teacher-override reasons: **bold text**

Then update `docs/selections/pipeline.md` — add any deferred forms or strong candidates for future lessons.

---

## Step 9 — Commit

```bash
git add .
git commit -m "lesson: add lesson N — Anchor phrase (root1, root2)"
git push
```

GitHub Pages rebuilds automatically — live in ~1 minute.

---

## Pre-flight checklist

Before pushing, verify:

- [ ] File at `lessons/lesson-NN-slug.md` — all lowercase, no spaces
- [ ] `layout: lesson` in front matter (not `layout: default`)
- [ ] `audio_manifest` and `audio_download` paths correct in front matter
- [ ] All divs with Arabic text have `markdown="0"`
- [ ] All `<audio>` tags have `preload="none"`
- [ ] All `<audio>` tags have a `<p class="audio-label">` immediately above them
- [ ] Back-to-top links placed AFTER `---` separators
- [ ] Verse card headings are single-word forms, not full phrases
- [ ] Surah references at end of line, in parentheses
- [ ] YAML `english:` fields are plain ASCII (no ā ī ū ṣ ʿ etc.)
- [ ] `validate-lesson-consistency.py` passes with no errors
- [ ] Lesson card added to `index.md`
- [ ] Selection log created in `docs/selections/lesson-NN.md`
- [ ] `pipeline.md` updated with deferred forms
