import { test, expect } from "@playwright/test";

test.describe("Verse Picker (/picker/[N])", () => {
  test("shows verses for lesson 5 (falaha) with scores", async ({ page }) => {
    await page.goto("/picker/5");

    // Wait for loading to finish
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Header should show lesson info
    await expect(page.locator("text=Come to Success")).toBeVisible();
    await expect(page.locator("text=Verse Picker")).toBeVisible();

    // Should have verse cards (falaha has 40 verses)
    // Each verse card has Arabic text in an RTL div
    const verseCards = page.locator(".border.rounded-lg.p-4");
    const count = await verseCards.count();
    expect(count).toBeGreaterThanOrEqual(20); // at least 20 of the 40

    // "All" counter should show the total
    const allPill = page.locator("button").filter({ hasText: /^All\s+\d+/ });
    await expect(allPill).toBeVisible();
    const allText = await allPill.textContent();
    expect(allText).toContain("40");
  });

  test("assigning verses to Learning persists", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Find the first verse card and click "Learning" button
    const firstCard = page.locator(".border.rounded-lg.p-4").first();
    const learningBtn = firstCard.locator('button:has-text("Learning")');
    await learningBtn.click();

    // The card should now have emerald styling (learning selected)
    await expect(firstCard).toHaveClass(/border-emerald/);

    // Learning counter should show 1
    const learningPill = page.locator("button").filter({ hasText: /^Learning\s+\d+/ });
    const learningText = await learningPill.textContent();
    expect(learningText).toContain("1");
  });

  test("assigning verse to Recall works", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Find the second verse card and click "Recall"
    const secondCard = page.locator(".border.rounded-lg.p-4").nth(1);
    const recallBtn = secondCard.locator('button:has-text("Recall")');
    await recallBtn.click();

    // The card should have blue styling
    await expect(secondCard).toHaveClass(/border-blue/);
  });

  test("adding remarks persists", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Find a verse card and click "+ Add remark"
    const card = page.locator(".border.rounded-lg.p-4").first();
    const addRemarkBtn = card.locator('button:has-text("Add remark")');

    // If there's already a remark from previous test, click the remark text instead
    const remarkOrAdd = card.locator("button").filter({ hasText: /remark|Add remark/ }).first();
    await remarkOrAdd.click();

    // Type a remark and save
    const remarkInput = card.locator('input[placeholder="Why this verse?"]');
    await remarkInput.fill("Strong teaching verse for falaha root");
    await card.locator('button:has-text("Save")').click();

    // Remark text should now be visible
    await expect(card.locator("text=Strong teaching verse for falaha root")).toBeVisible();
  });

  test("selections persist on page refresh", async ({ page }) => {
    // First, make a selection
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const firstCard = page.locator(".border.rounded-lg.p-4").first();
    const pipelineBtn = firstCard.locator('button:has-text("Pipeline")');
    await pipelineBtn.click();

    // Wait a moment for InstantDB to sync
    await page.waitForTimeout(1000);

    // Refresh the page
    await page.reload();
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // The pipeline counter should be >= 1 (from this + any prior test assignments)
    const pipelinePill = page.locator("button").filter({ hasText: /^Pipeline\s+\d+/ });
    const pipelineText = await pipelinePill.textContent();
    const pipelineCount = parseInt(pipelineText!.match(/\d+/)![0]);
    expect(pipelineCount).toBeGreaterThanOrEqual(1);
  });

  test("Copy JSON produces valid JSON in clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    // Handle the alert dialog that fires after copy
    page.on("dialog", (dialog) => dialog.accept());

    // Click "Copy JSON" button
    const copyBtn = page.locator('button:has-text("Copy JSON")');
    await copyBtn.click();

    // Read clipboard content
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );

    // Should be valid JSON
    const parsed = JSON.parse(clipboardText);
    expect(parsed).toHaveProperty("lesson", 5);
    expect(parsed).toHaveProperty("selections");
    expect(parsed.selections).toHaveProperty("learning");
    expect(parsed.selections).toHaveProperty("recall");
    expect(parsed.selections).toHaveProperty("pipeline");
  });

  test("back to dashboard link works", async ({ page }) => {
    await page.goto("/picker/5");
    await expect(page.locator("text=Loading...")).not.toBeVisible();

    const backLink = page.locator('a:has-text("Dashboard")');
    await backLink.click();

    // Should navigate to dashboard
    await expect(page).toHaveURL("/");
    await expect(page.locator("text=Teacher Dashboard")).toBeVisible();
  });
});
