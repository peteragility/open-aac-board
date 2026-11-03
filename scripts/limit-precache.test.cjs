const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  mediaRangeResponse,
  rewriteServiceWorker
} = require('./limit-precache.cjs');

const BYTES = Uint8Array.from({ length: 300 }, (_, i) => (i * 7 + 3) % 256);
const CLIP = 'https://app.test/audio/clip.mp3';

function media(bytes = BYTES, type = 'audio/mpeg') {
  return new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': type }
  });
}

async function bytesOf(response) {
  return new Uint8Array(await response.arrayBuffer());
}

// Matches the fetch-handler text that sw-precache generates (see build/service-worker.js).
const FETCH_SNIPPET = [
  'return cache.match(urlsToCacheKeys.get(url)).then(function(response) {',
  '            if (response) {',
  '              return response;',
  '            }',
  "            throw Error('The cached response that was expected is missing.');",
  '          });'
].join('\n');

const WORKER_FIXTURE = `self.addEventListener('install', function(event) {
    event.waitUntil(caches.open(cacheName).then(function(cache) {
      return setOfCachedUrls(cache).then(function(cachedUrls) {
        return Promise.all(
          Array.from(urlsToCacheKeys.values()).map(function(cacheKey) {
            if (!cachedUrls.has(cacheKey)) return fetch(cacheKey).then(function(r) { return cache.put(cacheKey, r); });
          })
        );
      });
    }));
  });
self.addEventListener('fetch', function(event) {
  if (event.request.method === 'GET') {
    var url = stripIgnoredUrlParameters(event.request.url, ignoreUrlParametersMatching);
    var shouldRespond = urlsToCacheKeys.has(url);
    if (shouldRespond) {
      event.respondWith(
        caches.open(cacheName).then(function(cache) {
          ${FETCH_SNIPPET}
        }).catch(function(e) {
          return fetch(event.request);
        })
      );
    }
  }
});`;

test('parses a-b, a-, and -n ranges into 206 bodies with the exact bytes', async () => {
  const closed = await mediaRangeResponse(media(), 'bytes=2-5', CLIP);
  assert.equal(closed.status, 206);
  assert.deepEqual(await bytesOf(closed), BYTES.slice(2, 6));

  const open = await mediaRangeResponse(media(), 'bytes=290-', CLIP);
  assert.equal(open.status, 206);
  assert.deepEqual(await bytesOf(open), BYTES.slice(290));

  const suffix = await mediaRangeResponse(media(), 'bytes=-4', CLIP);
  assert.equal(suffix.status, 206);
  assert.deepEqual(await bytesOf(suffix), BYTES.slice(296));
});

test('clamps an end past the file and a suffix longer than the file', async () => {
  const clamped = await mediaRangeResponse(media(), 'bytes=295-999', CLIP);
  assert.equal(clamped.status, 206);
  assert.equal(clamped.headers.get('Content-Range'), 'bytes 295-299/300');
  assert.deepEqual(await bytesOf(clamped), BYTES.slice(295));

  const whole = await mediaRangeResponse(media(), 'bytes=-1000', CLIP);
  assert.equal(whole.status, 206);
  assert.equal(whole.headers.get('Content-Range'), 'bytes 0-299/300');
  assert.deepEqual(await bytesOf(whole), BYTES);
});

test('sets Content-Range, Content-Length, Accept-Ranges, and keeps Content-Type', async () => {
  const partial = await mediaRangeResponse(
    media(BYTES, 'video/mp4'),
    'bytes=10-19',
    'https://app.test/clip'
  );
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('Content-Range'), 'bytes 10-19/300');
  assert.equal(partial.headers.get('Content-Length'), '10');
  assert.equal(partial.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(partial.headers.get('Content-Type'), 'video/mp4');
  assert.deepEqual(await bytesOf(partial), BYTES.slice(10, 20));
});

test('answers 416 with bytes */size when the range starts at or past the end', async () => {
  for (const range of ['bytes=300-', 'bytes=400-500']) {
    const response = await mediaRangeResponse(media(), range, CLIP);
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('Content-Range'), 'bytes */300', range);
  }
  const empty = await mediaRangeResponse(
    media(new Uint8Array(0)),
    'bytes=0-',
    CLIP
  );
  assert.equal(empty.status, 416);
  assert.equal(empty.headers.get('Content-Range'), 'bytes */0');
});

test('answers 416 for inverted, malformed, and zero-length suffix ranges', async () => {
  for (const range of [
    'bytes=5-2',
    'bytes=abc',
    'bytes=-',
    'bytes=-0',
    'bytes=1-2-3'
  ]) {
    const response = await mediaRangeResponse(media(), range, CLIP);
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('Content-Range'), 'bytes */300', range);
  }
});

test('leaves multi-range, non-bytes, and absent Range headers to the original 200', async () => {
  const absent = [undefined, null, ''];
  for (const range of absent) {
    assert.equal(await mediaRangeResponse(media(), range, CLIP), null);
  }
  for (const range of ['bytes=0-1,5-6', 'bytes=0-1, 5-6', 'items=0-1']) {
    assert.equal(await mediaRangeResponse(media(), range, CLIP), null, range);
  }

  const untouched = media();
  assert.equal(
    await mediaRangeResponse(untouched, 'bytes=0-1,5-6', CLIP),
    null
  );
  assert.deepEqual(await bytesOf(untouched), BYTES);
});

test('never slices non-media responses', async () => {
  const page = media(BYTES, 'text/html');
  assert.equal(
    await mediaRangeResponse(page, 'bytes=0-1', 'https://app.test/index.html'),
    null
  );
  assert.deepEqual(await bytesOf(page), BYTES);

  const json = media(BYTES, 'application/json');
  assert.equal(
    await mediaRangeResponse(json, 'bytes=0-1', 'https://app.test/data.json'),
    null
  );

  const notFull = new Response(BYTES, {
    status: 206,
    headers: { 'Content-Type': 'audio/mpeg' }
  });
  assert.equal(await mediaRangeResponse(notFull, 'bytes=0-1', CLIP), null);
});

test('detects media by Content-Type or by a media URL extension', async () => {
  const octet = { 'Content-Type': 'application/octet-stream' };
  for (const ext of ['mp3', 'MP3', 'wav', 'm4a', 'ogg', 'mp4', 'webm']) {
    const response = new Response(BYTES, { status: 200, headers: octet });
    const ranged = await mediaRangeResponse(
      response,
      'bytes=0-0',
      `https://app.test/a/clip.${ext}?v=2`
    );
    assert.equal(ranged.status, 206, ext);
  }
  const byType = await mediaRangeResponse(
    media(BYTES, 'audio/ogg'),
    'bytes=1-1',
    'https://app.test/sound'
  );
  assert.equal(byType.status, 206);
});

test('the rewritten worker still parses, and rewriting it twice is a no-op', () => {
  const transformed = rewriteServiceWorker(WORKER_FIXTURE);
  new vm.Script(transformed);
  assert.ok(transformed.includes('// Open AAC: bounded offline preparation'));
  assert.ok(transformed.includes('function mediaRangeResponse('));
  assert.ok(
    transformed.includes(
      "return mediaRangeResponse(response, event.request.headers.get('Range')"
    )
  );
  assert.equal(rewriteServiceWorker(transformed), transformed);
});

test('the rewritten fetch handler answers Range requests with 206 and passes other requests through', async () => {
  const cached = media();
  const listeners = {};
  const sandbox = {
    self: {
      addEventListener: (type, listener) => (listeners[type] = listener)
    },
    cacheName: 'precache',
    caches: { open: async () => ({ match: async () => cached }) },
    urlsToCacheKeys: new Map([[CLIP, CLIP]]),
    stripIgnoredUrlParameters: (url) => url,
    ignoreUrlParametersMatching: [],
    console,
    Request,
    Response,
    Headers,
    Blob
  };
  vm.runInNewContext(rewriteServiceWorker(WORKER_FIXTURE), sandbox);

  const answer = (headers) => {
    let pending;
    listeners.fetch({
      request: new Request(CLIP, { headers }),
      respondWith: (promise) => {
        pending = promise;
      }
    });
    return pending;
  };

  const partial = await answer({ Range: 'bytes=2-5' });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('Content-Range'), 'bytes 2-5/300');
  assert.deepEqual(await bytesOf(partial), BYTES.slice(2, 6));

  const full = await answer({});
  assert.equal(full, cached);
  assert.equal(full.status, 200);
});

test('unknown generator output throws with the Unexpected sw-precache message', () => {
  assert.throws(
    () => rewriteServiceWorker('changed generator output'),
    /Unexpected sw-precache/
  );
  assert.throws(
    () =>
      rewriteServiceWorker(
        WORKER_FIXTURE.replace('return cache.match(', 'return cache.lookup(')
      ),
    /Unexpected sw-precache/
  );
  assert.throws(
    () => rewriteServiceWorker(WORKER_FIXTURE + '\n' + FETCH_SNIPPET),
    /Unexpected sw-precache/
  );
});
