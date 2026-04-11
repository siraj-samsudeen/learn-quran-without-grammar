# Skill: Lesson Review Checklist

## When to Use

Run this checklist **before every commit** of a new or modified lesson.

---

## A. Content checks

- [ ] **No grammar terminology** — strip "singular", "plural", "feminine", "Form X", "prefix", "verbal noun", "occurrence count". Replace with plain English about meaning or function.
- [ ] **Hook text = language, not meaning** — the note under each phrase explains the word/root/pattern being taught, NOT what the verse means. The student can read the meaning in the translation above.
- [ ] **Root letter format** — show both Arabic and English: `**أ ل ه** (alif lām hā)` — not just one or the other. Mobile students may not read Arabic well.
- [ ] **Heading is a single word** — `### 3 · كُبْرَى (greatest)` not `### 3 · الْكُبْرَى الآيَة (the greatest sign)`.
- [ ] **Anchor headings** — just `### ⭐ · Anchor Phrase`, no Arabic in the heading.
- [ ] **References in brackets at end** — `(Al-Baqarah 2:34)` format, placed after the audio tag, never before the Arabic text.
- [ ] **Practice phrases ordered shortest → longest** — progressive difficulty.
- [ ] **Closing text matches actual lesson content** — no references to phrases that were dropped.

---

## B. Root table checks

- [ ] Table columns are **Arabic | English | Meaning** (not "Transliteration")
- [ ] Table has `{: .root-table}` after it for centering
- [ ] Table ordered logically: verbs first (base → derived), then adjectives (masc → fem → superlative), ending on the anchor word
- [ ] All forms in the table appear in either an anchor phrase or a learning phrase

---

## C. Structure checks

- [ ] **Anchor phrases** are separate from the 5 learning phrases (not counted in the 5)
- [ ] **Learning phrases**: 5 total across both roots, each one short
- [ ] **Practice phrases**: 5 total, mixed roots, can be longer
- [ ] **Review in Order** section has: audio player + download link
- [ ] **Review Shuffled** section has: `<div id="shuffle-player"></div>`
- [ ] **Summary** has two tables: Words (flat, no root subheaders, `.root-table`) and Phrases (Arabic · Surah Name N:N inline, no separate Ref column)

---

## D. Audio checks

- [ ] Every inline `<audio>` tag uses a **different reciter** — no reciter appears twice
- [ ] Reciter speed matched to segment length (slow reciters for short segments, faster for longer)
- [ ] `#t=` fragments calibrated for the **specific reciter** in that URL
- [ ] `arabic_source_full` added in YAML for any sentence with a trimmed fragment
- [ ] All `<audio>` tags have `preload="none"`
- [ ] Audio manifest sentence count matches lesson phrase count

---

## E. Manifest / YAML sync

- [ ] Every `#t=start,end` in lesson `.md` matches `start:`/`end:` in the YAML
- [ ] YAML `english:` fields are plain ASCII (no ā ī ū ṣ ʿ etc. — TTS can't pronounce them)
- [ ] `lesson-NN-full.mp3` regenerated if any sentence changed

---

## F. Standard pre-flight

- [ ] `layout: lesson` in front matter (not `layout: default`)
- [ ] All divs with Arabic text have `markdown="0"`
- [ ] Lesson card updated in `index.md`
- [ ] Selection log updated in `docs/selections/lesson-NN.md`
- [ ] `pipeline.md` updated with any deferred phrases
- [ ] `tools/validate-lesson.sh lesson-NN` passes *(same checks as the pre-commit hook, run here for early feedback during authoring — don't wait for the commit to fail)*
