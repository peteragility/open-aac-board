const MAX_JSON_CHARS = 32 * 1024 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function parseBoardJSON(text) {
  if (typeof text !== 'string' || text.length > MAX_JSON_CHARS) {
    throw new Error('This board file is too large.');
  }
  return JSON.parse(text, (key, value) => {
    if (FORBIDDEN_KEYS.has(key))
      throw new Error('Unsafe property in board file.');
    return value;
  });
}

function validateMedia(value) {
  if (value == null || value === '') return;
  // Reject ASCII controls before interpreting imported media references.
  // eslint-disable-next-line no-control-regex
  if (
    typeof value !== 'string' ||
    value.length > MAX_JSON_CHARS ||
    /[\u0000-\u001f]/.test(value)
  ) {
    throw new Error('Invalid media reference.');
  }
  if (/^\/?symbols\/[a-zA-Z0-9_./% -]+$/.test(value) && !value.includes('..'))
    return;
  if (
    /^data:(image\/(png|jpeg|webp|gif|svg\+xml)|audio\/(webm|ogg|mpeg|mp3|mp4|wav|x-wav))(;codecs=[\w.-]+)?;base64,[A-Za-z0-9+/=]*$/i.test(
      value
    )
  )
    return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return;
  } catch {
    /* Unsupported relative URLs are rejected below. */
  }
  throw new Error(
    'Only local symbols, embedded pictures/audio, and HTTPS media are supported.'
  );
}

export function validateImportedBoards(boards) {
  if (!Array.isArray(boards) || boards.length > 500)
    throw new Error('Invalid board collection.');
  let tiles = 0;
  for (const board of boards) {
    if (!board || typeof board !== 'object' || !Array.isArray(board.tiles))
      throw new Error('Invalid board.');
    if (
      board.name != null &&
      (typeof board.name !== 'string' || board.name.length > 1000)
    )
      throw new Error('Invalid board name.');
    if ((tiles += board.tiles.length) > 20000)
      throw new Error('Too many tiles in this backup.');
    validateMedia(board.caption);
    for (const tile of board.tiles) {
      if (!tile || typeof tile !== 'object' || Array.isArray(tile))
        throw new Error('Invalid tile.');
      for (const field of ['label', 'vocalization']) {
        if (
          tile[field] != null &&
          (typeof tile[field] !== 'string' || tile[field].length > 10000)
        )
          throw new Error('Invalid tile text.');
      }
      validateMedia(tile.image);
      validateMedia(tile.sound);
    }
  }
  return boards;
}
