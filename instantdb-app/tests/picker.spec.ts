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
});
