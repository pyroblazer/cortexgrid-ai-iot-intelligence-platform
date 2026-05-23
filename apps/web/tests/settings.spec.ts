import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto('/settings');
    await page.waitForURL(/\/settings/, { timeout: 10000 });
  });

  test('should display settings page heading', async ({ page }) => {
    await expect(page.locator('h1:has-text("Settings"), h1:has-text("Organization")')).toBeVisible({ timeout: 5000 });
  });

  test('should show General tab by default', async ({ page }) => {
    // General tab should have profile fields or org fields
    const generalTab = page.locator('button:has-text("General")');
    await expect(generalTab).toBeVisible();
    // Should show profile or org card
    const profileCard = page.locator('text=Profile, text=Organization');
    await expect(profileCard.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display all tab buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("General")')).toBeVisible();
    await expect(page.locator('button:has-text("Team")')).toBeVisible();
    await expect(page.locator('button:has-text("Notifications")')).toBeVisible();
    await expect(page.locator('button:has-text("Security")')).toBeVisible();
  });

  test('should switch to Security tab and show password form', async ({ page }) => {
    await page.click('button:has-text("Security")');
    await expect(page.locator('text=Change Password')).toBeVisible({ timeout: 5000 });
    // Should have current password, new password, confirm password fields
    const passwordFields = page.locator('input[type="password"]');
    expect(await passwordFields.count()).toBeGreaterThanOrEqual(2);
  });

  test('should switch to Notifications tab and show preferences', async ({ page }) => {
    await page.click('button:has-text("Notifications")');
    await expect(page.locator('text=Notification Preferences')).toBeVisible({ timeout: 5000 });
    // Should have toggle switches
    const switches = page.locator('[role="switch"]');
    expect(await switches.count()).toBeGreaterThan(0);
    // Should have Save button
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
  });

  test('should switch to Team tab and show members', async ({ page }) => {
    await page.click('button:has-text("Team")');
    await expect(page.locator('text=Team Members')).toBeVisible({ timeout: 5000 });
    // Should have Invite Member button
    await expect(page.locator('button:has-text("Invite")')).toBeVisible();
  });

  test('should open invite member modal from Team tab', async ({ page }) => {
    await page.click('button:has-text("Team")');
    await page.click('button:has-text("Invite")');
    await expect(page.locator('text=Invite Team Member')).toBeVisible({ timeout: 5000 });
    // Should have email input
    await expect(page.locator('input[type="email"], input[placeholder*="email"]')).toBeVisible();
    // Should have role select
    await expect(page.locator('select').last()).toBeVisible();
  });
});
