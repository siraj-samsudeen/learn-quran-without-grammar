# Selection Picker Template

Reusable HTML-based UI for picking verses during lesson creation. Used in Phase 1 of the lesson pipeline (`.claude/skills/lesson-pipeline.md`).

## What it is

A single self-contained HTML file that renders a picker UI in the browser:

- **Sidebar navigation** (left) — click to jump between root sections, Learning/Pipeline slots, and Recall areas. Counts update live and turn colored when their target is hit.
- **Top counters** — `Learning N/10`, `Recall N/5`, `Pipeline N` with real-time progress.
- **Cards for every candidate verse** — grouped by root, then by current placement (Learning/Pipeline/None, or Recall/Pipeline/None for previous-lesson roots).
- **Per-card section buttons** — click `Learning`, `Pipeline`, `None` to move the verse. For Recall cards (previous-lesson roots), only `Recall`, `Pipeline`, `None` are shown — a previous-lesson verse can never be the current lesson's Learning.
- **Editable remarks** — the "Why" field on each card is `contenteditable`. Click and type to override the AI-suggested rationale. Edited fields are highlighted green and the edits are included in the JSON output.
- **Copy JSON button** — writes the final selection payload directly to clipboard with a toast confirmation. The payload includes only the refs (not the full verse data), plus any edited remarks.

## How to use for a new lesson

1. **Copy the template:**
   ```bash
   cp tools/selection-picker/template.html .claude/tmp/lesson-NN-picker.html
   ```

2. **Edit the `LESSON_CONFIG` block** (near the top of the `<script>` section). Everything the picker needs is in that one object:
   - `lesson_number` — integer
   - `anchor` — the Arabic anchor phrase
   - `targets` — `{ learning: 10, recall: 5 }` (adjust if the lesson shape differs)
   - `current_groups` — array of `{ key, arabic, title }` for the lesson's roots (usually 1 for single-root lessons, 2 for two-root lessons)
   - `recall_groups` — array of `{ key, arabic, title }` for previous-lesson roots from which Recall candidates are drawn
   - `verses` — array of verse objects (see schema below)

3. **Verse schema:**
   ```javascript
   {
     ref: "3:18",                        // surah:ayah
     group: "shahida",                   // must match a group.key in current_groups or recall_groups
     form: "شَهِدَ",                     // Arabic form being taught
     score: 12,                          // final score from docs/SCORING.md
     defaultSection: "learning",          // learning | recall | pipeline | none
     arabic: "شَهِدَ ٱللَّهُ ...",      // the arabic_fragment (trimmed if needed)
     english: "Allah bears witness...",  // teacher-style simple English
     why: "Allah Himself bearing..."     // one-sentence rationale (editable in the UI)
   }
   ```

4. **Open the file in a browser:**
   ```bash
   open .claude/tmp/lesson-NN-picker.html
   ```

5. **Teacher picks verses, clicks Copy JSON, pastes back in chat.**

## Expected JSON output

The Copy JSON button produces:

```json
{
  "lesson": 2,
  "anchor": "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ",
  "selections": {
    "learning": [
      { "ref": "3:18", "form": "شَهِدَ", "group": "shahida" },
      { "ref": "6:19", "form": "شَهَادَة", "group": "shahida",
        "remark": "GOLDMINE — edited by teacher to emphasize multi-form nature" }
    ],
    "recall": [...],
    "pipeline": [...]
  }
}
```

- Verses left in `none` are simply omitted.
- Verses with an edited `why` field get a `remark` field with the new text.
- The picker does NOT echo back the full verse arabic/english — only refs + metadata. This keeps the payload compact.

## Design principles

**Why a single HTML file (no build step):** the picker should be usable in under 30 seconds — no npm install, no dev server. A static file opened with `open` works every time.

**Why sidebar + sections (not Kanban columns):** verses are heterogeneous (different Arabic lengths, long rationales). A single-column scroll with sticky sidebar gives each card room to breathe without horizontal cramping.

**Why editable remarks:** the AI's initial rationale for picking a verse is often close but not exactly what the teacher would say. Making it editable captures the teacher's voice (which is what ends up in the selection log and shapes future AI recommendations via the teacher-override pattern in `docs/LESSON-PLAN.md`).

**Why sections are group-aware:** the teacher made this explicit — "Learning has to be from this lesson. Recall is only for previous lessons." So the picker physically prevents miscategorization by showing different buttons on different cards.
