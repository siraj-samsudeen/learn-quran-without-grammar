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
});
