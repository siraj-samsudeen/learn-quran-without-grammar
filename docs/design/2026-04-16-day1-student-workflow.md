# Day-1 Student Workflow — Design Spec

_Date: 2026-04-16 · Brainstorm owner: Siraj · Mode: workflow-first_

> **Scope.** This spec captures the student-side Day-1 through Day-N experience for a single user (Hanzala, age 10, memorized Juz' 30 + Al-Fātiḥa) learning the Adhān course. It covers the first open, the lesson arc, the card-grading mechanic, the return-trip dashboard, the memorization-claim flow, and the micro-milestone + weekly-cadence rhythm. It is the input to the next writing-plans session.
>
> **Status vs prior work.** This extends and revises the 2026-04-16 (morning) pedagogy-first redesign brainstorm — Q#1 (metric), Q#2 (teacher authoring), Q#3 (synonym/antonym), Q#4 (reconciliation) were locked then. This session pivots to the student side and resolves pieces of the previously-open Q#5 (student-side workflow), though the v1 scope cut is still pending.
>
> **Relation to DATA-MODEL.md.** Decisions below create new field/entity requirements. They are described inline and summarized in §10 (Schema implications). The consolidating amend-in-place sweep of DATA-MODEL.md is still the promised next step.

---

## 1 · Foundational distinction — two axes of "known"

Every subsequent decision assumes these two axes are **never conflated**:

- **Meaning comprehension** — "Does the student know what *ilāh* means?" Tracked per form via FSRS. LQWG's core teaching axis.
- **Recitation fluency** — "Can the student recite Sūrat al-Ikhlāṣ from memory?" Tracked per surah / verse-range / page. Orthogonal to meaning.

Two surfaces consume the two axes:

- Lesson cards grade **meaning** (Bad/OK/Good/chip).
- The "My Memorization" screen records **recitation fluency** (surah/page/verse-range marking).

This distinction was explicitly corrected during the brainstorm — it's load-bearing and must not be papered over in implementation.

---

## 2 · Day 1 · First open

### 2.1 No onboarding quiz

Decision **B** (from original Q: onboarding shape): the student lands directly on the Adhān course overview. There is no upfront "what have you memorized?" form. Rationale: most 10-year-olds will not complete the form honestly or at all; forced onboarding is a well-known drop-off point. Memorization surfaces later through the progressive-disclosure pattern (§6).

### 2.2 Course overview — tab toggle

Decision **E**: the overview has two tabs.

- **Path** (default) — Duolingo-style ladder of all lessons in the course. One glowing "Start here · Lesson 1" button, subsequent lessons shown as locked pills with dashed borders. Module dividers appear as subway-station labels between lesson clusters.
- **Map** — the full hierarchy (Theme → Module → Pass → Lesson) for users who want the shape. Same data, different render.

Rationale: Path optimizes for *momentum* (one clear next step, minimal cognitive load). Map preserves *context* (curriculum shape visible). Tab keeps each view uncluttered. Siraj initially picked C (pure path), then added "I like B too" (map), resolving to E.

**Mockups:** [01-course-overview-options-abc.html](mockups/2026-04-16-day1-flow/01-course-overview-options-abc.html) · [02-course-overview-tab-toggle-E-locked.html](mockups/2026-04-16-day1-flow/02-course-overview-tab-toggle-E-locked.html)

### 2.3 Lesson entry — H on first entry, G on resume

Decision **H + G**: tapping "Start here · Lesson 1" for the very first time shows a single **Roadmap intro** screen:

> **Lesson 1 · Allāhu Akbar**
> Today you'll meet: *ilāh* (god) · *kabura* (great)
> 8 forms · 6 phrases · ~10 min

On subsequent entries (Day 2+, after Hanzala has pressed "Let's begin" at least once), the lesson opens directly to the next card — **G · cold start**. The intro is re-accessible via a chevron in the card header.

Schema note: `studentLesson.introSeenAt` (timestamp, nullable) drives this. Null → render H. Non-null → render G.

**Mockup:** [03-lesson-entry-H-first-G-resume.html](mockups/2026-04-16-day1-flow/03-lesson-entry-H-first-G-resume.html)

---

## 3 · Lesson cards · the J → K → L arc

Per Siraj's correction: the first-card options (J, K, L) are **not alternatives** — they are a *sequence* per root within a lesson.

- **J · Root-letter card** — introduces the three-letter root (e.g., ا ل ه) with audio and meaning. One card per root.
- **K · Form card** — introduces a single form of that root (e.g., *ilāh*, *ālihah*). Repeats for each form.
- **L · Phrase card** — embeds the form(s) inside a phrase, using the anchor-first zoom-in pattern when the student already knows the phrase (e.g., *Allāhu Akbar*). Repeats per phrase.

Order within a lesson:

```
[root-1 block]  J → K × N → L × M
[root-2 block]  J → K × N → L × M
[anchor reveal] (full anchor phrase bringing roots together)
```

For Lesson 1 (roots *ilāh* + *kabura*, anchor *Allāhu Akbar*), this yields ~14 cards.

Schema note: `lessonSection.type` enum = `root_intro | form | phrase | anchor`. The card renderer picks the shape from the type — no per-lesson hand-authoring of card shape.

**Mockup:** [04-first-card-jkl-arc.html](mockups/2026-04-16-day1-flow/04-first-card-jkl-arc.html)

---

## 4 · Card grading — Bad / OK / Good + "already know" chip

### 4.1 Three buttons, color + icon + text

| Button | Color  | Icon | Text   | FSRS grade |
|--------|--------|------|--------|------------|
| Bad    | Red    | ✕    | Bad    | 1 (Again)  |
| OK     | Yellow | ≈    | OK     | 2 (Hard)   |
| Good   | Green  | ✓    | Good   | 3 (Good)   |

Rationale for triple-redundant labelling (Siraj's merge of earlier X and W options):

- **Color** gives instant emotional read.
- **Icon** removes language dependence (supports future Tamil / Arabic / Urdu builds).
- **Text** makes the first-ever card unambiguous for any user.

"Bad" was chosen over "Again" (Anki's verb-form) because the label names the student's *self-assessment* ("I got it wrong") rather than describing the app's *action* ("show it again"). Honest naming; matches LQWG's no-shame tone.

### 4.2 The "already know" chip — web-safe meaning claim

Above the three grade buttons, every form card shows a small chip:

> ⭐ I already know this

Single tap → writes `studentFormFluency` row with `claimType = explicit_meaning` and grade 4 (Easy), scheduling a verification review ~14 days out. No long-press — that was dropped for web compatibility.

Critically: **we do not verify the claim separately.** FSRS is the verifier. A bluff collapses at the first scheduled review (student rates Bad/OK → card drops to short intervals). A genuine claim confirms itself (student rates Good again → interval extends). Same mechanic for trusted and untrusted claims; only `claimType` differs (for teacher-view diagnostics).

**Mockup:** [07-card-grading-bad-ok-good-locked.html](mockups/2026-04-16-day1-flow/07-card-grading-bad-ok-good-locked.html) · [08-claim-webchip-and-memo-v2.html](mockups/2026-04-16-day1-flow/08-claim-webchip-and-memo-v2.html)

---

## 5 · Day-N dashboard

The dashboard appears on every app open after Day 1. Five stacked sections, all inside a warm parchment-gradient card:

1. **Greeting + streak hero** — "Assalamu alaikum, Hanzala · 🔥 3 · 3-day streak · keep it alive."
2. **Continue banner** — green card with "Where you left off · Lesson 1 · Allāhu Akbar," a progress bar (0–100% of current lesson), time-to-finish ("4 min"), and a single "Continue →" button.
3. **Time-of-day histogram** — "This week · when you study." 24-hour bar chart. Green bars highlight peak hours.
4. **PACE panel** — three emoji-prefixed rows:
   - 📖 Lesson 1 in ~1 day at your pace
   - 📚 Module 1 in ~9 days
   - 🕌 Adhān course in ~18 days
   - Footer stats line: "This week: 25 min · 12 words · 3 days · best time: after Fajr"
5. **Milestone card** (when relevant) — "Surahs you can read now: Al-Ikhlāṣ 🕌" or latest coverage threshold.

### ETAs self-calibrate

Two different calculations share one principle (tracks actual pace, no teacher-authored numbers):

- **Minute-scale ETA** (Continue banner — "4 min to finish"): *cards-left-in-current-lesson × avg-seconds-per-card*. Avg is a 30-day rolling mean of the student's own grading cadence.
- **Day-scale ETA** (PACE panel — "~1 day", "~9 days", "~18 days"): *cards-remaining ÷ cards-per-day-this-week*. Good week shrinks the number; slow week grows it. Kindle uses the identical formula for book ETAs.

### Time-of-day data source

A `studySession` table with `startedAt` / `endedAt` timestamps is the only input. Hourly buckets + top-2-by-minutes = "your best times." No ML, no engagement weighting. YAGNI anything more sophisticated until real data says otherwise.

**Mockup:** [05-dashboard-v2-N-locked.html](mockups/2026-04-16-day1-flow/05-dashboard-v2-N-locked.html)

---

## 6 · Memorization claim — its own flow

### 6.1 Why it's separate

Recitation fluency is orthogonal to meaning comprehension (§1). Conflating them produces wrong progress metrics and wastes SRS effort. The "My Memorization" screen records *only* what the student can recite in Arabic; it does not affect meaning-card scheduling.

### 6.2 The screen itself (v2 grid)

Single coherent interface. No wizard variant, no mushaf variant, no audio variant — one tool that adequately serves all personas beats three specialist tools that each fail one.

Components:

- **Surah ⇄ Page view toggle** (top right). Default: Surah. Page mode = 604-cell grid for students deep in traditional ḥifẓ.
- **Juz tabs** (horizontally scrollable). Juz 30 is the default active tab because it's the most common starting point.
- **Surah grid** within the active juz. Tap a cell → toggle memorized. Cell colors: gray (not memorized), solid blue (fully memorized), light blue (partial).
- **Partial-surah drill-in** — tapping a light-blue cell opens a verse-range editor ("1–5", "10–15", etc.).
- **Scattered section** at the bottom — isolated verses (e.g., Ayat al-Kursī 2:255, Al-Fātiḥa regardless of juz) as chips.

Schema: `studentRecitation` rows with either `surahRef` (whole surah) or `surahRef + verseRange` (partial).

**Mockups:** [08-claim-webchip-and-memo-v2.html](mockups/2026-04-16-day1-flow/08-claim-webchip-and-memo-v2.html) · [09-memo-alternatives-wizard-mushaf-audio.html](mockups/2026-04-16-day1-flow/09-memo-alternatives-wizard-mushaf-audio.html) (rejected alternatives)

### 6.3 Discovery — progressive disclosure

See `~/Dropbox/Siraj/Projects/siraj-claude-vault/cross-project/patterns/progressive-disclosure-for-optional-features.md` for the canonical pattern description.

Three surfaces:

- **AA** · one-time skippable announcement after Lesson 1 completes. Copy: *"Hey, there's a My Memorization page — mark what you already know now, or come back anytime."* Buttons: "Mark now" (deep-link to BB) · "Skip" (dismissed; feature still reachable).
- **BB** · always-accessible profile entry. Primary control.
- **Weekly review footer** · small "My Memorization · N surahs →" link. Surfaces the feature at a reflective moment when users naturally notice "oh, I memorized Sūrat al-Mulk this week."

---

## 7 · Continue mechanic — interleaved seamlessly

Decision **R**: when the student taps Continue, the app shows whatever card FSRS decides next — new content, review from prior days, or mix. No "Review" tab in the student UI.

Each card carries an internal tag `cardInstance.source ∈ {new, review}`. The tag is written to the event log, never rendered to the student. Teacher view reads the same data, filters by source, and shows the breakdown.

Benefits:
- Student UI stays simple (no mode-switching, no "chores before progress" friction).
- Teacher view is pure query work — no separate instrumentation.
- Eliminates one navigation surface entirely.

**Mockup:** [06-resume-mechanic-R-interleaved.html](mockups/2026-04-16-day1-flow/06-resume-mechanic-R-interleaved.html)

---

## 8 · Micro-milestones + weekly cadence

### 8.1 Micro-milestones (toasts + Moments log)

Fire-and-log events for each of:

- 🌱 **New root met** — first J card of that root
- ✦ **Form fluent** — implicit claim threshold reached (3 ✓ across 14+ days, no ✕)
- 🕌 **Surah decodable** — all forms in a surah have fluent status (meaning, not memorization)
- 📖 **Juz' milestone** — 25% / 50% / 100% of a Juz' decoded
- 📈 **Coverage threshold** — 1% / 5% / 10% / 25% / 50% of Qur'an recognized
- 🏁 **Lesson / Module / Course complete**

In-flow UX: one-line toast, visible for 3–5 seconds, does not block. Persisted to a `milestone` table and surfaced in the weekly summary.

### 8.2 Weekly cadence (Sunday reflection)

One screen, appears automatically on first session of a Sunday (or reachable manually). Sections:

- Week-of header (e.g., "Week of Apr 12 · Your Journey · Hanzala · Week 1").
- Three-stat grid — days studied, total time, forms learned.
- **Moments this week** — list of micro-milestones hit during the week.
- **Next week** — one-line plan ("Finish Lesson 2 · *Shahida* · ~4 days at your pace").
- Footer links: "My Memorization · N surahs →" and optionally a "Share with your teacher" action (future).

Rationale: micro-milestones give constant dopamine without gamification; the weekly view converts them into *narrative* the student (or parent) can tell at dinner.

### 8.3 Schema

```
milestone {
  id,
  studentId,
  type: enum(root_met | form_fluent | surah_decodable | juz_pct | coverage_pct | lesson_complete | module_complete | course_complete),
  achievedAt: timestamp,
  surahRef?: int,    // for surah_decodable
  juzRef?: int,      // for juz_pct
  pct?: int,         // for juz_pct / coverage_pct
  lessonId? / moduleId? / courseId?,
}
```

Dashboard queries the latest 1–2 milestones for the persistent card; weekly view queries "milestones where achievedAt is in this week."

---

## 9 · Pause mechanic

- No pause button. Closing the app = pausing.
- FSRS state auto-saves on every Bad/OK/Good/chip tap.
- Mid-reveal state (student tapped "show answer" but hasn't rated) is **discarded** on close. Next open shows the same card fresh.
- `studySession.endedAt` is set on app backgrounding (via standard lifecycle hooks).

Simplicity beats fidelity here. Nothing half-entered should ever survive a crash or close — a 10-year-old will close the app mid-card often.

---

## 10 · Schema implications

New or clarified fields/entities emerging from this spec:

| Location | Field / entity | Driven by |
|---|---|---|
| `studentLesson` | `introSeenAt` (timestamp, nullable) | §2.3 — H/G render switch |
| `lessonSection` | `type` enum = `root_intro | form | phrase | anchor` | §3 — renderer drives shape from type |
| `studentFormFluency` | `claimType` enum = `explicit_meaning \| inferred` | §4.2 — trust + auto-verify |
| `cardInstance` | `source` enum = `new | review` | §7 — interleaved flow, teacher-view surface |
| `studentRecitation` | (existing; see DATA-MODEL.md) — confirmed separate from `studentFormFluency` | §1 + §6 |
| `studySession` | `startedAt`, `endedAt` | §5 — time-of-day histogram + pause mechanic |
| `milestone` | New entity (see §8.3) | §8 |

All of the above are additive to the 2026-04-16 (morning) brainstorm's 24-entity schema. No conflicting renames.

---

## 11 · Rejected alternatives (with rationale, for future protection)

Capturing to prevent re-proposal:

- **Memorization-first onboarding (A)** — asking "what have you memorized?" before the student sees any value. Rejected: high drop-off, demands information the user has not yet organized.
- **Pure path course overview (C alone)** — no hierarchy access. Rejected in favor of E (tab toggle) to preserve teacher/map-view needs.
- **Long-press for meaning claim** — mobile-only gesture. Rejected in favor of always-visible chip (§4.2).
- **Q&A wizard / Mushaf page view / Audio listener for memorization** — each serves one persona well and others poorly. Rejected in favor of a single coherent grid (§6.2).
- **4-button Anki-style grading (U)** — cognitive overload for a 10-year-old; "Hard" vs "Good" is hard to distinguish during initial learning. Rejected in favor of 3 buttons + chip.
- **Confetti / XP / leaderboard on lesson completion** — clashes with LQWG's reverence tone. The reward *is* the ability to continue.
- **Explicit "Review" tab in student UI** — adds navigation surface and mode-switching friction. Rejected in favor of interleaved flow (§7).

---

## 12 · Parked / deferred (post v1 or pending decisions)

- **v1 scope cut (Q#5 from morning brainstorm)** — still open. This spec informs but does not resolve it. Three candidate slices remain (A: knowledge-map atop current picker · B: new Adhān 3-pass authoring · C: explorer-only).
- **Mid-lesson card shapes beyond J/K/L** — recitation card, matching, MCQ, story-context cards. Parked because Day-1 arc is covered by J/K/L.
- **Knowledge-map drill-down layers** — dashboard → macro (heatmap or Juz' grid) → surah word-map → root family tree. Covered in morning brainstorm; not expanded here.
- **Teacher-view design** — stated as "queries on same data" but no UX sketched. Out of scope for Day-1 student spec.
- **Multilingual (Tamil / Arabic / Urdu UI)** — color+icon button design is *prepared* for it (no text dependency on icons) but no translations in v1.
- **Session-share / social** ("Share with your teacher" link) — future, not v1.

---

## 13 · References

- Morning brainstorm: [docs/design/2026-04-16-pedagogy-first-redesign.md](2026-04-16-pedagogy-first-redesign.md)
- Data model (pre-amendment): [docs/DATA-MODEL.md](../DATA-MODEL.md)
- Forms/lemmas/roots conceptual foundation: [docs/FORMS-LEMMAS-ROOTS.md](../FORMS-LEMMAS-ROOTS.md)
- Knowledge-map prototype: [docs/design/mockups/knowledge-map-prototype.html](mockups/knowledge-map-prototype.html)
- Locked mockups for this spec: [docs/design/mockups/2026-04-16-day1-flow/](mockups/2026-04-16-day1-flow/)
- Cross-project pattern note: `~/Dropbox/Siraj/Projects/siraj-claude-vault/cross-project/patterns/progressive-disclosure-for-optional-features.md`

---

## 14 · Next step

This spec is the input to a writing-plans session. The plan will decompose §1–§9 into implementable slices, decide ordering, and produce a task list against DATA-MODEL.md amendments. Before that session begins:

1. Siraj reviews this document.
2. Any revisions are made in-place.
3. Doc + mockups + obsidian note are committed in one commit.
4. Writing-plans skill is invoked.
