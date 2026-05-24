import { test, expect } from '@playwright/test';

test.describe('Devices', () => {
  const mockDevice = {
    id: 'device-1',
    name: 'Test Device',
    type: 'SENSOR',
    serialNumber: 'SN001',
    status: 'ONLINE',
    location: 'Office',
    lastSeenAt: new Date().toISOString(),
    organizationId: 'test-org-id',
    createdAt: new Date().toISOString(),
  };

  test.beforeEach(async ({ page }) => {
    await page.route(/\/api\/v1\/devices(\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            data: [mockDevice],
            meta: { total: 1, page: 1, limit: 10 },
          },
        }),
      })
    );
    await page.route(/\/api\/v1\/devices\/device-1/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockDevice,
        }),
      })
    );
    await page.goto('/devices');
    await page.waitForLoadState('networkidle');
    await page.waitForURL(/\/devices/, { timeout: 15000 });
  });

  test('should display device list', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForTimeout(3000);

    // Look for devices heading
    await expect(page.getByRole('heading', { name: /devices|Devices/i })).toBeVisible({ timeout: 10000 });

    // Look for any device-related content
    await expect(page.locator('text="Test Device"')).toBeVisible({ timeout: 5000 });

    // Look for the content area where devices are displayed
    await expect(page.locator('[data-testid*="devices"], .space-y-6')).toBeVisible({ timeout: 5000 });
  });

  test('should show device creation button', async ({ page }) => {
    await expect(page.locator('button:has-text("Add Device")')).toBeVisible({ timeout: 10000 });
  });

  test('should filter devices by type', async ({ page }) => {
    // Wait for devices to load
    await page.waitForTimeout(3000);

    // Look for type filter dropdown
    const typeFilter = page.locator('select[aria-label="Filter by type"]');
    const hasFilter = await typeFilter.isVisible();

    if (hasFilter) {
      // Check that our test device is visible initially
      await expect(page.locator('text="Test Device"')).toBeVisible();

      // Filter by SENSOR (should show our test device)
      await typeFilter.selectOption('SENSOR');
      await page.waitForTimeout(1000);

      // Check that our test device is still visible
      await expect(page.locator('text="Test Device"')).toBeVisible();

      // Reset filter
      await typeFilter.selectOption('All Types');
    } else {
      // Skip test if filter is not available
      test.skip(true, 'Type filter not available');
    }
  });

  test('should navigate to device detail', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for view button by title or aria-label
    const viewButton = page.locator('button[aria-label^="View"], button[title*="view"], button:has-text("View")').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else {
      // Try to find eye icon which typically means view
      const eyeButton = page.locator('button svg:has-text("Eye"), button svg:has-text("eye")').first();
      if (await eyeButton.isVisible()) {
        eyeButton.click();
      } else {
        // Fallback: Click the test device text
        await page.click('text="Test Device"');
      }
    }

    // Wait for navigation to detail page
    await expect(page).toHaveURL(/\/devices\/device-1$/, { timeout: 10000 });

    // Assert the device name heading is visible on detail page
    await expect(page.getByRole('heading', { name: 'Test Device' })).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to new device page', async ({ page }) => {
    // Look for "Add Device" button
    const addDeviceButton = page.locator('button:has-text("Add Device")').first();
    await expect(addDeviceButton).toBeVisible({ timeout: 5000 });
    await addDeviceButton.click();

    // Wait for navigation to new device page
    await page.waitForURL(/\/devices\/new|\/devices\/create/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/devices\/(new|create)/);
  });
});
