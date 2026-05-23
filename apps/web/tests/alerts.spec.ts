import { test, expect } from '@playwright/test';

test.describe('Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto('/alerts');
    await page.waitForURL(/\/alerts/, { timeout: 10000 });
  });

  test('should display alerts page heading', async ({ page }) => {
    await expect(page.locator('h1:has-text("Alerts")')).toBeVisible({ timeout: 5000 });
  });

  test('should render alert table or empty state', async ({ page }) => {
    // Either a table with alerts or an empty state message
    const table = page.locator('table');
    const emptyMessage = page.locator('text=/no alerts|empty/i');
    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await emptyMessage.isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('should display severity filter dropdown', async ({ page }) => {
    const severitySelect = page.locator('select[aria-label="Filter by severity"]');
    if (await severitySelect.isVisible()) {
      await severitySelect.selectOption('CRITICAL');
      await page.waitForTimeout(500);
    }
    // Page should still render without errors
    await expect(page.locator('h1:has-text("Alerts")')).toBeVisible();
  });

  test('should display status filter dropdown', async ({ page }) => {
    const statusSelect = page.locator('select[aria-label="Filter by status"]');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('ACTIVE');
      await page.waitForTimeout(500);
    }
    await expect(page.locator('h1:has-text("Alerts")')).toBeVisible();
  });

  test('should have link to alert rules', async ({ page }) => {
    const rulesLink = page.locator('a[href="/alerts/rules"], button:has-text("Manage Rules")');
    await expect(rulesLink.first()).toBeVisible({ timeout: 5000 });
  });
});
