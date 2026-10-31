import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectVoice, matchesLanguage, joinWords } from './aac/languages.js';
import {
  initialWorkspace,
  workspaceReducer,
  ACTION,
  validateWorkspace,
  createWorkspaceBackup,
  parseWorkspaceBackup
} from './aac/model.js';
import { SpeechEngine } from './aac/speechEngine.js';
import { workspaceWords, pictureSegments } from './aac/vocabulary.js';

const catalog = JSON.parse(
  fs.readFileSync(new URL('./aac/catalog.json', import.meta.url))
);
const voices = [
  { voiceURI: 'mandarin', lang: 'zh-CN', localService: true },
  { voiceURI: 'english', lang: 'en-GB', localService: true },
  { voiceURI: 'cantonese-online', lang: 'yue-HK', localService: false },
  { voiceURI: 'cantonese-local', lang: 'zh-HK', localService: true }
];
function engine(available = voices, online = true) {
  const spoken = [],
    audio = [];
  const instance = new SpeechEngine({
    catalog: [...catalog.words, ...catalog.phrases],
    getSynth: () => ({
      getVoices: () => available,
      cancel() {},
      speak(utterance) {
        spoken.push(utterance);
        queueMicrotask(() => utterance.onend());
      }
    }),
    createUtterance: (text) => ({ text }),
    createAudio: () => ({
      pause() {},
      async play() {
        audio.push(this.src);
        queueMicrotask(() => this.onended?.());
      }
    }),
    isOnline: () => online
  });
  return { instance, spoken, audio };
}

test('Cantonese is default and voice matching never confuses Cantonese with Mandarin', () => {
  assert.equal(initialWorkspace.language, 'yue');
  assert.equal(selectVoice(voices, 'yue').voiceURI, 'cantonese-local');
  assert.equal(selectVoice(voices, 'cmn').voiceURI, 'mandarin');
  assert.equal(selectVoice(voices, 'en').voiceURI, 'english');
  assert.equal(selectVoice(voices.slice(0, 2), 'yue'), null);
  for (const lang of ['yue-HK', 'yue_CN', 'zh-HK', 'zh-yue-HK', 'zh-Hant-HK']) {
    assert.ok(matchesLanguage({ lang }, 'yue'));
    assert.equal(matchesLanguage({ lang }, 'cmn'), false);
  }
  for (const lang of ['zh-CN', 'zh-TW', 'en-HK', 'zh-Hant-TW'])
    assert.equal(matchesLanguage({ lang }, 'yue'), false);
});

test('matching voice speaks the sentence with the selected language and rate', async () => {
  const { instance, spoken, audio } = engine();
  await instance.speak({ text: '我想飲水', language: 'yue', rate: 0.75 });
  assert.equal(spoken[0].voice.voiceURI, 'cantonese-local');
  assert.equal(spoken[0].lang, 'zh-HK');
  assert.equal(spoken[0].rate, 0.75);
  assert.deepEqual(audio, []);
  assert.equal(joinWords(['我', '想', '飲', '水'], 'yue'), '我想飲水');
  assert.equal(joinWords(['I', 'want', 'water'], 'en'), 'I want water');
});

test('included Cantonese audio handles full phrases and word sequences without a device voice', async () => {
  const { instance, spoken, audio } = engine(voices.slice(0, 2));
  await instance.speak({ text: '我想飲水。', language: 'yue' });
  assert.deepEqual(audio, ['/audio/yue/need-water.mp3']);
  audio.length = 0;
  await instance.speak({
    text: '我想食飯',
    language: 'yue',
    segments: ['我', '想', '食', '飯'].map((text) => ({ text }))
  });
  assert.deepEqual(audio, [
    '/audio/yue/i.mp3',
    '/audio/yue/want.mp3',
    '/audio/yue/eat.mp3',
    '/audio/yue/rice.mp3'
  ]);
  assert.equal(spoken.length, 0);
  await assert.rejects(
    instance.speak({ text: '一段新輸入嘅說話', language: 'yue' }),
    /missing-voice/
  );
});

test('personal recordings override synthetic voices and remote voices use bundled audio offline', async () => {
  const recording = 'data:audio/webm;base64,YQ==';
  const first = engine();
  await first.instance.speak({
    text: '我',
    language: 'yue',
    segments: [{ text: '我', recording }]
  });
  assert.deepEqual(first.audio, [recording]);
  assert.equal(first.spoken.length, 0);
  await first.instance.speak({
    text: '我想要暖水',
    language: 'yue',
    segments: [{ text: '我', recording }, { text: '想要暖水' }]
  });
  assert.equal(first.spoken.at(-1).text, '想要暖水');
  assert.equal(first.spoken.at(-1).voice.lang, 'zh-HK');
  const offline = engine([voices[2]], false);
  await offline.instance.speak({ text: '水', language: 'yue' });
  assert.deepEqual(offline.audio, ['/audio/yue/water.mp3']);
});

test('workspace backup round-trips pictures, recordings, language, routines and saved phrases', () => {
  const workspace = {
    ...initialWorkspace,
    language: 'cmn',
    overrides: {
      water: {
        yue: '暖水',
        en: 'warm water',
        cmn: '温水',
        image: 'data:image/png;base64,YQ==',
        recordings: { yue: 'data:audio/webm;base64,YQ==' }
      }
    },
    phrases: [
      {
        id: 'phrase-one',
        language: 'yue',
        text: '<script>this stays plain text</script>'
      }
    ],
    routineDone: ['brush']
  };
  assert.deepEqual(
    parseWorkspaceBackup(createWorkspaceBackup(workspace)),
    workspace
  );
  assert.equal(
    workspaceReducer(workspace, {
      type: ACTION,
      operation: 'language',
      payload: 'en'
    }).language,
    'en'
  );
  assert.equal(
    workspaceReducer(workspace, {
      type: ACTION,
      operation: 'language',
      payload: 'fr'
    }),
    workspace
  );
});

test('workspace imports reject malformed preferences, active media, oversized text and prototype keys', () => {
  const wrap = (workspace) =>
    JSON.stringify({ format: 'open-aac-workspace', version: 1, workspace });
  for (const patch of [
    { voiceChecks: ['invalid'] },
    { language: 'invalid' },
    { preferences: { ...initialWorkspace.preferences, scanDelay: 0 } },
    {
      overrides: {
        water: {
          yue: '水',
          en: 'water',
          cmn: '水',
          image: 'javascript:alert(1)'
        }
      }
    },
    {
      overrides: {
        water: {
          yue: '水',
          en: 'water',
          cmn: '水',
          recordings: { yue: 'data:text/html;base64,YQ==' }
        }
      }
    },
    { phrases: [{ id: 'phrase-one', language: 'yue', text: 'a'.repeat(501) }] },
    { routine: Array(9).fill('water') }
  ])
    assert.throws(() =>
      parseWorkspaceBackup(wrap({ ...initialWorkspace, ...patch }))
    );
  assert.throws(() => parseWorkspaceBackup('{"__proto__":{}}'));
});

test('voice confirmations migrate old backups and reset when the selected voice changes', () => {
  const { voiceChecks, ...oldWorkspace } = initialWorkspace;
  const migrated = parseWorkspaceBackup(
    JSON.stringify({
      format: 'open-aac-workspace',
      version: 1,
      workspace: oldWorkspace
    })
  );
  assert.deepEqual(migrated.voiceChecks, []);
  const confirmed = workspaceReducer(migrated, {
    type: ACTION,
    operation: 'voice-check',
    payload: 'yue'
  });
  assert.deepEqual(confirmed.voiceChecks, ['yue']);
  assert.deepEqual(
    parseWorkspaceBackup(createWorkspaceBackup(confirmed)).voiceChecks,
    ['yue']
  );
  const changed = workspaceReducer(confirmed, {
    type: ACTION,
    operation: 'voice',
    payload: 'another-voice'
  });
  assert.deepEqual(changed.voiceChecks, []);
  assert.deepEqual(
    workspaceReducer(confirmed, {
      type: ACTION,
      operation: 'restore',
      payload: confirmed
    }).voiceChecks,
    []
  );
});

test('every starter word and phrase has three labels, local artwork and three bundled MP3s', () => {
  const entries = [...catalog.words, ...catalog.phrases];
  assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
  for (const item of entries) {
    assert.ok(
      fs.existsSync(new URL(`../../public${item.symbol}`, import.meta.url)),
      item.id
    );
    for (const language of ['yue', 'en', 'cmn']) {
      assert.ok(item[language]);
      const file = new URL(
        `../../public/audio/${language}/${item.id}.mp3`,
        import.meta.url
      );
      assert.ok(fs.statSync(file).size > 100, `${language}/${item.id}`);
    }
  }
});

test('version 1 workspaces migrate without losing existing edits, recordings or phrases', () => {
  const { customWords, quickResponses, ...oldWorkspace } = initialWorkspace;
  const restored = parseWorkspaceBackup(
    JSON.stringify({
      format: 'open-aac-workspace',
      version: 1,
      workspace: oldWorkspace
    })
  );
  assert.deepEqual(restored.customWords, []);
  assert.deepEqual(restored.quickResponses, [
    'give-time',
    'no-thanks',
    'dont-understand',
    'need-help'
  ]);
  assert.deepEqual(
    parseWorkspaceBackup(createWorkspaceBackup(restored)),
    restored
  );
  assert.equal(JSON.parse(createWorkspaceBackup(restored)).version, 2);
});

test('personal words have optional translations and never acquire an implicit different-language voice', () => {
  const word = {
    id: 'custom-nurse',
    language: 'yue',
    yue: '陳姑娘',
    en: '',
    cmn: '',
    recordings: { yue: 'data:audio/webm;base64,YQ==' }
  };
  const state = workspaceReducer(initialWorkspace, {
    type: ACTION,
    operation: 'custom-word',
    payload: word
  });
  assert.deepEqual(parseWorkspaceBackup(createWorkspaceBackup(state)), state);
  const english = workspaceWords(catalog.words, state, 'en');
  assert.deepEqual(
    english.slice(0, catalog.words.length).map((entry) => entry.id),
    catalog.words.map((entry) => entry.id)
  );
  assert.equal(english.at(-1).text, '陳姑娘');
  assert.equal(english.at(-1).translated, false);
  assert.equal(english.at(-1).labelLanguage, 'yue');
  assert.equal(english.at(-1).recording, undefined);
  assert.equal(
    workspaceWords(catalog.words, state, 'yue').at(-1).recording,
    word.recordings.yue
  );
});

test('saved picture messages retain snapshot media after personal word edits and deletion', async () => {
  const word = {
    id: 'custom-nurse',
    language: 'yue',
    yue: '陳姑娘',
    en: '',
    cmn: '',
    image: 'data:image/png;base64,YQ==',
    recordings: { yue: 'data:audio/webm;base64,YQ==' }
  };
  let state = workspaceReducer(initialWorkspace, {
    type: ACTION,
    operation: 'custom-word',
    payload: word
  });
  const words = workspaceWords(catalog.words, state, 'yue');
  const selected = [words[0], words.at(-1)];
  state = workspaceReducer(state, {
    type: ACTION,
    operation: 'save-phrase',
    payload: {
      id: 'phrase-picture',
      language: 'yue',
      text: '我陳姑娘',
      segments: pictureSegments(selected)
    }
  });
  state = workspaceReducer(state, {
    type: ACTION,
    operation: 'delete-custom-word',
    payload: word.id
  });
  const restored = parseWorkspaceBackup(createWorkspaceBackup(state));
  assert.deepEqual(restored.customWords, []);
  assert.equal(restored.phrases[0].segments[1].image, word.image);
  const { instance, audio, spoken } = engine(voices.slice(0, 2));
  await instance.speak({ ...restored.phrases[0] });
  assert.deepEqual(audio, ['/audio/yue/i.mp3', word.recordings.yue]);
  assert.deepEqual(spoken, []);
});

test('imports reject unsafe personal media, duplicate IDs, invalid quick responses and inconsistent snapshots', () => {
  const custom = {
    id: 'custom-nurse',
    language: 'yue',
    yue: '陳姑娘',
    en: '',
    cmn: '',
    recordings: {}
  };
  const phrase = {
    id: 'phrase-one',
    language: 'yue',
    text: '水',
    segments: [{ text: '水', image: '/symbols/mulberry/water.svg' }]
  };
  for (const patch of [
    { customWords: [{ ...custom, id: 'water' }] },
    { customWords: [custom, custom] },
    { customWords: [{ ...custom, yue: '' }] },
    {
      customWords: [{ ...custom, image: 'https://tracking.invalid/image.png' }]
    },
    {
      customWords: [
        { ...custom, recordings: { yue: 'data:text/html;base64,YQ==' } }
      ]
    },
    { quickResponses: [] },
    { quickResponses: ['give-time', 'give-time'] },
    { quickResponses: ['made-up'] },
    { phrases: [{ ...phrase, text: 'a different message' }] },
    { phrases: [phrase, phrase] },
    {
      phrases: [
        {
          ...phrase,
          segments: [{ text: '水', image: '/symbols/../secret.svg' }]
        }
      ]
    },
    {
      phrases: [
        { ...phrase, segments: [{ text: '水', image: 'javascript:alert(1)' }] }
      ]
    },
    {
      phrases: [
        {
          ...phrase,
          segments: [
            { text: '水', recording: 'https://tracking.invalid/voice.mp3' }
          ]
        }
      ]
    }
  ])
    assert.throws(() => validateWorkspace({ ...initialWorkspace, ...patch }));
  const large = {
    ...phrase,
    segments: Array.from({ length: 30 }, () => ({
      text: '水',
      image: 'data:image/png;base64,' + 'YQ=='.repeat(250000)
    })),
    text: '水'.repeat(30)
  };
  assert.throws(
    () =>
      workspaceReducer(initialWorkspace, {
        type: ACTION,
        operation: 'save-phrase',
        payload: large
      }),
    /too large/
  );
});

test('a missing optional label on an edited starter word does not silently revert to the old label', () => {
  const state = {
    ...initialWorkspace,
    overrides: { water: { yue: '暖水', en: '', cmn: '', recordings: {} } }
  };
  const word = workspaceWords(catalog.words, state, 'en').find(
    (entry) => entry.id === 'water'
  );
  assert.equal(word.translated, false);
  assert.equal(word.text, '暖水');
});

test('install hint preference round-trips and defaults for older workspaces', () => {
  const dismissed = validateWorkspace({
    ...initialWorkspace,
    preferences: {
      ...initialWorkspace.preferences,
      installHintDismissed: true
    }
  });
  assert.equal(dismissed.preferences.installHintDismissed, true);
  const { preferences, ...legacy } = initialWorkspace;
  const { installHintDismissed, ...legacyPreferences } = preferences;
  assert.equal(installHintDismissed, false);
  assert.equal(
    validateWorkspace({ ...legacy, preferences: legacyPreferences }).preferences
      .installHintDismissed,
    false
  );
  assert.throws(
    () =>
      validateWorkspace({
        ...initialWorkspace,
        preferences: { ...preferences, installHintDismissed: 'yes' }
      }),
    /Invalid install hint preference/
  );
});

test('share and install hint copy exists in all three languages', async () => {
  const { copy } = await import('./aac/copy.js');
  for (const language of ['yue', 'en', 'cmn']) {
    const c = copy(language);
    for (const key of [
      'share',
      'shareShort',
      'copied',
      'copyFailed',
      'installHintTitle',
      'installHintSteps',
      'installHintDismiss'
    ]) {
      assert.ok(
        typeof c[key] === 'string' && c[key].trim(),
        `${language} ${key}`
      );
    }
  }
});
