# Picker UX Audit + DB Prep Validators

_Created: 2026-04-17 (evening) · Brainstormed interactively with Claude. Amends the [Slice 1 Picker Spec](2026-04-17-slice-1-verse-picker-design.md)._

> This document captures UX refinements and validator design from an audit of the Slice 1 picker spec. Where this doc and the original spec diverge, **this doc wins**.

---

## 1 · Lesson Authoring Phases

Five-phase model replaces the implicit flow in the original spec:

| Phase | What the teacher does | Done when |
|---|---|---|
| **Selection** | Pick 10-12 sentences from ranked candidates | Sentences selected, budgets in range |
| **Annotation** | Write remarks, root/form notes, translations | All selected sentences have teacher notes |
| **Audio** | TTS preview, fragment timestamps, audio production | All sentences have audio files |
| **QA** | Self-review or assign reviewer, checklist-driven | All checklist items pass |
| **Publish** | Final flip — lesson goes live | `phasePublished = "done"` |

Publish button only visible after Selection + Annotation + Audio are complete. QA can be self-review (teacher uses checklist) or delegated to an `assistant` role user.

---

## 2 · Controls Zone

### Layout: Preset pills + "Fine-tune Ranking" collapsible

**Always visible (single row):**

```
Show: [30▾]  |  Scoring: [★ Recommended] [Short] [Frequency]  [⚙ Fine-tune Ranking]
```

- Show count always visible
- Three scoring presets always visible — active preset has highlighted border
- Root filtering has moved to the selection bar chips (see §3) — no root pills here
- "⚙ Fine-tune Ranking" button expands the slider panel below

**Expanded panel (hidden by default):**

Four sliders with plain-English labels:

| Slider | Label | Default |
|---|---|---|
| D1 | Favor common words | 35 |
| D2 | Favor new vocabulary | 25 |
| D3 | Favor short sentences | 40 |
| Diversity | Form diversity | 0.70 |

- D1/D2/D3 codes are tooltip-only, not in the label
- Active preset deactivates (unhighlights) when a slider is dragged manually
- Diversity toggle + decay slider merged into one slider (0 = off, 1 = max)
- "▲ Collapse" button at the bottom of the panel

**Re-ranking is automatic.** Any slider change instantly recomputes rankings. No "Apply" button.

---

## 3 · Selection Bar

### Two-row sticky bar: budget gauges + heatmap chips

**Row 1 — Budget gauges:**

```
[10 / 10-12 SENTENCES]  |  [86 / 100-120 WORDS]  |  [10 / 5-7 FORMS]
```

- Numbers color-coded: green = in range, yellow = outside range
- No action buttons — bar is purely informational + filter control

**Row 2 — Traffic-light heatmap chips:**

```
ILĀH 1/4  [إِلٰه] [إِلٰهَة] [آلِهَة] [اللَّهُمَّ]  │  KABURA 9/16  [كَبِير³] [اسْتَكْبَرَ] [أَكْبَر] ...
```

Each chip = one form. Visual encoding:

| State | Border | Background | When |
|---|---|---|---|
| **×1 (weak retention)** | 2px solid red (#ef4444) | faint red (#fef2f2) | Form appears in only 1 selected sentence |
| **×2 (adequate)** | 2px solid yellow (#f59e0b) | faint yellow (#fffbeb) | Form appears in 2 selected sentences |
| **×3+ (strong)** | 2px solid green (#22c55e) | faint green (#f0fdf4) | Form appears in 3+ selected sentences |
| **Not picked** | 1.5px dashed gray (#d1d5db) | near-white (#fafafa) | Form exists but not in any selected sentence |

- Superscript count shown **only on green (×3+)** chips — red and yellow colors are self-explanatory
- No per-root colors — universal traffic-light system
- Root grouping via label headers: `ILĀH 1/4`, `KABURA 9/16`
- Ghost (dashed) chips show uncovered forms — clickable to discover candidates

### Chips as filter controls

Every chip and root label is clickable:

| Action | Effect |
|---|---|
| Click a form chip | Table filters to sentences containing that form. Clicked chip inverts (dark bg, white text, blue ring). All other chips dim (opacity 0.35). |
| Click a root label | Table filters to all sentences from that root. Label inverts. Other root dims. Chips within the active root stay full opacity. |
| Click same chip again | Clears filter (toggle behavior) |
| Click different chip while filtered | Switches filter directly (no need to clear first) |
| Click a dashed (uncovered) chip | Shows all sentences containing that form — discovery action for adding coverage |
| "✕ Clear filter" button | Returns to unfiltered view. Only visible when a filter is active. |

Status line below chips updates: "Showing **12 sentences** containing **كُبْرَى** · click another chip or clear"

**This replaces the root filter pills** that were in the controls bar in the original spec. Filtering now lives in the selection bar.

### Retired from selection bar

- **Details panel** — all its content (form coverage, budgets, missing forms) is now in the bar itself
- **Clear button** — empty state is a dead end; teacher never wants it
- **Auto Top 10 / Re-rank & Select** — re-ranking is automatic on slider change; initial auto-select fires on page load

---

## 4 · Table

### 8 columns (down from 12)

| # | Column | Width | Notes |
|---|---|---|---|
| 1 | **Score** | 50px | Composite score, sortable. Color by rank position: green = rank 1-10, blue = rank 11-20, gray = rank 21+ |
| 2 | **Ref** | 100px | Surah name + verse ref + fragment indicator: "Al-Baqarah 2:255 (3/9)" |
| 3 | **Forms** | 100px | Form tag chips per sentence — helps scanning |
| 4 | **Arabic** | flex | Right-aligned, Amiri font. Widest possible. Solid blue right-border = full ayah, dashed gray = waqf fragment |
| 5 | **English** | flex | Sahih International draft translation |
| 6 | **Words** | 36px | Word count, sortable |
| 7 | **Bar** | 60px | Stacked D1/D2/D3 contribution bar |
| 8 | **Hook** | 80px | hookReason text, truncated. Full text on hover tooltip. Empty if no Tier-2 scores. |

### Removed columns

- **# (rank badge)** — row position = rank when sorted by score
- **✓ (checkbox)** — whole row is clickable; selected rows have green background
- **D1, D2, D3 (individual scores)** — noise; stacked bar tells the breakdown story

### Row interaction

- Click any row to toggle selection (green background = selected)
- Selected rows persist across filtering and re-ranking
- Sort by any column header; default = Score descending

---

## 5 · Tier-2 LLM Scoring (Simplified)

### No export/import — direct DB access

The original spec's file-based export/import flow is replaced:

| Original | New |
|---|---|
| Teacher clicks "Prepare scoring kit" → app exports prompt + JSON to `tools/tier2-scores/` | Separate CC session reads unscored sentences directly from InstantDB |
| Teacher runs in CC, saves to `tools/tier2-scores/{root}.json` | CC session scores and writes hookScore + hookReason directly to InstantDB |
| Teacher clicks "Import" in app → scores written to DB | InstantDB real-time sync shows scores in picker automatically |

**Retired:** Export button, Import button, `tools/tier2-scores/` directory, `tools/export-tier2-kit.py`, `/api/tier2-scan`, `/api/tier2-import` routes.

### hookScore included in composite when available

When hookScores exist, they **are included in the composite ranking formula** (Phase A1+A2 per SCORING.md). When absent, ranking falls back to Phase A1 only (D1/D2/D3). hookReason appears in the Hook column as context.

**Teacher workflow:**
1. Opens picker → sees ranked sentences (A1-only if no hookScores, A1+A2 if available) → picks 10-12 → done
2. Separately, scoring agent runs hookScores across all roots/sentences and writes to InstantDB
3. If hookScores arrive after selection, ranking may shift but teacher's picks are already committed
4. hookReasons become especially useful during the **Annotation** phase as suggested remarks

For Lessons 1-2 (testing), hookScores are optional — teacher selects without them. For Lessons 3+, they'll likely be pre-computed.

---

## 6 · Retired Concepts

| Concept | Why retired |
|---|---|
| **formLessonDecision** entity | Traffic-light chips already show which forms are taught (covered) vs. not. No explicit taught/unassigned/skipped metadata needed. |
| **Details panel** | All content absorbed into the redesigned selection bar (budgets, chips, missing forms). |
| **Tier-2 export/import** | Replaced by direct InstantDB read/write from a separate CC session. |
| **Per-root chip colors** (blue for ilāh, pink for kabura) | Replaced by universal traffic-light system (red/yellow/green = exposure depth). |
| **D2 (Total Coverage %)** | Already dropped in original spec — confirmed here. |

---

## 7 · Quran DB Prep Validators

### Pipeline overview

```
quran-morphology.txt ──┐
quran-uthmani.txt ─────┼──→ [Step 1: Parse] ──→ [Step 2: Waqf Split] ──→ [Step 3: Narrow] ──→ [Step 4: Score] ──→ [Step 5: Seed InstantDB]
quran-trans-en-sahih.txt┘     SQLite Layer 1       sentences table        root-closure         A1 dimensions       cloud sync
```

Each step has validators that check invariants from the spec. Implementation: `--validate` flag on `build-quran-db.py`, or a standalone `tools/validate-quran-db.py`.

### Step 1: Parse raw data → SQLite Layer 1

| Validator | Check | Expected |
|---|---|---|
| Verse count | `SELECT COUNT(*) FROM verses` | 6,236 |
| Morphology segments | `SELECT COUNT(*) FROM morphology` | ~128,000-130,000 |
| Translation coverage | Every verse has a translation row | 6,236/6,236 |
| No orphan morphology | Every morph segment references a valid verse | 0 orphans |
| Root count | `SELECT COUNT(DISTINCT root) FROM morphology` | ~1,651 |
| Uthmani text match | `verses.arabic` matches quran-uthmani.txt byte-for-byte | 0 mismatches |
| No duplicate refs | `SELECT ref, COUNT(*) ... HAVING COUNT(*) > 1` | 0 rows |

### Step 2: Waqf fragmentation → sentences table

| Validator | Check | Expected |
|---|---|---|
| Coverage | Every verse produces ≥1 sentence | 6,236 verses → ≥6,236 sentences |
| Contiguity | Sentence word ranges are contiguous and cover the full verse | 0 gaps, 0 overlaps |
| Word reassembly | Concatenating all sentences for a verse reconstructs the original | 0 mismatches |
| Waqf verse ratio | Verses with ≥2 sentences (had waqf marks) | ~50% (3,100 ± 100) |
| Length distribution | Sentences with 4-12 words | ~70% of total |
| Ayat al-Kursi (2:255) | Sentence count | 9 |
| Al-Baqarah (2:282) | Sentence count for longest verse | ~17 |
| No empty sentences | Every sentence has ≥1 word | 0 empty |

### Step 3: Root-closure narrowing

| Validator | Check | Expected |
|---|---|---|
| Per-root form counts | Forms per root match existing JSONs | ilah: 4, kabura: 14, shahida: 9, rasul: 7, hayiya: 13, salah: 4, falaha: 2, khayr: 5, nawm: 3, qama: 22 |
| اللَّه exclusion | Sentences containing ONLY اللَّه (no other target forms) excluded | ilāh+kabura: ~2,512 → ~290 |
| No lost forms | Every form from root JSONs appears in ≥1 narrowed sentence | 0 missing forms |
| Verse cross-reference | Narrowed sentence verse refs exist in verses table | 0 orphans |

### Step 4: Phase A1 scoring

| Validator | Check | Expected |
|---|---|---|
| Score completeness | Every narrowed sentence has D1, D2, D3 | 0 unscored |
| Score ranges | D1, D2 ∈ [0, 10]. D3 ∈ {1, 3, 4, 6, 7, 9, 10} (piecewise) | 0 out-of-range |
| D3 determinism | Recompute D3 from word_count, compare to stored | 0 mismatches |
| D1 normalization | min(D1) ≈ 0, max(D1) ≈ 10 across candidate pool | Within 0.5 of endpoints |
| Composite formula | Spot-check: composite = (D1×35 + D2×25 + D3×40) / 100 | 0 mismatches |

### Step 5: Seed to InstantDB

| Validator | Check | Expected |
|---|---|---|
| Row count parity | InstantDB entity counts match SQLite | 0 deltas |
| Arabic byte-match | Sample 50 random sentences, compare Arabic text | 0 mismatches |
| Translation preserved | Sample translations match | 0 mismatches |
| Score preserved | Sample scores match SQLite | 0 mismatches |
| Link integrity | sentence→verse links resolve | 0 broken links |

---

_This spec amends [2026-04-17-slice-1-verse-picker-design.md](2026-04-17-slice-1-verse-picker-design.md). When they diverge, this document wins._
