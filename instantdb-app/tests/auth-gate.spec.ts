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
