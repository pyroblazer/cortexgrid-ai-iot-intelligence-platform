import { test, expect } from '@playwright/test';

test.describe('Devices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.goto('/devices');
    await page.waitForURL(/\/devices/, { timeout: 5000 });
  });

  test('should display device list', async ({ page }) => {
    await expect(page.locator('table, [data-testid="device-table"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show device creation button', async ({ page }) => {
    await expect(
      page.locator('a[href="/devices/new"], button:has-text("Add Device")'),
    ).toBeVisible();
  });

  test('should filter devices by type', async ({ page }) => {
    const filterSelect = page.locator('select, [data-testid="type-filter"]').first();
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('SENSOR');
      await page.waitForTimeout(500);
    }
  });

  test('should navigate to device detail', async ({ page }) => {
    const deviceRow = page.locator('table tbody tr, [data-testid="device-row"]').first();
    if (await deviceRow.isVisible()) {
      await deviceRow.click();
      await page.waitForURL(/\/devices\//, { timeout: 5000 });
      await expect(page.locator('text=/sensor|device/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should create a new device', async ({ page }) => {
    await page.click('a[href="/devices/new"]');
    await page.waitForURL(/\/devices\/new/, { timeout: 5000 });

    await page.fill('input[name="name"]', 'Playwright Test Device');
    await page.fill('input[name="serialNumber"]', `PW-SN-${Date.now()}`);
    await page.selectOption('select[name="type"]', 'SENSOR');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/devices/, { timeout: 10000 });
    await expect(page.locator('text=Playwright Test Device')).toBeVisible({ timeout: 5000 });
  });
});
