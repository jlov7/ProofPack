import { test, expect } from '@playwright/test';

test.describe('Disclosure', () => {
  test.beforeEach(async ({ page }) => {
    // Load demo pack
    await page.goto('/verify');
    await page.getByRole('button', { name: /demo/i }).click();
    await page.waitForURL('/report');
  });

  test('disclosure page shows correct info', async ({ page }) => {
    await page.getByRole('link', { name: /disclosure/i }).click();
    await page.waitForURL('/disclosure');

    await expect(page.getByRole('heading', { name: 'Selective Disclosure' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pack Visibility' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How Disclosure Works' })).toBeVisible();
  });

  test('toggle reveals generate public pack button', async ({ page }) => {
    await page.getByRole('link', { name: /disclosure/i }).click();
    await page.waitForURL('/disclosure');

    // Click the toggle switch
    const toggle = page.getByRole('switch');
    await toggle.click();

    // Should show the "Generate Public Pack" button
    await expect(page.getByRole('button', { name: /generate public pack/i })).toBeVisible();
  });

  test('generates and verifies public pack', async ({ page }) => {
    test.setTimeout(30_000);

    await page.getByRole('link', { name: /disclosure/i }).click();
    await page.waitForURL('/disclosure');

    // Enable public mode
    const toggle = page.getByRole('switch');
    await toggle.click();

    // Generate public pack
    await page.getByRole('button', { name: /generate public pack/i }).click();

    // Wait for verification result
    await expect(page.getByText('Public pack verified successfully')).toBeVisible({
      timeout: 15_000,
    });
  });
});
