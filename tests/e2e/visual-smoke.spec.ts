import { expect, test } from '@playwright/test';

async function expectNoOversizedChromeSvg(page: import('@playwright/test').Page) {
  const oversized = await page.locator('aside svg, nav svg, main button svg').evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const box = node.getBoundingClientRect();
        return { width: box.width, height: box.height };
      })
      .filter((box) => box.width > 96 || box.height > 96),
  );
  expect(oversized).toEqual([]);
}

async function hideDevChrome(page: import('@playwright/test').Page) {
  await page.addStyleTag({
    content:
      '[data-nextjs-dev-tools-button], [aria-label="Open Next.js Dev Tools"] { display: none !important; opacity: 0 !important; pointer-events: none !important; }',
  });
}

async function expectSettledNav(page: import('@playwright/test').Page, label: string) {
  await expect(page.getByRole('link', { name: new RegExp(label, 'i') })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.waitForTimeout(250);
}

test.describe('Visual smoke', () => {
  test('verify first viewport is styled and bounded on desktop and mobile', async ({
    page,
  }, testInfo) => {
    await page.goto('/verify');
    await hideDevChrome(page);
    await expect(page.getByRole('heading', { name: /verify the run/i })).toBeVisible();
    await expect(page.getByText(/Drop a/)).toBeVisible();
    await expectNoOversizedChromeSvg(page);
    await page.screenshot({ path: testInfo.outputPath('verify-desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/verify');
    await hideDevChrome(page);
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByText(/Drop a/)).toBeVisible();
    await expectNoOversizedChromeSvg(page);
    await page.screenshot({ path: testInfo.outputPath('verify-mobile.png'), fullPage: true });
  });

  test('captures the loaded evidence workflow surfaces', async ({ page }, testInfo) => {
    await page.goto('/verify');
    await hideDevChrome(page);
    await page.getByRole('button', { name: /demo/i }).click();
    await page.waitForURL('/report');
    await expect(page.getByText('VERIFIED', { exact: true })).toBeVisible();
    await expect(page.getByText('6/6')).toBeVisible();
    await expectSettledNav(page, 'Report');
    await expectNoOversizedChromeSvg(page);
    await page.screenshot({ path: testInfo.outputPath('report.png'), fullPage: true });

    for (const route of ['Timeline', 'Proofs', 'Policy', 'Disclosure', 'Export']) {
      await page.getByRole('link', { name: new RegExp(route, 'i') }).click();
      await page.waitForURL(`/${route.toLowerCase()}`);
      await expectSettledNav(page, route);
      await expectNoOversizedChromeSvg(page);
      await page.screenshot({
        path: testInfo.outputPath(`${route.toLowerCase()}.png`),
        fullPage: true,
      });
    }
  });
});
