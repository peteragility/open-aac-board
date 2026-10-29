import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import downloader from '../../scripts/limit-precache.cjs';

test('offline preparation bounds concurrent downloads and retries a transient failure', async () => {
  let active = 0,
    maximum = 0;
  const complete = [],
    attempts = new Map();
  await downloader.cacheWithLimit(
    Array.from({ length: 120 }, (_, i) => i),
    async (item) => {
      const count = (attempts.get(item) || 0) + 1;
      attempts.set(item, count);
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      if (item === 7 && count === 1)
        throw new Error('transient network failure');
      complete.push(item);
    },
    16,
    0
  );
  assert.ok(maximum <= 16);
  assert.equal(new Set(complete).size, 120);
  assert.equal(attempts.get(7), 2);
});

test('permanent download failures fail installation after bounded retries', async () => {
  let attempts = 0;
  await assert.rejects(
    downloader.cacheWithLimit(
      ['bad'],
      async () => {
        attempts++;
        throw new Error('404');
      },
      16,
      0
    ),
    /404/
  );
  assert.equal(attempts, 3);
});

test('worker transformation preserves install code, is valid JavaScript, and rejects unknown generator output', () => {
  const fixture = `self.addEventListener('install', function(event) {
    event.waitUntil(caches.open(cacheName).then(function(cache) {
      return setOfCachedUrls(cache).then(function(cachedUrls) {
        return Promise.all(
          Array.from(urlsToCacheKeys.values()).map(function(cacheKey) {
            if (!cachedUrls.has(cacheKey)) return fetch(cacheKey).then(function(r) { return cache.put(cacheKey, r); });
          })
        );
      });
    }));
  });`;
  const transformed = downloader.rewriteServiceWorker(fixture);
  assert.ok(transformed.includes('}, 16);'));
  assert.ok(transformed.includes('cache.put(cacheKey, r)'));
  new vm.Script(transformed);
  assert.equal(downloader.rewriteServiceWorker(transformed), transformed);
  assert.throws(
    () => downloader.rewriteServiceWorker('changed generator output'),
    /Unexpected sw-precache/
  );
});
