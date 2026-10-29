export const LANGUAGES = [
  {
    id: 'yue',
    label: '廣東話',
    name: 'Cantonese',
    tag: 'yue-HK',
    html: 'zh-HK'
  },
  { id: 'en', label: 'English', name: 'English', tag: 'en-GB', html: 'en' },
  { id: 'cmn', label: '普通话', name: 'Mandarin', tag: 'zh-CN', html: 'zh-CN' }
];
export const DEFAULT_LANGUAGE = 'yue';
export const languageInfo = (id) =>
  LANGUAGES.find((l) => l.id === id) || LANGUAGES[0];

export function matchesLanguage(voice, language) {
  const tag = (voice?.lang || '').replace(/_/g, '-').toLowerCase();
  if (language === 'yue')
    return (
      /^yue(?:-|$)/.test(tag) ||
      /^zh-(?:yue(?:-|$)|(?:hant-)?hk(?:-|$))/.test(tag)
    );
  if (language === 'cmn')
    return (
      !matchesLanguage(voice, 'yue') &&
      (/^cmn(?:-|$)/.test(tag) ||
        /^zh(?:-(?:cn|tw|sg|hans|hant)(?:-|$))?$/.test(tag))
    );
  return /^en(?:-|$)/.test(tag);
}

export function selectVoice(voices, language, preferredURI) {
  const matching = voices.filter((voice) => matchesLanguage(voice, language));
  return (
    matching.find((voice) => voice.voiceURI === preferredURI) ||
    matching.find((voice) => voice.localService === true) ||
    matching[0] ||
    null
  );
}

export const joinWords = (words, language) =>
  words.join(language === 'en' ? ' ' : '');
export const normalizeSpeechText = (text) =>
  text.toLocaleLowerCase().replace(/[\s。，！？,.!?]/g, '');
