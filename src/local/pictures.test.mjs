// Open AAC Board addition, 2026-10-30. GPL-3.0-only; see LICENSE.txt.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  wordsInGroup,
  PICTURE_GROUPS,
  DEFAULT_PINNED_WORDS
} from './aac/pictureGroups.js';
import { workspaceWords } from './aac/vocabulary.js';
import {
  initialWorkspace,
  validateWorkspace,
  createWorkspaceBackup,
  parseWorkspaceBackup,
  workspaceReducer,
  ACTION
} from './aac/model.js';
import {
  initialCommunication,
  recoverCommunication
} from './aac/communication.js';
const catalog = JSON.parse(
  fs.readFileSync(new URL('./aac/catalog.json', import.meta.url))
);

test('visual groups reuse the same words and preserve starter order; common words have all expected routes', () => {
  const words = workspaceWords(catalog.words, initialWorkspace, 'yue');
  for (const [group, ids] of Object.entries({
    food: ['water', 'eat', 'drink', 'hungry', 'thirsty'],
    feelings: ['pain', 'happy', 'rest', 'not-want'],
    people: ['mum', 'i', 'you'],
    places: ['home', 'toilet', 'bus'],
    activities: ['play', 'sleep', 'brush', 'eat']
  })) {
    const grouped = wordsInGroup(words, group);
    assert.equal(new Set(grouped.map((w) => w.id)).size, grouped.length);
    for (const id of ids)
      assert.equal(
        grouped.find((w) => w.id === id),
        words.find((w) => w.id === id)
      );
    if (group !== 'activities')
      assert.deepEqual(
        grouped
          .slice(0, catalog.words.filter((w) => w.category === group).length)
          .map((w) => w.id),
        catalog.words.filter((w) => w.category === group).map((w) => w.id)
      );
  }
  assert.deepEqual(
    wordsInGroup(words, 'core').map((w) => w.id),
    catalog.words.filter((w) => w.category === 'core').map((w) => w.id)
  );
  assert.deepEqual(
    new Set(
      PICTURE_GROUPS.flatMap((g) => wordsInGroup(words, g.id))
        .concat(wordsInGroup(words, 'core'))
        .map((w) => w.id)
    ),
    new Set(words.map((w) => w.id))
  );
  assert.notEqual(
    words.find((w) => w.id === 'no').image,
    words.find((w) => w.id === 'not-want').image
  );
});

test('photos, labels and language-specific recordings are shared by every route to a word', () => {
  const edited = {
    ...initialWorkspace,
    overrides: {
      water: {
        yue: '暖水',
        en: '',
        cmn: '',
        image: 'data:image/png;base64,YQ==',
        recordings: { yue: 'data:audio/webm;base64,YQ==' }
      }
    }
  };
  for (const language of ['yue', 'en', 'cmn']) {
    const words = workspaceWords(catalog.words, edited, language);
    const food = wordsInGroup(words, 'food').find((w) => w.id === 'water');
    const core = wordsInGroup(words, 'core').find((w) => w.id === 'water');
    assert.equal(food, core);
    assert.equal(food.image, edited.overrides.water.image);
    assert.equal(food.translated, language === 'yue');
    assert.equal(
      food.recording,
      language === 'yue' ? edited.overrides.water.recordings.yue : undefined
    );
  }
});

test('six pinned slots survive backups and removing a custom card leaves its slot empty', () => {
  const word = {
    id: 'custom-mum',
    language: 'yue',
    yue: '媽咪',
    en: '',
    cmn: '',
    recordings: {}
  };
  let state = workspaceReducer(initialWorkspace, {
    type: ACTION,
    operation: 'custom-word',
    payload: word
  });
  const slots = ['custom-mum', null, 'water', null, 'help', null];
  state = workspaceReducer(state, {
    type: ACTION,
    operation: 'pinned-words',
    payload: slots
  });
  assert.deepEqual(
    parseWorkspaceBackup(createWorkspaceBackup(state)).pinnedWords,
    slots
  );
  state = workspaceReducer(state, {
    type: ACTION,
    operation: 'delete-custom-word',
    payload: word.id
  });
  assert.deepEqual(state.pinnedWords, [
    null,
    null,
    'water',
    null,
    'help',
    null
  ]);
  const { pinnedWords, ...older } = initialWorkspace;
  const { pictureBrowsing, ...oldPreferences } = older.preferences;
  const restored = validateWorkspace({ ...older, preferences: oldPreferences });
  assert.deepEqual(restored.pinnedWords, DEFAULT_PINNED_WORDS);
  assert.equal(restored.preferences.pictureBrowsing, false);
  const { pictureGroup, ...oldDraft } = initialCommunication;
  assert.equal(recoverCommunication(oldDraft).pictureGroup, null);
});

test('pin and view imports reject unsafe, duplicated, malformed or oversized values', () => {
  for (const pinnedWords of [
    [],
    Array(7).fill(null),
    ['water', 'water', null, null, null, null],
    [{ id: 'water' }, null, null, null, null, null],
    ['__proto__', null, null, null, null, null],
    ['https://bad.test/image', null, null, null, null, null]
  ])
    assert.throws(() =>
      validateWorkspace({ ...initialWorkspace, pinnedWords })
    );
  assert.throws(() =>
    validateWorkspace({
      ...initialWorkspace,
      preferences: { ...initialWorkspace.preferences, pictureBrowsing: 'yes' }
    })
  );
  assert.deepEqual(
    recoverCommunication({ ...initialCommunication, pictureGroup: '<script>' }),
    initialCommunication
  );
});
