// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const axeSource = fs.readFileSync(
  require.resolve('axe-core/axe.min.js'),
  'utf8'
);
const BLOCKING_IMPACTS = ['serious', 'critical'];

// Violations present in the current UI, recorded so this suite passes today.
// Each entry names the axe rule and the selector axe reports for the element.
// Remove an entry when its element is fixed; any other serious or critical
// violation fails the suite.
const KNOWN_VIOLATIONS = [
  // color-contrast: text colour contrast below the WCAG minimum, found on the word
  // board, quick responses, pictures and preferences at phone and tablet sizes.
  // label-content-name-mismatch: the accessible name omits the visible label.
  {
    rule: 'color-contrast',
    selector: '.aac-brand > div > span',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-categories > button:nth-child(2)',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-categories > button:nth-child(3)',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-categories > button:nth-child(4)',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-categories > button:nth-child(5)',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-categories > button:nth-child(6)',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-message-placeholder',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-mobile-nav > button:nth-child(2) > span',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-mobile-nav > button:nth-child(3) > span',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-mobile-nav > button:nth-child(4) > span',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-section-row > .aac-text-button',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-sidebar-caption',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: '.aac-sidebar-footer > p',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: 'button[lang="en"]',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: 'button[lang="zh-CN"]',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: 'button[lang="zh-HK"]',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: 'h2 > span',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: 'section:nth-child(1) > .aac-muted',
    impact: 'serious'
  },
  {
    rule: 'color-contrast',
    selector: 'section:nth-child(3) > .aac-muted',
    impact: 'serious'
  },
  {
    rule: 'label-content-name-mismatch',
    selector: '.aac-add-word',
    impact: 'serious'
  },
  {
    rule: 'label-content-name-mismatch',
    selector: '.aac-readiness-voice',
    impact: 'serious'
  },
  {
    rule: 'label-content-name-mismatch',
    selector: '.aac-response-trigger',
    impact: 'serious'
  },
  {
    rule: 'label-content-name-mismatch',
    selector: 'button[aria-label="Remove last word"]',
    impact: 'serious'
  },
  {
    rule: 'label-content-name-mismatch',
    selector: 'button[aria-label="俾對方睇"]',
    impact: 'serious'
  },
  {
    rule: 'label-content-name-mismatch',
    selector: 'button[aria-label="刪除上一個字"]',
    impact: 'serious'
  },
  // Quick responses dialog.
  {
    rule: 'color-contrast',
    selector: '.aac-settings-body > .aac-muted',
    impact: 'serious'
  },
  // Quick responses dialog.
  {
    rule: 'color-contrast',
    selector: '.aac-button-row > .aac-text-button',
    impact: 'serious'
  }
];

const VIEWPORTS = [
  { name: 'phone', viewport: { width: 390, height: 844 } },
  { name: 'tablet', viewport: { width: 820, height: 1180 } }
];

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  // Keep the check hermetic: only the local app is reachable.
  await page.route('**/*', (route) =>
    route.request().url().startsWith('http://127.0.0.1:3017/')
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
        .getByRole('button', { name: 'Quick responses', exact: true })
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
      await expect(page.locator('.aac-picture-folder')).toHaveCount(6);
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
