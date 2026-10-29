// Open AAC Board addition, 2026-10-30. GPL-3.0-only; see LICENSE.txt.
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

async function browse(page) {
  await page
    .getByRole('button', { name: /^(Browse pictures|睇圖搵)$/ })
    .click();
  await expect(page.locator('.aac-picture-folder')).toHaveCount(6);
}

test('picture groups navigate silently, expose core vocabulary and speak real bundled Cantonese from every route offline', async ({
  page,
  context
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installVoices(page, false);
  await open(page);
  await browse(page);
  const rootMessage = await page.locator('.aac-message').innerText();
  const essentials = page.locator('.aac-essential-pictures [data-word-id]');
  expect(
    await essentials.evaluateAll((nodes) => nodes.map((n) => n.dataset.wordId))
  ).toEqual(['yes', 'no', 'help', 'stop']);
  await page.locator('[data-picture-group="food"]').click();
  await expect(
    page.locator('.aac-visual-words [data-word-id="water"]')
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => window.testAudio.length + window.testSpoken.length
    )
  ).toBe(0);
  await expect(page.locator('.aac-message')).toHaveText(rootMessage);
  await page.locator('.aac-visual-words [data-word-id="water"]').click();
  await expect(
    page.locator('.aac-visual-words [data-word-id="water"]')
  ).toHaveClass(/aac-just-picked/);
  await expect(page.locator('.aac-message-word img')).toHaveAttribute(
    'src',
    /water\.svg$/
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudioEnded.some((url) =>
          url.endsWith('/audio/yue/water.mp3')
        )
      )
    )
    .toBe(true);
  await page.getByRole('button', { name: '返回圖片分類', exact: true }).click();
  await page.locator('[data-picture-group="feelings"]').click();
  await expect(
    page.locator('.aac-visual-words [data-word-id="pain"]')
  ).toBeVisible();
  await page.locator('.aac-visual-words [data-word-id="pain"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudioEnded.some((url) => url.endsWith('/audio/yue/pain.mp3'))
      )
    )
    .toBe(true);
  await expect(page.locator('.aac-offline-status')).toContainText(
    '可離線使用',
    { timeout: 30000 }
  );
  await page.waitForTimeout(350);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.locator('.aac-visual-words [data-word-id="pain"]')
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => window.testAudio.length + window.testSpoken.length
    )
  ).toBe(0);
  await page.locator('.aac-essential-pictures [data-word-id="no"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudioEnded.some((url) => url.endsWith('/audio/yue/no.mp3'))
      )
    )
    .toBe(true);
  await page.getByRole('button', { name: '常用溝通字詞', exact: true }).click();
  await expect(
    page.locator('.aac-visual-words [data-word-id="not-want"] img')
  ).toHaveAttribute('src', '/symbols/open-aac/not-want.svg');
  await page.getByRole('button', { name: '返回字詞板', exact: true }).click();
  await expect(page.locator('.aac-message-word')).toHaveCount(3);
  await expect(
    page.locator('.aac-word-grid [data-word-id="water"]')
  ).toBeVisible();
});

test('a photo and label edited through picture browsing update every category and its folder preview', async ({
  page
}) => {
  await installVoices(page);
  await open(page, 'en');
  await browse(page);
  await page.locator('[data-picture-group="food"]').click();
  await openTool(page, 'Personalize words');
  await page.locator('.aac-visual-words [data-word-id="water"]').click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'English', exact: true })
    .fill('My water');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'cup.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNd8AAAAASUVORK5CYII=',
      'base64'
    )
  });
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.locator('.aac-visual-words [data-word-id="water"]')
  ).toHaveText('My water');
  await expect(
    page.locator('.aac-visual-words [data-word-id="water"] img')
  ).toHaveAttribute('src', /^data:image/);
  await page
    .getByRole('button', { name: 'Back to picture groups', exact: true })
    .click();
  await expect(
    page.locator('[data-picture-group="food"] img').last()
  ).toHaveAttribute('src', /^data:image/);
  await expect(page.locator('[data-pin-slot="0"] img')).toHaveAttribute(
    'src',
    /^data:image/
  );
  await page
    .getByRole('button', { name: 'Return to word board', exact: true })
    .click();
  await expect(page.locator('[data-word-id="water"]')).toHaveText('My water');
  await page.getByRole('button', { name: 'Food & drink', exact: true }).click();
  await expect(page.locator('[data-word-id="water"] img')).toHaveAttribute(
    'src',
    /^data:image/
  );
});

test('pinned pictures retain exact slots through removal, backup, restore and language changes', async ({
  page
}) => {
  await installVoices(page);
  await open(page, 'en');
  await browse(page);
  await page
    .getByRole('button', { name: 'Choose pinned pictures', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Slot 3', exact: true }).click();
  await dialog.locator('[data-word-id="mum"]').click();
  await dialog
    .getByRole('button', { name: 'Slot 1: water', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Empty this slot', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(page.locator('[data-pin-slot="0"] [data-word-id]')).toHaveCount(
    0
  );
  await expect(
    page.locator('[data-pin-slot="1"] [data-word-id="toilet"]')
  ).toHaveCount(1);
  await expect(
    page.locator('[data-pin-slot="2"] [data-word-id="mum"]')
  ).toHaveCount(1);
  await page.getByRole('button', { name: '廣東話', exact: true }).click();
  await expect(page.locator('[data-pin-slot="2"]')).toContainText('媽媽');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await dialog
    .getByRole('button', { name: 'Export workspace backup', exact: true })
    .click();
  const file = await downloadPromise;
  const body = await fs.readFile(await file.path(), 'utf8');
  expect(JSON.parse(body).workspace.pinnedWords).toEqual([
    null,
    'toilet',
    'mum',
    null,
    null,
    null
  ]);
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'workspace.json',
    mimeType: 'application/json',
    buffer: Buffer.from(body)
  });
  await dialog
    .getByRole('button', { name: 'Restore now', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.locator('[data-pin-slot="0"] [data-word-id]')).toHaveCount(
    0
  );
  await expect(
    page.locator('[data-pin-slot="2"] [data-word-id="mum"]')
  ).toHaveCount(1);
  expect(await page.evaluate(() => window.testSpoken.length)).toBe(0);
});

test('visual personal cards honour missing translations and retain recordings in pinned slots', async ({
  page,
  context
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installVoices(page, false);
  await context.grantPermissions(['microphone']);
  await open(page);
  await browse(page);
  await page.getByRole('button', { name: '新增字詞', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog
    .getByRole('textbox', { name: '廣東話', exact: true })
    .fill('我隻貓');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog
    .getByRole('button', { name: '錄低自己嘅聲音', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: '停止錄音', exact: true })
  ).toBeEnabled();
  await page.waitForTimeout(600);
  await dialog.getByRole('button', { name: '停止錄音', exact: true }).click();
  await expect(dialog.locator('audio')).toHaveAttribute('src', /^data:audio/);
  await dialog.getByRole('button', { name: '儲存', exact: true }).click();
  const card = page.locator('.aac-visual-words [data-word-id^="custom-"]');
  await expect(card).toContainText('我隻貓');
  const id = await card.getAttribute('data-word-id');
  await page.getByRole('button', { name: '揀固定圖卡', exact: true }).click();
  await dialog.getByRole('button', { name: '位置 3', exact: true }).click();
  await dialog.locator(`[data-word-id="${id}"]`).click();
  await dialog.getByRole('button', { name: '儲存', exact: true }).click();
  await page.locator(`[data-pin-slot="2"] [data-word-id="${id}"]`).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.testAudioEnded.some((url) => url.startsWith('data:audio/'))
      )
    )
    .toBe(true);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const before = await page.evaluate(
    () => window.testAudio.length + window.testSpoken.length
  );
  await page.locator(`[data-pin-slot="2"] [data-word-id="${id}"]`).click();
  await expect(page.locator('.aac-notice')).toContainText(
    'no label in this language'
  );
  expect(
    await page.evaluate(
      () => window.testAudio.length + window.testSpoken.length
    )
  ).toBe(before);
  await page.getByRole('button', { name: '廣東話', exact: true }).click();
  await openTool(page, '修改圖卡');
  await card.click();
  await dialog
    .getByRole('button', { name: '刪除個人字詞', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: '刪除個人字詞', exact: true })
    .click();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await expect(page.locator('[data-pin-slot="2"] [data-word-id]')).toHaveCount(
    0
  );
  await expect(
    page.locator('[data-pin-slot="1"] [data-word-id="toilet"]')
  ).toHaveCount(1);
});

test.describe('visual layouts', () => {
  test.use({ serviceWorkers: 'block' });
  test('picture groups, card selection and pin editor fit phones, tablets and laptops', async ({
    page
  }) => {
    await installVoices(page);
    await open(page, 'en');
    await browse(page);
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [667, 375],
      [768, 1024],
      [820, 1180],
      [1024, 768],
      [1366, 768]
    ]) {
      await page.setViewportSize({ width, height });
      await expect(page.locator('.aac-picture-folder')).toHaveCount(6);
      for (const folder of await page.locator('.aac-picture-folder').all()) {
        await folder.scrollIntoViewIfNeeded();
        const box = await folder.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        for (const image of await folder.locator('img').all()) {
          const rect = await image.boundingBox();
          expect(rect.x).toBeGreaterThanOrEqual(box.x);
          expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width);
        }
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        )
      ).toBe(false);
      await page.locator('[data-picture-group="food"]').click();
      await page.locator('.aac-visual-words [data-word-id="water"]').click();
      await expect(
        page.locator('.aac-message-word img').last()
      ).toHaveAttribute('src', /water\.svg$/);
      await page
        .getByRole('button', { name: 'Back to picture groups', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Choose pinned pictures', exact: true })
        .click();
      const dialog = page.getByRole('dialog');
      const footer = await dialog.locator('.aac-pin-actions').boundingBox();
      expect(footer.y).toBeGreaterThanOrEqual(0);
      expect(footer.y + footer.height).toBeLessThanOrEqual(height);
      expect(
        await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
      ).toBe(false);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    await openTool(page, 'Start picture scanning');
    await expect(page.locator('.aac-visual-words')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('.aac-message-word').last()).toContainText('I');
    await page.keyboard.press('Escape');
  });
});

test.describe('accessible picture choices', () => {
  test.use({ serviceWorkers: 'block' });
  test('large pictures, text, contrast and text search remain usable on short phones', async ({
    page
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await installVoices(page);
    await open(page, 'en');
    await page
      .getByRole('button', { name: 'Find vocabulary', exact: true })
      .click();
    const search = page.getByRole('searchbox', {
      name: 'Find vocabulary',
      exact: true
    });
    await expect(search).toBeFocused();
    await search.fill('water');
    await expect(page.locator('.aac-word-grid [data-word-id]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await browse(page);
    await page
      .getByRole('button', { name: 'Preferences', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('checkbox', { name: 'Larger text', exact: true })
      .check();
    await dialog
      .getByRole('checkbox', { name: 'High contrast', exact: true })
      .check();
    await dialog
      .getByRole('combobox', { name: 'Picture size', exact: true })
      .selectOption('large');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    for (const [width, height] of [
      [320, 568],
      [390, 420],
      [667, 375],
      [820, 1180]
    ]) {
      await page.setViewportSize({ width, height });
      const essential = page
        .locator('.aac-essential-pictures .aac-word-picture')
        .first();
      expect((await essential.boundingBox()).width).toBeGreaterThanOrEqual(90);
      await page.locator('[data-picture-group="food"]').click();
      await expect(page.locator('.aac-picture-nav h2')).toBeFocused();
      const card = page.locator('.aac-visual-words [data-word-id="water"]');
      await card.click();
      await expect(card).toHaveClass(/aac-just-picked/);
      expect(
        await card
          .locator('.aac-word-label')
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      ).toBeGreaterThanOrEqual(23);
      const outer = await card.boundingBox();
      const picture = await card.locator('.aac-word-picture').boundingBox();
      expect(picture.width).toBeGreaterThanOrEqual(90);
      expect(picture.x + picture.width).toBeLessThanOrEqual(
        outer.x + outer.width
      );
      const colors = await card.evaluate((el) => ({
        bg: getComputedStyle(el).backgroundColor,
        fg: getComputedStyle(el.querySelector('.aac-word-label')).color
      }));
      // Prevent the selected state from putting the dark high-contrast text on a dark fill.
      expect(colors).toEqual({
        bg: 'rgb(228, 241, 231)',
        fg: 'rgb(16, 35, 27)'
      });
      await page
        .getByRole('button', { name: 'Back to picture groups', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Choose pinned pictures', exact: true })
        .click();
      for (const button of await dialog
        .locator('.aac-pin-picker button')
        .all()) {
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      const options = dialog.locator('.aac-pin-options [data-word-id="mum"]');
      expect(
        (await options.locator('.aac-word-picture').boundingBox()).width
      ).toBeGreaterThanOrEqual(90);
      await options.click();
      await expect(options).toHaveAttribute('aria-pressed', 'true');
      const actions = await dialog.locator('.aac-pin-actions').boundingBox();
      expect(actions.y + actions.height).toBeLessThanOrEqual(height);
      expect(
        await dialog
          .locator('.aac-pin-content')
          .evaluate((el) => el.scrollWidth > el.clientWidth + 1)
      ).toBe(false);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
  });
});
