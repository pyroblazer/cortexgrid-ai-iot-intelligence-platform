import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: { email: 'demo@cortexgrid.io' } } }),
      })
    );
    await page.route('**/api/v1/organizations', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    );
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForURL(/\/settings/, { timeout: 15000 });
  });

  test('should display settings page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /settings|Organization Settings/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show General tab by default', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Look for profile or organization cards
    const profileCard = page.getByRole('heading', { name: /profile|Profile/i }).first();
    const orgCard = page.getByRole('heading', { name: /organization|Organization/i }).first();

    // At least one should be visible
    const isProfileVisible = await profileCard.isVisible();
    const isOrgVisible = await orgCard.isVisible();

    expect(isProfileVisible || isOrgVisible).toBe(true);
  });

  test('should display all tab buttons', async ({ page }) => {
    // Look for tab buttons by their text content
    await expect(page.locator('button:has-text("General")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Team")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Notifications")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Security")')).toBeVisible({ timeout: 5000 });
  });

  test('should switch to Security tab and show password form', async ({ page }) => {
    await page.click('button:has-text("Security")');
    await page.waitForTimeout(1000);

    // Look for the password change heading specifically
    const passwordHeading = page.getByRole('heading', { name: 'Change Password' }).first();
    await expect(passwordHeading).toBeVisible({ timeout: 5000 });

    // Should have current password, new password, confirm password fields
    const passwordFields = page.locator('input[type="password"]');
    expect(await passwordFields.count()).toBeGreaterThanOrEqual(2);
  });

  test('should switch to Notifications tab and show preferences', async ({ page }) => {
    await page.click('button:has-text("Notifications")');
    await page.waitForTimeout(1000);

    // Look for notification preferences heading
    const notifHeading = page.getByRole('heading', { name: 'Notification Preferences' }).first();
    await expect(notifHeading).toBeVisible({ timeout: 5000 });

    // Should have toggle switches
    const switches = page.locator('[role="switch"]');
    expect(await switches.count()).toBeGreaterThan(0);
    // Should have Save button
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
  });

  test('should switch to Team tab and show members', async ({ page }) => {
    await page.click('button:has-text("Team")');
    await page.waitForTimeout(1000);

    // Look for team members heading
    const teamHeading = page.getByRole('heading', { name: 'Team Members' }).first();
    await expect(teamHeading).toBeVisible({ timeout: 5000 });

    // Should have Invite Member button
    await expect(page.getByRole('button', { name: /invite/i })).toBeVisible();
  });

  test('should open invite member modal from Team tab', async ({ page }) => {
    await page.click('button:has-text("Team")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Invite")');
    await expect(page.getByRole('heading', { name: 'Invite Team Member' })).toBeVisible({ timeout: 5000 });

    // Should have email input
    await expect(page.locator('input[type="email"]')).toBeVisible();
    // Should have role select
    await expect(page.locator('select')).toBeVisible();
  });
});
