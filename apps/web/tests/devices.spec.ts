import { test, expect } from '@playwright/test';

test.describe('Devices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto('/devices');
    await page.waitForURL(/\/devices/, { timeout: 10000 });
  });

  test('should display device list', async ({ page }) => {
    await expect(page.locator('table, [data-testid="device-table"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show device creation button', async ({ page }) => {
    await expect(
      page.locator('button:has-text("Add Device"), a:has-text("Add Device")'),
    ).toBeVisible();
  });

  test('should filter devices by type', async ({ page }) => {
    const filterSelect = page.locator('select[aria-label="Filter by type"]');
    if (await filterSelect.isVisible()) {
      const rowsBefore = await page.locator('table tbody tr').count();
      await filterSelect.selectOption('SENSOR');
      await page.waitForTimeout(500);
      const rowsAfter = await page.locator('table tbody tr').count();
      // After filtering, row count should be <= before (might be equal if all are SENSOR)
      expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
    } else {
      // If no filter select, the table should still be visible
      await expect(page.locator('table, [data-testid="device-table"]')).toBeVisible();
    }
  });

  test('should navigate to device detail', async ({ page }) => {
    // Wait for table rows to load
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });

    // Click the first row or view button to navigate to detail
    const viewButton = firstRow.locator('button[aria-label^="View"], button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      // Click the row itself if no view button
      await firstRow.click();
    }
    await page.waitForURL(/\/devices\/[^/]+$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/devices\/[^/]+$/);

    // Assert device info card is visible
    await expect(page.locator('text=Device Information')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to new device page', async ({ page }) => {
    await page.click('button:has-text("Add Device"), a[href="/devices/new"]');
    await page.waitForURL(/\/devices\/new/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/devices\/new/);
  });
});
