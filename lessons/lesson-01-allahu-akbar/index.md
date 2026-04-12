---
layout: lesson
title: "Lesson 1: Allāhu Akbar"
description: "Two root words behind Allāhu Akbar — إِلَٰه (god) and كَبُرَ (greatness) — 8 words through 12 Qur'anic phrases."
audio_manifest: /assets/audio/lessons/lesson-01/manifest.json
audio_download: /assets/audio/lessons/lesson-01/lesson-01-full.mp3
audio_download_tamil: /assets/audio/lessons/lesson-01/lesson-01-full-ta.mp3

# ───────────────────────────────────────────────────────────
# Frontmatter fields below are a snapshot of picker-config.json.
# Jekyll cannot read picker-config.json directly (it lives
# outside _data/) so opening/closing/whats_next are inlined here.
# The migration script's --stage index-md will keep these synced.
# DO NOT edit directly — edit picker-config.json instead.
# ───────────────────────────────────────────────────────────
seed_phrase:
  arabic: "اللهُ أَكْبَرُ"
  english: "Allah is Greater"
opening: "In this series of lessons, we will walk through each of the sentences in the Adhan (Call to prayer) and use the words there as our **hooks** to get into the Quran using the beautiful concept of **roots** in Arabic language."
closing: |-
  This lesson moved through one question — *what is truly great?* The first root asked what you worship. The second asked what you consider great. The Qur'an's answer came in the voice of prophets, in the fall of Iblīs, and in the phrase you already carry: **اللهُ أَكْبَرُ**.

  You started this lesson knowing two words. Now you have met the roots behind them — in Ibrāhīm's challenge to his father, in the greatest sign shown to Pharaoh, in the arrogance of Iblīs, and in that beautiful phrase: *the remembrance of Allah is greater.*

  From now on, listen for these roots. When you stand in ṣalāh and hear the Qur'an recited, notice any word that sounds like **إِلَٰه** or **كَبُرَ**. When you hear the adhān, when you read Qur'an, even when you hear Arabic anywhere — see if you can spot a word from these two families. You will be surprised how often they appear. That moment of recognition — *"I know this word!"* — is exactly what we are building, one root at a time.
whats_next: "In the next lesson, we'll take the second phrase of the adhān — **أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ** — and you'll discover that the word **أَشْهَدُ** doesn't just mean \"I testify.\" Its root will take you somewhere unexpected."
---
{%- comment -%}
Data-driven Liquid template per D30. English only per D33 — Tamil
and other languages come from sidecar files at render time.

Data sources:
  - site.data.roots.{ilah,kabura}      root prose + forms
  - site.data.verses["059"]["59:22"]   per-verse data
  - site.data.verses.teaching.*        synthetic teaching phrases
  - page.{opening,closing,whats_next}  prose from picker-config

Known gaps:
  - Tamil content — sidecars not yet built
  - Quick Check quiz section — needs quiz_arabic (single-bold) field
{%- endcomment -%}

{%- assign ilah = site.data.roots.ilah -%}
{%- assign kabura = site.data.roots.kabura -%}
{%- assign audio_base = "/assets/audio/lessons/lesson-01" -%}
{%- assign v_59_22   = site.data.verses["059"]["59:22"]  -%}
{%- assign v_6_74    = site.data.verses["006"]["6:74"]   -%}
{%- assign v_3_26    = site.data.verses["003"]["3:26"]   -%}
{%- assign v_teaching = site.data.verses.teaching["teaching:kabura:anchor-01"] -%}
{%- assign v_79_20   = site.data.verses["079"]["79:20"]  -%}
{%- assign v_61_3    = site.data.verses["061"]["61:3"]   -%}
{%- assign v_2_34    = site.data.verses["002"]["2:34"]   -%}
{%- assign v_29_45   = site.data.verses["029"]["29:45"]  -%}
{%- assign v_18_5    = site.data.verses["018"]["18:5"]   -%}
{%- assign v_21_63   = site.data.verses["021"]["21:63"]  -%}
{%- assign v_2_163   = site.data.verses["002"]["2:163"]  -%}
{%- assign v_41_15   = site.data.verses["041"]["41:15"]  -%}

# {{ page.title }}

[← All lessons]({{ '/#lessons' | relative_url }}) · [Next: Lesson 2 →]({{ '/lessons/lesson-02-shahida/' | relative_url }})
{: .lesson-nav}

<div class="lang-ta" markdown="1">
_Tamil translation not yet available in this new architecture. Tamil content will be generated from a sidecar file once the D33 translation tool is built. This placeholder exists so the EN ↔ தமிழ் toggle appears for testing — the toggle is driven by `language-toggle.js` which looks for any `.lang-ta` element to decide whether to render the switcher._
</div>

<div class="lang-en" markdown="1">
{{ page.opening }}
</div>

<p class="lesson-preview lang-en">In the first lesson, you will meet <strong>8 Arabic words</strong> from two root families — the roots behind <strong>اللهُ أَكْبَرُ</strong> — through 11 ayahs from the Quran plus 1 teaching phrase.</p>

<div class="lesson-map" id="lesson-map" markdown="0">
  <a href="#immerse">Immerse</a>
  <span class="map-arrow">→</span>
  <a href="#anchor">Anchor</a>
  <span class="map-arrow">→</span>
  <a href="#root-ilah">إِلَٰه <span class="map-detail">(3 words)</span></a>
  <span class="map-arrow">→</span>
  <a href="#root-kabur">كَبُرَ <span class="map-detail">(5 words)</span></a>
  <span class="map-arrow">→</span>
  <a href="#learning">Spot the Roots</a>
  <span class="map-arrow">→</span>
  <a href="#review-shuffled">Review</a>
</div>

<p class="lesson-links"><a href="{{ '/course_intro' | relative_url }}">Course introduction</a> · <a href="{{ '/how-to-study' | relative_url }}">How to study a lesson</a></p>

## Immerse
{: #immerse}

First, immerse yourself in the audio before you start the study session. Listen to it one to three times.

<audio class="review-audio-en" controls preload="none" src="{{ page.audio_download | relative_url }}"></audio>

<a class="download-link download-link-en" href="{{ page.audio_download | relative_url }}" download>📥 Download full lesson audio</a>

---

## Anchor
{: #anchor}

**{{ page.seed_phrase.arabic }}** — *{{ page.seed_phrase.english }}*

<p class="audio-label">🔊 Adhān — opening call · اللهُ أَكْبَرُ اللهُ أَكْبَرُ</p>
<audio controls preload="none" src="{{ '/assets/audio/adhan-allahu-akbar.mp3' | relative_url }}"></audio>

<div class="lang-en" markdown="1">
You say this every single day. Before every ṣalāh. You raise your hands and say it. The muaddhin opens with it. It is the first thing you hear when prayer is called, and the first thing you say when you stand before Allah. It is the most repeated phrase in your life.
</div>

---

## Root word 1 : إِلَٰه (god)
{: #root-ilah}

<div class="lang-en" markdown="1">
{{ ilah.notes }}
</div>

<div class="lang-en" markdown="1">

| Arabic | English | Meaning |
| --- | --- | --- |
| إِلَٰه | *ilāh* | god |
| آلِهَة | *āliha* | gods |
| اللَّهُمَّ | *Allāhumma* | O Allah |
{: .root-table}

</div>

---

{% include verse-card.html verse=v_59_22 surah_name="Al-Ḥashr" audio_base=audio_base %}

{% include verse-card.html verse=v_6_74 surah_name="Al-An'ām" audio_base=audio_base %}

{% include verse-card.html verse=v_3_26 surah_name="Āl 'Imrān" audio_base=audio_base %}

## Root word 2: كَبُرَ (greatness)
{: #root-kabur}

<div class="lang-en" markdown="1">
{{ kabura.notes }}
</div>

<div class="lang-en" markdown="1">

| Arabic | English | Meaning |
| --- | --- | --- |
| كَبِير | *kabīr* | great, big |
| أَكْبَرُ | *Akbar* | greater, greatest |
| كُبْرَى | *kubrā* | greatest |
| كَبُرَ | *kabura* | was great |
| اسْتَكْبَرَ | *istakbara* | was arrogant |
{: .root-table}

</div>

---

### ⭐ · 4 Anchor Phrase

<div class="lang-en" markdown="1">

| هُوَ **كَبِيرٌ** | "He is **great**" |
| أَنَا **أَكْبَرُ** مِنْهُ | "I am **greater** than him" |
| وَاللَّهُ **أَكْبَرُ** مِنَّا، بَلْ، مِنْ كُلِّ شَيْءٍ | "And Allah is **greater** than us — rather, than everything" |
{: .pair-table}

</div>

🔊 Teaching phrase · <audio class="lang-en" controls preload="none" src="{{ '/assets/audio/lessons/lesson-01/anchor-kabura.mp3' | relative_url }}"></audio>

<div class="lang-en" markdown="1">
{{ v_teaching.lesson_use.notes }}
</div>

---

{% include verse-card.html verse=v_79_20 surah_name="An-Nāzi'āt" audio_base=audio_base %}

{% include verse-card.html verse=v_61_3 surah_name="Aṣ-Ṣaff" audio_base=audio_base %}

{% include verse-card.html verse=v_2_34 surah_name="Al-Baqarah" audio_base=audio_base %}

[↑ Back to top](#lesson-map)
{: .back-to-top}

## Learning — Can You Spot the Roots?
{: #learning}

<div class="lang-en" markdown="1">
You've met all 8 words. Now see if you can spot them on your own — try to predict the meaning of the highlighted word before reading the English.
</div>

<div class="lang-ta" markdown="1">
நீங்கள் 8 வார்த்தைகளையும் சந்தித்துவிட்டீர்கள். இப்போது நீங்களே அவற்றைக் கண்டுபிடிக்க முடியுமா பாருங்கள் — மொழிபெயர்ப்பைப் படிக்கும் முன் சிறப்பிக்கப்பட்ட வார்த்தையின் பொருளைக் கணிக்க முயற்சியுங்கள்.
</div>

---

{% include verse-card.html verse=v_29_45 surah_name="Al-'Ankabūt" audio_base=audio_base %}

{% include verse-card.html verse=v_18_5 surah_name="Al-Kahf" audio_base=audio_base %}

{% include verse-card.html verse=v_21_63 surah_name="Al-Anbiyā'" audio_base=audio_base %}

{% include verse-card.html verse=v_2_163 surah_name="Al-Baqarah" audio_base=audio_base %}

{% include verse-card.html verse=v_41_15 surah_name="Fuṣṣilat" audio_base=audio_base %}

[↑ Back to top](#lesson-map)
{: .back-to-top}

## Review Shuffled
{: #review-shuffled}

<div id="shuffle-player"></div>

[↑ Back to top](#lesson-map)
{: .back-to-top}

---


## Closing
{: #closing}

<div class="lang-en" markdown="1">
{{ page.closing }}
</div>

---

<div class="lang-en" markdown="1">

### What's Next?

{{ page.whats_next }}

</div>

---

[← All lessons]({{ '/#lessons' | relative_url }}) · [Next: Lesson 2 →]({{ '/lessons/lesson-02-shahida/' | relative_url }})
{: .lesson-nav}
