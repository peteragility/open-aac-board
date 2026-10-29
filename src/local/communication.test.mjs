// Open AAC Board addition, 2026-10-29. GPL-3.0-only; see LICENSE.txt.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMUNICATION_ACTION,
  initialCommunication,
  communicationReducer,
  validateCommunication,
  recoverCommunication
} from './aac/communication.js';
import {
  ACTION,
  initialWorkspace,
  workspaceReducer,
  validateWorkspace
} from './aac/model.js';

test('latest picture and typing drafts retain only bounded text and references', () => {
  const draft = communicationReducer(initialCommunication, {
    type: COMMUNICATION_ACTION,
    payload: {
      tokens: ['i', 'water', 'water'],
      typed: '<script>plain text only</script>',
      section: 'typing',
      phrase: {
        id: 'phrase-one',
        language: 'yue',
        text: '我想飲水',
        image: 'https://example.invalid/private.jpg'
      }
    }
  });
  assert.deepEqual(
    recoverCommunication(JSON.parse(JSON.stringify(draft))),
    draft
  );
  assert.deepEqual(draft.phrase, {
    id: 'phrase-one',
    language: 'yue',
    text: '我想飲水'
  });
  assert.deepEqual(draft.tokens, ['i', 'water', 'water']);
  assert.equal(JSON.stringify(draft).includes('private.jpg'), false);
  assert.equal(
    communicationReducer(draft, {
      type: COMMUNICATION_ACTION,
      payload: { typed: draft.typed }
    }),
    draft
  );
  const switched = communicationReducer(draft, {
    type: ACTION,
    operation: 'language',
    payload: 'en'
  });
  assert.equal(switched.phrase, null);
  assert.deepEqual(switched.tokens, draft.tokens);
  assert.equal(switched.typed, draft.typed);
});

test('malformed persisted drafts reset safely and updates reject unbounded or invalid references', () => {
  for (const patch of [
    { tokens: Array(31).fill('water') },
    { tokens: ['../water'] },
    { tokens: ['constructor'] },
    { typed: 'x'.repeat(501) },
    { typed: {} },
    { section: 'admin' },
    { category: '<script>' },
    { guideRequested: 'true' },
    { phrase: { id: 'phrase-one', language: 'zh-CN', text: '水' } },
    { phrase: { id: 'phrase-one', language: 'yue', text: 'x'.repeat(501) } },
    { phrase: [] }
  ]) {
    const invalid = { ...initialCommunication, ...patch };
    assert.throws(() => validateCommunication(invalid));
    assert.equal(recoverCommunication(invalid), initialCommunication);
    assert.throws(() =>
      communicationReducer(initialCommunication, {
        type: COMMUNICATION_ACTION,
        payload: patch
      })
    );
  }
  assert.equal(recoverCommunication(undefined), initialCommunication);
});

test('restoring a workspace clears drafts rather than carrying private messages into the imported workspace', () => {
  const draft = {
    ...initialCommunication,
    typed: 'Private unfinished message',
    tokens: ['water'],
    guideRequested: true
  };
  assert.equal(
    communicationReducer(draft, {
      type: ACTION,
      operation: 'restore',
      payload: initialWorkspace
    }),
    initialCommunication
  );
  assert.equal(
    communicationReducer(draft, {
      type: ACTION,
      operation: 'favourite',
      payload: 'hello'
    }),
    draft
  );
});

test('Undo deletion restores picture messages at their original position with media and enforces storage and schema limits', () => {
  const picture = {
    id: 'phrase-picture',
    language: 'yue',
    text: '水',
    segments: [
      {
        text: '水',
        image: '/symbols/open-aac/friend.svg',
        recording: 'data:audio/webm;base64,YQ=='
      }
    ]
  };
  const next = { id: 'phrase-next', language: 'en', text: 'Next' };
  const original = validateWorkspace({
    ...initialWorkspace,
    phrases: [picture, next]
  });
  const deleted = workspaceReducer(original, {
    type: ACTION,
    operation: 'delete-phrase',
    payload: picture.id
  });
  const restored = workspaceReducer(deleted, {
    type: ACTION,
    operation: 'restore-phrase',
    payload: { phrase: picture, index: 0 }
  });
  assert.deepEqual(restored, original);
  assert.equal(
    workspaceReducer(restored, {
      type: ACTION,
      operation: 'restore-phrase',
      payload: { phrase: picture, index: 0 }
    }),
    restored
  );
  assert.throws(() =>
    workspaceReducer(deleted, {
      type: ACTION,
      operation: 'restore-phrase',
      payload: {
        phrase: {
          ...picture,
          segments: [{ text: '水', image: 'javascript:alert(1)' }]
        },
        index: 0
      }
    })
  );
  assert.throws(() =>
    workspaceReducer(
      {
        ...original,
        phrases: Array.from({ length: 100 }, (_, index) => ({
          ...next,
          id: `phrase-${index}`
        }))
      },
      {
        type: ACTION,
        operation: 'restore-phrase',
        payload: { phrase: picture, index: 0 }
      }
    )
  );
  const { showScanControl, ...oldPreferences } = initialWorkspace.preferences;
  assert.equal(
    validateWorkspace({ ...initialWorkspace, preferences: oldPreferences })
      .preferences.showScanControl,
    false
  );
  assert.throws(() =>
    validateWorkspace({
      ...initialWorkspace,
      preferences: { ...oldPreferences, showScanControl: 'yes' }
    })
  );
});
