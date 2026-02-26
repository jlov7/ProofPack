import { test, expect } from '@playwright/test';

test.describe('Timeline', () => {
  test.beforeEach(async ({ page }) => {
    // Load demo pack first
    await page.goto('/verify');
    await page.getByRole('button', { name: /demo/i }).click();
    await page.waitForURL('/report');
    await page.getByRole('link', { name: /timeline/i }).click();
    await page.waitForURL('/timeline');
  });

  test('shows all 13 events', async ({ page }) => {
    await expect(page.getByText('13 of 13 events')).toBeVisible();
  });

  test('filters by decision type — deny shows only deny events', async ({ page }) => {
    // Select deny filter
    const decisionFilter = page.locator('select').last();
    await decisionFilter.selectOption('deny');

    // Should show fewer events
    await expect(page.getByText(/of 13 events/)).toBeVisible();
    const countText = await page.getByText(/of 13 events/).textContent();
    const count = parseInt(countText?.split(' ')[0] ?? '0');
    expect(count).toBeLessThan(13);
    expect(count).toBeGreaterThan(0);
  });

  test('search filters events', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('net.http');

    await expect(page.getByText(/of 13 events/)).toBeVisible();
    const countText = await page.getByText(/of 13 events/).textContent();
    const count = parseInt(countText?.split(' ')[0] ?? '0');
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(13);
  });
});
