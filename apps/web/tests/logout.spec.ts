import { test, expect } from '@playwright/test';

test.describe('Logout', () => {
  test('should log out and redirect to login', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Click user menu
    const userMenu = page.locator('button[aria-label="User menu"]');
    await expect(userMenu).toBeVisible({ timeout: 5000 });
    await userMenu.click();

    // Click logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out")');
    await expect(logoutButton.first()).toBeVisible({ timeout: 5000 });
    await logoutButton.first().click();

    // Should redirect to login page
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should not access dashboard after logout', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Logout
    const userMenu = page.locator('button[aria-label="User menu"]');
    await userMenu.click();
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out")');
    await logoutButton.first().click();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Try to access dashboard — should redirect to login
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
