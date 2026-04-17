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

  test("selection bar shows three zero-valued gauges when nothing is selected", async ({ page }) => {
    await session(page).visit("/picker/3");
    await expect(page.locator("text=Loading...")).not.toBeVisible();
    await expect(page.getByText("Sentences", { exact: true })).toBeVisible();
    await expect(page.getByText("Words", { exact: true })).toBeVisible();
    await expect(page.getByText("Forms", { exact: true })).toBeVisible();
  });

  test("clicking a heatmap chip activates a filter and shows Clear", async ({ page }) => {
    await session(page).visit("/picker/3");
    await expect(page.locator("text=Loading...")).not.toBeVisible();
    const chip = page.locator("[data-testid='heatmap-chip']").first();
    await chip.click();
    await expect(page.getByRole("button", { name: /Clear filter/i })).toBeVisible();
    await chip.click();
    await expect(page.getByRole("button", { name: /Clear filter/i })).not.toBeVisible();
  });

  test("clicking a table row toggles its selected state", async ({ page }) => {
    await session(page).visit("/picker/3");
    await expect(page.locator("text=Loading...")).not.toBeVisible();
    // Auto-select (Task 14) may pre-select some top rows on a fresh lesson —
    // pick the first CURRENTLY UNSELECTED row and lock the locator to its
    // sentence-id so Playwright's retry loop tracks the SAME row (not a
    // moving "first unselected" target as auto-select writes arrive).
    const unselected = page.locator("[data-testid='candidate-row'][data-selected='false']").first();
    await expect(unselected).toBeVisible();
    const sid = await unselected.getAttribute("data-sentence-id");
    const row = page.locator(`[data-sentence-id='${sid}']`);
    await row.click();
    await expect(row).toHaveAttribute("data-selected", "true");
    await row.click();
    await expect(row).toHaveAttribute("data-selected", "false");
  });

  test("Show count cap limits table rows", async ({ page }) => {
    await session(page).visit("/picker/3");
    await expect(page.locator("text=Loading...")).not.toBeVisible();
    await page.getByLabel("Show count").selectOption("20");
    const count = await page.locator("[data-testid='candidate-row']").count();
    expect(count).toBeLessThanOrEqual(20);
  });

  test("selecting a row persists across page reload", async ({ page }) => {
    await session(page).visit("/picker/3");
    await expect(page.locator("text=Loading...")).not.toBeVisible();
    // Auto-select may pre-select top rows on a fresh lesson; pick an
    // unselected row so the click toggles false→true (not true→false).
    const firstRow = page.locator("[data-testid='candidate-row'][data-selected='false']").first();
    await expect(firstRow).toBeVisible();
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

  test("loading a fresh lesson auto-selects 10 candidates", async ({ page }) => {
    // Pre-requisite: the lesson must have zero existing selections.
    // Pre-flight P3 wiped all selections, and earlier tests are self-cleaning,
    // so any lesson EXCEPT L3 (which may have leftover state from prior tests)
    // should be clean. We use L4 ("Come to Prayer").
    //
    // Intentional side effect: this test leaves 10 selections in the DB for L4.
    // Run `npm run reset:phases` to clean up between runs.
    await session(page).visit("/picker/4");
    await expect(page.locator("text=Loading...")).not.toBeVisible();
    // Diversity-decay auto-picks can span the wider candidate pool (~3786 for
    // L4); the default 30-row cap may hide some of them, so expand the view
    // to "All" (200) before counting selected rows.
    await page.getByLabel("Show count").selectOption({ label: "All" });
    await expect
      .poll(async () => await page.locator("[data-selected='true']").count(), {
        timeout: 15000,
      })
      .toBe(10);
  });
});
