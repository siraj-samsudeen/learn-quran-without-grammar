---
layout: default
title: "Lesson 1 — Prep Dashboard"
description: "Teacher review dashboard for Lesson 1 — all verse content, roots, and audio in one place for verification."
permalink: /teacher/lesson-01/
---
{%- assign audio_base = "/assets/audio/lessons/lesson-01" -%}
{%- assign audio_data = site.data.audio["lesson-01"] -%}
{%- assign cfg = site.data.picker_configs["lesson-01-allahu-akbar-copy"] -%}
{%- assign ilah = site.data.roots.ilah -%}
{%- assign kabura = site.data.roots.kabura -%}
{%- assign v_59_22  = site.data.verses["059"]["59:22"]  -%}
{%- assign v_6_74   = site.data.verses["006"]["6:74"]   -%}
{%- assign v_3_26   = site.data.verses["003"]["3:26"]   -%}
{%- assign v_teach  = site.data.verses.teaching["teaching:kabura:anchor-01"] -%}
{%- assign v_79_20  = site.data.verses["079"]["79:20"]  -%}
{%- assign v_61_3   = site.data.verses["061"]["61:3"]   -%}
{%- assign v_2_34   = site.data.verses["002"]["2:34"]   -%}
{%- assign v_29_45  = site.data.verses["029"]["29:45"]  -%}
{%- assign v_18_5   = site.data.verses["018"]["18:5"]   -%}
{%- assign v_21_63  = site.data.verses["021"]["21:63"]  -%}
{%- assign v_2_163  = site.data.verses["002"]["2:163"]  -%}
{%- assign v_41_15  = site.data.verses["041"]["41:15"]  -%}

# Lesson 1 — Prep Dashboard

**Teacher review view.** Not linked from the student home page. All Lesson 1 data — roots, verses, audio — in one consolidated place for verification. Bookmark this URL.

<p>
  <a href="{{ '/#lessons' | relative_url }}">← All lessons</a> &nbsp;·&nbsp;
  <a href="{{ '/lessons/lesson-01-allahu-akbar-copy/' | relative_url }}">Student view (new copy)</a> &nbsp;·&nbsp;
  <a href="{{ '/lessons/lesson-01-allahu-akbar' | relative_url }}">Student view (production)</a>
</p>

---

## Lesson metadata (picker-config)

Sourced from `lessons/lesson-01-allahu-akbar-copy/picker-config.json` via the build-time sync (`tools/sync-picker-configs-to-data.py`).

{% if cfg %}
<table class="prep-table">
<tr><th>Lesson number</th><td>{{ cfg.lesson_number }}</td></tr>
<tr><th>Slug</th><td><code>{{ cfg.slug }}</code></td></tr>
<tr><th>Title</th><td>{{ cfg.title }}</td></tr>
<tr><th>Description</th><td>{{ cfg.description }}</td></tr>
<tr><th>Seed phrase (Arabic)</th><td dir="rtl" lang="ar">{{ cfg.seed_phrase.arabic }}</td></tr>
<tr><th>Seed phrase (English)</th><td>{{ cfg.seed_phrase.english }}</td></tr>
<tr><th>Current roots</th><td>{{ cfg.current_roots | join: ", " }}</td></tr>
<tr><th>Recall roots</th><td>{{ cfg.recall_roots | join: ", " | default: "— (none)" }}</td></tr>
<tr><th>Targets</th><td>anchor: {{ cfg.targets.anchor }}, learn: {{ cfg.targets.learn }}, practice: {{ cfg.targets.practice }}, recall: {{ cfg.targets.recall }}</td></tr>
</table>

<details>
<summary><strong>Opening prose</strong> ({{ cfg.opening | size }} chars)</summary>
<div markdown="1">
{{ cfg.opening }}
</div>
</details>

<details>
<summary><strong>Closing prose</strong> ({{ cfg.closing | size }} chars)</summary>
<div markdown="1">
{{ cfg.closing }}
</div>
</details>

<details>
<summary><strong>What's Next prose</strong> ({{ cfg.whats_next | size }} chars)</summary>
<div markdown="1">
{{ cfg.whats_next }}
</div>
</details>

{% else %}
<p><em>picker-config not yet synced into <code>_data/picker_configs/</code>. Run <code>tools/.venv/bin/python tools/sync-picker-configs-to-data.py</code>.</em></p>
{% endif %}

---

## Roots

### إِلَٰه — *{{ ilah.transliteration }}* — "god"

- **Three letters:** {{ ilah.three_letter }} &nbsp;·&nbsp; *{{ ilah.three_letter_english }}*
- **Introduced in:** Lesson {{ ilah.introduced_in_lesson }}
- **Forms:** {{ ilah.forms | size }}

<details open>
<summary><strong>Root notes</strong></summary>
<div markdown="1">
{{ ilah.notes }}
</div>
</details>

**Forms table (all {{ ilah.forms | size }}):**

| # | Arabic | Translit | Category | English | Form notes |
|---|---|---|---|---|---|
{% for form in ilah.forms -%}
| {{ forloop.index }} | {{ form.arabic }} | *{{ form.transliteration }}* | {{ form.category }} | {{ form.english }} | {{ form.notes | default: "—" }} |
{% endfor %}

### كَبُرَ — *{{ kabura.transliteration }}* — "greatness"

- **Three letters:** {{ kabura.three_letter }} &nbsp;·&nbsp; *{{ kabura.three_letter_english }}*
- **Introduced in:** Lesson {{ kabura.introduced_in_lesson }}
- **Forms:** {{ kabura.forms | size }} (L1 teaches only 5 of these — the others are available for future lessons)

<details open>
<summary><strong>Root notes</strong></summary>
<div markdown="1">
{{ kabura.notes }}
</div>
</details>

**Forms table (all {{ kabura.forms | size }}):**

| # | Arabic | Translit | Category | English | Form notes |
|---|---|---|---|---|---|
{% for form in kabura.forms -%}
| {{ forloop.index }} | {{ form.arabic }} | *{{ form.transliteration }}* | {{ form.category }} | {{ form.english }} | {{ form.notes | default: "—" }} |
{% endfor %}

---

## Verses — 12 entries in Lesson 1

Click each row to expand full verse data including an inline audio player.

### Anchor phrases (2)

{% include prep-verse.html verse=v_59_22 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_teach audio_base=audio_base audio_data=audio_data %}

### Learn phrases (5)

{% include prep-verse.html verse=v_6_74 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_3_26 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_79_20 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_61_3 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_2_34 audio_base=audio_base audio_data=audio_data %}

### Practice phrases (5)

{% include prep-verse.html verse=v_29_45 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_18_5 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_21_63 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_2_163 audio_base=audio_base audio_data=audio_data %}

{% include prep-verse.html verse=v_41_15 audio_base=audio_base audio_data=audio_data %}

---

## Full lesson audio

<audio controls preload="none" src="{{ '/assets/audio/lessons/lesson-01/lesson-01-full.mp3' | relative_url }}"></audio>

<p><a href="{{ '/assets/audio/lessons/lesson-01/lesson-01-full.mp3' | relative_url }}" download>📥 Download full lesson audio (English)</a></p>

---

## All 12 audio files (flat list)

| Verse | Audio file | Play |
|---|---|---|
| {{ v_59_22.lesson_use.heading }} | `{{ v_59_22.lesson_use.audio_file }}` | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_59_22.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_6_74.lesson_use.heading }}  | `{{ v_6_74.lesson_use.audio_file }}`  | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_6_74.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_3_26.lesson_use.heading }}  | `{{ v_3_26.lesson_use.audio_file }}`  | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_3_26.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_teach.lesson_use.heading }} | `{{ v_teach.lesson_use.audio_file }}` | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_teach.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_79_20.lesson_use.heading }} | `{{ v_79_20.lesson_use.audio_file }}` | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_79_20.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_61_3.lesson_use.heading }}  | `{{ v_61_3.lesson_use.audio_file }}`  | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_61_3.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_2_34.lesson_use.heading }}  | `{{ v_2_34.lesson_use.audio_file }}`  | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_2_34.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_29_45.lesson_use.heading }} | `{{ v_29_45.lesson_use.audio_file }}` | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_29_45.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_18_5.lesson_use.heading }}  | `{{ v_18_5.lesson_use.audio_file }}`  | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_18_5.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_21_63.lesson_use.heading }} | `{{ v_21_63.lesson_use.audio_file }}` | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_21_63.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_2_163.lesson_use.heading }} | `{{ v_2_163.lesson_use.audio_file }}` | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_2_163.lesson_use.audio_file | relative_url }}"></audio> |
| {{ v_41_15.lesson_use.heading }} | `{{ v_41_15.lesson_use.audio_file }}` | <audio controls preload="none" src="{{ audio_base | append: '/' | append: v_41_15.lesson_use.audio_file | relative_url }}"></audio> |

---

## Verification checklist

Quick eyeball pass — spot-check each item by expanding the relevant verse above.

- [ ] All 12 verses have a `heading` (format: `N · form-name (english)` or `⭐ · N Anchor Phrase`)
- [ ] Each verse's trimmed `lesson_use.arabic` has `**bold**` markup around the taught word
- [ ] Each verse's trimmed `lesson_use.english` has `**bold**` markup around the taught word
- [ ] Each verse's `lesson_use.notes` holds the student hook text (NOT the score note — score notes should be at the verse-level `score_notes` field)
- [ ] Each verse's `audio_file` is set and the inline player works
- [ ] Roots: `ilah` has 4 forms, `kabura` has 14 forms; notes are populated at root level (form-level notes are null for most)
- [ ] Lesson 1 counts: 2 anchors + 5 learn + 5 practice = 12 verses total
- [ ] The `teaching:kabura:anchor-01` entry is a synthetic teaching phrase (not a Qur'anic ayah) — verify its `source`/scores are marked accordingly
- [ ] Cross-root verse: check if any verse has `roots: ["ilah", "kabura"]` (bounded denormalization per D11)

---

## Known architectural gaps (expected, not bugs)

- **Tamil content missing** — per D33, main files are English only. Tamil sidecars and the translation tool are deferred. The student L1 copy has a placeholder `.lang-ta` div that surfaces the EN/தமிழ் toggle but shows a diagnostic message when you flip to Tamil.
- **Quick Check quiz section** not yet rendered in the L1 copy — needs a new `lesson_use.quiz_arabic` field (single-bold-word fragment) per verse. Separate pass.
- **Surah transliteration** (Al-Ḥashr, Al-An'ām, etc.) is hand-passed as literal strings in the student template, because `_data/surahs.json` currently has plain-ASCII names (Al-Hashr, Al-Anam). When that's updated, the template can source names from data.
- **Root tables in the student copy** are hardcoded to show only the forms L1 teaches (3 ilah, 5 kabura). This prep dashboard shows the full set (4 ilah, 14 kabura) so you can see everything the root data file holds.
- **No reciter / timestamp / duration info** on this prep view yet — that data lives in `tools/lesson-audio/lesson-01.yaml` and `assets/audio/lessons/lesson-01/manifest.json`, neither of which Jekyll can read via `site.data.*`. Adding that view would need a build-step copy into `_data/` or a runtime JS fetch. Deferred for now.
