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

  test("unauthenticated visit to / redirects to /login", async ({ page }) => {
    // Needs server started without NEXT_PUBLIC_DEV_USER_EMAIL
    await session(page).visit("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
