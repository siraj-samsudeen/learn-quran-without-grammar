# Plan 3.1 — Picker Polish · Overview

> Companion to [2026-04-17-plan-3-1-picker-polish.md](./2026-04-17-plan-3-1-picker-polish.md). 8 leaf-level fixes + final verification. No schema changes. All derived from the Sonnet audit vs `picker-ui-reference.md` + audit spec.

---

## Pre-flight
- **Do:** Restart dev server (pkill + relaunch with `NEXT_PUBLIC_DEV_USER_EMAIL`). Run baseline `tests/picker.spec.ts + dashboard.spec.ts` — must be green.
- **Why/Risk:** Confirms nothing we touched in Plan 3's query refactor left a flaky baseline before we start accumulating polish commits.
- **Test:** Existing suites all pass before any new code.
- **Code:** Shell only.

## Task 1: Fix chip "not-picked" state (critical)
- **Do:** Fix `chipState(count, hasForm)` in [SelectionBar.tsx:47-58](.worktrees/plan-2-instantdb/instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx#L47-L58) — change the guard from `!hasForm` to `count === 0` and drop the second arg at call-site.
- **Why/Risk:** All uncovered forms currently render as red (×1 weak) panic warnings instead of neutral dashed ghosts — the heatmap signal is inverted. Risk: zero-count logic now relies on count being correct; verified by test.
- **Test:** Playwright — assert a chip with `data-count='0'` has computed `border-style: dashed` and `border-color: rgb(209, 213, 219)`.
- **Code:** One-line guard swap; remove second parameter; remove `forms.includes(lemma)` argument.

## Task 2: Full 114-surah name lookup (critical)
- **Do:** Create `src/app/picker/[lessonNumber]/surah-names.ts` with 114-entry `SURAH_NAMES` array + `surahName()` function. Replace the 5-entry inline table in [CandidateTable.tsx:25-33](.worktrees/plan-2-instantdb/instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx#L25-L33) with an import.
- **Why/Risk:** Every surah 6-114 renders as "Surah 63" etc., making the Ref column unrecognizable. Risk: transliteration choices might be inconsistent with the Jekyll site's spelling; using standard Tanzil/Quran-Foundation transliterations.
- **Test:** Playwright — assert NO `data-testid='candidate-row'` matches the `/^Surah \d+/` fallback pattern.
- **Code:** 1 new 114-line data file + 1 import + delete 1 local function.

## Task 3: Load Amiri font via next/font/google
- **Do:** Add `Amiri` from `next/font/google` to [layout.tsx](.worktrees/plan-2-instantdb/instantdb-app/src/app/layout.tsx); expose as `--font-amiri` CSS variable. Update `.font-arabic` rule in globals.css to use the variable.
- **Why/Risk:** Arabic currently falls back to generic serif. Risk: `next/font` requires full dev-server restart (hot-reload doesn't pick up font config) — Step 5 enforces this.
- **Test:** Playwright — assert `getComputedStyle(chip).fontFamily` contains `"amiri"` (case-insensitive).
- **Code:** Small layout.tsx wrapper + 1-line globals.css edit.

## Task 4: Extend column sorts (Forms / Arabic / English)
- **Do:** Extend `SortKey` union in CandidateTable.tsx; add 3 new entries to the `cmp` comparator map; add `onClick` + `cursor-pointer` to Forms/Arabic/English `<th>`s.
- **Why/Risk:** Spec says "sort by any column"; current implementation only wires Score/Ref/Words. Risk: `localeCompare` on Arabic text orders by Unicode codepoint which may not match Arabic alphabetical order — but there's no simple "correct" order across dialects; Unicode-order is the reasonable default.
- **Test:** Playwright — for each of Forms/Arabic/English, click the header, assert first row is still visible (i.e. click didn't blow up).
- **Code:** Extend union + add 3 comparator arrow fns + add `onClick` prop to 3 headers.

## Task 5: Selection bar status line
- **Do:** Add `filteredCount: number` to `SelectionBarProps` in SelectionBar.tsx (and drop `coverageByRoot` — the dead prop). Render `[data-testid='filter-status-line']` showing "Showing N sentences containing [lemma] · click another chip or clear" only when a filter is active. Compute `filteredCount` in page.tsx via `useMemo`.
- **Why/Risk:** Spec requires teacher feedback after every chip click. Risk: computing `filteredCount` in the parent means double-work if CandidateTable also filters — but they use the same filter predicate so the numbers are guaranteed to match.
- **Test:** Playwright — click a chip, assert the status-line `data-testid` is visible and contains "Showing", "sentences", and the clicked chip's lemma.
- **Code:** New prop, new `useMemo` in page.tsx, new conditional JSX block in SelectionBar.

## Task 6: Selection bar hint text + legend
- **Do:** In SelectionBar.tsx, add two new elements below the chip-groups row: a hint text ("Click any form or root to filter the table below") shown only when no filter active, and a persistent 4-item legend (`□ not picked ■ ×1 ■ ×2 ■ ×3+`) with colored swatches matching chip border colors.
- **Why/Risk:** Affordance + onboarding. Risk: minimal — both are display-only additions with no behavior change.
- **Test:** Two Playwright tests — one asserts hint text visibility with no filter, one asserts legend's 4 labels all appear.
- **Code:** Two conditional JSX blocks using `basis-full` to flow onto their own line inside the existing flex container.

## Task 7: Cosmetic polish (6 small fixes in one commit)
- **Do:** Rename "Lemmas" header → "Forms"; rename "# Words" → "Words"; width 40px → 36px; stacked bar `rounded` → `rounded-sm` (2px); move "▲ Collapse" from controls header to bottom of expanded slider panel; add `│` separator between root groups in Row 2.
- **Why/Risk:** Spec fidelity. Risk: all display-only; worst case is visual drift fixable by eyeball.
- **Test:** One tight Playwright test asserting "Lemmas" header is absent, "Forms" is present, "# Words" absent, "Words" present, Collapse button hidden when controls collapsed and visible when expanded.
- **Code:** 6 small edits across CandidateTable.tsx + ControlsBar.tsx + SelectionBar.tsx; React.Fragment needed for the separator.

## Task 8: Hygiene — remove debug text, keep testid probes
- **Do:** In page.tsx, turn the visible "`{N} candidates · auto-top-10: 0`" header label and "Ranked N candidates · top: X.XX" footer into `sr-only` (screen-reader-only) probes that retain their testids but are invisible to sighted users.
- **Why/Risk:** Debug strings polluting the teacher console look unprofessional. Risk: `sr-only` is Tailwind-standard; preserves a11y AND keeps existing tests passing.
- **Test:** Playwright — assert no user-visible text matches "auto-top-10:" or "Ranked N candidates · top:".
- **Code:** Two JSX text swaps + add `sr-only` class; remove now-redundant color/size classes.

## Task 9: Final verification
- **Do:** Run tsc, vitest, Playwright full suite; do a human visual smoke test on `/picker/1` covering all 8 task deliverables; push the branch.
- **Why/Risk:** Catches anything a single task's test missed. Risk: manual eyeballing is subjective; encoded the specific visual checks as a bullet list to reduce variance.
- **Test:** All suites green + validator ALL PASS + visual checklist all ✓.
- **Code:** No code.

---

## Deferred to Plan 3.2 (documented in the plan)

- **Fragment position "(3/9)" indicator** — needs query-layer expansion (`sentence.verse.sentences` reverse link fetch, OR a separate query keyed by touched verse refs). Perf tradeoff warrants its own TDD scope.
- **Dimming logic visual verification** — marked as "needs visual verification" in the audit; not yet confirmed as a bug.
