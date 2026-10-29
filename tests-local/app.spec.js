const { test, expect } = require('@playwright/test');

test('start, speak, persist, and reopen offline without third-party services', async ({ page, context }) => {
  const pageErrors = [];
  const remoteRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  context.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:3017/')) remoteRequests.push(request.url());
  });
  await page.addInitScript(() => {
    window.testSpoken = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'English device voice', lang: 'en-US', voiceURI: 'test-local-en', default: true, localService: true }],
      speak: (utterance) => { window.testSpoken.push(utterance.text); setTimeout(() => utterance.onend?.(), 1); },
      cancel() {}, addEventListener() {}, removeEventListener() {}, onvoiceschanged: null
    } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Your words.*Your voice/  })).toBeVisible();
  await page.getByRole('button', { name: /Open my communication board/ }).click();
  await expect(page.locator('button.Tile:not(.Tile--folder)').first()).toBeVisible();
  await page.locator('button.Tile:not(.Tile--folder)').first().click();
  await expect.poll(() => page.evaluate(() => window.testSpoken.length)).toBeGreaterThan(0);
  // Rehydration must preserve the completed welcome state.
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator('button.Tile:not(.Tile--folder)').first()).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByText('Storage and backups', { exact: true })).toBeVisible();
  await expect(page.getByText('Subscribe', { exact: true })).toHaveCount(0);
  await page.getByText('Storage and backups', { exact: true }).click();
  await expect(page.getByRole('link', { name: 'Export a backup', exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.goto('/');
  await expect(page.locator('button.Tile:not(.Tile--folder)').first()).toBeVisible();
  await expect(pageErrors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});
