# Current State — Lesson Authoring Redesign Session

_Session handoff document. **Read this first** when starting a new session. Last updated 2026-04-11 (evening — session 2 close)._

---

## 🔖 Session close handoff (2026-04-11 evening)

Session 2 ended with the teacher on a phone, mid-design, needing to step away. **Read this block first** to pick up. It's the authoritative "where to resume" marker.

### What was locked in Session 2

**Q1 through Q29 — 29 architectural decisions.** Captured as D6–D22 in the "Session 2 update" section below. The complete list covers: picker rewrite as URL-accessible phone app, PAT auth + localStorage, one shared picker + per-lesson `picker-config.json`, central verse store at `_data/verses/{surah}.json`, thin root JSONs at `_data/roots/{slug}.json`, `lesson_use` single-object schema with uniform `arabic`/`english`/`notes` field names at every level (D21), teaching phrases via synthetic refs, save flow Option C + inbox pattern, anchor-per-root rule, per-root density rule, form-explanation extraction, Lesson 1 as the migration test case (pivot from Lesson 2), and `picker-config.json` as a lesson control panel (D22) with the 8-field schema.

**Glossary amendments landed** in `docs/GLOSSARY.md` (commit `f8ab6af`): anchor-per-root + density rule + rationale.

**All 7 issues** from the Lesson 1 field-by-field analysis are closed.

### What's still open (in the order the teacher should work through)

1. **Inbox file schema** — what exactly goes into `.workspace/picker-inbox/lesson-NN-{timestamp}.json` when the picker hits Save. Choices: full snapshot of touched verses (recommended), delta, or assignment-only. I was about to ask Q30 on this when the session closed.

2. **`tools/apply-picker-inbox.py` behavior** — how the desktop apply script merges inbox files into `_data/verses/*.json`. Conflict policy (last-write-wins recommended), commit message style, atomicity, how it handles the picker-config.json updates from D22's control panel.

3. **Jekyll exclude rules** — what patterns go into `_config.yml` to keep Jekyll from treating `picker-config.json`, `state.json`, `audio-plan.yaml`, `.workspace/picker-inbox/`, and new `_data/` files as renderable pages. Today `f8a89f2` only excluded `lessons/*/picker.html` — need a broader rule.

4. **Migration script design** — one-shot Python script that reads today's `lessons/lesson-01-allahu-akbar.md` + `docs/roots/ilah.json` + `docs/roots/kabura.json` + `tools/lesson-audio/lesson-01.yaml` + `docs/selections/lesson-01.md` and writes out the new layout (`_data/verses/*.json`, `_data/roots/*.json`, `_data/surahs.json`, `lessons/lesson-01-allahu-akbar-copy/picker-config.json`, `lessons/lesson-01-allahu-akbar-copy/index.md`, `lessons/lesson-01-allahu-akbar-copy/audio-plan.yaml`). Staged or all-in-one? Idempotent?

5. **Then: execute the migration** and commit the result. Lesson 1 copy lives at `lessons/lesson-01-allahu-akbar-copy/` in the new architecture. Production `lessons/lesson-01-allahu-akbar.md` is untouched.

6. **Then: build the shared picker app** (JS + HTML + Jekyll page at `/picker/`) against the migrated Lesson 1 copy.

7. **Then: build `tools/apply-picker-inbox.py`** and test a save→apply round-trip.

8. **Then: render Lesson 1 copy** from the new data layout end-to-end and visually compare against the production page. If the rendered copy matches what's live, the architecture is validated.

9. **Then (if validation passes): production cutover plan** — URL redirect from `/lessons/lesson-01-allahu-akbar.html` to the new clean URL, swap production to the new layout.

10. **Deferred: minimal redesign docs** under `docs/redesign/`. The teacher's original intent was small cross-linked files (≤250 lines each) for the next agent to Read. We agreed to defer this until after the Lesson 1 migration proves the design works — then write docs informed by actual experience, not speculation.

### What has NOT been built yet

**Nothing.** Session 2 produced only documentation — glossary amendments and decisions in CURRENT-STATE.md. No code, no infrastructure, no migration. The Lesson 1 copy folder doesn't exist yet. `_data/verses/` doesn't exist. The picker doesn't exist. `apply-picker-inbox.py` doesn't exist.

The first concrete code task will be the migration script (item 4 above), and it will only be written after items 1–3 are locked.

### Parked (not forgotten, explicit)

- **Three-tier scoring (Q6)** — revisit when Lesson 3 starts. Lesson 1 migration uses flat 8-dim scoring unchanged.
- **Tamil translation storage** — revisit at render time. Lesson 1 copy keeps Tamil prose inline as today.
- **2 orphan `sentence_patterns` from `ilah.json`** (`إِلَٰهَهُ هَوَاهُ`, `أَإِلَٰهٌ مَعَ اللّٰه`) — flag in `.workspace/lesson-01-migration-flags.md` for teacher review at computer time; don't silently migrate into synthetic verses.

### Branch + commits

- **Branch:** `claude/plan-workspace-tasks-xGZBI` (pushed to origin after each commit).
- **Session 2 commits on the branch:**
  - `f8ab6af` — `GLOSSARY: anchor-per-root + per-root density rule`
  - `b3071b4` — `CURRENT-STATE: lock Q1-Q23 decisions + Lesson 1 pivot`
  - `2233668` — `CURRENT-STATE: add D21 (uniform arabic/english/notes naming)`
  - `45ee467` — `CURRENT-STATE: close Lesson 1 Issues #1 and #6`
  - (this commit) — `CURRENT-STATE: add D22 + session close handoff`

### To resume

Open the picker on your phone when rested. Tell the agent: *"Read `.workspace/CURRENT-STATE.md` — start from the session close handoff block. Ask me Q30 about the inbox file schema and we'll pick up from there."* The agent should NOT try to re-derive the locked decisions — they're in D6–D22.

---

## Status at a glance

Two sessions deep into the architectural rethink of the lesson authoring workflow. Session 1 produced **D1–D5** (glossary, folder convention, root-JSON-as-ledger). Session 2 (2026-04-11 continued) produced **Q1–Q23 = D6–D20**, plus amendments to D3 (glossary pedagogy rules) and D4 (verses moved to a central store, not root JSONs). Goal is unchanged: move from "LLM-in-every-step" to a JSON-first, script-driven pipeline that lets the teacher work on a phone.

**Still no code landed.** All work remains architectural. But Session 2's decisions are now locked tightly enough that the next step is migration code, not more design. **Lesson 1 is the migration test case** — pivoted from Lesson 2 (Lesson 2 was mid-flight and wouldn't stress-test the new architecture; Lesson 1 is the reviewed, published, perfected ground-truth lesson).

See "**Session 2 update**" section below for the authoritative current state. Older sections (D1–D5, Folder convention, Open questions, Next action) are historical context — they describe how we got here, not current state. Some of them are superseded.

---

## Lesson ground truth

- **Lesson 1** — ✅ Published, live, students using it. Currently at `lessons/lesson-01-allahu-akbar.md` (single file — pre-folder convention). Per D4+D5, will eventually be promoted to `lessons/lesson-01-allahu-akbar/index.md` as the conformance regression test for migration tooling.
- **Lesson 2** — 🚧 **Active. At phrase-picking.** Has a picker at `lessons/lesson-02-shahida/picker.html` (promoted out of `.claude/tmp/` in commit `f8a89f2`). Remaining work: finish picking phrases, edit explanation text, run audio pipeline. **This is the lesson the redesign exists to unblock.**
- **Lesson 3** — ⏳ Not started.

---

## Recent git history (2026-04-11)

**`origin/main` tip:** `f0be476`
**Session branch tip:** `eec780a` (on `claude/show-recent-commits-9vRco`, rebased onto `f0be476` + session commits)

Commits that landed on `main` during this session (in order):
- `6424e53` — Lesson 2 selections (shahida root) + HTML picker template
- `c264808` — **ADR-009**: local root-inventory pipeline (offline morphology + Tanzil + Saheeh)
- `e4de2b6` — hackathon research for Quran.com API
- `d252042` — docs/prompts: align picker_generator.md and lesson_authoring_workflow.md with ADR-009
- `f8a89f2` — **folder-per-lesson convention**: `lessons/lesson-NN-slug/` directory for working files
- `f0be476` — pre-commit hook refactored as tracked, self-installing layer

Session commits layered on top:
- `.workspace/CURRENT-STATE.md` (this file — rolling session log)
- `docs/GLOSSARY.md` (shared vocabulary)
- `CLAUDE.md` — Collaboration Conventions section (one-question-at-a-time adaptive questioning)

---

## Ratified decisions

### D1 — Lesson 2 is the priority, not Lesson 3
The architectural rethink exists to unblock Lesson 2's phrase-picking. The earlier drafts of `docs/prompts/picker_generator.md` and `docs/prompts/lesson_authoring_workflow.md` flipped L2 and L3 (they treated Lesson 3 / rasul.json as the primary test case) — that framing must be reversed when those prompts are rewritten.

### D2 — Nothing in lesson state directories is gitignored
Originally phrased about `.workspace/`, now generalizes to any location that holds lesson state: committed to git. Rationale: multi-device work via git as the sync layer + phone workflow where HTML files are source (can't regen locally). The earlier fear about `.gitignore` conflicts with the other machine was based on a misread of "workspace files" — `.workspace/` never existed on the other machine. The other machine has in fact touched `.gitignore` independently (added `tools/.venv/` in `f0be476`) without conflict.

### D3 — Glossary established (and amended — 2026-04-11 afternoon)
See `docs/GLOSSARY.md`. Key terms:
- **Seed phrase** (renamed from "target phrase") — the daily-prayer phrase the lesson grows from. Level 0, exactly one per lesson.
- **Root** → **Form** → **Anchor phrase** (Level 1, exactly one per form, `is_anchor: true` on a learn entry)
- **Learn phrases** — exactly 5 per lesson, no flexibility; anchors are a subset
- **Practice / Recall / Pipeline phrases** — additional sections
- Data-model sections: `learn` / `practice` / `recall` / `pipeline` / `none`

**Amendment 2026-04-11:** "target phrase" → "seed phrase" throughout. Code field: `seed_phrase`.

### D4 — Root JSON is the single verse-state ledger
The root JSON (`docs/roots/{root}.json`) is the authoritative store for verse state. Per-lesson folders hold only non-verse-state artifacts. Kills drift across the 5 places verse state used to live (`docs/roots/*.json`, `docs/selections/lesson-NN.md`, `docs/selections/pipeline.md`, picker `LESSON_CONFIG`, `tools/lesson-audio/lesson-NN.yaml`).

**Implications:**
- Each verse entry in the root JSON gets a `lesson_uses` array that records which lessons touched it, in which section (learn/practice/recall/pipeline), whether it was the anchor, and teacher remarks/priority.
- `docs/selections/lesson-NN.md` becomes a *generated view* of the ledger, not a hand-authored source. Current files can eventually be deleted.
- `docs/selections/pipeline.md` becomes a query over the ledger. Same fate.
- The picker reads from root JSONs to build candidates and writes verse-state changes directly back.
- Multi-root save atomicity: each save = one git commit. Git is the transaction boundary.

**Open sub-question:** exact schema of `lesson_uses` — single current state per verse, or historical array of all touches? Defer to next session.

### D5 — Root JSON also holds root-level and form-level explanations (English-only)
The root JSON holds teacher-authored prose explanations:
- **Root explanation** — one per root, reused automatically by every lesson that teaches or recalls this root.
- **Form explanation** — one per form, attached to each entry in the `forms` array.

**Both are English-only.** Translations (Tamil for now, potentially others later) are auto-generated downstream, optionally reviewer-approved, and stored elsewhere (exact location TBD — not the root JSON). Translations must NOT clutter the root JSON.

**Big win:** the published `lessons/lesson-NN-slug/index.md` becomes a *thin template* that pulls root and form explanations from the root JSONs at render time. The teacher authors each root explanation *once*. Recall lessons automatically inherit it. No copy-paste, no drift between lessons.

**Schema sketch:**
```json
{
  "root": "شهد",
  "transliteration": "shahida",
  "explanation": "The root ش ه د conveys bearing witness — being present, perceiving, and then testifying to what one has seen. It is not detached observation but engaged attestation.",
  "forms": [
    {
      "arabic": "شَهِدَ",
      "meaning": "he testified",
      "explanation": "شَهِدَ is the simplest form of the root — the act of witnessing or testifying..."
    }
  ],
  "verses": [
    {
      "ref": "3:18",
      "arabic_full": "...",
      "translation": "...",
      "scores": { ... },
      "lesson_uses": [
        { "lesson": 2, "section": "learn", "is_anchor": true, "remark": "...", "teacher_priority": 5 }
      ]
    }
  ]
}
```

---

## Session 2 update (2026-04-11 continued) — 23 decisions locked

This section is the **authoritative current state**. Decisions below override anything in older sections.

### Amendments to D1–D5

- **D3 (glossary) amended** — Anchor is **per root, not per form** (Lesson 1's actual practice). The "exactly 5 learn phrases" rule is replaced with a **per-root density rule**: 1 anchor + 2–3 learn per root, 5 practice mixed, 0–3 recall from earlier lessons (L2 onwards), target 10–15 items total, hard cap 15. Captured in `docs/GLOSSARY.md` Constraints section with rationale; committed as `f8ab6af`.
- **D4 amended** — Verses no longer live in root JSONs. A **central verse store** at `_data/verses/{surah}.json` (Jekyll-native `_data/` location) holds all verse state. Root JSONs become thin teacher-authored metadata at `_data/roots/{slug}.json`. See D10.
- **Folder convention (from `f8a89f2`) amended** — The `picker.html` file inside each lesson folder is replaced with `picker-config.json`. One shared picker app, per-lesson config. See D9.

### New decisions D6–D20

**D6 — Picker rewrite is part of this redesign** (Q1). Current `lessons/lesson-02-shahida/picker.html` is an artifact of the pre-redesign workflow; it will be replaced by a shared app.

**D7 — Picker is a phone-accessible URL, not local-only** (Q1 follow-up). Teacher opens `https://…/picker/?lesson=NN` on phone, picks verses, hits Save.

**D8 — Auth via GitHub PAT in browser localStorage** (Q2). One-time 5-minute setup: create PAT at github.com, paste into picker, picker remembers it. PAT can be scoped narrowly (see D17).

**D9 — One shared picker app + per-lesson `picker-config.json`** (Q3). The picker is a single JS app under `/picker/` on GitHub Pages. Each lesson folder has a `picker-config.json` (not a full `picker.html`). Bug fixes apply to all lessons at once. Amends D4's folder convention.

**D10 — Central verse store + thin root JSONs** (Q7, Q8, Q9). Verses live in `_data/verses/{surah}.json` (per-surah files, keyed by ref like `"59:22"`). Root JSONs at `_data/roots/{slug}.json` hold only teacher-authored metadata. Both under `_data/` so Jekyll Liquid templates can read them at build time (`site.data.verses["003"]["3:18"]`). Enables D5's "thin `index.md` template" story without custom Jekyll plugins.

**D11 — Verse entry schema (tightened)** (Q10, Q11, Q12). Dropped all derived fields (`word_count`, `juz`, `surah_name`, `total_learn`, `total_practice`, `cross_roots`). Moved `arabic_fragment` inside `lesson_use` (it's lesson-specific, not verse-intrinsic). Dropped legacy cruft (`verified`, `type`, `pattern`, `previously_used_in_lesson_v1`, `audio_downloaded`, `reciter`, `audio_fragment` — audio metadata lives in `audio-plan.yaml`). Kept `roots[]` and `forms[]` as bounded arrays — conscious 1NF denormalization for read performance (picker's primary query is "filter verses by root").

**D12 — `lesson_use` single nullable object** (Q4, Q5, Q6, Q19, Q20). Shape:
```json
"lesson_use": {
  "lesson": 2,
  "section": "learn",
  "is_anchor": true,
  "order": 1,
  "arabic_fragment": "…",
  "hook": "Ibrāhīm's challenge to his own father…",
  "rejection_reason": null
}
```
Sections: `learn | practice | recall | pipeline | rejected`. `null` means untouched. **No verse reuse** — a verse has at most one `lesson_use` in its lifetime. Recall reuses the *form*, not the verse (recall lessons find a different verse containing the same form). Pipeline verses can be promoted to learn/practice later, but learn/practice/recall verses are locked.

**D13 — Root JSON schema (slim)** (Q16). `_data/roots/{slug}.json`:
```json
{
  "slug": "shahida",
  "root_word": "شَهِدَ",
  "transliteration": "shahida",
  "three_letter": "ش ه د",
  "three_letter_english": "shin ha dal",
  "introduced_in_lesson": 2,
  "explanation": "…",
  "forms": [
    { "form_arabic": "…", "transliteration": "…", "category": "…", "gloss": "…", "explanation": "…" }
  ]
}
```
Dropped: `corpus_url`, `fetched_date`, `total_occurrences_in_quran`, per-form `count` / `taught_in_lesson` / `taught_role`, `verses[]` (moved to central store), `sentence_patterns[]` (Q16 — Issue #1 still open, may re-add to absorb orphaned content). `category` kept — grammar terms are allowed in teacher tooling, just not in published lesson pages.

**D14 — `_data/surahs.json` lookup** — small table mapping surah number → name, revelation type, juz boundaries. Used at render time by Liquid to avoid denormalizing `surah_name` into every verse entry.

**D15 — Teaching phrases use synthetic refs** (Q23 / Lesson 1 analysis Issue #5). Non-Qur'anic teaching phrases (e.g., Lesson 1's كَبُرَ anchor) get synthetic refs like `"teaching:kabura:anchor-01"` and live in `_data/verses/teaching.json` using the same verse entry schema. Picker, `lesson_use`, and render code treat teaching phrases identically to Qur'anic verses.

**D16 — Save flow Option C: explicit Save + localStorage draft** (Q13). Picker accumulates changes in `localStorage["lqwg-picker-lesson-NN-draft"]`. A Save button commits all changes. If the tab dies mid-session, picker restores the unsaved draft on reload.

**D17 — Inbox pattern for picker writes** (Q14, Q15). Picker writes one file per save: `.workspace/picker-inbox/lesson-NN-{timestamp}.json`. Simple PAT + `PUT /repos/.../contents/...` — ~15 lines of picker JS. A desktop script `tools/apply-picker-inbox.py` (to be built) reads inbox files, applies changes to `_data/verses/*.json`, deletes the inbox file, and commits. Teacher runs it between picker sessions. Rejected alternatives:
- **Direct Trees API multi-file commit** — too much picker JS for phone-first simplicity.
- **InstantDB / Convex / other DB** (Q15) — would break git-as-source-of-truth, break Jekyll `_data/` render path, add vendor dependency, add sync pipeline. Not simpler overall.

**D18 — Anchor per root, not per form** (Q21 / Issue #7). Captured in glossary, committed as `f8ab6af`. Picker UI enforces radio-select at the root level, not the form level.

**D19 — Per-root density rule** (Q22 / Issue #7). Captured in glossary, committed as `f8ab6af`.

**D20 — Form explanations extracted per form** (Q18 / Issue #2). When migrating Lesson 1, each form's bullet-point mini-explanation (currently embedded inside the root-level prose) becomes a standalone `forms[].explanation`. The root `explanation` keeps only the framing paragraphs. Gives D5 its reuse benefit so recall lessons can pull a single form's explanation without dragging the whole root prose.

**D21 — Uniform field names across all levels** (Q26). The same three core field names are used at every level: **`arabic`** / **`english`** / **`notes`**. At each level they mean "the Arabic text at this scope", "the English version at this scope", "the teacher prose at this scope". Level-specific metadata (`transliteration`, `category`, `order`, `scores`, etc.) lives as extra fields alongside.

This amends D11, D12, and D13 with renames:

| Level | Old name | New name |
|---|---|---|
| Root | `root_word` | `arabic` |
| Root | `explanation` | `notes` |
| Form | `form_arabic` | `arabic` |
| Form | `gloss` | `english` |
| Form | `explanation` | `notes` |
| Verse | `arabic_full` | `arabic` |
| Verse | `translation` | `english` (raw Saheeh translation from ADR-009 source) |
| `lesson_use` | `arabic_fragment` | `arabic` |
| `lesson_use` | `hook` | `notes` |
| `lesson_use` | *(new)* | `english` (teacher's trimmed fragment English, was previously at verse level) |

`score_notes` stays as a separate verse-level field for now (scoring-specific reasoning vs general verse observations). Revisit if redundant.

Pattern-note absorption (Issue #1) is simplified by D21: pattern notes fold into `lesson_use.notes` of the verse that teaches the pattern. The 3 patterns in `ilah.json` that already have teaching verses (`لَا إِلَٰهَ إِلَّا` in 59:22, `إِلَٰهٌ وَاحِدٌ` in 2:163, `مِنْ إِلَٰهٍ غَيْرُهُ` in 7:59 pipeline) fold into those verses' notes during migration. The 2 orphan patterns (`إِلَٰهَهُ هَوَاهُ`, `أَإِلَٰهٌ مَعَ اللّٰه`) — teacher doesn't remember adding them, possibly clerical mistakes from a previous agent — go into `.workspace/lesson-01-migration-flags.md` for review at computer time, not silently migrated into synthetic verses.

**D22 — `picker-config.json` as lesson control panel, 8 fields** (Q28, Q29). The per-lesson picker config file holds all lesson-level metadata the teacher wants to edit from their phone (not just picker-logic fields). Shape:

```json
{
  "lesson_number": 1,
  "slug": "lesson-01-allahu-akbar",
  "title": "Lesson 1: Allāhu Akbar",
  "description": "Two root words behind Allāhu Akbar — إِلَٰه (god) and كَبُرَ (greatness).",
  "seed_phrase": {
    "arabic": "اللهُ أَكْبَرُ",
    "english": "Allah is Greater"
  },
  "current_roots": ["ilah", "kabura"],
  "recall_roots": [],
  "targets": {
    "anchor": 2,
    "learn": 5,
    "practice": 5,
    "recall": 0
  }
}
```

Design notes:
- **Option B (lesson control panel)** chosen over Option A (pure picker). Teacher's framing: *"this picker is not just a picker; this is the lesson preparation kind of place for me as a teacher."* Teacher edits title, description, seed phrase, targets directly from the phone picker. `index.md` frontmatter becomes a generated view of `picker-config.json`.
- **`targets.anchor` is split out** from `targets.learn` even though in storage anchors are still `section: "learn"` with `is_anchor: true` (glossary constraint #3 unchanged). The split exists only in the picker UI and the target counts — the picker tracks `Anchor: 2/2` separately from `Learn: 5/5` for teacher clarity.
- **`seed_phrase` is now a nested object** `{ arabic, english }` per D21 uniform naming. Seed phrase Arabic + English display at the top of the picker for teacher orientation, and at the top of the published page via Liquid include from picker-config.
- **`sentence.md` is REMOVED** from the folder convention (amends D9 / D4's folder list from `f8a89f2`). It was my earlier proposal for the seed-phrase prose, but Q27 dropped inline structural narrative including the seed-phrase opening paragraph. Nothing left for `sentence.md` to hold.
- **Lesson 2 example**: `current_roots: ["shahida"]`, `recall_roots: ["ilah", "kabura"]`, `targets: { anchor: 1, learn: 3, practice: 5, recall: 2 }` = 11 items total, within 10-15 sweet spot.
- **What's NOT in the config**: form-level filtering (picker shows all forms of current_roots, teacher picks), the density rule itself (global in glossary), state tracking (stays in `state.json`).

### Parked for later

- **Three-tier scoring (Q6)** — deferred until Lesson 3 starts. Flat 8-dim scoring stays unchanged for the Lesson 1 migration.
- **Tamil translation storage** — deferred until render time. The Lesson 1 copy keeps existing Tamil prose inline (as today's lesson does) for the architecture test.
- ~~**Lesson 1 Issue #1 — `sentence_patterns` fate**~~ — **resolved** in D21. The 3 patterns with existing teaching verses fold into those verses' `lesson_use.notes`; the 2 orphan patterns are flagged in `.workspace/lesson-01-migration-flags.md` for teacher review at computer time.
- ~~**Lesson 1 Issue #6 — section intro prose**~~ — **resolved** (Q27): teacher chose to drop these inline narrative paragraphs entirely. The migrated lesson template becomes genuinely thin — just section headings + data-driven content. The opening "You've met all 8 words…" paragraph and similar structural narrative simply go away in the copy. If they're missed later, they can be added back as a separate refactor; for now the simplification wins.

### Lesson 1 migration plan (WIP)

Target: `lessons/lesson-01-allahu-akbar-copy/` as a full instantiation of the new architecture. Production (`lessons/lesson-01-allahu-akbar.md`) stays untouched. Audio assets at `assets/audio/lessons/lesson-01/` are shared (no regeneration).

Input files (all read, fully analyzed in this session):
- `lessons/lesson-01-allahu-akbar.md` — published lesson page (652 lines)
- `docs/roots/ilah.json` (654 lines), `docs/roots/kabura.json` (514 lines)
- `docs/selections/lesson-01.md` (133 lines) — selection log; becomes a generated view in the new layout
- `tools/lesson-audio/lesson-01.yaml` (214 lines) — audio plan

Mapping is mostly mechanical once Issues #1 and #6 are resolved. The teaching phrase (كَبُرَ anchor) gets a synthetic ref per D15.

### Remaining work (ordered)

1. Resolve Issues #1 and #6 (one at a time, in next exchange)
2. Design `picker-config.json` schema
3. Design inbox file schema + `apply-picker-inbox.py` behavior
4. Decide Jekyll exclude rules for the new lesson folder contents
5. Write migration script: one-shot Python, reads today's files, produces `_data/verses/`, `_data/roots/`, `_data/surahs.json`, and `lessons/lesson-01-allahu-akbar-copy/` (with `picker-config.json`, `audio-plan.yaml`, `sentence.md`, `index.md`)
6. Infrastructure: `_data/` dirs, Jekyll excludes, `_data/surahs.json` seed data
7. Run migration, commit result
8. Build the shared picker app at `/picker/` on Jekyll
9. Build `tools/apply-picker-inbox.py`
10. Render Lesson 1 copy end-to-end; compare against production page visually
11. If test passes: plan production cutover (redirect `/lessons/lesson-01-allahu-akbar.html` → `/lessons/lesson-01-allahu-akbar-copy/`, then swap names)
12. If test passes: minimal redesign docs (revisit doc structure with teacher first)

### 23 question-answer locks from session 2

| # | Decision | Answer |
|---|---|---|
| Q1 | Picker rewrite part of redesign? Phone URL? | Yes + yes |
| Q2 | PAT-based save? | Yes |
| Q3 | One shared picker vs per-lesson HTML? | One shared |
| Q4 | `lesson_use`: single object or array? | Single (X) |
| Q5 | `lesson_use` fields OK? `deferred` → `rejected` | OK + rename |
| Q6 | Keep `order` field? | Yes |
| Q7 | Central verse store vs duplicate across roots? | Central |
| Q8 | Verse store: one big file / per-surah / per-verse? | Per-surah |
| Q9 | Root files: per-root or one collapsed? | Per-root |
| Q10 | Verse entry schema OK? | OK with tightening |
| Q11 | Tightened schema (drop derived, move arabic_fragment)? | Yes |
| Q12 | Strict 3NF (junction tables) or pragmatic denorm? | Pragmatic |
| Q13 | Save flow A/B/C? | C (explicit Save + localStorage) |
| Q14 | Inbox pattern or Trees API? | Inbox |
| Q15 | Use InstantDB/Convex to simplify? | No (would break arch) |
| Q16 | Root JSON schema OK? Keep `category`? Drop `sentence_patterns`? | Yes + keep + drop |
| Q17 | Execution order: state doc → migrate → picker → docs? | Yes, with Lesson 1 as target |
| Q18 | Form explanations: extract per form or leave embedded? | Extract |
| Q19 | Rename `remark` → `hook`? | Yes |
| Q20 | `rejection_reason` inside `lesson_use`? | Yes |
| Q21 | Anchor per root (not per form)? | Yes — glossary was wrong |
| Q22 | Per-root density rule? | Yes |
| Q23 | Teaching phrases: synthetic refs in `teaching.json`? | Yes |

### Still open from Lesson 1 analysis

- **Issue #1** — `sentence_patterns` content (5 entries in ilah.json) — where does it go?
- **Issue #6** — section intro prose ("You've met all 8 words…") — where does it live?

---

## Folder-per-lesson convention (decided on main as `f8a89f2`, absorbed into redesign)

Every lesson lives in `lessons/lesson-NN-slug/`:

- `index.md` — published lesson page (Jekyll-idiomatic; clean URL `/lessons/lesson-NN-slug/`)
- `sentence.md` — the seed phrase for this lesson
- `picker.html` — verse selection UI
- `state.json` — stage tracker (e.g., `picker-generated`, `selection-complete`, `audio-built`, `published`)
- `audio-plan.yaml` — reciter + voice choices per phrase
- `audio-state.json` — audio introspection output
- `build-report.json` — audio build result

**What the folder does NOT hold:**
- `selection.json` as source of truth (the root JSONs are the source of truth per D4)
- Root explanations or form explanations (they live in root JSONs per D5)
- Root JSONs themselves (they stay at `docs/roots/*.json` — cross-lesson shared resource)

**Known Jekyll concern:** `f8a89f2` added an exclude for `lessons/*/picker.html` only. Other files (`state.json`, `audio-plan.yaml`, `audio-state.json`, `build-report.json`, `sentence.md`, `roots.json`) will need similar excludes when they land, or a broader `lessons/*/*.{json,yaml,html}` rule. Not yet addressed.

### Confirmed by the teacher

- **Q1 = B** — published `.md` goes at `lessons/lesson-NN-slug/index.md` (Jekyll-idiomatic, clean URL, folder encloses everything)
- **Q2 = A** — unify: Lesson 1 gets promoted to folder convention (`lessons/lesson-01-allahu-akbar/index.md`) as part of the conformance regression migration. No lesson stays as a single `.md` file. One rule, no special cases.

---

## Open questions (not yet answered)

These were asked in previous turns and either superseded, deflected, or parked. All remain open unless noted.

1. **`docs/selections/lesson-02.md` fate** *(Q3, auto-resolved by D4)* — becomes a generated view of the ledger; the file gets deleted when the regenerator lands.

2. **`docs/roots/*.json` location** *(Q4, implicit agreement)* — root JSONs STAY where they are. They are cross-lesson shared resources, not per-lesson state. No movement planned. Confirm if disagreement.

3. **`.workspace/` directory fate** *(Q5)* — not explicitly answered. Current assumption: kept for cross-session scratchpads like this handoff file. Retire later if not useful.

4. **Three-tier scoring** *(Q6, unread by teacher)* — proposal is on the table: decompose `docs/SCORING.md`'s 8 dimensions into deterministic (runs in `build-root-inventory.py`), LLM-subjective (on-demand via `score-llm`), and teacher-priority (in the picker). New deterministic signals proposed. New `teacher.priority` tier. Nested `scores` schema by tier with `version` + `computed_at`. **Teacher has not read the comparison delta yet.** Must revisit.

5. **Worship Connection sub-decision** *(Q7)* — static-config lookup or keep as LLM? Depends on Q6.

6. **`lesson_uses` schema design** *(arose from D4)* — single current-state object per verse, or an array of historical uses? Multi-lesson verse handling.

7. **Tamil translation storage** *(arose from D5)* — root JSON is EN-only. Translations are auto-generated. Where do they live after generation? Candidates: `docs/translations/roots/{root}.ta.json` sidecar, baked into `lessons/lesson-NN-slug/` at render time, elsewhere.

8. **Lesson folder Jekyll excludes** — broader exclude rule needed for `state.json`, `audio-plan.yaml`, etc.

9. **`lesson_uses` write atomicity** — a picker save touches multiple root JSONs. Confirmed git-commit-as-transaction is acceptable; no explicit file-level atomicity needed.

---

## Proposed redesign structure (when we get there)

Principle (per teacher): each file fits in one Read call (~8K tokens, ~250 lines). Cross-linked wiki style.

```
docs/redesign/
├── README.md                        ← index / TOC / reading order
├── 01-vision.md
├── 02-current-state.md              ← will subsume this file
├── 03-glossary.md                   ← stub → docs/GLOSSARY.md
├── 04-principles.md
├── 05-lesson-directory-layout.md    ← lessons/lesson-NN-slug/ convention (D4+f8a89f2)
├── 06-root-json-schema.md           ← ledger schema (D4 + D5)
├── 07-scoring.md                    ← three-tier (when ratified) + mapping of current 8 dims
├── 08-stages-overview.md
├── 09-stage-0-init.md
├── 10-stage-1-picker.md
├── 11-stage-2-select.md
├── 12-stage-2.5-generate-log.md
├── 13-stage-3-audio-plan.md
├── 14-stage-4-introspect.md
├── 15-stage-5-build.md
├── 16-stage-6-verify.md
├── 17-stage-7-publish.md
├── 18-save-json.md
├── 19-mobile-story.md
├── 20-llm-boundaries.md
├── 21-migration-lesson-02.md        ← active migration (the unblocking case)
├── 22-migration-lesson-01.md        ← regression / conformance test
├── 23-decisions-log.md              ← D1, D2, D3, D4, D5 + future
├── 24-open-questions.md
└── 25-implementation-roadmap.md
```

**Existing files to delete** once redesign lands:
- `docs/prompts/picker_generator.md`
- `docs/prompts/lesson_authoring_workflow.md`

Both are drafts from an earlier snapshot and contain path assumptions (`.workspace/lesson-NN/*`) that are wrong per D4 and the f8a89f2 folder convention.

---

## Next action for a new session

### Read these, in order:

1. **This file** (`.workspace/CURRENT-STATE.md`)
2. `docs/GLOSSARY.md`
3. `docs/SCORING.md` (flat rubric — context for the three-tier comparison that's still pending)
4. `CLAUDE.md` — note the "Collaboration Conventions" section, especially the one-question-at-a-time adaptive questioning rule
5. `lessons/lesson-02-shahida/picker.html` — the in-progress Lesson 2 picker
6. `docs/roots/shahida.json` — the Lesson 2 primary root, scored + status-tracked (sample of current flat schema)
7. `docs/roots/rasul.json` — 429-verse catalog with all scores null (sample of unscored state)
8. `docs/prompts/picker_generator.md` AND `docs/prompts/lesson_authoring_workflow.md` — draft prompts; **known to be wrong** about `.workspace/` paths and gitignore rules. Read only to understand prior intent.
9. Commit `f8a89f2` (`git show f8a89f2`) — the folder-per-lesson convention that supersedes the drafts' path assumptions
10. Commit `c264808` (`git show c264808`) — ADR-009 local root-inventory pipeline

### Then pick up where we left off:

**Most likely next questions (in rough order of importance):**

1. **Design the `lesson_uses` schema** (one sub-question at a time; see CLAUDE.md).
2. **Finish the scoring discussion** (the teacher has not read the comparison; present it compactly, one concept at a time).
3. **Decide Tamil translation storage** (generated where, committed where).
4. **Write the redesign files under `docs/redesign/`** — start with `01-vision.md`, `02-current-state.md`, `06-root-json-schema.md`.
5. **Plan the Lesson 2 migration** — concrete script or manual steps to move Lesson 2's existing state (`docs/roots/shahida.json`, `docs/selections/lesson-02.md`, `lessons/lesson-02-shahida/picker.html`) into the new layout.

### Do NOT:

- Touch `.gitignore` without explicit user confirmation
- Rewrite `docs/prompts/picker_generator.md` or `docs/prompts/lesson_authoring_workflow.md` until the redesign direction is locked (then delete them)
- Implement any `tools/lesson-workflow.py` subcommands
- Touch `.claude/tmp/lesson-02-picker.html` (it no longer exists — was moved to `lessons/lesson-02-shahida/picker.html` in `f8a89f2`)
- Ask multiple questions in one response (see CLAUDE.md "Collaboration Conventions")
- Pre-write a list of N questions and drip-feed them (same rule; must be adaptive)
- Push to `main` directly — work on `claude/show-recent-commits-9vRco` or a new branch

### Do:

- Update this file as new decisions land (rolling handoff)
- Rebase onto `origin/main` whenever the teacher pushes new commits from the other machine; force-push the session branch is pre-authorized for this pattern
- Commit and push frequently (the stop hook enforces it)
- Prefer small files with cross-links for any new docs
- Ask one question at a time, adaptively (per `CLAUDE.md`)
