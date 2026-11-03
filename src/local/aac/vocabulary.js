// Open AAC Board additions, 2026-10-29. GPL-3.0-only.
import { LANGUAGES } from './languages.js';

// Only the user's own changes apply on top of a starter word. Older edits also
// stored the word's picture, category and colour, which would otherwise hide
// later vocabulary updates.
const EDITABLE = ['yue', 'en', 'cmn', 'recordings', 'image'];
const userChanges = (override) =>
  Object.fromEntries(
    EDITABLE.filter((key) => override?.[key] !== undefined).map((key) => [
      key,
      override[key]
    ])
  );

export function workspaceWords(starterWords, workspace, language) {
  return [
    ...starterWords.map((word) => ({
      ...word,
      ...userChanges(workspace.overrides[word.id])
    })),
    ...(workspace.customWords || []).map((word) => ({
      ...word,
      category: 'personal',
      tone: 'person',
      symbol: '/symbols/open-aac/friend.svg',
      personal: true
    }))
  ].map((word) => {
    // Grammar words such as 咗 or 喇 exist only in some languages. They stay in
    // a message (flagged as untranslated) but are not offered on the boards.
    const available = !word.only || word.only.includes(language);
    const labelLanguage = word[language]?.trim()
      ? language
      : LANGUAGES.find((l) => word[l.id]?.trim())?.id;
    return {
      ...word,
      available,
      translated: available && Boolean(word[language]?.trim()),
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

const compact = (text) =>
  (text || '').toLocaleLowerCase().replace(/[\s'’-]/g, '');

// Search by any label, or by Jyutping with or without tone numbers
// ("seoi2", "seoi", "jam seoi"), so partners can find words by sound.
export function matchesQuery(word, query) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  if (
    [word.yue, word.en, word.cmn, word.text].some((label) =>
      (label || '').toLocaleLowerCase().includes(q)
    )
  )
    return true;
  if (!word.jyutping || !/^[a-z0-9\s'’-]+$/.test(q)) return false;
  const sound = compact(word.jyutping);
  const typed = compact(q);
  // A typed tone number must match; without one, any tone matches.
  return /[0-9]/.test(typed)
    ? sound.includes(typed)
    : sound.replace(/[1-6]/g, '').includes(typed);
}
