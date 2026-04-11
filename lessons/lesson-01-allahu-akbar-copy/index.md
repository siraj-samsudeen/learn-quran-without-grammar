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
Thin Liquid template per D30. English only per D33 — Tamil
and other languages come from sidecar files at render time
(architecture TBD).

Data sources:
  - site.data.roots.{ilah,kabura}      root prose + forms
  - site.data.verses["059"]["59:22"]   per-verse data
  - site.data.verses.teaching.*        synthetic teaching phrases
  - page.{opening,closing,whats_next}  prose from picker-config

Known visual-parity gaps vs production (documented, intentional):
  - Tamil content completely absent — sidecars not yet built
  - Surah transliteration (Al-Ḥashr etc.) is hand-passed to the
    verse-card include rather than sourced from site.data.surahs,
    which currently holds plain-ASCII names
  - Quick Check quiz section omitted — needs a separate quiz_arabic
    data pass (lesson_use.arabic has multi-bold for verses like
    2:163, but the quiz wants single-bold-word fragments)
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

<div class="lang-en" markdown="1">
{{ page.opening }}
</div>

<p class="lesson-preview lang-en">In the first lesson, you will meet <strong>8 Arabic words</strong> from two root families — the roots behind <strong>اللهُ أَكْبَرُ</strong> — through 11 ayahs from the Quran plus 1 teaching phrase.</p>

<div class="lesson-map" id="lesson-map" markdown="0">
  <a href="#anchor">Anchor</a>
  <span class="map-arrow">→</span>
  <a href="#root-ilah">إِلَٰه <span class="map-detail">(3 words)</span></a>
  <span class="map-arrow">→</span>
  <a href="#root-kabur">كَبُرَ <span class="map-detail">(5 words)</span></a>
  <span class="map-arrow">→</span>
  <a href="#practice">Practice</a>
  <span class="map-arrow">→</span>
  <a href="#review-in-order">Review</a>
  <span class="map-arrow">→</span>
  <a href="#summary">Summary</a>
</div>

<div markdown="0">
<details>
<summary><span class="lang-en">📖 First time? How to study this lesson</span></summary>

<p class="lang-en">For each phrase: <strong>read</strong> the Arabic → <strong>listen</strong> to the audio → <strong>say the word</strong> 3–5 times yourself → <strong>move on</strong>. In the Practice section, try to predict meanings before reading the English. Download the audio and play it on repeat through your day — passive listening is the secret weapon. Use the <strong>🔒 Hide translations</strong> button (bottom-right) to challenge yourself. <a href="{{ '/how-to-study' | relative_url }}">Read the full study guide →</a></p>
</details>
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

## Practice — Can You Spot the Roots?
{: #practice}

---

{% include verse-card.html verse=v_29_45 surah_name="Al-'Ankabūt" audio_base=audio_base %}

{% include verse-card.html verse=v_18_5 surah_name="Al-Kahf" audio_base=audio_base %}

{% include verse-card.html verse=v_21_63 surah_name="Al-Anbiyā'" audio_base=audio_base %}

{% include verse-card.html verse=v_2_163 surah_name="Al-Baqarah" audio_base=audio_base %}

{% include verse-card.html verse=v_41_15 surah_name="Fuṣṣilat" audio_base=audio_base %}

[↑ Back to top](#lesson-map)
{: .back-to-top}

## Review in Order
{: #review-in-order}

<audio class="review-audio-en" controls preload="none" src="{{ page.audio_download | relative_url }}"></audio>

<a class="download-link download-link-en" href="{{ page.audio_download | relative_url }}" download>📥 Download full lesson audio</a>

---

## Review Shuffled
{: #review-shuffled}

<div id="shuffle-player"></div>

[↑ Back to top](#lesson-map)
{: .back-to-top}

---

## Summary
{: #summary}

<div class="lang-en" markdown="1">

#### Words

| Arabic | English | Meaning |
| --- | --- | --- |
| إِلَٰه | *ilāh* | god |
| آلِهَة | *āliha* | gods |
| اللَّهُمَّ | *Allāhumma* | O Allah |
| كَبِير | *kabīr* | great, big |
| أَكْبَرُ | *Akbar* | greater, greatest |
| كُبْرَى | *kubrā* | greatest |
| كَبُرَ | *kabura* | was great |
| اسْتَكْبَرَ | *istakbara* | was arrogant |
{: .root-table}

</div>

#### Phrases
{: .lang-en}

<div class="phrases-list" markdown="0">
  <div class="phrase-row">
    <div class="phrase-arabic">هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ</div>
    <div class="phrase-english">He is Allah — there is no god but He <span class="phrase-ref">(59:22)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">وَإِذْ قَالَ إِبْرَاهِيمُ لِأَبِيهِ آزَرَ أَتَتَّخِذُ أَصْنَامًا آلِهَةً</div>
    <div class="phrase-english">And when Ibrahim said to his father: Do you take idols as gods? <span class="phrase-ref">(6:74)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ</div>
    <div class="phrase-english">Say: O Allah, King of kings <span class="phrase-ref">(3:26)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">هُوَ كَبِيرٌ. أَنَا أَكْبَرُ مِنْهُ. وَاللَّهُ أَكْبَرُ مِنَّا، بَلْ، مِنْ كُلِّ شَيْءٍ</div>
    <div class="phrase-english">He is great. I am greater than him. And Allah is greater than us — rather, than everything.</div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">فَأَرَاهُ الْآيَةَ الْكُبْرَىٰ</div>
    <div class="phrase-english">He showed him the greatest sign <span class="phrase-ref">(79:20)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">كَبُرَ مَقْتًا عِندَ اللَّهِ أَن تَقُولُوا مَا لَا تَفْعَلُونَ</div>
    <div class="phrase-english">Greatly hateful in the sight of Allah — that you say what you do not do <span class="phrase-ref">(61:3)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">وَإِذْ قُلْنَا لِلْمَلَائِكَةِ اسْجُدُوا لِآدَمَ فَسَجَدُوا إِلَّا إِبْلِيسَ أَبَىٰ وَاسْتَكْبَرَ وَكَانَ مِنَ الْكَافِرِينَ</div>
    <div class="phrase-english">When We said to the angels: Prostrate — they all did, except Iblis. He refused and was arrogant. <span class="phrase-ref">(2:34)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">وَلَذِكْرُ اللَّهِ أَكْبَرُ</div>
    <div class="phrase-english">And the remembrance of Allah is greater <span class="phrase-ref">(29:45)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">كَبُرَتْ كَلِمَةً تَخْرُجُ مِنْ أَفْوَاهِهِمْ</div>
    <div class="phrase-english">How great a word that comes from their mouths <span class="phrase-ref">(18:5)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">قَالَ بَلْ فَعَلَهُ كَبِيرُهُمْ هَٰذَا فَاسْأَلُوهُمْ إِن كَانُوا يَنطِقُونَ</div>
    <div class="phrase-english">He said: Rather, their chief did it — ask them, if they can speak <span class="phrase-ref">(21:63)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">وَإِلَٰهُكُمْ إِلَٰهٌ وَاحِدٌ لَا إِلَٰهَ إِلَّا هُوَ الرَّحْمَٰنُ الرَّحِيمُ</div>
    <div class="phrase-english">Your God is one God — there is no god but He, the Most Merciful <span class="phrase-ref">(2:163)</span></div>
  </div>
  <div class="phrase-row">
    <div class="phrase-arabic">فَأَمَّا عَادٌ فَاسْتَكْبَرُوا فِي الْأَرْضِ بِغَيْرِ الْحَقِّ وَقَالُوا مَنْ أَشَدُّ مِنَّا قُوَّةً</div>
    <div class="phrase-english">As for ʿĀd, they were arrogant on earth and said: Who is mightier than us? <span class="phrase-ref">(41:15)</span></div>
  </div>
</div>

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
