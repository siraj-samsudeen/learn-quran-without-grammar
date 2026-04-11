# Lesson Authoring Workflow — Findings, Architecture & Implementation Prompt

This document captures the vision for the end-to-end lesson authoring experience, the analysis of how the current system falls short of that vision, the proposed architecture, and a concrete implementation prompt for a future session. It is long because the decisions here will shape every lesson going forward.

## 1. The vision (as stated by the teacher)

> I paste the sentence — in this case, each of the sentences of the Adhan — and then your job is to understand the roots and go populate that root database from Quran corpus. Then when I visit the lesson page, I see an HTML per session where I can see what is already selected and what is not, and move them between statuses. Copy JSON is fine but I also want **Save JSON**, because if I am on the phone I can actually click Save JSON and it saves there. And it should save to a place where the next LLM can look in the right spot if the lesson is already available.
>
> The next step is the audio pipeline. I want to see what's already there — for each verse, the recitation, whether it is downloaded, whether the translations are prepared by TTS, what voice. Another HTML (or tab) shows what's there, what's downloaded. When done, Copy JSON or Save JSON, then a script reads the file and launches the audio preparation. A CLI tool I can use on my own.
>
> I want to be able to do authoring and selection of the lesson and many things while I'm on the phone, without dependence on an LLM. Once my output is saved to a certain place, the script can pick it up and whatever can happen without an LLM agent happens. If there is an LLM in the picture, it can verify what is missing and launch the required things.

The key insight in the teacher's own words: **most of the work should not need an LLM.** LLMs are expensive (tokens), session-bound (context resets), and require a computer with chat access. Scripts are cheap, stateful via the filesystem, and runnable from anywhere including a phone with SSH or a scheduled cron. The LLM should be called only for the judgment-intensive parts — reading Arabic, scoring verses pedagogically, writing teacher-voice explanations — and should otherwise stay out of the loop.

## 2. Findings — what the current system has and where it falls short

### 2.1 What works today

| Component | Location | Purpose | Works? |
|-----------|----------|---------|--------|
| Root inventory JSONs | `docs/roots/{root}.json` | Catalog of forms + verses + scores | ✓ Schema is sound |
| Selection log (prose) | `docs/selections/lesson-NN.md` | Human-readable record of WHY each verse was picked | ✓ Works but hand-written |
| Sentence pipeline | `docs/selections/pipeline.md` | Queue of deferred verses | ✓ Works |
| Audio YAML definition | `tools/lesson-audio/lesson-NN.yaml` | What audio to build per phrase | ✓ Works |
| Audio build script | `tools/build-lesson-audio.py` | Builds MP3s + manifest | ✓ Works |
| Audio manifest | `assets/audio/lessons/lesson-NN/manifest.json` | What was built | ✓ Works |
| Selection picker HTML | `.claude/tmp/lesson-NN-picker.html` | Interactive UI for verse selection | ⚠ Hand-built, Copy-JSON-only, no Save (see §2.2(g)) |
| Root inventory builder | `tools/build-root-inventory.py` | Builds a full `docs/roots/{root}.json` from vendored morphology + Tanzil + Sahih in < 1 s | ✓ Works (see [ADR-009](../decisions/ADR-009-local-root-pipeline.md)) |
| Legacy verse fetcher | `tools/fetch-verses.py` | Ad-hoc Arabic fetch from alquran.cloud | ⚠ Still works but no longer on the critical path — the local builder replaces it for root inventory work |
| Validation | `tools/validate-lesson-consistency.py` | Pre-commit checks | ✓ Works |

### 2.2 Where the current system falls short of the vision

**(a) Fragmented per-lesson state.** Each lesson's data is scattered across five+ locations:
- `docs/selections/lesson-NN.md` (prose log)
- `docs/roots/{root}.json` (verses with lesson assignment buried in individual entries)
- `tools/lesson-audio/lesson-NN.yaml` (audio def)
- `assets/audio/lessons/lesson-NN/` (built audio)
- `lessons/lesson-NN-slug.md` (published page)
- `.claude/tmp/lesson-NN-picker.html` (hand-built picker, temporary)

A future session asking "what's the state of Lesson 3?" has to read six files and infer. There's no single source of truth, no state machine, no way for a script to know which phase the lesson is in.

**(b) Copy-only handoff.** The picker only copies JSON to clipboard. Clipboard is ephemeral and requires an LLM session to consume. If you close the picker without pasting into chat, your work is lost. No durable save means no "pick it up tomorrow" workflow.

**(c) No mobile story.** The current workflow assumes you're at a desktop with Claude Code running and a browser tab open. On a phone, none of this works: you can't run scripts, the picker is cramped, and there's no way to hand off work to a script running on your Mac.

**(d) LLM does mechanical work the scripts should do.** Every time we start a lesson, the LLM manually copies the template, edits `LESSON_CONFIG`, generates the selection log, creates the root JSON entries, updates the pipeline, etc. All of this is deterministic — the LLM is slower, more expensive, and more error-prone than a script for these tasks. The LLM should be doing form analysis and pedagogical scoring, not file shuffling.

**(e) No introspection of audio state.** If you ask "what audio is already built for Lesson 1?", the only answer is "read the manifest and cross-reference assets/." There's no review UI that shows per-phrase audio status, gaps, reciter choices, voice selections. When you want to add Tamil audio, you have to grep files to know what's missing.

**(f) No clean stage boundaries.** Selection, audio planning, audio building, review, publish — these are separate phases but there's no file-level signal that marks when one phase is done and the next can start. A script can't tell whether you're "done selecting" for Lesson 3 without reading prose.

**(g) The picker template has no generator yet.** `tools/selection-picker/template.html` currently requires manual `LESSON_CONFIG` editing. The generator is fully specified in [`docs/prompts/picker_generator.md`](picker_generator.md) — that prompt is now self-contained for Stage 1 of this workflow and absorbs the architectural ideas from this document (`.workspace/` output, Save/Load JSON, filter bar, null-score fallback for freshly-built root JSONs). It just hasn't been executed in a session yet.

**(h) Root inventory has been decoupled from live HTTP.** [ADR-009](../decisions/ADR-009-local-root-pipeline.md) replaced the previous `docs/prompts/batch_completion.md` workflow (30–60 min live HTML scrape + per-verse API calls) with `tools/build-root-inventory.py` (~1 s, fully offline, from vendored morphology + Tanzil Uthmani + Saheeh International). `docs/roots/rasul.json` (Lesson 3, 429 candidates with draft translations) is already committed. Any reference in the rest of this document to "run batch_completion.md" should be read as "run `tools/build-root-inventory.py`".

## 3. Proposed architecture

### 3.1 Core principles

1. **Filesystem as state machine.** A lesson's phase is determined by which files exist in its workspace. No metadata file needed — the presence or absence of `selection.json`, `audio-plan.json`, `manifest.json` tells the whole story.

2. **One directory per lesson, for workspace state.** Everything mutable during authoring lives in `.workspace/lesson-NN/`. The published artifacts (`lessons/lesson-NN-slug.md`, `assets/audio/...`, `docs/roots/...`) stay where they are for backward compatibility.

3. **JSON as the canonical handoff format.** Every stage outputs a JSON file to a predictable path. The next stage reads that JSON. HTML surfaces generate JSON; CLI tools consume JSON. Prose selection logs are generated FROM the JSON, not authored by hand.

4. **HTML as a thin layer over JSON.** The HTML UIs are stateless surfaces. They load an input JSON, render cards, accept edits, emit an output JSON. No server, no backend, no build step. Static files that work from `file://` and over Dropbox sync.

5. **Scripts do the mechanical work.** Every step that can be scripted IS scripted. The LLM does four things: root analysis, verse scoring, translation polish, pedagogical review. Everything else is a CLI subcommand.

6. **Dropbox as the transport layer.** The project already lives in Dropbox. Any file saved to the repo is automatically synced across devices. The "Save JSON" button can write to the project directory and the file appears on your Mac within seconds. No server, no API, no upload.

7. **Mobile-first for the UI surfaces.** The selection picker and audio review must work on a phone browser — touch targets, single-column layout at narrow widths, no hover dependencies, Save JSON that uses the File System Access API on desktop and falls back to download-then-Files-app on iOS.

### 3.2 Lesson workspace layout

```
.workspace/
└── lesson-03/
    ├── state.json               # Phase tracker: which stages are complete, timestamps
    ├── sentence.md              # The anchor sentence the teacher pasted (input)
    ├── roots.json               # Parsed roots + which are new vs known
    ├── selection.json           # ← Output of Stage 2 (selection picker)
    ├── selection.md             # Generated prose log (from selection.json)
    ├── audio-plan.json          # ← Output of Stage 4 (audio review)
    ├── audio-state.json         # Script-generated: what's on disk right now
    ├── build-report.json        # ← Output of Stage 5 (build script)
    ├── picker.html              # Stage 2 UI (generated, gitignored)
    └── audio-review.html        # Stage 4 UI (generated, gitignored)
```

The JSONs are committed (they're the source of truth). The HTML files are gitignored (generated from JSONs). `state.json` tracks progress so scripts can report status without reading prose.

**Why `.workspace/` and not inside `lessons/`:** keeps authoring state separate from published artifacts. `lessons/lesson-03-slug.md` stays as the publishable page. When Lesson 3 is done, `.workspace/lesson-03/` can be archived or left alone — it doesn't affect the published site.

### 3.3 Stages of the pipeline

#### Stage 0 — Init

```bash
python3 tools/lesson-workflow.py init --lesson 3 \
  --sentence "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ"
```

What the script does:
1. Creates `.workspace/lesson-03/` if not present.
2. Writes the sentence to `sentence.md`.
3. Writes `state.json` with phase "init-complete".
4. **Calls the LLM** (subagent, one-shot prompt) to parse roots from the sentence and return a JSON like:
   ```json
   { "primary_roots": ["rasul"], "already_taught": ["shahida"], "new_roots": ["rasul"] }
   ```
5. Saves that as `roots.json`.
6. For each new root, checks if `docs/roots/{root}.json` exists. If not, runs `tools/build-root-inventory.py` automatically — the local builder is so cheap (~1 s per root, fully offline — see [ADR-009](../decisions/ADR-009-local-root-pipeline.md)) that there's no reason to defer it. No LLM call for this step.
7. **Does NOT generate the picker HTML yet.** That's Stage 1.

**Why split Init from picker generation:** the split is now largely conceptual — with the local builder, root completion is sub-second and the whole init phase finishes in a few seconds. Keeping them as separate commands preserves the clean stage boundary and lets the teacher re-run just the picker generator when they tweak targets or recall-root choices, without re-parsing the sentence.

#### Stage 1 — Generate picker

```bash
python3 tools/lesson-workflow.py generate-picker --lesson 3
```

**This stage is fully specified in [`docs/prompts/picker_generator.md`](picker_generator.md).** That prompt is the canonical source for how the subcommand works, what the template upgrades look like, and how to handle the null-score fallback for freshly-built root JSONs. The short version:

1. Reads `roots.json` and the referenced root JSONs (from `docs/roots/`).
2. Filters out `status: "used"` verses from earlier lessons.
3. Applies the null-score fallback: if a root has enough scored verses, pre-assigns top-N to Learn/Practice; otherwise defaults everything to "none" (because arbitrary pre-assignment at score=0 is misleading noise).
4. Substitutes the `LESSON_CONFIG` block in `tools/selection-picker/template.html`.
5. Writes `.workspace/lesson-03/picker.html`.
6. Updates `.workspace/lesson-03/state.json` with stage `picker-generated`.
7. Prints `open .workspace/lesson-03/picker.html`.

The template upgrades added in this stage — Save JSON (File System Access API + download fallback), Load JSON, localStorage auto-save, and a filter bar (by form / surah / length / section) — are what make the picker work as a **durable state surface** rather than a one-shot clipboard tool. See `picker_generator.md` for the full implementation spec.

**No LLM involvement.** Pure script.

#### Stage 2 — Selection (teacher, via picker)

Teacher opens the HTML. Moves verses between sections, edits remarks, clicks **Save JSON** (new feature — see section 3.4).

Output: `.workspace/lesson-03/selection.json`.

**When saved, the picker also marks the stage complete** in `state.json` via a small sidecar: the Save function writes BOTH `selection.json` and an updated `state.json` that marks stage 2 done with a timestamp. (This works because we're using the File System Access API with a persistent handle on the directory.)

#### Stage 2.5 — Generate selection log

```bash
python3 tools/lesson-workflow.py generate-log --lesson 3
```

Reads `selection.json`, generates a Markdown prose log matching the existing format of `docs/selections/lesson-NN.md`, writes it to `.workspace/lesson-03/selection.md`. When the lesson is finalized, this file gets copied to `docs/selections/lesson-03-rasul.md`.

The human-readable log is **generated from the JSON, not authored**. If the teacher edits the log prose directly, that's fine — but the source of truth is the JSON. This is the inverse of the current model.

**Optional LLM step:** after the script generates the basic log, a `--polish` flag calls the LLM to fill in the prose rationale for each verse (using the `remark` field from the JSON as the seed). This is the one place an LLM is valuable — writing teacher-voice prose.

#### Stage 3 — Audio plan input (human)

Teacher decides: which reciter for each phrase, which voice for each language, which trims. This could be done in an HTML surface too — let's call it `audio-plan.html` — OR it could be hand-written YAML for now (matching the existing `tools/lesson-audio/lesson-NN.yaml` format).

My recommendation: **skip building a separate audio-plan UI in the first iteration**. The reciter pool is small (11 reciters in ADR-005), the TTS voice pool is small (3 English, 1 Tamil), and the trims usually come from `auto-timestamps.py`. For v1, `lesson-workflow.py generate-audio-plan --lesson 3` can auto-assign reciters using a round-robin from the pool (respecting the "no repeat in one lesson" rule) and write a YAML the teacher can review and tweak. The HTML version comes later if the YAML turns out to be painful.

Output: `.workspace/lesson-03/audio-plan.yaml` (YAML, not JSON, because it's more comfortable for inline editing).

#### Stage 4 — Audio state introspection

```bash
python3 tools/lesson-workflow.py introspect-audio --lesson 3
```

What it does:
1. Reads `selection.json` + `audio-plan.yaml`.
2. Scans `assets/audio/lessons/lesson-03/` for actual files.
3. For each phrase, determines:
   - Recitation MP3: exists? size? duration? matches planned reciter?
   - English TTS: exists? matches planned voice and text hash?
   - Tamil TTS: exists? matches planned voice and text hash?
   - Pair file (Arabic + English): built? duration?
   - Pair file (Arabic + Tamil): built? duration?
4. Writes `.workspace/lesson-03/audio-state.json` with per-phrase status.
5. Generates `.workspace/lesson-03/audio-review.html` (a read-only-ish UI that displays the state as a table).
6. Prints `open .workspace/lesson-03/audio-review.html`.

The HTML is **primarily read-only** — a dashboard showing what's done and what's pending. It has two buttons:
- **"Save JSON"** — exports the current state file to the same path (used to trigger a save after manual voice/reciter overrides in the UI)
- **"Launch build"** — shows a command the teacher runs in terminal (copy to clipboard)

Why the HTML doesn't launch the build directly: HTML files opened via `file://` can't execute shell commands (security). But they can display the command and copy it, and that's enough.

#### Stage 5 — Build (script-driven)

```bash
python3 tools/lesson-workflow.py build-audio --lesson 3
```

What it does:
1. Reads `audio-plan.yaml` and `audio-state.json`.
2. For each phrase with missing recitation: downloads from EveryAyah using the planned reciter.
3. For each phrase with missing English TTS: runs `generate-tts.sh` for the English text.
4. For each phrase with missing Tamil TTS: runs the Tamil TTS variant.
5. For each phrase with missing pair file: builds it from recitation + TTS.
6. Builds the full lesson MP3 (concatenation).
7. Writes `build-report.json` with per-phrase success/failure + duration.
8. Re-runs `introspect-audio` at the end to update `audio-state.json`.

**No LLM involvement.** Pure script, runs on your Mac unattended. If you kick it off and go to lunch, you come back to a built lesson.

#### Stage 6 — Verification (optional LLM)

```bash
python3 tools/lesson-workflow.py verify --lesson 3
```

Runs the existing validation tools (`validate-lesson-consistency.py`, `check-text-audio-sync.py`) and reports anomalies. For deeper review, a flag `--llm-review` calls a subagent with the learning-science-review skill to do the 4-lens pedagogical check.

#### Stage 7 — Publish

```bash
python3 tools/lesson-workflow.py publish --lesson 3
```

Copies `.workspace/lesson-03/selection.md` to `docs/selections/lesson-03-rasul.md`, copies built audio to `assets/audio/lessons/lesson-03/` (already there from Stage 5), and prints the git commands to commit.

Could also generate a skeleton `lessons/lesson-03-rasul.md` from the selection JSON — but this is the one place where hand-authored prose is still valuable, so the script should generate a SKELETON (sections, card headings, audio tags) and leave the prose for the teacher to fill in (with LLM help via a separate command).

### 3.4 Save JSON — the technical story

This is the piece the teacher called out specifically. Here's how to make it work.

**Desktop (primary path):** Use the File System Access API (`window.showSaveFilePicker()` or `window.showDirectoryPicker()`). On the first save, the picker asks the teacher to choose a location — they point it at `.workspace/lesson-03/`. The browser stores a persistent handle in `indexedDB`. On subsequent saves, no prompt — the file writes directly to the chosen path. Works in Chrome, Edge, Safari 17+.

```javascript
async function saveSelection() {
  let handle = await getStoredHandle("lesson-03-dir");
  if (!handle) {
    handle = await window.showDirectoryPicker({ mode: "readwrite" });
    await storeHandle("lesson-03-dir", handle);
  }
  const fileHandle = await handle.getFileHandle("selection.json", { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(buildPayload(), null, 2));
  await writable.close();
  showToast("✓ Saved to .workspace/lesson-03/selection.json");
}
```

**Phone (fallback path):** File System Access API isn't available on iOS Safari or most Android browsers. Fall back to the download pattern:

```javascript
function saveSelectionAsDownload() {
  const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lesson-03-selection.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Saved to Downloads. Move to .workspace/lesson-03/ via Files app.");
}
```

On iOS, the download goes to Files → Downloads, and the teacher can tap-hold → Move → choose the Dropbox folder containing the project. On Android, same flow via the Files app. It's one extra step vs desktop, but it works.

**localStorage for crash safety:** regardless of save method, the picker writes every state change to `localStorage[lqwg-lesson-03-state]`. If the tab closes or the phone reboots, reopening the picker restores the last state. This is independent of the save button.

**Three buttons in the picker:**
- **Copy JSON** — clipboard (current behavior, works everywhere)
- **Save JSON** — File System Access API on desktop, download on mobile
- **Load JSON** — file picker to load a previous `selection.json` (for resuming work or reviewing completed lessons)

### 3.5 Audio review UI — what it shows

A table with one row per phrase. Columns:

| Ref | Form | Arabic preview | Reciter | Recitation | EN TTS | TA TTS | Pair EN | Pair TA |
|-----|------|----------------|---------|-----------|--------|--------|---------|---------|
| 3:18 | شَهِدَ | شَهِدَ ٱللَّهُ... | Husary | ✓ 4.8s | ✓ Andrew | — | ✓ | — |
| 6:19 | شَهَادَة | قُلْ أَيُّ شَىْءٍ... | Alafasy | ✗ missing | — | — | ✗ | ✗ |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

Clicking a row expands it to show:
- Full Arabic fragment
- Trim timestamps (if set)
- File paths for each audio component
- Duration of each component
- Override buttons: "change reciter", "change voice", "regenerate"

The "override" buttons don't launch rebuilds — they edit the in-memory plan, and the teacher clicks **Save JSON** to persist changes. Then the next `build-audio` run picks up the overrides.

At the top, a summary: "14/16 recitations ready, 12/16 English TTS ready, 0/16 Tamil TTS ready, 0/16 pairs built." This is the at-a-glance status.

### 3.6 Mobile considerations

- **Selection picker already has sidebar + responsive layout** — the existing template in `tools/selection-picker/template.html` has a `@media (max-width: 900px)` breakpoint. Test on actual devices.
- **Touch targets** — all buttons must be ≥44px tall. The section-move buttons on cards are currently a bit small.
- **Save JSON on iOS** — confirmed works via the download-to-Files fallback. Android works too.
- **Arabic rendering** — iOS Safari renders Amiri correctly when loaded via Google Fonts. Confirmed.
- **Offline** — the HTML should work offline once loaded. The only external dependency is Google Fonts (Amiri, Inter). Could self-host those as a final hardening step, but not v1.

### 3.7 What LLM sessions still do

The architecture radically reduces LLM involvement. Here's the list of things that still need an LLM:

1. **Root analysis from a new sentence** (Stage 0). Reading Arabic, identifying roots, deciding which are new. One-shot subagent call, ~30 seconds.
2. **Scoring candidate verses** from a freshly-built root JSON. `tools/build-root-inventory.py` (ADR-009) produces the complete catalog in < 1 s but leaves every entry with `scores: null` because the 8-dimension rubric in `docs/SCORING.md` needs pedagogical judgment. The teacher and/or a targeted LLM session then scores a subset — often just the top ~20 most promising — before the picker can pre-fill Learn/Practice defaults. Until that scoring happens, the picker falls back to "all `none`" (see `docs/prompts/picker_generator.md`, null-score fallback).
3. **Writing remark prose** in the selection log (Stage 2.5 `--polish`). Optional. The teacher can write them manually via the picker too.
4. **Translation polish.** When verses are picked, generating simple English (and Tamil) translations in the teacher's preferred style.
5. **Hook text / curiosity gaps / closing narrative** for the published lesson page. The content that's explicitly teacher-voice.
6. **Pedagogical review** (Stage 6 `--llm-review`). The 4-lens learning science check.

Everything else is scripts. And critically: each of the above LLM calls is a **single-shot, well-scoped subagent call** with a clear prompt and a clear output format. No interactive chat. No session state. The LLM reads a JSON, writes a JSON, done. That means the CLI can invoke them from a cron job or a Make target without requiring a human at the keyboard.

### 3.8 What NOT to build in v1

Resist scope creep. Ship the minimum viable pipeline:

- **Don't build** the audio-plan HTML UI. YAML file works, and the audio-review UI covers the dashboard need.
- **Don't build** authentication, cloud sync, or collaboration features. Dropbox is the sync layer.
- **Don't build** a web server. Everything is static files + CLI.
- **Don't build** real-time collaboration on the picker. Single-user assumed.
- **Don't build** a lesson-publishing CMS. The published `lessons/lesson-NN-slug.md` is still hand-edited for now (with script-generated skeleton).
- **Don't migrate existing lessons.** Lessons 1 and 2 stay where they are. The new workflow applies to Lesson 3 onwards. Retrofitting is optional and can wait.

### 3.9 Migration path from current state

The existing Lesson 1 and Lesson 2 artifacts stay where they are. No renames, no moves. The new `.workspace/` directory is added alongside. When Lesson 3 starts, it uses the new workflow from scratch. If the old workflow's files (`docs/selections/lesson-NN.md`, etc.) need regenerating later, a one-time migration script can backfill `.workspace/lesson-01/` and `.workspace/lesson-02/` from existing data — but this is optional and can be deferred indefinitely.

## 4. Open questions the teacher should answer before implementation

1. **Dropbox path conventions.** When "Save JSON" fires on a phone, the teacher has to manually move the file into the project's Dropbox folder. Is that acceptable for v1, or should we invest in a different transport (e.g., the teacher runs a tiny local server on their Mac that the phone uploads to over Tailscale/ngrok)?

2. **Committing `.workspace/` JSONs.** Are the JSONs versioned (committed to git) or ephemeral (gitignored)? My recommendation: **commit them**. They're small (a few KB per lesson), they ARE the source of truth, and committing them means git history shows the evolution of the teacher's decisions per lesson. The HTML files stay gitignored.

3. **One Python CLI or several smaller tools?** `tools/lesson-workflow.py` with subcommands vs separate scripts (`lesson-init.py`, `lesson-picker.py`, `audio-introspect.py`, etc.). My recommendation: **one CLI** — discoverable via `--help`, consistent arg parsing, one import path, easier to extend. Subcommands follow git/docker patterns.

4. **Root analysis as LLM or rule-based?** Parsing roots from a sentence like أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ and identifying "this needs the ر س ل root" could be rule-based (look up each word in an Arabic morphology database) or LLM-based (prompt a subagent). The LLM approach is 99% accurate with the corpus as a reference, the rule-based approach requires a dependency on a morphology library. My recommendation: **LLM subagent**, one-shot, with the corpus URL to verify.

5. **How much of the published lesson page should be auto-generated?** The template is well-understood (see `lessons/lesson-01-allahu-akbar.md`). A skeleton with all the audio tags, heading structure, card scaffolding could be 80% generated. Only the prose explanations (root intro, hook text, closing narrative) need human authoring. My recommendation: **script generates the skeleton, LLM fills the prose via a separate command, teacher reviews**. Don't try to auto-generate the prose — that's where teacher voice matters most.

## 5. Implementation prompt — for a future session

Paste the fenced block below into a fresh Claude Code session to build **Stages 0 and 2.5 only** (init → roots.json → log-generation-from-selection.json). **Stage 1 (the picker generator + template upgrades) is fully specified in [`docs/prompts/picker_generator.md`](picker_generator.md)** — run that prompt in its own session and return here for the init + log pieces. The two prompts are complementary: `picker_generator.md` owns everything about `generate-picker` and the template; this prompt owns `init`, `generate-log`, and `status` / `status-all`.

Prerequisites:
- [ADR-009](../decisions/ADR-009-local-root-pipeline.md) has landed. `tools/build-root-inventory.py` and the vendored data in `tools/data/` exist. `docs/roots/rasul.json` is already committed (429 candidates, Saheeh draft translations). **The old `docs/prompts/batch_completion.md` workflow is obsolete** — do not reference it.
- `docs/prompts/picker_generator.md` may or may not have been run yet. Stage 1 (`generate-picker` subcommand) is NOT in scope for this session, but your `init` and `status` subcommands must coexist gracefully with the version of `tools/lesson-workflow.py` produced by running that prompt. Use the same argparse subparser pattern and `.workspace/lesson-NN/state.json` schema.

---

```
You are building Stages 0 and 2.5 of the lesson authoring workflow CLI
for the "Learn Qur'an Without Grammar" project. Read
docs/prompts/lesson_authoring_workflow.md FIRST — it contains the full
architecture. Stage 1 (generate-picker + template upgrades) is a
separate, self-contained prompt at docs/prompts/picker_generator.md and
is NOT in scope for this session — but your work must coexist with the
tools/lesson-workflow.py produced by that session (same argparse
subparser pattern, same state.json schema).

## Prerequisites you must read

1. docs/prompts/lesson_authoring_workflow.md — vision + architecture
2. docs/prompts/picker_generator.md — Stage 1 spec; your init / log
   subcommands must be compatible with the generate-picker subcommand
   defined there
3. docs/decisions/ADR-009-local-root-pipeline.md — the current root
   inventory pipeline (local, sub-second, offline). The old
   batch_completion.md workflow is OBSOLETE — do not reference it.
4. tools/build-root-inventory.py — the builder your init subcommand
   invokes to populate root JSONs
5. docs/roots/shahida.json — example of the root JSON schema with
   scored entries
6. docs/roots/rasul.json — example of a freshly-built JSON with 429
   unscored candidates + Saheeh draft translations
7. docs/selections/lesson-02.md — example of a selection log (the
   format generate-log emits)

## Your deliverable

Extend tools/lesson-workflow.py with these subcommands (leave the
generate-picker subcommand from picker_generator.md alone if it
exists; create the file with argparse scaffolding if it doesn't):

    lesson-workflow.py init --lesson N --sentence "ARABIC"
    lesson-workflow.py generate-log --lesson N [--polish]
    lesson-workflow.py status [--lesson N]
    lesson-workflow.py status-all

No template changes in this session — those belong to picker_generator.md.

## What each subcommand does

### init

1. Creates `.workspace/lesson-NN/` if not present.
2. Writes `sentence.md` containing the Arabic sentence verbatim.
3. Uses a subagent (general-purpose) to parse the roots from the
   sentence. Prompt the subagent with: the sentence, a list of
   currently-known roots (derived by listing `docs/roots/*.json`), and
   ask for a JSON response like:
     {
       "primary_roots": [
         { "key": "rasul", "three_letter": "ر س ل",
           "root_word": "رَسُول",
           "arabic_root_key_morphology": "رسل",
           "corpus_key": "rsl",
           "status": "new" }
       ],
       "already_taught": ["shahida"],
       "notes": "The أَشْهَدُ form belongs to shahida (taught in L2)..."
     }
   (The extra fields arabic_root_key_morphology and corpus_key are what
   the local builder needs — see ADR-009.)
4. Writes that to `roots.json`.
5. For each primary root marked "new" (i.e., `docs/roots/{key}.json`
   doesn't exist), automatically invoke tools/build-root-inventory.py
   via subprocess:

     python3 tools/build-root-inventory.py \
       --root <arabic_root_key_morphology> \
       --root-word <root_word> \
       --root-transliteration <key> \
       --three-letter "<three_letter>" \
       --three-letter-en "<derived>" \
       --corpus-key <corpus_key> \
       --introduced-in-lesson <N> \
       --output docs/roots/<key>.json

   The builder runs in < 1 second per root (fully offline, see ADR-009),
   so there's no reason to defer it. No separate "run batch_completion"
   step exists anymore. If the builder fails, print its stderr and exit
   non-zero.
6. If a root JSON already exists but is obviously incomplete (< 10
   verses), print a warning but continue — the teacher may have
   hand-curated a subset for an earlier lesson.
7. Writes `state.json`:
     { "lesson": N, "stage": "init-complete",
       "timestamp": "...",
       "roots": {
         "primary": ["rasul"],
         "recall":  ["ilah", "kabura", "shahida"]
       } }

### generate-log (after selection.json exists)

1. Reads `.workspace/lesson-NN/selection.json`.
2. Reads the referenced root JSONs to pull full Arabic text, translations,
   scores for each picked verse.
3. Generates a Markdown file matching the structure of
   docs/selections/lesson-02.md (header, lesson structure table, root
   section, learn table, practice table, recall table, pipeline table,
   audio notes section).
4. For the remark/why column, uses the `remark` field from selection.json
   if present (teacher's edit), else the `score_notes` from the root JSON,
   else an empty string the teacher will fill in.
5. If `--polish` flag is set, spawns a subagent to write teacher-voice
   rationale for each verse (using the existing remark as a seed and the
   pattern from `docs/LESSON-PLAN.md` → "Selection log conventions").
6. Writes to `.workspace/lesson-NN/selection.md`.
7. Updates `state.json` with stage "log-generated".

### status

Reads `.workspace/lesson-NN/state.json` and prints a human-readable summary
of the lesson's current phase. If `--lesson` is omitted, finds the most
recent lesson directory and uses that.

### status-all

Lists every lesson directory in `.workspace/` and its current stage:
    Lesson 1: published
    Lesson 2: published
    Lesson 3: picker-generated (not yet selected)

## Template updates

**None in this session.** All picker template work — Save JSON (File
System Access API + download fallback), Load JSON, localStorage
auto-save, filter bar, three-button layout — lives in
docs/prompts/picker_generator.md. Do not touch
tools/selection-picker/template.html here.

## What you are NOT building in this session

- generate-picker subcommand or any template changes (Stage 1, covered
  by docs/prompts/picker_generator.md)
- audio-plan generation or audio-review HTML (deferred)
- build-audio, verify, publish subcommands (deferred)
- Migration of Lessons 1–2 into `.workspace/` (deferred)
- Cloud sync / server / authentication (never; Dropbox is the sync layer)

## Testing

1. Run:
     lesson-workflow.py init --lesson 3 \
       --sentence "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ"

   Verify:
   - .workspace/lesson-03/{sentence.md, roots.json, state.json} exist.
   - roots.json lists `rasul` as primary and `shahida` under
     already_taught.
   - Because docs/roots/rasul.json is ALREADY COMMITTED (429 candidates
     from ADR-009), the builder auto-invoke either no-ops (file
     exists and is complete) OR re-runs idempotently and reports "0
     appended" — either is acceptable. Do NOT delete the existing
     rasul.json.
   - state.json has stage "init-complete".

2. Sanity-check the root analysis on a root the LLM hasn't seen before.
   Pick a made-up or rare sentence (e.g., the second part of the
   shahādah — "وَأَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ") and verify the
   subagent correctly identifies رَسُول as already-cataloged.

3. (Optional — only if picker_generator.md has already been run)
   Run `lesson-workflow.py generate-picker --lesson 3` and verify the
   picker opens. If picker_generator.md hasn't been run yet, this
   subcommand doesn't exist — skip this step.

4. After a selection.json exists in .workspace/lesson-03/ (either from
   a real picker session or a hand-crafted test file), run:
     lesson-workflow.py generate-log --lesson 3
   Verify .workspace/lesson-03/selection.md is generated and matches
   the format of docs/selections/lesson-02.md.

5. Run `lesson-workflow.py status --lesson 3` and
   `lesson-workflow.py status-all`. Verify output is sensible.

## Constraints

- **Stdlib only for the CLI.** `argparse`, `json`, `pathlib`, `re`,
  `subprocess` (to spawn the subagent via `claude` CLI — but if that's
  too fragile in this session, stub the subagent call behind a
  `--no-llm` flag that skips root analysis and asks the teacher to
  fill `roots.json` manually).
- **Template uses vanilla JS.** No frameworks, no bundlers. The template
  loads Amiri and Inter from Google Fonts (existing) and that's it.
- **JSON-first everywhere.** Prose is generated; never authored directly.
- **Don't commit.** Teacher reviews and commits.
- **Respect existing conventions.** Don't rename anything. Don't move
  `docs/roots/*.json`. Don't touch `docs/selections/lesson-01.md` or
  `docs/selections/lesson-02.md`.

## Scope guard

If at any point you find yourself building something not listed in
"deliverables" above (e.g., "I'll add audio review too since I'm here"),
STOP and document it as a follow-up instead. The scope is intentionally
narrow. Ship the first three stages clean, then iterate.

When done, write a report summarizing:
1. Commands added and tested
2. Template changes made
3. Known edge cases or todos
4. Recommendation for the next slice (audio plan + introspection)
```

---

## 6. Follow-up prompts that should come after this one

This design unlocks three more sessions, to be launched in order:

0. **Stage 1 first** — run `docs/prompts/picker_generator.md` as its own session. That prompt builds the `generate-picker` subcommand + picker template upgrades. Treat it as a prerequisite to Stage 2.5 below, because `generate-log` depends on the selection JSON the picker emits. Section 5 of this document (below) covers Stages 0 and 2.5 and explicitly defers to `picker_generator.md` for Stage 1.

1. **Audio introspection and build CLI.** Adds `introspect-audio`, `build-audio`, `generate-audio-plan` subcommands to `lesson-workflow.py`. Builds the `audio-review.html` dashboard. Roughly the same size as the Stage 0–2 prompt.

2. **Published lesson page skeleton generator.** Adds a `generate-page-skeleton` subcommand that produces the scaffold of `lessons/lesson-NN-slug.md` from `selection.json` + audio manifest. Includes the lesson map, section headers, root intro placeholder, all card markdown with audio tags, summary table, quiz scaffold. Teacher fills in the prose.

3. **Migration of Lessons 1 and 2.** A one-time script that backfills `.workspace/lesson-01/` and `.workspace/lesson-02/` from existing artifacts, so `status-all` shows a complete picture. Low priority — can be done any time or never.

## 7. Why this architecture matters

The current workflow has the LLM in the hot path for EVERY phase of lesson creation. That means: you need a Claude session running, you need to babysit the conversation, you need to be at a computer with Claude Code installed, and you burn tokens on work a bash script could do in a second.

This architecture inverts that. The LLM is a tool the teacher calls occasionally — once to analyze a new root, once to score verses, once to polish prose. Between those calls, the teacher works in HTML pickers and CLI scripts, which cost nothing, run anywhere, and persist state via the filesystem. A phone with a browser and a Dropbox-synced folder is enough to do the high-judgment parts of lesson authoring; a Mac running the CLI does the mechanical parts; the LLM drops in for targeted questions.

This is the shape of a system that can scale to 30+ lessons without becoming a grind. The current shape (LLM-in-the-loop for everything) starts feeling heavy at Lesson 3, which is exactly where we are now.
