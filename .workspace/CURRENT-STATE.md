# Current State — Lesson Authoring Redesign Session

_Session handoff document. **Read this first** when starting a new session. Last updated 2026-04-11._

---

## Status at a glance

We are mid-way through an architectural rethink of the lesson authoring workflow. Goal: move from "LLM-in-every-step" to a JSON-first, script-driven pipeline that lets the teacher work on a phone, where the root JSON is the single source of truth for verse state + explanations, and per-lesson folders hold only non-verse-state artifacts.

**Nothing has been implemented yet.** All work is architectural — choosing data models, file layouts, stage boundaries. Five decisions are ratified. Three-tier scoring is on the table but the teacher has not yet read the comparison vs the current `docs/SCORING.md`. A handful of smaller questions are pending.

When the redesign is locked, the plan is to write small cross-linked files under `docs/redesign/` (each ≤8K tokens, one Read), then land executable session prompts under `docs/prompts/`.

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
