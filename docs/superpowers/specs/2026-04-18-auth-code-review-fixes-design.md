# Auth Code-Review Fixes — Design

**Date:** 2026-04-18
**Branch:** `feature/plan-3-picker-ui` (worktree: `.worktrees/plan-2-instantdb/`)
**Source:** Code review on the Plan 2 auth layer (three findings: two P1, one P2)
**Scope:** Defect fixes only. No new features, no schema change, no picker changes.

---

## 1. Background

The Plan 2 InstantDB auth layer shipped with three defects surfaced by code review:

1. **P1 — AuthGate redirect race.** `useCurrentUser()` returns `null` both while `db.useAuth()` is still loading and when the user is genuinely signed out. `AuthGate` treats `null` as unauthenticated and redirects to `/login`. On a hard refresh of any protected route (e.g. `/picker/3`), the redirect fires before InstantDB hydrates the session — so an already-authenticated teacher loses their route on every reload.
2. **P1 — Admin token in source.** The InstantDB admin bearer token is hardcoded in `scripts/seed-from-sqlite.mjs` and as a fallback in `scripts/reset-lesson-phases.mjs`. The commit containing it (`c8dcca61`) is already on `origin/feature/plan-3-picker-ui`. Per user decision (2026-04-18), this is a dev/throwaway app and the token will NOT be rotated — we just stop committing it.
3. **P2 — Missing profile after magic-link.** `signInWithCode()` only establishes the InstantDB auth session. `useCurrentCourseMember` looks up `courseMembers` by email; any signed-in user without a pre-seeded membership gets `null`, and every picker write silently no-ops. Per user decision (2026-04-18), scope is **owner-only** — unknown emails get signed out and shown an explicit "Not authorized" screen. No self-serve provisioning.

## 2. Non-Goals

- Rotating the leaked admin token (user-confirmed out of scope for this slice).
- Self-serve teacher onboarding, auto-provisioning of `userProfiles` or `courseMembers`.
- Any change to the picker, the schema, the seed data, or the dev fallback (`NEXT_PUBLIC_DEV_USER_EMAIL`).
- Migrating other hardcoded config to env vars (only the admin token is in scope).

## 3. User-Facing Contract

| Surface | Before | After |
|---|---|---|
| Hard refresh of `/picker/3` while signed in | redirects to `/` via `/login` (session effectively lost) | stays on `/picker/3` after a brief "Checking session…" frame |
| `node scripts/seed-from-sqlite.mjs` with no env var | runs against live app using hardcoded token | exits 1 with `"Set INSTANT_APP_ADMIN_TOKEN before running admin scripts"` |
| `node scripts/reset-lesson-phases.mjs` with no env var | runs against live app using hardcoded fallback | exits 1 with the same error |
| Magic-link sign-in by an unknown email | session succeeds, picker writes silently no-op | session signs out immediately, `/login` shows *"Not authorized. Only registered teachers can access the picker."* |

## 4. Architecture

### 4.1 `useCurrentUser` contract change

Today:
```ts
function useCurrentUser(): CurrentUser | null
```
Returning `null` collapses three distinct states — loading, error, signed-out — into a single signal. Every caller has to guess.

After:
```ts
function useCurrentUser(): { user: CurrentUser | null; isLoading: boolean }
```
- `{ user: null, isLoading: true }` → auth hydration in flight.
- `{ user: null, isLoading: false }` → confirmed signed-out (or auth error).
- `{ user: {...}, isLoading: false }` → authenticated.
- Dev fallback (`NEXT_PUBLIC_DEV_USER_EMAIL` set) returns `{ user: {...}, isLoading: false }` synchronously.

### 4.2 Authorization tri-state

New hook `useIsAuthorizedMember(courseSlug = "lqwg-adhan")` returning `'loading' | 'authorized' | 'unauthorized'`.

Rules (evaluated top-to-bottom, first match wins):
1. If `useCurrentUser` reports `isLoading: true` → `'loading'`.
2. If `user === null` → `'unauthorized'`. This branch is defensive: in practice AuthGate's "no user" branch redirects before authorization is evaluated, but the hook stays honest in isolation.
3. Run the `courseMembers` query, then:
   - `data === undefined` → `'loading'` (query window).
   - `data.courseMembers[0]` exists → `'authorized'`.
   - Otherwise → `'unauthorized'`.

Errors from the query are treated as `'loading'`, not `'unauthorized'`, so a transient network blip cannot sign the owner out of their own session.

### 4.3 `AuthGate` state machine

Branches are evaluated in order; the first matching branch is the render output for that frame.

```
useCurrentUser + useIsAuthorizedMember
  │
  ├── 1. isLoading (user hydration OR membership query)  → <CheckingSessionFrame />
  ├── 2. no user, path === /login                         → render children (the login page)
  ├── 3. no user, path !== /login                         → router.replace('/login')
  ├── 4. user, unauthorized                               → signOut() then router.replace('/login?reason=unauthorized')
  └── 5. user, authorized                                 → render children
```

One effect per render. The `signOut()` in branch 4 is idempotent (InstantDB SDK guarantees), so a second render before auth state propagates does no harm. Branch 2 is required so the login page itself renders for unauthenticated visitors; without it, we'd redirect to /login from /login (an infinite loop).

### 4.4 Admin script helper

New file `instantdb-app/scripts/_admin-client.mjs`:
```js
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

Design choices:
- `INSTANT_APP_ID` keeps its literal default (the app ID is non-sensitive public config) so scripts don't need two env vars during normal use.
- The token is required, with no default, and the script exits 1 before making any network call.
- Underscore-prefix filename (`_admin-client.mjs`) signals "internal helper, not a script" to readers scanning `ls scripts/`.

### 4.5 Login page unauthorized banner

`login/page.tsx` reads `searchParams.get('reason')`. If `reason === 'unauthorized'`, render a red-bordered banner above the form:

> **Not authorized.** Only registered teachers can access the picker.

Banner clears when the user submits the form (we let them try again).

## 5. Files Touched

| File | Change |
|---|---|
| `src/lib/auth.ts` | Change `useCurrentUser` return shape; add `useIsAuthorizedMember` hook |
| `src/app/AuthGate.tsx` | Gate on `isLoading`; wire authorization branch to signOut + redirect |
| `src/app/login/page.tsx` | Match new `useCurrentUser` shape; render unauthorized banner from query param |
| `scripts/seed-from-sqlite.mjs` | Remove hardcoded token; import `createAdminDb` |
| `scripts/reset-lesson-phases.mjs` | Remove hardcoded token + fallback; import `createAdminDb` |
| `scripts/_admin-client.mjs` | **New.** Env-checked `init()` factory |
| `src/app/__tests__/AuthGate.test.tsx` | **New.** Loading state does not redirect (RTL) |
| `tests/login.spec.ts` | Extend. Add unauthorized-email → banner spec and hard-reload route preservation spec |
| `scripts/__tests__/admin-env.test.mjs` or bash equivalent | **New.** Missing env var → exit 1 |

## 6. Task Breakdown

*(This section is the canonical implementation plan input; see `feedback_plan_presentation.md` for the format used at review time.)*

1. **Add loading state to `useCurrentUser`** — update hook and both call sites (AuthGate, login page) to new `{ user, isLoading }` shape. Mechanical, no behavior change.
2. **Gate `AuthGate` on loading** — render `<CheckingSessionFrame />` while `isLoading`, only redirect when `!user && !isLoading`.
3. **Owner-only authorization** — add `useIsAuthorizedMember`; in AuthGate, when `'unauthorized'` and user exists, `signOut()` + redirect to `/login?reason=unauthorized`; render banner on login page.
4. **Admin token env + shared helper + `seed-from-sqlite`** — create `_admin-client.mjs`, migrate seed script, delete literal token.
5. **Admin token env in `reset-lesson-phases`** — migrate second script to the helper, delete literal fallback.

Dependencies: Task 1 is prerequisite for Tasks 2 and 3 (which can then run in parallel). Task 4 is prerequisite for Task 5. Tasks 4–5 are independent of Tasks 1–3.

## 7. Testing Strategy

- **Task 1.** RTL unit test: mocked `db.useAuth({ isLoading: true })` → `useCurrentUser()` returns `{ user: null, isLoading: true }`, not a bare null, and not the dev fallback.
- **Task 2.** Playwright: hard reload of `/picker/3` with a valid session keeps the URL at `/picker/3` and never visits `/login`. RTL: when `useCurrentUser` returns `{ user: null, isLoading: true }`, `AuthGate` does not call `router.replace`.
- **Task 3.** Playwright: sign-in with `noone@example.com` ends at `/login` with the unauthorized banner visible and `db.auth.signOut` called. Counter-test: sign-in with `mailsiraj@gmail.com` lands at `/` with no banner.
- **Task 4.** Bash/Node test: `node scripts/seed-from-sqlite.mjs --dry-run` with `INSTANT_APP_ADMIN_TOKEN` unset exits with code 1 and stderr contains `Set INSTANT_APP_ADMIN_TOKEN`.
- **Task 5.** Grep assertion: `git grep '5ca3a1a8-a25e-49e3-bf10-3bc6d70000db' instantdb-app/` returns zero matches after both scripts are migrated.

## 8. Done Signal

Two signals, both must pass:
1. Playwright suite green including the new AuthGate and unauthorized-login specs.
2. `git grep '5ca3a1a8-a25e-49e3-bf10-3bc6d70000db' instantdb-app/` returns zero matches, and both admin scripts exit 1 when the env var is unset.

## 9. Risks and Open Questions

- **Risk:** if a future admin script reintroduces a hardcoded token, nothing prevents it. Mitigation (out of scope): add a pre-commit hook that greps for known InstantDB token UUIDs. Filed as a follow-up, not part of this slice.
- **Risk:** `useIsAuthorizedMember` treats query errors as `'loading'`. If InstantDB is genuinely down, the owner sits on a spinner instead of getting a clear error. Acceptable for this slice — better than false-signing-out the owner.
- **Open question:** none remaining. Token rotation is declined; authorization scope is owner-only; dev fallback stays.
