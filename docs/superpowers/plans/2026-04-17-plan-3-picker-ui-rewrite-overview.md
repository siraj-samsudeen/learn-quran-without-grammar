# Plan 3 — Picker UI Rewrite · Overview

> Companion to [2026-04-17-plan-3-picker-ui-rewrite.md](./2026-04-17-plan-3-picker-ui-rewrite.md). This overview presents every task with four items (Do / Why+Risk / Test / Code) per the [plan-presentation preference](~/Dropbox/Siraj/Projects/siraj-claude-vault/cross-project/preference-plan-presentation.md). Use this to scan-review; use the full plan to execute.

---

## Pre-flight (agent executes before Task 1)

### P1 — Confirm Plan 2 still live
- **Do:** Run `tools/validate-instantdb.py`.
- **Why/Risk:** Guards against a stale schema drift since Plan 2 finished. Risk: if validator fails, Plan 3 tasks cascade-fail with confusing errors.
- **Test:** "ALL PASS (7 checks)" prints.
- **Code:** No code — just the validator.

### P2 — Create feature branch
- **Do:** `git checkout -b feature/plan-3-picker-ui` off Plan 2's branch.
- **Why/Risk:** Keeps Plan 3 isolated from Plan 2's merged work. Risk: zero — branches are cheap.
- **Test:** `git branch --show-current` returns `feature/plan-3-picker-ui`.
- **Code:** Git only.

### P3 — Reset every lesson to `phaseSelection=ready` + wipe selections
- **Do:** Edit `LESSON_SEEDS` (L1/L2 → ready), create `scripts/reset-lesson-phases.mjs`, run it against the live DB.
- **Why/Risk:** Siraj is restarting Lesson 1's selection. Every lesson must start at `ready` so Task 6 tests are order-independent. Risk: destructive — wipes all existing `selections` rows; UUIDs preserved but any in-progress teacher work is lost (intentional this time).
- **Test:** Script prints `Reset 7 lessons to phaseSelection=ready.` and dashboard shows the matching state.
- **Code:** Admin script queries `{lessons, selections}`, deletes all selections in a single `transact`, then updates each lesson's 5 phase fields.

---

## Task 1: Install feather-testing-core + session helper
- **Do:** `npm install -D feather-testing-core`; create `tests/support/session.ts` that wraps `createPlaywrightSession(page)`.
- **Why/Risk:** Lets every subsequent test read like `session(page).visit("/").assertText(...)` — matches the testing-DSL preference. Risk: the package's exported name might differ from `createPlaywrightSession`; mitigated by a tsc check.
- **Test:** `npx tsc --noEmit` compiles the helper clean.
- **Code:** One 4-line file exporting `session(page)`.

## Task 2: Delete legacy files
- **Do:** `git rm` `src/app/seed/page.tsx`, `src/app/api/roots/route.ts`, `src/components/IssueBar.tsx`, `src/components/AppSidebar.tsx`, `scripts/seed.mjs`.
- **Why/Risk:** Removes code that queries the old schema and would silently keep compiling while shadowing the rewrite. Risk: one of the deleted files might still be imported somewhere; grep catches this.
- **Test:** Deletion — no unit test. Verification is "no import-not-found errors after delete."
- **Code:** Delete only.

## Task 3: Rewrite `src/lib/types.ts` to 5-phase model
- **Do:** Replace the 7-phase `PhaseName` with `["selection","annotation","audio","qa","published"]` + matching `PHASE_LABELS` and `PHASE_FIELD`.
- **Why/Risk:** Single source of truth for every `phaseXxx` access. Risk: mismatched key on `PHASE_FIELD` (e.g. `phaseQa` vs `phaseQA`) would render all QA dots blank — fix is type-safe lookup via `keyof LessonRow`.
- **Test:** Type-only change — `tsc --noEmit` is the test.
- **Code:** 20-line file with 3 constants + one type guard.

## Task 4: Magic-link login page
- **Do:** Create `src/app/login/page.tsx` with email input → code input flow using `sendMagicCode` + `signInWithCode` helpers from Plan 2.
- **Why/Risk:** Real auth for production; dev-email fallback already wired in `auth.ts`. Risk: async error handling is narrow — if InstantDB returns a non-Error object, the `err.message` read breaks. Handled by the `x instanceof Error` guard.
- **Test:** Playwright — visits `/login`, sees "Teacher Login", fills email, clicks "Send magic code", asserts "Enter the 6-digit code" appears.
- **Code:** Two-form React component, conditional on `sent` boolean.

## Task 5: AuthGate wrapper
- **Do:** Create `src/app/AuthGate.tsx`, modify `src/app/layout.tsx` to wrap children in `<AuthGate>`.
- **Why/Risk:** Enforces login-or-redirect globally without per-page checks. Risk: AuthGate renders "Checking session…" forever if `useCurrentUser` never resolves — guarded by InstantDB's built-in `isLoading` and the dev-email fast path.
- **Test:** Playwright — with `NEXT_PUBLIC_DEV_USER_EMAIL=` unset, visiting `/` redirects to `/login`.
- **Code:** Client component using `usePathname` + `useEffect` to call `router.replace("/login")` when `!user`.

## Task 6: Dashboard rewrite
- **Do:** Rewrite `src/app/page.tsx` against typed schema; 5 phase columns; "Open picker" link gated on `phaseSelection !== "blocked"`. Rewrite `tests/dashboard.spec.ts`.
- **Why/Risk:** Old dashboard queries fields that no longer exist. Risk: Test state pollution — fixed by using Annotation dot (not Selection) in the cycle test, and cycling 4 times to restore. Regression risk — fixed by a test that asserts NONE of the retired labels (Scoring/Picking/Writing/Tamil/Review) appear.
- **Test:** Five tests — "shows 7 lessons and 5 phase columns", "no retired labels", "every lesson starts at ready", "Annotation dot cycles and restores", "Open picker link on L3 routes to /picker/3".
- **Code:** ~170 lines: typed `LessonRow`, `StatusDot`, `PhaseCell` (click-to-cycle), `LessonRowComp`, `LessonDetail` (notes editor).

## Task 7: `scoring.ts` utilities
- **Do:** Create `scoring.ts` with `normalizeD1D2`, `compositeScore`, `rankCandidates`, `autoSelectTopK` (with diminishing-returns diversity decay). Install vitest.
- **Why/Risk:** Pure functions — easiest TDD in the plan. Risk: min-max degenerate pool returns all-zero normalizations (correct behavior; tested).
- **Test:** Vitest — 6 assertions: preset weights produce composite=10 on all-10s input, zero input yields zero, decay=0.5 picks a new-form candidate over a duplicate-form one, decay=1.0 degenerates to raw top-K.
- **Code:** 80 lines, no React. `autoSelectTopK` loop: `effective = base * decay^priorExposure`; pick argmax, update coverage map, repeat.

## Task 8: `usePickerData` hook + minimal page shell (TDD)
- **Do:** Create `usePickerData.ts` (typed `db.useQuery` that joins sentences → verse, forms, scoreA1, selectedIn). Rewrite `page.tsx` to a minimal shell that renders `data.candidates.length` behind `[data-testid='picker-candidate-count']`.
- **Why/Risk:** Hook can't be pure-unit-tested without mocking InstantDB. Integration test on a minimal page is the honest TDD path. Risk: the hook's candidate filter (`s.forms.length>0 && s.scoreA1 !== undefined`) is broader than the eventual per-lesson root filter — that narrowing lives in Task 11's chip filter. Acceptable because auto-select still uses scores & diversity.
- **Test:** Playwright — `/picker/3` renders a positive candidate count; `/picker/99` shows "not found".
- **Code:** ~100-line hook returning `{isLoading, lesson, candidates, selections, ...}`; ~30-line page with just Link + title + count div.

## Task 9: ControlsBar (TDD)
- **Do:** Create `ControlsBar.tsx` with 3 preset pills + "⚙ Fine-tune Ranking" collapsible 4-slider panel. Extend `page.tsx` to own `controls` state + compute `ranked` via `scoring.ts`.
- **Why/Risk:** Locks user in on the scoring model before richer UI arrives. Risk: rapid slider drags cause re-computation storms — `useMemo` on `[candidates, weights]` stabilizes this.
- **Test:** Playwright — "★ Recommended" visible; clicking "Short" preset changes the ranked-count text.
- **Code:** Stateless component with 3 preset buttons (aria-pressed on active) + range inputs bound to `onChange(weights)`.

## Task 10: SelectionBar row 1 — budget gauges (TDD)
- **Do:** Create `SelectionBar.tsx` (gauges only); wire below `<ControlsBar>`.
- **Why/Risk:** Gives teacher immediate feedback on "am I in range." Risk: word-count sum is recomputed every render; harmless since it's O(selectedSentences.length).
- **Test:** Playwright — visiting `/picker/3` shows "Sentences", "Words", "Forms" text.
- **Code:** 3 `<Gauge>` components in a flex row; color green if `in [min,max]`, yellow otherwise.

## Task 11: SelectionBar row 2 — chips + filter (TDD)
- **Do:** Extend SelectionBar with a second row: per-root chip clusters using traffic-light colors (×1 red / ×2 yellow / ×3+ green / dashed-gray ghost). Clicking a chip sets `activeFilter` state; "✕ Clear filter" appears when active.
- **Why/Risk:** Doubles as coverage heatmap + table filter. Risk: chip's `aria-pressed` toggle doesn't coordinate with the table until Task 12 wires `filter` → table — handled by state-lifting into `page.tsx`.
- **Test:** Playwright — clicking the first heatmap chip shows "Clear filter" button; clicking again hides it.
- **Code:** Map over `lessonRoots`; per root, map over forms → `<button>` chip with `data-testid='heatmap-chip'` and inline style keyed by count.

## Task 12: CandidateTable (TDD)
- **Do:** Create `CandidateTable.tsx` — 8 columns (Score / Ref / Forms / Arabic / English / Words / Bar / Hook), sortable by Score/Ref/Words, row-click toggles selection. Wire into `page.tsx` with `localSelection` optimistic set.
- **Why/Risk:** The heart of the picker. Risk: Arabic border (solid blue = full ayah, dashed gray = waqf fragment) is computed via `s.verse.arabic !== s.arabic` — if `s.verse` is undefined (join failure) it renders solid by accident. Defensive fallback added.
- **Test:** Playwright — row click flips `data-selected`; "Show count" dropdown set to 20 caps rows ≤ 20.
- **Code:** `useMemo({filtered→sorted→sliced})`; `<tr>` with testids and inline `style={selected ? greenBg : undefined}`.

## Task 13: Persist selections to InstantDB
- **Do:** Replace `localSelection` set with real `transact` that creates/deletes `selections` entity rows linked to `lesson`, `sentence`, `pickedBy`.
- **Why/Risk:** Selections must survive reload. Risk: the triple-link `transact` must be atomic — if split, `required: true` link validation rejects partial records.
- **Test:** Playwright — click a row, reload, assert same `data-sentence-id` still `data-selected='true'`.
- **Code:** `db.transact([tx.selections[id].update({...}), tx.selections[id].link({lesson, sentence, pickedBy})])`.

## Task 14: Auto-select top-10 on first load
- **Do:** `useEffect` guarded by `useRef` fires once when data loaded + selections empty; writes 10 picks from `autoSelectTopK(...)` into DB.
- **Why/Risk:** Teacher opens lesson → 10 picks already there, can iterate. Risk: React 19 Strict Mode double-invokes effects — guard prevents double-write of 20 picks.
- **Test:** Playwright — visiting a fresh lesson settles on exactly 10 `data-selected='true'` rows.
- **Code:** `useEffect` that flat-maps 10 IDs into `transact(updates + links)`.

## Task 15: Docs handoff
- **Do:** Write `docs/superpowers/plans/2026-04-17-plan-3-HANDOFF.md`.
- **Why/Risk:** Gives future sessions the Plan 2-style handoff. Risk: handoff drifts from reality if written too early; written last.
- **Test:** No test — documentation.
- **Code:** Markdown summary of Plan 3 deliverables + known gaps (hookScore empty until Plan 4; no per-sentence remark editor until Annotation phase).

## Task 16: Final verification
- **Do:** Run `npm run build`, `npm run test:unit`, full Playwright suite, `validate-instantdb.py`.
- **Why/Risk:** Catches anything a single task's test missed. Risk: one auto-select test depends on a clean L7 — documented as skip-with-note if DB dirty.
- **Test:** All suites green + validator ALL PASS.
- **Code:** No code — runs.
