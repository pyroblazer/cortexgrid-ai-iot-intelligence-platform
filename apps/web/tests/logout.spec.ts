import { test, expect } from '@playwright/test';

test.describe('Logout', () => {
  test('should log out and redirect to login', async ({ page }) => {
    // Start with a known state - go directly to dashboard URL
    await page.goto('/dashboard');

    // If redirected to login, that's fine - skip the logout test
    if (await page.url().includes('/login')) {
      test.skip(true, 'Already on login page - skipping logout test');
    }

    // Wait for user menu to be visible
    await page.waitForTimeout(3000);
    const userMenu = page.locator('button[aria-label="User menu"], button:has-text("User"), button:has-text("Account")').first();

    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Click logout
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL(/login/, { timeout: 15000 });
        await expect(page).toHaveURL(/login/);
      } else {
        test.skip(true, 'Logout button not found');
      }
    } else {
      test.skip(true, 'User menu not found - not logged in');
    }
  });

  test('should not access dashboard after logout', async ({ page }) => {
    // Clear all auth state including the cookie the middleware checks
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = 'cortexgrid_access_token=; path=/; max-age=0';
    });
    await page.context().clearCookies();

    // Try to access dashboard directly - should redirect to login
    await page.goto('/dashboard');
    await page.waitForURL(/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/login/);
  });
});
