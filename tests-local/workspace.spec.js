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

async function openTool(page, name) {
  await page.getByRole('button', { name: /^(Tools|工具)$/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name, exact: true })
    .click();
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
  await openTool(page, 'Personalize words');
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
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Keep scanning on the toolbar' })
    .check();
  await page
    .getByRole('dialog')
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
  await expect(page.getByRole('dialog')).toContainText('90 MB');
  await page.getByRole('button', { name: '重新檢查', exact: true }).click();
  await expect(status).toContainText('下載中');
  await page.evaluate(() => window.changeOfflineFixture('ready'));
  await expect(status).toContainText('可離線使用');
  await expect(page.getByRole('dialog')).toContainText(
    '圖卡同內置錄音已下載完成'
  );
});

test('a Cantonese-only personal word and its saved picture message retain photo and recording through editing, deletion, backup and offline relaunch', async ({
  page,
  context
}) => {
  await installVoices(page, false);
  await context.grantPermissions(['microphone']);
  await open(page);
  const originalIds = await page
    .locator('[data-word-id]')
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.wordId));
  await page.getByRole('button', { name: '新增字詞', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'nurse.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNd8AAAAASUVORK5CYII=',
      'base64'
    )
  });
  await expect(dialog.locator('.aac-editor-preview img')).toHaveAttribute(
    'src',
    /^data:image\/png/
  );
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: '下一步', exact: true })
  ).toBeDisabled();
  await dialog
    .getByRole('textbox', { name: '廣東話', exact: true })
    .fill('陳姑娘');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog
    .getByRole('button', { name: '錄低自己嘅聲音', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: '停止錄音', exact: true })
  ).toBeEnabled();
  await page.waitForTimeout(700);
  await dialog.getByRole('button', { name: '停止錄音', exact: true }).click();
  await expect(
    dialog.getByText('已加入呢種語言嘅個人錄音。', { exact: true })
  ).toBeVisible();
  await dialog.getByRole('button', { name: '儲存', exact: true }).click();
  const personal = page.locator('[data-word-id^="custom-"]');
  await expect(personal).toHaveCount(1);
  const wordId = await personal.getAttribute('data-word-id');
  await expect(personal).toContainText('陳姑娘');
  await openTool(page, '修改圖卡');
  await personal.click();
  await expect(dialog.locator('.aac-editor-preview img')).toHaveAttribute(
    'src',
    /^data:image\/png/
  );
  await expect(dialog.locator('audio')).toHaveAttribute('src', /^data:audio\//);
  await dialog
    .getByRole('textbox', { name: 'English', exact: true })
    .fill('Nurse Chan');
  await dialog.getByRole('button', { name: '儲存', exact: true }).click();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await personal.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudio.some((url) => url.startsWith('data:audio/'))
      )
    )
    .toBe(true);
  await page.getByRole('button', { name: '儲存句子', exact: true }).click();
  await page.getByRole('button', { name: '普通话', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '说出来', exact: true })
  ).toBeDisabled();
  await page.getByRole('button', { name: '廣東話', exact: true }).click();
  await openTool(page, '修改圖卡');
  await personal.click();
  await dialog
    .getByRole('button', { name: '刪除個人字詞', exact: true })
    .click();
  await expect(
    dialog.getByText(/之前儲存嘅圖片句子同錄音仍然保留/)
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: '刪除個人字詞', exact: true })
    .click();
  await expect(page.locator(`[data-word-id="${wordId}"]`)).toHaveCount(0);
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.getByRole('button', { name: '常用字詞', exact: true }).click();
  expect(
    await page
      .locator('[data-word-id]')
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.wordId))
  ).toEqual(originalIds);
  await page.getByRole('button', { name: '偏好設定', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await dialog
    .getByRole('button', { name: '匯出工作區備份', exact: true })
    .click();
  const downloaded = await downloadPromise;
  const body = await fs.readFile(await downloaded.path(), 'utf8');
  const backup = JSON.parse(body);
  expect(backup.version).toBe(2);
  expect(backup.workspace.customWords).toEqual([]);
  expect(backup.workspace.phrases[0].segments[0]).toMatchObject({
    text: '陳姑娘',
    image: expect.stringMatching(/^data:image/),
    recording: expect.stringMatching(/^data:audio/)
  });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'workspace.json',
    mimeType: 'application/json',
    buffer: Buffer.from(body)
  });
  await dialog.getByRole('button', { name: '確認還原', exact: true }).click();
  await dialog.getByRole('button', { name: '關閉', exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForTimeout(600);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '常用句子', exact: true }).click();
  await page.getByRole('button', { name: '我嘅句子', exact: true }).click();
  const saved = page.locator('.aac-phrase-card').filter({ hasText: '陳姑娘' });
  await expect(saved.locator('img')).toHaveAttribute('src', /^data:image/);
  await saved.getByRole('button', { name: '陳姑娘', exact: true }).click();
  await expect(page.locator('.aac-message-word img')).toHaveAttribute(
    'src',
    /^data:image/
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudioEnded.some((url) => url.startsWith('data:audio/'))
      )
    )
    .toBe(true);
  expect(await page.evaluate(() => window.testSpoken)).toEqual([]);
});

test('quick responses preserve board and typing drafts, work from routines and remember the chosen phrases', async ({
  page
}) => {
  await installVoices(page);
  await open(page, 'en');
  await page.locator('[data-word-id="water"]').click();
  await page
    .getByRole('button', { name: 'Quick responses', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Please wait while I speak.', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)?.text))
    .toBe('Please wait while I speak.');
  await dialog
    .getByRole('button', { name: 'Back to my message', exact: true })
    .click();
  await expect(page.locator('.aac-message')).toContainText('water');
  await page
    .getByRole('button', { name: 'Type to speak', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Type to speak', exact: true })
    .fill('I have another question.');
  await page
    .getByRole('button', { name: 'Quick responses', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'No thanks.', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Choose quick responses', exact: true })
    .click();
  await dialog
    .getByRole('checkbox', { name: 'No thanks.', exact: true })
    .uncheck();
  await dialog.getByRole('checkbox', { name: 'Hello!', exact: true }).check();
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Hello!', exact: true })
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Back to my message', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Type to speak', exact: true })
  ).toHaveValue('I have another question.');
  await page
    .getByRole('button', { name: 'Daily routine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Quick responses', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Hello!', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)?.text))
    .toBe('Hello!');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForTimeout(500);
  await page.reload();
  await page
    .getByRole('button', { name: 'Quick responses', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Hello!', exact: true })
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'No thanks.', exact: true })
  ).toHaveCount(0);
});

test('personal words can skip photos and recordings, require only the current label, and missing translations never speak in the wrong language', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  await page.getByRole('button', { name: '新增字詞', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog
    .getByRole('textbox', { name: '廣東話', exact: true })
    .fill('我隻貓');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog.getByRole('button', { name: '儲存', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const personal = page.locator('[data-word-id^="custom-"]');
  await expect(personal).toContainText('Translation needed');
  await personal.click();
  expect(await page.evaluate(() => window.testSpoken)).toEqual([]);
  await expect(page.locator('.aac-notice')).toContainText(
    'no label in this language'
  );
  await page
    .locator('.aac-notice')
    .getByRole('button', { name: 'Personalize words', exact: true })
    .click();
  await dialog
    .getByRole('textbox', { name: 'English', exact: true })
    .fill('My cat');
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await personal.click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({ text: 'My cat', voice: 'test-en' });
  await page.getByRole('button', { name: '廣東話', exact: true }).click();
  await expect(personal).toContainText('我隻貓');
  await page.getByRole('button', { name: '講出嚟', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({ text: '我隻貓', voice: 'test-yue' });
});

test('routine words with missing translations never use another language voice and can be translated directly', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installVoices(page);
  await open(page);
  await page.getByRole('button', { name: '新增字詞', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog
    .getByRole('textbox', { name: '廣東話', exact: true })
    .fill('唔該幫我手');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog.getByRole('button', { name: '儲存', exact: true }).click();
  await page.getByRole('button', { name: '今日流程', exact: true }).click();
  await page.getByRole('button', { name: '修改流程', exact: true }).click();
  await dialog.getByRole('button', { name: '唔該幫我手', exact: true }).click();
  await dialog.getByRole('button', { name: '儲存', exact: true }).click();
  await page.getByRole('button', { name: '普通话', exact: true }).click();
  const before = await page.evaluate(() => ({
    spoken: window.testSpoken.length,
    audio: window.testAudio.length
  }));
  await page
    .locator('.aac-routine-picture')
    .filter({ hasText: '唔該幫我手' })
    .click();
  await expect(page.locator('.aac-notice')).toContainText('添加翻译');
  expect(
    await page.evaluate(() => ({
      spoken: window.testSpoken.length,
      audio: window.testAudio.length
    }))
  ).toEqual(before);
  await expect(
    page.locator('.aac-routine-picture .aac-missing-label')
  ).toHaveText('尚无翻译');
  await page
    .locator('.aac-notice')
    .getByRole('button', { name: '修改图卡', exact: true })
    .click();
  await dialog
    .getByRole('textbox', { name: '普通话', exact: true })
    .fill('请帮我');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await page
    .locator('.aac-routine-picture')
    .filter({ hasText: '请帮我' })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({ text: '请帮我', voice: 'test-cmn' });
  await page.getByRole('button', { name: '廣東話', exact: true }).click();
  await page
    .locator('.aac-routine-picture')
    .filter({ hasText: '唔該幫我手' })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({ text: '唔該幫我手', voice: 'test-yue' });
});

test('picture, saved-phrase and typing drafts resume after reload without speaking, including offline', async ({
  page,
  context
}) => {
  await installVoices(page);
  await open(page, 'en');
  for (const id of ['i', 'want', 'water'])
    await page.locator(`[data-word-id="${id}"]`).click();
  await page
    .getByRole('button', { name: 'Type to speak', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Type to speak' })
    .fill('Please give me a little time.');
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        return Boolean(
          (await navigator.serviceWorker.getRegistration())?.active
        );
      })
    )
    .toBe(true);
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.locator('.aac-main')).toBeVisible();
  expect(
    await page.evaluate(
      () => window.testSpoken.length + window.testAudio.length
    )
  ).toBe(0);
  await page.getByRole('button', { name: 'Word board', exact: true }).click();
  await expect(page.locator('.aac-message-word')).toHaveText([
    'I',
    'want',
    'water'
  ]);
  await expect(page.locator('.aac-message-word')).toHaveCount(3);
  await page
    .getByRole('button', { name: 'Type to speak', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Type to speak' })
  ).toHaveValue('Please give me a little time.');
  await page.waitForTimeout(350);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Type to speak' })
  ).toHaveValue('Please give me a little time.');
  expect(
    await page.evaluate(
      () => window.testSpoken.length + window.testAudio.length
    )
  ).toBe(0);
  await context.setOffline(false);
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Please help me.', exact: true })
    .click();
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.locator('.aac-message')).toContainText('Please help me.');
  expect(
    await page.evaluate(
      () => window.testSpoken.length + window.testAudio.length
    )
  ).toBe(0);
});

test('Undo deletion restores saved picture messages with their original order and survives relaunch', async ({
  page
}) => {
  await installVoices(page);
  await open(page, 'en');
  await page.locator('[data-word-id="water"]').click();
  await page.getByRole('button', { name: 'Save phrase', exact: true }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.locator('[data-word-id="help"]').click();
  await page.getByRole('button', { name: 'Save phrase', exact: true }).click();
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .click();
  await page.getByRole('button', { name: 'My phrases', exact: true }).click();
  const messages = page.locator('.aac-phrase-card > button:first-child');
  const before = await messages.allTextContents();
  expect(before).toHaveLength(2);
  await page
    .getByRole('button', { name: 'Delete: water', exact: true })
    .click();
  await expect(messages).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Undo deletion', exact: true })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Undo deletion', exact: true })
    .click();
  await expect(messages).toHaveCount(2);
  expect(await messages.allTextContents()).toEqual(before);
  await expect(messages.first().locator('img')).toHaveCount(1);
  await messages.first().click();
  await expect(page.locator('.aac-message-word img')).toHaveCount(1);
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.locator('.aac-message-word img')).toHaveCount(1);
  await page.getByRole('button', { name: 'My phrases', exact: true }).click();
  expect(await messages.allTextContents()).toEqual(before);
});

test('optional quick guide checks actual playback, keeps drafts intact and opens personal word creation', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installVoices(page);
  await page.goto('/');
  await page.getByRole('button', { name: '快速入門', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: '聽到，語言正確', exact: true })
  ).toBeDisabled();
  await dialog.getByRole('button', { name: '試聽語音', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: '聽到，語言正確', exact: true })
  ).toBeEnabled();
  await dialog
    .getByRole('button', { name: '聽到，語言正確', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: '已確認聲音', exact: true })
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: '跳過，繼續用', exact: true })
    .click();
  await page.locator('[data-word-id="water"]').click();
  await openTool(page, '快速入門');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  for (const label of ['我', '想', '水'])
    await dialog.getByRole('button', { name: label, exact: true }).click();
  await expect(dialog.locator('.aac-guide-message')).toHaveText('我想水');
  await dialog.getByRole('button', { name: '講出嚟', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({ text: '我想水', voice: 'test-yue' });
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog.getByRole('button', { name: '新增字詞', exact: true }).click();
  await expect(dialog.locator('.aac-editor-steps')).toBeVisible();
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('.aac-message')).toContainText('水');
  await expect(page.locator('.aac-message-word')).toHaveCount(1);
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.locator('.aac-message')).toContainText('水');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '偏好設定', exact: true }).click();
  await dialog.getByRole('button', { name: '快速入門', exact: true }).click();
  await expect(
    dialog.getByRole('heading', { name: '快速入門', exact: true })
  ).toBeVisible();
  await dialog.getByRole('button', { name: '關閉', exact: true }).click();
});

test('labelled mobile tools, personal category and all guide steps fit short screens through laptops', async ({
  page
}) => {
  await installVoices(page);
  await open(page, 'en');
  for (const [width, height] of [
    [320, 568],
    [390, 420],
    [667, 375],
    [820, 1180],
    [1024, 768],
    [1366, 768]
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator('.aac-categories').evaluate((el) => {
      el.scrollLeft = 0;
    });
    for (const name of [
      'Add a word',
      'Tools',
      'Save phrase',
      'Show my message'
    ]) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      expect((await button.innerText()).trim()).not.toBe('');
    }
    const personal = await page
      .getByRole('button', { name: 'My words', exact: true })
      .boundingBox();
    const categoryStrip = await page.locator('.aac-categories').boundingBox();
    expect(personal.x).toBeGreaterThanOrEqual(categoryStrip.x);
    expect(personal.x + personal.width).toBeLessThanOrEqual(
      categoryStrip.x + categoryStrip.width + 1
    );
    const more = page.getByRole('button', {
      name: 'More categories',
      exact: true
    });
    const overflow = await page
      .locator('.aac-categories')
      .evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    if (overflow) {
      await expect(more).toBeEnabled();
      const arrow = await more.boundingBox();
      expect(arrow.x + arrow.width).toBeLessThanOrEqual(width);
      await more.click();
      await expect
        .poll(() =>
          page.locator('.aac-categories').evaluate((el) => el.scrollLeft)
        )
        .toBeGreaterThan(0);
      const afterForward = await page
        .locator('.aac-categories')
        .evaluate((el) => el.scrollLeft);
      await page
        .getByRole('button', { name: 'Previous categories', exact: true })
        .click();
      await expect
        .poll(() =>
          page.locator('.aac-categories').evaluate((el) => el.scrollLeft)
        )
        .toBeLessThan(afterForward);
      await page.locator('.aac-categories').evaluate((el) => {
        el.scrollLeft = 0;
      });
    } else await expect(more).toHaveCount(0);
    await openTool(page, 'Quick guide');
    const dialog = page.getByRole('dialog');
    for (let step = 0; step < 3; step++) {
      await expect(dialog.locator('.aac-guide-actions')).toBeVisible();
      const footer = await dialog.locator('.aac-guide-actions').boundingBox();
      expect(footer.y).toBeGreaterThanOrEqual(0);
      expect(footer.y + footer.height).toBeLessThanOrEqual(height);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        )
      ).toBe(false);
      expect(
        await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
      ).toBe(false);
      if (step < 2)
        await dialog
          .getByRole('button', { name: 'Next step', exact: true })
          .click();
    }
    await dialog
      .getByRole('button', { name: 'Return to my board', exact: true })
      .click();
  }
});

test('quick guide respects larger pictures and text while keeping actions reachable', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installVoices(page);
  await open(page, 'en');
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('checkbox', { name: 'Larger text', exact: true })
    .check();
  await dialog
    .getByRole('combobox', { name: 'Picture size', exact: true })
    .selectOption('large');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await openTool(page, 'Quick guide');
  await dialog.getByRole('button', { name: 'Next step', exact: true }).click();
  for (const [width, height] of [
    [320, 568],
    [390, 420],
    [667, 375]
  ]) {
    await page.setViewportSize({ width, height });
    const size = await dialog
      .locator('.aac-word-label')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(23);
    for (const button of await dialog
      .locator('.aac-guide-words button')
      .all()) {
      const outer = await button.boundingBox();
      const picture = await button.locator('.aac-word-picture').boundingBox();
      expect(picture.width).toBeGreaterThanOrEqual(90);
      expect(picture.x).toBeGreaterThanOrEqual(outer.x);
      expect(picture.x + picture.width).toBeLessThanOrEqual(
        outer.x + outer.width
      );
    }
    const actions = await dialog.locator('.aac-guide-actions').boundingBox();
    expect(actions.y + actions.height).toBeLessThanOrEqual(height);
    expect(
      await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
    ).toBe(false);
  }
  await dialog.getByRole('button', { name: 'I', exact: true }).click();
  await dialog.getByRole('button', { name: 'Speak', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.testSpoken.at(-1)))
    .toMatchObject({ text: 'I', voice: 'test-en' });
  await dialog
    .getByRole('button', { name: 'Skip, keep communicating', exact: true })
    .click();
});

test.describe('responsive MVP layouts', () => {
  // Layout checks do not need to download the offline pack in every viewport.
  test.use({ serviceWorkers: 'block' });

  async function expectLayoutToFit(page) {
    const problems = await page.evaluate(() => {
      const issues = [];
      if (document.documentElement.scrollWidth > innerWidth)
        issues.push('page overflows horizontally');
      for (const el of document.querySelectorAll(
        '.aac-topbar button, .aac-readiness-bar button, .aac-composer button, .aac-mobile-nav button'
      )) {
        if (!el.getClientRects().length) continue;
        const box = el.getBoundingClientRect();
        if (
          box.x < 0 ||
          box.y < 0 ||
          box.right > innerWidth + 1 ||
          box.bottom > innerHeight + 1
        )
          issues.push(`control outside viewport: ${el.textContent}`);
        if (box.width < 44 || box.height < 44)
          issues.push(`small touch target: ${el.textContent}`);
      }
      for (const el of document.querySelectorAll(
        '.aac-composer, .aac-dialog, .aac-routine-step, .aac-timer'
      )) {
        if (el.getClientRects().length && el.scrollWidth > el.clientWidth + 2)
          issues.push(`content clipped: ${el.className}`);
      }
      return issues;
    });
    expect(problems).toEqual([]);
  }

  test('twelve phone, tablet and laptop sizes show complete words in all three languages', async ({
    page
  }) => {
    await installVoices(page);
    await open(page);
    const wordIds = await page
      .locator('[data-word-id]')
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.wordId));
    for (const [width, height, minimumWords] of [
      [320, 568, 3],
      [360, 640, 3],
      [390, 844, 6],
      [430, 932, 9],
      [667, 375, 6],
      [844, 390, 6],
      [768, 1024, 12],
      [820, 1180, 16],
      [1024, 768, 8],
      [1180, 820, 8],
      [1366, 768, 12],
      [1440, 900, 18]
    ]) {
      await page.setViewportSize({ width, height });
      for (const language of ['廣東話', '普通话', 'English']) {
        await page.getByRole('button', { name: language, exact: true }).click();
        await page.locator('.aac-scroll-area').evaluate((el) => {
          el.scrollTop = 0;
        });
        await expectLayoutToFit(page);
        const visibleWords = await page.evaluate(() => {
          const area = document
            .querySelector('.aac-scroll-area')
            .getBoundingClientRect();
          return [...document.querySelectorAll('.aac-word')].filter((el) => {
            const box = el.getBoundingClientRect();
            return box.top >= area.top && box.bottom <= area.bottom;
          }).length;
        });
        expect(
          visibleWords,
          `${width}×${height}, ${language}`
        ).toBeGreaterThanOrEqual(minimumWords);
        expect(
          await page
            .locator('[data-word-id]')
            .evaluateAll((nodes) => nodes.map((n) => n.dataset.wordId))
        ).toEqual(wordIds);
      }
    }
  });

  test('typing, phrases, routines, larger text and dialogs fit small phones through laptops', async ({
    page
  }) => {
    await installVoices(page);
    await open(page, 'en');
    for (const [width, height] of [
      [320, 568],
      [667, 375],
      [768, 1024],
      [1024, 768],
      [1366, 768]
    ]) {
      await page.setViewportSize({ width, height });
      for (const section of [
        'Quick phrases',
        'Type to speak',
        'Daily routine'
      ]) {
        await page.getByRole('button', { name: section, exact: true }).click();
        await expectLayoutToFit(page);
      }
      await page
        .getByRole('button', { name: 'Preferences', exact: true })
        .click();
      const dialog = page.getByRole('dialog');
      await expectLayoutToFit(page);
      await page
        .getByRole('checkbox', { name: 'Larger text', exact: true })
        .check();
      await page
        .getByRole('combobox', { name: 'Picture size', exact: true })
        .selectOption('large');
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await page
        .getByRole('button', { name: 'Word board', exact: true })
        .click();
      await expectLayoutToFit(page);
      const lastWord = page.locator('[data-word-id]').last();
      await lastWord.scrollIntoViewIfNeeded();
      const area = await page.locator('.aac-scroll-area').boundingBox();
      const word = await lastWord.boundingBox();
      expect(word.y).toBeGreaterThanOrEqual(area.y);
      expect(word.y + word.height).toBeLessThanOrEqual(area.y + area.height);
      await openTool(page, 'Personalize words');
      await page.locator('[data-word-id="water"]').click();
      await dialog
        .getByRole('textbox', { name: 'English', exact: true })
        .fill('PersonalPictureLabel'.repeat(4));
      await expectLayoutToFit(page);
      const fields = await dialog
        .locator('input:not([type="file"])')
        .evaluateAll((nodes) =>
          nodes.map((n) => parseFloat(getComputedStyle(n).fontSize))
        );
      expect(fields.every((size) => size >= 16)).toBe(true);
      await dialog
        .getByRole('button', { name: 'Save changes', exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        dialog.getByRole('button', { name: 'Close', exact: true })
      ).toBeVisible();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: 'Done', exact: true }).click();
    }
  });

  test('personal-word actions and quick responses stay usable on short screens and tablets', async ({
    page
  }) => {
    await installVoices(page);
    await open(page, 'en');
    const dialog = page.getByRole('dialog');
    for (const [width, height] of [
      [320, 568],
      [390, 420],
      [667, 375],
      [768, 1024],
      [1024, 768],
      [1366, 768]
    ]) {
      await page.setViewportSize({ width, height });
      await page
        .getByRole('button', { name: 'Add a word', exact: true })
        .click();
      for (let step = 0; step < 3; step++) {
        await expectLayoutToFit(page);
        const actions = await dialog
          .locator('.aac-editor-actions')
          .boundingBox();
        expect(actions.y).toBeGreaterThanOrEqual(0);
        expect(actions.y + actions.height).toBeLessThanOrEqual(height);
        const button = dialog.getByRole('button', {
          name: step === 2 ? 'Save changes' : 'Next step',
          exact: true
        });
        await expect(button).toBeVisible();
        if (step === 1) {
          await expect(
            dialog.getByRole('textbox', { name: 'English', exact: true })
          ).toBeFocused();
          await dialog
            .getByRole('textbox', { name: 'English', exact: true })
            .fill('My cat');
          await dialog.locator('summary').click();
          await dialog
            .getByRole('textbox', { name: '廣東話', exact: true })
            .fill('我隻貓');
        }
        if (step < 2) await button.click();
      }
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page
        .getByRole('button', { name: 'Quick responses', exact: true })
        .click();
      await expectLayoutToFit(page);
      await dialog
        .getByRole('button', { name: 'Choose quick responses', exact: true })
        .click();
      await expectLayoutToFit(page);
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    }
  });
});
