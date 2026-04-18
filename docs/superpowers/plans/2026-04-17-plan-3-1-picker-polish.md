# Plan 3.1 — Picker Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 8 spec-vs-live gaps found by the Sonnet audit of `/picker/1` against `picker-ui-reference.md` + `audit spec`: critical chip-state bug, missing surah names, unloaded Amiri font, non-sortable columns, missing status/hint/legend text, debug text visible to teacher, dead prop, cosmetic drift.

**Architecture:** Leaf-level fixes only — no schema changes, no new entities, no query rewrites. Each task touches one or two files and lands as one atomic commit. The fragment position indicator "(3/9)" is DEFERRED to Plan 3.2 because it requires a data-layer change (fetch sibling sentences per verse) that warrants its own TDD scope.

**Tech Stack:** Next.js 16 App Router · React 19 · `@instantdb/react` (typed) · Tailwind v4 · `next/font/google` (new dep) · `feather-testing-core` DSL on `@playwright/test`.

---

## Pre-flight

```bash
cd /Users/siraj/Dropbox/Siraj/Projects/learn-quran-without-grammar/.worktrees/plan-2-instantdb
git status                    # clean
git log --oneline -1          # expect a8ad9403 fix(picker): client-filter roots...
```

No branch change — continue on `feature/plan-3-picker-ui`.

Restart the dev server before Task 1 so hot-reload picks up every change cleanly:

```bash
pkill -f "next dev" 2>/dev/null; sleep 1
cd instantdb-app
NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com npm run dev &
```

Wait for port 3000. Run the existing test suite once to establish a baseline:

```bash
npx playwright test tests/picker.spec.ts tests/dashboard.spec.ts
```

All existing tests should pass; if any are failing before Task 1, STOP and resolve before continuing.

---

## File Structure

**Modified:**
- `instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx` — Tasks 1, 5, 6, 7
- `instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx` — Tasks 2, 4, 7
- `instantdb-app/src/app/layout.tsx` — Task 3
- `instantdb-app/src/app/picker/[lessonNumber]/page.tsx` — Task 8 (remove debug text + dead prop)
- `instantdb-app/src/app/picker/[lessonNumber]/ControlsBar.tsx` — Task 7 (move Collapse button)
- `instantdb-app/tests/picker.spec.ts` — every task appends one test

**New:**
- `instantdb-app/src/app/picker/[lessonNumber]/surah-names.ts` — static 114-entry map (Task 2)

**No schema changes. No new entities. No new InstantDB queries.**

---

## Task 1: Fix chip "not-picked" state (critical logic bug)

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx:47-58`
- Modify: `instantdb-app/tests/picker.spec.ts`

**Root cause:** `chipState(count, hasForm)` uses `!hasForm` for the dashed branch, but every chip rendered iterates forms where `forms.includes(lemma)` is `true` — so the dashed branch is unreachable. Forms with `count === 0` fall through to the red (×1) branch. All unselected forms render as urgent red warnings instead of neutral dashed ghosts.

- [ ] **Step 1: Write the failing test**

Append to `instantdb-app/tests/picker.spec.ts` (end of file):

```ts
test("not-picked heatmap chips render dashed gray, not solid red", async ({ page }) => {
  await session(page).visit("/picker/1");
  // Ensure auto-select has settled and the selection bar is populated
  await expect(page.locator("[data-testid='picker-candidate-count']")).toBeVisible();

  // Find a chip with data-count="0" (uncovered form)
  const uncovered = page.locator("[data-testid='heatmap-chip'][data-count='0']").first();
  await expect(uncovered).toBeVisible();

  const borderStyle = await uncovered.evaluate(
    (el) => getComputedStyle(el).borderStyle,
  );
  expect(borderStyle).toBe("dashed");

  const borderColor = await uncovered.evaluate(
    (el) => getComputedStyle(el).borderTopColor,
  );
  // #d1d5db = rgb(209, 213, 219)
  expect(borderColor).toBe("rgb(209, 213, 219)");
});
```

- [ ] **Step 2: Run it — confirm fails**

```bash
npx playwright test tests/picker.spec.ts -g "not-picked heatmap chips"
```

Expected: FAIL — border-style is `solid`, border-color is red (#ef4444 = rgb(239, 68, 68)).

- [ ] **Step 3: Fix `chipState()` in SelectionBar.tsx**

Open [SelectionBar.tsx:47-58](../../instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx#L47-L58). Replace:

```tsx
function chipState(count: number, hasForm: boolean): {
  border: string;
  bg: string;
  text: string;
  dashed: boolean;
} {
  if (!hasForm) {
    return { border: "#d1d5db", bg: "#fafafa", text: "#cbd5e1", dashed: true };
  }
  if (count >= 3) return { border: "#22c55e", bg: "#f0fdf4", text: "#1f2937", dashed: false };
  if (count === 2) return { border: "#f59e0b", bg: "#fffbeb", text: "#1f2937", dashed: false };
  return { border: "#ef4444", bg: "#fef2f2", text: "#1f2937", dashed: false };
}
```

With:

```tsx
function chipState(count: number): {
  border: string;
  bg: string;
  text: string;
  dashed: boolean;
} {
  if (count === 0) {
    return { border: "#d1d5db", bg: "#fafafa", text: "#cbd5e1", dashed: true };
  }
  if (count >= 3) return { border: "#22c55e", bg: "#f0fdf4", text: "#1f2937", dashed: false };
  if (count === 2) return { border: "#f59e0b", bg: "#fffbeb", text: "#1f2937", dashed: false };
  return { border: "#ef4444", bg: "#fef2f2", text: "#1f2937", dashed: false };
}
```

Then find the call-site (same file, looks like `const { border, bg, text, dashed } = chipState(count, forms.includes(lemma));`) and replace with:

```tsx
const { border, bg, text, dashed } = chipState(count);
```

- [ ] **Step 4: Re-run test — confirm passes**

```bash
npx playwright test tests/picker.spec.ts -g "not-picked heatmap chips"
```

Expected: PASS.

- [ ] **Step 5: Re-run the full picker suite to ensure no regression**

```bash
npx playwright test tests/picker.spec.ts
```

Expected: all existing picker tests still pass.

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/src/app/picker/\[lessonNumber\]/SelectionBar.tsx instantdb-app/tests/picker.spec.ts
git commit -m "fix(picker): chip not-picked state renders dashed gray, not red"
```

---

## Task 2: Full 114-surah name lookup (critical data bug)

**Files:**
- Create: `instantdb-app/src/app/picker/[lessonNumber]/surah-names.ts`
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx:25-33`
- Modify: `instantdb-app/tests/picker.spec.ts`

**Root cause:** `surahName()` maps only surahs 1–5. Every reference to surahs 6–114 shows "Surah 63", "Surah 7", etc. Teachers can't recognize the reference at a glance.

- [ ] **Step 1: Write the failing test**

Append to `tests/picker.spec.ts`:

```ts
test("candidate Ref column shows named surahs for all 114 surahs", async ({ page }) => {
  await session(page).visit("/picker/1");
  await expect(page.locator("[data-testid='picker-candidate-count']")).toBeVisible();

  // Look for any row whose Ref cell starts with "Surah " (unnamed fallback).
  // This asserts the fallback is never used for any surah in the live pool.
  const unnamed = page.locator("[data-testid='candidate-row']").filter({
    hasText: /^Surah \d+/,
  });
  await expect(unnamed).toHaveCount(0);
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx playwright test tests/picker.spec.ts -g "named surahs for all 114"
```

Expected: FAIL — some rows show "Surah N N:M" instead of the surah name.

- [ ] **Step 3: Create the surah-names.ts lookup**

Create `instantdb-app/src/app/picker/[lessonNumber]/surah-names.ts`:

```ts
// English transliterations of all 114 surah names. Index i = surah number i+1.
// Source: Tanzil/Al-Quran Foundation standard transliterations.
export const SURAH_NAMES: readonly string[] = [
  "Al-Fatiha",
  "Al-Baqarah",
  "Ali-Imran",
  "An-Nisa",
  "Al-Ma'idah",
  "Al-An'am",
  "Al-A'raf",
  "Al-Anfal",
  "At-Tawbah",
  "Yunus",
  "Hud",
  "Yusuf",
  "Ar-Ra'd",
  "Ibrahim",
  "Al-Hijr",
  "An-Nahl",
  "Al-Isra",
  "Al-Kahf",
  "Maryam",
  "Ta-Ha",
  "Al-Anbiya",
  "Al-Hajj",
  "Al-Mu'minun",
  "An-Nur",
  "Al-Furqan",
  "Ash-Shu'ara",
  "An-Naml",
  "Al-Qasas",
  "Al-Ankabut",
  "Ar-Rum",
  "Luqman",
  "As-Sajdah",
  "Al-Ahzab",
  "Saba",
  "Fatir",
  "Ya-Sin",
  "As-Saffat",
  "Sad",
  "Az-Zumar",
  "Ghafir",
  "Fussilat",
  "Ash-Shura",
  "Az-Zukhruf",
  "Ad-Dukhan",
  "Al-Jathiyah",
  "Al-Ahqaf",
  "Muhammad",
  "Al-Fath",
  "Al-Hujurat",
  "Qaf",
  "Adh-Dhariyat",
  "At-Tur",
  "An-Najm",
  "Al-Qamar",
  "Ar-Rahman",
  "Al-Waqi'ah",
  "Al-Hadid",
  "Al-Mujadila",
  "Al-Hashr",
  "Al-Mumtahanah",
  "As-Saff",
  "Al-Jumu'ah",
  "Al-Munafiqun",
  "At-Taghabun",
  "At-Talaq",
  "At-Tahrim",
  "Al-Mulk",
  "Al-Qalam",
  "Al-Haqqah",
  "Al-Ma'arij",
  "Nuh",
  "Al-Jinn",
  "Al-Muzzammil",
  "Al-Muddaththir",
  "Al-Qiyamah",
  "Al-Insan",
  "Al-Mursalat",
  "An-Naba",
  "An-Nazi'at",
  "Abasa",
  "At-Takwir",
  "Al-Infitar",
  "Al-Mutaffifin",
  "Al-Inshiqaq",
  "Al-Buruj",
  "At-Tariq",
  "Al-A'la",
  "Al-Ghashiyah",
  "Al-Fajr",
  "Al-Balad",
  "Ash-Shams",
  "Al-Layl",
  "Ad-Duha",
  "Ash-Sharh",
  "At-Tin",
  "Al-Alaq",
  "Al-Qadr",
  "Al-Bayyinah",
  "Az-Zalzalah",
  "Al-Adiyat",
  "Al-Qari'ah",
  "At-Takathur",
  "Al-Asr",
  "Al-Humazah",
  "Al-Fil",
  "Quraysh",
  "Al-Ma'un",
  "Al-Kawthar",
  "Al-Kafirun",
  "An-Nasr",
  "Al-Masad",
  "Al-Ikhlas",
  "Al-Falaq",
  "An-Nas",
];

export function surahName(surah: number): string {
  if (surah < 1 || surah > 114) return `Surah ${surah}`;
  return SURAH_NAMES[surah - 1];
}
```

- [ ] **Step 4: Replace the inline `surahName` in CandidateTable.tsx**

Open [CandidateTable.tsx:25-33](../../instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx#L25-L33). Replace:

```tsx
function surahName(surah: number): string {
  const names = ["Al-Fatiha", "Al-Baqarah", "Ali-Imran", "An-Nisa", "Al-Ma'idah" /* etc — keep short; full list lives in a later plan */];
  return names[surah - 1] ?? `Surah ${surah}`;
}
```

With:

```tsx
import { surahName } from "./surah-names";
```

Put this import near the top of the file (alongside the other imports). Delete the local `surahName` function entirely. Leave `refWithFragment` in place — it continues to call `surahName(surah)`.

- [ ] **Step 5: Re-run test — confirm passes**

```bash
npx playwright test tests/picker.spec.ts -g "named surahs for all 114"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/src/app/picker/\[lessonNumber\]/surah-names.ts instantdb-app/src/app/picker/\[lessonNumber\]/CandidateTable.tsx instantdb-app/tests/picker.spec.ts
git commit -m "fix(picker): full 114-surah name lookup in Ref column"
```

---

## Task 3: Load Amiri font via next/font

**Files:**
- Modify: `instantdb-app/src/app/layout.tsx`
- Modify: `instantdb-app/src/app/globals.css`
- Modify: `instantdb-app/tests/picker.spec.ts`

**Root cause:** `globals.css` declares `.font-arabic { font-family: "Amiri", ... }` but the Amiri font is never loaded. The browser falls back to generic serif. Arabic chips and table cells render in the wrong font.

- [ ] **Step 1: Write the failing test**

Append to `tests/picker.spec.ts`:

```ts
test("Arabic text renders in Amiri font", async ({ page }) => {
  await session(page).visit("/picker/1");
  await expect(page.locator("[data-testid='picker-candidate-count']")).toBeVisible();

  // Pick the first Arabic chip in the selection bar
  const chip = page.locator("[data-testid='heatmap-chip']").first();
  await expect(chip).toBeVisible();

  const fontFamily = await chip.evaluate(
    (el) => getComputedStyle(el).fontFamily,
  );
  // next/font wraps Amiri in a CSS variable; the computed family includes "Amiri"
  // (either literal or via the variable resolution).
  expect(fontFamily.toLowerCase()).toContain("amiri");
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx playwright test tests/picker.spec.ts -g "Arabic text renders in Amiri"
```

Expected: FAIL — the computed font is the fallback (e.g. "serif" or "Noto Sans Arabic").

- [ ] **Step 3: Load Amiri via next/font/google in layout.tsx**

Open [layout.tsx](../../instantdb-app/src/app/layout.tsx). Replace the whole file with:

```tsx
import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import "./globals.css";
import AuthGate from "./AuthGate";

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  title: "LQWG — Teacher",
  description: "Learn Qur'an Without Grammar — teacher console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={amiri.variable}>
      <body className="bg-[#fafaf7] text-[#1a1a1a] min-h-screen">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Update the `.font-arabic` rule in globals.css**

Open [globals.css](../../instantdb-app/src/app/globals.css). Find the `.font-arabic` rule (around line 29). Replace:

```css
.font-arabic { font-family: "Amiri", ... }
```

With:

```css
.font-arabic {
  font-family: var(--font-amiri), "Amiri", "Noto Serif", serif;
}
```

The `var(--font-amiri)` is the CSS custom property set by `next/font/google` — Next.js 16 bundles the font and injects it via this variable. The literal `"Amiri"` is a belt-and-braces fallback if the variable ever fails to resolve.

- [ ] **Step 5: Re-run test — confirm passes**

Hard-restart the dev server so the font loader picks up the new config:

```bash
pkill -f "next dev" 2>/dev/null; sleep 2
NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com npm run dev &
```

Wait for port 3000, then:

```bash
npx playwright test tests/picker.spec.ts -g "Arabic text renders in Amiri"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/src/app/layout.tsx instantdb-app/src/app/globals.css instantdb-app/tests/picker.spec.ts
git commit -m "feat(picker): load Amiri font via next/font/google"
```

---

## Task 4: Extend column sorts (Forms, Arabic, English)

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx`
- Modify: `instantdb-app/tests/picker.spec.ts`

**Spec (ref.md §4, audit §4):** "Sort by any column header; default = Score descending." Current implementation only wires Score / Ref / Words. Forms, Arabic, English must also sort. (Bar + Hook are display-only — spec doesn't require sorting them.)

**Design decisions:**
- **Forms column:** sort by the first form's lemmaArabic alphabetically, then by root key. This surfaces sentences sharing the same lead form together.
- **Arabic column:** sort by the arabic text alphabetically (Unicode-ordered).
- **English column:** sort by the translation alphabetically, case-insensitive.

- [ ] **Step 1: Write the failing test**

Append to `tests/picker.spec.ts`:

```ts
test("clicking the Forms / Arabic / English column headers sorts the table", async ({ page }) => {
  await session(page).visit("/picker/1");
  await expect(page.locator("[data-testid='candidate-row']").first()).toBeVisible();

  for (const header of ["Forms", "Arabic", "English"]) {
    const th = page.locator("thead th").filter({ hasText: header });
    await th.click();
    // After clicking, the first row should be stable (non-empty) — verifies click wired up
    await expect(page.locator("[data-testid='candidate-row']").first()).toBeVisible();
    // Click again to toggle direction
    await th.click();
    await expect(page.locator("[data-testid='candidate-row']").first()).toBeVisible();
  }
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx playwright test tests/picker.spec.ts -g "clicking the Forms"
```

Expected: FAIL — `th` click does nothing because headers lack onClick, OR test hits a TS error if SortKey union doesn't include "forms".

- [ ] **Step 3: Extend SortKey + comparators + onClick wiring**

Open [CandidateTable.tsx](../../instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx).

Find `export type SortKey = "score" | "words" | "ref";` (near line 7). Replace with:

```tsx
export type SortKey = "score" | "words" | "ref" | "forms" | "arabic" | "english";
```

Find the `cmp = { ... }` block that maps sort keys to comparator functions (around line 47-64). Add three new entries:

```tsx
const cmp = {
  score: (a: SentenceRow, b: SentenceRow) =>
    (props.rankById.get(b.id)?.score ?? 0) - (props.rankById.get(a.id)?.score ?? 0),
  words: (a: SentenceRow, b: SentenceRow) => a.wordCount - b.wordCount,
  ref: (a: SentenceRow, b: SentenceRow) => a.verseRef.localeCompare(b.verseRef, "en", { numeric: true }),
  forms: (a: SentenceRow, b: SentenceRow) => {
    const al = a.forms?.[0]?.lemmaArabic ?? "";
    const bl = b.forms?.[0]?.lemmaArabic ?? "";
    return al.localeCompare(bl);
  },
  arabic: (a: SentenceRow, b: SentenceRow) => a.arabic.localeCompare(b.arabic),
  english: (a: SentenceRow, b: SentenceRow) => {
    const ae = a.verse?.translation?.english?.toLowerCase() ?? "";
    const be = b.verse?.translation?.english?.toLowerCase() ?? "";
    return ae.localeCompare(be);
  },
}[sort.key];
```

Find the `<th>` elements (around lines 70-83). Add `onClick={() => toggleSort(...)}` and `cursor-pointer` where missing. The Forms / Arabic / English headers should go from:

```tsx
<th className="px-2 py-2 text-left w-[100px]">Forms</th>
<th className="px-2 py-2 text-right">Arabic</th>
<th className="px-2 py-2 text-left">English</th>
```

To:

```tsx
<th className="px-2 py-2 text-left w-[100px] cursor-pointer" onClick={() => toggleSort("forms")}>
  Forms
</th>
<th className="px-2 py-2 text-right cursor-pointer" onClick={() => toggleSort("arabic")}>
  Arabic
</th>
<th className="px-2 py-2 text-left cursor-pointer" onClick={() => toggleSort("english")}>
  English
</th>
```

- [ ] **Step 4: Re-run test — confirm passes**

```bash
npx playwright test tests/picker.spec.ts -g "clicking the Forms"
```

Expected: PASS.

- [ ] **Step 5: Re-run full picker suite**

```bash
npx playwright test tests/picker.spec.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/src/app/picker/\[lessonNumber\]/CandidateTable.tsx instantdb-app/tests/picker.spec.ts
git commit -m "feat(picker): sort by Forms / Arabic / English columns"
```

---

## Task 5: Selection bar status line

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx`
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/page.tsx`
- Modify: `instantdb-app/tests/picker.spec.ts`

**Spec (ref.md §3):** After clicking a chip, show a status line: "Showing **12 sentences** containing **كُبْرَى** · click another chip or clear" with `font-size:9px; color:#64748b`. The count reflects the filtered table size.

**Design decision:** Pass the filtered-row count back UP from the table to the selection bar via a prop callback — or compute it in the parent (`page.tsx`) and pass it down as a prop. The parent has `data.candidates.length` before filter and the filter state, so computing the filtered count there is trivial.

- [ ] **Step 1: Write the failing test**

Append to `tests/picker.spec.ts`:

```ts
test("clicking a chip shows a status line with the filtered sentence count", async ({ page }) => {
  await session(page).visit("/picker/1");
  await expect(page.locator("[data-testid='picker-candidate-count']")).toBeVisible();

  const chip = page.locator("[data-testid='heatmap-chip'][data-count='0']").first();
  const lemma = await chip.getAttribute("data-lemma");
  await chip.click();

  const status = page.locator("[data-testid='filter-status-line']");
  await expect(status).toBeVisible();
  await expect(status).toContainText("Showing");
  await expect(status).toContainText("sentences");
  if (lemma) await expect(status).toContainText(lemma);
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx playwright test tests/picker.spec.ts -g "status line with the filtered"
```

Expected: FAIL — no `[data-testid='filter-status-line']` element exists.

- [ ] **Step 3: Add `filteredCount` prop to `SelectionBarProps`, render status line when filter active**

Open [SelectionBar.tsx](../../instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx).

Extend the prop type:

```tsx
export type SelectionBarProps = {
  selectedSentences: SentenceRow[];
  lessonRoots: { key: string; transliteration: string }[];
  lessonForms: { rootKey: string; lemmaArabic: string }[];
  activeFilter: FilterState;
  onFilterChange: (next: FilterState) => void;
  /** Number of sentences remaining after the current filter is applied. */
  filteredCount: number;
};
```

(Note: also DROP `coverageByRoot` from the type — it's dead weight per the audit's finding 3.6. This aligns with Task 8 which removes its use in `page.tsx`.)

Find the `{anyFilter && (...)}` block that renders the "✕ Clear filter" button (near the bottom of the Row 2 JSX). Add a status line just above it. Inside the SelectionBar's return JSX, locate where `{anyFilter && (...)}` appears, and add this block RIGHT BEFORE IT:

```tsx
{anyFilter && (
  <div
    data-testid="filter-status-line"
    className="basis-full text-[9px] text-[#64748b]"
  >
    Showing <strong>{props.filteredCount} sentences</strong>{" "}
    {props.activeFilter.kind === "form" && (
      <>
        containing{" "}
        <strong className="font-arabic" dir="rtl">
          {props.activeFilter.lemmaArabic}
        </strong>
      </>
    )}
    {props.activeFilter.kind === "root" && (
      <>
        from root <strong>{props.activeFilter.rootKey}</strong>
      </>
    )}{" "}
    · click another chip or clear
  </div>
)}
```

- [ ] **Step 4: Pass `filteredCount` from page.tsx**

Open [page.tsx](../../instantdb-app/src/app/picker/[lessonNumber]/page.tsx).

At the top of the component (after `ranked` is computed), add:

```tsx
const filteredCount = useMemo(() => {
  if (filter.kind === "none") return data.candidates.length;
  if (filter.kind === "root") {
    return data.sentences.filter((s) =>
      (s.forms ?? []).some((f) => f.rootKey === filter.rootKey),
    ).length;
  }
  return data.sentences.filter((s) =>
    (s.forms ?? []).some(
      (f) => f.rootKey === filter.rootKey && f.lemmaArabic === filter.lemmaArabic,
    ),
  ).length;
}, [filter, data.sentences, data.candidates.length]);
```

Then in the `<SelectionBar>` JSX, add `filteredCount={filteredCount}`. Also drop `coverageByRoot={new Map()}` — it's no longer in the prop type:

```tsx
<SelectionBar
  selectedSentences={selected}
  lessonRoots={data.roots.map((r) => ({ key: r.key, transliteration: r.transliteration }))}
  lessonForms={data.forms.map((f) => ({ rootKey: f.rootKey, lemmaArabic: f.lemmaArabic }))}
  activeFilter={filter}
  onFilterChange={setFilter}
  filteredCount={filteredCount}
/>
```

- [ ] **Step 5: Re-run test — confirm passes**

```bash
npx playwright test tests/picker.spec.ts -g "status line with the filtered"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/src/app/picker/\[lessonNumber\]/SelectionBar.tsx instantdb-app/src/app/picker/\[lessonNumber\]/page.tsx instantdb-app/tests/picker.spec.ts
git commit -m "feat(picker): selection bar status line with filtered count"
```

---

## Task 6: Selection bar hint text + legend

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx`
- Modify: `instantdb-app/tests/picker.spec.ts`

**Spec (ref.md §2 + §3):**
- Hint text below chips (when no filter active): "Click any form or root to filter the table below" at `font-size:9px; color:#94a3b8`.
- Legend (always visible below chips): `□ not picked  ■ ×1  ■ ×2  ■ ×3+` with color-keyed squares matching the chip border colors.

- [ ] **Step 1: Write the failing tests**

Append to `tests/picker.spec.ts`:

```ts
test("selection bar shows a hint text when no filter is active", async ({ page }) => {
  await session(page).visit("/picker/1");
  await expect(page.locator("[data-testid='picker-candidate-count']")).toBeVisible();
  await expect(page.getByText(/Click any form or root to filter/)).toBeVisible();
});

test("selection bar shows a 4-item traffic-light legend", async ({ page }) => {
  await session(page).visit("/picker/1");
  await expect(page.locator("[data-testid='picker-candidate-count']")).toBeVisible();
  const legend = page.locator("[data-testid='heatmap-legend']");
  await expect(legend).toBeVisible();
  await expect(legend).toContainText("not picked");
  await expect(legend).toContainText("×1");
  await expect(legend).toContainText("×2");
  await expect(legend).toContainText("×3");
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx playwright test tests/picker.spec.ts -g "hint text|traffic-light legend"
```

Expected: FAIL — neither element exists.

- [ ] **Step 3: Add hint text and legend to SelectionBar**

Open `SelectionBar.tsx`. After the Row 2 closing `</div>` (the div that wraps the chip groups) but BEFORE the outer wrapping div closes — so both elements live inside the sticky bar — add:

```tsx
{!anyFilter && (
  <div
    data-testid="heatmap-hint"
    className="basis-full text-[9px] text-[#94a3b8] px-3 pb-1"
  >
    Click any form or root to filter the table below
  </div>
)}

<div
  data-testid="heatmap-legend"
  className="basis-full flex gap-2 px-3 pb-1 text-[9px] text-[#94a3b8]"
>
  <span className="inline-flex items-center gap-1">
    <span
      className="inline-block w-2 h-2 rounded-sm"
      style={{ border: "1.5px dashed #d1d5db" }}
    />
    not picked
  </span>
  <span className="inline-flex items-center gap-1">
    <span
      className="inline-block w-2 h-2 rounded-sm"
      style={{ background: "#ef4444" }}
    />
    ×1
  </span>
  <span className="inline-flex items-center gap-1">
    <span
      className="inline-block w-2 h-2 rounded-sm"
      style={{ background: "#f59e0b" }}
    />
    ×2
  </span>
  <span className="inline-flex items-center gap-1">
    <span
      className="inline-block w-2 h-2 rounded-sm"
      style={{ background: "#22c55e" }}
    />
    ×3+
  </span>
</div>
```

Wrap both in the flex container (the one that currently holds root chip groups) by placing them as siblings of the root-group `<div>`s, so they flow onto new lines thanks to `basis-full`.

- [ ] **Step 4: Re-run tests — confirm pass**

```bash
npx playwright test tests/picker.spec.ts -g "hint text|traffic-light legend"
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add instantdb-app/src/app/picker/\[lessonNumber\]/SelectionBar.tsx instantdb-app/tests/picker.spec.ts
git commit -m "feat(picker): selection bar hint text + traffic-light legend"
```

---

## Task 7: Cosmetic polish (labels, widths, border-radius, Collapse button, separator)

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx`
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/ControlsBar.tsx`
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx`

**Batch of 5 small cosmetic fixes in one commit:**
1. Column header "Lemmas" → "Forms"
2. Column header "# Words" → "Words"
3. Words column width 40px → 36px
4. Stacked D1/D2/D3 bar `rounded` (4px) → `rounded-sm` (2px)
5. Move "▲ Collapse" button from controls bar header to the BOTTOM of the expanded slider panel
6. Add `│` separator between root groups in SelectionBar Row 2

- [ ] **Step 1: Write a single tight test covering the observable parts**

Append to `tests/picker.spec.ts`:

```ts
test("cosmetic polish: header text, widths, and collapse button position", async ({ page }) => {
  await session(page).visit("/picker/1");
  await expect(page.locator("[data-testid='picker-candidate-count']")).toBeVisible();

  // 1. "Forms" header, not "Lemmas"
  await expect(page.locator("thead th").filter({ hasText: "Lemmas" })).toHaveCount(0);
  await expect(page.locator("thead th").filter({ hasText: /^Forms$/ })).toHaveCount(1);

  // 2. "Words" header, not "# Words"
  await expect(page.locator("thead th").filter({ hasText: /^# Words/ })).toHaveCount(0);
  await expect(page.locator("thead th").filter({ hasText: /^Words$/ })).toHaveCount(1);

  // 5. "▲ Collapse" button is INSIDE the expanded slider panel, not in the controls header
  // When collapsed, only "⚙ Fine-tune Ranking" should be visible
  await expect(page.getByRole("button", { name: /Fine-tune Ranking/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Collapse/ })).toHaveCount(0);
  // When expanded, "Collapse" appears inside the slider panel
  await page.getByRole("button", { name: /Fine-tune Ranking/ }).click();
  await expect(page.getByRole("button", { name: /Collapse/ })).toBeVisible();
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx playwright test tests/picker.spec.ts -g "cosmetic polish"
```

Expected: FAIL — at minimum the "Lemmas" header still exists and the Collapse button is in the header row when collapsed.

- [ ] **Step 3: Apply the 6 fixes**

**3a. CandidateTable.tsx — rename + width + bar radius.**

In the `<thead>` block, replace:

```tsx
<th className="px-2 py-2 text-left w-[100px] cursor-pointer" onClick={() => toggleSort("forms")}>
  Forms
</th>
```

— wait, this is from Task 4. The original header was "Lemmas". Verify the current file: if Task 4 already renamed, no-op. If not, ensure the header string is "Forms" (not "Lemmas").

Replace the Words header:

```tsx
<th className="px-2 py-2 text-right w-[40px] cursor-pointer" onClick={() => toggleSort("words")}>
  # Words
</th>
```

With:

```tsx
<th className="px-2 py-2 text-right w-[36px] cursor-pointer" onClick={() => toggleSort("words")}>
  Words
</th>
```

Replace the stacked-bar `<div>` (around line 129):

```tsx
<div className="flex h-[8px] w-[50px] rounded overflow-hidden">
```

With:

```tsx
<div className="flex h-[8px] w-[50px] rounded-sm overflow-hidden">
```

**3b. ControlsBar.tsx — move "▲ Collapse" into the expanded panel.**

Open [ControlsBar.tsx](../../instantdb-app/src/app/picker/[lessonNumber]/ControlsBar.tsx). Change the ml-auto trigger button so it ONLY shows "⚙ Fine-tune Ranking" when collapsed (remove the ternary that toggles the text). Then, inside the expanded panel `{expanded && (...)}` JSX, add a Collapse button at the BOTTOM.

Replace the existing trigger button block:

```tsx
<button
  type="button"
  onClick={() => setExpanded((v) => !v)}
  className="ml-auto px-[10px] py-[3px] rounded-md bg-[#f1f5f9] border border-[#cbd5e1] text-[11px] text-[#64748b]"
>
  {expanded ? "▲ Collapse" : "⚙ Fine-tune Ranking"}
</button>
```

With:

```tsx
{!expanded && (
  <button
    type="button"
    onClick={() => setExpanded(true)}
    className="ml-auto px-[10px] py-[3px] rounded-md bg-[#f1f5f9] border border-[#cbd5e1] text-[11px] text-[#64748b]"
  >
    ⚙ Fine-tune Ranking
  </button>
)}
```

Inside the `{expanded && (...)}` block, AFTER the 4-column slider grid closes, add a right-aligned Collapse button:

```tsx
<div className="flex justify-end pt-2">
  <button
    type="button"
    onClick={() => setExpanded(false)}
    className="px-[10px] py-[3px] rounded-md bg-[#f1f5f9] border border-[#cbd5e1] text-[11px] text-[#64748b]"
  >
    ▲ Collapse
  </button>
</div>
```

**3c. SelectionBar.tsx — `│` separator between root groups.**

Inside the Row 2 chip-groups flex container, after each root `<div>` except the last, render a `<span>` separator. Simplest implementation: wrap each root group in a fragment that includes the separator, and use `map` with index to skip the last one.

Find the `props.lessonRoots.map((root) => (...))` call. Change:

```tsx
{props.lessonRoots.map((root) => {
  // ... (existing per-root rendering)
  return (
    <div key={root.key} ...>
      {/* root label + chips */}
    </div>
  );
})}
```

To:

```tsx
{props.lessonRoots.map((root, idx) => {
  // ... (existing per-root rendering)
  return (
    <React.Fragment key={root.key}>
      <div /* existing className */>
        {/* root label + chips */}
      </div>
      {idx < props.lessonRoots.length - 1 && (
        <span className="text-[#d1d5db] text-[10px] self-center">│</span>
      )}
    </React.Fragment>
  );
})}
```

(Add `import React from "react";` at the top of the file if not already present — Fragments used explicitly need the import.)

- [ ] **Step 4: Re-run test — confirm passes**

```bash
npx playwright test tests/picker.spec.ts -g "cosmetic polish"
```

Expected: PASS.

- [ ] **Step 5: Re-run full picker suite**

```bash
npx playwright test tests/picker.spec.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/src/app/picker/\[lessonNumber\]/CandidateTable.tsx instantdb-app/src/app/picker/\[lessonNumber\]/ControlsBar.tsx instantdb-app/src/app/picker/\[lessonNumber\]/SelectionBar.tsx instantdb-app/tests/picker.spec.ts
git commit -m "polish(picker): column labels, widths, bar radius, collapse position, root separator"
```

---

## Task 8: Hygiene — remove debug text + dead prop

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/page.tsx`
- Modify: `instantdb-app/tests/picker.spec.ts`

**Cleanup from audit findings 1.5 + 3.6:**
1. Delete the `{data.candidates.length} candidates · auto-top-10: ...` debug label in the header (currently serves as the `[data-testid='picker-candidate-count']` probe — repurpose to a hidden testid-only div).
2. Delete the "Ranked N candidates · top: X.XX" footer.
3. `coverageByRoot` prop on `<SelectionBar>` was already dropped in Task 5 — verify no dangling references.

- [ ] **Step 1: Write the failing test**

Append to `tests/picker.spec.ts`:

```ts
test("no debug text visible to the teacher", async ({ page }) => {
  await session(page).visit("/picker/1");
  await expect(page.locator("[data-testid='picker-candidate-count']")).toBeAttached();

  // User-visible text must NOT contain any of these debug strings
  await expect(page.getByText(/auto-top-10:/)).toHaveCount(0);
  await expect(page.getByText(/Ranked \d+ candidates · top:/)).toHaveCount(0);
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx playwright test tests/picker.spec.ts -g "no debug text"
```

Expected: FAIL — both "auto-top-10:" and "Ranked ... · top:" strings are visible.

- [ ] **Step 3: Rewrite the header `<span>` and remove the footer `<div>`**

Open [page.tsx](../../instantdb-app/src/app/picker/[lessonNumber]/page.tsx).

Find the header section with the debug label (around line 154):

```tsx
<span
  data-testid="picker-candidate-count"
  data-count={data.candidates.length}
  className="text-[11px] text-[#64748b]"
>
  {data.candidates.length} candidates · auto-top-10: {autoTop10.length}
</span>
```

Replace with an invisible probe element that still satisfies the testid but isn't shown as text:

```tsx
<span
  data-testid="picker-candidate-count"
  data-count={data.candidates.length}
  className="sr-only"
>
  {data.candidates.length} candidates
</span>
```

Find the footer `<div>` (around line 183):

```tsx
<div
  data-testid="picker-ranked-count"
  data-count={ranked.length}
  className="mt-4 text-[11px] text-[#64748b]"
>
  Ranked {ranked.length} candidates · top: {ranked[0]?.composite.toFixed(2) ?? "—"}
</div>
```

Replace with:

```tsx
<div
  data-testid="picker-ranked-count"
  data-count={ranked.length}
  className="sr-only"
>
  {ranked.length} ranked
</div>
```

Both probes retain their testids so existing tests that assert `[data-testid='picker-candidate-count']` / `[data-testid='picker-ranked-count']` still pass. `sr-only` (Tailwind's screen-reader-only utility) hides them visually while keeping them in the DOM for tests.

Finally, verify the SelectionBar call-site from Task 5 doesn't still pass `coverageByRoot={new Map()}` — if it does, remove that line.

- [ ] **Step 4: Re-run test — confirm passes**

```bash
npx playwright test tests/picker.spec.ts -g "no debug text"
```

Expected: PASS.

- [ ] **Step 5: Run full picker + dashboard suites**

```bash
npx playwright test tests/picker.spec.ts tests/dashboard.spec.ts
```

Expected: all pass (the sr-only probes keep the count testids available for existing tests).

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/src/app/picker/\[lessonNumber\]/page.tsx instantdb-app/tests/picker.spec.ts
git commit -m "chore(picker): hide debug text behind sr-only, remove dead coverageByRoot prop"
```

---

## Task 9: Final verification

- [ ] **Step 1: Type-check**

```bash
cd /Users/siraj/Dropbox/Siraj/Projects/learn-quran-without-grammar/.worktrees/plan-2-instantdb/instantdb-app
npx tsc --noEmit -p .
```

Expected: only the pre-existing `src/lib/auth.ts:30` error remains. Zero new errors in any file this plan touched.

- [ ] **Step 2: Full unit-test pass**

```bash
npm run test:unit
```

Expected: 6/6 vitest tests PASS (scoring.ts — unchanged by this plan).

- [ ] **Step 3: Full Playwright suite**

Ensure dev server runs with `NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com`:

```bash
npx playwright test
```

Expected: all tests PASS across `dashboard.spec.ts`, `login.spec.ts`, `picker.spec.ts`.

- [ ] **Step 4: Visual smoke test**

Open http://localhost:3000/picker/1 in the browser. Eyeball-verify:
- Uncovered form chips show DASHED GRAY borders (not red). ✓
- Ref column shows real surah names ("Al-Baqarah", "An-Nur", etc.) for every row — no "Surah N" fallback. ✓
- Arabic text (chips + table) renders in the Amiri serif face. ✓
- Click "Forms" header → table re-orders. Click "Arabic" header → table re-orders. Click "English" header → table re-orders. ✓
- Click any chip → "Showing N sentences containing ..." appears below the chips; clear button appears. ✓
- When no filter is active, hint text "Click any form or root to filter the table below" is visible below chips. ✓
- Legend with 4 swatches (not picked / ×1 / ×2 / ×3+) is always visible. ✓
- When controls bar is collapsed, only "⚙ Fine-tune Ranking" button is at the top-right. Click to expand; "▲ Collapse" button appears at the bottom of the slider panel. ✓
- Column header says "Forms" not "Lemmas", and "Words" not "# Words". ✓
- No "auto-top-10: 0" or "Ranked N candidates · top: X.XX" debug strings anywhere. ✓

- [ ] **Step 5: Final push**

```bash
git status           # should be clean
git log --oneline -10
git push origin feature/plan-3-picker-ui
```

Report done.

---

## Deferred to Plan 3.2

These audit findings are NOT addressed here because they require a data-layer change (expanded query or additional entity) that warrants its own TDD scope:

- **Fragment position indicator "(3/9)" in Ref column** (audit finding 3.2): requires fetching all sibling sentences per verse for every candidate, so the client can compute "3rd of 9." Either expand `usePickerData` Phase 2 to nest `sentence.verse.sentences` (adds data volume), or add a separate query keyed by the touched verse refs. Worth its own plan because the perf tradeoff needs measurement.

- **Dimming logic visual verification for root filter** (audit finding 2.5): marked as "needs visual verification." Not a confirmed bug; deferring to a Plan 3.2 visual/regression pass if the teacher finds it confusing in real use.

---

## Self-Review

- **Spec coverage:** Every finding from the Sonnet audit is mapped to a task — critical items (2.1 chip state, 3.1 surah names) to Tasks 1+2; important items (1.1 Amiri, 2.3 sorts, 2.2 status line, 3.3 hint, 3.4 legend) to Tasks 3+4+5+6; minor/cosmetic (1.2-1.7, 3.6) to Tasks 7+8; fragment indicator (3.2) explicitly deferred with rationale.
- **Placeholder scan:** No TBDs. Every step shows concrete code or exact commands.
- **Type consistency:** `SortKey` extended consistently in Task 4 and used in Task 7's column tests. `SelectionBarProps` drops `coverageByRoot` in Task 5 and the usage is cleaned in the same task's Step 4. The `filteredCount` prop name matches between Tasks 5 definition and Task 5 call-site.
- **TDD discipline:** every implementation task has a failing test FIRST, confirmation of failure, then implementation, then re-run. Matches the pattern established in Plan 3 after Task 5's ordering fix.
