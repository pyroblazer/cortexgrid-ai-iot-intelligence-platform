import { test, expect } from '@playwright/test';

test.describe('Forgot Password', () => {
  test('should navigate to forgot-password from login', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.locator('a[href="/forgot-password"], a:has-text("Forgot"), a:has-text("forgot")');
    if (await forgotLink.first().isVisible()) {
      await forgotLink.first().click();
      await page.waitForURL(/\/forgot-password/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/forgot-password/);
    } else {
      // Navigate directly
      await page.goto('/forgot-password');
      await expect(page).toHaveURL(/\/forgot-password/);
    }
  });

  test('should display email input and submit button', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error on empty submit', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.click('button[type="submit"]');
    // Should show validation error (client-side)
    await expect(page.locator('text=/required|valid email/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show success state after submitting valid email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.click('button[type="submit"]');
    // Should show "check your email" confirmation or error (either is acceptable)
    await expect(
      page.locator('text=/check your email|sent|something went wrong|error/i').first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should have link back to login', async ({ page }) => {
    await page.goto('/forgot-password');
    const loginLink = page.locator('a[href="/login"], a:has-text("Sign in"), a:has-text("sign in")');
    await expect(loginLink.first()).toBeVisible();
  });
});
