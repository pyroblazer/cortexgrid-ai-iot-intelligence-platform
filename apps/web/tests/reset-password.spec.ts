import { test, expect } from '@playwright/test';

test.use({ storageState: undefined });

test.describe('Reset Password', () => {
  test('should show error state without token', async ({ page }) => {
    await page.goto('/reset-password');
    // Check for the specific error heading with text
    await expect(page.getByRole('heading', { name: 'Invalid reset link' })).toBeVisible({ timeout: 5000 });
    // Should have link to request new reset link
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test('should show password form with valid token', async ({ page }) => {
    await page.goto('/reset-password?token=fake-test-token-123');
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.goto('/reset-password?token=fake-test-token-123');
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('short');
    await passwordInputs.nth(1).fill('short');
    await page.click('button[type="submit"]');
    // Look for specific validation error message
    await expect(page.locator('text="Password must be at least 8 characters"')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.goto('/reset-password?token=fake-test-token-123');
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('NewPass123');
    await passwordInputs.nth(1).fill('DifferentPass456');
    await page.click('button[type="submit"]');
    // Look for specific mismatch error
    await expect(page.locator('text="Passwords do not match"')).toBeVisible({ timeout: 5000 });
  });

  test('should have link back to login', async ({ page }) => {
    await page.goto('/reset-password?token=fake-test-token-123');
    const loginLink = page.locator('a[href="/login"], a:has-text("Sign in"), a:has-text("sign in")');
    await expect(loginLink.first()).toBeVisible();
  });
});
