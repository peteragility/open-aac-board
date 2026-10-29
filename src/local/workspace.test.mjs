import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectVoice, matchesLanguage, joinWords } from './aac/languages.js';
import {
  initialWorkspace,
  workspaceReducer,
  ACTION,
  createWorkspaceBackup,
  parseWorkspaceBackup
} from './aac/model.js';
import { SpeechEngine } from './aac/speechEngine.js';

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
