# Glossika Research: Sentence-Based Audio Immersion with Spaced Repetition

> **Purpose**: Deep analysis of Glossika (ai.glossika.com) to inform design decisions for the *Learn Qur'an Without Grammar* companion app.
>
> **Last Updated**: August 2025

---

## Table of Contents

1. [Glossika's Core Method](#1-glossikas-core-method)
2. [Practice Modes](#2-practice-modes)
3. [SRS / Scheduling](#3-srs--scheduling)
4. [Multi-Language Architecture](#4-multi-language-architecture)
5. [Audio Quality](#5-audio-quality)
6. [Progress Tracking](#6-progress-tracking)
7. [Offline Mode](#7-offline-mode)
8. [Pricing Model](#8-pricing-model)
9. [Strengths and Weaknesses](#9-strengths-and-weaknesses)
10. [Mapping to Our Qur'anic Arabic Use Case](#10-mapping-to-our-quranic-arabic-use-case)
11. [Recommendations for Our App](#11-recommendations-for-our-app)

---

## 1. Glossika's Core Method

### The Mass Sentence Approach

Glossika's fundamental philosophy is **"mass sentence training"** — rather than teaching vocabulary lists or grammar rules in isolation, learners are immersed in thousands of complete sentences spoken by native speakers. The method is rooted in three learning science principles:

- **Stephen Krashen's Input Hypothesis (i+1)**: Content is pitched slightly above the learner's current level. Early stages use short 1–3 word sentences; complexity grows as the learner advances.
- **Robert Bjork's Desirable Difficulties**: Material is challenging enough to require effort but not so hard as to cause frustration.
- **Spaced Repetition**: Items are reviewed at algorithmically-determined intervals to combat the forgetting curve.

### How a Session Works

1. The learner sees a sentence in their **base language** (e.g., English) on screen.
2. Audio plays the base language sentence, followed by the **target language** sentence spoken by a native speaker.
3. The learner **repeats/shadows** the target language sentence aloud.
4. Each "Learn New" session introduces **5 new sentences**, each repeated **5 times** = 25 reps per session.
5. Over subsequent days, those sentences enter the review cycle at spaced intervals.

The core insight is that grammar is never explicitly taught — it's absorbed through repeated exposure to sentence patterns. As Glossika's help center states: *"If you can be consistent for about a year, Glossika will handle the rest."*

### Session Duration

A typical session takes **8–10 minutes**. Glossika recommends multiple short sessions throughout the day rather than one long session, citing Ebbinghaus's research on distributed practice being superior for memory.

**Mapping to our app**: This maps almost perfectly. Our Qur'anic phrases are already complete sentences. Instead of "mass sentences from daily life", we have Qur'anic phrases grouped by root-word families. The i+1 progression maps to our lesson sequence (Lesson 1 simple adhān phrases → later lessons with longer āyāt). Key difference: our sentences are sacred text, not generated conversational content.

---

## 2. Practice Modes

Glossika offers **two primary training modes**, switchable via a toggle during any session:

### Full Practice Mode (Recommended)

The most intensive mode, involving multiple exercise types within a single session:

| Exercise Type | What Happens |
|---|---|
| **Listening** | Hear base language → hear target language, see both on screen |
| **Typing/Dictation** | Hear the target language; type out the sentence (spelling reinforcement) |
| **Recall** | See only the base language sentence; try to produce the target language from memory |
| **Recording** | Prompted to record yourself speaking the sentence; recording saved for self-review |
| **Translation** | See base language; choose or type the target language equivalent |

As reps increase for a given sentence, the scaffolding reduces — early reps show both languages; later reps hide the target language text, forcing pure listening comprehension and recall.

### Listening-Only Mode

- Audio plays automatically, hands-free — no screen interaction required.
- Plays base language audio → target language audio in sequence.
- Can optionally enable recording (speak along).
- Ideal for commuting, walking, doing chores.
- **Important caveat from Glossika**: Memory strength of items learned/reviewed in listening-only mode **decays more quickly** than those in full-practice mode. The SRS accounts for this by scheduling more frequent reviews.

### Review Sub-Modes

When doing reviews (as opposed to learning new items), Glossika offers three review queues:

| Review Type | Description |
|---|---|
| **Priority Review** | SRS-selected items, starting with newest learned items to keep them fresh |
| **Weakest Memories** | Items you haven't reviewed in a while; at highest risk of being forgotten |
| **Collection Review** | Random sampling across all learned items |

**Mapping to our app**: We should adopt a similar two-mode structure. Our **Full Practice** mode would be: hear Arabic audio → see Arabic text + translation → tap to reveal root-word highlight → optional recording. Our **Listening-Only** mode is critical for prayer practice — users walking/driving can shadow Qur'anic phrases. We should also implement the "listening-only decays faster" rule in our FSRS parameters, scheduling more frequent reviews for listen-only items.

---

## 3. SRS / Scheduling

### Algorithm Overview

Glossika uses a **custom-built SRS algorithm** (not SM-2, not Anki's algorithm). Based on their documentation, the system:

1. **Observes performance** during training (correct/incorrect responses, time taken).
2. **Tracks per-item data**: when first learned, when last reviewed, how often correct/incorrect, and "many other factors."
3. **Predicts memory strength** for each learned item and assigns a decay curve.
4. **Schedules reviews** at the optimal time — the point where the learner is about to forget but hasn't yet.
5. **Updates memory strength daily**, presenting a fresh list of items due for review.

### Key Scheduling Behaviours

- Reviews become available **~9 hours** after first learning a sentence — not immediately.
- Two SRS-driven review modes ("Priority Review" and "Weakest Memories") only appear when the algorithm determines items are due.
- Items trained in **full-practice mode** retain memory strength longer than those trained in **listening-only mode**.
- The algorithm does not use a simple "Easy/Good/Hard" self-rating button like Anki. Instead, it infers difficulty from observable behaviour (did you get the typing right? How fast did you respond?).

### New Items Drip Rate

- Users set their own **daily goals** for both "Learn New Items" and "Review" independently.
- Default appears to be ~25 new reps/day (5 sentences × 5 reps each) and ~50 review reps/day.
- The system strongly encourages doing **reviews before new items** each day. Glossika is emphatic: *"Glossika will not work if you are not doing your reviews."*
- Reviews accumulate and can become overwhelming if the user learns too many new items without reviewing — a common user complaint.

### Difficulty Adaptation

- The placement test at signup assesses current level and assigns a starting CEFR tier.
- Each CEFR level is split into "Low" and "High" (e.g., A1-Low, A1-High, B1-Low, B1-High).
- Sentence complexity increases gradually: shorter sentences early, longer and more complex sentences later.
- Users can retake the placement test to adjust their level.
- *(Note: A "Topics" feature that let users filter by subject area was temporarily disabled in September 2023.)*

**Mapping to our app**: We are using **FSRS** (Free Spaced Repetition Scheduler), which is more modern and research-backed than SM-2 and likely more sophisticated than Glossika's custom algorithm. Key design decisions:
- **Adopt the 9-hour initial delay** concept — don't show reviews of a phrase until the next session (natural gap).
- **Adopt the "reviews first" UX pattern** — when the user opens the app, show the review queue prominently before "Learn New."
- **Adopt different decay rates** for listen-only vs. full-practice (FSRS supports custom parameters per card type).
- **Skip self-rating buttons** like Anki's — instead, infer difficulty from whether the user needed to reveal the answer, how long they paused, etc. This is more user-friendly for a non-technical audience.

---

## 4. Multi-Language Architecture

### Scale

Glossika supports **65 languages** as of 2025, with content ranging from ~3,000 sentences (smaller languages like Finnish) to ~7,000+ sentences (major languages like French, Spanish, Japanese). For example:
- French: ~6,700 sentences, ~5,000 words
- Finnish: ~3,800 sentences
- Arabic (Standard): Available, specific count not published but estimated ~4,000–5,000

### Language Pair Model

- Content is organized as **sentence pairs**: base language sentence + target language sentence + audio for both.
- Users can choose **any base language** — you can learn Japanese from Mandarin, or Spanish from Portuguese. The sentence bank is the same; only the base language translation and audio change.
- All languages share the same underlying **sentence corpus** translated/adapted per language, ensuring consistent difficulty progression.

### Content Structure

- Sentences are tagged by **CEFR level** (A1 through C1, each split Low/High = 10 levels).
- Sentences were historically tagged by **topic** (travel, business, daily life, etc.), though this feature is currently disabled.
- Each sentence has: text in base language, text in target language, audio in base language, audio in target language.
- The Glossika team has a dedicated content team continually adding sentences.

### Viva Platform

Glossika also runs **Viva** (viva.glossika.com), a separate crowdsourced platform for documenting minority/endangered languages. This feeds content into the main Glossika app.

**Mapping to our app**: Our architecture is far simpler but can borrow the **sentence pair** model:
- Base language = English/Tamil/Urdu (user chooses)
- Target language = Qur'anic Arabic (always)
- Each phrase has: Arabic text, Arabic audio (multiple reciters), translation text (EN/TA/UR), translation audio (TTS)
- In our SQLite schema, a `phrases` table with `arabic_text`, `audio_file`, and a related `translations` table with `language`, `text`, `tts_audio_file`.

---

## 5. Audio Quality

### Human Recordings, Not TTS

Glossika uses **professional native speaker recordings** for all target language audio. Multiple reviewers confirm:
- *"No robotic voices!"* (Lindie Botes, polyglot reviewer)
- *"High-quality native speaker audio"* (FluentU review)
- *"Pretty comparable to Pimsleur"* (Lingopie review)

Each sentence is recorded individually by native speakers, capturing natural rhythm, intonation, and pronunciation. For the base language (e.g., English), audio is also recorded by native speakers.

### Pronunciation Training

- **Recording feature**: Users can record themselves speaking each sentence. Recordings are saved and reviewable later on the "Memory" page.
- **Pronunciation Feedback (iOS, beta as of Jan 2024)**: Uses speech recognition to give automated feedback on pronunciation. Still in beta; not yet available on Android or web.
- **No real-time correction**: Glossika explicitly states they don't play back your recording during the session to avoid breaking flow. Self-review is done separately.
- Glossika recommends "mumbling along" even when you can't fully produce the sentence — the physical act of trying helps.

**Mapping to our app**: We have a significant advantage here — we use **real Qur'anic recitation from world-class reciters** (Abdul Basit, Yasser Ad-Dussary, etc.) with word-level timestamps. This is far superior to any TTS. For translation audio, we use **TTS** (acceptable for English/Tamil/Urdu glosses). We should:
- **Adopt the recording feature** in a future version — let users record themselves reciting and compare with the reciter.
- **Skip pronunciation feedback initially** — it's technically complex and in beta even at Glossika's scale.
- **Adopt the "mumble along" philosophy** — in our onboarding, encourage users to mouth/whisper the Arabic even before they can read it.

---

## 6. Progress Tracking

Glossika tracks and displays several metrics:

### Rep Counter

The **rep** (repetition) is Glossika's core progress unit. One rep = one practice of one sentence. Glossika provides milestone benchmarks:

| Milestone | Expected Outcome |
|---|---|
| **25,000 reps** | Sentences roll off your tongue smoothly; the language no longer feels foreign |
| **50,000 reps** | Everyday conversations are no longer scary |
| **75,000 reps** | Building technical vocabulary for specific scenarios |
| **100,000 reps** | Mastery: say whatever you want without thinking |

*(For a ~7,000 sentence course, 50,000 reps ≈ 7 reps of each sentence on average.)*

### Dashboard Metrics

- **Achievements**: Medals for daily goal streaks (learn goal met, review goal met).
- **Hours Studied**: Total time logged.
- **Sentences Learned**: Count of unique sentences encountered.
- **Reps Completed**: Cumulative total.
- **Weekly Progress Report**: Graph showing daily learn/review reps.
- **CEFR Level Progress**: Bar graphs showing percentage completion of each CEFR sub-level (A1-Low, A1-High, etc.).
- **Memory Strength Visualization**: Items appear in the "Memory" page with color-coded strength indicators.
- **Streak Counter**: Daily consistency tracking.

**Mapping to our app**: Adopt a **simplified version**:
- **Total reps** — great universal metric. We can set Qur'anic-relevant milestones (e.g., "500 reps: You now recognize key phrases in adhān and ṣalāh").
- **Phrases mastered** — count of phrases at FSRS "mature" interval.
- **Daily streak** — critical for habit formation.
- **Lesson progress** — percentage through the lesson sequence (simpler than CEFR bars).
- **Skip CEFR levels** — not relevant for Qur'anic Arabic recognition.
- Store all metrics in SQLite: `daily_stats` table with `date`, `new_reps`, `review_reps`, `minutes_studied`.

---

## 7. Offline Mode

### Availability

- **Premium feature only** (requires paid subscription).
- Available on **iOS and Android apps** (not web).
- Launched November 2022 (iOS), June 2023 (Android).

### How It Works

- Users manually download sessions via a "Downloads" tab in the app.
- **New items**: Up to **10 sessions** (= 50 sentences = 250 reps) can be downloaded at once per language.
- **Review items**: 100 sentence pairs (Basic plan) or 500 sentence pairs (Pro plan) can be downloaded.
- Downloads include both base and target language text + audio.
- **Automatic sync**: When reconnecting to internet, offline progress syncs to the server.
- Cross-device sync: Downloaded content syncs across up to 3 devices.
- **Limitation**: Must sync before day ends to get credit for daily goal medals.

### Full Practice & Listening-Only Both Work Offline

Users can switch between modes while offline, just like online.

**Mapping to our app**: This is where our architecture has a **major advantage**. Since we use **SQLite locally with FSRS running on-device**, our app is **offline-first by design**. All content (Arabic text, audio files, translations) is bundled or downloaded once. No session-by-session download needed. The entire course works offline with no limitations. This is a significant UX win over Glossika.

---

## 8. Pricing Model

### Current Pricing (2025)

| Plan | Price | Features |
|---|---|---|
| **Free Account** | $0 | Access to 9 minority languages (Welsh, Catalan, Manx, Hakka, Kurdish Sorani, etc.). All features included. |
| **Basic Plan** | ~$16.99/month | 1 language, all training modes, offline (100 review pairs), all CEFR levels |
| **Pro Plan** | ~$30.99/month | Unlimited languages, offline (500 review pairs per language), priority support |
| **Student Plan** | $17.99/month | Unlimited languages (requires .edu email verification) |
| **Annual Plans** | Discounted | Significant discount on monthly rate (exact varies; ~30-50% off during sales) |

### Free Tier Details

- 9 minority/endangered languages are **permanently free** with a free account — Glossika's commitment to language preservation.
- No free trial for premium languages as of 2025 (previously offered 7-day free trials).
- Some older sources mention a 1,000-rep free trial, but this appears to have been retired.

### What's Locked Behind the Paywall

- All major languages (Arabic, Chinese, Spanish, French, etc.)
- Offline mode
- Full content library (all CEFR levels)
- Priority and Weakest Memories review modes

**Mapping to our app**: Our app should be **completely free** — this is religious education content, and our audience (Muslims learning Qur'anic Arabic) expects educational Islamic content to be freely available. Glossika's paywall model is not appropriate for our use case. If we ever need to monetize, a donation/sadaqah model is more culturally appropriate than a subscription.

---

## 9. Strengths and Weaknesses

### What Users Love

Based on reviews from FluentU, Lingopie, Reddit, app stores, and polyglot blogs:

| Strength | Details |
|---|---|
| **Natural grammar acquisition** | Grammar absorbed through patterns, not rules — praised unanimously |
| **High-quality native audio** | Consistently cited as superior to competitors |
| **Massive language selection** | 65 languages; attracts polyglots. Minority language support is unique |
| **Simple, focused UX** | No gamification bloat. "Just log in and do your reps." |
| **Effective for intermediate+ learners** | Shines when learner already has basic vocabulary |
| **Hands-free listening mode** | Great for passive immersion during commutes/chores |
| **CEFR-aligned progression** | Content reaches B2–C1 for major languages — far beyond most apps |
| **Consistent metric system (reps)** | Users feel tangible progress counting reps |

### What Users Dislike

| Weakness | Details |
|---|---|
| **Repetitive/monotonous** | The #1 complaint. Same exercise loop, session after session. "Can feel like a grind." |
| **Not beginner-friendly** | Sentences start hard; no alphabet/phonics teaching. Assumes basic familiarity. |
| **Review overload** | If you learn too many new items, reviews pile up and become overwhelming |
| **Non-Latin scripts are painful in Full Practice** | Typing Arabic, Chinese, Japanese in dictation mode frustrates users |
| **No word-level explanations** | If you don't understand a word, there's no dictionary/breakdown. You're on your own. |
| **Recording feature lacks feedback** | Records your voice but doesn't tell you what's wrong |
| **Expensive for single language** | $17–31/month is steep compared to Duolingo, especially if only learning one language |
| **Google Play rating: 2.4/5** | Android app has significant technical issues and negative reviews |
| **No cultural context** | Sentences are decontextualized — no stories, no cultural notes, no images |
| **Sentences can feel random** | Users sometimes question *why* they're learning a particular sentence |

### App Store Ratings

- **iOS**: 3.6/5 (97 ratings) — decent
- **Android**: 2.4/5 (278 reviews) — poor, with complaints about bugs and crashes
- **Trustpilot**: 2.9/5 — mixed, with customer service complaints

---

## 10. Mapping to Our Qur'anic Arabic Use Case

### Feature-by-Feature Comparison

| Glossika Feature | Maps to Our App? | Adopt / Adapt / Skip | Notes |
|---|---|---|---|
| Mass sentence training | ✅ Strong fit | **Adapt** | Our "sentences" are Qur'anic phrases, not conversational. Grouped by root-word family, not random. |
| Base→Target audio pairing | ✅ Strong fit | **Adopt** | English/Tamil/Urdu TTS → Arabic reciter audio |
| Full Practice mode | ⚠️ Partial fit | **Adapt** | Typing Arabic is painful (Glossika users confirm). Replace typing with tap-to-reveal, word-highlighting, and multiple-choice recognition tasks. |
| Listening-Only mode | ✅ Strong fit | **Adopt** | Critical for prayer practice. Users can shadow reciters during commute. |
| SRS scheduling | ✅ Strong fit | **Adopt** | We use FSRS which is superior. Adopt "reviews first" UX and implicit difficulty sensing. |
| 9-hour initial delay | ✅ Useful | **Adopt** | Don't review new phrases until next session/day. |
| Daily goal setting | ✅ Useful | **Adopt** | Let users set daily new + review targets. Default to modest goals (15 new reps, 30 review reps). |
| Placement test | ❌ Not needed | **Skip** | Our course is sequential (Lesson 1 → Lesson N). Everyone starts at the beginning. |
| CEFR levels | ❌ Not relevant | **Skip** | Replace with lesson/unit progress. |
| Rep counter + milestones | ✅ Strong fit | **Adapt** | Use Qur'anic milestones: "100 reps: adhān phrases mastered", "500 reps: ṣalāh phrases recognized". |
| Recording feature | ⚠️ Future version | **Defer** | Nice-to-have for pronunciation practice, but not MVP. |
| Pronunciation feedback | ❌ Too complex | **Skip** | Even Glossika has this in beta after years of development. |
| Offline mode | ✅ We're better | **Built-in** | Our SQLite/local-first architecture is inherently offline. Major advantage. |
| Multi-language base | ✅ Strong fit | **Adopt** | English/Tamil/Urdu as base languages, selectable in settings. |
| Topic filtering | ⚠️ Partial fit | **Adapt** | Instead of topics, we filter by root-word family and prayer context (adhān, ṣalāh, du'ā). |
| Word-level explanations | ❌ Glossika lacks this | **Add (advantage)** | This is our differentiator. We highlight root words within phrases, showing meaning connections. |
| Cultural/contextual notes | ❌ Glossika lacks this | **Add (advantage)** | We provide context: "This phrase appears in sūrat al-Fātiḥah, which you recite 17 times daily." |

---

## 11. Recommendations for Our App

### Architecture Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| **SRS Engine** | FSRS (already chosen) | More modern than Glossika's custom algorithm. Run entirely on-device in SQLite. |
| **Offline Strategy** | Local-first, all content bundled | Superior to Glossika's "download 10 sessions" limitation. All audio + text in the app bundle or initial download. |
| **Data Model** | `phrases` → `translations` → `review_cards` | Mirror Glossika's sentence-pair model. Each phrase has Arabic text + audio, linked to multiple translations. Review cards track FSRS state per phrase per user. |
| **Audio Storage** | Bundle critical audio; lazy-load extras | Reciter audio files (~100KB each) for all lesson phrases. TTS translation audio generated at build time. |

### UX Design Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| **Primary Flow** | "Review → Learn New" order | Copy Glossika's insistence on reviews first. Show review count badge prominently. |
| **Session Size** | 5 new phrases per session, 3–5 reps each | Matches Glossika's proven session size. ~8 minutes per session. |
| **Two Modes** | Full Practice + Listening Only | Adopt Glossika's toggle. Full Practice for focused study; Listening Only for passive immersion. |
| **Full Practice Exercises** | Listen → Reveal → Highlight roots → (Optional) Record | Do NOT use typing/dictation for Arabic — Glossika users hate this for non-Latin scripts. Use tap-to-reveal and root-word highlighting instead. |
| **Review Queue** | Single smart queue (FSRS-ordered) | Simplify Glossika's 3 review modes into one FSRS-prioritised queue. Power users could get a "Weakest" filter later. |
| **Difficulty Inference** | Track: reveal-needed, time-to-respond, skip/replay | Avoid Anki-style "Easy/Good/Hard" buttons. Infer like Glossika does — from behaviour, not self-report. |
| **Daily Goals** | Configurable, default low | Default: 15 new reps + 30 review reps. Users can adjust. Show progress bar on home screen. |
| **Streak & Motivation** | Daily streak counter + rep milestones | Adopt Glossika's rep milestone concept with Qur'anic framing. No gamification (no XP, no leaderboards). |

### Content Design Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| **Phrase Selection** | Qur'anic phrases grouped by root-word family | Unlike Glossika's "random" feeling sentences, our phrases are thematically connected through root words. This addresses a major Glossika criticism. |
| **Contextual Meaning** | Show root highlighting + prayer context | Our key differentiator. Glossika gives no word-level breakdowns; we highlight which root appears in each phrase. |
| **Progression** | Linear lesson sequence, not CEFR levels | Lessons 1–N, each introducing 2 root families. Unlike Glossika's placement-test-based entry, everyone starts at Lesson 1. |
| **Translation Languages** | English (default), Tamil, Urdu | Store in `translations` table, language-keyed. User selects base language in settings. |
| **No Grammar Labels** | ✅ Already our approach | Glossika proves this works. Grammar through patterns, not terminology. We're even more radical — no "singular/plural" etc. |

### Implementation Notes for Expo/SQLite

```
-- Core schema inspired by Glossika's sentence-pair model
CREATE TABLE phrases (
  id INTEGER PRIMARY KEY,
  lesson_id INTEGER NOT NULL,
  root_family_id INTEGER NOT NULL,
  arabic_text TEXT NOT NULL,
  arabic_audio_file TEXT NOT NULL,  -- path to reciter audio
  surah_ayah TEXT,                   -- e.g., "1:2" for context
  display_order INTEGER NOT NULL
);

CREATE TABLE translations (
  id INTEGER PRIMARY KEY,
  phrase_id INTEGER NOT NULL REFERENCES phrases(id),
  language TEXT NOT NULL,             -- 'en', 'ta', 'ur'
  text TEXT NOT NULL,
  tts_audio_file TEXT,               -- path to TTS audio
  UNIQUE(phrase_id, language)
);

CREATE TABLE review_cards (
  id INTEGER PRIMARY KEY,
  phrase_id INTEGER NOT NULL REFERENCES phrases(id),
  -- FSRS fields
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0,
  due_date TEXT NOT NULL,
  last_review TEXT,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state INTEGER DEFAULT 0,          -- 0=new, 1=learning, 2=review, 3=relearning
  -- Mode tracking (Glossika insight: listen-only decays faster)
  last_mode TEXT DEFAULT 'full',     -- 'full' or 'listen'
  created_at TEXT NOT NULL
);

CREATE TABLE daily_stats (
  date TEXT PRIMARY KEY,
  new_reps INTEGER DEFAULT 0,
  review_reps INTEGER DEFAULT 0,
  minutes_studied REAL DEFAULT 0,
  streak_maintained BOOLEAN DEFAULT 0
);
```

### What We Add That Glossika Lacks

These are features our app should have that address Glossika's known weaknesses:

1. **Root-word highlighting**: When a phrase appears, the root-derived word is visually highlighted. Tap it to see the root and other phrases sharing that root. Glossika has no word-level interaction.

2. **Prayer context tags**: Each phrase is tagged with where it appears (adhān, ṣalāh, Fātiḥah, common du'ā). Users know *why* they're learning this phrase. Glossika sentences feel random.

3. **Lesson narrative flow**: Phrases are grouped into coherent lessons with a learning arc. Glossika's mass-sentence approach lacks narrative.

4. **Multi-reciter audio**: We use multiple world-class reciters per phrase with word-level timestamps. Glossika has one native speaker per sentence.

5. **Complete offline operation**: No download limits, no premium requirement. Everything works offline, always.

6. **Free forever**: No subscription. Islamic education should be accessible to all.

---

*This research was conducted by analysing Glossika's help centre documentation, official blog posts, multiple third-party reviews (FluentU, Lingopie, Lindie Botes, Rhapsody in Lingo, ArabiKey, Language Tsar, and others), app store ratings, and community discussions.*
