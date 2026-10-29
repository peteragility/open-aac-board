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
  await expect(page.locator('.aac-offline-status')).toContainText('可離線使用');
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

test('compact phone and tablet boards show more words and keep speech controls clear of the grid', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  for (const [width, height, minimumWords] of [
    [390, 844, 6],
    [1024, 768, 8]
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator('.aac-scroll-area').evaluate((el) => {
      el.scrollTop = 0;
    });
    const layout = await page.evaluate(() => {
      const scroll = document
        .querySelector('.aac-scroll-area')
        .getBoundingClientRect();
      const composer = document
        .querySelector('.aac-composer')
        .getBoundingClientRect();
      return {
        words: [...document.querySelectorAll('.aac-word')].filter((el) => {
          const box = el.getBoundingClientRect();
          return box.top >= scroll.top && box.bottom <= scroll.bottom;
        }).length,
        noOverlap: composer.bottom <= scroll.top,
        controls: [
          ...document.querySelectorAll(
            '.aac-language-picker button, .aac-composer button, .aac-readiness-bar button'
          )
        ].map((el) => {
          const box = el.getBoundingClientRect();
          return { width: box.width, height: box.height };
        })
      };
    });
    expect(layout.words).toBeGreaterThanOrEqual(minimumWords);
    expect(layout.noOverlap).toBe(true);
    for (const control of layout.controls) {
      expect(control.width).toBeGreaterThanOrEqual(44);
      expect(control.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('.aac-offline-status')).toBeVisible();
    await page.locator('.aac-scroll-area').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const bottom = await page.locator('.aac-composer').boundingBox();
    const area = await page.locator('.aac-scroll-area').boundingBox();
    expect(bottom.y + bottom.height).toBeLessThanOrEqual(area.y);
  }
});

test('tabs have independent scroll positions and tapping the active tab returns to the top', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installVoices(page);
  await open(page, 'en');
  const scroll = page.locator('.aac-scroll-area');
  await scroll.evaluate((el) => {
    el.scrollTop = 250;
  });
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  expect(await scroll.evaluate((el) => el.scrollTop)).toBe(0);
  await scroll.evaluate((el) => {
    el.scrollTop = 120;
  });
  await page.getByRole('button', { name: 'Word board', exact: true }).click();
  expect(await scroll.evaluate((el) => el.scrollTop)).toBe(250);
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  expect(await scroll.evaluate((el) => el.scrollTop)).toBe(120);
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  expect(await scroll.evaluate((el) => el.scrollTop)).toBe(0);
});

test('speech and navigation stay in reach with reduced typing height and landscape', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 420 });
  await installVoices(page);
  await open(page, 'en');
  await page
    .getByRole('button', { name: 'Type to speak', exact: true })
    .click();
  for (const selector of ['.aac-type-input', '.aac-speak', '.aac-mobile-nav']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(420);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Word board', exact: true }).click();
  await page.locator('.aac-word').last().scrollIntoViewIfNeeded();
  const lastWord = await page.locator('.aac-word').last().boundingBox();
  const area = await page.locator('.aac-scroll-area').boundingBox();
  expect(lastWord.y).toBeGreaterThanOrEqual(area.y);
  expect(lastWord.y + lastWord.height).toBeLessThanOrEqual(
    area.y + area.height
  );
});

test('Undo restores words, typed messages and phrases without speaking or losing another draft', async ({
  page
}) => {
  await installVoices(page);
  await open(page, 'en');
  await page.locator('[data-word-id="water"]').click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  const spoken = await page.evaluate(() => window.testSpoken.length);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.aac-message')).toContainText('water');
  expect(await page.evaluate(() => window.testSpoken.length)).toBe(spoken);
  await page
    .getByRole('button', { name: 'Type to speak', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Type to speak', exact: true })
    .fill('Please give me time.');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Type to speak', exact: true })
  ).toHaveValue('Please give me time.');
  await page.getByRole('button', { name: 'Word board', exact: true }).click();
  await expect(page.locator('.aac-message')).toContainText('water');
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Please help me.', exact: true })
    .click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.aac-message')).toContainText('Please help me.');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: '廣東話', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '復原', exact: true })
  ).toHaveCount(0);
});

test('Cantonese voice check requires playback and user confirmation, and remembers it', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  const check = page.locator('.aac-readiness-voice');
  await expect(check).toContainText('試吓聲音');
  await check.click();
  await expect(
    page.getByRole('button', { name: '聽到，語言正確', exact: true })
  ).toBeDisabled();
  await page.getByRole('button', { name: '試聽語音', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)?.voice))
    .toBe('test-yue');
  await page
    .getByRole('button', { name: '聽到，語言正確', exact: true })
    .click();
  await expect(check).toContainText('試聽');
  await page.waitForTimeout(500);
  await page.reload();
  await expect(check).toContainText('試聽');
  await check.click();
  await page
    .getByRole('button', { name: '聽唔到／語言唔啱', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('先調高媒體音量');
  await page
    .getByRole('button', { name: '遲啲再試，繼續用', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(check).toContainText('Check voice');
});

test('offline status distinguishes download, lost connection, failure and a completed cache', async ({
  page
}) => {
  await page.addInitScript(() => {
    let online = true;
    let ready;
    const registration = {
      active: null,
      installing: { state: 'installing' },
      update: async () => {
        registration.installing = { state: 'installing' };
      }
    };
    const worker = Object.assign(new EventTarget(), {
      ready: new Promise((resolve) => {
        ready = resolve;
      }),
      getRegistration: async () => registration,
      register: async () => registration
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: worker
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => online
    });
    window.changeOfflineFixture = (state) => {
      online = state !== 'paused';
      if (state === 'unavailable') {
        registration.installing = null;
        window.dispatchEvent(new Event('aac-offline-error'));
      } else if (state === 'ready') {
        registration.active = { state: 'activated' };
        registration.installing = null;
        ready(registration);
        worker.dispatchEvent(new Event('controllerchange'));
      }
      window.dispatchEvent(new Event(online ? 'online' : 'offline'));
    };
  });
  await installVoices(page);
  await open(page);
  const status = page.locator('.aac-offline-status');
  await expect(status).toContainText('下載中');
  await page.evaluate(() => window.changeOfflineFixture('paused'));
  await expect(status).toContainText('連線後再下載');
  await page.evaluate(() => window.changeOfflineFixture('unavailable'));
  await expect(status).toContainText('離線未準備好');
  await status.getByRole('button').click();
  await expect(page.getByRole('dialog')).toContainText('85 MB');
  await page.getByRole('button', { name: '重新檢查', exact: true }).click();
  await expect(status).toContainText('下載中');
  await page.evaluate(() => window.changeOfflineFixture('ready'));
  await expect(status).toContainText('可離線使用');
  await expect(page.getByRole('dialog')).toContainText(
    '圖卡同內置錄音已下載完成'
  );
});
