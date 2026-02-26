import { test, expect } from '@playwright/test';

test.describe('Demo Pack Flow', () => {
  test('loads demo pack and shows VERIFIED', async ({ page }) => {
    await page.goto('/verify');

    // Click "Try the demo pack"
    const demoButton = page.getByRole('button', { name: /demo/i });
    await expect(demoButton).toBeVisible();
    await demoButton.click();

    // Should navigate to /report and show VERIFIED
    await page.waitForURL('/report', { timeout: 15_000 });
    await expect(page.getByText('VERIFIED')).toBeVisible({ timeout: 10_000 });
  });

  test('report page shows all 6 checks passing', async ({ page }) => {
    await page.goto('/verify');
    await page.getByRole('button', { name: /demo/i }).click();
    await page.waitForURL('/report');

    // Wait for animated checks to complete (6 checks x 250ms + buffer)
    await page.waitForTimeout(2500);

    // Verify the checks heading is visible
    await expect(page.getByRole('heading', { name: /verification checks/i })).toBeVisible({
      timeout: 5_000,
    });

    // Verify the counter shows all 6 checks revealed
    await expect(page.getByText('6/6')).toBeVisible();
  });

  test('navigates to timeline with 13 events', async ({ page }) => {
    await page.goto('/verify');
    await page.getByRole('button', { name: /demo/i }).click();
    await page.waitForURL('/report');

    // Navigate to timeline
    await page.getByRole('link', { name: /timeline/i }).click();
    await page.waitForURL('/timeline');

    // Should show 13 events
    await expect(page.getByText('13 of 13 events')).toBeVisible({ timeout: 5_000 });
  });

  test('full flow: verify → report → timeline → proofs → policy → export', async ({ page }) => {
    // Start at verify
    await page.goto('/verify');
    await page.getByRole('button', { name: /demo/i }).click();
    await page.waitForURL('/report');
    await expect(page.getByText('VERIFIED')).toBeVisible({ timeout: 10_000 });

    // Timeline
    await page.getByRole('link', { name: /timeline/i }).click();
    await page.waitForURL('/timeline');
    await expect(page.getByText('13 of 13 events')).toBeVisible();

    // Proofs
    await page.getByRole('link', { name: /proofs/i }).click();
    await page.waitForURL('/proofs');
    await expect(page.getByRole('heading', { name: 'Ed25519 Signature' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Merkle Tree' })).toBeVisible();

    // Policy
    await page.getByRole('link', { name: /policy/i }).click();
    await page.waitForURL('/policy');
    await expect(page.getByRole('heading', { name: 'Policy Rules' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Policy Decisions' })).toBeVisible();

    // Export
    await page.getByRole('link', { name: /export/i }).click();
    await page.waitForURL('/export');
    await expect(page.getByRole('heading', { name: 'Verification Report' })).toBeVisible();
  });
});
