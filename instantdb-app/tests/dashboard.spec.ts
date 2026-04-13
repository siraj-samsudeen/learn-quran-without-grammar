import { test, expect } from "@playwright/test";

test.describe("Pipeline Dashboard (/)", () => {
  test("shows 7 lessons with sidebar and pipeline table", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Sidebar should show app title
    await expect(page.locator("aside h1")).toBeVisible();

    // Sidebar lesson list
    await expect(page.locator("aside").locator("text=Allahu Akbar")).toBeVisible();

    // Main content — "Teacher Dashboard" heading and 7 lesson rows
    await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
    const lessonRows = page.locator("tbody tr").filter({ hasText: /^L\d\./ });
    await expect(lessonRows).toHaveCount(7);
  });

  test("phase dots cycle on click", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const lessonRow = page.locator("tbody tr").filter({ hasText: "Messenger of Allah" }).first();
    const firstDot = lessonRow.locator("td button").first();
    await expect(firstDot).toBeVisible();

    const titleBefore = await firstDot.getAttribute("title");
    await firstDot.click();
    const titleAfter = await firstDot.getAttribute("title");
    expect(titleAfter).not.toEqual(titleBefore);
  });

  test("lesson row expands to show details", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const lessonRow = page.locator("tbody tr").filter({ hasText: "Allahu Akbar" }).first();
    await lessonRow.click();

    await expect(page.locator("text=lesson-01-allahu-akbar")).toBeVisible();
    await expect(page.locator("text=ilah, kabura")).toBeVisible();
  });

  test("sidebar lesson links navigate to picker", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Click lesson in sidebar
    const sidebarLesson = page.locator("aside a").filter({ hasText: "I Bear Witness" }).first();
    await sidebarLesson.click();

    await expect(page).toHaveURL(/\/picker\/2/);
  });
});
