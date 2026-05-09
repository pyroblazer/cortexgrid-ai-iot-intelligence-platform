import { test, expect } from '@playwright/test';

test.describe('Billing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto('/billing');
    await page.waitForURL(/\/billing/, { timeout: 10000 });
  });

  test('should display current plan', async ({ page }) => {
    await expect(
      page.locator('text=/current plan|free|pro|enterprise/i').first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display plan comparison cards', async ({ page }) => {
    await expect(page.locator('text=Free').first()).toBeVisible();
    await expect(page.locator('text=Pro').first()).toBeVisible();
    await expect(page.locator('text=Enterprise').first()).toBeVisible();
  });

  test('should display usage information', async ({ page }) => {
    await expect(
      page.locator('text=API Calls').first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
