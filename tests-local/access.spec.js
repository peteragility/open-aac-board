const { test, expect } = require('@playwright/test');

async function installVoices(page) {
  await page.addInitScript(() => {
    window.testSpoken = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    const voices = [
      {
        name: 'Cantonese',
        lang: 'zh-HK',
        voiceURI: 'test-yue',
        localService: true
      },
      {
        name: 'English',
        lang: 'en-GB',
        voiceURI: 'test-en',
        localService: true
      },
      {
        name: 'Mandarin',
        lang: 'zh-CN',
        voiceURI: 'test-cmn',
        localService: true
      }
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
            voice: u.voice?.voiceURI,
            volume: u.volume
          });
          setTimeout(() => u.onend?.(), 5);
        },
        cancel() {},
        addEventListener() {},
        removeEventListener() {}
      }
    });
  });
}

async function open(page, language = 'en') {
  await page.goto('/');
  await page.getByRole('button', { name: '開啟我嘅溝通板' }).waitFor();
  if (language === 'en')
    await page.getByRole('button', { name: 'English', exact: true }).click();
  await page
    .getByRole('button', { name: /開啟我嘅溝通板|Open my communication board/ })
    .click();
  await expect(page.locator('[data-word-id="water"]')).toBeVisible();
}

async function preferences(page, change) {
  await page
    .getByRole('button', { name: 'Preferences', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await change(dialog);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
}

async function startScanning(page) {
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start picture scanning', exact: true })
    .click();
}

const spoken = (page) => page.evaluate(() => window.testSpoken);

test.use({ serviceWorkers: 'block' });

test('two-switch scanning reaches the message controls, so a switch user can speak', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  await preferences(page, (dialog) =>
    dialog
      .getByRole('combobox', { name: 'Scanning method' })
      .selectOption('step')
  );
  await startScanning(page);
  const first = page.locator('[data-word-id="i"]');
  await expect(first).toHaveAttribute('data-scan-focus', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('.aac-message')).toContainText('I');
  // After a selection the scan restarts on the now usable message controls.
  const back = page.getByRole('button', {
    name: 'Back: remove last word',
    exact: true
  });
  await expect(back).toHaveAttribute('data-scan-focus', 'true');
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('button', { name: 'Clear', exact: true })
  ).toHaveAttribute('data-scan-focus', 'true');
  await page.keyboard.press('Space');
  const speak = page.getByRole('button', { name: 'Speak', exact: true });
  await expect(speak).toHaveAttribute('data-scan-focus', 'true');
  await expect(speak).toBeFocused();
  const before = (await spoken(page)).length;
  await page.keyboard.press('Enter');
  await expect
    .poll(async () => (await spoken(page)).slice(before).map((s) => s.text))
    .toContain('I');
  // Categories and the stop control are in the scan as well.
  for (let i = 0; i < 400; i++) {
    if (
      (await page
        .getByRole('button', { name: 'Stop scanning', exact: true })
        .getAttribute('data-scan-focus')) === 'true'
    )
      break;
    await page.keyboard.press('Space');
  }
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Start picture scanning' })
  ).toHaveCount(0);
  await expect(page.locator('[data-scan-focus]')).toHaveCount(0);
});

test('row scanning, switch hold time and spoken highlights', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  await preferences(page, async (dialog) => {
    await dialog
      .getByRole('combobox', { name: 'Scanning method' })
      .selectOption('step');
    await dialog
      .getByRole('checkbox', { name: 'Choose a row first, then an item' })
      .check();
    await dialog
      .getByRole('combobox', { name: 'Hold the switch this long to count' })
      .selectOption('500');
    await dialog
      .getByRole('checkbox', { name: 'Quietly speak each highlighted item' })
      .check();
  });
  await startScanning(page);
  // The first row of words is highlighted as a group.
  await expect(page.locator('[data-word-id="i"]')).toHaveAttribute(
    'data-scan-group-focus',
    'true'
  );
  await expect(page.locator('[data-word-id="you"]')).toHaveAttribute(
    'data-scan-group-focus',
    'true'
  );
  // A short tap does not count when a hold time is set.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  await expect(page.locator('[data-word-id="i"]')).toHaveAttribute(
    'data-scan-group-focus',
    'true'
  );
  const hold = async (key) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(650);
    await page.keyboard.up(key);
  };
  await hold('Enter');
  await expect(page.locator('[data-word-id="i"]')).toHaveAttribute(
    'data-scan-focus',
    'true'
  );
  // Each highlighted item is spoken quietly.
  await expect
    .poll(async () => (await spoken(page)).find((s) => s.text === 'I'))
    .toMatchObject({ voice: 'test-en', volume: 0.6 });
  await hold('Enter');
  await expect(page.locator('.aac-message')).toContainText('I');
  await page.keyboard.press('Escape');
  await expect(
    page.locator('[data-scan-focus], [data-scan-group-focus]')
  ).toHaveCount(0);
});

test('the partner view never speaks a word that has no label in this language', async ({
  page
}) => {
  await installVoices(page);
  await open(page, 'yue');
  await page.getByRole('button', { name: '新增字詞', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog
    .getByRole('textbox', { name: '廣東話', exact: true })
    .fill('陳姑娘');
  await dialog.getByRole('button', { name: '下一步', exact: true }).click();
  await dialog.getByRole('button', { name: '儲存', exact: true }).click();
  await page.locator('[data-word-id^="custom-"]').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Speak', exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Show my message', exact: true })
  ).toBeDisabled();
});

test('resetting a personalized word asks first', async ({ page }) => {
  await installVoices(page);
  await open(page);
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Personalize words', exact: true })
    .click();
  await page.locator('[data-word-id="water"]').click();
  let dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'English', exact: true })
    .fill('my water');
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(page.locator('[data-word-id="water"]')).toContainText(
    'my water'
  );
  await page.locator('[data-word-id="water"]').click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Reset this word', exact: true })
    .click();
  await expect(dialog).toContainText("Resetting deletes this word's photo");
  await dialog
    .getByRole('button', { name: 'Cancel', exact: true })
    .first()
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Reset this word', exact: true })
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Reset this word', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Reset word', exact: true }).click();
  await expect(page.locator('[data-word-id="water"]')).not.toContainText(
    'my water'
  );
});

test('a quick phrase replacing an unfinished message can be undone', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  for (const id of ['i', 'want'])
    await page.locator(`[data-word-id="${id}"]`).click();
  await page
    .getByRole('button', { name: 'Quick phrases', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: /^Hello!/ })
    .first()
    .click();
  await expect(page.locator('.aac-message')).toContainText('Hello!');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.aac-message')).toContainText('I');
  await expect(page.locator('.aac-message')).toContainText('want');
  await expect(page.locator('.aac-message')).not.toContainText('Hello!');
});

test('notices never move the pictures, and the message bar keeps its height', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installVoices(page);
  await open(page);
  const tap = (id) =>
    page.evaluate(
      (word) => document.querySelector(`[data-word-id="${word}"]`).click(),
      id
    );
  const top = () =>
    page.evaluate(() =>
      Math.round(
        document.querySelector('[data-word-id="water"]').getBoundingClientRect()
          .top
      )
    );
  const composer = () =>
    page.evaluate(() =>
      Math.round(
        document.querySelector('.aac-composer').getBoundingClientRect().height
      )
    );
  await tap('i');
  await page.waitForTimeout(1000);
  const [beforeTop, beforeHeight] = [await top(), await composer()];
  // A long, wrapping message stays inside the same message bar height.
  for (let i = 0; i < 14; i++) await tap('water');
  await page.waitForTimeout(1000);
  expect(await composer()).toBe(beforeHeight);
  expect(await top()).toBe(beforeTop);
  await page.getByRole('button', { name: 'Save phrase', exact: true }).click();
  await expect(page.locator('.aac-notice')).toContainText(
    'Saved to My phrases'
  );
  expect(await top()).toBe(beforeTop);
});

test('the break timer alerts when it ends, even from another tab of the app', async ({
  page
}) => {
  await page.clock.install();
  await installVoices(page);
  await open(page);
  await page
    .getByRole('button', { name: 'Daily routine', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: '1 min', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page
    .getByRole('button', { name: 'Word board', exact: true })
    .first()
    .click();
  await page.clock.fastForward('01:05');
  await page.clock.runFor(1000);
  await expect(
    page.getByRole('img', { name: 'Break is over' }).first()
  ).toBeVisible();
  const notice = page.locator('.aac-notice');
  await expect(notice).toContainText('Time is up');
  await notice
    .getByRole('button', { name: 'Daily routine', exact: true })
    .click();
  await expect(page.getByRole('img', { name: 'Break is over' })).toHaveCount(0);
  await expect(page.locator('.aac-timer-done')).toContainText('Time is up');
});

test('the caregiver lock hides editing until the lock is held', async ({
  page
}) => {
  await installVoices(page);
  await open(page);
  await preferences(page, (dialog) =>
    dialog
      .getByRole('checkbox', { name: 'Caregiver lock: hold to unlock editing' })
      .check()
  );
  await expect(page.getByRole('button', { name: 'Add a word' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Preferences', exact: true })
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  const tools = page.getByRole('dialog');
  await expect(
    tools.getByRole('button', { name: 'Personalize words' })
  ).toHaveCount(0);
  await expect(
    tools.getByRole('button', { name: 'Start picture scanning' })
  ).toBeVisible();
  await tools.getByRole('button', { name: 'Close', exact: true }).click();
  const lock = page
    .getByRole('button', { name: 'Hold for 2 seconds to unlock editing' })
    .first();
  // A tap does nothing.
  await lock.click();
  await expect(
    page.getByRole('button', { name: 'Preferences', exact: true })
  ).toHaveCount(0);
  const box = await lock.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Preferences', exact: true }).first()
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add a word' })).toBeVisible();
  await page.getByRole('button', { name: 'Lock', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add a word' })).toHaveCount(0);
});

test('a paper copy of the board prints with pictures and labels', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.printed = 0;
    window.print = () => {
      window.printed++;
    };
  });
  await installVoices(page);
  await open(page);
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Print this board', exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => window.printed)).toBe(1);
  const sheet = page.locator('.aac-print-sheet');
  await expect(sheet.locator('.aac-print-cell')).toHaveCount(
    await page.locator('.aac-word-grid [data-word-id]').count()
  );
  await expect(sheet).toContainText('want');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(sheet).toHaveCount(0);
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Print all words', exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => window.printed)).toBe(2);
  // The sheet is hidden on screen and shown only when printing.
  await expect(page.locator('.aac-print-sheet h2')).not.toHaveCount(0);
  await expect(page.locator('.aac-print-sheet')).toBeHidden();
});

test('partners can find words by Jyutping', async ({ page }) => {
  await installVoices(page);
  await open(page);
  await page
    .getByRole('button', { name: 'Find vocabulary', exact: true })
    .click();
  await page.getByRole('searchbox', { name: 'Find vocabulary' }).fill('seoi');
  await expect(
    page.locator('.aac-word-grid [data-word-id="water"]')
  ).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Find vocabulary' })
    .fill('ci3 so2');
  await expect(
    page.locator('.aac-word-grid [data-word-id="toilet"]')
  ).toBeVisible();
  await expect(page.locator('.aac-word-grid [data-word-id]')).toHaveCount(1);
});
