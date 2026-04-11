---
layout: lesson
title: "Lesson 1: Allāhu Akbar"
description: "Two root words behind Allāhu Akbar — إِلَٰه (god) and كَبُرَ (greatness) — 8 words through 12 Qur'anic phrases."
audio_manifest: /assets/audio/lessons/lesson-01/manifest.json
audio_download: /assets/audio/lessons/lesson-01/lesson-01-full.mp3
audio_download_tamil: /assets/audio/lessons/lesson-01/lesson-01-full-ta.mp3

# ───────────────────────────────────────────────────────────
# Frontmatter fields below are a snapshot of picker-config.json.
# Jekyll cannot read picker-config.json directly because it lives
# outside _data/. The migration script's --stage index-md will
# keep these in sync. DO NOT edit directly — edit
# picker-config.json instead and re-run the stage.
# ───────────────────────────────────────────────────────────
seed_phrase:
  arabic: "اللهُ أَكْبَرُ"
  english: "Allah is Greater"
opening: "In this series of lessons, we will walk through each of the sentences in the Adhan (Call to prayer) and use the words there as our **hooks** to get into the Quran using the beautiful concept of **roots** in Arabic language."
---
{% comment %}
Thin Liquid template per D30 — proof-of-concept draft.
English only per D33 (main files English only; translations
are auto-generated sidecars, architecture TBD).

Covered in this draft:
  - Frontmatter snapshot from picker-config (opening + seed_phrase)
  - H1 title
  - Opening prose (English) via page.opening
  - ## Anchor section with seed phrase + adhan audio + English explanation

Blocked sections (TODO list at end of file explains why):
  - Lesson preview, lesson map, how-to-study collapsible
  - Root word 1 (ilah) + root word 2 (kabura)
  - All verse cards (need lesson_use data completion)
  - Practice, Review in Order, Review Shuffled
  - Summary, Quick Check Quiz
  - Closing, What's Next

Tamil rendering is deferred to the sidecar translation
architecture (D33). Once that's designed, this template will
ALSO read from a Tamil sidecar and render per-language via the
existing translation-toggle.js + language-toggle.js runtime.

Validates:
  - Frontmatter-from-picker-config mechanism
  - Liquid markdownification of Markdown prose fields
  - Static audio + seed phrase rendering
  - lesson-cards.js unchanged (this draft has no h3+paragraph
    card patterns to transform, so the JS is a no-op here — it
    will be exercised once verse cards are added)
{% endcomment %}

# {{ page.title }}

<div class="lang-en" markdown="1">
{{ page.opening }}
</div>

## Anchor
{: #anchor}

**{{ page.seed_phrase.arabic }}** — *{{ page.seed_phrase.english }}*

<p class="audio-label">🔊 Adhān — opening call · اللهُ أَكْبَرُ اللهُ أَكْبَرُ</p>
<audio controls preload="none" src="{{ '/assets/audio/adhan-allahu-akbar.mp3' | relative_url }}"></audio>

<div class="lang-en" markdown="1">
You say this every single day. Before every ṣalāh. You raise your hands and say it. The muaddhin opens with it. It is the first thing you hear when prayer is called, and the first thing you say when you stand before Allah. It is the most repeated phrase in your life.
</div>

---

<!--
TODO — remaining sections of the thin template.

The sections below are blocked on two prerequisites:

A) Parallel Sonnet session currently editing _data/verses/ for L2
   — touches 002, 003, 006, 018, 020, 038, 039, 040, 041. Adding
   L1 lesson_use refinements (Tamil fragments, bold markup on
   the taught word, student hook text) to verses in those files
   risks a git conflict. Wait until Sonnet's L2 work lands.

B) L1 lesson_use fields currently hold:
   - lesson_use.arabic without **bold** markup on the taught word
   - lesson_use.english as the trimmed English fragment (OK)
   - lesson_use.notes holding SCORE notes, not student HOOK text
   - NO Tamil fragment, NO Tamil hook
   These need a separate extraction pass that lifts content from
   lessons/lesson-01-allahu-akbar.md's verse cards into the
   corresponding verse entries in _data/verses/*.json for all 12
   L1 verses.

Draft sections (post-prerequisite work):

1. Lesson preview (derived — word count per root)
2. Lesson map nav (generated from current_roots + section anchors)
3. How-to-study collapsible (shared include: _includes/how-to-study.html)
4. ## Root word 1: إِلَٰه (god)
   {: #root-ilah}
   - <div class="lang-en" markdown="1">{{ site.data.roots.ilah.notes | markdownify }}</div>
   - Root table: loop over site.data.roots.ilah.forms
   - Verse cards for L1 anchor (59:22) + learn phrases (6:74, 3:26)
5. ## Root word 2: كَبُرَ (greatness)
   {: #root-kabur}
   - Same pattern
   - Anchor is synthetic teaching phrase (site.data.verses.teaching["teaching:kabura:anchor-01"])
   - Learn phrases: 79:20, 61:3, 2:34
6. ## Practice — Can You Spot the Roots? {: #practice}
   - 5 verse cards: 29:45, 18:5, 21:63, 2:163, 41:15
7. ## Review in Order
   {: #review-in-order}
   - <audio class="review-audio-en" src="{{ page.audio_download | relative_url }}">
   - <audio class="review-audio-ta" src="{{ page.audio_download_tamil | relative_url }}">
   - Download links EN + TA
8. ## Review Shuffled
   {: #review-shuffled}
   - <div id="shuffle-player"></div>
9. ## Summary
   {: #summary}
   - Words table: aggregate all forms from site.data.roots[current_roots]
   - Phrases list: aggregate all verses with lesson_use.lesson == 1
10. ## Quick Check — What Does the Highlighted Word Mean?
    {: #quiz}
    - Quiz items: aggregate verses with lesson_use.lesson == 1, show
      lesson_use.arabic with highlighted form + form.english as answer
11. ## Closing
    {: #closing}
    - <div class="lang-en" markdown="1">{{ page.closing.english | markdownify }}</div>
    - Tamil equivalent (once page.closing.tamil is in frontmatter)
12. ### What's Next?
    - From page.whats_next.english + page.whats_next.tamil
-->
