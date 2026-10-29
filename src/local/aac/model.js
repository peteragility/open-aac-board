import { DEFAULT_LANGUAGE, LANGUAGES } from './languages.js';
import { validateLocalMediaURL } from '../media.js';
import { parseBoardJSON } from '../importValidation.js';

export const ACTION = 'open-aac/workspace';
export const initialWorkspace = {
  language: DEFAULT_LANGUAGE,
  preferences: {
    density: 'comfortable',
    contrast: false,
    largeText: false,
    speakOnTap: true,
    haptics: false,
    scanDelay: 2,
    rate: 1
  },
  voices: { yue: '', en: '', cmn: '' },
  voiceChecks: [],
  overrides: {},
  phrases: [],
  favourites: ['need-water', 'need-help', 'give-time'],
  routine: ['brush', 'eat', 'school', 'home'],
  routineDone: []
};
const validLanguage = (id) => LANGUAGES.some((l) => l.id === id);
const safeText = (value, max = 100) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const safeID = (id) => typeof id === 'string' && /^[a-z0-9-]{1,80}$/.test(id);

export function validateWorkspace(value) {
  if (JSON.stringify(value)?.length > 24 * 1024 * 1024)
    throw new Error(
      'Workspace is too large. Use smaller pictures or shorter recordings.'
    );
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !validLanguage(value.language)
  )
    throw new Error('Invalid communication backup.');
  const p = value.preferences;
  if (
    !p ||
    !['comfortable', 'large', 'compact'].includes(p.density) ||
    ![1, 2, 3, 4].includes(p.scanDelay) ||
    ![0.75, 1, 1.25].includes(p.rate)
  )
    throw new Error('Invalid accessibility settings.');
  for (const field of ['contrast', 'largeText', 'speakOnTap', 'haptics'])
    if (typeof p[field] !== 'boolean')
      throw new Error('Invalid accessibility setting.');
  const voices = {};
  const voiceChecks = value.voiceChecks ?? [];
  if (
    !Array.isArray(voiceChecks) ||
    voiceChecks.some((id) => !validLanguage(id))
  )
    throw new Error('Invalid voice checks.');
  for (const l of LANGUAGES) {
    const uri = value.voices?.[l.id];
    if (typeof uri !== 'string' || uri.length > 1000)
      throw new Error('Invalid voice setting.');
    voices[l.id] = uri;
  }
  if (
    !value.overrides ||
    typeof value.overrides !== 'object' ||
    Array.isArray(value.overrides) ||
    Object.keys(value.overrides).length > 200
  )
    throw new Error('Invalid word customizations.');
  const overrides = {};
  for (const [id, word] of Object.entries(value.overrides)) {
    if (!safeID(id) || !word || typeof word !== 'object')
      throw new Error('Invalid customized word.');
    const entry = { recordings: {} };
    for (const l of LANGUAGES) {
      if (!safeText(word[l.id], 80))
        throw new Error('Enter a label in each language.');
      entry[l.id] = word[l.id];
      const sound = word.recordings?.[l.id];
      if (sound) {
        validateLocalMediaURL(sound);
        if (!sound.startsWith('data:audio/') || sound.length > 2 * 1024 * 1024)
          throw new Error('Invalid recording.');
        entry.recordings[l.id] = sound;
      }
    }
    if (word.image) {
      validateLocalMediaURL(word.image);
      if (
        !word.image.startsWith('data:image/') ||
        word.image.length > 3 * 1024 * 1024
      )
        throw new Error('Invalid picture.');
      entry.image = word.image;
    }
    overrides[id] = entry;
  }
  if (
    !Array.isArray(value.phrases) ||
    value.phrases.length > 100 ||
    value.phrases.some(
      (p) =>
        !p ||
        !safeID(p.id) ||
        !validLanguage(p.language) ||
        !safeText(p.text, 500)
    )
  )
    throw new Error('Invalid saved phrases.');
  for (const field of ['favourites', 'routine', 'routineDone']) {
    if (
      !Array.isArray(value[field]) ||
      value[field].length > 100 ||
      value[field].some((id) => !safeID(id))
    )
      throw new Error('Invalid word list.');
  }
  if (
    new Set(value.routine).size !== value.routine.length ||
    value.routine.length > 8
  )
    throw new Error('Invalid routine.');
  return {
    language: value.language,
    preferences: {
      density: p.density,
      contrast: p.contrast,
      largeText: p.largeText,
      speakOnTap: p.speakOnTap,
      haptics: p.haptics,
      scanDelay: p.scanDelay,
      rate: p.rate
    },
    voices,
    voiceChecks: [...new Set(voiceChecks)],
    overrides,
    phrases: value.phrases.map(({ id, language, text }) => ({
      id,
      language,
      text
    })),
    favourites: [...new Set(value.favourites)],
    routine: [...value.routine],
    routineDone: value.routineDone.filter((id) => value.routine.includes(id))
  };
}

export function workspaceReducer(state = initialWorkspace, action) {
  if (action.type !== ACTION) return state;
  const { operation, payload } = action;
  switch (operation) {
    case 'language':
      return validLanguage(payload) ? { ...state, language: payload } : state;
    case 'preferences':
      return { ...state, preferences: { ...state.preferences, ...payload } };
    case 'voice':
      return {
        ...state,
        voices: { ...state.voices, [state.language]: payload },
        voiceChecks: (state.voiceChecks || []).filter(
          (id) => id !== state.language
        )
      };
    case 'voice-check':
      return validLanguage(payload)
        ? {
            ...state,
            voiceChecks: [...new Set([...(state.voiceChecks || []), payload])]
          }
        : state;
    case 'word':
      return {
        ...state,
        overrides: { ...state.overrides, [payload.id]: payload.word }
      };
    case 'reset-word': {
      const overrides = { ...state.overrides };
      delete overrides[payload];
      return { ...state, overrides };
    }
    case 'save-phrase':
      return state.phrases.length >= 100
        ? state
        : { ...state, phrases: [...state.phrases, payload] };
    case 'delete-phrase':
      return {
        ...state,
        phrases: state.phrases.filter((p) => p.id !== payload)
      };
    case 'favourite':
      return {
        ...state,
        favourites: state.favourites.includes(payload)
          ? state.favourites.filter((id) => id !== payload)
          : [...state.favourites, payload]
      };
    case 'routine':
      return { ...state, routine: payload, routineDone: [] };
    case 'routine-done':
      return {
        ...state,
        routineDone: state.routineDone.includes(payload)
          ? state.routineDone.filter((id) => id !== payload)
          : [...state.routineDone, payload]
      };
    case 'reset-routine':
      return { ...state, routineDone: [] };
    case 'restore':
      // A backup can come from another device with different installed voices.
      return { ...validateWorkspace(payload), voiceChecks: [] };
    default:
      return state;
  }
}

export function createWorkspaceBackup(workspace) {
  return JSON.stringify(
    {
      format: 'open-aac-workspace',
      version: 1,
      workspace: validateWorkspace(workspace)
    },
    null,
    2
  );
}

export function parseWorkspaceBackup(text) {
  const backup = parseBoardJSON(text);
  if (backup?.format !== 'open-aac-workspace' || backup.version !== 1)
    throw new Error('Choose an Open AAC workspace backup.');
  return validateWorkspace(backup.workspace);
}
