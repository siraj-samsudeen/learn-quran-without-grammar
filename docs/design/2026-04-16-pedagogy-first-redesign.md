# Pedagogy-First Redesign — Brainstorm Notes

_Date: 2026-04-16_
_Status: **Brainstorm notes, not a spec.** Captures the session before any reconciliation with [DATA-MODEL.md](../DATA-MODEL.md). See "Next steps" for how this converges back._
_Method: workflow-first, fresh-eyes — see [vault: workflow-first-design](~/Dropbox/Siraj/Projects/siraj-claude-vault/cross-project/workflow-first-design.md)_
_Prototype: [docs/design/mockups/knowledge-map-prototype.html](mockups/knowledge-map-prototype.html)_

---

## Why this pass

Two days after committing the 24-entity [DATA-MODEL.md](../DATA-MODEL.md) (2026-04-14), instinct pulled toward a fresh-eyes redesign *before* writing a line of code. Two framings combined:

- **Workflow-first** — derive the schema from the *verbs* the user does, not from the *nouns* in the domain
- **Fresh eyes** — re-derive without anchoring on the existing 24 entities

The moment is cheap: zero implementation against the new schema yet, only docs. Redoing now costs a brainstorm session; redoing after Phase 1 code lands costs migrations and rewrites.

---

## Method

Workflow-first design is a deliberate inversion of the usual flow. Most schemas get built by listing nouns (roots, verses, forms, lessons, users…) and connecting them. Workflow-first starts from verbs — *what does the person do, in what order, with what feedback* — and the nouns emerge as whatever must persist between those verbs.

It tends to produce smaller schemas because data that never gets written or read by any real workflow just never appears.

Captured as a reusable methodology: [cross-project/workflow-first-design.md](~/Dropbox/Siraj/Projects/siraj-claude-vault/cross-project/workflow-first-design.md).

---

## Narrative: what emerged, in the order it emerged

### Step 1 — The spine workflow is "make one new lesson, root-to-publish"

Among four candidate spines (authoring / triage / student-study / teacher-day), the *generative* loop is the right anchor: it creates the data every other workflow consumes. Clean it up and everything else follows.

### Step 2 — The teacher starts from a *phrase*, not a *root*

The current design treats *root* as the unit of curriculum (`rootCurriculum.introducedInLesson`). But the actual workflow begins with a piece of text the student already hears daily — a phrase of the Adhān, a dhikr of ṣalāh. The phrase is the *cognitive hook*; the roots come *out of* the phrase.

> "I saw students getting cognitive overload remembering what was in Lesson 1 vs Lesson 2. I wanted a natural hook. That's why I picked the Adhān — each lesson takes one phrase, and the student hears the Adhān five times a day as reinforcement."

### Step 3 — The pass/module structure (LQWG-specific pedagogy)

A single pass through the 7 Adhān phrases isn't the whole course. The user's pedagogy cycles the same source material through three **passes**:

- **Root pass** — current Lessons 1–7 (one root family per phrase)
- **Synonym pass** — same 7 phrases, now teaching *synonyms of the English meaning* of the roots covered (e.g., *akbar* → *khayr*, *akthar*)
- **Antonym pass** — same 7 phrases, now teaching antonyms (e.g., *akbar* → *aṣghar*)

Between passes, a lightweight **story lesson** weaves all covered roots into a cohesive narrative — connective review, not new content. After all three passes × 7 phrases = 21 lessons, the module is complete. Module 2 = ṣalāh phrases × 3 passes. Module 3 = adhkār after ṣalāh. And so on.

### Step 4 — "Source text" generalizes beyond phrase

Other teachers may not teach from the Adhān. A *Qaṣaṣ al-Nabiyyīn* teacher starts from book passages. An ʿAqīdah teacher starts from creedal sentences. A grammar teacher starts from sample sentences.

The real primitive is **source-text chunk** — a bit of text the student is already engaging with, which orients a lesson and contains the roots the lesson will teach. The Adhān is one instance; book passages are another.

This also made a two-way distinction visible: **anchor text** (what the lesson is about) is distinct from **teaching examples** (verses/passages used to drill the root). For LQWG they overlap mostly with the Qur'an; for other courses they may not.

### Step 5 — Student explorer is a third mode

A student like the user's son, age 10, who has memorized 10 short surahs and wants to *understand what he's been reciting*, isn't following any course. He clicks a surah → clicks an ayah → clicks a word → sees its root. On-demand, student-driven, no teacher plan.

This is a completely different interaction model from the authoring/consuming course loop. But it shares all the core linguistic data.

### Step 6 — Explorer is the base product; courses are opinionated overlays

**Load-bearing architectural decision.** Any authenticated user can open the app and navigate the Qur'an by ayah/root/form *without joining any course*. The explorer is enriched by teacher courses (glosses, curated lessons, SRS state, progress tracking) when the user is enrolled, but the explorer stands on its own.

Implication: the schema cleanly separates a **core explorer layer** (Qur'an corpus + per-user memory state) from a **course overlay layer** (teacher curation).

### Step 7 — Recitation ≠ meaning: two axes of "known"

A Muslim child can flawlessly recite Al-Fātiḥa with perfect tajwīd and have zero idea what "ar-raḥmān ar-raḥīm" means. These are two different memories of the same word — auditory-muscular vs semantic. A schema that collapses them into one conflated "known" flag will destroy honesty in any coverage metric.

Two-axis tracking:
- **Recitation fluency** — can pronounce correctly from rote memory
- **Meaning comprehension** — knows what the word means

The starting inheritance from the student's prior memorization fills the recitation axis. LQWG adds the meaning axis on top.

### Step 8 — Pre-existing memorization is a primary personalization trigger

Day 1 of onboarding: "What have you memorized?"

- Feeds the knowledge map (outer rings light up immediately)
- Drives route picking (lessons using words from memorized surahs get affinity bonus — sound-first recognition accelerates form-meaning binding)
- Unlocks the most emotionally powerful product framing: *every word you already say is a word we can give meaning to*

A potential alternative course track falls out naturally: **reverse lookup** — "start from your memorized surahs, let me teach you what they mean."

---

## Decisions locked in this session

| # | Decision | Implication |
|---|---|---|
| 1 | **Explorer is the base product.** | Schema separates corpus-layer (explorer-usable) from course-overlay layer (enrolled-only) |
| 2 | **Source-text chunk is the anchor primitive**, not "phrase" specifically. | Generalizes across course types; new `anchors` entity candidate |
| 3 | **Recitation and meaning are two independent axes.** | `studentCards` tracks meaning; separate `studentRecitation` tracks recitation |
| 4 | **Pre-existing memorization is a first-class entity**, captured in onboarding. | New entity for user-declared memorized ranges |
| 5 | **Pass (root/syn/ant) is teacher-pedagogy, not platform primitive.** | Labeled as lesson metadata, not its own entity; adoptable by other teachers as a named pattern |
| 6 | **Module is the milestone-granting grouping.** | Milestones tie to completing a module; "% of Qur'an covered" is a module-level claim |
| 7 | **Story lessons are a distinct lesson type.** | Lesson-type flag: `root-pass` / `synonym-pass` / `antonym-pass` / `story` |
| 8 | **Lesson remains the unit of delivery.** | Student experience is still lesson-by-lesson; pass/module are grouping concepts |
| 9 | **Two-layer knowledge map** is the student's front-door visualization. | Bakes recitation-vs-meaning distinction into the entire UI grammar |

---

## Revised pedagogical hierarchy

```
Theme         Adhān · Ṣalāh · Adhkār · Khutba · Morning-to-night · …
  │
  ├── Module        (grouping; grants milestones; "% of Qur'an")
  │     │
  │     ├── Pass          (teacher-pedagogy: root / synonym / antonym / story / custom)
  │     │     │
  │     │     └── Lesson  (the unit the student sits down to study)
  │     │           │
  │     │           └── Source-text anchor + Roots-taught + Selections
```

A course has multiple themes. A theme is structured into modules. Module completion is the milestone. Inside a module, lessons are grouped by pass. Each lesson has one anchor and teaches ≥1 root.

Other teachers' courses use the same skeleton but populate it differently:
- **Book-reading course:** Theme = one book; Module = chapter; Pass may be trivial (one pass per chapter); Lesson = one passage.
- **Grammar course:** Theme = one grammar book; Module = topic; Pass may be "examples pass / rules pass / exercises pass".

---

## Knowledge Map design

### Four-layer drill-down

1. **Dashboard (macro #1)** — Two-axis coverage bar (recite / understand) + milestone list + headline "words you recite but don't yet understand" count. *Primary motivator.*
2. **Map (macro #2)** — Either the Surah heatmap (114 cells) or the Juz' grid (30 cells), toggleable. *Orientation.*
3. **Surah detail (meso)** — Word-by-word map of a single surah with known / learning / unknown highlighting, roots-in-this-surah chip strip, coverage stats, next-step prompt. *Proof of reading.*
4. **Root family tree (micro)** — All forms of a root, each flagged mastered / learning / not-yet-met, with FSRS stability days. *Depth.*

Navigation: Dashboard → Map → Surah → Root. Each drill-down answers a different question; each click has a natural next gesture.

### Three macro-view options evaluated

| View | Cells | Honest about Qur'an volume? | Best for |
|---|---|---|---|
| **Surah heatmap** | 114 | ❌ (Al-Baqara and Al-Kawthar share cell size) | Navigation; feels like the mushaf's table of contents |
| **Juz' grid** (built) | 30 | ✅ (each juz' ≈ 1/30 of reading time) | Truthful coverage claims |
| **Proportional treemap** (parked) | 114, sized by word-count | ✅✅ (most honest) | Visual claim of "how much Qur'an remains"; harder to scan |

**Treemap is parked as a build-time idea** (not prototyped here) — recorded so we don't forget the third honest-view option when the real app is built.

### Prototype: docs/design/mockups/knowledge-map-prototype.html

Self-contained HTML, opens in any browser. Sample student: *Hanzala, age 10, memorized Juz' 30 + Al-Fātiḥa, has studied Lessons 1–2*. Walks through all four views with realistic synthetic data.

What's real in the prototype:
- 114-surah list with English names; Juz' 30 inventory
- Al-Fātiḥa verse/word structure; An-Nās verse/word structure
- kabura root's six forms with real meanings
- Two-layer percentages (~22% recite / ~6% understand) — plausible given Juz' 30 word-token fraction
- Juz' boundaries (Hafs standard) with traditional opening-word names

What's synthetic:
- Per-surah "understand %" numbers (hand-picked for visual interest)
- FSRS stability day counts
- Exact "12,448 words" figure in the headline (directionally right)

What's deliberately missing (belongs to later prototypes):
- Explorer entry point, search, navigation
- Teacher lesson/pass navigation
- Onboarding ("what have you memorized")
- Non-demo surahs beyond Fātiḥa / An-Nās

---

## Deferred / parked

| Idea | Reason parked | Where to find again |
|---|---|---|
| Forgetting as pedagogical event | v2 — capture FSRS data now, surface insights later for advanced students | This doc |
| Contextual shades of roots | Belongs in explanatory notes content, not schema | This doc |
| Teacher presence (live classes) | Optional overlay; post-v1 | This doc |
| Ritual rhythm integration (Adhān-timed reminders) | Dropped — not important for this teacher | This doc |
| **Proportional treemap view** | Build-time decision; record for real app build | This doc + vault session log |
| Multi-teacher course forking / remixing | Post-v1 platform concern | This doc |

---

## Open questions

These remain unresolved and matter before any code. Raised at session wrap-up:

1. **Metric definition for "known."** When is a word "known"? FSRS state = review? First-seen? Teacher-vetted? The load-bearing question for every coverage %. *The dashboard is only as honest as this definition.*

2. **Teacher authoring flow.** We picked the generative loop as the spine workflow, then broadened away from it. We never walked through "you sit down to make Lesson 3 — click-by-click, what happens?" Without this, the spec has no verbs for the teacher.

3. **Synonym/antonym mechanics.** The Pass concept needs help finding synonyms/antonyms of a root. Teacher-curated? LLM-suggested? Corpus-derived? This is a small but real entity relationship to design.

4. **Reconciliation with DATA-MODEL.md.** 24 entities committed this week. This brainstorm implies changes. Three options: (a) amend DATA-MODEL.md in place, (b) write successor DATA-MODEL-v2.md, (c) keep this as separate exploration and reconcile later. Load-bearing because a new Claude session will follow whichever pointer exists.

5. **v1 scope cut.** Three candidate thin slices:
   - **A.** knowledge-map prototype + "what have you memorized" onboarding + existing teacher picker (ships student-facing motivation flywheel atop current work)
   - **B.** new authoring tools for LQWG Adhān 3-pass curriculum, Lessons 8+ (continues the curriculum to deliver)
   - **C.** explorer-only, no course concept (simplest v1 that demonstrates new pedagogy)

---

## Implications for DATA-MODEL.md

Rough deltas — not authoritative, not reconciled yet.

### What survives

- **Layer 1 corpus** (surahs / verses / roots / lemmas / verseWords / verseRoots) — unchanged.
- **Identity** (users / courses / courseMembers) — unchanged.
- **Operations cache** (audioFragments / audioJobs / llmDrafts, added 2026-04-15) — unchanged.
- **Student SRS state** (studentCards / reviewSessions / streaks) — mostly unchanged, but needs to gain a *two-axis* sense of "known" (see below).

### What changes / expands

| Area | Current (DATA-MODEL.md) | New thinking |
|---|---|---|
| Curriculum hierarchy | Flat `lessons` with `lessonNumber` | Theme → Module → Pass → Lesson |
| Root-as-curriculum-unit | `rootCurriculum.introducedInLesson` | Roots re-appear in later passes as synonyms/antonyms; "introduced" is a per-course-per-pass fact |
| Known-state axis | One FSRS card per (user, selection) | Two axes: recitation fluency + meaning comprehension |
| Pre-memorization | Not modeled | New entity: `studentRecitation` (user + surah OR verse-range) |
| Anchor text | `lessons.seedArabic` (single Arabic snippet per lesson) | First-class `anchor` entity with type (phrase / passage / verse) |
| Sentence patterns | Per-root | Per-anchor (patterns are contained in anchors, not roots) |
| Milestones | Implicit | Explicit `milestones` entity tied to modules + decodable surahs |
| Lesson type | Not modeled | `lesson.passType` enum: root / synonym / antonym / story / custom |
| Semantic relations | Not modeled | New entity: `rootRelation` (rootA, rootB, type=synonym/antonym, source=teacher/LLM/corpus) |

### How to reconcile

Three options (open question #4 above). Recommended default: **(c) keep this brainstorm as a separate design exploration**, and when we write the v1-scope spec, explicitly cite which parts of DATA-MODEL.md survive and which are superseded. This preserves the committed work as a reference point and forces the next step to be *deliberate about what's changing*, not sneak-in.

---

## Part 2 — Continued session (2026-04-16 evening)

_Same day, second pass after the initial brainstorm doc + prototype were committed as c405e7be. Resolved four of five open questions and refined the picker UX down to a buildable specification. All decisions captured with the **"why"** so the design doc stands alone as a record of both outcome and reasoning._

### Resolved open questions — summary

| # | Question | Resolution | Why |
|---|---|---|---|
| 1 | Metric definition for "known" | Headline = FSRS `review` (full credit) + `learning` (×0.5). "Mastered" = stability ≥ **21 days** (Anki "mature" standard). | Honest but motivating; 21d prevents the ✓ from being gameable via cramming; weighted counting matches prototype and feels fair |
| 2 | Teacher authoring flow | Form-first picker + 3-phase workflow (picker → lesson notes → audio). Full UI specification below. | Lesson 1 walkthrough showed *forms are the planning unit, verses are the material unit* — today's picker collapses the planning step |
| 3 | Synonym / antonym mechanics | LLM suggests + teacher accepts/rejects + teacher can add custom. Semantic not morphological. No rationale stored on accepted pairs. | LLM gives speed, teacher gives taste; `llmDrafts` audit already covers "why" if needed |
| 4 | Reconciliation with DATA-MODEL.md | **Amend in place** at end of design pass. | Single canonical doc; avoids split-brain schema |
| 5 | v1 scope cut | **Deferred** until rest of design is captured. | Scope decisions benefit from knowing the full aspirational design first; don't cut before you know what you're cutting |

---

### New decisions, with the reasoning preserved

#### Picker UX: form-first navigation

Today's picker groups verses by root, with forms shown as inline metadata. This collapses the *planning step* in the teacher's mental model: "which forms to teach" is the **strategic** decision, "which verses under each form" is the **material** decision. The current UI merges them.

New picker layout:
- **Top nav bar**: Dashboard / Seed Data / other app-level nav (moved off sidebar)
- **Sidebar (dedicated to picking)**: "All roots" → roots → forms under each root (one line per form, clickable to **filter** main area)
- **Main area**: form sections, each with a header (Arabic + translit + gloss + occurrence count + selection status) and verse cards grouped beneath
- **Lesson Budget card** at top of main: Forms 5-7 · Phrases 10-12 · Words 100-120 · Anchors 1-per-root — all shown as **ranges** (honest about soft targets, never hard caps)
- **Form header actions** always available: `+ teaching phrase` · `+ ḥadīth` · `+ duʿā'` · `✗ skip form`
- **Sidebar click = filter** (not scroll). Clicking a form filters main to that form only; clicking "All roots" clears the filter.

_Why_: Teacher's Lesson 1 walkthrough showed "pick forms first (strategic), then pick verses within each picked form (material)." Today's picker forces reconstructing the plan from scattered verses. Form-first surfaces the plan.

#### Form counts: 5-7 per lesson (revised from 3-5 per root)

Target: **5-7 forms per lesson**, regardless of root count (1, 2, or 3 roots).

_Why_: Lesson 1 ended with 8 forms (ilah 3 + kabura 5) — overstuffed in retrospect. "3-5 per root" multiplied uncomfortably with multi-root lessons. Lesson-level cap keeps cognitive load bounded.

#### 3-state verse selector: not-picked / picked / pipeline

Tri-state segmented control (exactly one active) replaces today's two separate buttons `[pick]` + `[pipeline]`.

_Why_: Today's two-button design leaves "a verse could be both" as a possible (incoherent) state. Tri-state enforces mutual exclusivity as a visible invariant.

#### Hidden scores, visible rankings

Scores (hookScore, per-verse) are stored and used to rank forms + verses, but **never displayed** in the UI.

_Why_: Teacher operates on relative order (top-ranked appears first), not absolute numbers. "Is 24.6 a good score?" is cognitive tax that doesn't serve authoring. Keep the scoring machinery; remove the visual noise.

#### Collapsed scoring → `hookScore`

Three Tier 2 subjective scores (`story`, `familiarity`, `teaching_fit`) collapse into one: **hookScore** (0-10).

_Why_: Since scoring details are hidden in the UI, carrying three separate dimensions costs complexity without UI benefit. A single "how sticky/hooky is this verse?" ranks just as well and simplifies the LLM prompt. "Hook" matches the project's established vocabulary (root-as-hook, Adhān-as-hook, "hooks to get into the Quran").

#### `hookReason` stays with the score, not with remark

LLM-produced justification of hookScore lives in `verseScores.hookReason`. Teacher's `selection.remark` is a **separate** artifact (student-audible note, TTS-rendered in SRS).

_Why_: These serve different audiences. `hookReason` is **teacher audit** ("why did LLM rate this 8?"). `remark` is **student consumption** ("here's the note you'll hear about this verse in review"). Conflating them merged a justification document with a teaching artifact. Splitting preserves the honesty of each.

#### TTS preview on every writable field

Every audio-destined field (root note, form note, phrase remark, translation) gets a `[▶ preview audio]` button that plays current text as TTS.

_Why_: Write → preview → edit-if-dry → write again. Catches clinical LLM drafts before they ship to the student's ear. The existing `audioJobs` entity already queues TTS; every text save invalidates + re-queues. This is the "audio-worthiness" quality bar as a tight authoring loop.

#### Phase model: hybrid (cards + tabs + dedicated audio phase)

- **Per-selection work** (remark, anchor flag, picked/pipeline state) lives *inside the verse card* — one card holds that selection's lifecycle.
- **Lesson-level work** (root notes, form notes, lesson hook, publish) lives in **tabs** atop the lesson view.
- **Audio** is its **own top-level phase** with dedicated tools (waveforms, fragment timestamps, translation-boundary matching).

_Why_: Three different cognitive modes. Picker = strategic scanning. Notes = deliberate writing. Audio = technical verification. Cramming audio into cards or tabs would crowd the specialized tools it needs.

#### Skip-form is a first-class action (every form, not just 0-verse)

The `✗ skip form` button is on every form header, regardless of verse count. Skipping with reason is as easy for a 200-verse form as for an empty one.

_Why_: Skip isn't an edge case. Lesson 1 skipped "Allah" with reason "too obvious, student already knows" — that's a real authoring decision. The ilah JSON already captured it via `taught_in_lesson: null` + `notes`. The new UI surfaces skipping as a uniform gesture, not an absence.

#### `formLessonDecision` entity (new)

```
formLessonDecision
  course       → courses
  lesson       → lessons
  form         → forms
  decision     enum     "taught" | "skipped" | "unassigned"
  role         enum     "anchor" | "learning" | null
  reason       string   (optional — for skip)
  updatedBy    → users
  updatedAt    number
```

Unique constraint: (course, lesson, form).

_Why_: Today's `forms.taughtInLesson` is a single number — can't express "taught in L1, then skipped in L8 review." Per-(lesson, form) decision auditing gives the full history, including *why* each skip happened.

#### Rename: `verses` → `phrases` with `type` field

Rename the central text entity. Add `phrases.type` enum: `quranic_verse | teaching_phrase | hadith | dua | ...`

_Why_: Lesson 1 already used a synthetic "teaching phrase" (`site.data.verses.teaching.*`) as a hack on top of the verses namespace. The current schema treats everything as a verse. Renaming makes ḥadīth and duʿā' first-class; `phraseWords` stays linked only to `type = quranic_verse` rows (Kais Dukes morphology doesn't exist for non-Qur'anic text). Long-term: LLM-generated morphology overlay for non-Qur'anic rows is a future-option this rename preserves.

#### `rootRelations` entity (new)

```
rootRelations
  rootA       → roots             the already-taught root
  rootB       → roots             the related root
  type        enum                "synonym" | "antonym"
  source      enum                "llm" | "teacher"
  accepted    boolean             teacher's accept/reject state
  course      → courses
  updatedBy   → users
  updatedAt   number
```

No `note` field.

_Why_: Synonym pass (Lesson 8+) needs to persist "khayr ≈ kabura" so antonym pass (Lesson 9+) can auto-suggest the inverse. Storage is cheap; re-suggesting every time is expensive + inconsistent. Omitting `note` is YAGNI — `llmDrafts` already captures the LLM's original suggestion rationale; if the teacher accepted without editing, that rationale is retrievable.

#### Synonym relation is semantic, not morphological

`rootRelation.type = "synonym"` means **English-meaning neighbor as the teacher declares** (akbar / khayr / akthar), not Arabic-morphology derivative.

_Why_: The user's pedagogy is about meaning, not linguistic kinship. Morphological synonyms of kabura are other kabura-root forms — already in that root's form list. Teacher's pedagogical groupings (e.g., "all the words for 'more' or 'better'") are what matters.

#### Platform generalization — parking lot (for future pass)

The entire workflow is language-agnostic. The *vocabulary* ("root", "surah") is Semitic-Qur'an-specific; the *workflow* (pick forms, select phrases, mark anchors, SRS memory) works for any language learning through a source corpus.

Future vision:
- Tamil-speaker-learning-English could use the same platform with different primitives ("word families" instead of roots, "chapters" instead of surahs)
- `phrases.type` enum already opens this door
- `roots` entity stays generic ("morphological grouping the course teaches by"); each course populates with whatever fits — Arabic roots / English etymological roots / Mandarin radicals / Romance conjugation families
- `surahs` would generalize to "corpus-chapter structure"

_Why_: Future-proofing without over-engineering. The `verses` → `phrases` rename is a down payment on this generalization. Full platform generalization waits until after v1 ships — record as parking lot, don't design it now.

---

### Additional parked items (appended to the initial list)

| Idea | Reason parked | Where to find again |
|---|---|---|
| **Platform generalization** (language-agnostic) | Schema down payment already made via `phrases.type`; full generalization post-v1 | This doc, Part 2 |
| **Phase transition UI specifics** (wizard vs tabs inline vs hybrid transitions) | Hybrid chosen; exact transition gestures (e.g., publish button location) deferred to implementation | This doc, Part 2 |
| **LLM-generated morphology for non-Qur'anic text** | Long-term; required for ḥadīth / spoken-Arabic passes | This doc, Part 2 |
| **Target counts for syn/ant passes** | Current targets (5-7 forms / 10-12 phrases) sized for root-pass lessons; syn/ant passes may need different numbers | This doc, Part 2 |

---

### The "why" trail

Every decision in this doc now carries:
- **What** was decided
- **Why** it was decided (often user's own words preserved)
- **What it implies** for the schema

A future Claude session (or future-you) opening this doc can trace any entity/attribute/flag back to the pedagogical reason behind it. That's the workflow-first + captured-reasoning deliverable.

---

## Next steps

_Updated 2026-04-16 evening._

1. **Pivot to student-side workflow** next session (after compaction) — Day 1 onboarding verbs, explorer detail, knowledge-map schema, milestones, SRS card mechanics.
2. **Resolve Q#5 (v1 scope cut)** once student-side is captured.
3. **Amend DATA-MODEL.md in place** — one consolidating sweep across all deltas from this brainstorm + Part 2, scoped to the chosen v1 slice.
4. **Invoke writing-plans skill** on the amended schema to produce an implementation plan.
5. **Execute** — first phase of the new scope begins.

Phase 1 as previously described in [CURRENT-STATE.md](../CURRENT-STATE.md) remains **on hold** until v1 scope is picked. Its byte-for-byte migration acceptance criteria is still valid under any scope but may not be the right *starting* work depending on which slice is chosen.

---

## References

- [Prototype (HTML, interactive)](mockups/knowledge-map-prototype.html)
- [DATA-MODEL.md](../DATA-MODEL.md) — existing 24-entity schema
- [CURRENT-STATE.md](../CURRENT-STATE.md) — session-continuity pointer
- [FORMS-LEMMAS-ROOTS.md](../FORMS-LEMMAS-ROOTS.md) — conceptual foundation (unchanged by this session)
- [Vault: workflow-first-design](~/Dropbox/Siraj/Projects/siraj-claude-vault/cross-project/workflow-first-design.md) — the methodology
- [Vault: session log 2026-04-16](~/Dropbox/Siraj/Projects/siraj-claude-vault/projects/learn-quran-without-grammar/sessions/2026-04-16%20pedagogy-first-redesign.md) — this session's entry
