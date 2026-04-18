# Auth Code-Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three defects flagged on the Plan 2 InstantDB auth layer — AuthGate redirect race on hard reload, admin token hardcoded in source, and missing post-sign-in authorization check.

**Architecture:** Make implicit auth states explicit. `useCurrentUser` returns `{ user, isLoading }` instead of `null`. AuthGate uses an ordered-branch state machine with an explicit loading branch. Authorization becomes a tri-state hook (`loading | authorized | unauthorized`) that AuthGate enforces after authentication. Admin scripts read the token from `INSTANT_APP_ADMIN_TOKEN` via a shared helper that fails fast if missing.

**Tech Stack:** Next.js 16 App Router, React 19, InstantDB React SDK, TypeScript, Playwright + `feather-testing-core` DSL for e2e tests, Node's built-in `node:test` runner for script tests.

**Design doc:** [docs/superpowers/specs/2026-04-18-auth-code-review-fixes-design.md](../specs/2026-04-18-auth-code-review-fixes-design.md)

---

## File Structure

| Path | Responsibility | Task |
|---|---|---|
| `instantdb-app/src/lib/auth.ts` | Hook contract + authorization tri-state | 1, 3 |
| `instantdb-app/src/app/AuthGate.tsx` | Ordered-branch state machine; renders children, loading frame, or triggers signOut+redirect | 2, 3 |
| `instantdb-app/src/app/login/page.tsx` | Banner from `?reason=unauthorized`; uses new hook shape | 1, 3 |
| `instantdb-app/scripts/_admin-client.mjs` | **NEW.** `createAdminDb()` factory — env-checked, fail-fast | 4 |
| `instantdb-app/scripts/seed-from-sqlite.mjs` | Imports the helper; remove literal token | 4 |
| `instantdb-app/scripts/reset-lesson-phases.mjs` | Imports the helper; remove literal fallback | 5 |
| `instantdb-app/tests/auth-gate.spec.ts` | **NEW.** Playwright — loading frame gates redirect | 2 |
| `instantdb-app/tests/unauthorized.spec.ts` | **NEW.** Playwright — unknown email → banner + signed out | 3 |
| `instantdb-app/scripts/__tests__/admin-env.test.mjs` | **NEW.** `node:test` — missing env var → exit 1 + stderr | 4, 5 |

---

## Task 1: `useCurrentUser` returns `{ user, isLoading }`

**Files:**
- Modify: `instantdb-app/src/lib/auth.ts:19-31` (hook return shape + type)
- Modify: `instantdb-app/src/app/AuthGate.tsx:8` (destructure `user`)
- Modify: `instantdb-app/src/app/login/page.tsx:9` (destructure `user`)

Mechanical contract change. Behavior stays identical — callers still do `if (!user) ...`. The typechecker is the test: if a consumer is forgotten, `tsc` fails.

- [ ] **Step 1: Update the type and hook body**

Open `instantdb-app/src/lib/auth.ts`. Replace lines 19-31 with:

```ts
export type CurrentUser = {
  email: string;
  isDev: boolean;
};

export type CurrentUserState = {
  user: CurrentUser | null;
  isLoading: boolean;
};

export function useCurrentUser(): CurrentUserState {
  if (DEV_EMAIL) {
    return { user: { email: DEV_EMAIL, isDev: true }, isLoading: false };
  }
  const auth = db.useAuth();
  if (auth.isLoading) return { user: null, isLoading: true };
  if (auth.error || !auth.user) return { user: null, isLoading: false };
  return { user: { email: auth.user.email, isDev: false }, isLoading: false };
}
```

- [ ] **Step 2: Verify tsc fails on the two consumers**

Run: `cd instantdb-app && npx tsc --noEmit`
Expected: errors in `src/app/AuthGate.tsx:8` ("Property 'user' does not exist on type '{ user ... }'") — note: the error text depends on how each file uses the hook. We want AT LEAST one error, confirming consumers are not yet updated.

- [ ] **Step 3: Update AuthGate to destructure**

Open `instantdb-app/src/app/AuthGate.tsx`. Change line 8 from:
```tsx
const user = useCurrentUser();
```
to:
```tsx
const { user } = useCurrentUser();
```

No other change in this file for Task 1 — Task 2 will add the `isLoading` gate.

- [ ] **Step 4: Update login page to destructure**

Open `instantdb-app/src/app/login/page.tsx`. Change line 9 from:
```tsx
const user = useCurrentUser();
```
to:
```tsx
const { user } = useCurrentUser();
```

- [ ] **Step 5: Verify tsc is green**

Run: `cd instantdb-app && npx tsc --noEmit`
Expected: exits 0 with no output.

- [ ] **Step 6: Verify the Playwright suite still passes**

Run: `cd instantdb-app && npx playwright test tests/login.spec.ts`
Expected: 3 passed (the three existing login tests still pass — behavior hasn't changed).

- [ ] **Step 7: Commit**

```bash
git add instantdb-app/src/lib/auth.ts \
        instantdb-app/src/app/AuthGate.tsx \
        instantdb-app/src/app/login/page.tsx
git commit -m "refactor(auth): useCurrentUser returns { user, isLoading } — mechanical update"
```

---

## Task 2: AuthGate gates redirect on `isLoading` (fixes P1 redirect race)

**Files:**
- Modify: `instantdb-app/src/app/AuthGate.tsx` (ordered-branch state machine)
- Create: `instantdb-app/tests/auth-gate.spec.ts` (Playwright — loading frame gates redirect)

- [ ] **Step 1: Write the failing Playwright test**

Create `instantdb-app/tests/auth-gate.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { session } from "./support/session";

test.describe("AuthGate loading state", () => {
  test("protected route shows loading frame before redirecting", async ({ page }) => {
    // With dev fallback ON (NEXT_PUBLIC_DEV_USER_EMAIL set by the test env),
    // the session resolves synchronously. Navigating to a protected route
    // should land there directly without a /login redirect.
    await session(page).visit("/picker/3");
    await expect(page).toHaveURL(/\/picker\/3$/);
  });

  test("authenticated dev user does not flicker through /login on reload", async ({ page }) => {
    // Hard reload must not land on /login even momentarily.
    const visitedUrls: string[] = [];
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) visitedUrls.push(f.url());
    });
    await session(page).visit("/picker/3");
    await page.reload();
    await expect(page).toHaveURL(/\/picker\/3$/);
    const loginVisits = visitedUrls.filter((u) => u.endsWith("/login"));
    expect(loginVisits).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails against current AuthGate**

Run: `cd instantdb-app && npx playwright test tests/auth-gate.spec.ts`
Expected: BOTH tests may actually pass against current code in dev-fallback mode (because dev fallback returns `isLoading: false` synchronously). If both pass, that's acceptable — the tests serve as a regression guard. The real failing scenario is production-only (session hydration race) and cannot be reproduced under dev fallback.

If both pass: **still commit the test** as a regression guard and proceed to Step 3 for the code fix. Note in the commit message that the fix addresses a production-only race (see spec §1).

If either fails: the failure message will point at either the URL check or the `loginVisits` count. Confirm, proceed to Step 3.

- [ ] **Step 3: Rewrite AuthGate with the ordered state machine**

Replace the entire contents of `instantdb-app/src/app/AuthGate.tsx` with:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/lib/auth";

function CheckingSessionFrame() {
  return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      Checking session…
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) return <CheckingSessionFrame />;
  if (!user && pathname !== "/login") return <CheckingSessionFrame />;
  return <>{children}</>;
}
```

The key change: `useEffect` returns early while `isLoading`. Previously it fired `router.replace("/login")` any time `!user`, which included the loading window.

- [ ] **Step 4: Run the Playwright test and verify it passes**

Run: `cd instantdb-app && npx playwright test tests/auth-gate.spec.ts`
Expected: 2 passed.

- [ ] **Step 5: Run the full Playwright suite to check for regressions**

Run: `cd instantdb-app && npx playwright test`
Expected: all existing tests (login, dashboard, picker) continue to pass.

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/src/app/AuthGate.tsx instantdb-app/tests/auth-gate.spec.ts
git commit -m "fix(auth): AuthGate gates redirect on isLoading

Without this, useCurrentUser's null-during-loading was treated as
signed-out, causing hard reloads of protected routes to flicker
through /login. The fix is production-only (dev fallback hydrates
synchronously), so the test is a regression guard."
```

---

## Task 3: Owner-only authorization (fixes P2)

**Files:**
- Modify: `instantdb-app/src/lib/auth.ts` (add `useIsAuthorizedMember`)
- Modify: `instantdb-app/src/app/AuthGate.tsx` (authorization branch)
- Modify: `instantdb-app/src/app/login/page.tsx` (unauthorized banner)
- Create: `instantdb-app/tests/unauthorized.spec.ts` (Playwright)

- [ ] **Step 1: Write the failing Playwright test**

Create `instantdb-app/tests/unauthorized.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { session } from "./support/session";

test.describe("Owner-only authorization", () => {
  test.use({
    // Use a dev-fallback email that is NOT seeded as a courseMember.
    // This bypasses InstantDB auth but still runs the authorization query.
    extraHTTPHeaders: {},
  });

  test("unknown dev-fallback email ends at /login with unauthorized banner", async ({
    page,
    context,
  }) => {
    // The test runs against a dev server started with
    // NEXT_PUBLIC_DEV_USER_EMAIL=noone@example.com — set in a dedicated
    // Playwright project (see playwright.config.ts update in Step 7).
    await session(page)
      .visit("/")
      .assertText("Not authorized");
    await expect(page).toHaveURL(/\/login\?reason=unauthorized$/);
  });

  test("seeded owner email lands on / with no banner", async ({ page }) => {
    // Runs against the default project where NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com.
    await session(page).visit("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Not authorized")).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `cd instantdb-app && npx playwright test tests/unauthorized.spec.ts`
Expected: tests fail — the "Not authorized" banner does not exist yet and the redirect does not happen.

- [ ] **Step 3: Add `useIsAuthorizedMember` to auth.ts**

Open `instantdb-app/src/lib/auth.ts`. Append after the existing `useCurrentCourseMember` function:

```ts
export type AuthorizationState = "loading" | "authorized" | "unauthorized";

export function useIsAuthorizedMember(courseSlug = "lqwg-adhan"): AuthorizationState {
  const { user, isLoading } = useCurrentUser();
  const { data, error } = db.useQuery(
    user
      ? {
          courseMembers: {
            $: {
              where: {
                "course.slug": courseSlug,
                "profile.email": user.email,
              },
            },
          },
        }
      : null,
  );
  if (isLoading) return "loading";
  if (!user) return "unauthorized";
  if (error) return "loading"; // treat transient errors as loading, not signOut
  if (data === undefined) return "loading";
  return data.courseMembers?.[0] ? "authorized" : "unauthorized";
}
```

- [ ] **Step 4: Rewrite AuthGate with the full state machine**

Replace the contents of `instantdb-app/src/app/AuthGate.tsx` with:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser, useIsAuthorizedMember, signOut } from "@/lib/auth";

function CheckingSessionFrame() {
  return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      Checking session…
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  const authz = useIsAuthorizedMember();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || authz === "loading") return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    if (user && authz === "unauthorized" && pathname !== "/login") {
      signOut();
      router.replace("/login?reason=unauthorized");
    }
  }, [user, isLoading, authz, pathname, router]);

  if (isLoading || authz === "loading") return <CheckingSessionFrame />;
  if (!user && pathname !== "/login") return <CheckingSessionFrame />;
  if (user && authz === "unauthorized" && pathname !== "/login") return <CheckingSessionFrame />;
  return <>{children}</>;
}
```

The `pathname !== "/login"` guard on branch 4 is what breaks the infinite-loop risk: once the user is redirected to `/login?reason=unauthorized`, the branch stops firing.

- [ ] **Step 5: Update `signOut` export in `auth.ts` (verify)**

Open `instantdb-app/src/lib/auth.ts` and confirm `signOut` is already exported (it is — line 62). No change needed; this step is a verification gate.

- [ ] **Step 6: Add unauthorized banner to login page**

Open `instantdb-app/src/app/login/page.tsx`. Wrap the component to read the `reason` search param and render a banner. Replace the current `export default function LoginPage()` signature and body's top section:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser, sendMagicCode, signInWithCode } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reason = searchParams.get("reason");

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (user) return null;
  // ...rest of the component body stays the same...
```

Then, inside the returned JSX, immediately after the `<p className="text-xs text-gray-500 mb-6">` tag, insert:

```tsx
      {reason === "unauthorized" && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
          <strong>Not authorized.</strong> Only registered teachers can access the picker.
        </div>
      )}
```

- [ ] **Step 7: Add a Playwright project for the unauthorized dev fallback**

Open `instantdb-app/playwright.config.ts`. Replace the `projects` array with:

```ts
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "chromium-unauthorized",
      testMatch: /unauthorized\.spec\.ts/,
      use: { browserName: "chromium" },
    },
  ],
```

And replace the single `webServer` entry with two — one per project, each with a distinct dev-fallback email. Replace the entire `webServer` block with:

```ts
  webServer: [
    {
      command: "NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com npm run dev -- --port 3000",
      port: 3000,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "NEXT_PUBLIC_DEV_USER_EMAIL=noone@example.com npm run dev -- --port 3001",
      port: 3001,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
```

Update the `unauthorized.spec.ts` test to target port 3001 via `test.use({ baseURL: "http://localhost:3001" })` at the top of the `describe` block (not the `use` block in Step 1 — replace that):

```ts
test.describe("Owner-only authorization", () => {
  test.use({ baseURL: "http://localhost:3001" });

  test("unknown dev-fallback email ends at /login with unauthorized banner", async ({ page }) => {
    await session(page).visit("/");
    await expect(page).toHaveURL(/\/login\?reason=unauthorized$/);
    await expect(page.getByText("Not authorized")).toBeVisible();
  });

  test("seeded owner email lands on / with no banner", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Not authorized")).not.toBeVisible();
  });
});
```

- [ ] **Step 8: Run the test to see it pass**

Run: `cd instantdb-app && npx playwright test tests/unauthorized.spec.ts`
Expected: 2 passed.

- [ ] **Step 9: Run the full Playwright suite**

Run: `cd instantdb-app && npx playwright test`
Expected: all tests pass. The dashboard and picker specs run against port 3000 (owner email), the unauthorized spec runs against 3001.

- [ ] **Step 10: Commit**

```bash
git add instantdb-app/src/lib/auth.ts \
        instantdb-app/src/app/AuthGate.tsx \
        instantdb-app/src/app/login/page.tsx \
        instantdb-app/tests/unauthorized.spec.ts \
        instantdb-app/playwright.config.ts
git commit -m "fix(auth): owner-only authorization + unauthorized banner

Magic-link sign-in now checks for a matching courseMembers row before
allowing access. Unknown emails are signed out and sent to /login with
a 'Not authorized' banner. Tests use a second dev server on port 3001
with an unseeded NEXT_PUBLIC_DEV_USER_EMAIL."
```

---

## Task 4: Admin client helper + `seed-from-sqlite` migration (fixes P1 token, primary consumer)

**Files:**
- Create: `instantdb-app/scripts/_admin-client.mjs`
- Modify: `instantdb-app/scripts/seed-from-sqlite.mjs:28-29,94`
- Create: `instantdb-app/scripts/__tests__/admin-env.test.mjs`
- Modify: `instantdb-app/package.json` (add `test:scripts` npm script)

- [ ] **Step 1: Write the failing script test**

Create `instantdb-app/scripts/__tests__/admin-env.test.mjs`:

```js
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_SCRIPT = join(__dirname, "..", "seed-from-sqlite.mjs");
const RESET_SCRIPT = join(__dirname, "..", "reset-lesson-phases.mjs");

function runWithoutToken(script) {
  const env = { ...process.env };
  delete env.INSTANT_APP_ADMIN_TOKEN;
  return spawnSync("node", [script, "--dry-run"], {
    env,
    encoding: "utf8",
  });
}

test("seed-from-sqlite.mjs exits 1 when INSTANT_APP_ADMIN_TOKEN is unset", () => {
  const result = runWithoutToken(SEED_SCRIPT);
  assert.equal(result.status, 1, `stdout=${result.stdout}\nstderr=${result.stderr}`);
  assert.match(result.stderr, /Set INSTANT_APP_ADMIN_TOKEN/);
});

test("reset-lesson-phases.mjs exits 1 when INSTANT_APP_ADMIN_TOKEN is unset", () => {
  const result = runWithoutToken(RESET_SCRIPT);
  assert.equal(result.status, 1, `stdout=${result.stdout}\nstderr=${result.stderr}`);
  assert.match(result.stderr, /Set INSTANT_APP_ADMIN_TOKEN/);
});
```

- [ ] **Step 2: Add `test:scripts` npm script**

Open `instantdb-app/package.json`. In the `scripts` block, add after `"test:unit"`:

```json
    "test:scripts": "node --test scripts/__tests__/**/*.test.mjs",
```

Resulting scripts block (relevant section):
```json
    "test:unit": "vitest run",
    "test:scripts": "node --test scripts/__tests__/**/*.test.mjs",
```

- [ ] **Step 3: Run the test to confirm both assertions fail**

Run: `cd instantdb-app && npm run test:scripts`
Expected: 2 failures — both scripts currently exit 0 (or non-1) because each has a hardcoded token fallback.

- [ ] **Step 4: Create the admin client helper**

Create `instantdb-app/scripts/_admin-client.mjs`:

```js
// Internal helper: instantiate an InstantDB admin client with env-provided
// credentials. All admin scripts must import createAdminDb() from here —
// never hardcode the admin token in source.
import { init } from "@instantdb/admin";

const APP_ID = process.env.INSTANT_APP_ID ?? "b1c9a636-2a46-4be6-a055-16d6f2ebd233";

export function createAdminDb() {
  const token = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!token) {
    console.error("Set INSTANT_APP_ADMIN_TOKEN before running admin scripts.");
    process.exit(1);
  }
  return init({ appId: APP_ID, adminToken: token });
}
```

- [ ] **Step 5: Migrate `seed-from-sqlite.mjs`**

Open `instantdb-app/scripts/seed-from-sqlite.mjs`. Make three edits:

(a) Line 18 — update the import block. Change:
```js
import { init, id, tx } from "@instantdb/admin";
```
to:
```js
import { id, tx } from "@instantdb/admin";
import { createAdminDb } from "./_admin-client.mjs";
```

(b) Lines 28-29 — delete the literal token block. Delete these two lines entirely:
```js
const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";
const ADMIN_TOKEN = "5ca3a1a8-a25e-49e3-bf10-3bc6d70000db";
```

(c) Line 94 — replace the init call. Change:
```js
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });
```
to:
```js
const db = createAdminDb();
```

- [ ] **Step 6: Run the test — only the seed script test passes**

Run: `cd instantdb-app && npm run test:scripts`
Expected: seed-from-sqlite test passes; reset-lesson-phases test still fails (migration deferred to Task 5).

- [ ] **Step 7: Verify the grep**

Run: `git grep '5ca3a1a8-a25e-49e3-bf10-3bc6d70000db' instantdb-app/scripts/seed-from-sqlite.mjs`
Expected: no output (no matches).

- [ ] **Step 8: Verify the seed script still runs with the env var set**

Run: `cd instantdb-app && INSTANT_APP_ADMIN_TOKEN=5ca3a1a8-a25e-49e3-bf10-3bc6d70000db npm run seed:dry`
Expected: the dry-run output runs to completion (prints the plan, does not exit 1). If you don't have the token locally, any non-empty string that exercises the code path is acceptable for this check — the script will fail later at the API call, which is fine for this verification.

- [ ] **Step 9: Commit**

```bash
git add instantdb-app/scripts/_admin-client.mjs \
        instantdb-app/scripts/seed-from-sqlite.mjs \
        instantdb-app/scripts/__tests__/admin-env.test.mjs \
        instantdb-app/package.json
git commit -m "refactor(scripts): require INSTANT_APP_ADMIN_TOKEN via shared helper

seed-from-sqlite.mjs no longer contains the InstantDB admin token.
createAdminDb() in _admin-client.mjs centralizes the env check and
fails fast with a clear error. reset-lesson-phases.mjs migration is
tracked as Task 5."
```

---

## Task 5: `reset-lesson-phases.mjs` migration (fixes P1 token, second consumer)

**Files:**
- Modify: `instantdb-app/scripts/reset-lesson-phases.mjs:1-25` (import block + token variables)

- [ ] **Step 1: Confirm the existing test (from Task 4) still fails for this script**

Run: `cd instantdb-app && npm run test:scripts`
Expected: 1 failure — the reset-lesson-phases assertion still fails.

- [ ] **Step 2: Read the current top of `reset-lesson-phases.mjs`**

Run: `sed -n '1,25p' instantdb-app/scripts/reset-lesson-phases.mjs`

You will see an `init` import, an `APP_ID` constant, and an `ADMIN_TOKEN` with `process.env.INSTANT_APP_ADMIN_TOKEN || "5ca3a1a8-a25e-49e3-bf10-3bc6d70000db"` fallback. The exact line range may differ slightly from the spec (lines 15-20 region); use the `init` import and `ADMIN_TOKEN = ...` line as anchors.

- [ ] **Step 3: Migrate the imports + init**

Apply two edits:

(a) Replace the `init` import from `@instantdb/admin` — if the file has:
```js
import { init, id, tx } from "@instantdb/admin";
```
change to:
```js
import { id, tx } from "@instantdb/admin";
import { createAdminDb } from "./_admin-client.mjs";
```

If the file only imports `init` (no `id`/`tx`), replace it with just the helper import:
```js
import { createAdminDb } from "./_admin-client.mjs";
```

(b) Delete both the `APP_ID` and `ADMIN_TOKEN` constant declarations, and replace the `init({...})` call with `createAdminDb()`:

```js
const db = createAdminDb();
```

- [ ] **Step 4: Run the script test — both should now pass**

Run: `cd instantdb-app && npm run test:scripts`
Expected: 2 passed.

- [ ] **Step 5: Verify the grep is empty across the whole app**

Run: `git grep '5ca3a1a8-a25e-49e3-bf10-3bc6d70000db' instantdb-app/`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add instantdb-app/scripts/reset-lesson-phases.mjs
git commit -m "refactor(scripts): reset-lesson-phases uses createAdminDb helper

Removes the second (and final) hardcoded InstantDB admin token from
source. Script now requires INSTANT_APP_ADMIN_TOKEN, same as seed."
```

---

## Done Signal

Both must hold after Task 5:

1. **Playwright green:** `cd instantdb-app && npx playwright test` → all projects pass, including new `auth-gate.spec.ts` and `unauthorized.spec.ts`.
2. **No committed token + scripts fail-fast:** `git grep '5ca3a1a8-a25e-49e3-bf10-3bc6d70000db' instantdb-app/` returns no matches, and `cd instantdb-app && npm run test:scripts` passes.

---

## Self-Review

**Spec coverage:**
- §3 contract row 1 (hard-reload keeps route) → Task 2 test & fix ✓
- §3 contract row 2 (seed script exits 1 on missing env) → Task 4 test & fix ✓
- §3 contract row 3 (reset script exits 1 on missing env) → Task 5 test & fix ✓
- §3 contract row 4 (unknown email → banner) → Task 3 test & fix ✓
- §4.1 `useCurrentUser` shape change → Task 1 ✓
- §4.2 `useIsAuthorizedMember` tri-state → Task 3 Step 3 ✓
- §4.3 AuthGate 5-branch state machine → Task 3 Step 4 (supersedes Task 2's 2-branch interim) ✓
- §4.4 `createAdminDb()` factory → Task 4 Step 4 ✓
- §4.5 login page banner → Task 3 Step 6 ✓
- §5 files touched: all 9 appear in tasks ✓

**Placeholder scan:** no `TBD`, `TODO`, or "similar to earlier" references.

**Type consistency:** `CurrentUser`, `CurrentUserState`, `AuthorizationState` defined in Task 1 and Task 3 are consistent. `createAdminDb()` factory name consistent across Tasks 4 and 5. `useIsAuthorizedMember` signature consistent between definition (Task 3 Step 3) and consumption (Task 3 Step 4).

**Note on Task 2 interim AuthGate:** Task 2 ships an AuthGate with only the `isLoading` + no-user branches. Task 3 supersedes it with the full 5-branch machine. The intermediate state is shippable — all existing tests pass — so splitting is safe.
