const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

async function installVoices(page, cantonese = true) {
  await page.addInitScript(
    ({ cantonese }) => {
      window.testSpoken = [];
      window.testAudio = [];
      window.testAudioEnded = [];
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
        }
      };
      const voices = [
        {
          name: 'Mandarin local',
          lang: 'zh-CN',
          voiceURI: 'test-cmn',
          localService: true
        },
        {
          name: 'English local',
          lang: 'en-GB',
          voiceURI: 'test-en',
          localService: true
        },
        ...(cantonese
          ? [
              {
                name: 'Cantonese local',
                lang: 'zh-HK',
                voiceURI: 'test-yue',
                localService: true
              }
            ]
          : [])
      ];
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => voices,
          onvoiceschanged: null,
          speak: (u) => {
            window.testSpoken.push({
              text: u.text,
              lang: u.lang,
              voice: u.voice?.voiceURI
            });
            setTimeout(() => u.onend?.(), 5);
          },
          cancel() {},
          addEventListener() {},
          removeEventListener() {}
        }
      });
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        window.testAudio.push(this.src);
        this.addEventListener(
          'ended',
          () => window.testAudioEnded.push(this.src),
          { once: true }
        );
        return play.call(this);
      };
    },
    { cantonese }
  );
}
async function open(page, language = 'yue') {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: '開啟我嘅溝通板' })
  ).toBeVisible();
  if (language === 'en')
    await page.getByRole('button', { name: 'English', exact: true }).click();
  await page
    .getByRole('button', { name: /開啟我嘅溝通板|Open my communication board/ })
    .click();
  await expect(page.locator('[data-word-id="water"]')).toBeVisible();
}

test('Cantonese works with real included MP3 playback when only Mandarin and English voices exist, including offline', async ({
  page,
  context
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installVoices(page, false);
  await open(page);
  await expect(
    page.getByRole('button', { name: '廣東話', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-word-id="water"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudioEnded.some((url) =>
          url.endsWith('/audio/yue/water.mp3')
        )
      )
    )
    .toBe(true);
  expect(await page.evaluate(() => window.testSpoken.length)).toBe(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator('[data-word-id="water"]')).toBeVisible();
  await context.setOffline(true);
  await page.goto('/');
  await page.locator('[data-word-id="water"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudioEnded.some((url) =>
          url.endsWith('/audio/yue/water.mp3')
        )
      )
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test('sentence building speaks Cantonese, English and Mandarin distinctly and persists the choice', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  for (const id of ['i', 'want', 'drink', 'water'])
    await page.locator(`[data-word-id="${id}"]`).click();
  await page.getByRole('button', { name: '講出嚟', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({ text: '我想飲水', voice: 'test-yue', lang: 'zh-HK' });
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Speak', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({
      text: 'I want drink water',
      voice: 'test-en',
      lang: 'en-GB'
    });
  await page.getByRole('button', { name: '普通话', exact: true }).click();
  await page.getByRole('button', { name: '说出来', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({ text: '我想喝水', voice: 'test-cmn', lang: 'zh-CN' });
  await page.waitForTimeout(500);
  await page.reload();
  await expect(
    page.getByRole('button', { name: '普通话', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
});

test('personal pictures and microphone recordings survive workspace export and restore', async ({
  page,
  context
}) => {
  await installVoices(page);
  await context.grantPermissions(['microphone']);
  await open(page, 'en');
  await page.getByRole('button', { name: 'Personalize words' }).click();
  await page.locator('[data-word-id="water"]').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('廣東話', { exact: true }).fill('暖水');
  await dialog.getByLabel('English', { exact: true }).fill('warm water');
  await dialog.getByLabel('普通话', { exact: true }).fill('温水');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'water.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNd8AAAAASUVORK5CYII=',
      'base64'
    )
  });
  await dialog
    .getByRole('button', { name: 'Record your voice', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Stop recording', exact: true })
  ).toBeEnabled();
  await page.waitForTimeout(800);
  await dialog
    .getByRole('button', { name: 'Stop recording', exact: true })
    .click();
  await expect(
    dialog.getByText('Your recording is ready for this language.', {
      exact: true
    })
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export workspace backup' }).click();
  const downloaded = await downloadPromise;
  const body = await fs.readFile(await downloaded.path(), 'utf8');
  const backup = JSON.parse(body);
  expect(backup.workspace.overrides.water.en).toBe('warm water');
  expect(backup.workspace.overrides.water.image).toMatch(/^data:image\/png/);
  expect(backup.workspace.overrides.water.recordings.en).toMatch(
    /^data:audio\//
  );
  await page
    .getByRole('dialog')
    .locator('input[type="file"]')
    .setInputFiles({
      name: 'workspace.json',
      mimeType: 'application/json',
      buffer: Buffer.from(body)
    });
  await expect(
    page.getByText('Restoring replaces this workspace. Export a backup first.')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Restore now', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator('[data-word-id="water"]')).toContainText(
    'warm water'
  );
  await page.locator('[data-word-id="water"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudio.some((url) => url.startsWith('data:audio/'))
      )
    )
    .toBe(true);
});

test('quick phrases, saved typing, partner view, daily routine and switch scanning work', async ({
  page
}) => {
  await installVoices(page);
  await open(page, 'en');
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Please help me.', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)?.text))
    .toBe('Please help me.');
  await page
    .getByRole('button', { name: 'Type to speak', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Type to speak', exact: true })
    .fill('I need a quiet room.');
  await page.getByRole('button', { name: 'Save phrase', exact: true }).click();
  await page
    .getByRole('button', { name: 'Show my message', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('I need a quiet room.');
  await page.getByRole('button', { name: 'Rotate for partner' }).click();
  await expect(page.locator('.aac-partner-message')).toHaveClass(/is-rotated/);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  await page.getByRole('button', { name: 'My phrases', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'I need a quiet room.', exact: true })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Daily routine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Mark step done: brush teeth', exact: true })
    .click();
  await expect(page.locator('.aac-routine-step.is-current')).toContainText(
    'eat'
  );
  await page.getByRole('button', { name: '1 min', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Word board', exact: true }).click();
  await page
    .getByRole('button', { name: 'Daily routine', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Word board', exact: true }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page
    .getByRole('button', { name: 'Start picture scanning', exact: true })
    .click();
  await expect(page.locator('.aac-word-grid')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.aac-message')).toContainText('I');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Start picture scanning', exact: true })
  ).toBeVisible();
});

test('phone and iPad portrait/landscape retain core word positions without horizontal overflow', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  const ids = await page
    .locator('[data-word-id]')
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.wordId));
  for (const [width, height, columns] of [
    [390, 844, 3],
    [844, 390, 6],
    [768, 1024, 4],
    [1024, 768, 4],
    [1366, 1024, 6]
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    expect(
      await page
        .locator('.aac-word-grid')
        .evaluate(
          (n) => getComputedStyle(n).gridTemplateColumns.split(' ').length
        )
    ).toBe(columns);
    expect(
      await page
        .locator('[data-word-id]')
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.wordId))
    ).toEqual(ids);
    const first = await page.locator('[data-word-id="i"]').boundingBox();
    expect(first.width).toBeGreaterThanOrEqual(90);
    expect(first.height).toBeGreaterThanOrEqual(110);
  }
});
