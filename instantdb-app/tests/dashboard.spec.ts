import { test, expect } from "@playwright/test";

test.describe("Pipeline Dashboard (/)", () => {
  test("shows 7 lessons with correct stats", async ({ page }) => {
    await page.goto("/");

    // Wait for lessons to load (InstantDB real-time query)
    await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Stats cards — 7 total, 2 published
    const statCards = page.locator(".bg-white.border.rounded-lg.px-4.py-3");
    await expect(statCards.first()).toBeVisible();

    // All 7 lesson rows should appear
    const lessonRows = page.locator("tbody tr").filter({ hasText: /^L\d\./ });
    await expect(lessonRows).toHaveCount(7);

    // Verify specific lessons exist
    await expect(page.locator("text=Allahu Akbar")).toBeVisible();
    await expect(page.locator("text=I Bear Witness")).toBeVisible();
    await expect(page.locator("text=Messenger of Allah")).toBeVisible();
    await expect(page.locator("text=Come to Prayer")).toBeVisible();
    await expect(page.locator("text=Come to Success")).toBeVisible();
    await expect(page.locator("text=Prayer is Better than Sleep")).toBeVisible();
    await expect(page.locator("text=The Prayer Has Begun")).toBeVisible();
  });

  test("phase dots are clickable and cycle status", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Find a phase dot button in lesson 3 (picking phase = "ready")
    // The phase dots are buttons inside td cells
    const lessonRow = page.locator("tbody tr").filter({ hasText: "Messenger of Allah" }).first();
    const phaseDots = lessonRow.locator("td button");

    // Click the first phase dot — should cycle its status
    const firstDot = phaseDots.first();
    await expect(firstDot).toBeVisible();

    // Get initial title
    const titleBefore = await firstDot.getAttribute("title");

    // Click to cycle
    await firstDot.click();

    // Title should change (status cycled)
    const titleAfter = await firstDot.getAttribute("title");
    expect(titleAfter).not.toEqual(titleBefore);
  });

  test("lesson row expands to show details on click", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Click on lesson 1 row
    const lessonRow = page.locator("tbody tr").filter({ hasText: "Allahu Akbar" }).first();
    await lessonRow.click();

    // Detail panel should appear with slug and roots info
    await expect(page.locator("text=lesson-01-allahu-akbar")).toBeVisible();
    await expect(page.locator("text=ilah, kabura")).toBeVisible();
  });

  test("picker links appear for lessons with scoring done", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Lessons 1 and 2 have scoring = done, so picker "Open" link should appear
    const openLinks = page.locator('a:has-text("Open")');
    // At least lessons with scoring done should have Open links
    const count = await openLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // The link should point to /picker/N
    const firstHref = await openLinks.first().getAttribute("href");
    expect(firstHref).toMatch(/\/picker\/\d+/);
  });
});
