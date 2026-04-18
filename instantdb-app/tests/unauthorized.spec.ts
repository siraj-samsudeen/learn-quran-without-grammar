import { test, expect } from "@playwright/test";
import { session } from "./support/session";

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
