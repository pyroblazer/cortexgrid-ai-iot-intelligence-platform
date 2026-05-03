import { test, expect } from '@playwright/test';

test.describe('Billing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.goto('/billing');
    await page.waitForURL('**/billing', { timeout: 5000 });
  });

  test('should display current plan', async ({ page }) => {
    await expect(
      page.locator('text=/current plan|free|pro|enterprise/i'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display plan comparison cards', async ({ page }) => {
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
    await expect(page.locator('text=Enterprise')).toBeVisible();
  });

  test('should display usage information', async ({ page }) => {
    await expect(
      page.locator('text=/device|storage|api calls/i'),
    ).toBeVisible({ timeout: 5000 });
  });
});
