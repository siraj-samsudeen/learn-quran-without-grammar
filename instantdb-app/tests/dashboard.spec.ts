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
