// Open AAC Board additions, 2026-10-29. GPL-3.0-only.
import { LANGUAGES } from './languages.js';

export function workspaceWords(starterWords, workspace, language) {
  return [
    ...starterWords.map((word) => ({
      ...word,
      ...workspace.overrides[word.id]
    })),
    ...(workspace.customWords || []).map((word) => ({
      ...word,
      category: 'personal',
      tone: 'person',
      symbol: '/symbols/open-aac/friend.svg',
      personal: true
    }))
  ].map((word) => {
    const labelLanguage = word[language]?.trim()
      ? language
      : LANGUAGES.find((l) => word[l.id]?.trim())?.id;
    return {
      ...word,
      translated: Boolean(word[language]?.trim()),
      text: word[labelLanguage] || '',
      labelLanguage,
      image: word.image || word.symbol,
      recording: word.recordings?.[language]
    };
  });
}

export function pictureSegments(words) {
  return words.map((word) => ({
    text: word.text,
    ...(word.image ? { image: word.image } : {}),
    ...(word.recording ? { recording: word.recording } : {})
  }));
}
