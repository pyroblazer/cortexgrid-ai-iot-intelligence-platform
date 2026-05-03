import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should display dashboard with KPI cards', async ({ page }) => {
    await expect(page.locator('text=Total Devices')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Active Devices')).toBeVisible();
    await expect(page.locator('text=Alerts')).toBeVisible();
  });

  test('should display telemetry chart', async ({ page }) => {
    const chart = page.locator('[data-testid="telemetry-chart"], .recharts-wrapper, canvas');
    await expect(chart.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to devices page', async ({ page }) => {
    await page.click('a[href="/devices"], button:has-text("Devices")');
    await page.waitForURL(/\/devices/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/devices/);
  });

  test('should navigate to alerts page', async ({ page }) => {
    await page.click('a[href="/alerts"], button:has-text("Alerts")');
    await page.waitForURL(/\/alerts/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/alerts/);
  });

  test('should navigate to AI assistant', async ({ page }) => {
    await page.click('a[href="/ai"], button:has-text("AI")');
    await page.waitForURL(/\/ai/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/ai/);
  });

  test('should navigate to billing', async ({ page }) => {
    await page.click('a[href="/billing"], button:has-text("Billing")');
    await page.waitForURL(/\/billing/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/billing/);
  });

  test('should display sidebar navigation', async ({ page }) => {
    await expect(page.locator('nav, [data-testid="sidebar"]')).toBeVisible();
  });

  test('should have user menu in top bar', async ({ page }) => {
    await expect(
      page.locator('[data-testid="user-menu"], button:has-text("demo@cortexgrid.io")'),
    ).toBeVisible({ timeout: 5000 });
  });
});
