// Open AAC Board addition, 2026-11-03. GPL-3.0-only; see LICENSE.txt.
/* global globalThis */
// The whole workspace is persisted as one record. These guards make sure that
// record is only ever replaced by a state that was loaded from it, by the one
// tab that owns it, and that a failed save is reported instead of ignored.
import { setStorageStatus } from './storageStatus.js';

const alwaysWriter = {
  ready: Promise.resolve(true),
  isWriter: () => true,
  canWrite: async () => true
};

export function createPersistGuard(
  storage,
  { tab = alwaysWriter, report = setStorageStatus } = {}
) {
  // key -> true once its stored value (or its confirmed absence) has been read.
  const loaded = new Map();
  return {
    async getItem(key) {
      try {
        const value = await storage.getItem(key);
        loaded.set(key, true);
        return value;
      } catch (error) {
        loaded.set(key, false);
        report({ unreadable: true });
        throw error;
      }
    },
    async setItem(key, value) {
      // redux-persist writes its initial state after a failed or timed-out
      // read. Refuse, so an unread board can never replace the saved one.
      if (loaded.get(key) !== true)
        throw new Error('Not saving "' + key + '": it was never read.');
      // Another tab owns the workspace; this tab shows a notice instead.
      if (!(await tab.canWrite())) return undefined;
      try {
        return await storage.setItem(key, value);
      } catch (error) {
        report({ writeFailed: true });
        throw error;
      }
    },
    removeItem(key) {
      return storage.removeItem(key);
    }
  };
}

// Only one tab may save at a time; otherwise two open tabs silently overwrite
// each other's changes. Browsers without the Web Locks API keep the previous
// behaviour (every tab saves).
export function createTabLock({
  locks = globalThis.navigator?.locks,
  name = 'open-aac-board-writer',
  takeOver = false,
  report = setStorageStatus
} = {}) {
  if (!locks || typeof locks.request !== 'function') return alwaysWriter;
  let writer = false;
  const ready = new Promise((resolve) => {
    locks
      .request(
        name,
        takeOver ? { steal: true } : { ifAvailable: true },
        (lock) => {
          if (!lock) {
            resolve(false);
            report({ otherTab: 'open' });
            waitForRelease();
            return undefined;
          }
          writer = true;
          resolve(true);
          // Held until this tab closes or another tab takes over.
          return new Promise(() => {});
        }
      )
      .catch(() => {
        // Another tab took over (the stolen lock's request rejects).
        const wasWriter = writer;
        writer = false;
        resolve(false);
        if (wasWriter) {
          report({ otherTab: 'open' });
          waitForRelease();
        }
      });
  });
  function waitForRelease() {
    // When the other tab closes this request is granted; release it at once.
    // This tab's state may be older than what the other tab saved, so it must
    // reload before saving.
    locks
      .request(name, () => {
        report({ otherTab: 'closed' });
        return undefined;
      })
      .catch(() => {});
  }
  return {
    ready,
    isWriter: () => writer,
    async canWrite() {
      await ready;
      return writer;
    }
  };
}

export const TAKE_OVER_KEY = 'open-aac-board-take-over';

// Reads and clears the one-shot "use this tab" request set before a reload.
export function consumeTakeOver(store = globalThis.sessionStorage) {
  try {
    const requested = store?.getItem(TAKE_OVER_KEY) === '1';
    store?.removeItem(TAKE_OVER_KEY);
    return requested;
  } catch {
    return false;
  }
}

export function requestTakeOver(
  store = globalThis.sessionStorage,
  reload = () => globalThis.location.reload()
) {
  try {
    store?.setItem(TAKE_OVER_KEY, '1');
  } catch {}
  reload();
}
