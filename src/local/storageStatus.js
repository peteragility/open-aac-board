// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
// Storage problems can happen before the app renders (while the saved board is
// read), so their state lives here and the notice reads it whenever it mounts.

const listeners = new Set();
let status = { writeFailed: false, unreadable: false, otherTab: null };

export function getStorageStatus() {
  return status;
}

export function setStorageStatus(patch) {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener(status));
}

export function subscribeStorageStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Test helper.
export function resetStorageStatus() {
  status = { writeFailed: false, unreadable: false, otherTab: null };
  listeners.forEach((listener) => listener(status));
}
