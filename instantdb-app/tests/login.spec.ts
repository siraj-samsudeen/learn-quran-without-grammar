import { test, expect } from "@playwright/test";
import { session } from "./support/session";

test.describe("Login (/login)", () => {
  // Skipped: playwright.config.ts hardcodes NEXT_PUBLIC_DEV_USER_EMAIL on port 3000,
  // so the login page never renders the form under test. Restore by adding a third
  // Playwright project + webServer on another port with no dev-fallback env var.
  test.skip("shows email input and sends magic code", async ({ page }) => {
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

  // Skipped: playwright.config.ts hardcodes NEXT_PUBLIC_DEV_USER_EMAIL on port 3000,
  // so there is always an authenticated user; the "no user → /login" branch cannot
  // be exercised against this webServer. The equivalent unauthorized-user flow is
  // covered by tests/unauthorized.spec.ts against port 3001.
  test.skip("unauthenticated visit to / redirects to /login", async ({ page }) => {
    await session(page).visit("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
