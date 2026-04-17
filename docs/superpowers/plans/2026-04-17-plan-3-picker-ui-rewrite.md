# Plan 3 — Picker UI Rewrite (Dashboard + Picker + Auth)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the InstantDB Next.js app against the typed schema pushed in Plan 2 so a teacher can log in with a magic link, see the 5-phase lesson pipeline on `/`, open `/picker/[lessonNumber]` and pick 10–12 sentences using preset pills + fine-tune sliders + a two-row sticky selection bar + an 8-column sortable table with auto-select-top-10 on load.

**Architecture:** App-Router pages (`src/app/**/page.tsx`) are Client Components that talk directly to typed InstantDB via `db.useQuery({...})`. All ranking math runs in the browser (`scoring.ts`). Selection state is mirrored to the `selections` entity so a refresh restores picks. Auth is a thin `AuthGate` wrapper that short-circuits on `NEXT_PUBLIC_DEV_USER_EMAIL`. Tests use `feather-testing-core` with the Playwright adapter.

**Tech Stack:** Next.js 16 App Router · React 19 · `@instantdb/react` (typed `init({appId, schema})`) · Tailwind v4 · TypeScript 5 · `feather-testing-core` DSL on `@playwright/test`.

---

## Pre-flight (do NOT skip)

**The agent executing this plan MUST perform all pre-flight steps before Task 1.**

### P1. Confirm Plan 2 is LIVE

```bash
cd /Users/siraj/Dropbox/Siraj/Projects/learn-quran-without-grammar/.worktrees/plan-2-instantdb
tools/.venv/bin/python tools/validate-instantdb.py
#   expect: ALL PASS
```

If the validator reports mismatches, STOP and resolve per Plan 2 §2 before continuing.

### P2. Create the feature branch

```bash
cd .worktrees/plan-2-instantdb
git checkout feature/plan-2-instantdb-schema
git checkout -b feature/plan-3-picker-ui
```

### P3. Reset lesson phases — every lesson starts at `phaseSelection=ready`

**Rationale:** Siraj is restarting the selection process from Lesson 1. The existing seed has L1/L2 as fully `done` (because they were live on the Jekyll site before the InstantDB app existed). For Plan 3's test suite, every lesson must start in the same state so tests are order-independent and so "Open picker" renders for every row.

**P3.1 — Update `LESSON_SEEDS` source of truth.**

Edit [instantdb-app/scripts/seed-from-sqlite.mjs](.worktrees/plan-2-instantdb/instantdb-app/scripts/seed-from-sqlite.mjs). Replace the L1 and L2 entries in `LESSON_SEEDS` so their phase fields match L3–L7:

```js
{ lessonNumber: 1, slug: "lesson-01-allahu-akbar", title: "Allahu Akbar",
  seedArabic: "اللهُ أَكْبَرُ", seedEnglish: "Allah is Greater", notes: "Restarting selection",
  phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
{ lessonNumber: 2, slug: "lesson-02-shahida", title: "I Bear Witness",
  seedArabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ", seedEnglish: "I bear witness that there is no god but Allah", notes: "Restarting selection",
  phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
```

Leave L3–L7 as they already are.

**P3.2 — Create a one-off in-place reset script.**

Create [instantdb-app/scripts/reset-lesson-phases.mjs](.worktrees/plan-2-instantdb/instantdb-app/scripts/reset-lesson-phases.mjs):

```js
// One-off admin script: reset every lesson to phaseSelection="ready" and wipe
// all selections. Preserves lesson UUIDs (so any downstream references still
// resolve). Does NOT reseed verses/sentences/forms/scores — those are expensive
// (5-10 min) and unchanged.
//
// Idempotent — safe to run more than once.
//
// Run:
//   INSTANT_APP_ADMIN_TOKEN=... node scripts/reset-lesson-phases.mjs
import { init, tx } from "@instantdb/admin";

const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.error("Set INSTANT_APP_ADMIN_TOKEN (find it in the InstantDB dashboard).");
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const READY_STATE = {
  phaseSelection: "ready",
  phaseAnnotation: "blocked",
  phaseAudio: "blocked",
  phaseQA: "blocked",
  phasePublished: "blocked",
};

const { lessons, selections } = await db.query({ lessons: {}, selections: {} });
console.log(`Found ${lessons.length} lessons, ${selections.length} selections.`);

if (selections.length > 0) {
  await db.transact(selections.map((s) => tx.selections[s.id].delete()));
  console.log(`Deleted ${selections.length} selections.`);
}

await db.transact(
  lessons.map((l) =>
    tx.lessons[l.id].update({ ...READY_STATE, notes: "Restarting selection" })
  )
);
console.log(`Reset ${lessons.length} lessons to phaseSelection=ready.`);
console.log("Done.");
```

**P3.3 — Add the npm script entry.**

Edit `instantdb-app/package.json` `scripts` block:

```json
"reset:phases": "node scripts/reset-lesson-phases.mjs"
```

**P3.4 — Install the admin SDK if not already present.**

From `instantdb-app/`:

```bash
npm ls @instantdb/admin || npm install @instantdb/admin
```

**P3.5 — Execute the reset.**

Ask the user for `INSTANT_APP_ADMIN_TOKEN` (visible in the InstantDB dashboard → App settings → Admin token). Then:

```bash
cd instantdb-app
INSTANT_APP_ADMIN_TOKEN=<token> npm run reset:phases
```

Expected output:

```
Found 7 lessons, N selections.
Deleted N selections.
Reset 7 lessons to phaseSelection=ready.
Done.
```

**P3.6 — Verify in the dashboard.**

Open https://instantdb.com/dash?app=b1c9a636-2a46-4be6-a055-16d6f2ebd233 → `lessons` table. Every row's `phaseSelection` should be `"ready"` and every other phase `"blocked"`. The `selections` table should be empty.

**P3.7 — Commit the seed + script changes.**

```bash
cd .worktrees/plan-2-instantdb
git add instantdb-app/scripts/seed-from-sqlite.mjs \
        instantdb-app/scripts/reset-lesson-phases.mjs \
        instantdb-app/package.json \
        instantdb-app/package-lock.json
git commit -m "chore(seed): restart selection — L1-L7 all phaseSelection=ready

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Only after all of P1–P3.7 pass does the agent proceed to Task 1.

---

## File Structure

**Rewritten:**
- `instantdb-app/src/app/page.tsx` — 5-phase dashboard (was 7-phase)
- `instantdb-app/src/app/picker/[lessonNumber]/page.tsx` — new picker (thin shell, delegates to components)
- `instantdb-app/src/lib/types.ts` — replace old `PhaseName`/`VerseSection` with the 5-phase model
- `instantdb-app/tests/dashboard.spec.ts`
- `instantdb-app/tests/picker.spec.ts`

**New:**
- `instantdb-app/src/app/login/page.tsx` — magic-link form
- `instantdb-app/src/app/AuthGate.tsx` — auth wrapper (client component)
- `instantdb-app/src/app/picker/[lessonNumber]/ControlsBar.tsx`
- `instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx`
- `instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx`
- `instantdb-app/src/app/picker/[lessonNumber]/scoring.ts` — normalize + composite + auto-select
- `instantdb-app/src/app/picker/[lessonNumber]/usePickerData.ts` — typed useQuery + derived state
- `instantdb-app/tests/support/session.ts` — feather-testing-core Playwright session

**Deleted:**
- `instantdb-app/src/app/seed/page.tsx` (CLI seed only)
- `instantdb-app/src/app/api/roots/route.ts` (unused)
- `instantdb-app/src/components/IssueBar.tsx`
- `instantdb-app/src/components/AppSidebar.tsx` (not referenced; verify grep clean before delete)
- `instantdb-app/scripts/seed.mjs` (legacy)

---

## Task 1: Install feather-testing-core + test session helper

**Files:**
- Modify: `instantdb-app/package.json`
- Create: `instantdb-app/tests/support/session.ts`

- [ ] **Step 1: Install dependency**

Run from `instantdb-app/`:

```bash
npm install -D feather-testing-core
```

Expected: `package.json` gains `feather-testing-core` under `devDependencies`, `package-lock.json` updates.

- [ ] **Step 2: Create the session helper**

Write `instantdb-app/tests/support/session.ts`:

```ts
import type { Page } from "@playwright/test";
import { createPlaywrightSession } from "feather-testing-core";

export function session(page: Page) {
  return createPlaywrightSession(page, { baseURL: "http://localhost:3000" });
}
```

- [ ] **Step 3: Smoke-test the import compiles**

Run: `npx tsc --noEmit -p .`
Expected: no errors. (If `feather-testing-core` exports differ from `createPlaywrightSession`, adjust the import to the actual exported name and re-run; the rest of the plan assumes the chainable `session(page).visit(...)` shape.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tests/support/session.ts
git commit -m "test: add feather-testing-core DSL + Playwright session helper"
```

---

## Task 2: Delete obsolete files

**Files:**
- Delete: `instantdb-app/src/app/seed/page.tsx`
- Delete: `instantdb-app/src/app/api/roots/route.ts`
- Delete: `instantdb-app/src/components/IssueBar.tsx`
- Delete: `instantdb-app/src/components/AppSidebar.tsx` (only if unreferenced)
- Delete: `instantdb-app/scripts/seed.mjs`

- [ ] **Step 1: Verify no references remain**

Run:

```bash
cd instantdb-app
grep -rn "AppSidebar\|IssueBar\|/seed\b\|api/roots\|scripts/seed\.mjs" src tests scripts 2>/dev/null
```

Expected output includes only the file definitions themselves (no imports from elsewhere). If an import shows up, that file is going to be rewritten in a later task — note it and proceed.

- [ ] **Step 2: Delete**

```bash
git rm src/app/seed/page.tsx
git rm src/app/api/roots/route.ts
git rm src/components/IssueBar.tsx
git rm src/components/AppSidebar.tsx
git rm scripts/seed.mjs
rmdir src/app/api 2>/dev/null; rmdir src/components 2>/dev/null
```

- [ ] **Step 3: Confirm the app still type-checks (expect errors in `page.tsx` / `picker` — we'll rewrite them next)**

Run: `npx tsc --noEmit -p .`
Expected: errors ONLY inside `src/app/page.tsx` and `src/app/picker/[lessonNumber]/page.tsx` (they still reference old schema fields). No import-not-found errors from the deleted files.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: drop legacy seed UI, roots API, IssueBar, AppSidebar"
```

---

## Task 3: Replace `src/lib/types.ts` with the 5-phase model

**Files:**
- Modify: `instantdb-app/src/lib/types.ts`

- [ ] **Step 1: Write the new file**

Full contents of `src/lib/types.ts`:

```ts
// App-wide types that aren't auto-derivable from instant.schema.ts.
//
// Phase model matches the audit spec §1 (5 phases). Each phase on a lesson
// is stored as a string: "blocked" | "ready" | "wip" | "done".

export const PHASE_ORDER = [
  "selection",
  "annotation",
  "audio",
  "qa",
  "published",
] as const;
export type PhaseName = (typeof PHASE_ORDER)[number];

export const PHASE_LABELS: Record<PhaseName, string> = {
  selection: "Selection",
  annotation: "Annotation",
  audio: "Audio",
  qa: "QA",
  published: "Publish",
};

// Matches the string union stored on lessons.phaseXxx fields.
export const PHASE_STATUSES = ["blocked", "ready", "wip", "done"] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

// Schema field name on `lessons` entity for each phase.
export const PHASE_FIELD: Record<PhaseName, string> = {
  selection: "phaseSelection",
  annotation: "phaseAnnotation",
  audio: "phaseAudio",
  qa: "phaseQA",
  published: "phasePublished",
};

export function isPhaseStatus(v: unknown): v is PhaseStatus {
  return typeof v === "string" && (PHASE_STATUSES as readonly string[]).includes(v);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: `src/lib/types.ts` compiles; remaining errors are in `page.tsx` and `picker/.../page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor(types): 5-phase model (selection/annotation/audio/qa/published)"
```

---

## Task 4: Login page (magic-link)

**Files:**
- Create: `instantdb-app/src/app/login/page.tsx`

- [ ] **Step 1: Write failing test**

Create `instantdb-app/tests/login.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { session } from "./support/session";

test.describe("Login (/login)", () => {
  test("shows email input and sends magic code", async ({ page }) => {
    await session(page)
      .visit("/login")
      .assertText("Teacher Login")
      .fillIn("Email", "mailsiraj@gmail.com")
      .clickButton("Send magic code");
    await expect(page.getByText("Enter the 6-digit code")).toBeVisible();
  });

  test("redirects authenticated dev user away from /login to /", async ({ page }) => {
    // DEV fallback: NEXT_PUBLIC_DEV_USER_EMAIL makes useCurrentUser() return instantly
    await session(page).visit("/login");
    await expect(page).toHaveURL(/\/$/);
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `npx playwright test tests/login.spec.ts`
Expected: FAIL — route `/login` not found.

- [ ] **Step 3: Implement the page**

Write `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser, sendMagicCode, signInWithCode } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    router.replace("/");
    return null;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await sendMagicCode(email);
      setSent(true);
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Failed to send code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signInWithCode(email, code);
      router.replace("/");
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 px-6 font-sans">
      <h1 className="text-xl font-bold text-emerald-800 mb-1">Teacher Login</h1>
      <p className="text-xs text-gray-500 mb-6">
        Learn Qur&apos;an Without Grammar
      </p>

      {!sent ? (
        <form onSubmit={handleSend} className="space-y-3">
          <label className="block text-xs text-gray-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-700 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send magic code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-sm text-gray-700">
            Enter the 6-digit code sent to {email}
          </p>
          <input
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm tracking-widest text-center"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-700 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Verifying..." : "Verify"}
          </button>
        </form>
      )}

      {err && <p className="text-xs text-red-600 mt-3">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run the non-redirect test**

Start the dev server in a second terminal with `NEXT_PUBLIC_DEV_USER_EMAIL` UNSET (so the first test path is real-auth):

```bash
NEXT_PUBLIC_DEV_USER_EMAIL= npm run dev
```

Run: `npx playwright test tests/login.spec.ts -g "shows email input"`
Expected: PASS.

For the redirect test, stop the server and restart with dev email set:

```bash
NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com npm run dev
```

Run: `npx playwright test tests/login.spec.ts -g "redirects"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx tests/login.spec.ts
git commit -m "feat(auth): magic-link login page with dev-fallback redirect"
```

---

## Task 5: AuthGate wrapper + layout integration

**Files:**
- Create: `instantdb-app/src/app/AuthGate.tsx`
- Modify: `instantdb-app/src/app/layout.tsx`

- [ ] **Step 1: Write the failing test**

Append to `tests/login.spec.ts`:

```ts
test("unauthenticated visit to / redirects to /login", async ({ page }) => {
  // Needs server started without NEXT_PUBLIC_DEV_USER_EMAIL
  await session(page).visit("/");
  await expect(page).toHaveURL(/\/login$/);
});
```

- [ ] **Step 2: Run it to confirm failure**

Stop the dev server and restart with `NEXT_PUBLIC_DEV_USER_EMAIL=` UNSET:

```bash
NEXT_PUBLIC_DEV_USER_EMAIL= npm run dev
```

Then run:

```bash
npx playwright test tests/login.spec.ts -g "redirects to /login"
```

Expected: FAIL — without `AuthGate` the root page either renders the dashboard directly (if InstantDB has a cached session) or errors, but it does **not** redirect to `/login`.

- [ ] **Step 3: Implement the AuthGate**

Write `src/app/AuthGate.tsx`:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/lib/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, pathname, router]);

  if (!user && pathname !== "/login") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Checking session…
      </div>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Wire it into the layout**

Replace `src/app/layout.tsx` body with:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "./AuthGate";

export const metadata: Metadata = {
  title: "LQWG — Teacher",
  description: "Learn Qur'an Without Grammar — teacher console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#fafaf7] text-[#1a1a1a] min-h-screen">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Re-run the test to verify it passes**

Dev server is still running from Step 2 (still with `NEXT_PUBLIC_DEV_USER_EMAIL=` unset). Next.js will hot-reload the layout + new AuthGate.

```bash
npx playwright test tests/login.spec.ts -g "redirects to /login"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/AuthGate.tsx src/app/layout.tsx tests/login.spec.ts
git commit -m "feat(auth): AuthGate wrapper redirects unauthenticated visits to /login"
```

---

## Task 6: Dashboard — typed schema + 5-phase columns

**Files:**
- Rewrite: `instantdb-app/src/app/page.tsx`
- Rewrite: `instantdb-app/tests/dashboard.spec.ts`

- [ ] **Step 1: Write the failing test (dashboard.spec.ts)**

Full replacement for `tests/dashboard.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { session } from "./support/session";

test.describe("Dashboard (/)", () => {
  test("shows 7 lessons and the 5 phase columns", async ({ page }) => {
    await session(page)
      .visit("/")
      .assertText("Teacher Dashboard");
    const rows = page.locator("tbody tr").filter({ hasText: /^L\d\./ });
    await expect(rows).toHaveCount(7);
    for (const label of ["Selection", "Annotation", "Audio", "QA", "Publish"]) {
      await expect(page.locator("thead")).toContainText(label);
    }
  });

  test("none of the retired 7-phase labels appear in the header", async ({ page }) => {
    // Regression guard: if someone reverts to the old 7-phase model or
    // forgets to rename PHASE_LABELS, these strings would leak back in.
    await session(page).visit("/");
    const thead = page.locator("thead");
    for (const retired of ["Scoring", "Picking", "Writing", "Tamil", "Review"]) {
      await expect(thead).not.toContainText(retired);
    }
  });

  test("every lesson starts ready for selection (post-reset invariant)", async ({ page }) => {
    // After Pre-flight P3 every lesson has phaseSelection=ready.
    // The first dot in each row is the Selection dot; its title must
    // include "ready" (or whatever non-blocked state a prior test left,
    // but never "blocked"). This catches the specific regression where
    // the seed reverts to all-blocked defaults.
    await session(page).visit("/");
    const rows = page.locator("tbody tr").filter({ hasText: /^L\d\./ });
    await expect(rows).toHaveCount(7);
    for (let i = 0; i < 7; i++) {
      const firstDotTitle = await rows.nth(i).locator("td button").first().getAttribute("title");
      expect(firstDotTitle, `row ${i} Selection phase`).not.toContain("blocked");
    }
  });

  test("clicking the Annotation phase dot on L1 cycles its status and restores", async ({ page }) => {
    // Target the Annotation dot (2nd button), NOT Selection (1st), so
    // cycling doesn't flip L1's picker-link visibility for later tests.
    // Cycle 4 times to land back on the starting state (4-state cycle:
    // blocked → ready → wip → done → blocked).
    await session(page).visit("/");
    const row = page.locator("tbody tr").filter({ hasText: "Allahu Akbar" }).first();
    const dot = row.locator("td button").nth(1);
    const before = await dot.getAttribute("title");
    await dot.click();
    const afterOne = await dot.getAttribute("title");
    expect(afterOne).not.toEqual(before);
    await dot.click();
    await dot.click();
    await dot.click();
    await expect(dot).toHaveAttribute("title", before!);
  });

  test("Open picker link navigates to /picker/3 (L3 is untouched by prior tests)", async ({ page }) => {
    // Use L3 ("Messenger of Allah") — no earlier test in this file clicks it,
    // so Selection stays at "ready" and the link is guaranteed visible.
    await session(page).visit("/");
    const row = page.locator("tbody tr").filter({ hasText: "Messenger of Allah" }).first();
    await row.getByRole("link", { name: /Open picker/i }).click();
    await expect(page).toHaveURL(/\/picker\/3$/);
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `npx playwright test tests/dashboard.spec.ts`
Expected: FAIL — current page.tsx references old schema fields.

- [ ] **Step 3: Rewrite page.tsx against typed schema**

Full contents of `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { tx } from "@instantdb/react";
import Link from "next/link";
import db from "@/lib/instant";
import {
  PHASE_ORDER,
  PHASE_LABELS,
  PHASE_FIELD,
  type PhaseName,
  type PhaseStatus,
  isPhaseStatus,
} from "@/lib/types";

type LessonRow = {
  id: string;
  lessonNumber: number;
  slug: string;
  title: string;
  notes?: string;
  seedArabic?: string;
  seedEnglish?: string;
  phaseSelection: string;
  phaseAnnotation: string;
  phaseAudio: string;
  phaseQA: string;
  phasePublished: string;
};

function statusOf(lesson: LessonRow, phase: PhaseName): PhaseStatus {
  const raw = lesson[PHASE_FIELD[phase] as keyof LessonRow];
  return isPhaseStatus(raw) ? raw : "blocked";
}

function StatusDot({ status }: { status: PhaseStatus }) {
  const styles: Record<PhaseStatus, string> = {
    done: "bg-green-500 text-white",
    ready: "bg-blue-500 animate-pulse text-white",
    wip: "bg-amber-500 text-white",
    blocked: "bg-gray-200 text-gray-400",
  };
  const glyph: Record<PhaseStatus, string> = {
    done: "\u2713",
    ready: "\u25B6",
    wip: "\u2022",
    blocked: "\u2012",
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${styles[status]}`}
    >
      {glyph[status]}
    </span>
  );
}

function PhaseCell({ lesson, phase }: { lesson: LessonRow; phase: PhaseName }) {
  const status = statusOf(lesson, phase);
  function cycle() {
    const order: PhaseStatus[] = ["blocked", "ready", "wip", "done"];
    const next = order[(order.indexOf(status) + 1) % order.length];
    db.transact(tx.lessons[lesson.id].update({ [PHASE_FIELD[phase]]: next }));
  }
  return (
    <td className="px-2 py-3 text-center">
      <button onClick={cycle} title={`${phase}: ${status} (click to cycle)`}>
        <StatusDot status={status} />
      </button>
    </td>
  );
}

export default function Dashboard() {
  const { isLoading, error, data } = db.useQuery({ lessons: {} });
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-600">Error: {error.message}</div>;
  }

  const lessons = [...(data?.lessons ?? [])].sort(
    (a, b) => a.lessonNumber - b.lessonNumber,
  ) as unknown as LessonRow[];

  const published = lessons.filter((l) => l.phasePublished === "done").length;
  const inProgress = lessons.filter((l) => l.phasePublished !== "done").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-emerald-800">Teacher Dashboard</h1>
        <p className="text-xs text-gray-500">Learn Qur&apos;an Without Grammar — Pipeline Governance</p>
      </div>

      <div className="flex gap-4 mb-6">
        <StatCard value={lessons.length} label="Total Lessons" />
        <StatCard value={published} label="Published" />
        <StatCard value={inProgress} label="In Progress" />
      </div>

      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-56">
                Lesson
              </th>
              {PHASE_ORDER.map((p) => (
                <th key={p} className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                  {PHASE_LABELS[p]}
                </th>
              ))}
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Picker
              </th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <LessonRowComp
                key={lesson.id}
                lesson={lesson}
                expanded={expanded === lesson.id}
                onToggle={() => setExpanded((cur) => (cur === lesson.id ? null : lesson.id))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LessonRowComp({
  lesson,
  expanded,
  onToggle,
}: {
  lesson: LessonRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pickerReady = statusOf(lesson, "selection") !== "blocked";
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="font-semibold text-sm">
            L{lesson.lessonNumber}. {lesson.title}
          </div>
          {lesson.seedArabic && (
            <div className="text-sm text-gray-600 font-arabic" dir="rtl">
              {lesson.seedArabic}
            </div>
          )}
        </td>
        {PHASE_ORDER.map((phase) => (
          <PhaseCell key={phase} lesson={lesson} phase={phase} />
        ))}
        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          {pickerReady ? (
            <Link
              href={`/picker/${lesson.lessonNumber}`}
              className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
            >
              Open picker
            </Link>
          ) : (
            <span className="text-xs text-gray-300">--</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b-2 border-gray-200">
          <td colSpan={PHASE_ORDER.length + 2} className="bg-gray-50 px-6 py-4">
            <LessonDetail lesson={lesson} />
          </td>
        </tr>
      )}
    </>
  );
}

function LessonDetail({ lesson }: { lesson: LessonRow }) {
  const [notes, setNotes] = useState(lesson.notes ?? "");
  const [dirty, setDirty] = useState(false);
  function save() {
    db.transact(tx.lessons[lesson.id].update({ notes }));
    setDirty(false);
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Slug:</span>{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">{lesson.slug}</code>
        </div>
        <div>
          <span className="text-gray-500">Published phase:</span>{" "}
          <span className="font-medium">{lesson.phasePublished}</span>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Notes</label>
        <div className="flex gap-2">
          <input
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          {dirty && (
            <button onClick={save} className="px-3 py-1 bg-emerald-700 text-white rounded text-xs font-medium">
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white border rounded-lg px-4 py-3 min-w-[100px]">
      <div className="text-2xl font-bold text-emerald-800">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run dashboard tests**

With `NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com npm run dev` running:

```bash
npx playwright test tests/dashboard.spec.ts
```

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx tests/dashboard.spec.ts
git commit -m "feat(dashboard): typed 5-phase pipeline grid + open-picker link"
```

---

## Task 7: Picker scoring utilities (`scoring.ts`)

**Files:**
- Create: `instantdb-app/src/app/picker/[lessonNumber]/scoring.ts`
- Create: `instantdb-app/src/app/picker/[lessonNumber]/scoring.test.ts`

- [ ] **Step 1: Write failing unit tests**

We don't have Jest set up. Install Vitest for plain unit tests:

```bash
npm install -D vitest @vitest/ui
```

Append to `package.json` scripts: `"test:unit": "vitest run"`.

Create `scoring.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeD1D2,
  compositeScore,
  autoSelectTopK,
  PRESETS,
  type Candidate,
} from "./scoring";

function c(id: string, d1Raw: number, d2Raw: number, d3: number, forms: string[]): Candidate {
  return { id, d1Raw, d2Raw, d3, forms };
}

describe("normalizeD1D2", () => {
  it("maps min→0 and max→10 across the pool", () => {
    const pool = [c("a", 0, 0, 0, []), c("b", 5, 2, 0, []), c("c", 10, 10, 0, [])];
    const { d1, d2 } = normalizeD1D2(pool);
    expect(d1["a"]).toBe(0);
    expect(d1["c"]).toBe(10);
    expect(d1["b"]).toBe(5);
    expect(d2["b"]).toBe(2);
  });

  it("returns all-zero map when range is degenerate", () => {
    const pool = [c("a", 3, 3, 0, []), c("b", 3, 3, 0, [])];
    const { d1, d2 } = normalizeD1D2(pool);
    expect(d1["a"]).toBe(0);
    expect(d2["b"]).toBe(0);
  });
});

describe("compositeScore", () => {
  it("applies preset weights to normalized dims + raw d3", () => {
    // Recommended: D1=35, D2=25, D3=40; all dims = 10 → composite = 10
    expect(compositeScore(10, 10, 10, PRESETS.recommended.weights)).toBeCloseTo(10, 5);
  });

  it("zeros out when all dims are zero", () => {
    expect(compositeScore(0, 0, 0, PRESETS.recommended.weights)).toBe(0);
  });
});

describe("autoSelectTopK diversity decay", () => {
  it("prefers new forms when decay < 1", () => {
    const pool = [
      c("same1", 10, 10, 10, ["A"]),
      c("same2", 10, 10, 10, ["A"]),
      c("newB", 8, 8, 8, ["B"]),
    ];
    const weights = PRESETS.recommended.weights;
    const picked = autoSelectTopK(pool, 2, 0.5, weights);
    expect(picked).toContain("same1");
    expect(picked).toContain("newB");
    expect(picked).not.toContain("same2");
  });

  it("with decay=1 just takes the top K by raw composite", () => {
    const pool = [
      c("a", 10, 10, 10, ["A"]),
      c("b", 10, 10, 10, ["A"]),
      c("c", 1, 1, 1, ["B"]),
    ];
    const picked = autoSelectTopK(pool, 2, 1.0, PRESETS.recommended.weights);
    expect(picked).toEqual(expect.arrayContaining(["a", "b"]));
    expect(picked).not.toContain("c");
  });
});
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/app/picker
```

Expected: FAIL (scoring.ts doesn't exist).

- [ ] **Step 3: Implement scoring.ts**

```ts
// Picker ranking + auto-selection utilities.
//
// Formula: composite(s) = (d1n * w1 + d2n * w2 + d3 * w3) / (w1 + w2 + w3)
// where d1n, d2n ∈ [0, 10] are min-max normalized across the candidate pool
// and d3 is already on [0, 10] piecewise by word_count (see SCORING.md).
//
// Auto-select uses diminishing-returns diversity: effective_score(s) =
// composite(s) * decay^(sum over s.forms of times_already_covered[form])

export type Candidate = {
  id: string;
  d1Raw: number;
  d2Raw: number;
  d3: number;
  forms: string[]; // lemma-arabic keys from sentenceForms
};

export type PresetKey = "recommended" | "short" | "frequency";

export type Weights = { d1: number; d2: number; d3: number };

export const PRESETS: Record<PresetKey, { label: string; weights: Weights }> = {
  recommended: { label: "★ Recommended", weights: { d1: 35, d2: 25, d3: 40 } },
  short: { label: "Short", weights: { d1: 20, d2: 20, d3: 60 } },
  frequency: { label: "Frequency", weights: { d1: 50, d2: 25, d3: 25 } },
};

export const DEFAULT_DIVERSITY = 0.7;

export function normalizeD1D2(pool: Candidate[]): {
  d1: Record<string, number>;
  d2: Record<string, number>;
} {
  const d1: Record<string, number> = {};
  const d2: Record<string, number> = {};
  if (pool.length === 0) return { d1, d2 };
  const d1s = pool.map((c) => c.d1Raw);
  const d2s = pool.map((c) => c.d2Raw);
  const d1min = Math.min(...d1s);
  const d1max = Math.max(...d1s);
  const d2min = Math.min(...d2s);
  const d2max = Math.max(...d2s);
  for (const c of pool) {
    d1[c.id] = d1max > d1min ? ((c.d1Raw - d1min) / (d1max - d1min)) * 10 : 0;
    d2[c.id] = d2max > d2min ? ((c.d2Raw - d2min) / (d2max - d2min)) * 10 : 0;
  }
  return { d1, d2 };
}

export function compositeScore(d1n: number, d2n: number, d3: number, w: Weights): number {
  const denom = w.d1 + w.d2 + w.d3;
  if (denom === 0) return 0;
  return (d1n * w.d1 + d2n * w.d2 + d3 * w.d3) / denom;
}

export function rankCandidates(
  pool: Candidate[],
  w: Weights,
): Array<{ id: string; composite: number }> {
  const { d1, d2 } = normalizeD1D2(pool);
  return pool
    .map((c) => ({ id: c.id, composite: compositeScore(d1[c.id], d2[c.id], c.d3, w) }))
    .sort((a, b) => b.composite - a.composite);
}

export function autoSelectTopK(
  pool: Candidate[],
  k: number,
  decay: number,
  w: Weights,
): string[] {
  const { d1, d2 } = normalizeD1D2(pool);
  const base = new Map<string, number>();
  for (const c of pool) base.set(c.id, compositeScore(d1[c.id], d2[c.id], c.d3, w));

  const picked: string[] = [];
  const coverage = new Map<string, number>(); // form → times covered
  const byId = new Map(pool.map((c) => [c.id, c]));

  while (picked.length < Math.min(k, pool.length)) {
    let bestId: string | null = null;
    let bestScore = -Infinity;
    for (const c of pool) {
      if (picked.includes(c.id)) continue;
      const priorExposure = c.forms.reduce((s, f) => s + (coverage.get(f) ?? 0), 0);
      const eff = (base.get(c.id) ?? 0) * Math.pow(decay, priorExposure);
      if (eff > bestScore) {
        bestScore = eff;
        bestId = c.id;
      }
    }
    if (bestId === null) break;
    picked.push(bestId);
    for (const f of byId.get(bestId)!.forms) {
      coverage.set(f, (coverage.get(f) ?? 0) + 1);
    }
  }
  return picked;
}
```

- [ ] **Step 4: Run — confirm passes**

```bash
npx vitest run src/app/picker
```

Expected: PASS (6+ tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/picker/[lessonNumber]/scoring.ts src/app/picker/[lessonNumber]/scoring.test.ts package.json package-lock.json
git commit -m "feat(picker): scoring utils (normalize + composite + diversity-decay auto-select)"
```

---

## Task 8: Picker data hook + minimal page shell (TDD)

**Files:**
- Create: `instantdb-app/src/app/picker/[lessonNumber]/usePickerData.ts`
- Rewrite (minimal): `instantdb-app/src/app/picker/[lessonNumber]/page.tsx`

The hook alone cannot be meaningfully unit-tested without mocking `db.useQuery` (heavy) or pulling in `@testing-library/react` with a stub provider (also heavy). Instead, give the hook its own integration test via a **minimal page** that calls the hook and renders the candidate count behind a `data-testid`. Task 9 enriches this page with ControlsBar on top.

- [ ] **Step 1: Write the failing test**

Create `instantdb-app/tests/picker.spec.ts` (this file did not exist before Task 9 — we create it now, earlier):

```ts
import { test, expect } from "@playwright/test";
import { session } from "./support/session";

test.describe("Picker data hook (/picker/:n minimal shell)", () => {
  test("loading /picker/3 renders a positive candidate count from the typed hook", async ({ page }) => {
    await session(page).visit("/picker/3");
    await expect(page.locator("text=Loading...")).not.toBeVisible();
    const probe = page.locator("[data-testid='picker-candidate-count']");
    await expect(probe).toBeVisible();
    const countStr = await probe.getAttribute("data-count");
    expect(Number(countStr)).toBeGreaterThan(0);
  });

  test("an unknown lesson number renders a 'not found' message", async ({ page }) => {
    await session(page).visit("/picker/99");
    await expect(page.getByText(/Lesson 99 not found/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `npx playwright test tests/picker.spec.ts`
Expected: FAIL — existing `page.tsx` still references old schema fields (e.g. `verse.lessonNumber`, `rootKey`) and throws; even if it didn't, it doesn't render `[data-testid='picker-candidate-count']`.

- [ ] **Step 3: Implement the hook**

```ts
"use client";

import { useMemo } from "react";
import db from "@/lib/instant";
import { useCurrentCourseMember } from "@/lib/auth";
import type { Candidate } from "./scoring";

export type SentenceRow = {
  id: string;
  verseRef: string;
  startWord: number;
  endWord: number;
  arabic: string;
  wordCount: number;
  verse?: { ref: string; surah: number; verseNum: number; arabic: string; translation?: { english: string } };
  forms?: Array<{ id: string; rootKey: string; lemmaArabic: string }>;
  scoreA1?: { d1Raw: number; d2Raw: number; d3: number };
  selectedIn?: Array<{ id: string; lesson?: { lessonNumber: number } }>;
};

export type RootRow = { id: string; key: string; transliteration: string; introducedInLesson?: number };
export type FormRow = { id: string; rootKey: string; lemmaArabic: string };
export type LessonRow = {
  id: string;
  lessonNumber: number;
  slug: string;
  title: string;
  phaseSelection: string;
  phaseAnnotation: string;
  phaseAudio: string;
  phaseQA: string;
  phasePublished: string;
};
export type SelectionRow = {
  id: string;
  starred: boolean;
  remark?: string;
  lesson?: { id: string; lessonNumber: number };
  sentence?: { id: string };
};

export type PickerData = {
  isLoading: boolean;
  error?: Error;
  lesson: LessonRow | null;
  lessons: LessonRow[];
  roots: RootRow[];
  forms: FormRow[];
  sentences: SentenceRow[];
  candidates: Candidate[];
  /** sentenceId → selection record (only for this lesson) */
  selections: Map<string, SelectionRow>;
  /** current teacher's courseMember.id (null if not signed in) */
  currentMemberId: string | null;
};

export function usePickerData(lessonNumber: number): PickerData {
  const member = useCurrentCourseMember();

  // Query everything the picker needs in one shot — InstantDB dedupes.
  const { isLoading, error, data } = db.useQuery({
    lessons: {},
    roots: {},
    forms: {},
    sentences: {
      verse: { translation: {} },
      forms: {},
      scoreA1: {},
      selectedIn: { lesson: {} },
    },
  });

  const { lessons, lesson, sentences, candidates, selections, roots, forms } = useMemo(() => {
    const lessons = ((data?.lessons ?? []) as unknown as LessonRow[]).slice().sort((a, b) => a.lessonNumber - b.lessonNumber);
    const lesson = lessons.find((l) => l.lessonNumber === lessonNumber) ?? null;
    const rawSentences = (data?.sentences ?? []) as unknown as SentenceRow[];

    // A sentence is a *candidate* for this lesson if it has >=1 form whose
    // root is among the lesson's in-scope roots. The "in-scope" list lives
    // on the seed (the 10-root picker-minimal set), so for Plan 3 we simply
    // include any sentence that has forms AND has a scoreA1 record —
    // whether it's relevant to this lesson is determined downstream by
    // the root-filter chips in the selection bar.
    const candidatePool: SentenceRow[] = rawSentences.filter(
      (s) => (s.forms?.length ?? 0) > 0 && s.scoreA1 !== undefined,
    );

    const candidates: Candidate[] = candidatePool.map((s) => ({
      id: s.id,
      d1Raw: s.scoreA1!.d1Raw,
      d2Raw: s.scoreA1!.d2Raw,
      d3: s.scoreA1!.d3,
      forms: (s.forms ?? []).map((f) => f.lemmaArabic),
    }));

    // Map sentenceId → selection row, filtered to this lesson.
    const sel = new Map<string, SelectionRow>();
    for (const s of rawSentences) {
      for (const sIn of s.selectedIn ?? []) {
        if (sIn.lesson?.lessonNumber === lessonNumber) {
          sel.set(s.id, sIn as unknown as SelectionRow);
        }
      }
    }

    return {
      lessons,
      lesson,
      sentences: candidatePool,
      candidates,
      selections: sel,
      roots: (data?.roots ?? []) as unknown as RootRow[],
      forms: (data?.forms ?? []) as unknown as FormRow[],
    };
  }, [data, lessonNumber]);

  return {
    isLoading,
    error,
    lesson,
    lessons,
    roots,
    forms,
    sentences,
    candidates,
    selections,
    currentMemberId: member?.id ?? null,
  };
}
```

- [ ] **Step 4: Write the minimal page shell that renders the count**

Full replacement for `src/app/picker/[lessonNumber]/page.tsx`:

```tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { usePickerData } from "./usePickerData";

export default function PickerPage({
  params,
}: {
  params: Promise<{ lessonNumber: string }>;
}) {
  const { lessonNumber: raw } = use(params);
  const lessonNumber = parseInt(raw, 10);
  const data = usePickerData(lessonNumber);

  if (data.isLoading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }
  if (!data.lesson) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Lesson {lessonNumber} not found.</p>
        <Link href="/" className="text-emerald-700 underline text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 font-sans max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <Link href="/" className="text-[11px] text-[#475569] underline">
          ← Dashboard
        </Link>
        <h1 className="text-[14px] font-bold text-[#0f172a]">
          L{data.lesson.lessonNumber} — {data.lesson.title}
        </h1>
      </div>
      <div
        data-testid="picker-candidate-count"
        data-count={data.candidates.length}
        className="text-[11px] text-[#64748b]"
      >
        {data.candidates.length} candidates loaded
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Re-run the test to verify it passes**

```bash
npx playwright test tests/picker.spec.ts
```

Expected: both tests PASS — candidate count is positive; /picker/99 shows "not found".

- [ ] **Step 6: Commit**

```bash
git add src/app/picker/[lessonNumber]/usePickerData.ts src/app/picker/[lessonNumber]/page.tsx tests/picker.spec.ts
git commit -m "feat(picker): typed usePickerData hook + minimal page shell"
```

---

## Task 9: ControlsBar on the existing page (TDD)

**Files:**
- Rewrite: `instantdb-app/src/app/picker/[lessonNumber]/page.tsx` (extend the minimal shell from Task 8)
- Create: `instantdb-app/src/app/picker/[lessonNumber]/ControlsBar.tsx`
- Extend: `instantdb-app/tests/picker.spec.ts`

- [ ] **Step 1: Append the failing tests to `tests/picker.spec.ts`**

```ts
test("loads lesson 3 and renders preset pills + ranked count", async ({ page }) => {
  await session(page).visit("/picker/3");
  await expect(page.locator("text=Loading...")).not.toBeVisible();
  await expect(page.getByRole("combobox", { name: "Lesson" })).toHaveValue("3");
  await expect(page.getByText("★ Recommended")).toBeVisible();
  const count = await page.locator("[data-testid='picker-ranked-count']").getAttribute("data-count");
  expect(Number(count)).toBeGreaterThan(0);
});

test("switching preset pills changes the ranked composite value", async ({ page }) => {
  await session(page).visit("/picker/3");
  const before = await page.locator("[data-testid='picker-ranked-count']").textContent();
  await page.getByRole("button", { name: "Short" }).click();
  await expect
    .poll(async () => page.locator("[data-testid='picker-ranked-count']").textContent())
    .not.toBe(before);
});
```

- [ ] **Step 2: Run them to confirm failure**

```bash
npx playwright test tests/picker.spec.ts -g "preset pills|ranked count"
```

Expected: FAIL — the minimal shell from Task 8 has no "★ Recommended" text, no `[data-testid='picker-ranked-count']`, and no Lesson combobox.

- [ ] **Step 3: Write ControlsBar.tsx**

```tsx
"use client";

import { useState } from "react";
import { PRESETS, type PresetKey, type Weights, DEFAULT_DIVERSITY } from "./scoring";

export type ControlsState = {
  showCount: number;
  activePreset: PresetKey | null; // null = custom (slider edited)
  weights: Weights;
  diversity: number;
};

export const DEFAULT_CONTROLS: ControlsState = {
  showCount: 30,
  activePreset: "recommended",
  weights: PRESETS.recommended.weights,
  diversity: DEFAULT_DIVERSITY,
};

export function ControlsBar({
  state,
  onChange,
}: {
  state: ControlsState;
  onChange: (next: ControlsState) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function setPreset(key: PresetKey) {
    onChange({ ...state, activePreset: key, weights: PRESETS[key].weights });
  }
  function setWeight(which: keyof Weights, value: number) {
    onChange({
      ...state,
      activePreset: null,
      weights: { ...state.weights, [which]: value },
    });
  }

  return (
    <div className="border border-[#e2e8f0] rounded-lg bg-white">
      <div className="flex items-center gap-3 px-3 py-2 text-[12px]">
        <label className="flex items-center gap-1 text-[#64748b]">
          Show:
          <select
            value={state.showCount}
            onChange={(e) => onChange({ ...state, showCount: Number(e.target.value) })}
            className="border rounded px-1 py-[2px] text-[12px]"
            aria-label="Show count"
          >
            {[20, 30, 50, 200].map((n) => (
              <option key={n} value={n}>
                {n === 200 ? "All" : n}
              </option>
            ))}
          </select>
        </label>

        <span className="text-[#64748b]">|</span>
        <span className="text-[#64748b]">Scoring:</span>
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => {
          const active = state.activePreset === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPreset(k)}
              className={`px-2 py-[2px] rounded border-2 text-[11px] font-medium ${
                active
                  ? "border-[#f59e0b] bg-[#fef3c7] text-[#92400e]"
                  : "border-[#cbd5e1] bg-white text-[#475569] hover:border-[#94a3b8]"
              }`}
              aria-pressed={active}
            >
              {PRESETS[k].label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto px-[10px] py-[3px] rounded-md bg-[#f1f5f9] border border-[#cbd5e1] text-[11px] text-[#64748b]"
        >
          {expanded ? "▲ Collapse" : "⚙ Fine-tune Ranking"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 grid grid-cols-4 gap-4 text-[11px]">
          <Slider label="Favor common words" value={state.weights.d1} color="#3b82f6" onChange={(v) => setWeight("d1", v)} />
          <Slider label="Favor new vocabulary" value={state.weights.d2} color="#8b5cf6" onChange={(v) => setWeight("d2", v)} />
          <Slider label="Favor short sentences" value={state.weights.d3} color="#f59e0b" onChange={(v) => setWeight("d3", v)} />
          <Slider
            label="Form diversity"
            value={Math.round(state.diversity * 100)}
            color="#64748b"
            onChange={(v) => onChange({ ...state, diversity: v / 100 })}
            max={100}
          />
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  color,
  onChange,
  max = 100,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-[#475569]">{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-[5px] cursor-pointer"
        aria-label={label}
      />
    </label>
  );
}
```

- [ ] **Step 4: Extend page.tsx to wire ControlsBar**

Full replacement for `src/app/picker/[lessonNumber]/page.tsx` (replaces Task 8's minimal shell):

```tsx
"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePickerData } from "./usePickerData";
import { ControlsBar, DEFAULT_CONTROLS, type ControlsState } from "./ControlsBar";
import { rankCandidates, autoSelectTopK } from "./scoring";

export default function PickerPage({
  params,
}: {
  params: Promise<{ lessonNumber: string }>;
}) {
  const { lessonNumber: raw } = use(params);
  const lessonNumber = parseInt(raw, 10);
  const data = usePickerData(lessonNumber);
  const router = useRouter();

  const [controls, setControls] = useState<ControlsState>(DEFAULT_CONTROLS);

  const ranked = useMemo(() => rankCandidates(data.candidates, controls.weights), [data.candidates, controls.weights]);

  const rankById = useMemo(() => {
    const m = new Map<string, { rank: number; score: number }>();
    ranked.forEach((r, i) => m.set(r.id, { rank: i + 1, score: r.composite }));
    return m;
  }, [ranked]);

  // Auto-select Top-10 on first load when no selections exist for this lesson.
  // Full wire-up to DB lands in Task 13.
  const autoTop10 = useMemo(() => {
    if (data.selections.size > 0) return [];
    return autoSelectTopK(data.candidates, 10, controls.diversity, controls.weights);
  }, [data.candidates, data.selections, controls.diversity, controls.weights]);

  if (data.isLoading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }
  if (!data.lesson) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Lesson {lessonNumber} not found.</p>
        <Link href="/" className="text-emerald-700 underline text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 font-sans max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <Link href="/" className="text-[11px] text-[#475569] underline">
          ← Dashboard
        </Link>
        <select
          value={lessonNumber}
          onChange={(e) => router.push(`/picker/${e.target.value}`)}
          className="text-[12px] font-semibold px-2 py-1 border-2 border-[#0f766e] rounded bg-white text-[#0f766e]"
          aria-label="Lesson"
        >
          {data.lessons.map((l) => (
            <option key={l.id} value={l.lessonNumber}>
              L{l.lessonNumber} — {l.title}
            </option>
          ))}
        </select>
        <h1 className="text-[14px] font-bold text-[#0f172a]">{data.lesson.title}</h1>
        <span className="text-[11px] text-[#64748b]">
          {data.candidates.length} candidates · auto-top-10: {autoTop10.length}
        </span>
      </div>

      <ControlsBar state={controls} onChange={setControls} />

      {/* SelectionBar + CandidateTable land in Tasks 10-12 */}
      <div
        data-testid="picker-ranked-count"
        data-count={ranked.length}
        className="mt-4 text-[11px] text-[#64748b]"
      >
        Ranked {ranked.length} candidates · top: {ranked[0]?.composite.toFixed(2) ?? "—"}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Re-run the Task 9 tests to verify they pass**

```bash
npx playwright test tests/picker.spec.ts -g "preset pills|ranked count"
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/picker/[lessonNumber]/page.tsx src/app/picker/[lessonNumber]/ControlsBar.tsx tests/picker.spec.ts
git commit -m "feat(picker): ControlsBar with preset pills + fine-tune sliders, wired to ranking"
```

---

## Task 10: SelectionBar — row 1 (budget gauges, TDD)

**Files:**
- Create: `instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx`
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/page.tsx`
- Extend: `instantdb-app/tests/picker.spec.ts`

- [ ] **Step 1: Append the failing test**

Append to `tests/picker.spec.ts`:

```ts
test("selection bar shows three zero-valued gauges when nothing is selected", async ({ page }) => {
  await session(page).visit("/picker/3");
  await expect(page.getByText("Sentences", { exact: true })).toBeVisible();
  await expect(page.getByText("Words", { exact: true })).toBeVisible();
  await expect(page.getByText("Forms", { exact: true })).toBeVisible();
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx playwright test tests/picker.spec.ts -g "three zero-valued gauges"
```

Expected: FAIL — no "Sentences"/"Words"/"Forms" labels exist on the page yet.

- [ ] **Step 3: Write the SelectionBar component (row 1 only)**

```tsx
"use client";

import type { SentenceRow } from "./usePickerData";

export type SelectionBarProps = {
  selectedSentences: SentenceRow[];
  /** forms per root-key already covered by selections */
  coverageByRoot: Map<string, Map<string, number>>;
  lessonRoots: { key: string; transliteration: string }[];
  lessonForms: { rootKey: string; lemmaArabic: string }[];
  activeFilter: FilterState;
  onFilterChange: (next: FilterState) => void;
};

export type FilterState =
  | { kind: "none" }
  | { kind: "root"; rootKey: string }
  | { kind: "form"; rootKey: string; lemmaArabic: string };

const RANGES = {
  sentences: { min: 10, max: 12 },
  words: { min: 100, max: 120 },
  forms: { min: 5, max: 7 },
};

function Gauge({ value, min, max, label }: { value: number; min: number; max: number; label: string }) {
  const inRange = value >= min && value <= max;
  return (
    <div className="flex flex-col px-3">
      <div className="flex items-baseline gap-1">
        <span
          className="font-extrabold text-[20px]"
          style={{ color: inRange ? "#059669" : "#f59e0b" }}
        >
          {value}
        </span>
        <span className="text-[11px] text-[#64748b]">
          / {min}-{max}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-wider text-[#64748b]">{label}</span>
    </div>
  );
}

export function SelectionBar(props: SelectionBarProps) {
  const { selectedSentences } = props;
  const sentenceCount = selectedSentences.length;
  const wordCount = selectedSentences.reduce((s, v) => s + v.wordCount, 0);
  // Distinct forms covered across selected sentences
  const coveredForms = new Set<string>();
  for (const s of selectedSentences) {
    for (const f of s.forms ?? []) coveredForms.add(`${f.rootKey}|${f.lemmaArabic}`);
  }

  return (
    <div className="sticky top-0 z-20 bg-[#f0fdf4] border-l-4 border-[#34d399] rounded-r-lg mt-3">
      <div className="flex items-center divide-x divide-[#d1d5db] py-2">
        <Gauge value={sentenceCount} min={RANGES.sentences.min} max={RANGES.sentences.max} label="Sentences" />
        <Gauge value={wordCount} min={RANGES.words.min} max={RANGES.words.max} label="Words" />
        <Gauge value={coveredForms.size} min={RANGES.forms.min} max={RANGES.forms.max} label="Forms" />
      </div>
      {/* Row 2 (chips) appears in Task 11 */}
    </div>
  );
}
```

- [ ] **Step 4: Wire into page.tsx**

Just below the `<ControlsBar />` line in `page.tsx`, add:

```tsx
import { SelectionBar } from "./SelectionBar";
// ...inside component, after const autoTop10 = useMemo(...)...
const selected = useMemo(
  () => data.sentences.filter((s) => data.selections.has(s.id)),
  [data.sentences, data.selections],
);
// ...in the JSX, below <ControlsBar>...
<SelectionBar
  selectedSentences={selected}
  coverageByRoot={new Map()}
  lessonRoots={data.roots.map((r) => ({ key: r.key, transliteration: r.transliteration }))}
  lessonForms={data.forms.map((f) => ({ rootKey: f.rootKey, lemmaArabic: f.lemmaArabic }))}
  activeFilter={{ kind: "none" }}
  onFilterChange={() => {}}
/>
```

- [ ] **Step 5: Re-run the test to verify it passes**

```bash
npx playwright test tests/picker.spec.ts -g "three zero-valued gauges"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/picker/[lessonNumber]/SelectionBar.tsx src/app/picker/[lessonNumber]/page.tsx tests/picker.spec.ts
git commit -m "feat(picker): SelectionBar row 1 — budget gauges (sentences / words / forms)"
```

---

## Task 11: SelectionBar — row 2 (traffic-light chips + filter, TDD)

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/SelectionBar.tsx`
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/page.tsx`
- Extend: `instantdb-app/tests/picker.spec.ts`

- [ ] **Step 1: Append the failing test**

Append to `tests/picker.spec.ts`:

```ts
test("clicking a heatmap chip activates a filter and shows Clear", async ({ page }) => {
  await session(page).visit("/picker/3");
  const chip = page.locator("[data-testid='heatmap-chip']").first();
  await chip.click();
  await expect(page.getByRole("button", { name: /Clear filter/i })).toBeVisible();
  await chip.click();
  await expect(page.getByRole("button", { name: /Clear filter/i })).not.toBeVisible();
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx playwright test tests/picker.spec.ts -g "heatmap chip"
```

Expected: FAIL — no `[data-testid='heatmap-chip']` elements exist; only row 1 (gauges) is rendered.

- [ ] **Step 3: Extend SelectionBar with row 2**

Append to `SelectionBar.tsx` (inside the default export, after the gauges row):

```tsx
function ChipState(count: number, hasForm: boolean): {
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

Replace the inner `return (...)` of `SelectionBar` with:

```tsx
  // Count covered forms per (root, lemma)
  const countsByForm = new Map<string, number>(); // key = rootKey|lemmaArabic
  for (const s of selectedSentences) {
    for (const f of s.forms ?? []) {
      const k = `${f.rootKey}|${f.lemmaArabic}`;
      countsByForm.set(k, (countsByForm.get(k) ?? 0) + 1);
    }
  }

  // Group all in-scope forms by root
  const formsByRoot = new Map<string, string[]>();
  for (const f of props.lessonForms) {
    const arr = formsByRoot.get(f.rootKey) ?? [];
    arr.push(f.lemmaArabic);
    formsByRoot.set(f.rootKey, arr);
  }

  const isFormActive = (rootKey: string, lemma: string) =>
    props.activeFilter.kind === "form" &&
    props.activeFilter.rootKey === rootKey &&
    props.activeFilter.lemmaArabic === lemma;

  const isRootActive = (rootKey: string) =>
    props.activeFilter.kind === "root" && props.activeFilter.rootKey === rootKey;

  const anyFilter = props.activeFilter.kind !== "none";

  return (
    <div className="sticky top-0 z-20 bg-[#f0fdf4] border-l-4 border-[#34d399] rounded-r-lg mt-3">
      <div className="flex items-center divide-x divide-[#d1d5db] py-2">
        <Gauge value={sentenceCount} min={RANGES.sentences.min} max={RANGES.sentences.max} label="Sentences" />
        <Gauge value={wordCount} min={RANGES.words.min} max={RANGES.words.max} label="Words" />
        <Gauge value={coveredForms.size} min={RANGES.forms.min} max={RANGES.forms.max} label="Forms" />
      </div>

      <div className="border-t border-[#e2e8f0] bg-[#f8fdf8] px-3 py-2 flex flex-wrap items-center gap-3">
        {props.lessonRoots.map((root) => {
          const forms = formsByRoot.get(root.key) ?? [];
          const covered = forms.filter((l) => (countsByForm.get(`${root.key}|${l}`) ?? 0) > 0).length;
          const rootActive = isRootActive(root.key);
          const dim = anyFilter && !rootActive && props.activeFilter.kind === "root";

          return (
            <div key={root.key} className={`flex items-center gap-1 ${dim ? "opacity-35" : ""}`}>
              <button
                type="button"
                onClick={() =>
                  props.onFilterChange(
                    rootActive ? { kind: "none" } : { kind: "root", rootKey: root.key },
                  )
                }
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-[2px] rounded ${
                  rootActive
                    ? "bg-[#1f2937] text-white ring-2 ring-[#3b82f6]"
                    : "text-[#64748b]"
                }`}
                aria-pressed={rootActive}
              >
                {root.transliteration.toUpperCase()} {covered}/{forms.length}
              </button>
              {forms.map((lemma) => {
                const count = countsByForm.get(`${root.key}|${lemma}`) ?? 0;
                const { border, bg, text, dashed } = ChipState(count, forms.includes(lemma));
                const active = isFormActive(root.key, lemma);
                const chipDim = anyFilter && !active && props.activeFilter.kind === "form";
                const style: React.CSSProperties = active
                  ? { background: "#1f2937", color: "white", border: "2px solid #1f2937", boxShadow: "0 0 0 2px #3b82f6" }
                  : {
                      background: bg,
                      color: text,
                      border: `${dashed ? "1.5px dashed" : "2px solid"} ${border}`,
                      fontWeight: count >= 3 ? 600 : 400,
                    };
                return (
                  <button
                    key={lemma}
                    type="button"
                    style={style}
                    onClick={() =>
                      props.onFilterChange(
                        active
                          ? { kind: "none" }
                          : { kind: "form", rootKey: root.key, lemmaArabic: lemma },
                      )
                    }
                    className={`px-2 py-[2px] rounded-md font-arabic text-[11px] ${chipDim ? "opacity-35" : ""}`}
                    dir="rtl"
                    aria-pressed={active}
                    data-testid="heatmap-chip"
                    data-root={root.key}
                    data-lemma={lemma}
                    data-count={count}
                  >
                    {lemma}
                    {count >= 3 && (
                      <sup style={{ fontSize: 8, fontFamily: "system-ui", color: "#16a34a" }}>{count}</sup>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {anyFilter && (
          <button
            type="button"
            onClick={() => props.onFilterChange({ kind: "none" })}
            className="ml-auto px-[10px] py-[3px] rounded-md bg-[#1f2937] text-white text-[10px]"
          >
            ✕ Clear filter
          </button>
        )}
      </div>
    </div>
  );
```

(Remove the old `return (...)` from step 1 — the whole function ends here. Delete the duplicate `ChipState` if you put it outside; it's used above.)

- [ ] **Step 4: Thread filter state into page.tsx**

In `page.tsx` replace the earlier `<SelectionBar .../>` block with:

```tsx
const [filter, setFilter] = useState<import("./SelectionBar").FilterState>({ kind: "none" });
// ...
<SelectionBar
  selectedSentences={selected}
  coverageByRoot={new Map()}
  lessonRoots={data.roots.map((r) => ({ key: r.key, transliteration: r.transliteration }))}
  lessonForms={data.forms.map((f) => ({ rootKey: f.rootKey, lemmaArabic: f.lemmaArabic }))}
  activeFilter={filter}
  onFilterChange={setFilter}
/>
```

- [ ] **Step 5: Re-run the test to verify it passes**

```bash
npx playwright test tests/picker.spec.ts -g "heatmap chip"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/picker/[lessonNumber]/SelectionBar.tsx src/app/picker/[lessonNumber]/page.tsx tests/picker.spec.ts
git commit -m "feat(picker): SelectionBar row 2 — traffic-light heatmap chips as filter controls"
```

---

## Task 12: CandidateTable — 8 columns + row selection (TDD)

**Files:**
- Create: `instantdb-app/src/app/picker/[lessonNumber]/CandidateTable.tsx`
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/page.tsx`
- Extend: `instantdb-app/tests/picker.spec.ts`

- [ ] **Step 1: Append the failing tests**

Append to `tests/picker.spec.ts`:

```ts
test("clicking a table row toggles its selected state", async ({ page }) => {
  await session(page).visit("/picker/3");
  const firstRow = page.locator("[data-testid='candidate-row']").first();
  await firstRow.click();
  await expect(firstRow).toHaveAttribute("data-selected", "true");
  await firstRow.click();
  await expect(firstRow).toHaveAttribute("data-selected", "false");
});

test("Show count cap limits table rows", async ({ page }) => {
  await session(page).visit("/picker/3");
  await page.getByLabel("Show count").selectOption("20");
  const count = await page.locator("[data-testid='candidate-row']").count();
  expect(count).toBeLessThanOrEqual(20);
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx playwright test tests/picker.spec.ts -g "table row|Show count"
```

Expected: FAIL — no `[data-testid='candidate-row']` elements exist yet.

- [ ] **Step 3: Write the CandidateTable component**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { SentenceRow } from "./usePickerData";
import type { FilterState } from "./SelectionBar";

export type SortKey = "score" | "words" | "ref";
export type SortDir = "asc" | "desc";

export type TableProps = {
  sentences: SentenceRow[];
  rankById: Map<string, { rank: number; score: number }>;
  selectedIds: Set<string>;
  filter: FilterState;
  maxRows: number;
  onToggleSelect: (sentenceId: string) => void;
};

function rankColor(rank: number): string {
  if (rank <= 10) return "#059669";
  if (rank <= 20) return "#0369a1";
  return "#64748b";
}

function surahName(surah: number): string {
  const names = ["Al-Fatiha", "Al-Baqarah", "Ali-Imran", "An-Nisa", "Al-Ma'idah" /* etc — keep short; full list lives in a later plan */];
  return names[surah - 1] ?? `Surah ${surah}`;
}

function refWithFragment(s: SentenceRow): string {
  const verseRef = s.verseRef;
  const surah = s.verse?.surah ?? parseInt(verseRef.split(":")[0], 10);
  const total = s.verse ? 0 : 0;
  void total;
  return `${surahName(surah)} ${verseRef}`;
}

function applyFilter(rows: SentenceRow[], filter: FilterState): SentenceRow[] {
  if (filter.kind === "none") return rows;
  if (filter.kind === "root") {
    return rows.filter((s) => (s.forms ?? []).some((f) => f.rootKey === filter.rootKey));
  }
  return rows.filter((s) =>
    (s.forms ?? []).some((f) => f.rootKey === filter.rootKey && f.lemmaArabic === filter.lemmaArabic),
  );
}

export function CandidateTable(props: TableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "score", dir: "desc" });

  const rows = useMemo(() => {
    const filtered = applyFilter(props.sentences, props.filter);
    const cmp = {
      score: (a: SentenceRow, b: SentenceRow) =>
        (props.rankById.get(b.id)?.score ?? 0) - (props.rankById.get(a.id)?.score ?? 0),
      words: (a: SentenceRow, b: SentenceRow) => a.wordCount - b.wordCount,
      ref: (a: SentenceRow, b: SentenceRow) => a.verseRef.localeCompare(b.verseRef, "en", { numeric: true }),
    }[sort.key];
    const sorted = [...filtered].sort(cmp);
    if (sort.dir === "asc") sorted.reverse();
    return sorted.slice(0, props.maxRows);
  }, [props.sentences, props.filter, props.rankById, props.maxRows, sort]);

  function toggleSort(key: SortKey) {
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  return (
    <table className="w-full border-collapse mt-3 text-[11px]" data-testid="candidate-table">
      <thead>
        <tr className="bg-[#f8fafc] text-[#64748b] uppercase tracking-wider">
          <th className="px-2 py-2 text-right w-[50px] cursor-pointer" onClick={() => toggleSort("score")}>
            Score
          </th>
          <th className="px-2 py-2 text-left w-[100px] cursor-pointer" onClick={() => toggleSort("ref")}>
            Ref
          </th>
          <th className="px-2 py-2 text-left w-[100px]">Forms</th>
          <th className="px-2 py-2 text-right">Arabic</th>
          <th className="px-2 py-2 text-left">English</th>
          <th className="px-2 py-2 text-right w-[40px] cursor-pointer" onClick={() => toggleSort("words")}>
            Words
          </th>
          <th className="px-2 py-2 w-[60px]">Bar</th>
          <th className="px-2 py-2 text-left w-[80px]">Hook</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => {
          const r = props.rankById.get(s.id);
          const selected = props.selectedIds.has(s.id);
          const isFragment = (s.verse?.arabic ?? "") !== s.arabic;
          return (
            <tr
              key={s.id}
              data-testid="candidate-row"
              data-selected={selected}
              data-sentence-id={s.id}
              onClick={() => props.onToggleSelect(s.id)}
              className="cursor-pointer hover:bg-[#f1f5f9]"
              style={selected ? { background: "#f0fdf4" } : undefined}
            >
              <td className="px-2 py-2 text-right font-bold" style={{ color: r ? rankColor(r.rank) : "#64748b" }}>
                {r ? r.score.toFixed(1) : "—"}
              </td>
              <td className="px-2 py-2">{refWithFragment(s)}</td>
              <td className="px-2 py-2">
                {(s.forms ?? []).map((f) => (
                  <span
                    key={f.id}
                    className="inline-block mr-1 px-1 py-[1px] rounded-md bg-[#eef2ff] text-[10px] font-arabic"
                    dir="rtl"
                  >
                    {f.lemmaArabic}
                  </span>
                ))}
              </td>
              <td
                className="px-2 py-2 text-right font-arabic text-[14px]"
                dir="rtl"
                style={{
                  borderRight: isFragment ? "3px dashed #94a3b8" : "3px solid #3b82f6",
                }}
              >
                {s.arabic}
              </td>
              <td className="px-2 py-2 text-[#64748b]">{s.verse?.translation?.english ?? ""}</td>
              <td className="px-2 py-2 text-right">{s.wordCount}</td>
              <td className="px-2 py-2">
                {s.scoreA1 && (
                  <div className="flex h-[8px] w-[50px] rounded overflow-hidden">
                    <div style={{ width: `${Math.min(100, s.scoreA1.d1Raw * 10)}%`, background: "#3b82f6" }} />
                    <div style={{ width: `${Math.min(100, s.scoreA1.d2Raw * 10)}%`, background: "#8b5cf6" }} />
                    <div style={{ width: `${s.scoreA1.d3 * 10}%`, background: "#f59e0b" }} />
                  </div>
                )}
              </td>
              <td className="px-2 py-2 text-[10px] text-[#94a3b8]">
                {/* hookReason lands in Plan 4; empty for now */}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Wire CandidateTable into page.tsx**

Add below `<SelectionBar ... />`:

```tsx
import { CandidateTable } from "./CandidateTable";
// ...
const [localSelection, setLocalSelection] = useState<Set<string>>(() => new Set());
const selectedIds = useMemo(() => {
  // Union of DB-backed selections and optimistic local ones (Task 13 reconciles)
  const s = new Set<string>(data.selections.keys());
  for (const id of localSelection) s.add(id);
  return s;
}, [data.selections, localSelection]);

// ...in JSX:
<CandidateTable
  sentences={data.sentences}
  rankById={rankById}
  selectedIds={selectedIds}
  filter={filter}
  maxRows={controls.showCount}
  onToggleSelect={(id) => {
    setLocalSelection((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }}
/>
```

- [ ] **Step 5: Re-run the tests to verify they pass**

```bash
npx playwright test tests/picker.spec.ts -g "table row|Show count"
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/picker/[lessonNumber]/CandidateTable.tsx src/app/picker/[lessonNumber]/page.tsx tests/picker.spec.ts
git commit -m "feat(picker): 8-column CandidateTable with row-click selection + sortable Score/Ref/Words"
```

---

## Task 13: Persist selections to InstantDB

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/page.tsx`

So far selections live in `localSelection` only. Replace that with DB writes via the `selections` entity.

- [ ] **Step 1: Replace the optimistic-only wire-up**

In `page.tsx`:

Remove the `const [localSelection, setLocalSelection] = useState(...)` block and the union-set `selectedIds`. Replace with:

```tsx
import { id as iid, tx } from "@instantdb/react";

// selectedIds is just the DB-backed Set of sentenceIds for this lesson
const selectedIds = useMemo(() => new Set(data.selections.keys()), [data.selections]);

async function toggleSelect(sentenceId: string) {
  if (!data.lesson || !data.currentMemberId) return;
  const existing = data.selections.get(sentenceId);
  if (existing) {
    await db.transact(tx.selections[existing.id].delete());
    return;
  }
  const newId = iid();
  await db.transact([
    tx.selections[newId].update({
      starred: false,
      pickedAt: Date.now(),
    }),
    tx.selections[newId].link({
      lesson: data.lesson.id,
      sentence: sentenceId,
      pickedBy: data.currentMemberId,
    }),
  ]);
}
```

And pass `onToggleSelect={toggleSelect}` to `<CandidateTable>`. Also import `db` at the top (`import db from "@/lib/instant";`).

- [ ] **Step 2: Add a persistence test**

Append to `tests/picker.spec.ts`:

```ts
test("selecting a row persists across page reload", async ({ page }) => {
  await session(page).visit("/picker/3");
  const firstRow = page.locator("[data-testid='candidate-row']").first();
  const sid = await firstRow.getAttribute("data-sentence-id");
  await firstRow.click();
  await expect(firstRow).toHaveAttribute("data-selected", "true");

  await page.reload();
  await expect(page.locator("text=Loading...")).not.toBeVisible();
  const same = page.locator(`[data-sentence-id='${sid}']`);
  await expect(same).toHaveAttribute("data-selected", "true");

  // Cleanup — unselect so the test is idempotent
  await same.click();
  await expect(same).toHaveAttribute("data-selected", "false");
});
```

- [ ] **Step 3: Run**

```bash
npx playwright test tests/picker.spec.ts -g "persists across page reload"
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/picker/[lessonNumber]/page.tsx tests/picker.spec.ts
git commit -m "feat(picker): persist selections via selections entity (starred + linked pickedBy)"
```

---

## Task 14: Auto-select top-10 on first load

**Files:**
- Modify: `instantdb-app/src/app/picker/[lessonNumber]/page.tsx`

Currently `autoTop10` is computed but nothing writes it. Fire it once when:
(a) data finishes loading AND
(b) `data.selections.size === 0` AND
(c) we haven't already auto-selected this session.

- [ ] **Step 1: Add a one-shot effect**

Inside `PickerPage`:

```tsx
import { useEffect, useRef } from "react";
// ...
const autoFiredRef = useRef(false);

useEffect(() => {
  if (autoFiredRef.current) return;
  if (data.isLoading) return;
  if (!data.lesson || !data.currentMemberId) return;
  if (data.selections.size > 0) return;
  if (autoTop10.length === 0) return;
  autoFiredRef.current = true;

  const txs = autoTop10.map((sentenceId) => {
    const newId = iid();
    return [
      tx.selections[newId].update({ starred: false, pickedAt: Date.now() }),
      tx.selections[newId].link({
        lesson: data.lesson!.id,
        sentence: sentenceId,
        pickedBy: data.currentMemberId!,
      }),
    ];
  }).flat();
  db.transact(txs);
}, [data.isLoading, data.lesson, data.currentMemberId, data.selections.size, autoTop10]);
```

- [ ] **Step 2: Test**

Append to `tests/picker.spec.ts`:

```ts
test("loading a fresh lesson auto-selects 10 candidates", async ({ page, request }) => {
  // Use a never-touched lesson to guarantee a clean slate.
  // Lesson 7 (qama) is fine — we'll clear any existing selections via a reset helper.
  // For Plan 3, assume the DB is clean; a test-only /__reset/:n route is out of scope.
  await session(page).visit("/picker/7");
  await expect.poll(async () => page.locator("[data-selected='true']").count()).toBe(10);
});
```

NOTE: If the live DB already has selections for L7 from manual QA, this test will fail. Before running, clear L7 selections manually in the InstantDB dashboard OR add a dev-only "Reset" button on the page (out of scope for Plan 3 — defer to Plan 4 if needed and mark this test `.skip` with a comment).

Run: `npx playwright test tests/picker.spec.ts -g "auto-selects 10"`
Expected: PASS (or SKIP with a note).

- [ ] **Step 3: Commit**

```bash
git add src/app/picker/[lessonNumber]/page.tsx tests/picker.spec.ts
git commit -m "feat(picker): auto-select top-10 on first visit (diversity-decay seeded)"
```

---

## Task 15: Documentation — update CURRENT-STATE + CLAUDE.md resume prompt

**Files:**
- Modify: `docs/CURRENT-STATE.md` (if present — otherwise skip)
- Create: `docs/superpowers/plans/2026-04-17-plan-3-HANDOFF.md`

- [ ] **Step 1: Write the handoff**

`docs/superpowers/plans/2026-04-17-plan-3-HANDOFF.md` content (adapt the Plan 2 format):

```markdown
# Plan 3 — Handoff Summary

Branch: `feature/plan-3-picker-ui` (off `feature/plan-2-instantdb-schema`).

## What landed
- Magic-link login page + AuthGate on every non-login route.
- Dashboard (`/`) rewritten to typed schema, 5-phase pipeline.
- Picker (`/picker/[lessonNumber]`) rewritten: ControlsBar, SelectionBar
  (budget gauges + traffic-light heatmap chips as filters),
  CandidateTable (8 columns, sortable, row-click selection), auto-top-10.
- Unit tests (vitest) for scoring.ts.
- Playwright tests rewritten via feather-testing-core DSL.

## Gaps for Plan 4+
- `hookScore` column in the table renders empty until Plan 4 adds
  Tier-2 LLM scores to InstantDB.
- No per-sentence "remark" editor on the picker (Task 13 persists the
  pick but not the teacher's annotation — belongs to the Annotation
  phase UI in a later plan).
- Audio preview is NOT on the picker yet (was in the old design; moved
  to the Audio phase in the 5-phase model).
```

- [ ] **Step 2: Update CURRENT-STATE.md if present**

Run `ls docs/CURRENT-STATE.md` from repo root. If present, update the "Current phase" section to reference Plan 3 complete.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-04-17-plan-3-HANDOFF.md docs/CURRENT-STATE.md 2>/dev/null || git add docs/superpowers/plans/2026-04-17-plan-3-HANDOFF.md
git commit -m "docs: Plan 3 handoff — picker UI complete"
```

---

## Task 16: Final verification

- [ ] **Step 1: Full build**

```bash
cd instantdb-app
npm run build
```

Expected: SUCCESS, no type errors, no missing modules.

- [ ] **Step 2: All unit tests**

```bash
npm run test:unit
```

Expected: all pass.

- [ ] **Step 3: All Playwright tests**

With `NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com npm run dev` running:

```bash
npx playwright test
```

Expected: all pass (or the one auto-select test skipped per Task 14 Step 2 note).

- [ ] **Step 4: Validate InstantDB parity one more time**

```bash
cd ..
tools/.venv/bin/python tools/validate-instantdb.py
```

Expected: ALL PASS (Plan 3 doesn't touch the schema, but regression-check anyway).

- [ ] **Step 5: Final commit + push**

```bash
git status                  # should be clean
git push -u origin feature/plan-3-picker-ui
```

Report done.

---

## Self-Review Notes

- **Spec coverage:** Controls bar (Task 9), Selection bar row 1 (Task 10), Selection bar row 2 + filter (Task 11), 8-column table (Task 12), row-as-checkbox (Task 12), auto-select top 10 (Task 14), diversity decay (Task 7). Magic-link auth (Tasks 4–5). Dashboard 5-phase (Task 6). ✓
- **Placeholder scan:** No TBDs. Each step has concrete code and commands.
- **Type consistency:** `Candidate`, `Weights`, `PresetKey`, `FilterState`, `SentenceRow` defined once and reused. `PHASE_FIELD["selection"]` → `"phaseSelection"` matches `instant.schema.ts` attribute names.
- **Known assumptions documented:** Task 14 notes the manual DB-cleanup dependency for the auto-select test; Task 12 uses a trimmed `surahName` table (full list belongs in a later plan). Neither blocks the primary picker flow.
