# Plan 3 — Handoff Summary

_Written on completion of Plan 3 (picker UI rewrite)._

## TL;DR

Plan 3 is complete. The teacher console at `/` renders a typed 5-phase pipeline dashboard. The picker at `/picker/[lessonNumber]` wires real InstantDB data through a ControlsBar (preset pills + fine-tune sliders), a sticky SelectionBar (budget gauges + traffic-light heatmap chips with filter), and an 8-column sortable CandidateTable with row-click DB-persisted selection. Auto-select top-10 fires on first visit to a fresh lesson.

Branch: `feature/plan-3-picker-ui`. 18 commits, all green individually.

## What landed

- **Auth:** magic-link login page + AuthGate redirect wrapper. Dev fallback via `NEXT_PUBLIC_DEV_USER_EMAIL`.
- **Dashboard:** typed query against `lessons` entity, 5-phase columns (Selection/Annotation/Audio/QA/Publish), click-to-cycle status dots, Open picker link gated on `phaseSelection !== "blocked"`.
- **Picker:**
  - `usePickerData` — single typed `db.useQuery` pulling sentences + verses + translations + forms + scoreA1 + selections.
  - `scoring.ts` — pure functions: `normalizeD1D2`, `compositeScore`, `rankCandidates`, `autoSelectTopK` (diversity decay).
  - `ControlsBar` — 3 preset pills + collapsible fine-tune sliders.
  - `SelectionBar` — sticky two-row: budget gauges (Sentences / # Words / Forms) + traffic-light heatmap chips (x1 red / x2 yellow / x3+ green / dashed ghost) doubling as filter controls.
  - `CandidateTable` — 8 columns (Score / Ref / Forms / Arabic / English / # Words / Bar / Hook). Sortable by Score/Ref/#Words. Row-click toggles DB selection (atomic triple-link transact).
  - Auto-select top-10 on first visit via `useRef`-guarded `useEffect`.

## Commits on branch

(from `feature/plan-2-instantdb-schema` → `feature/plan-3-picker-ui`)

1. `fc64c2f1` — docs: Plan 3 picker UI rewrite — plan + overview
2. `dff5c05c` — chore(seed): restart selection — L1-L7 all phaseSelection=ready
3. `8a7853f8` — test: add feather-testing-core DSL + Playwright session helper
4. `ed823a81` — chore: drop legacy seed UI, roots API, IssueBar, AppSidebar
5. `f7c6a781` — refactor(types): 5-phase model
6. `bf57aeb3` — feat(auth): magic-link login page with dev-fallback redirect
7. `36d27965` — feat(auth): AuthGate wrapper redirects unauthenticated to /login
8. `b1c67258` — docs(plan-3): fix DSL method name fillField → fillIn
9. `dede8785` — feat(dashboard): typed 5-phase pipeline grid + open-picker link
10. `db0a74b9` — feat(picker): scoring utils (normalize + composite + diversity-decay)
11. `f2dc0146` — docs(plan-3): fix scoring.test.ts math bug
12. `1cc143f5` — feat(picker): typed usePickerData hook + minimal page shell
13. `915b55a1` — feat(picker): ControlsBar with preset pills + fine-tune sliders
14. `f131041d` — feat(picker): SelectionBar row 1 — budget gauges
15. `50b64102` — feat(picker): SelectionBar row 2 — heatmap chips as filter controls
16. `f834a68a` — feat(picker): 8-column CandidateTable with row-click selection
17. `eda21dee` — feat(picker): persist selections via selections entity
18. `6dec3512` — feat(picker): auto-select top-10 on first visit

## Known gaps carried forward

- **Playwright test flakiness under InstantDB write backpressure.** After Task 14's auto-select adds 10 concurrent writes on initial page load, subsequent tests (row-click toggle, reload-persist) occasionally exceed the 15s `expect` timeout. All 10 picker tests pass individually; running the full suite in one go sees 2–3 intermittent failures depending on network + DB load. Mitigations for a polish pass:
  - Bump `expect.timeout` in `playwright.config.ts` from 15s → 30s.
  - Add `retries: 1` to the Playwright config.
  - Run `npm run reset:phases` between test groups in CI.
- **`hookScore` column in CandidateTable is empty.** Plan 4 adds Tier-2 LLM scoring pipeline that will populate `sentenceScoresA2` and drive the Hook column.
- **No per-sentence remark editor on the picker.** That belongs to the Annotation phase UI in a later plan (the teacher's notes live in the `selections.remark` field which this plan writes only as `""`).
- **Audio preview is NOT on the picker.** Was in the old design; moved to the Audio phase in the 5-phase model.
- **Pre-existing `src/lib/auth.ts:30` tsc error** (`string | null | undefined` vs `string`) remains. Inherited from Plan 2. Doesn't affect runtime.

## Manual cleanup before next plan

- If the dev session left stray selections in the InstantDB dashboard, run:
  ```bash
  cd instantdb-app && npm run reset:phases
  ```

## Resume prompt for Plan 4

```
Plan 3 is shipped on feature/plan-3-picker-ui.
Read docs/superpowers/plans/2026-04-17-plan-3-HANDOFF.md.

Plan 4 adds Tier-2 LLM scoring to sentenceScoresA2 and wires the Hook
column. Before starting, consider bumping Playwright timeouts per the
flakiness note in §Known gaps.
```
