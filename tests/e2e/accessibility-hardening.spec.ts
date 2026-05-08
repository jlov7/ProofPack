import { expect, test } from '@playwright/test';

test.describe('Accessibility and hardening smoke', () => {
  test('profile selector exposes pressed state and trust-store errors are actionable', async ({
    page,
  }) => {
    await page.goto('/verify');

    const strict = page.getByRole('button', { name: 'strict' });
    await strict.click();
    await expect(strict).toHaveAttribute('aria-pressed', 'true');

    await page.getByLabel('Trust store JSON').fill('{"keys":[]}');
    await page.getByRole('button', { name: /demo/i }).click();

    await expect(page).toHaveURL(/\/verify$/);
    await expect(page.getByText(/INVALID_TRUST_STORE/)).toBeVisible();
    await expect(page.getByText(/trust-store JSON shaped/i)).toBeVisible();
  });

  test('keyboard activation can complete the demo verification path', async ({ page }) => {
    await page.goto('/verify');

    await page.getByRole('button', { name: /demo/i }).focus();
    await page.keyboard.press('Enter');

    await page.waitForURL('/report');
    await expect(page.getByText('VERIFIED', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Report/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('reduced-motion preference disables visible UI transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/verify');

    const duration = await page.getByRole('button', { name: /demo/i }).evaluate((node) => {
      const seconds = getComputedStyle(node)
        .transitionDuration.split(',')
        .map((value) => {
          const trimmed = value.trim();
          return trimmed.endsWith('ms')
            ? Number.parseFloat(trimmed) / 1000
            : Number.parseFloat(trimmed);
        });
      return Math.max(...seconds);
    });

    expect(duration).toBeLessThan(0.01);
  });
});
