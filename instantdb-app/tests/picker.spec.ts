import { test, expect } from "@playwright/test";

test.describe("Verse Picker (/picker/[N])", () => {
  test("shows verses for lesson 5 with scores and audio", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Lesson selector should show current lesson
    const selector = page.locator("select").first();
    await expect(selector).toHaveValue("5");

    // Should have verse cards
    const cards = page.locator("[data-testid='verse-card']");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(20);

    // "All" counter should show 40
    const allPill = page.locator("button").filter({ hasText: /^All\s+40/ });
    await expect(allPill).toBeVisible();

    // Audio players should be present
    const audioElements = page.locator("audio");
    expect(await audioElements.count()).toBeGreaterThanOrEqual(1);
  });

  test("assigning verse to Learning updates card and counter", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const firstCard = page.locator("[data-testid='verse-card']").first();

    // Ensure card starts in none state — if already assigned, click to deselect first
    const currentSection = await firstCard.getAttribute("data-section");
    if (currentSection === "learning") {
      await firstCard.locator("button:has-text('Learning')").click();
      await expect(firstCard).toHaveAttribute("data-section", "none");
    } else if (currentSection !== "none") {
      // Assigned to something else — click that section to deselect
      await firstCard.locator(`button:has-text('${currentSection === "recall" ? "Recall" : "Pipeline"}')`).click();
      await expect(firstCard).toHaveAttribute("data-section", "none");
    }

    // Now assign to Learning
    await firstCard.locator("button:has-text('Learning')").click();
    await expect(firstCard).toHaveAttribute("data-section", "learning");

    // Learning counter should show >= 1
    const learningPill = page.locator("button").filter({ hasText: /^Learning\s+\d+/ });
    await expect(learningPill).toContainText(/[1-9]/);
  });

  test("clicking active section button deselects to none", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const firstCard = page.locator("[data-testid='verse-card']").first();

    // Ensure card starts unassigned
    const currentSection = await firstCard.getAttribute("data-section");
    if (currentSection !== "none") {
      const label = currentSection === "learning" ? "Learning" : currentSection === "recall" ? "Recall" : "Pipeline";
      await firstCard.locator(`button:has-text('${label}')`).click();
      await expect(firstCard).toHaveAttribute("data-section", "none");
    }

    // Select Recall
    await firstCard.locator("button:has-text('Recall')").click();
    await expect(firstCard).toHaveAttribute("data-section", "recall");

    // Deselect by clicking again
    await firstCard.locator("button:has-text('Recall')").click();
    await expect(firstCard).toHaveAttribute("data-section", "none");
  });

  test("remark field is always visible and editable", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const firstCard = page.locator("[data-testid='verse-card']").first();

    // Remark label should be visible
    await expect(firstCard.locator("text=Remark")).toBeVisible();

    // Contenteditable remark div should be present
    const remarkField = firstCard.locator("[contenteditable='true']");
    await expect(remarkField).toBeVisible();
  });

  test("issue bar chips are visible and clickable", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const firstCard = page.locator("[data-testid='verse-card']").first();

    // Issue chips should be present
    await expect(firstCard.locator("button:has-text('Arabic')")).toBeVisible();
    await expect(firstCard.locator("button:has-text('Eng')")).toBeVisible();

    // Click Eng chip
    await firstCard.locator("button:has-text('Eng')").click();

    // Issue bar should indicate an active issue
    const issueBar = firstCard.locator("[data-testid='issue-bar']");
    await expect(issueBar).toHaveAttribute("data-has-issue", "true");
  });

  test("lesson selector navigates between lessons", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const selector = page.locator("select").first();
    await selector.selectOption("2");

    await expect(page).toHaveURL(/\/picker\/2/);
    await expect(page.locator("text=Loading...")).not.toBeVisible();
    await expect(page.locator("text=SHAHIDA")).toBeVisible();
  });

  test("selections persist on page refresh", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const firstCard = page.locator("[data-testid='verse-card']").first();
    await firstCard.locator("button:has-text('Pipeline')").click();
    await page.waitForTimeout(1000);

    await page.reload();
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Pipeline counter should be >= 1
    const pipelinePill = page.locator("button").filter({ hasText: /^Pipeline\s+\d+/ });
    await expect(pipelinePill).toContainText(/[1-9]/);
  });

  test("sidebar shows picker context with root groups", async ({ page }) => {
    await page.goto("/picker/2");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Sidebar lesson info
    await expect(page.locator("aside").locator("text=L2. I Bear Witness")).toBeVisible();

    // Sidebar root navigation with counts
    await expect(page.locator("aside").locator("text=Learning")).toBeVisible();
    await expect(page.locator("aside").locator("text=Pipeline")).toBeVisible();
  });

  test("dashboard link in sidebar navigates back", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    await page.locator("aside").locator("a:has-text('Dashboard')").click();
    await expect(page).toHaveURL("/");
    await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
  });
});
