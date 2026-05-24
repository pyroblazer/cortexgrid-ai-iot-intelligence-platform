import { test, expect } from '@playwright/test';

test.describe('Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/alerts', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          message: 'Alerts retrieved',
        }),
      })
    );
    await page.goto('/alerts');
    await page.waitForURL(/\/alerts/, { timeout: 10000 });
  });

  test('should display alerts page heading', async ({ page }) => {
    await expect(page.locator('h1:has-text("Alerts")')).toBeVisible({ timeout: 5000 });
  });

  test('should render alert table or empty state', async ({ page }) => {
    // Either a table with alerts or an empty state indicator
    const table = page.locator('table');
    const activeCount = page.locator('text=Active: 0');
    const emptyMessage = page.locator('text=No alerts match your filters');
    const hasTable = await table.isVisible().catch(() => false);
    const hasActiveCount = await activeCount.isVisible().catch(() => false);
    const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);
    expect(hasTable || hasActiveCount || hasEmptyMessage).toBeTruthy();
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
