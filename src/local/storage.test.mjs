import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consumeTakeOver,
  createPersistGuard,
  createTabLock,
  requestTakeOver,
  TAKE_OVER_KEY
} from './persistGuard.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: async (key) => (key in data ? data[key] : null),
    setItem: async (key, value) => {
      data[key] = value;
    },
    removeItem: async (key) => {
      delete data[key];
    }
  };
}

// Minimal Web Locks model: exclusive locks, ifAvailable, steal and a queue.
function fakeLocks() {
  let holder = null;
  const queue = [];
  function grant(entry) {
    const result = Promise.resolve(entry.callback({ name: entry.name }));
    holder = entry;
    result.then(
      (value) => {
        if (holder === entry) release();
        entry.resolve(value);
      },
      (error) => {
        if (holder === entry) release();
        entry.reject(error);
      }
    );
  }
  function release() {
    holder = null;
    const next = queue.shift();
    if (next) grant(next);
  }
  return {
    request(name, options, callback) {
      if (typeof options === 'function') [callback, options] = [options, {}];
      return new Promise((resolve, reject) => {
        const entry = { name, callback, resolve, reject };
        if (options.steal && holder) {
          const stolen = holder;
          holder = null;
          stolen.reject(new Error('AbortError'));
          grant(entry);
        } else if (!holder) grant(entry);
        else if (options.ifAvailable)
          Promise.resolve(callback(null)).then(resolve, reject);
        else queue.push(entry);
      });
    },
    // A closed tab releases whatever it held.
    closeHolder() {
      holder.resolve();
      release();
    }
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a workspace is only saved after it was read, so a failed read never overwrites it', async () => {
  const reports = [];
  const saved = memoryStorage({ root: 'personal words' });
  const failing = {
    ...saved,
    getItem: async () => {
      throw new Error('IndexedDB unavailable');
    }
  };
  const guard = createPersistGuard(failing, {
    report: (patch) => reports.push(patch)
  });
  await assert.rejects(guard.getItem('root'), /IndexedDB unavailable/);
  await assert.rejects(guard.setItem('root', 'empty workspace'), /never read/);
  assert.equal(saved.data.root, 'personal words');
  assert.deepEqual(reports, [{ unreadable: true }]);

  const fresh = createPersistGuard(memoryStorage(), { report: () => {} });
  await assert.rejects(fresh.setItem('root', 'x'), /never read/);
  assert.equal(
    await fresh.getItem('root'),
    null,
    'a new device has nothing saved'
  );
  await fresh.setItem('root', 'first save');
  assert.equal(await fresh.getItem('root'), 'first save');
});

test('a failed save is reported and rejected instead of being ignored', async () => {
  const reports = [];
  const storage = memoryStorage({ root: 'old' });
  storage.setItem = async () => {
    throw new Error('QuotaExceededError');
  };
  const guard = createPersistGuard(storage, {
    report: (patch) => reports.push(patch)
  });
  await guard.getItem('root');
  await assert.rejects(guard.setItem('root', 'new'), /QuotaExceeded/);
  assert.deepEqual(reports, [{ writeFailed: true }]);
});

test('only one tab saves; another tab can take over, and a closed tab is noticed', async () => {
  const locks = fakeLocks();
  const shared = memoryStorage({ root: 'saved' });
  const firstReports = [];
  const secondReports = [];
  const first = createTabLock({ locks, report: (p) => firstReports.push(p) });
  const firstGuard = createPersistGuard(shared, {
    tab: first,
    report: (p) => firstReports.push(p)
  });
  assert.equal(await first.ready, true);

  const second = createTabLock({ locks, report: (p) => secondReports.push(p) });
  const secondGuard = createPersistGuard(shared, {
    tab: second,
    report: (p) => secondReports.push(p)
  });
  assert.equal(await second.ready, false);
  await firstGuard.getItem('root');
  await secondGuard.getItem('root');
  await secondGuard.setItem('root', 'stale copy from the second tab');
  assert.equal(shared.data.root, 'saved', 'a read-only tab does not save');
  await firstGuard.setItem('root', 'new word');
  assert.equal(shared.data.root, 'new word');
  assert.deepEqual(secondReports, [{ otherTab: 'open' }]);

  // The writer closes: the waiting tab learns it may reload to save.
  locks.closeHolder();
  await tick();
  assert.deepEqual(secondReports.at(-1), { otherTab: 'closed' });

  // A reloaded tab that asked to take over steals the lock from the current writer.
  const thirdReports = [];
  const third = createTabLock({ locks, report: (p) => thirdReports.push(p) });
  assert.equal(await third.ready, true);
  const fourthReports = [];
  const fourth = createTabLock({
    locks,
    takeOver: true,
    report: (p) => fourthReports.push(p)
  });
  assert.equal(await fourth.ready, true);
  await tick();
  assert.equal(third.isWriter(), false, 'the previous writer stops saving');
  assert.deepEqual(thirdReports, [{ otherTab: 'open' }]);
  assert.equal(await fourth.canWrite(), true);
  // When the tab that took over closes, the previous writer is told it may reload.
  locks.closeHolder();
  await tick();
  assert.deepEqual(thirdReports.at(-1), { otherTab: 'closed' });
});

test('browsers without Web Locks keep saving in every tab', async () => {
  const tab = createTabLock({ locks: undefined });
  assert.equal(await tab.canWrite(), true);
});

test('take-over is a one-shot request across a reload', () => {
  const values = {};
  const session = {
    getItem: (k) => values[k] ?? null,
    setItem: (k, v) => {
      values[k] = v;
    },
    removeItem: (k) => {
      delete values[k];
    }
  };
  let reloaded = false;
  requestTakeOver(session, () => {
    reloaded = true;
  });
  assert.equal(reloaded, true);
  assert.equal(values[TAKE_OVER_KEY], '1');
  assert.equal(consumeTakeOver(session), true);
  assert.equal(consumeTakeOver(session), false);
});
