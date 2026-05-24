import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/devices', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 10 } }),
      })
    );
    await page.route('**/api/v1/alerts', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 10 } }),
      })
    );
    await page.route('**/api/v1/telemetry', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    );
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should display dashboard with KPI cards', async ({ page }) => {
    await expect(page.locator('text=Total Devices')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Active Devices')).toBeVisible();
    await expect(page.locator('text=Active Alerts')).toBeVisible();
  });

  test('should display telemetry chart', async ({ page }) => {
    const chart = page.locator('[data-testid="telemetry-chart"], .recharts-wrapper, canvas');
    await expect(chart.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to devices page', async ({ page }) => {
    await page.click('a[href="/devices"], button:has-text("Devices")');
    await page.waitForURL(/\/devices/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/devices/);
  });

  test('should navigate to alerts page', async ({ page }) => {
    await page.click('a[href="/alerts"], button:has-text("Alerts")');
    await page.waitForURL(/\/alerts/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/alerts/);
  });

  test('should navigate to AI assistant', async ({ page }) => {
    await page.click('a[href="/ai"], button:has-text("AI")');
    await page.waitForURL(/\/ai/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/ai/);
  });

  test('should navigate to billing', async ({ page }) => {
    await page.click('a[href="/billing"], button:has-text("Billing")');
    await page.waitForURL(/\/billing/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/billing/);
  });

  test('should display sidebar navigation', async ({ page }) => {
    await expect(page.locator('nav[aria-label="Sidebar navigation"]')).toBeVisible();
  });

  test('should have user menu in top bar', async ({ page }) => {
    await expect(page.locator('button[aria-label="User menu"]')).toBeVisible({ timeout: 5000 });
  });
});
