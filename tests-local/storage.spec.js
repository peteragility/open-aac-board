const { test, expect } = require('@playwright/test');

async function openBoard(page) {
  await page.goto('/');
  const start = page.getByRole('button', {
    name: /開啟我嘅溝通板|Open my communication board/
  });
  const water = page.locator('[data-word-id="water"]');
  await expect(start.or(water)).toBeVisible();
  if (await start.isVisible()) await start.click();
  await expect(water).toBeVisible();
}

const englishPressed = (page) =>
  page.getByRole('button', { name: 'English', exact: true });

test('a second tab does not overwrite the first, and can take over explicitly', async ({
  context
}) => {
  const first = await context.newPage();
  await openBoard(first);
  await englishPressed(first).click();
  await expect(englishPressed(first)).toHaveAttribute('aria-pressed', 'true');
  await first.waitForTimeout(500);

  const second = await context.newPage();
  await openBoard(second);
  const notice = second.locator('.local-storage-error');
  await expect(notice).toContainText('This board is open in another tab');
  // A change in the read-only tab is not saved over the first tab's workspace.
  await second.getByRole('button', { name: '廣東話', exact: true }).click();
  await second.waitForTimeout(500);
  await second.reload();
  await expect(englishPressed(second)).toHaveAttribute('aria-pressed', 'true');
  await expect(notice).toBeVisible();

  // Taking over reloads with the saved state and moves saving to this tab.
  await second.getByRole('button', { name: /Use this tab/ }).click();
  await expect(second.locator('[data-word-id="water"]')).toBeVisible();
  await expect(second.locator('.local-storage-error')).toHaveCount(0);
  await expect(first.locator('.local-storage-error')).toContainText(
    'This board is open in another tab'
  );
  await second.getByRole('button', { name: '廣東話', exact: true }).click();
  await second.waitForTimeout(500);
  await second.reload();
  await expect(
    second.getByRole('button', { name: '廣東話', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');

  // Closing the other tab is noticed; reloading lets this tab save again.
  await second.close();
  await expect(first.locator('.local-storage-error')).toContainText(
    'The other tab was closed'
  );
  await first.getByRole('button', { name: /Reload/ }).click();
  await expect(first.locator('[data-word-id="water"]')).toBeVisible();
  await expect(first.locator('.local-storage-error')).toHaveCount(0);
});

test('a failed save shows the recovery notice instead of failing silently', async ({
  page
}) => {
  await openBoard(page);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Storage is full', 'QuotaExceededError');
    };
  });
  await page.locator('[data-word-id="water"]').click();
  const notice = page.locator('.local-storage-error');
  await expect(notice).toContainText('could not save changes');
  const download = page.waitForEvent('download');
  await notice.getByRole('button', { name: /Export workspace/ }).click();
  expect((await download).suggestedFilename()).toBe(
    'open-aac-workspace-recovery.json'
  );
});

test('a saved board that cannot be read is never overwritten by an empty one', async ({
  context
}) => {
  const setup = await context.newPage();
  await openBoard(setup);
  await englishPressed(setup).click();
  await expect(englishPressed(setup)).toHaveAttribute('aria-pressed', 'true');
  await setup.waitForTimeout(500);
  await setup.close();

  const failing = await context.newPage();
  await failing.addInitScript(() => {
    IDBObjectStore.prototype.get = function () {
      throw new DOMException('Read failed', 'UnknownError');
    };
  });
  await failing.goto('/');
  await expect(failing.locator('.local-storage-error')).toContainText(
    'Nothing was overwritten'
  );
  // Interacting with the empty start screen must not replace the saved board.
  await failing.getByRole('button', { name: 'English', exact: true }).click();
  await failing.waitForTimeout(500);
  await failing.close();

  const after = await context.newPage();
  await after.goto('/');
  await expect(after.locator('[data-word-id="water"]')).toBeVisible();
  await expect(englishPressed(after)).toHaveAttribute('aria-pressed', 'true');
});
