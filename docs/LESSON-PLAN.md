# Lesson Plan & Organisation

> **Status (2026-04-14):** Pedagogical framework (anchor phrase → roots → forms → sentences, selection criteria, translation style) is **still authoritative**. Storage and tooling details (references to `docs/roots/*.json`, the static picker HTML) are **superseded** by the Era 3 architecture — see [CURRENT-STATE.md](CURRENT-STATE.md) and [DATA-MODEL.md](DATA-MODEL.md).

This document defines how each lesson is structured, how sentences are selected, and how the curriculum builds over time.

---

## Anchor Phrase → Roots → Forms → Sentences

Every lesson starts from a **phrase every Muslim already knows** (adhān, ṣalāh, common duʿā). From that phrase, we extract the Arabic roots, and from those roots we select Qur'anic sentences for study.

**Example — Lesson 1: اللهُ أَكْبَرُ**
- Root word 1: **إِلَٰه** (ilāh) — behind اللّٰه
- Root word 2: **كَبُرَ** (kabura) — behind أَكْبَرُ

### Root word convention

We identify each root by a **representative root word** rather than the bare three-letter root. The root word is the form closest to the root's base meaning — typically the Form I verb or the most basic noun. Examples:
- Three-letter root ك ب ر → root word **كَبُرَ** (kabura) — the Form I verb
- Three-letter root أ ل ه → root word **إِلَٰه** (ilāh) — the base noun "god/deity"

This is more intuitive for students and teachers than abstract three-letter combinations.

---

## Lesson Structure (v3 — revised 2026-04-12)

Each lesson contains **1 anchor + up to 9 learning phrases = 10 phrases / 100 words** (whichever limit hits first). Recall adds up to 5 phrases / 50 words from previous lessons.

### Anchor Phrases (1 per root, separate from the 5 learning phrases)
- Each root gets **one anchor phrase** — the key phrase the student must memorize
- Anchor phrases should be **short** — even weaker students must be able to commit them to memory
- Can be Qur'anic or teacher-made (teaching phrases, clearly labelled as non-Qur'anic)

### Learning Section (up to 9 phrases, budget: 10 phrases / 100 words total with anchor)
- Each learning phrase introduces a **form from the root table** that is NOT already covered by the anchor phrase
- Learning phrases are ordered **shortest → longest** (progressive difficulty)
- The automated scoring system selects and ranks verses; there is no separate practice section — all selected verses become learning phrases
- The split between roots depends on how many uncovered forms each root has

### Summary Table
- One combined table at the bottom: all words + all phrases
- "Tell them what you told them" — the bird's-eye review
- **Words table**: order must match the root tables in the lesson body (Root 1 words first, then Root 2 words, in the same order they appear in each root table)
- **Phrases table**: order must match lesson section order (sections 1 → 12)
- **Phrase references**: use `(surah:ayah)` format only — no surah names. Example: `· (59:22)` not `· Al-Ḥashr 59:22`

---

## Form Selection Process

### Step 1: Pull the full inventory from the Qur'anic Arabic Corpus

For each root, retrieve all derived forms with their occurrence counts from [corpus.quran.com/qurandictionary.jsp](https://corpus.quran.com/qurandictionary.jsp). Present them in the **exact order and grouping the Corpus uses** (verbs by form number, then nominals, then verbal nouns and participles).

Example for ك ب ر:

| # | Category | Form | Transliteration | Gloss | Count |
|---|----------|------|-----------------|-------|-------|
| 1 | Verb (I) | كَبُرَ | kabura | to be great | 8 |
| 2 | Verb (II) | كَبِّرْ | kabbir | to magnify | 4 |
| 3 | Verb (IV) | أَكْبَرْ | akbar | to admire greatly | 1 |
| ... | ... | ... | ... | ... | ... |

### Step 2: Select 5 forms (or 5 patterns) to focus on

Selection criteria (in order of priority):
1. **Frequency** — forms with the most occurrences are generally preferred
2. **Pedagogical importance** — the teacher may override frequency if a form is especially meaningful (e.g., a Name of Allah, a famous verse, a form that directly connects to the anchor phrase)
3. **Verse quality** — does the form appear in a verse that is a complete, memorable, self-contained sentence?

**When a root has few morphological forms** (e.g., root أ ل ه has only 3 forms, with one being اللَّه appearing 2,699 times), select 5 distinct **sentence patterns** instead of 5 distinct forms. For example, إِلَٰه appears in patterns like لَا إِلَٰهَ إِلَّا, إِلَٰهٌ وَاحِدٌ, آلِهَة, مِنْ إِلَٰهٍ غَيْرُهُ, etc. — each teaches a different way the Qur'an uses the word.

### Step 3: For each selected form, list ALL occurrences

Present every occurrence in a table, ordered by recommendation (best candidate first). Include a **Why** column explaining the recommendation reasoning — this helps the teacher scan and decide quickly.

- If the form has **≤ 10 occurrences**: list all of them
- If the form has **> 10 occurrences**: list the top 10 ranked candidates and provide a corpus link for the rest

| # | Ref | Arabic Context | Translation | Why |
|---|-----|---------------|-------------|-----|
| 1 | 29:45 | وَلَذِكْرُ ٱللَّهِ **أَكْبَرُ** | And the remembrance of Allah is greater | Ties directly to anchor — dhikr = ṣalāh |
| 2 | 9:72 | وَرِضْوَانٌ مِّنَ ٱللَّهِ **أَكْبَرُ** | And approval from Allah is greater | Allah's pleasure > Paradise itself |
| ... | ... | ... | ... | ... |

The target word is **bolded** in the Arabic context.

### Step 4: Teacher selects one sentence per form

The teacher picks the best sentence for learning. Criteria:
- The fragment must be **long enough to make sense on its own** — a student should be able to memorize it with its meaning
- If the target word appears mid-sentence and the fragment doesn't stand alone, **include more context** (e.g., include the preceding clause)
- Prefer sentences that are **emotionally resonant**, **well-known**, or **connected to daily practice**

#### The "Story Context" Principle (added 2025-06-04)

**Always include enough text to form a story the student can hook into.** A fragment like أَتَتَّخِذُ أَصْنَامًا آلِهَةً ("Do you take idols as gods?") is abstract on its own. But when you include وَإِذْ قَالَ إِبْرَاهِيمُ لِأَبِيهِ آزَرَ ("And when Ibrahim said to his father Azar"), it becomes a *story* — Ibrahim confronting his father — and stories are far easier to memorize than abstract phrases.

**When deciding how much text to include:**
- Err on the side of more context, not less
- Include the subject/speaker ("Ibrahim said...", "Pharaoh said...", "They said to Musa...")
- The story anchors the phrase in the student's memory — without it, memorization is much harder
- This may mean showing the full ayah even when only one word is being taught

**This also affects audio fragments:** if the story context requires the full ayah, play the full ayah. Don't cut the audio to match a short fragment — let the audio match the story.

#### Review Audio Uses Full Ayahs (added 2025-06-04)

The learning cards on the page use **trimmed fragments** — short, precise clips that isolate the word being taught. But the review audio (Review in Order / Review Shuffled) should play the **full ayah** for each phrase.

Why: by the time the student reaches review, they've already met the word in isolation. Now they need to practise **spotting it inside a longer recitation** — which is exactly what happens in ṣalāh. Hearing the full ayah trains recognition in context.

In the YAML, each sentence can have two audio definitions:
- `arabic_source` — the trimmed fragment used for the learning card (inline on the page)
- `arabic_source_full` — the full ayah used for the review audio build (sequential MP3 + shuffle player)

### Selection log conventions

Every pick is recorded in `docs/selections/lesson-NN.md` with a Reason column. Two types of reasons appear:

- **AI-recommended reasons** — written in normal text (e.g., "Complete sentence, powerful meaning, universally relatable")
- **Teacher-override reasons** — written in **bold text** (e.g., "**Surah Al-A'la — frequently recited in ṣalāh, student already knows it by ear**")

This distinction matters: when a future agent reads the selection log, bolded reasons reveal the teacher's personal priorities and patterns — which surahs they value, which daily practices they want to connect to, which contexts matter most to them. These bolded reasons are the strongest signal for learning the teacher's preferences.

### Step 5: Repeat for the second root

Same process. All selected verses become Learning phrases, ordered shortest → longest.

### Step 6: Feed the pipeline

After completing a lesson's selections, update `docs/selections/pipeline.md` with:
- **Ready to place** — verses the teacher approved for a specific future lesson
- **Strong candidates** — good verses not yet assigned
- **Deferred forms** — forms from this root not covered in this lesson

The pipeline is the **single source of truth** for queued material. When starting a new lesson, the agent should **check pipeline.md first** before pulling fresh from the corpus.

---

## Spillover & Revisiting

Not all forms of a root will be covered in the lesson where that root is introduced. This is by design.

- **Forms not covered** (e.g., كَبَّرَ, مُتَكَبِّر in Lesson 1) become candidates for introduction in **future lessons** — whenever there is a free learning slot
- **Forms already introduced** keep getting new example sentences in the Recall sections of later lessons — building the student's repertoire gradually
- This means the student's relationship with a root **deepens over many lessons**, not just one

---

## Sentence Fragment Guidelines

The Arabic context shown for each sentence should follow these rules:

1. **Must make sense on its own** — a student memorizes the fragment with its meaning; it should be a coherent thought
2. **Not too short** — a bare phrase like وَلَا أَكْبَرَ is meaningless without context
3. **Not too long** — keep to the meaningful clause or sentence, not the entire ayah if it runs very long
4. **Fragment penalty** — the scoring system applies a ×0.7 multiplier to verses that require fragmentation. Full ayahs are strongly preferred; only fragment when the full ayah exceeds the word budget or is incoherent as a standalone phrase.
5. **Examples of good fragments:**
   - وَلَذِكْرُ ٱللَّهِ أَكْبَرُ — complete thought, makes full sense
   - كَبُرَ مَقْتًا عِندَ اللَّهِ أَن تَقُولُوا مَا لَا تَفْعَلُونَ — full sentence
   - يَسْأَلُونَكَ عَنِ الْخَمْرِ وَالْمَيْسِرِ ۖ قُلْ فِيهِمَا إِثْمٌ كَبِيرٌ — needs the opening clause for context, so include it

---

## Teacher Selection Preferences

These patterns guide sentence selection. This list grows as new preferences emerge from lesson-building sessions.

1. **Frequently-recited surahs get priority** — if a form appears in a surah commonly heard in ṣalāh (Al-Fātiḥah, Al-A'la, short surahs of juz' 30, etc.), prefer that verse. The student already has it in their ear.
2. **Complete self-contained sentences preferred** — the fragment must be memorizable with its meaning. If the key word sits in a clause that doesn't stand alone, include more context.
3. **Emotional resonance matters** — verses that hit the heart (Ibrāhīm's duʿā, the parents verse, warnings that make you stop) are preferred over dry or technical ones.
4. **Daily-practice connection** — verses tied to things the student already does (adhān, ṣalāh, post-prayer dhikr, Ramaḍān) anchor the learning in lived experience.
5. **Narrative and emotional verses preferred** — favour narrative verses (prophets' stories — Ibrāhīm, Mūsā, Nūḥ, Iblīs) because stories are easier to remember and emotionally engaging. Well-known rulings, famous āyāt, and verses from frequently-recited surahs are also strong choices.

> This list is updated whenever a new preference pattern is identified during lesson selection. See `docs/selections/` for per-lesson decision logs.

---

## Translation Style

English translations should be **simple, everyday language** — the kind of English a non-academic Muslim would naturally use. Avoid formal or theological register when a simpler phrase exists.

### Specific conventions

| Arabic | ✗ Avoid | ✓ Use |
|--------|---------|-------|
| مَالِكَ الْمُلْكِ | Owner of all sovereignty | King of kings |
| الرَّحِيمُ | the Most Compassionate | the Continuously Merciful |
| الرَّحْمَٰنُ | the Most Gracious | the Most Merciful / the Intensely Merciful |

### Guiding principles

1. **Use the simplest English that is still accurate** — if a five-year-old can understand it, that's better than a university textbook phrasing.
2. **Prefer concrete over abstract** — "King of kings" paints a picture; "Owner of all sovereignty" is legalistic.
3. **Ar-Raḥmān = intensely/most merciful** (the nature/attribute), **Ar-Raḥīm = continuously merciful** (the ongoing action). Keep this distinction consistent across all lessons.
4. **Be consistent** — once a translation is chosen for a term, use it everywhere. Students build recognition through repetition.

> This table grows as new translation decisions are made. Check here before translating common Qur'anic terms.

---

## Learning Science Conventions

These conventions were established through a 4-lens learning science review of Lesson 1 (encoding & retrieval, emotional engagement, cognitive load, Islamic pedagogy) and apply to **every lesson going forward**. Each convention includes the learning science principle behind it so future reviewers understand the *why*, not just the rule.

### Page Structure & Navigation

1. **Lesson map at top** — A compact clickable map after the lesson preview: `Anchor → Root 1 → Root 2 → Learning → Recall → Review → Summary → Quiz`. Each item links to its section via `id` attributes. *(Principle: Segmenting + Advance Organizer — reduces scroll anxiety, gives the student a mental scaffold before content begins)*

2. **Navigation links after lesson map** — A single compact line: `Course introduction · How to study a lesson`. No inline study tips, no collapsible duplicated content. The canonical study technique lives in `how-to-study.md`; the lesson page just points to it. *(Principle: Single Source of Truth — teaching the method on every lesson page creates drift and clutter; link out instead)*

3. **Back-to-top links** — Place `[↑ Back to top](#lesson-map)` at section boundaries: after Learning, after Recall, after Review Shuffled, after Summary, after Quiz. **Important**: these must be placed AFTER the `---` HR separator, not before it, or `lesson-cards.js` will consume them as "extras" and delete them. *(Principle: Scannability — on mobile the lesson is 15+ screens of scrolling)*

4. **Stacked phrases layout in Summary** — The phrases summary uses a stacked layout (Arabic full-width on top, English below in muted italic) rather than a side-by-side table. Use the `.phrases-list` / `.phrase-row` HTML structure. *(Principle: Cognitive Load — side-by-side tables cramp Arabic text, especially on mobile)*

### Root Sections

5. **Curiosity gap before each root** — Before the root explanation prose, add 1–2 sentences that open a question the student wants answered. Example: *"The same three letters that praise Allah's greatness also describe the worst sin in the Qur'an. Let's see how."* *(Principle: Curiosity Gaps (Loewenstein) — creates information gaps that pull the learner forward)*

### Learning Section

6. **Learning header** — Use `## Learning — Can You Spot the Roots?` for the combined learning section that follows the root introductions. Add an orienting line beneath: *"You've met all the words. Now see if you can spot them on your own — try to predict the meaning of the highlighted word before reading the English."* Phrases are ordered shortest → longest — the length progression IS the difficulty gradient (no separate Practice section needed). *(Principle: Signaling + Generation Effect — marks the pedagogical shift from encoding to retrieval, primes the student to predict rather than passively read)*

7. **Hook text on every learning phrase** — Each learning phrase gets 1–2 sentences of story/emotional context. The later, longer phrases may have slightly shorter hooks than the earlier ones, but the section should sustain the emotional temperature throughout, not drop to zero. *(Principle: Emotional Tagging (Cahill) — memory consolidation is enhanced when emotional arousal is sustained, not just spiked once)*

### Quiz Section

8. **Format A quiz after Summary** — A `## Quick Check` section with one quiz item per taught word. Each item shows a verse fragment with the target word highlighted, and a `<details>` click-to-reveal: `إِلَٰهَ means…` → `god`. Keep the question text subtle (small muted font), not bold — the Arabic verse is the visual focus. *(Principle: Testing Effect (Roediger & Karpicke) — a single retrieval attempt produces more long-term retention than equivalent re-study time)*

### Closing

9. **Name the narrative arc** — The Closing should explicitly name the journey the lesson took. Example: *"This lesson moved through one question — what is truly great? The first root asked what you worship. The second asked what you consider great. The Qur'an's answer came in the voice of prophets, in the fall of Iblīs, and in the phrase you already carry: اللهُ أَكْبَرُ."* *(Principle: Narrative Transportation (Green & Brock) — explicit arc increases transportation and recall; the student should feel they went on a journey, not just through vocabulary)*

10. **"What's Next?" tease** — After the Closing, a `### What's Next?` section with 2–3 sentences teasing the next lesson's anchor phrase and root, opening a curiosity gap. Example: *"You'll discover that أَشْهَدُ doesn't just mean 'I testify.' Its root will take you somewhere unexpected."* *(Principle: Curiosity Gap — creates forward pull between lessons)*

### Global Features

11. **Translation toggle** — Every lesson has a floating bottom-right `🔒 Hide translations` button (built by `translation-toggle.js`). When active, all English translations are hidden and individually tap-to-reveal. State persists in localStorage. Mention this in the collapsible study tip. *(Principle: Generation Effect + Desirable Difficulty — transforms passive reading into active recall)*

12. **How to Study page** — A dedicated `how-to-study.md` page linked from the study tip in every lesson and from the homepage. Contains: 15-minute session ritual, passive listening tips, suggested 7-day schedule, "Share It" protégé effect tip, metacognitive "struggle is learning" note. *(Principles: Spaced Repetition, Protégé Effect, Desirable Difficulties metacognition)*

---

## Verification

All verse references must be verified against:
- **[corpus.quran.com](https://corpus.quran.com/qurandictionary.jsp)** — for form inventory and occurrence counts
- **[api.alquran.cloud](https://api.alquran.cloud)** — for Arabic text verification of specific verses

Occurrence counts in the lesson must match the Corpus exactly (no approximations like "~34").
