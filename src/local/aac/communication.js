// Open AAC Board addition, 2026-10-29. GPL-3.0-only; see LICENSE.txt.
import { ACTION } from './model.js';
import { LANGUAGES } from './languages.js';

export const COMMUNICATION_ACTION = 'open-aac/communication';
export const initialCommunication = {
  section: 'board',
  category: 'core',
  tokens: [],
  phrase: null,
  typed: '',
  guideRequested: false
};
const safeID = (id) =>
  typeof id === 'string' &&
  /^[a-z0-9-]{1,80}$/.test(id) &&
  !['constructor', 'prototype'].includes(id);

// Only the latest two drafts are retained, without copying pictures or audio.
export function validateCommunication(value) {
  if (
    !value ||
    !['board', 'quick', 'typing', 'routine'].includes(value.section) ||
    !['core', 'personal', 'food', 'feelings', 'people', 'places'].includes(
      value.category
    ) ||
    !Array.isArray(value.tokens) ||
    value.tokens.length > 30 ||
    !value.tokens.every(safeID) ||
    typeof value.typed !== 'string' ||
    value.typed.length > 500 ||
    typeof value.guideRequested !== 'boolean'
  )
    throw new Error('Invalid communication draft.');
  let phrase = null;
  if (value.phrase !== null) {
    const p = value.phrase;
    if (
      !p ||
      !safeID(p.id) ||
      !LANGUAGES.some((language) => language.id === p.language) ||
      typeof p.text !== 'string' ||
      !p.text.trim() ||
      p.text.length > 500
    )
      throw new Error('Invalid phrase draft.');
    phrase = { id: p.id, language: p.language, text: p.text };
  }
  return {
    section: value.section,
    category: value.category,
    tokens: [...value.tokens],
    phrase,
    typed: value.typed,
    guideRequested: value.guideRequested
  };
}

export function recoverCommunication(value) {
  try {
    return validateCommunication(value);
  } catch {
    return initialCommunication;
  }
}

export function communicationReducer(state = initialCommunication, action) {
  if (action.type === ACTION && action.operation === 'restore')
    return initialCommunication;
  if (
    action.type === ACTION &&
    action.operation === 'language' &&
    LANGUAGES.some((language) => language.id === action.payload) &&
    state.phrase &&
    state.phrase.language !== action.payload
  )
    return { ...state, phrase: null };
  if (action.type === ACTION && action.operation === 'delete-custom-word')
    return {
      ...state,
      tokens: state.tokens.filter((id) => id !== action.payload)
    };
  if (action.type !== COMMUNICATION_ACTION) return state;
  const next = validateCommunication({ ...state, ...action.payload });
  return JSON.stringify(next) === JSON.stringify(state) ? state : next;
}
