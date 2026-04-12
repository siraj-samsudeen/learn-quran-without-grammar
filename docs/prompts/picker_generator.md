# Session Prompt — Generate Lesson Selection Picker (Stage 1 of Authoring Workflow)

Copy everything in the fenced block below into a fresh Claude Code session. The goal: a Python subcommand `tools/lesson-workflow.py generate-picker --lesson N` that reads root JSONs, applies filtering + default-assignment logic, and produces a ready-to-open picker HTML at `.workspace/lesson-NN/picker.html`. The template is enriched with **Save JSON**, **Load JSON**, **filter-by-form**, **filter-by-surah**, **localStorage auto-save**, and **null-score review mode** so the picker becomes a durable, mobile-usable state surface — not a one-shot clipboard tool.

**Expected runtime:** ~30–45 minutes. **Output:** a new Python subcommand + meaningful template upgrades + end-to-end test on Lesson 3 (ر س ل, 429 candidates) and regression on Lesson 2 (ش ه د, 20 scored candidates).

---

## Why this prompt changed shape from its earlier version

Three things happened between the original draft of `picker_generator.md` and now:

1. **[ADR-009](../decisions/ADR-009-local-root-pipeline.md) replaced the live corpus scraping pipeline.** The old prerequisite of running `docs/prompts/batch_completion.md` is gone — root JSONs are now a one-command local build (`tools/build-root-inventory.py`, ~1 second per root, fully offline).

2. **[lesson_authoring_workflow.md](lesson_authoring_workflow.md) established the broader architecture** this prompt slots into:
   - Per-lesson state lives in `.workspace/lesson-NN/`.
   - JSONs are the source of truth; HTML files are thin, generated surfaces.
   - Prose selection logs are generated FROM JSON, not hand-authored.
   - Most work should NOT need an LLM — scripts are cheap, HTML surfaces work on a phone, the LLM is reserved for judgment-intensive slices.
   - **Save JSON** is a first-class button alongside Copy JSON, backed by the File System Access API on desktop and a download fallback on mobile.
   - `.workspace/lesson-NN/state.json` tracks which stage the lesson is in.

3. **`docs/roots/rasul.json` now has 429 candidate verses with `scores: null`.** The original prompt's "sort top-5 into Learn, next-5 into Practice" logic is meaningless when every score is 0. The picker needs review-mode features (filters, null-score fallback) before it becomes useful for large roots.

Together, these move the picker from "template substitution" to "durable state surface with filters and persistent save". Implementation is still stdlib Python + vanilla JS — no frameworks — but the scope is meaningfully larger than the original prompt anticipated.

---

```
You are building Stage 1 of the lesson authoring workflow described in
docs/prompts/lesson_authoring_workflow.md. Read that document first for
the full architecture (JSON-first, .workspace/ state, scripts-not-LLMs
for mechanical work, mobile-friendly surfaces). This session builds the
generate-picker subcommand + meaningful template upgrades.

## Read this first (in order)

1. docs/prompts/lesson_authoring_workflow.md — the architecture this
   prompt slots into. Sections 1, 3.1–3.4, 3.6 are the load-bearing ones.
2. docs/decisions/ADR-009-local-root-pipeline.md — the data model. Root
   JSONs are now built from local vendored files, not scraped live.
3. tools/build-root-inventory.py — the script that populates root JSONs.
4. tools/selection-picker/template.html — the current picker UI. Find the
   const LESSON_CONFIG = {...}; block near the top of the <script>
   section. That's what your subcommand substitutes.
5. tools/selection-picker/README.md — picker schema + design principles.
6. docs/roots/shahida.json — ~160 verses, 20 with full scores (Lesson 2
   reference case — exercises the "pre-fill Learn/Practice by score" path).
7. docs/roots/rasul.json — 429 verses, ZERO scored (Lesson 3 primary case
   — exercises the "null-score fallback" path).
8. docs/selections/lesson-02.md — shows the downstream format the JSON
   eventually becomes. Not built in this session, but good to understand.

## Your deliverables

1. A `generate-picker` subcommand on `tools/lesson-workflow.py`.
2. Template upgrades to tools/selection-picker/template.html:
   - Save JSON button (File System Access API + download fallback)
   - Load JSON button (resume previous work)
   - localStorage auto-save with a restore banner
   - Filter bar: by form, by surah, by length, by section
   - Null-score review layout (defaults all to "none" when no scores)
   - Three-button layout: [Copy JSON] [Save JSON] [Load JSON]
3. An end-to-end test on Lesson 3 using docs/roots/rasul.json.
4. A regression test on Lesson 2 using docs/roots/shahida.json.
5. Updates to .claude/skills/lesson-pipeline.md Phase 1a.
6. A .gitignore rule for .workspace/**/*.html (the HTML files are
   generated and should not be committed).
7. No git commits — the teacher reviews and commits.

## Prerequisites that must be true before you start

- tools/selection-picker/template.html exists with a LESSON_CONFIG block.
- docs/roots/rasul.json, docs/roots/shahida.json, docs/roots/ilah.json,
  docs/roots/kabura.json all exist. If any are missing, build them with
  tools/build-root-inventory.py before proceeding.
- tools/lesson-workflow.py may or may not exist yet. If it doesn't,
  create it as a single-file Python 3 CLI with argparse subparsers. If it
  does, add generate-picker as a new subparser without breaking existing
  subcommands.

## Subcommand interface

    tools/lesson-workflow.py generate-picker --lesson N \
      [--anchor "ARABIC"] \
      [--current-root <key>]... \
      [--recall-root <key>]... \
      [--targets learn:5,practice:5,recall:5] \
      [--config .workspace/lesson-N/config.json] \
      [--output .workspace/lesson-N/picker.html]

Defaults:
  --output → .workspace/lesson-N/picker.html
  --targets → learn:5,practice:5,recall:5

Support two modes:

1. **CLI flags** (fast, single-root, good for a quick rebuild):
   ```
   tools/lesson-workflow.py generate-picker --lesson 3 \
     --anchor "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ" \
     --current-root rasul \
     --recall-root ilah --recall-root kabura --recall-root shahida
   ```

2. **JSON config at --config** (deterministic, multi-root, future-proof,
   naturally lives inside .workspace/ so the state is self-describing):
   ```
   tools/lesson-workflow.py generate-picker --config .workspace/lesson-03/config.json
   ```
   Config shape:
   ```json
   {
     "lesson_number": 3,
     "anchor": "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ",
     "current_roots": [
       { "key": "rasul", "arabic": "رَسُول",
         "title": "رَسُول — This lesson" }
     ],
     "recall_roots": [
       { "key": "ilah",    "arabic": "إِلَٰه",  "title": "إِلَٰه — L1 recall"  },
       { "key": "kabura",  "arabic": "كَبُرَ",  "title": "كَبُرَ — L1 recall"  },
       { "key": "shahida", "arabic": "شَهِدَ", "title": "شَهِدَ — L2 recall" }
     ],
     "targets": { "learn": 5, "practice": 5, "recall": 5 }
   }
   ```
   If both --config and flags are given, flags win (for incremental
   tweaks). If neither is given and .workspace/lesson-N/config.json
   exists, use it automatically.

## What the subcommand does, step by step

1. **Parse args or config.** Resolve lesson number, anchor, current roots,
   recall roots, targets.

2. **Ensure .workspace/lesson-NN/ exists.** Create the directory if missing.
   This is where ALL per-lesson state lives — picker.html, picker source
   JSON, selection.json (written later by the Save button), state.json.

3. **Load root JSONs.** For each current and recall root, open
   docs/roots/{key}.json. If a file is missing:

       error: Root 'rasul' missing.
              Run: python3 tools/build-root-inventory.py --root رسل ...
              See ADR-009 for the full invocation.

   If a file exists but has <20 verses, print a warning and continue —
   the builder already ran, the teacher knows what they want.

4. **Build the candidate verse list.** Apply these filters:

   - **Exclude used verses from EARLIER lessons.** Skip any entry where
     `status: "used"` AND `lesson` is not null AND `lesson < N`.
     Verses used in future lessons (shouldn't happen, but be safe) are
     kept as candidates.
   - **Include all other statuses** — `candidate`, `pipeline`,
     `deferred`, and verses with `status: null`.
   - **Deduplicate by ref** — if the same verse appears via multiple
     roots (cross_roots), include it once per root (it'll appear in
     multiple sidebar sections, which is correct).

5. **Null-score fallback (critical — this is NEW vs. the old prompt).**

   For each root, count how many of its candidates have non-null `scores`:

       scored = [v for v in candidates if v.get("scores") is not None]

   - **If `len(scored) >= targets.learn + targets.practice`** (i.e., the
     teacher has scored enough verses to make meaningful defaults):
     - Sort `scored` by `scores.final` desc (for current roots) or
       `scores.final` desc (for recall roots)
     - Top `targets.learn` → `defaultSection: "learn"`
     - Next `targets.practice` → `defaultSection: "practice"`
     - Rest → `defaultSection: "none"`
     - Verses with existing `status: "pipeline"` keep
       `defaultSection: "pipeline"` regardless of score

   - **Else (too few scored — this is the Lesson 3 / rasul.json case):**
     - Set `defaultSection: "none"` for ALL candidates.
     - Do NOT pre-assign. An arbitrary top-5 when all scores are 0 is
       misleading noise the teacher has to undo. Empty defaults surface
       the reality: "you need to review these before picking".
     - Verses with existing `status: "pipeline"` still keep
       `defaultSection: "pipeline"`.

   - For **recall roots**, same logic but keyed on `scores.final`.
     Target per recall root = `targets.recall // len(recall_roots)`
     (e.g., 5 recall slots across 3 roots → ~1–2 per root).

   **The teacher can always override defaults in the picker.** The point
   is to start the picker in a sensible state, not to dictate.

6. **Build the `verses` array in picker format.** For each kept verse,
   produce the object the picker expects. NEW fields vs. the old schema
   are `surah_name` and `word_count` — they power the filter bar:

   ```javascript
   {
     ref: "3:18",
     group: "shahida",
     form: "<form_arabic from root JSON>",
     lemma: "<form_arabic — same as form, kept for filter UI>",
     score: <scores.final || 0>,
     defaultSection: "learn" | "practice" | "recall" | "pipeline" | "none",
     arabic: "<arabic_fragment if set, else arabic_full>",
     english: "<translation if set, else empty string>",
     why: "<score_notes if set, else empty string>",
     surah_name: "<from root JSON>",
     word_count: <from root JSON>
   }
   ```

   If `translation` is null (common in freshly-built JSONs that pre-fill
   from Saheeh), the English field is still populated from `translation`
   IF the root JSON has a `translation_source` field set (because that
   means the translations are drafts, not empty). Show them; let the
   teacher paraphrase later.

7. **Load tools/selection-picker/template.html.**

8. **Substitute the LESSON_CONFIG block via regex:**

       pattern = re.compile(
         r'const LESSON_CONFIG = \{.*?^\};',
         re.DOTALL | re.MULTILINE
       )

   Replace with `const LESSON_CONFIG = <json>;` where `<json>` comes from
   `json.dumps(payload, ensure_ascii=False, indent=2)`. JSON is a subset
   of JS object literals, so this is valid JavaScript. Test the regex
   against the current template before relying on it.

9. **Write the result to .workspace/lesson-NN/picker.html.** Create the
   parent directory if needed.

10. **Update .workspace/lesson-NN/state.json** with stage
    "picker-generated" and an ISO timestamp. Shape:

        {
          "lesson": 3,
          "stage": "picker-generated",
          "timestamp": "2026-04-11T05:45:00Z",
          "picker_path": ".workspace/lesson-03/picker.html",
          "config": {
            "current_roots": ["rasul"],
            "recall_roots": ["ilah", "kabura", "shahida"],
            "targets": { "learn": 5, "practice": 5, "recall": 5 }
          }
        }

    If state.json already exists with a LATER stage (e.g.,
    "selection-complete"), do NOT clobber it — warn and rename the
    existing file to state.json.bak before writing the new one. The
    teacher may be regenerating the picker on top of completed work.

11. **Print a summary:**

        ✓ Generated .workspace/lesson-03/picker.html
          Current root: rasul (429 candidates, 0 scored — defaults suppressed)
          Recall roots: ilah (122), kabura (161), shahida (160)
          State:        .workspace/lesson-03/state.json (stage: picker-generated)
          Open with:    open .workspace/lesson-03/picker.html

## Template upgrades (MUST DO in this session)

Edit tools/selection-picker/template.html. Required additions:

### T1. Save JSON button — File System Access API + download fallback

Add alongside Copy JSON. This is the single most important change — it's
what makes the picker durable and phone-usable.

```javascript
async function saveSelectionJSON() {
  const payload = buildPayload();  // existing function
  const text = JSON.stringify(payload, null, 2);
  const lessonNum = LESSON_CONFIG.lesson_number;

  if (window.showDirectoryPicker) {
    // Desktop path — persistent directory handle via indexedDB
    let dirHandle = await loadHandle(`lesson-${lessonNum}`);
    if (!dirHandle) {
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      await saveHandle(`lesson-${lessonNum}`, dirHandle);
    }

    // selection.json
    const fileHandle = await dirHandle.getFileHandle(
      "selection.json", { create: true }
    );
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();

    // state.json — mark stage "selection-complete"
    const stateHandle = await dirHandle.getFileHandle(
      "state.json", { create: true }
    );
    const stateWritable = await stateHandle.createWritable();
    await stateWritable.write(JSON.stringify({
      lesson: lessonNum,
      stage: "selection-complete",
      timestamp: new Date().toISOString()
    }, null, 2));
    await stateWritable.close();

    showToast(`✓ Saved to .workspace/lesson-${lessonNum}/selection.json`);
  } else {
    // Mobile / fallback path — download blob
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lesson-${lessonNum}-selection.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      `Saved to Downloads. Move to .workspace/lesson-${lessonNum}/ via Files.`
    );
  }
}
```

Helper functions `loadHandle` / `saveHandle` go through `indexedDB`
(~30 lines of wrapper — write inline, no libraries). Store handles under
a DB named `lqwg-handles`, object store `dirHandles`.

On first save, Chrome/Edge/Safari 17+ will prompt the teacher to pick a
directory. They point it at the project's `.workspace/lesson-NN/`
directory. Subsequent saves skip the prompt.

### T2. Load JSON button

A file picker that reads a previously-saved selection.json and restores
all state (section assignments, edited remarks). Enables "resume work"
and "review a completed lesson". On desktop, use showOpenFilePicker; on
mobile, fall back to a hidden `<input type="file" accept=".json">`.

```javascript
async function loadSelectionJSON() {
  let text;
  if (window.showOpenFilePicker) {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ accept: { "application/json": [".json"] } }]
    });
    const file = await fileHandle.getFile();
    text = await file.text();
  } else {
    text = await promptMobileFileUpload();  // helper using <input type=file>
  }
  const payload = JSON.parse(text);
  applyPayloadToUI(payload);  // new function — inverse of buildPayload
  showToast("✓ Loaded selection");
}
```

`applyPayloadToUI(payload)` must iterate `payload.selections` and move
each verse card into the right section. Any verse in `payload` that no
longer exists in `LESSON_CONFIG.verses` should log a warning to the
console but not crash.

### T3. localStorage auto-save with restore banner

On every state change (verse moved, remark edited), mirror to
`localStorage["lqwg-lesson-N-draft"]` as the current `buildPayload()`
result plus a timestamp.

On page load, check localStorage. If a draft exists for the current
lesson number AND no Load JSON has happened yet, show a subtle banner at
the top:

    Draft from 14 minutes ago    [Restore] [Discard]

Restore applies the payload like Load JSON. Discard deletes the
localStorage key. This is independent of Save JSON — it's crash safety,
not persistence. Even if the browser tab dies or the phone reboots, the
draft survives until explicitly discarded.

### T4. Filter bar — review mode for large candidate sets

With 429 candidates for rasul, a single-page scroll is unusable. Add a
filter bar above the main card area (beside or above the counters):

- **Form dropdown.** Populated from unique `form` / `lemma` values in
  `LESSON_CONFIG.verses`. Selecting "رَسُول" hides cards for other
  lemmas. Default: "All forms".
- **Surah filter.** Free-text input that matches case-insensitively
  against `surah_name`. Empty = no filter.
- **Length filter.** Two buttons: "Short (≤10 words)" and "All lengths".
  Default: All.
- **Section filter.** Checkboxes for learn / practice / recall / pipeline
  / none. Default: all checked. Lets the teacher focus on "just the
  unassigned candidates" by unchecking everything except "none".

Filters compose (AND). When any filter is active, the top counter bar
shows "47 visible / 429 total" next to the existing Learn N/5 counters.

Filtering is pure client-side DOM hide/show — no re-render. Keep the
existing section membership intact; filters only affect visibility.

### T5. Three-button layout

Replace the single Copy JSON button with a horizontal row:

    [Copy JSON]  [Save JSON]  [Load JSON]

Spacing and styling consistent with the existing button. On narrow
viewports (≤900px), stack vertically or collapse to compact icons. Keep
all three functional on both desktop and mobile.

### T6. Mobile polish

- **Touch targets ≥44px.** The current section-move buttons on cards are
  reportedly a bit small. Audit and bump.
- **Single-column layout** below ~900px (the existing media query can be
  extended — see lesson_authoring_workflow.md §3.6).
- **Arabic rendering.** Amiri via Google Fonts already works on iOS
  Safari — don't change the font stack.

## Testing

### Test 1 — Primary (Lesson 3, null-score case)

    python3 tools/lesson-workflow.py generate-picker --lesson 3 \
      --anchor "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ" \
      --current-root rasul \
      --recall-root ilah --recall-root kabura --recall-root shahida

Verify:

- .workspace/lesson-03/picker.html exists and opens in a browser.
- .workspace/lesson-03/state.json exists with stage "picker-generated".
- Sidebar shows rasul (429 candidates) + ilah + kabura + shahida.
- ALL rasul cards default to "none" — no misleading pre-assignment.
- shahida cards with status:"used" from Lesson 2 are EXCLUDED.
- Filter by form dropdown works — selecting "رَسُول" hides other lemmas.
- Filter by surah works — typing "An-Nur" shows only that surah's verses.
- Filter by section (uncheck all except "none") shows only unassigned.
- Save JSON on desktop:
    - First click prompts for directory; pick .workspace/lesson-03/.
    - selection.json + state.json both written to that directory.
    - state.json now says stage "selection-complete".
    - Subsequent clicks save silently (no re-prompt).
- Save JSON on mobile (test in Safari iOS or Chrome Android):
    - Click downloads lesson-03-selection.json.
    - File ends up in Files → Downloads.
    - Teacher manually moves to .workspace/lesson-03/.
- Load JSON restores state from the written selection.json.
- localStorage auto-save: make a change, close the tab, reopen the
  picker, see the restore banner, click Restore, state is back.

### Test 2 — Regression (Lesson 2, scored case)

    python3 tools/lesson-workflow.py generate-picker --lesson 2 \
      --anchor "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ" \
      --current-root shahida \
      --recall-root ilah --recall-root kabura \
      --output /tmp/lesson-02-regenerated.html

Verify:

- /tmp/lesson-02-regenerated.html exists.
- The 20 scored shahida candidates get proper Learn/Practice defaults
  (because they have non-null scores — the fallback path is not taken).
- The 103+ NEW candidates from the local builder show up with
  defaultSection: "none".
- Do NOT overwrite .workspace/lesson-02/ — use /tmp for this run.
- Do NOT touch .claude/tmp/lesson-02-picker.html — the original hand-built
  picker file still has real teacher edits and is the historical record.

### Test 3 — Idempotency

Running generate-picker twice in a row produces byte-identical output
(or byte-identical except for the timestamp in state.json). Stable
iteration order, stable sort keys, stable JSON serialization.

## Update the skill

Edit .claude/skills/lesson-pipeline.md, Phase 1a. Replace the current
"manual template copy" step with:

    3. Generate the picker HTML:
       python3 tools/lesson-workflow.py generate-picker --lesson NN \
         --anchor "..." \
         --current-root <root> \
         --recall-root <r1> --recall-root <r2>

       Output: .workspace/lesson-NN/picker.html
       Open with: open .workspace/lesson-NN/picker.html

       The teacher clicks Save JSON in the picker, which writes
       .workspace/lesson-NN/selection.json and updates state.json to
       stage "selection-complete".

Keep the rest of Phase 1a intact.

## .gitignore updates

Add to the root .gitignore:

    # Generated lesson workspace HTML (the JSON files ARE committed)
    .workspace/**/*.html
    .workspace/**/*.html.bak

Do NOT add the JSON files — they're the source of truth and should be
committed.

## Constraints

- **Stdlib only for the Python CLI.** argparse, json, pathlib, re, sys,
  datetime. No third-party dependencies.
- **Template uses vanilla JS.** No frameworks, no bundlers. Google Fonts
  (Amiri, Inter) dependency stays as-is.
- **JSON-first.** The picker writes JSON; the CLI consumes JSON; prose
  is generated later by a separate subcommand (generate-log, deferred).
- **Don't break Copy JSON.** It's the existing clipboard path and must
  keep working. Three buttons side-by-side.
- **Don't auto-launch anything.** HTML files opened via file:// can't
  execute shell commands. Show the command; let the teacher run it.
- **Don't overwrite .claude/tmp/lesson-02-picker.html.** Historical
  record with real teacher edits.
- **Don't commit.** Teacher reviews and commits.
- **Don't score verses.** Scoring is a teacher/LLM judgment call, not a
  mechanical transform. Pull existing scores; fall back to "all none"
  when there aren't enough.
- **Don't auto-run build-root-inventory.py.** If a root JSON is missing,
  error with a clear message and the exact command. The teacher runs
  the builder themselves; it's a conscious per-root act.

## What you are NOT building in this session

- audio-plan generation, audio-review HTML, build-audio, verify, publish
  subcommands — all deferred to later sessions.
- Migration of Lessons 1–2 into .workspace/ — deferred indefinitely.
- A lesson-init subcommand (Stage 0 in the workflow doc) — that's a
  separate session; assume the teacher runs generate-picker with explicit
  flags for now.
- A generate-log subcommand (Stage 2.5 in the workflow doc) — deferred
  to a later session.
- Cloud sync, server, authentication — never; Dropbox is the sync layer.
- Automated LLM calls from the CLI — this subcommand is pure script.

## Scope guard

If you catch yourself building something not listed in Deliverables,
STOP and list it as a follow-up instead. Ship Stage 1 clean, then iterate.

## Done criteria

- tools/lesson-workflow.py has a working generate-picker subcommand.
- .workspace/lesson-03/picker.html exists and passes Test 1 (including
  Save JSON on desktop, localStorage auto-save, all four filters).
- /tmp/lesson-02-regenerated.html passes Test 2 (scored defaults work).
- Test 3 (idempotency) passes.
- Template has: Copy JSON (still working) + Save JSON + Load JSON +
  filter bar (form/surah/length/section) + localStorage auto-save with
  restore banner.
- .gitignore updated to exclude .workspace/**/*.html.
- .claude/skills/lesson-pipeline.md Phase 1a updated.
- Report written summarizing:
  1. Subcommand interface + where it lives
  2. Template features added (list each)
  3. How Save JSON was implemented (File System Access API path +
     fallback path) and which browsers you tested in
  4. Null-score behavior on Lesson 3 vs. scored behavior on Lesson 2
  5. Known edge cases or todos
  6. Recommended next slice (Stage 2.5 — generate-log — is the natural
     follow-on)
```

---

## Relationship to `lesson_authoring_workflow.md`

This prompt is a **focused, self-contained Stage-1 implementation** of the broader architecture in [lesson_authoring_workflow.md](lesson_authoring_workflow.md). The workflow document covers all seven stages (init → picker → selection → log → audio plan → audio build → verify → publish) and is the place to go for:

- Why the workflow is JSON-first and filesystem-state-machine-driven
- The mobile/phone story and why Save JSON matters
- The `.workspace/` directory layout
- The list of which LLM calls remain in the new architecture (Stage 0 root analysis, scoring, translation polish, pedagogical review)
- Open questions for the teacher (Dropbox path conventions, committing `.workspace/` JSONs, one-CLI-vs-many)

This prompt assumes you've read that doc, picks out the ideas that apply to the picker specifically, and gives you a scoped ~45-minute session to ship them.

## Prerequisite — run first if you haven't

```bash
# Populate docs/roots/rasul.json (if not already done — see ADR-009)
python3 tools/build-root-inventory.py \
  --root رسل --root-word رَسُول --root-transliteration rasul \
  --three-letter "ر س ل" --three-letter-en "ra sin lam" \
  --corpus-key rsl --introduced-in-lesson 3 \
  --output docs/roots/rasul.json
```

As of the current repo state (commit `c264808`, ADR-009 landed), `docs/roots/rasul.json` is already committed with 429 candidates and Saheeh International translation drafts. Test 1 of this prompt should work immediately.
