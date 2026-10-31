import test from 'node:test';
import assert from 'node:assert/strict';
import { readLocalMedia, validateLocalMediaURL } from './media.js';
import { parseBoardJSON, validateImportedBoards } from './importValidation.js';

test('backup validation preserves embedded recordings and local symbols', () => {
  const boards = [
    {
      name: 'My words',
      tiles: [
        {
          label: 'Water',
          image: '/symbols/mulberry/water.svg',
          sound: 'data:audio/webm;codecs=opus;base64,YQ=='
        }
      ]
    }
  ];
  assert.deepEqual(
    validateImportedBoards(parseBoardJSON(JSON.stringify(boards))),
    boards
  );
});
test('imports reject active URL schemes, malformed structure and prototype keys', () => {
  for (const image of [
    'javascript:alert(1)',
    'data:text/html;base64,YQ==',
    '//tracking.invalid/a.png',
    'http://example.invalid/a.png'
  ]) {
    assert.throws(() => validateImportedBoards([{ tiles: [{ image }] }]));
  }
  assert.throws(() => validateImportedBoards([{ tiles: 'wrong' }]));
  assert.throws(() => parseBoardJSON('{"__proto__":{"polluted":true}}'));
  assert.throws(() => parseBoardJSON('{"tiles":[{"constructor":{}}]}'));
  assert.equal({}.polluted, undefined);
});
test('media validation accepts recordings and rejects active or oversized uploads', async () => {
  assert.equal(
    validateLocalMediaURL('data:audio/webm;codecs=opus;base64,YQ=='),
    'data:audio/webm;codecs=opus;base64,YQ=='
  );
  assert.throws(() => validateLocalMediaURL('data:text/html;base64,YQ=='));
  await assert.rejects(
    readLocalMedia({ type: 'image/png', size: 13 * 1024 * 1024 })
  );
  await assert.rejects(readLocalMedia({ type: 'text/html', size: 10 }));
});
test('media is read locally and file read errors reject', async () => {
  const previous = globalThis.FileReader;
  try {
    globalThis.FileReader = class {
      readAsDataURL() {
        this.result = 'data:image/png;base64,YQ==';
        this.onload();
      }
    };
    assert.equal(
      await readLocalMedia({ type: 'image/png', size: 1 }),
      'data:image/png;base64,YQ=='
    );
    globalThis.FileReader = class {
      readAsDataURL() {
        this.onerror();
      }
    };
    await assert.rejects(
      readLocalMedia({ type: 'image/png', size: 1 }),
      /could not be read/
    );
  } finally {
    globalThis.FileReader = previous;
  }
});
