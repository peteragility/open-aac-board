// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const axeSource = fs.readFileSync(
  require.resolve('axe-core/axe.min.js'),
  'utf8'
);
const BLOCKING_IMPACTS = ['serious', 'critical'];

// Accepted exceptions: { rule, selector, impact } with a comment saying why.
// There are none; any serious or critical violation fails the suite.
const KNOWN_VIOLATIONS = [];

const VIEWPORTS = [
  { name: 'phone', viewport: { width: 390, height: 844 } },
  { name: 'tablet', viewport: { width: 820, height: 1180 } }
];

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  // Keep the check hermetic: only the local app is reachable.
  await page.route('**/*', (route) =>
    route
      .request()
      .url()
      .startsWith(
        `http://127.0.0.1:${Number(process.env.AAC_TEST_PORT) || 3017}/`
      )
      ? route.continue()
      : route.abort()
  );
  // Init scripts run without the page's Content-Security-Policy, so axe-core
  // can be loaded from the installed package without relaxing the policy.
  await page.addInitScript({ content: axeSource });
});

async function blockingViolations(page, label) {
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      resultTypes: ['violations']
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      selectors: violation.nodes.map((node) => node.target.join(' '))
    }));
  });
  const problems = [];
  for (const violation of violations) {
    if (!BLOCKING_IMPACTS.includes(violation.impact)) continue;
    for (const selector of violation.selectors) {
      const known = KNOWN_VIOLATIONS.some(
        (entry) => entry.rule === violation.id && entry.selector === selector
      );
      if (!known)
        problems.push(
          `${label}: ${violation.impact} ${violation.id} at ${selector}`
        );
    }
  }
  return problems;
}

async function openEnglishBoard(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page
    .getByRole('button', { name: /Open my communication board/ })
    .click();
  await expect(page.locator('[data-word-id="water"]')).toBeVisible();
}

for (const { name, viewport } of VIEWPORTS) {
  test.describe(`${name} accessibility`, () => {
    test.use({ viewport });

    test('Cantonese word board, the default view, has no serious or critical violations', async ({
      page
    }) => {
      await page.goto('/');
      await page.getByRole('button', { name: '開啟我嘅溝通板' }).click();
      await expect(page.locator('[data-word-id="water"]')).toBeVisible();
      expect(await blockingViolations(page, 'Cantonese word board')).toEqual(
        []
      );
    });

    test('English word board has no serious or critical violations', async ({
      page
    }) => {
      await openEnglishBoard(page);
      expect(await blockingViolations(page, 'English word board')).toEqual([]);
    });

    test('quick responses dialog has no serious or critical violations', async ({
      page
    }) => {
      await openEnglishBoard(page);
      await page
        .getByRole('button', { name: 'Reply: Quick responses', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await blockingViolations(page, 'quick responses')).toEqual([]);
    });

    test('picture groups have no serious or critical violations', async ({
      page
    }) => {
      await openEnglishBoard(page);
      await page
        .getByRole('button', { name: 'Browse pictures', exact: true })
        .click();
      await expect(page.locator('.aac-picture-folder')).toHaveCount(8);
      expect(await blockingViolations(page, 'pictures')).toEqual([]);
    });

    test('preferences dialog has no serious or critical violations', async ({
      page
    }) => {
      await openEnglishBoard(page);
      await page
        .getByRole('button', { name: 'Preferences', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await blockingViolations(page, 'preferences')).toEqual([]);
    });
  });
}
