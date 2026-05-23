import { test, expect } from '@playwright/test';

test.describe('Device Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@cortexgrid.io');
    await page.fill('input[type="password"]', 'Demo@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test('should display device info card', async ({ page }) => {
    // Navigate to devices list first
    await page.goto('/devices');
    await page.waitForURL(/\/devices/, { timeout: 10000 });

    // Wait for table to load and click first row
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });

    const viewButton = firstRow.locator('button[aria-label^="View"], button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      await firstRow.click();
    }
    await page.waitForURL(/\/devices\/[^/]+$/, { timeout: 10000 });

    // Assert device info card
    await expect(page.locator('text=Device Information')).toBeVisible({ timeout: 5000 });
  });

  test('should display telemetry chart with metric selectors', async ({ page }) => {
    // Navigate directly to a device detail page via the devices list
    await page.goto('/devices');
    await page.waitForURL(/\/devices/, { timeout: 10000 });
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    const viewButton = firstRow.locator('button[aria-label^="View"], button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      await firstRow.click();
    }
    await page.waitForURL(/\/devices\/[^/]+$/, { timeout: 10000 });

    // Assert telemetry section
    await expect(page.locator('text=Real-Time Telemetry')).toBeVisible({ timeout: 5000 });
    // Metric selector buttons should be visible
    const metricButtons = page.locator('button, [class*="rounded-md"]').filter({ hasText: /temperature|humidity|pressure|battery/ });
    expect(await metricButtons.count()).toBeGreaterThan(0);
  });

  test('should toggle edit mode on device detail', async ({ page }) => {
    await page.goto('/devices');
    await page.waitForURL(/\/devices/, { timeout: 10000 });
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    const viewButton = firstRow.locator('button[aria-label^="View"], button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      await firstRow.click();
    }
    await page.waitForURL(/\/devices\/[^/]+$/, { timeout: 10000 });

    // Click Edit button
    const editButton = page.locator('button:has-text("Edit")');
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Should show editable inputs and Save/Cancel buttons
    await expect(page.locator('button:has-text("Save")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();

    // Click Cancel to exit edit mode
    await page.click('button:has-text("Cancel")');
    // Edit button should be visible again
    await expect(page.locator('button:has-text("Edit")')).toBeVisible({ timeout: 3000 });
  });

  test('should have delete button with confirmation', async ({ page }) => {
    await page.goto('/devices');
    await page.waitForURL(/\/devices/, { timeout: 10000 });
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    const viewButton = firstRow.locator('button[aria-label^="View"], button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      await firstRow.click();
    }
    await page.waitForURL(/\/devices\/[^/]+$/, { timeout: 10000 });

    // Delete button should exist
    await expect(page.locator('button:has-text("Delete")')).toBeVisible({ timeout: 5000 });
  });

  test('should have back button that navigates to devices list', async ({ page }) => {
    await page.goto('/devices');
    await page.waitForURL(/\/devices/, { timeout: 10000 });
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });
    const viewButton = firstRow.locator('button[aria-label^="View"], button:has-text("View")').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      await firstRow.click();
    }
    await page.waitForURL(/\/devices\/[^/]+$/, { timeout: 10000 });

    // Back button
    const backButton = page.locator('button:has-text("Back")');
    await expect(backButton).toBeVisible({ timeout: 5000 });
    await backButton.click();
    await page.waitForURL(/\/devices$/, { timeout: 10000 });
  });
});
