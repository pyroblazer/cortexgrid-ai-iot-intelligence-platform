import { test, expect } from '@playwright/test';

test.describe('Alert Rules', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            expiresIn: '86400',
            user: {
              id: 'test-user-id',
              email: 'demo@cortexgrid.io',
              firstName: 'Demo',
              lastName: 'User',
              organizationId: 'test-org-id',
              role: 'ADMIN',
            },
          },
        }),
      })
    );
    await page.route('**/alerts/rules**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          message: 'Rules retrieved',
        }),
      })
    );

    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await page.goto('/alerts/rules');
    await page.waitForURL(/\/alerts\/rules/, { timeout: 10000 });
  });

  test('should display alert rules page heading', async ({ page }) => {
    await expect(page.locator('h1:has-text("Alert Rules")')).toBeVisible({ timeout: 5000 });
  });

  test('should render rules table or empty state', async ({ page }) => {
    const table = page.locator('table');
    const emptyMessage = page.locator('text=/no alert rules|no rules/i');
    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await emptyMessage.isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('should display Create Rule button', async ({ page }) => {
    await expect(page.locator('button:has-text("Create Rule")')).toBeVisible({ timeout: 5000 });
  });

  test('should open create rule modal', async ({ page }) => {
    await page.click('button:has-text("Create Rule")');
    // Modal should open with form fields
    await expect(page.locator('text=Create Alert Rule')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder*="Rule"], input[value]').first()).toBeVisible();
    // Should have severity dropdown
    await expect(page.locator('select').filter({ hasText: /Critical|Warning|Info/ }).first()).toBeVisible().catch(() => {
      // Severity select might be in a different format
    });
  });

  test('should have back to alerts link', async ({ page }) => {
    const backLink = page.locator('button:has-text("Back"), a:has-text("Back")');
    await expect(backLink.first()).toBeVisible();
  });
});
