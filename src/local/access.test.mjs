import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scanGroups, switchAction, SCAN_ORDER } from './aac/scanModel.js';
import { SpeechEngine } from './aac/speechEngine.js';
import { workspaceWords } from './aac/vocabulary.js';
import {
  ACTION,
  initialWorkspace,
  validateWorkspace,
  workspaceReducer
} from './aac/model.js';

const catalog = JSON.parse(
  fs.readFileSync(new URL('./aac/catalog.json', import.meta.url))
);

test('scanning puts message controls first and can split grids into rows', () => {
  const targets = [
    { id: 'tab', group: 'categories', top: 100 },
    { id: 'i', group: 'board', top: 200 },
    { id: 'you', group: 'board', top: 200 },
    { id: 'want', group: 'board', top: 300 },
    { id: 'speak', group: 'message', top: 10 },
    { id: 'stop', group: 'stop', top: 50 }
  ];
  const ids = (groups) => groups.map((g) => g.items.map((t) => t.id));
  assert.deepEqual(ids(scanGroups(targets)), [
    ['speak'],
    ['i', 'you', 'want'],
    ['tab'],
    ['stop']
  ]);
  assert.deepEqual(ids(scanGroups(targets, { rows: true })), [
    ['speak'],
    ['i', 'you'],
    ['want'],
    ['tab'],
    ['stop']
  ]);
  assert.equal(SCAN_ORDER[0], 'message');
});

test('one switch selects; two switches move with Space and select with Enter', () => {
  assert.equal(switchAction(' ', 'auto'), 'select');
  assert.equal(switchAction('Enter', 'auto'), 'select');
  assert.equal(switchAction(' ', 'step'), 'next');
  assert.equal(switchAction('Enter', 'step'), 'select');
  assert.equal(switchAction('Escape', 'step'), 'stop');
  assert.equal(switchAction('a', 'auto'), null);
});

test('a device voice that never finishes gives up and falls back to the included audio', async () => {
  const played = [];
  let cancelled = 0;
  const engine = new SpeechEngine({
    catalog: [...catalog.words, ...catalog.phrases],
    getSynth: () => ({
      getVoices: () => [{ voiceURI: 'yue', lang: 'zh-HK', localService: true }],
      speak() {}, // never fires onend or onerror
      cancel: () => cancelled++
    }),
    createUtterance: (text) => ({ text }),
    createAudio: () => ({
      play() {
        played.push(this.src);
        queueMicrotask(() => this.onended?.());
        return Promise.resolve();
      },
      pause() {}
    })
  });
  engine.speechTimeout = () => 20;
  await engine.speak({ text: '水', language: 'yue' });
  assert.deepEqual(played, ['/audio/yue/water.mp3']);
  assert.ok(cancelled >= 1, 'the stalled utterance is cancelled');

  const silent = new SpeechEngine({
    catalog: [],
    getSynth: () => ({
      getVoices: () => [{ voiceURI: 'yue', lang: 'zh-HK', localService: true }],
      speak() {},
      cancel() {}
    }),
    createUtterance: (text) => ({ text }),
    createAudio: () => ({})
  });
  silent.speechTimeout = () => 20;
  await assert.rejects(
    silent.speak({ text: '陳姑娘', language: 'yue' }),
    /speech-timeout/
  );
});

test('editing a starter word keeps only the user changes, so vocabulary updates still apply', () => {
  const water = catalog.words.find((w) => w.id === 'water');
  const state = workspaceReducer(initialWorkspace, {
    type: ACTION,
    operation: 'word',
    payload: {
      id: 'water',
      word: { ...water, en: 'water please', recordings: {} }
    }
  });
  assert.deepEqual(Object.keys(state.overrides.water).sort(), [
    'cmn',
    'en',
    'recordings',
    'yue'
  ]);
  // An older edit that stored the whole word no longer hides catalog changes.
  const updated = [
    {
      ...water,
      symbol: '/symbols/mulberry/glass_of_water.svg',
      category: 'core'
    }
  ];
  const [word] = workspaceWords(
    updated,
    {
      overrides: {
        water: {
          ...water,
          en: 'my water',
          symbol: '/old.svg',
          category: 'food'
        }
      },
      customWords: []
    },
    'en'
  );
  assert.equal(word.text, 'my water');
  assert.equal(word.symbol, '/symbols/mulberry/glass_of_water.svg');
  assert.equal(word.category, 'core');
});

test('scanning and screen preferences validate, and older backups gain defaults', () => {
  const restored = validateWorkspace({
    ...initialWorkspace,
    preferences: {
      ...initialWorkspace.preferences,
      scanMode: undefined,
      scanRows: undefined,
      scanPreview: undefined,
      scanHold: undefined,
      keepAwake: undefined
    }
  });
  assert.equal(restored.preferences.scanMode, 'auto');
  assert.equal(restored.preferences.scanHold, 0);
  assert.equal(restored.preferences.keepAwake, true);
  const custom = validateWorkspace({
    ...initialWorkspace,
    preferences: {
      ...initialWorkspace.preferences,
      scanMode: 'step',
      scanRows: true,
      scanPreview: true,
      scanHold: 500,
      keepAwake: false
    }
  });
  assert.deepEqual(
    [
      custom.preferences.scanMode,
      custom.preferences.scanRows,
      custom.preferences.scanPreview,
      custom.preferences.scanHold,
      custom.preferences.keepAwake
    ],
    ['step', true, true, 500, false]
  );
  for (const bad of [
    { scanMode: 'fast' },
    { scanHold: 3 },
    { scanRows: 'yes' }
  ])
    assert.throws(() =>
      validateWorkspace({
        ...initialWorkspace,
        preferences: { ...initialWorkspace.preferences, ...bad }
      })
    );
});
