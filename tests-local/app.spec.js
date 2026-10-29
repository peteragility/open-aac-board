const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

test('start, speak, persist, and reopen offline without third-party services', async ({
  page,
  context
}) => {
  const pageErrors = [];
  const remoteRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  context.on('request', (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request.url().startsWith('http://127.0.0.1:3017/')
    )
      remoteRequests.push(request.url());
  });
  await page.addInitScript(() => {
    window.testSpoken = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [
          {
            name: 'English device voice',
            lang: 'en-US',
            voiceURI: 'test-local-en',
            default: true,
            localService: true
          }
        ],
        speak: (utterance) => {
          window.testSpoken.push(utterance.text);
          setTimeout(() => utterance.onend?.(), 1);
        },
        cancel() {},
        addEventListener() {},
        removeEventListener() {},
        onvoiceschanged: null
      }
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /Your words.*Your voice/ })
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Open my communication board/ })
    .click();
  await page.goto('/boards');
  await expect(
    page.locator('button.Tile:not(.Tile--folder)').first()
  ).toBeVisible();
  await page.locator('button.Tile:not(.Tile--folder)').first().click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.length))
    .toBeGreaterThan(0);
  // Rehydration must preserve the completed welcome state.
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(
    page.locator('button.Tile:not(.Tile--folder)').first()
  ).toBeVisible();
  await page.goto('/settings');
  await expect(
    page.getByText('Storage and backups', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('Subscribe', { exact: true })).toHaveCount(0);
  await page.getByText('Storage and backups', { exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Export a backup', exact: true })
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.goto('/boards');
  await expect(
    page.locator('button.Tile:not(.Tile--folder)').first()
  ).toBeVisible();
  await expect(pageErrors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test('restore an embedded recording and export a matching backup', async ({
  page
}) => {
  // A valid silent WAV makes the JSON larger than the legacy 4 MB quota gate.
  const wav = Buffer.alloc(3200044);
  wav.write('RIFF');
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  const recording = 'data:audio/wav;base64,' + wav.toString('base64');
  const backup = [
    {
      id: 'backup-fixture',
      name: 'Backup check',
      locale: 'en-GB',
      tiles: [
        {
          id: 'backup-tile',
          label: 'Hello backup',
          sound: recording,
          image: 'symbols/mulberry/yes.svg'
        }
      ]
    }
  ];
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page
    .getByRole('button', { name: /Open my communication board/ })
    .click();
  await page.goto('/settings/import');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });
  await expect(page.getByText(/imported successfully/i)).toBeVisible();
  await page.goto('/settings/export');
  await page.locator('#export-all-select').click();
  await page.getByRole('option', { name: 'Cboard', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export', exact: true })
    .last()
    .click();
  const downloaded = await downloadPromise;
  const exported = JSON.parse(
    await fs.readFile(await downloaded.path(), 'utf8')
  );
  const restored = exported.find((board) => board.name === 'Backup check');
  expect(restored.tiles[0]).toMatchObject({
    label: 'Hello backup',
    image: 'symbols/mulberry/yes.svg'
  });
  expect(restored.tiles[0].sound === recording).toBe(true);
});
