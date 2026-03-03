import { test, expect } from '@playwright/test';

test.describe('Command Palette', () => {
  test('opens with / key and navigates', async ({ page }) => {
    // Load demo pack first to enable all nav items
    await page.goto('/verify');
    await page.getByRole('button', { name: /demo/i }).click();
    await page.waitForURL('/report');
    await expect(page.getByText(/command palette/i)).toBeVisible();

    // Press / to open command palette
    await page.keyboard.press('/');

    // Command palette should be visible (cmdk renders [cmdk-root])
    const palette = page.locator('[cmdk-root]');
    await expect(palette).toBeVisible({ timeout: 3_000 });

    // Type "timeline" to filter
    await page.keyboard.type('timeline');

    // Press Enter to navigate
    await page.keyboard.press('Enter');

    // Should navigate to timeline
    await page.waitForURL('/timeline', { timeout: 5_000 });
  });

  test('closes with Escape', async ({ page }) => {
    await page.goto('/verify');
    await expect(page.getByText(/command palette/i)).toBeVisible();

    // Open palette
    await page.keyboard.press('/');
    const palette = page.locator('[cmdk-root]');
    await expect(palette).toBeVisible({ timeout: 3_000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(palette).not.toBeVisible({ timeout: 3_000 });
  });
});
