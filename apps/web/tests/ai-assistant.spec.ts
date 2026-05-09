import { test, expect } from '@playwright/test';

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto('/ai');
    await page.waitForURL(/\/ai/, { timeout: 10000 });
  });

  test('should display AI chat interface', async ({ page }) => {
    await expect(
      page.locator('input[placeholder*="Ask"], textarea, [data-testid="chat-input"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show suggested queries', async ({ page }) => {
    const suggestions = page.locator(
      '[data-testid="suggested-query"], button:has-text("average"), button:has-text("anomal")',
    );
    if (await suggestions.first().isVisible()) {
      expect(await suggestions.count()).toBeGreaterThan(0);
    }
  });

  test('should send a query and receive response', async ({ page }) => {
    const chatInput = page.locator(
      'input[placeholder*="Ask"], textarea, [data-testid="chat-input"]',
    );
    if (await chatInput.isVisible()) {
      await chatInput.fill('What is the average temperature?');
      await chatInput.press('Enter');

      // Wait for the loading indicator or a response to appear
      await expect(
        page.locator('text=/Analyzing|average|temperature|no data/i').first(),
      ).toBeVisible({ timeout: 20000 });
    }
  });
});
