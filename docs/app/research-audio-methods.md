# Research: Audio-First Language Learning Methods

## How Assimil, Michel Thomas, and Related Methods Can Inform Our App Design

**Context**: The companion app for "Learn Qur'an Without Grammar" aims to digitize proven audio-immersion approaches. The course creator (Siraj) learned French to B2 level in 8 months using Assimil — that trajectory is our benchmark. This document analyzes the mechanics of each proven method and extracts concrete design principles for our app.

---

## Table of Contents

1. [The Assimil Method](#1-the-assimil-method)
2. [The Michel Thomas Method](#2-the-michel-thomas-method)
3. [Supporting Methods: Pimsleur and Glossika](#3-supporting-methods-pimsleur-and-glossika)
4. [How to Digitize These Approaches](#4-how-to-digitize-these-approaches)
5. [Comparison Table](#5-comparison-table)
6. [Lessons for Our App Design](#6-lessons-for-our-app-design)
7. [Design Principles for Our App](#7-design-principles-for-our-app)

---

## 1. The Assimil Method

### 1.1 History and Origin

Assimil was founded in 1929 by Alphonse Chérel in France. The company's first publication was *Anglais sans peine* ("English Without Toil"), and the brand name itself derives from "assimilate" — to absorb knowledge naturally into the mind. Now approaching a century of continuous publication, Assimil has expanded to cover over 100 languages and remains one of the most respected self-study language programs worldwide, particularly among European polyglots.

The company publishes several series at different proficiency targets:
- **"With Ease"** (Sans Peine) series: Teaches to CEFR **B2 level** with a vocabulary of 2,000–3,000 words — this is the series Siraj used for French
- **"Perfectionnement"** (Using) series: Advanced idiosyncrasies and idioms
- **"Learn"** series: Teaches to A2 level
- Business, Phrasebook, and other specialized series

### 1.2 The Two-Wave Structure

The core innovation of Assimil is its **two-phase learning cycle**, built around approximately 100 lessons:

**The Passive Wave (Lessons 1–49)**
- The learner listens to a dialogue recorded by native speakers
- Reads the target language text alongside a parallel translation in their native language (L2 on the left page, L1 on the right)
- Repeats sentences aloud, imitating the native speaker's pronunciation
- Reads brief grammar notes (kept minimal and intuitive)
- The learner is explicitly told: **do not try to memorize**. Just listen, read, understand, and repeat
- The goal is *comprehension* — building an enormous reservoir of passively understood language

**The Active Wave (Starting at Lesson 50)**
- The learner continues with new lessons (50–100) in the passive mode
- Simultaneously, they go back to Lesson 1 and begin *active* exercises
- In the active phase, the learner sees only the L1 translation and must produce the L2 sentence from memory
- This means on any given day during the active phase, the learner does **two lessons**: one new passive lesson + one old lesson in active review mode
- By the time the learner reaches Lesson 100 in the new material, they've also completed the active review of Lesson 50

### 1.3 The Bilingual Dialogue Format

Each lesson centers on a short, natural dialogue (typically 6–12 sentences). The format is:
- **L2 text** with phonetic transcription (for non-Latin scripts)
- **L1 literal translation** on the facing page, sometimes with idiomatic notes
- **Brief grammar notes** at the bottom, explaining only what's needed to understand the current dialogue
- **Exercises**: Fill-in-the-blank sentences to reinforce key patterns

The dialogues are carefully graded to introduce new vocabulary and structures gradually while recycling previously learned material. Humor and culturally authentic situations keep engagement high.

### 1.4 The Daily Rhythm

Assimil prescribes a remarkably consistent daily practice:
- **30 minutes per day**, every day
- **One new lesson** per day (passive or both passive + active depending on phase)
- **No cramming, no marathon sessions** — consistency over intensity
- A complete "With Ease" course takes approximately **5–6 months** at one lesson per day (100 lessons)
- Reaching B2 proficiency with the "Perfectionnement" follow-up takes approximately **8–12 months** total

This maps precisely to Siraj's experience: B2 in French in 8 months, at roughly 30 minutes per day.

### 1.5 Why It Works: The Science

Assimil's effectiveness draws on several well-established learning principles:

1. **Comprehensible Input (Krashen's i+1)**: Each lesson is slightly above the learner's current level, with enough context and translation support to remain comprehensible
2. **Spaced Natural Repetition**: Key vocabulary and structures reappear across multiple lessons without feeling like drill
3. **Understanding Before Producing**: The passive wave builds a deep receptive foundation before the active wave demands production — mirroring how children acquire their first language
4. **Audio Primacy**: Native-speaker recordings train the ear to authentic rhythm, intonation, and pronunciation from day one
5. **Low Cognitive Load**: Short daily sessions prevent fatigue and maintain motivation over months
6. **Whole-Sentence Learning**: Grammar is absorbed implicitly through exposure to complete, natural sentences rather than through explicit rule memorization

### 1.6 Limitations and Criticisms

- **No speaking practice with feedback**: The learner repeats aloud but receives no pronunciation correction
- **Limited interactivity**: The book-and-audio format is fundamentally one-directional
- **Cultural specificity**: Dialogues are designed for European language pairs and may not transfer well to non-European languages
- **No SRS integration**: The review schedule is fixed (go back to Lesson 1 at Lesson 50) rather than algorithmically optimized
- **Self-discipline required**: Without external accountability, many learners stall or abandon the course
- **Script challenges**: For languages with non-Latin scripts (Arabic, Japanese, Chinese), the transition from phonetic transcription to native script can be abrupt

---

## 2. The Michel Thomas Method

### 2.1 Origin and Philosophy

Michel Thomas (born Moniek Kroskof, 1914–2005) was a Polish-born polyglot who mastered 10 languages during his extraordinary life — which included surviving Nazi concentration camps, serving in the French Resistance, and working with U.S. Army Counter Intelligence. After the war, he opened language schools in Beverly Hills and New York, teaching celebrities, diplomats, and business leaders.

His core insight came from his wartime experiences, particularly his torture by the Gestapo, during which he discovered the brain's extraordinary capacity under the right conditions. He became convinced that **stress is the greatest barrier to learning**, and that when stress is removed, the brain naturally absorbs and retains information with remarkable efficiency.

His mantra: *"What you understand, you know; and what you know, you don't forget."*

### 2.2 The Three Rules: No Memorization, No Homework, No Notes

The Michel Thomas Method is built on three radical prohibitions:

1. **No memorization**: Students are explicitly forbidden from trying to memorize. The teacher takes full responsibility for the student's retention. If the student forgets, it's the teacher's fault for not presenting the material correctly.
2. **No homework**: All learning happens during the session. There is nothing to "study" afterward.
3. **No notes**: Students must not write anything down. The method works entirely through listening and speaking.

These rules serve a crucial psychological function: they **remove all anxiety** about performance. The student cannot "fail" because they were never asked to memorize in the first place.

### 2.3 The Building-Block Approach

The method works by decomposing language into small, manageable pieces and building up systematically:

1. **Start with cognates**: Begin with words the learner already knows (e.g., English-French cognates like "possible," "situation," "important")
2. **Introduce one new element at a time**: Each new piece is layered onto what the student already knows
3. **Build sentences incrementally**: "It is" → "It is possible" → "It is not possible" → "It is not possible for me" → "It is not possible for me to do it today"
4. **Grammar through pattern, not rules**: Instead of teaching "the conditional tense is formed by...", the teacher shows: "I would like" → "he would like" → "would you like?" and lets the pattern emerge naturally
5. **Constant recycling**: Every new element is immediately combined with previously learned elements in multiple permutations

### 2.4 The Audio Format: Teacher-Student Recording

Unlike other audio courses, Michel Thomas recordings capture **actual teaching sessions** with real students:
- The teacher presents material to 2–3 students
- Students attempt to form sentences
- When students make errors, the teacher gently corrects and re-explains
- The at-home listener is encouraged to **pause and attempt the sentence** before the students answer
- This creates a sense of being in a real classroom without the stress of being the one called upon

The course structure (as published by Hodder & Stoughton / Hachette):
- **Start** course: ~1 hour (first hour of Foundation)
- **Foundation** course: ~8 hours (beginner)
- **Intermediate** course: ~15–20 hours
- Additional courses: Language Builder, Vocabulary Builder, Insider's

### 2.5 Error Correction and Confidence Building

Michel Thomas's approach to errors was revolutionary:
- Errors are **never punished or highlighted as failures**
- When a student makes a mistake, the teacher calmly says something like: "No, remember, we said that..."
- The teacher then **re-presents the building blocks** that led to the correct answer
- The student always arrives at the correct answer through understanding, not correction
- This builds **cumulative confidence** — each success reinforces the belief that learning is working

### 2.6 Limitations and Criticisms

- **No reading/writing component**: The method is purely oral, which limits its utility for written languages
- **Limited vocabulary**: The courses focus on structural mastery with a relatively small vocabulary
- **No spaced repetition**: Material is recycled within sessions but there's no systematic long-term review mechanism
- **Teacher-dependent**: The magic of the method relies heavily on the skill of the individual teacher (Michel Thomas himself vs. later instructors)
- **Not correlated to CEFR levels**: The publishers explicitly state the courses don't map clearly to CEFR proficiency levels
- **Production-heavy for beginners**: Some linguists argue the method pushes production too early before sufficient input has been absorbed
- **Scalability**: The method was designed for small-group, in-person instruction — the audio recordings are an approximation

---

## 3. Supporting Methods: Pimsleur and Glossika

### 3.1 The Pimsleur Method

Founded by Dr. Paul Pimsleur (1927–1976), a professor of applied linguistics, Pimsleur Language Programs have been published since 1963 and are now a division of Simon & Schuster.

**Core Principles:**
- **Graduated Interval Recall**: Pimsleur's key innovation — new words are reviewed at mathematically increasing intervals (5 seconds → 25 seconds → 2 minutes → 10 minutes → 1 hour → 5 hours → 1 day → 5 days → 25 days). This is an early form of spaced repetition, predating modern SRS algorithms.
- **Principle of Anticipation**: The course constantly prompts the learner to produce a response before hearing the correct answer, keeping the brain actively engaged.
- **Core Vocabulary**: Deliberately limits the amount of new material to prevent overload — only a few new items per 30-minute lesson.
- **Organic Learning**: All vocabulary is introduced within the context of a natural conversation, never in isolation.

**Lesson Structure:**
- Each lesson is exactly **30 minutes** of audio
- 5 levels of 30 lessons each (150 lessons total for most languages)
- One lesson per day recommended
- Emphasis on speaking from day one — the learner speaks aloud for much of the lesson

**Relevance to our app**: Pimsleur's Graduated Interval Recall is essentially a hand-crafted SRS — our FSRS algorithm is the modern, adaptive version of this same principle. The 30-minute daily session length is consistent across successful methods.

### 3.2 The Glossika Method

Glossika is a digital-native language learning platform that emphasizes **massive sentence exposure** with adaptive algorithms.

**Core Approach:**
- **Sentence-based training**: All learning happens through complete sentences, never isolated words
- **Native speaker audio**: Every sentence is recorded by a native speaker
- **Spaced repetition algorithm**: Determines which sentences to review and when
- **High-volume exposure**: The system encourages 20–50 new sentences per day
- **Dual modes**: "Full Practice" (listening, speaking, reading, writing) and "Listening Only" mode
- **No explicit grammar instruction**: Grammar is absorbed implicitly through pattern exposure

**Relevance to our app**: Glossika's sentence-pair model with native audio + SRS is the closest existing approach to what our app will do. Their "Listening Only" mode maps to our passive/listen mode. Key difference: Glossika uses algorithmically generated sentence ordering, while our content is human-curated around root-word families and prayer phrases.

---

## 4. How to Digitize These Approaches

### 4.1 Digitizing the Assimil Passive Wave

**What Assimil Does**: Present a bilingual dialogue with native audio. The learner listens, reads both languages, and repeats.

**What Our App Can Replicate**:
| Assimil Element | App Implementation |
|---|---|
| Native speaker audio | Qur'anic reciter audio (multiple reciters for variety) |
| L2 text (target language) | Arabic text with word-level highlighting synced to audio |
| L1 translation (facing page) | Translation in user's chosen language (English/Tamil/Urdu) below or togglable |
| Phonetic transcription | Optional transliteration toggle |
| "Listen and repeat" instruction | Auto-pause after each phrase for learner to repeat |
| Brief grammar notes | Root-word family explanation ("this word comes from the same family as...") |
| 30-min daily rhythm | Session timer with gentle nudge at 15-20 min; daily streak tracking |

**Our "Listen Mode" = Assimil Passive Wave**:
- Play the lesson as a continuous audio stream: reciter audio → pause → translation TTS
- User sees Arabic text highlighted word-by-word during reciter playback
- Translation appears (audio + text) after each phrase
- User can tap to repeat any phrase
- **No testing, no scoring, no pressure** — pure comprehensible input
- Mark lesson as "listened" after completing the full sequence

**What Must Be Human-Designed (Cannot Be Automated)**:
- The ordering of lessons and root-word families (Siraj's curriculum)
- Which phrases from prayers/Qur'an to include and in what sequence
- The explanatory notes connecting root families to meaning
- The overall progression from simple to complex

### 4.2 Digitizing the Assimil Active Wave

**What Assimil Does**: Show only the L1 translation; the learner must produce the L2 sentence.

**What Our App Can Replicate**:
| Assimil Element | App Implementation |
|---|---|
| See L1, produce L2 | Show translation, ask user to recall the Arabic phrase |
| Fixed review schedule (Lesson 1 at Lesson 50) | **FSRS-driven review** — algorithmically optimal, not fixed |
| Self-assessment of recall | "Again / Hard / Good / Easy" buttons after revealing answer |
| Active exercises (fill-in-blank) | Tap-to-arrange word order, or select the correct Arabic word for a meaning |

**Our "Review Mode" = Assimil Active Wave (enhanced with SRS)**:
- FSRS schedules review of previously learned phrases
- **Recognition mode**: Play Arabic audio → user selects correct translation (easier)
- **Recall mode**: Show translation → user tries to recall Arabic meaning/phrase (harder)
- **Audio recognition**: Play audio → user identifies which root family the word belongs to
- After revealing the answer, play the reciter audio again to reinforce the audio-meaning link
- Rate difficulty → FSRS schedules next review

**Key Improvement Over Assimil**: Instead of the fixed "review Lesson 1 at Lesson 50" schedule, FSRS optimizes review timing per individual phrase based on the learner's actual performance. Phrases that are harder for this specific learner get reviewed sooner; easy ones are spaced further apart.

### 4.3 Digitizing the Michel Thomas Building-Block Approach

**What Michel Thomas Does**: Start with what the learner already knows, add one element at a time, build up incrementally.

**How Our Root-Family Approach Maps to This**:
| Michel Thomas Element | Our App Implementation |
|---|---|
| Start with cognates | Start with phrases from daily prayers that every Muslim already knows (Allāhu Akbar, Bismillāh, Alḥamdulillāh) |
| One new element at a time | Introduce one root family per lesson with 3–5 related words |
| Build sentences incrementally | Show the root in a simple prayer phrase → then in a Qur'anic verse → then in a longer passage |
| Grammar through pattern | "Notice how كَبِير (big), أَكْبَر (bigger/greatest), and كِبْرِيَاء (greatness) all share the root ك-ب-ر" — no grammar terms, just pattern recognition |
| Constant recycling | Previous root families appear in new Qur'anic verses alongside newly introduced roots |

**The "No Grammar" Alignment**: Michel Thomas's "no grammar terminology" principle maps directly to our course's "Learn Qur'an Without Grammar" philosophy. Both approaches teach language patterns through exposure and intuition rather than explicit rule statements. The Michel Thomas teacher says "notice that..." rather than "the rule is...". Our app says "these words are related" rather than "this is the Form IV verbal noun."

**What Can Be Automated vs. Human-Designed**:
- ✅ **Automated**: SRS scheduling, audio playback, progress tracking, review session generation
- ✅ **Automated**: Highlighting root letters within Arabic words, showing root-family connections
- 🧑 **Human-designed**: The sequence of root families, the selection of Qur'anic phrases, the explanatory notes
- 🧑 **Human-designed**: The "building block" ordering — which roots to teach first, which phrases provide the best scaffolding

### 4.4 Digitizing Michel Thomas's Anxiety Reduction

**What Michel Thomas Does**: Removes all performance pressure — no memorization, no homework, no notes.

**How Our App Can Replicate This**:
- **Listen mode has zero testing** — it's pure immersive listening, like the passive wave
- **Review mode uses self-assessment** — the learner rates their own recall, rather than being "graded"
- **No "wrong answer" screens** — when a learner doesn't remember, the app simply shows the answer and plays the audio again
- **No scores, no percentages, no leaderboards** during learning — only gentle progress indicators
- **The streak counter** emphasizes consistency ("5 days in a row!") rather than accuracy
- **FSRS handles the "when to review" decision** — the learner never needs to worry about "am I forgetting things?" because the algorithm manages that automatically

### 4.5 The Passive → Active Transition

The critical question: **when should a learner move from pure listening (passive) to active review?**

| Method | Transition Point |
|---|---|
| Assimil | Fixed at Lesson 50 (halfway through the course) |
| Michel Thomas | Production starts immediately, but in a low-stakes way |
| Pimsleur | Production starts from Lesson 1, prompted by the audio |
| Glossika | Both modes available simultaneously from the start |

**Our Recommended Approach**: A **graduated transition** that combines the best of each:

1. **Days 1–7 (Week 1)**: Pure Listen Mode only. Build familiarity with the audio, the Arabic text, and root-family concepts. No review, no testing. This is the "trust the process" phase.
2. **Day 8 onward**: Listen Mode for new lessons + Review Mode unlocks for lessons completed 7+ days ago. FSRS begins scheduling reviews.
3. **Recognition before Recall**: Initial review cards are recognition tasks (hear Arabic → pick translation). After a phrase reaches "Good" status 3+ times, recall cards are introduced (see translation → recall Arabic meaning).
4. **Continuous dual track**: From Week 2 onward, every daily session is structured as: **Listen to new material (10–15 min) + Review old material (10–15 min)** — mirroring Assimil's dual daily lesson structure.

---

## 5. Comparison Table

| Dimension | Assimil | Michel Thomas | Pimsleur | Glossika | **Our App** |
|---|---|---|---|---|---|
| **Founded** | 1929 | 1947 (schools), 1990s (recordings) | 1963 | 2012 | 2025 |
| **Audio Format** | Native speaker dialogues | Teacher-student recorded sessions | Scripted prompt-response drills | Native speaker sentences | Qur'anic reciter audio + translation TTS |
| **Primary Modality** | Listen + Read | Listen + Speak | Listen + Speak | Listen + Speak + Read + Write | Listen + Read + Recognize |
| **Grammar Approach** | Minimal notes, absorbed implicitly | Zero grammar terms; pattern-based | Absorbed through context | Zero explicit grammar | Zero grammar terms; root-family patterns |
| **SRS / Review System** | Fixed schedule (active wave at L50) | None (recycling within sessions) | Hand-crafted graduated intervals | Algorithmic SRS | FSRS (state-of-the-art adaptive SRS) |
| **Daily Session Length** | 30 min | Flexible (1–2 hours for engaged learners) | 30 min (exactly) | 20–60 min (user choice) | **15–25 min** (target) |
| **Production vs. Recognition** | Recognition → Production (two waves) | Production from start | Production from start | Both simultaneously | **Recognition-first** (matching Qur'anic comprehension goal) |
| **New Material per Day** | 1 dialogue (~8–12 sentences) | Varies by session | ~30 new items per lesson | 20–50 new sentences | **1 lesson = 1 root family + 3–7 phrases** |
| **Course Length** | ~100 lessons (5–6 months) | ~8 hours (Foundation) + 15–20 hours (Intermediate) | 150 lessons (5 months) | Continuous (no fixed endpoint) | **~40 lessons** (course-mapped) |
| **Target Proficiency** | B2 (With Ease series) | Conversational (not CEFR-mapped) | Intermediate speaking | Fluency through volume | **Qur'anic recognition** (prayer + Qur'an comprehension) |
| **Content Type** | Everyday dialogues | Everyday conversation | Travel/social conversation | General sentences (all topics) | **Qur'anic verses + prayer phrases** |
| **Bilingual Text** | Yes (L2 left / L1 right) | No text at all | No text (audio only) | Text + audio | **Yes (Arabic + chosen translation)** |
| **Multiple L1 Support** | One L1 per edition | One L1 per edition | One L1 per edition | Multiple L1 options | **English, Tamil, Urdu** |
| **Offline Support** | Physical book + CD | Physical CD/digital download | App with downloads | Requires internet | **Full offline (SQLite + local audio)** |

---

## 6. Lessons for Our App Design

### 6.1 Optimal Session Length and Daily Rhythm

Every successful method converges on the same insight: **short, consistent daily sessions outperform long, irregular ones**.

- **Assimil**: 30 minutes/day
- **Pimsleur**: 30 minutes/day (exact)
- **Glossika**: Recommends 20–60 minutes
- **Research consensus**: 15–30 minutes of focused practice daily produces optimal long-term retention

**Our target: 15–25 minutes per day**, structured as:
- **10–15 minutes**: Listen to new lesson (1 root family, 3–7 Qur'anic phrases)
- **5–10 minutes**: FSRS review of previously learned material
- **Total**: Achievable before/after any of the five daily prayers — the course content (prayer phrases) creates a natural practice trigger

### 6.2 The "Learn" Flow for Maximum Retention

Drawing from Assimil's passive wave and Michel Thomas's building-block approach:

1. **Hook** (30 seconds): "Today's root family is ك-ب-ر — you already know this! Allāhu Akbar!" Start with what the learner recognizes.
2. **Listen** (5–8 minutes): Play 3–7 phrase pairs. For each: reciter audio → brief pause → translation audio. Arabic text visible and highlighted. Translation text togglable.
3. **Explore** (3–5 minutes): Show the root-family connections. "كَبِير (great/big) — أَكْبَر (greatest) — كِبْرِيَاء (greatness) — same root ك-ب-ر." Replay individual phrases on tap.
4. **Relisten** (2–3 minutes): Play all phrases again as a continuous stream. This is the Assimil "listen to the whole dialogue again" step.

**No testing during the Learn flow.** The entire Learn experience is receptive/passive. Testing comes later in Review mode, after FSRS determines the time is right.

### 6.3 When to Introduce New Material vs. Review

Assimil's 50/50 split (new + review) during the active phase is a sound general principle, but FSRS lets us be smarter:

- **If the learner has < 7 days of history**: Focus on new lessons (85% new / 15% light review)
- **If the learner has 7–30 days of history**: Balanced (50% new / 50% review) — this is the Assimil active-wave rhythm
- **If the learner has > 30 days of history**: FSRS may need more review time (40% new / 60% review) as the backlog of learned material grows
- **Key guardrail**: Always present at least 1 new lesson per session to maintain forward momentum and the feeling of progress. Siraj's B2 trajectory required moving through ~1 lesson/day consistently.

### 6.4 The Passive → Active Transition

The research from Assimil and cognitive science is clear: **a period of pure receptive exposure before production demands produces better outcomes**.

Our app should implement this as:
1. **Lesson state: "New"** → Only available in Listen mode
2. **Lesson state: "Listened"** (after completing full listen) → Available for review after FSRS-determined interval
3. **Review card types introduced progressively**:
   - First reviews: **Audio recognition** (hear Arabic → match to translation) — easiest
   - After 2+ successful reviews: **Visual recognition** (see Arabic text → match to translation)
   - After 4+ successful reviews: **Meaning recall** (see translation → identify the Arabic root family)
   - After 6+ successful reviews: **Audio-only recall** (hear a new verse containing the root → identify the meaning without seeing text)

This graduated difficulty mirrors Assimil's passive→active transition and aligns with the evidence that recognition precedes recall in natural acquisition.

### 6.5 The "B2 in 8 Months" Trajectory

Siraj's French learning with Assimil provides a concrete benchmark. Let's map the numbers:

| Metric | Siraj's Assimil French | Our App Target |
|---|---|---|
| Daily time | ~30 min | 15–25 min |
| Duration | 8 months (~240 days) | 4–6 months (~120–180 days) |
| Lessons completed | ~200 (With Ease + Perfectionnement) | ~40 core lessons + continuous review |
| Vocabulary acquired | 2,000–3,000 words | ~300–500 root families × 3–5 forms = 900–2,500 word-forms |
| Goal | General B2 fluency | Qur'anic Arabic recognition (understanding prayers + common verses) |
| Review mechanism | Fixed (active wave) | FSRS (optimized per-learner) |

**Why our timeline can be shorter**: Our scope is narrower (recognition of Qur'anic Arabic, not general conversational fluency), and our learners have a massive advantage — they already hear these phrases 5+ times daily in prayer. The prayers themselves are a built-in "passive wave" that Assimil could only dream of. Our app's job is to make that existing passive exposure *comprehensible*.

**Realistic trajectory for our app**:
- **Month 1** (Lessons 1–8): Prayer phrase basics. Learner understands adhān, key ṣalāh phrases. ~50 word-forms recognized.
- **Month 2** (Lessons 9–16): Expanding root families. Learner recognizes roots across different Qur'anic verses. ~150 word-forms.
- **Month 3** (Lessons 17–24): Deeper Qur'anic vocabulary. Common sūrahs begin to feel meaningful. ~250 word-forms.
- **Month 4–6** (Lessons 25–40+): Advanced recognition. Learner can follow along with recitation of frequently heard passages and grasp the meaning. ~400+ word-forms.

---

## 7. Design Principles for Our App

Based on this research, here are the concrete, actionable principles for app design:

### Principle 1: Audio First, Always
> *Inspired by: All four methods*

Every interaction starts with audio. The reciter's voice is the primary teaching medium, not text. Text supports audio; audio does not support text. The Listen mode should work even if the learner never looks at the screen (e.g., while commuting, doing chores, or — most powerfully — right after prayer).

**Implementation**: Auto-playing audio sequences. Background audio support. Lock-screen controls. Minimal UI that doesn't distract from listening.

### Principle 2: Understand Before Producing
> *Inspired by: Assimil's passive wave*

Never ask the learner to produce or recall information they haven't passively absorbed first. Every phrase must be heard in Listen mode at least once (ideally 2–3 times across sessions) before appearing in Review mode. Recognition tasks precede recall tasks.

**Implementation**: Lesson state machine (New → Listened → Reviewing). FSRS only schedules items that have passed through the Listen phase. Card types unlock progressively.

### Principle 3: One Root Family Per Lesson
> *Inspired by: Michel Thomas's building-block approach*

Each lesson introduces exactly one root family and builds from familiar to new. Start with what the learner already knows (prayer phrases), then expand to new Qur'anic contexts. Never introduce multiple new concepts simultaneously.

**Implementation**: Lesson structure is anchored on a single root. The lesson begins with the most familiar form of that root, then branches out. Related roots from previous lessons appear as natural reinforcement.

### Principle 4: Remove All Anxiety
> *Inspired by: Michel Thomas's "no memorization" rule*

The app should never make the learner feel like they're failing. No red "wrong" indicators. No scores or percentages. No timed pressure. When a learner can't recall something, the app simply reveals the answer, plays the audio, and schedules a re-review — without judgment.

**Implementation**: Self-assessment buttons (Again/Hard/Good/Easy) rather than right/wrong scoring. Progress shown as "phrases learned" (a growing number) rather than "accuracy rate" (a potentially discouraging percentage). Streak counter rewards consistency, not performance.

### Principle 5: 15–25 Minutes, Every Day
> *Inspired by: Assimil and Pimsleur's daily rhythm*

The app should be designed for short daily sessions, not marathon study periods. The daily session structure is: Listen to new material + Review old material. The app should gently discourage sessions longer than 30 minutes (diminishing returns) and strongly encourage daily consistency.

**Implementation**: Daily reminder notifications (ideally linked to prayer times). Session timer visible but non-intrusive. "Great session!" encouragement at 15–20 minutes. After 30 minutes: "You've done great today — come back tomorrow for best results."

### Principle 6: The Dual-Track Daily Session
> *Inspired by: Assimil's new lesson + active review structure*

From Week 2 onward, every session has two parts: (1) Listen to one new lesson, (2) Review previously learned material via FSRS. This dual track ensures constant forward progress while preventing previously learned material from decaying.

**Implementation**: Home screen shows two cards: "Today's New Lesson" and "Reviews Due (N)." The recommended flow is Listen first, then Review — input before output, mimicking Assimil's structure.

### Principle 7: Prayer as the Passive Wave
> *Inspired by: Assimil's passive immersion principle*

Our learners have a unique advantage: they hear Qur'anic Arabic 5 times a day in prayer. This is a ready-made passive wave that no other language course can match. The app should explicitly connect its content to what the learner hears during prayer, turning every ṣalāh into an unconscious review session.

**Implementation**: Lessons organized around prayer phrases first, then expanding to broader Qur'anic vocabulary. "You'll hear this in your next prayer" callouts. Optional "Prayer Companion" mode that shows the meaning of what's being recited during the prayer sequence.

### Principle 8: Root Families Are Our Building Blocks
> *Inspired by: Michel Thomas's decomposition principle*

Arabic's root system is a perfect match for Michel Thomas's building-block method. A single 3-letter root generates dozens of related words. Teaching the root teaches the pattern; the learner can then recognize unfamiliar words by identifying their root. This is more powerful than teaching isolated vocabulary.

**Implementation**: Every phrase in the app is tagged with its root family. The UI can highlight shared root letters across different words. Review cards can test root identification ("What root family does this word belong to?") in addition to meaning recall.

### Principle 9: Multiple Reciters for Robustness
> *Inspired by: Assimil's authentic native-speaker recordings; Pimsleur's varied voice exposure*

Hearing the same phrase from multiple reciters builds robust recognition that transfers to real-world listening (Friday sermons, Qur'an recitation events, different imams). This prevents the learner from memorizing one voice's specific pronunciation rather than truly learning the phrase.

**Implementation**: Each phrase in the lesson uses a different reciter (already implemented in the web course). Review mode could occasionally present a phrase from a reciter the learner hasn't heard before to test generalization.

### Principle 10: Offline-First, Because Prayer Doesn't Need WiFi
> *Inspired by: Practical reality*

The most natural time to use this app is immediately before or after prayer — and mosques often have poor connectivity. All audio, all text, and the FSRS engine must work completely offline. Sync happens opportunistically in the background.

**Implementation**: SQLite database with all lesson content. Audio files downloaded in advance (lesson packs). FSRS calculations happen locally. Cloud sync is optional and additive, never required.

---

## Sources and References

- Assimil official website: [assimil.com/en](https://www.assimil.com/en/)
- Michel Thomas Method: [michelthomas.com](https://www.michelthomas.com/how-it-works/)
- Pimsleur Method: [pimsleur.com/the-pimsleur-method](https://www.pimsleur.com/the-pimsleur-method/)
- Glossika: [glossika.com](https://www.glossika.com/)
- Wikipedia: Assimil, Michel Thomas, Pimsleur Language Programs
- Krashen, S. (1982). *Principles and Practice in Second Language Acquisition* — comprehensible input hypothesis
- Pimsleur, P. (1967). "A Memory Schedule" — graduated interval recall research
- Ye, W. (2024). FSRS algorithm documentation — open-source spaced repetition
