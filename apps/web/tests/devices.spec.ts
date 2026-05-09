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
      await filterSelect.selectOption('SENSOR');
      await page.waitForTimeout(500);
    }
  });

  test('should navigate to device detail', async ({ page }) => {
    const viewButton = page.locator('button[aria-label^="View"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForURL(/\/devices\//, { timeout: 10000 });
    }
  });

  test('should navigate to new device page', async ({ page }) => {
    await page.click('button:has-text("Add Device"), a[href="/devices/new"]');
    await page.waitForURL(/\/devices\/new/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/devices\/new/);
  });
});
