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

## Next steps

This is a brainstorm doc, not a spec. To move forward:

1. **Resolve the five open questions** — at minimum #1 (metric definition) and #5 (v1 scope). The other three can be tackled incrementally.
2. **Pick a v1 scope slice** (A, B, or C above, or a hybrid).
3. **Write a successor spec** that reconciles this brainstorm with DATA-MODEL.md for the chosen v1 scope.
4. **Invoke the writing-plans skill** on that spec to produce an implementation plan.
5. **Execute** — then Phase 1 (or whatever replaces it) begins.

Until #2 is picked, Phase 1 as currently described in [CURRENT-STATE.md](../CURRENT-STATE.md) is **on hold** — its acceptance criteria (byte-for-byte migration of 10 root JSONs) is still valid under any scope, but may not be the right *starting* work under Scope A or C.

---

## References

- [Prototype (HTML, interactive)](mockups/knowledge-map-prototype.html)
- [DATA-MODEL.md](../DATA-MODEL.md) — existing 24-entity schema
- [CURRENT-STATE.md](../CURRENT-STATE.md) — session-continuity pointer
- [FORMS-LEMMAS-ROOTS.md](../FORMS-LEMMAS-ROOTS.md) — conceptual foundation (unchanged by this session)
- [Vault: workflow-first-design](~/Dropbox/Siraj/Projects/siraj-claude-vault/cross-project/workflow-first-design.md) — the methodology
- [Vault: session log 2026-04-16](~/Dropbox/Siraj/Projects/siraj-claude-vault/projects/learn-quran-without-grammar/sessions/2026-04-16%20pedagogy-first-redesign.md) — this session's entry
