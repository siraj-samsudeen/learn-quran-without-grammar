# Learn Qur'an Without Grammar — Product Requirements

_Last updated: 2026-04-17 · Authoritative vision doc. Synthesizes the 2026-04-16 brainstorms (teacher workflow + Day-1 student workflow) into a single product spec._

> **Read this first** when scoping any feature, planning any slice, or trying to understand how the pieces fit. This PRD is the output; the brainstorm docs + ADRs + DATA-MODEL are the inputs (§11 References).

---

## 1 · Overview & Vision

**Learn Qur'an Without Grammar (LQWG)** is a self-study course that teaches Qurʾānic Arabic recognition through root-word families, audio immersion, and phrases the student already hears daily (adhān, ṣalāh, adhkār). No grammar terminology, no memorisation pressure, no shame. A 10-year-old who has memorized Juzʾ 30 without understanding it should finish Module 1 able to recognize the roots behind every Adhān phrase.

**Why a v2 platform.** The Era-1 Jekyll + per-root-JSON pipeline shipped Lessons 1-2 but friction compounds on every new lesson: terminal-and-git authoring, static publishing delays, no student feedback loop, no personalization, no spaced repetition. The 2026-04-16 brainstorms (morning + evening) produced two load-bearing shifts:

1. **Pedagogy-first.** Curriculum is a 3-level hierarchy (Course → Module → Lesson), the teacher's workflow starts from a *phrase* not a *root*, and "known" is two independent axes (**memorized vs understood**).
2. **Workflow-first data model.** The schema derives from *verbs the user does*, not nouns in the domain. 24 existing entities (DATA-MODEL.md) + 6 new (`modules`, `formLessonDecision`, `rootRelations`, `milestone`, `studentRecitation`, `studySession`) — every one traceable to a specific action.

**Platform outcome.** One real-time web app where the teacher authors and the student learns against the same InstantDB cloud — instant teacher↔student feedback, FSRS-driven SRS, role-aware views (owner / TA / tester / student). Expo native pinned for Track 2 when the web pedagogy is proven (ADR-011).

**Distinctive:** most language-learning products optimize for new content consumption. LQWG optimizes for *giving meaning to words the student already has on their tongue*.

---

## 2 · Users & Personas

Two distinct axes: **course membership roles** (owner / TA / tester / student — all defined per-course via `courseMembers`, so one email can be owner of course A and student of course B) and **real-world personas** (the actual humans we're designing the UI for). The schema handles the roles; the UI is shaped by the personas.

### Real-world personas

| Persona | Profile | What they need the app to do |
|---|---|---|
| **Siraj — the teacher-author** | Course creator; sometimes authors from phone; has strong pedagogical opinions; no patience for terminal-and-git round trips | Form-first picker · live preview · TTS preview on every field · publish without build/deploy cycles · mobile-usable dashboard |
| **Hanzala — the target student** | Age 10; memorized Juzʾ 30 + Al-Fātiḥa; wants meaning behind words he already recites; short attention span; closes the app mid-card often | No upfront quiz · single glowing "Start here" button · 3-button grading with icons (language-independent) · close-equals-pause · milestone toasts that feel earned |
| **The adult beginner** | Knows ṣalāh by rote without understanding; wants cognitive hooks for daily liturgy; self-studying | Same product, different pacing · PACE panel frames ETAs in days-at-your-pace · memorization-claim surfaces even if memorized as adult |
| **The explorer** | Authenticated, not enrolled in any course; browsing the Qurʾān freely, clicking words to see roots | Explorer as base product — corpus navigation without a course overlay; enrolling layers on glosses + SRS later |

### Course-membership roles (per-course via `courseMembers`)

| Role | Reads | Writes | Can publish? |
|---|---|---|---|
| **Owner** | Everything in the course | Everything | ✅ |
| **Assistant (TA)** | Everything | Curriculum / scores / selections / annotations | ❌ |
| **Tester** | Lessons where `phaseReview ≥ "ready"` | Own SRS state + flag issues (tagged tester) | ❌ |
| **Student** | Lessons where `phasePublished = "done"` | Own SRS state + own memorization claims + flag issues | ❌ |

### Out of v1 persona scope

Multi-teacher course co-authoring (schema supports it, UX deferred) · parent dashboards (real future persona, not Slice 1-3) · teacher-of-teachers licensing (post-v1).

---

## 3 · Product Principles

Six load-bearing principles. Every feature in §5 must trace back to one or more.

### 3.1 Explorer is the base product
Any authenticated user can navigate the Qurʾān — ayah → word → root → family tree — **without joining any course**. Courses are opinionated overlays that layer glosses, SRS, milestones, and curated lessons on top of the same corpus. Schema cleanly separates a *corpus layer* (shared, explorer-usable) from a *course-overlay layer* (enrolled-only). A child who wants to look up one word doesn't have to enroll first.

### 3.2 Memorized ≠ understood
Two independent axes of "known," never conflated. A student who recites Al-Fātiḥa perfectly with zero knowledge of what *ar-raḥmān* means is **fully memorized, zero understood** — and the schema must represent that honestly. Meaning is tracked per-form via FSRS cards (`studentCards`). Memorization is tracked per-surah/page/verse-range via `studentRecitation` (the "My Memorization" screen). Coverage claims carry both numbers.

### 3.3 Workflow-first data model
Entities derive from *verbs the user does*, not nouns in the domain. No entity exists unless a real workflow reads or writes it. This principle produced the structural shifts in the 2026-04-16 brainstorms: collapsing three Tier-2 scores into a single `hookScore` (the UI never shows the three separately), adding `formLessonDecision` (because "skip a form with reason" is a real teacher verb), adding `studySession.startedAt/endedAt` (because the time-of-day histogram needs a session boundary).

### 3.4 Pedagogy-first, not grammar-first
No "singular / plural / feminine / Form X / verbal noun / prefix" in any student-facing surface. Ever. Plain English about meaning. Grammar machinery (Kais Dukes morphology, lemma features, verb forms) stays under the hood as query substrate — it never leaks into lesson text, card labels, or remarks. **Source-text chunks** (Adhān phrase, ḥadīth, duʿāʾ, book passage) are the anchor primitive, not "phrase" specifically, so other teachers can adopt the same platform for non-Qurʾān source material.

### 3.5 No-shame tone
Grading buttons say **Bad / OK / Good** (honest self-assessment), not Anki's "Again / Hard / Good" (app-action framing). The reward for finishing a lesson is *the ability to continue*, not confetti, XP, or a leaderboard. Closing the app mid-card is pausing, never failure. Milestone toasts are reverent (*"🕌 Sūrat al-Ikhlāṣ is now fully decodable"*), not gamified. This is load-bearing for a product teaching sacred text.

### 3.6 Usable increments
Per `CLAUDE.md`: every slice ships an **end-to-end workflow the user can actually use**, not "all of layer X before any of layer Y." Lesson-1 greenfield (Slice 1) ships a complete teacher authoring loop. Student Lesson-1 consumption (Slice 2) ships a complete learner loop on top. Horizontal layer-by-layer builds are the anti-pattern.

---

## 4 · Pedagogical Hierarchy

Three levels. Pass is lesson metadata, not a separate hierarchy level.

```
Course      ← "Learn Qur'an Without Grammar" (courses.courseId = "lqwg-v1")
  │
  └─ Module     ← Adhān (Module 1) · Ṣalāh (Module 2) · Adhkār (Module 3) · …
       │          grants milestones; "% of Qurʾān covered" claims live at this layer
       │
       └─ Lesson   ← the student's sit-down unit
            - lesson.passType = root | synonym | antonym | story | custom
            - 1 source-text anchor
            - 1-3 roots · 5-7 forms · 10-12 phrases
```

**LQWG instantiation (Module 1 = Adhān).** The 7 Adhān phrases × 3 passes = 21 lessons, plus connective story-pass lessons between passes. Root-pass = current Lessons 1-7 (one root family per phrase). Synonym-pass = same 7 phrases, teaching synonyms of the English meanings covered. Antonym-pass = same 7 phrases, teaching antonyms. Story lessons weave covered roots into narrative.

**Why pass is metadata, not hierarchy.** Pass is a *way the teacher organizes lessons inside a module* — adoptable by other teachers as a named pattern. Making it its own table would over-constrain teachers who don't think in passes. One enum on `lessons`, not a new parent row.

**Other courses map cleanly.** Qaṣaṣ al-Nabiyyīn = course, chapters = modules, passages = lessons (passType often just `custom`). Grammar book = course, topics = modules, example sentences = lessons (passType = `examples` / `rules` / `exercises` as custom values). ʿAqīdah = creed text = course, sections = modules, creedal sentences = lessons.

**Anchor vs teaching examples.** Two primitives the schema keeps distinct:
- **Anchor text** (one per lesson) — what the lesson is about. For LQWG this is the Adhān phrase; for Qaṣaṣ it's the passage being read; for grammar it's the sentence under study.
- **Teaching examples** — the phrases/verses used to drill the root(s) or pattern. Many per lesson. For LQWG they're Qurʾānic verses containing the root; for ḥadīth courses they're ḥadīth texts; they can overlap with the anchor.

Schema: `lessons.seedArabic` holds the anchor text, `selections` hold teaching examples (with `selection.role = anchor` marking the one that IS the anchor when it's Qurʾānic).

**For Slice 1.** Module is *implicit* — one module ("Adhān"), one lesson number, no `modules` table needed yet. Promote to explicit entity in Slice 3+ when the curriculum crosses module boundaries and needs milestone tracking at module granularity.

---

## 5 · Features

Five bands: **Foundation** (one-time data layer) → **Teacher workflow** (F1-F4 with F0 prep pipeline ahead) → **Student workflow** (F5-F10) → **Shared surfaces** (F11-F12) → **Cross-cutting infra** (F13).

Each feature marks whether it's in scope for Slice 1 (the greenfield Lesson-1 test), Vision (in the PRD but deferred to a later slice), or Parked (F14, out of v1 entirely).

### 5.0 · Foundation (ADR-010 Phase 1)

Prerequisite for every feature. Built once. See ADR-010 + DATA-MODEL for the full schema.

| ID | Feature | Slice 1? |
|---|---|---|
| **P1** | Build `tools/data/quran.db` Layer 1 — 6 tables (surahs, verses, roots, lemmas, verseWords, verseRoots) from the 3 vendored text files (ADR-009: `quran-morphology.txt` / `quran-uthmani.txt` / `quran-trans-en-sahih.txt`) | ✅ schema created; data narrowed by reachability to ~1,500-2,500 rows reachable from `ilāh` + `kabura` |
| **P2** | `migrate-json-to-sqlite.py` — import existing teacher data from the 10 root JSONs into SQLite Layer 2 | ❌ **Not needed for Slice 1** (greenfield re-authoring; JSONs stay as historical reference). Optionally useful for Slice 3+ to seed Lessons 3-7's existing scores |
| **P3** | Seed InstantDB from SQLite — push Layer 1 + Layer 2 into the cloud via `seed-instantdb-from-sqlite.py` | ✅ seed the narrowed Layer 1; Layer 2 starts empty (no migration), fills as teacher authors |
| **P4** | Sync harness — `sync-from-cloud.py` / `sync-to-cloud.py` so offline Python tools stay current with teacher writes | ✅ minimal version (single-course, single-lesson) |

**Slice 1 data shape.** Layer 1 is narrowed to rows reachable from ilāh + kabura: ~29 verses (ilāh 17 + kabura 12, some overlap), their ~1,000 verseWords, their ~20 surahs, ~200 roots that any of those words touch, ~400 lemmas. Full schema, narrow data — iterates in seconds rather than the minutes a full 186K-row seed would take. ADR-009 confirms ilāh has 2,851 morphology-row occurrences total (161 for kabura), so the "JSONs are curated subsets" intuition is real: Layer 1 built from raw files gives the complete picture the JSONs never had.

### 5.F0 · Content preparation

Runs once per root the teacher introduces to a course. Mostly automated; teacher reviews + accepts/overrides.

| ID | Feature | Slice 1? |
|---|---|---|
| **F0.1** | **Add root to course** — one action creates `rootCurriculum` + default `forms` + `formLemmaBindings` by partitioning lemmas from Layer 1 using the 6-tuple `(root, lemma, pos, verb_form, tense, number, gender)` per FORMS-LEMMAS-ROOTS §10.2 | ✅ fires for ilāh + kabura |
| **F0.2** | **Tier 1 auto-scoring** — deterministic: writes `verseRootScores.{lengthScore, formFreq, formDominance, curriculumScore}` from Layer 1 facts + current lesson order, per SCORING.md formulas | ✅ fires for both roots |
| **F0.3** | **Tier 2 LLM scoring** — background job produces `hookScore` (0-10, collapsed from story + familiarity + teaching_fit) + `hookReason` (LLM justification). `hookReason` is **offered** (not auto-applied) as a starting draft when the teacher writes `selection.remark` — teacher accepts / edits / discards. Every draft logs to `llmDrafts` for audit | ✅ fresh run on all ilāh + kabura candidate verses |
| **F0.4** | **LLM translation drafts** — per-phrase Saheeh International paraphrase, editable by teacher; audit via `llmDrafts` | Vision (parked for Slice 1 — teacher translates manually) |
| **F0.5** | **LLM synonym/antonym candidates** — landing in `rootRelations` after teacher accept; drives the synonym pass in Module 1's future lessons | Vision (parked — synonym pass is Lessons 8+) |
| **F0.6** | **Job status UI** — teacher sees per-root `queued / running / done / failed` with retry affordance. Extends `audioJobs` queue pattern to all background work | ✅ minimal version showing the Tier 2 scoring job |
| **F0.7** | **Recompute triggers** — lesson reorder ⇒ Tier 1 `curriculumScore` rerun; new root added ⇒ adjacent-form re-rank | Vision (no reorder in Slice 1) |

### 5.F1 · Verse picker (the teacher's core authoring surface)

Slice 1 builds this in full. Every affordance below is in scope.

| Affordance | Notes |
|---|---|
| **Form-first navigation** | Sidebar lists forms (per root); clicking a form **filters** main area (not scroll). "All forms" clears filter. Main area shows form sections with header (Arabic + translit + gloss + occurrence count + selection status) and verse cards beneath |
| **Lesson budget card** (top of main) | Forms **5-7** · Phrases **10-12** · Words **100-120** · Anchors **1 per root** — all shown as **ranges**, never hard caps. Honest about soft targets |
| **3-state verse selector** | Tri-state segmented control (exactly one active): `not-picked` / `picked` / `pipeline`. Replaces today's two-button design that allowed the incoherent "both picked and pipelined" state |
| **Hidden scores, visible ranking** | `hookScore` drives verse order but is never displayed. Teacher operates on relative order, not absolute numbers. "Is 24.6 good?" is cognitive tax that doesn't serve authoring |
| **`hookReason` display** | LLM's justification is **visible** (unlike the score) as a small grey caption under each verse card. Teacher audit signal — answers "why did LLM rank this high?" |
| **Form-header actions** | `+ teaching phrase` · `+ ḥadīth` · `+ duʿāʾ` — always available on every form, not just empty ones |
| **Skip-form-with-reason** | `✗ skip form` available on every form header (regardless of verse count). Writes `formLessonDecision` with `decision = "skipped"` + `reason`. Skipping is a first-class action, not an edge case |

### 5.F2 · Lesson annotation

| Affordance | Notes |
|---|---|
| **Selection remark** (student-audible) | Per selection. TTS-rendered in SRS playback. `selection.remark` field |
| **Root + form notes** (lesson-level) | Lives in lesson-level tabs above the picker, not inside each verse card. Root note explains the root family; form note explains the specific word-shape |
| **Inline translation edit** | Per phrase, ASCII-safe for TTS (no `ʿ ā ī ū ṣ ḍ ṭ ẓ ḥ`). Starts as Saheeh International draft (ADR-009); teacher paraphrases per LESSON-PLAN "Translation Style" |
| **Synonym/antonym relations** | LLM suggests → teacher accept/reject/add custom → `rootRelations` with `accepted` flag. Semantic (English-meaning neighbors), not morphological. No `note` field — `llmDrafts` captures LLM rationale | *Vision (parked for Slice 1)* |

### 5.F3 · Audio production (dedicated phase)

Three cognitive modes deserve separation: picker = strategic scanning, annotation = deliberate writing, **audio = technical verification** — its own top-level phase with dedicated tools.

| Affordance | Notes |
|---|---|
| **TTS preview on every writable field** | Root note · form note · phrase remark · translation. Button plays current text as TTS so the teacher catches clinical LLM drafts before they ship to student ears. Write → preview → edit-if-dry → write again |
| **Reciter-specific fragment timestamps** | Auto via `tools/auto-timestamps.py` (Quran Foundation API, 7 reciters); fallback via `tools/find-audio-fragment.py` (silence detection, all reciters). Results cached in `audioFragments` keyed on `(verseRef, reciter, startWord, endWord)` — reused across courses and selections |
| **Dedicated audio-phase UI** | Waveforms · translation-boundary matching · per-selection `#t=start,end` editing. Not crammed into the picker |
| **`audioJobs` queue** | `jobType = tts | fragment_timing | lesson_assembly`. Teacher sees `queued / running / done / failed` with progress. Replaces "blind shell script" feel of `rebuild-lesson-audio.sh` |

### 5.F4 · Publish & audit

| Affordance | Notes |
|---|---|
| **Per-lesson publish action** | Walks `lessons.phase*` fields through `scoring → picking → writing → tamil → audio → review → published`. Publish unlocks the lesson for students (where `phasePublished = "done"`) |
| **`formLessonDecision` log** | Per `(course, lesson, form)`: `decision = "taught" | "skipped" | "unassigned"`, `role = "anchor" | "learning" | null`, `reason` (optional), `updatedBy`, `updatedAt`. Full audit history across lessons — "why was kabura Form X skipped in Lesson 1?" |
| **Phase-gate UI** | Visible on every lesson dashboard; clicking a phase jumps to its workspace |

### 5.F5-F10 · Student workflow

From Day-1 spec. Slice 2 implements the Lesson-1 subset of these; the full set ships by Slice 3+.

| ID | Feature | Slice |
|---|---|---|
| **F5** | **Day-1 onboarding** — no upfront quiz · Path (Duolingo-style ladder) / Map (hierarchy view) tab toggle · first-entry roadmap intro; direct resume thereafter | 2 |
| **F6** | **In-lesson cards** — J→K→L arc per root (root-letter → form → phrase), then anchor reveal · `lessonSection.type` enum renders card shape · **Bad / OK / Good** grading (color + icon + text; 3-button; honest self-assessment) · "⭐ I already know this" chip on form cards writes `studentFormFluency.claimType = explicit_meaning` with grade 4 (Easy) | 2 |
| **F7** | **Session close + resume** — close = pause (no button) · mid-reveal state discarded on close · interleaved continue (new + review mixed per FSRS; no "Review" tab) · `cardInstance.source ∈ {new, review}` tags for teacher-view filtering | 2 |
| **F8** | **Day-N dashboard** — greeting + streak hero · Continue banner (minute-scale ETA: cards-left × avg-seconds-per-card, rolling 30-day mean) · PACE panel (day-scale ETAs: cards-remaining ÷ cards-per-day-this-week) · time-of-day histogram (`studySession.startedAt` buckets) · latest milestone card | 2 (minimal) · 3+ (full) |
| **F9** | **Memorization claim** — Surah⇄Page view toggle · Juzʾ tabs (Juzʾ 30 default) · surah grid with solid/light/gray cells · partial-surah verse-range editor for light-blue cells · scattered-ayat chips (Āyat al-Kursī 2:255, Al-Fātiḥa) · 3 discovery surfaces (post-lesson-1 announcement, profile link, weekly footer) · `studentRecitation` rows with `surahRef` or `surahRef + verseRange` | 3 (not needed for single-lesson Slice 2) |
| **F10** | **Milestones + weekly cadence** — micro-milestone toasts (🌱 root met · ✦ form fluent · 🕌 surah decodable · 📖 juzʾ % · 📈 coverage % · 🏁 lesson/module/course complete) · Sunday reflection screen (week-of header + 3-stat grid + moments this week + next-week plan) | 3 |

### 5.F11-F12 · Shared surfaces

| ID | Feature | Slice |
|---|---|---|
| **F11** | **Knowledge Map** — four layers: dashboard 2-axis coverage bar (memorized / understood) + "words you recite but don't yet understand" count · Map macro toggleable between 114-surah heatmap and 30-juzʾ grid · surah detail word-map (known/learning/unknown highlighting + roots-in-this-surah chips) · root family tree (all forms with mastered/learning/not-yet-met + FSRS stability days) | 3+ |
| **F12** | **Explorer** — corpus navigation without a course · ayah → word → root → family tree → back · any authenticated user · course overlays (glosses, SRS, milestones) layer on when enrolled | 3+ (data layer unblocked from Slice 1 via `verseWords` seed per ADR-011 Revision #2) |

### 5.F13 · Cross-cutting infra

Not a single feature — the substrate that makes F0-F12 work.

| Area | What |
|---|---|
| **Two-axis known state** | `studentCards` tracks **understood** per form (FSRS); `studentRecitation` tracks **memorized** per surah/verse-range. Schema never conflates them |
| **FSRS scheduler** | ts-fsrs v5 client-side; state persisted to InstantDB. "Mature" threshold = **stability ≥ 21 days** (Anki standard). Card states: `new → learning → review` with `relearning` on lapses |
| **Coverage metric** | Headline = `review` cards (full credit 1.0) + `learning` cards (×0.5). "Understood %" = weighted count ÷ total forms in the module |
| **Roles + permissions** | Per-course via `courseMembers` (owner / assistant / tester / student). Permissions model in DATA-MODEL.md §Permissions |
| **Course → Module → Lesson hierarchy** | `modules` entity (new); `lesson.module → modules` link. Implicit in Slice 1, explicit in Slice 3+ |
| **On-demand audio** | Qurʾān recitation streams from EveryAyah CDN · TTS generated on-demand via `audioJobs` · fragment timings cached in `audioFragments` (decoupled from selections — switching reciter never invalidates prior timings) |
| **Schema additions** | 6 new entities: `modules`, `formLessonDecision`, `rootRelations`, `milestone`, `studentRecitation`, `studySession`. Renames: `verses` → `phrases` with `phrases.type` enum (`quranic_verse | teaching_phrase | hadith | dua | ...`). Collapses: Tier-2 dimensions → `hookScore` + `hookReason` |

### 5.F14 · Parked (out of v1)

Proportional treemap macro view (most volume-honest Qurʾān visualization, but R&D) · multi-language UI (Tamil / Urdu student interface) · non-Arabic source courses (schema down payment made via `phrases.type`, full generalization post-v1) · LLM-generated morphology for non-Qurʾānic text (required for ḥadīth / spoken-Arabic passes) · forgetting as pedagogical event (capture FSRS data now, surface insights later) · teacher live-class presence / optional overlay · course forking / remixing · parent dashboards · multi-teacher co-authoring UX (schema ready) · teacher-of-teachers licensing · contextual shades of roots (belongs in explanatory-notes content, not schema).

---

## 6 · Schema Summary

**Authoritative reference:** [DATA-MODEL.md](DATA-MODEL.md) + [FORMS-LEMMAS-ROOTS.md](FORMS-LEMMAS-ROOTS.md). This section summarizes the deltas the PRD commits to.

### Five logical groups

| Group | Entities | Status |
|---|---|---|
| **Layer 1 — Qurʾānic reference** (immutable, shared) | surahs, verses, roots, lemmas, verseWords, verseRoots | Unchanged |
| **Layer 2 — Identity** | users, courses, courseMembers | Unchanged |
| **Layer 2 — Teacher curriculum** (per course) | rootCurriculum, forms, formLemmaBindings, sentencePatterns, lessons, verseScores, verseRootScores, selections | Extended (see below) |
| **Layer 2 — Student state** (per student × course) | studentCards, reviewSessions, streaks | Extended (see below) |
| **Layer 2 — Interaction + operations** | issues, audioFragments, audioJobs, llmDrafts | Unchanged |

### New entities (6)

| Entity | Purpose | Feature driver |
|---|---|---|
| **`modules`** | Course → Module → Lesson hierarchy · grants milestones · carries "% of Qurʾān covered" claims | §4 hierarchy |
| **`formLessonDecision`** | Per `(course, lesson, form)` audit: taught / skipped / unassigned + reason + history | F4 publish & audit |
| **`rootRelations`** | Per `(rootA, rootB, type)`: synonym / antonym pairs; teacher-accepted or -rejected; source = LLM or teacher; semantic (English-meaning), not morphological | F2 synonym/antonym (Vision) |
| **`milestone`** | Per-student achievement events: root_met · form_fluent · surah_decodable · juz_pct · coverage_pct · lesson/module/course complete | F10 |
| **`studentRecitation`** | Per-student memorized surah/verse-range claims · tracks the **memorized** axis | F9 My Memorization |
| **`studySession`** | Per-session `startedAt` / `endedAt` · drives time-of-day histogram + pause mechanic | F8 |

### Field additions (existing entities)

| Entity.Field | Type | Purpose | Feature |
|---|---|---|---|
| `lessons.passType` | enum | `root | synonym | antonym | story | custom` | §4 metadata |
| `lessons.module` | link | `lesson → module` | §4 |
| `selections.form` | link (existing) | `selection → forms` — already in DATA-MODEL | F1 |
| `studentLesson.introSeenAt` | timestamp nullable | H/G first-vs-resume render switch | F5 |
| `lessonSection.type` | enum | `root_intro | form | phrase | anchor` — card renderer picks shape from type | F6 |
| `studentFormFluency.claimType` | enum | `explicit_meaning | inferred` — trust + auto-verify via FSRS | F6 |
| `cardInstance.source` | enum | `new | review` — interleaved-flow teacher-view surface | F7 |
| `verseScores.hookScore` | number 0-10 | Collapsed from story + familiarity + teaching_fit | F0.3 |
| `verseScores.hookReason` | string | LLM justification, visible to teacher as audit note | F0.3 |

### Renames

| From | To | Rationale |
|---|---|---|
| `verses` → `phrases` | with `phrases.type` enum: `quranic_verse | teaching_phrase | hadith | dua | ...` | Lesson 1 already used synthetic "teaching phrases" as a hack; rename makes ḥadīth + duʿāʾ first-class; Kais Dukes morphology stays tied to `type = quranic_verse` rows |

Note: rename is a Vision-level schema change, deferred until a non-Qurʾānic `type` is actually needed. Slice 1 may keep `verses` to minimize churn.

### Collapses

Per Q2 agreement (2026-04-17): **Tier 1 of SCORING.md stays untouched.** Tier 2's three LLM-subjective dimensions (`story`, `familiarity`, `teaching_fit`) collapse into a single `hookScore` (0-10) with a single `hookReason`. Tier 3 (teacher star +5, fragment penalty ×0.7) stays intact. Total score formula becomes:

```
base = lengthScore + formFreq + formDominance + curriculumScore + hookScore
starred = base + (5 if starred else 0)
final = starred × (0.7 if fragment else 1.0)
```

Maximum possible = 50 + 5 = 55 (was 75 under the three-dimension Tier 2). Score range labels (Excellent / Good / Acceptable / Weak) will be rescaled in the SCORING.md sweep noted in §11.

---

## 7 · Success Metrics

### Per-slice acceptance

| Slice | Acceptance bar |
|---|---|
| **Slice 1** (greenfield Lesson 1, teacher) | **Functionally equivalent Lesson 1 published through new stack.** Teacher sits down, opens the new picker, runs F0.1-F0.3 + F0.6 against ilāh + kabura, picks forms + phrases via F1, writes remarks/notes via F2, generates audio via F3, publishes via F4. Lesson may drop or rewrite verses deliberately — teacher uses live Jekyll Lesson 1 as a memory aid to notice what's missing or intentionally changed. Live Jekyll Lesson 1 stays untouched. |
| **Slice 2** (student on Lesson 1) | **One student (Hanzala) completes Lesson 1 end-to-end on new stack.** F5 onboarding lands, F6 J→K→L cards + Bad/OK/Good grading work, F7 close/resume works, minimal F8 dashboard shows streak + continue banner, FSRS scheduling produces next-review dates correctly. |
| **Slice 3+** | Lesson 2 onwards through same flow; full F8 dashboard; F9 My Memorization; F10 milestones + weekly cadence; F11 knowledge map (at least dashboard + map-macro); F12 explorer (at least ayah→word→root drill). |

### System-level metrics (qualitative)

- **Teacher friction:** Siraj authors Lesson 1 in one sitting on his laptop *and* makes a meaningful edit from his phone.
- **No-shame tone:** No gamification (XP / confetti / leaderboards) anywhere in any user-facing surface.
- **Mid-card resilience:** Student closes the app mid-card, reopens hours later, sees the same card fresh — no lost state, no confusion.
- **Coverage honesty:** Headline % number matches what the student can actually read and understand; no inflation via leniency in the "mature" threshold.

### System-level metrics (quantitative)

- **FSRS "mature" threshold:** stability ≥ **21 days** (Anki standard). Lower thresholds inflate coverage; higher thresholds demotivate.
- **Coverage formula:** `review` cards count 1.0, `learning` cards count 0.5. `new` cards count 0.0.
- **Mid-reveal loss:** **0%** — mid-reveal state is discarded on close (per Day-1 §9). Never survives a crash.

No student-count or retention targets in this PRD; those belong to a post-Slice-3 launch plan.

---

## 8 · Roadmap & Slices

```
Foundation → Slice 1 (teacher Lesson 1) → Slice 2 (student Lesson 1) → Slice 3+ (scale)
```

### Slice 1 — Lesson 1 greenfield (teacher end-to-end)

> **Detailed design:** [Slice 1 Verse Picker Spec](superpowers/specs/2026-04-17-slice-1-verse-picker-design.md) — covers architecture, scoring algorithm, picker UX, all design decisions, and interactive mockups. The spec below is the summary; the linked doc is authoritative for Slice 1 implementation.

**Goal:** teacher re-authors Lesson 1 from scratch through the new stack.

**Key design shifts (2026-04-17 brainstorm):**
- **Scoring unit = waqf sentence**, not full verse. All verses pre-split at waqf marks during P1. Long ayahs become 3-9 word teaching units. Eliminates fragment penalty + manual audio timestamp work.
- **3-dimension Phase A1 scoring**: D1 (avg word frequency), D3 (content coverage %), D4 (length sweet spot). Deterministic, computed from Layer 1. Replaces 4-dimension Tier 1.
- **Score-first picker, not form-first.** Teacher sees all 290 candidate sentences ranked by composite score, filters by root/form. Diversity via diminishing-returns decay (0.7).
- **اللَّه excluded from form partitioning.** 92% of candidates contain the proper noun — excluding it reduces noise from 2,512 to 290 clean candidates.
- **Seed phrases** — new `seedPhrases` entity with 7 Adhān phrase→root mappings. Teacher types phrase → system suggests roots.
- **DB-only deliverable** — no student surface, no Jekyll export. Publish = phase-state transition.
- **No LLM API** — Tier-2 scoring via export-kit → separate Claude Code session → import JSON.

**Scope:**
- Foundation P1 + P3 + P4 (narrowed Layer 1 with waqf fragmentation + InstantDB seed + pull-only sync; P2 migration *not* needed)
- F0.1 · add root (ilāh, kabura) via seed-phrase lookup
- F0.2 · Phase A1 auto-scoring (D1/D3/D4)
- F0.3 · Phase A2 LLM scoring — export kit, manual run, import `hookScore`/`hookReason`
- F0.6 · job status UI (minimal, audio jobs only — no LLM jobs)
- F1 · sentence picker (score-first ranking, weight sliders, diversity, selection summary, form coverage detail panel, missing-forms indicator)
- F2 · annotation (remark with hookReason seed, root/form notes, inline translation)
- F3 · audio production (TTS preview, fragment timestamps via waqf-aligned cuts, audioJobs queue via worker daemon, audio stored in InstantDB $files)
- F4 · publish + formLessonDecision log (taught/unassigned/skipped, soft gate)

**Out:** F0.4 LLM translation · F0.5 synonym/antonym · F0.7 recompute · `modules` entity · `verses`→`phrases` rename · any student-facing surface · `verseWords` seed (can defer if slow; explorer doesn't ship until Slice 3+)

**Acceptance:** published Lesson 1 in new stack (DB-only) · Jekyll Lesson 1 untouched · teacher produces it without reaching for the old JSONs · full test suite passes (unit + E2E).

### Slice 2 — Lesson 1 student loop

**Goal:** one student learns Lesson 1 on the new stack.

**Scope:**
- F5 onboarding (Path tab + first-entry intro)
- F6 J→K→L cards + Bad/OK/Good + "already know" chip
- F7 close/resume + interleaved continue
- Minimal F8 dashboard (greeting + streak + continue banner only)
- F13 FSRS + two-axis known (understood axis only — memorization claim is F9, Slice 3)

**Out:** F9 memorization claim · F10 milestones + weekly · F11 knowledge map · F12 explorer · full F8 (PACE, histogram, milestones)

**Acceptance:** Hanzala (or an equivalent test student) goes through Lesson 1's full card arc · gets scheduled reviews at sensible intervals · can close and reopen the app without losing progress.

### Slice 3+ — scale & enrich

- **Slice 3:** Lesson 2 greenfield · promote `modules` entity · F8 full dashboard · F9 My Memorization · F10 milestones + weekly cadence · `modules` promotion
- **Slice 4:** F11 knowledge map (dashboard + map-macro) · F12 explorer (corpus drill)
- **Slice 5:** Synonym pass lessons (Lessons 8+) · F0.4 LLM translation drafts · F0.5 synonym/antonym candidates → `rootRelations`
- **Slice 6+:** `verseWords` full seed · treemap macro (R&D) · multi-language UI (Tamil) · Expo native (Track 2 per ADR-011)

---

## 9 · Out of Scope (parked)

Restated from F14 for ease of future reference:

- Proportional treemap macro view (visualization R&D)
- Multi-language UI — Tamil / Urdu student interface
- Non-Arabic source courses (Tamil→English, etc.) — schema down-payment made; full generalization post-v1
- LLM-generated morphology for non-Qurʾānic text (required for ḥadīth / spoken-Arabic passes)
- Forgetting as pedagogical event (capture FSRS data now; surface later)
- Teacher live-class presence / optional overlay
- Course forking / remixing across teachers
- Parent dashboards (real persona, deferred)
- Multi-teacher co-authoring UX (schema ready, UI deferred)
- Teacher-of-teachers / methodology licensing
- Contextual shades of roots (explanatory-notes content, not schema)
- Session-share / "Share with your teacher" social features

---

## 10 · Open Questions

Captured for future sessions. None of these block Slice 1.

1. **When to promote `modules` to an explicit entity** — Slice 3 is the natural trigger (crossing module boundaries), but could be Slice 2 if we want milestone toasts to feel real from the first student session. Defer.
2. **Proportional treemap prototype** — most volume-honest macro view, but UX research needed. Post-v1.
3. **Non-Arabic source generalization** — the `phrases.type` enum is the down-payment. Full generalization (Tamil-speaker-learning-English with radicals instead of roots) is a post-v1 decision that will rename `roots` → `morphologicalGroup` or similar.
4. **Parent dashboards** — Hanzala's father wanting weekly progress reports is a real future persona. What view? Read-only mirror of student dashboard, or a distinct parent surface?
5. **Audio storage economics** — EveryAyah CDN covers Qurʾān recitation; TTS files accumulate over time. InstantDB storage or external object store?
6. **Score range rescaling after Tier 2 collapse** — new max is 55 (was 75). SCORING.md's "Excellent / Good / Acceptable / Weak" thresholds need a small sweep. Track as §11 stale-doc update.
7. **Root-relation note field** — `rootRelations` has no `note` today (YAGNI; `llmDrafts` captures rationale). Revisit if teachers need to annotate accepted pairs.
8. **Tester phase threshold** — currently testers see lessons from `phaseReview = "ready"`. If teachers want earlier access for Tamil review, temporary role promotion to `assistant` is today's mechanism. Alternative: a separate `phaseTamil` gate.

---

## 11 · References

### Authoritative — read in order for implementation

1. [docs/FORMS-LEMMAS-ROOTS.md](FORMS-LEMMAS-ROOTS.md) — conceptual foundation (root vs lemma vs form)
2. [docs/DATA-MODEL.md](DATA-MODEL.md) — complete 24-entity schema + permissions + query patterns
3. [docs/decisions/ADR-010-sqlite-data-architecture.md](decisions/ADR-010-sqlite-data-architecture.md) — SQLite + InstantDB split, Phase 1 foundation
4. [docs/decisions/ADR-011-instantdb-student-experience.md](decisions/ADR-011-instantdb-student-experience.md) — web-first / Expo-later two-track strategy
5. [docs/decisions/ADR-009-local-root-pipeline.md](decisions/ADR-009-local-root-pipeline.md) — the 3 vendored text files + local-only pipeline that replaced corpus.quran.com scraping
6. **This PRD** — product synthesis
7. [docs/superpowers/specs/2026-04-17-slice-1-verse-picker-design.md](superpowers/specs/2026-04-17-slice-1-verse-picker-design.md) — ⭐ Slice 1 detailed design: picker UX, sentence-level scoring, architecture, all decisions + interactive mockups
8. [docs/SCORING.md](SCORING.md) — scoring algorithm v4 (waqf sentences, 3-dimension D1/D3/D4, four-phase A1/A2/B/C)

### Brainstorm input docs (kept for the "why" trail)

- [docs/design/2026-04-16-pedagogy-first-redesign.md](design/2026-04-16-pedagogy-first-redesign.md) — teacher-workflow brainstorm (morning + Part-2 continued). Every decision carries a "why" paragraph.
- [docs/design/2026-04-16-day1-student-workflow.md](design/2026-04-16-day1-student-workflow.md) — student Day-1 through Day-N workflow.
- [docs/design/mockups/](design/mockups/) — 9 Day-1 HTML mockups + knowledge-map-prototype.html.

### Authoritative with stale sections (updated alongside this PRD)

- [docs/LESSON-PLAN.md](LESSON-PLAN.md) — pedagogical framework authoritative; old-pipeline references cleaned up in this commit.
- [docs/SCORING.md](SCORING.md) — scoring dimensions + formulas authoritative; JSON-storage references + Tier 2 note cleaned up in this commit. Score-range rescaling deferred (§10 open question #6).

### Stable reference

- [docs/GLOSSARY.md](GLOSSARY.md) — lesson-authoring vocabulary. Current content aligns with PRD terminology; no edits needed today.
- [docs/CURRENT-STATE.md](CURRENT-STATE.md) — session-resume pointer; updated to point at this PRD.

### Archived (historical, not authoritative)

- [docs/archive/](archive/) — pre-Era-3 docs (Jekyll site architecture, Era-2 InstantDB prototype research, July 2025 platform research, April 11 session handoff)

### External data sources (ADR-009)

- `tools/data/quran-morphology.txt` — mustafa0x/quran-morphology, GPL, Arabic-script derivative of Kais Dukes v0.4
- `tools/data/quran-uthmani.txt` — Tanzil.net full Uthmani
- `tools/data/quran-trans-en-sahih.txt` — Tanzil.net Saheeh International (draft)

---

## 12 · Appendix · Stale-doc updates applied in this commit

Captured here as a record; each bullet corresponds to a real edit in this commit.

- **LESSON-PLAN.md** — status header updated with PRD link; removed references to `corpus.quran.com` scraping (ADR-009 replaced it); removed references to the batch completion prompt workflow (`docs/prompts/batch_completion.md`); updated Step 1 + Verification sections to point at local morphology + DATA-MODEL + PRD. Pedagogical content (anchor phrase → roots → forms → sentences, translation style, teacher preferences, learning-science conventions) preserved unchanged.
- **SCORING.md** — status header updated with PRD + hookScore note; "Where Scores Live" JSON example replaced with reference to `verseScores` + `verseRootScores` in DATA-MODEL.md; "When to Score" pipeline step references updated to point at SQLite + InstantDB. Tier 2 collapse into `hookScore` called out. Score-range rescaling flagged as open question §10.6; thresholds themselves left unchanged for this commit.
- **CURRENT-STATE.md** — added 2026-04-17 entry at top pointing at this PRD as the latest synthesis; Phase 1 status reframed as "Slice 1 = Lesson 1 greenfield (per PRD §8)".

---

_Maintainers: this PRD is the synthesized product contract. Update when features graduate from Vision → Slice scope, when new entities are promoted, when out-of-scope items become in-scope, or when open questions resolve. Treat DATA-MODEL.md + FORMS-LEMMAS-ROOTS.md as the implementation-level source of truth; this PRD is the product-level source of truth. When they conflict, surface the conflict explicitly and decide together._
