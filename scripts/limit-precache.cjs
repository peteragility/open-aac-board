const fs = require('node:fs');
const path = require('node:path');

// This function is embedded verbatim in the generated worker. Keep it self-contained.
function cacheWithLimit(items, run, concurrency, retryDelay) {
  var cursor = 0;
  var delay = retryDelay === undefined ? 200 : retryDelay;
  function attempt(item, retries) {
    return Promise.resolve()
      .then(function () {
        return run(item);
      })
      .catch(function (error) {
        if (retries === 0) throw error;
        return new Promise(function (resolve) {
          setTimeout(resolve, delay);
        }).then(function () {
          return attempt(item, retries - 1);
        });
      });
  }
  function worker() {
    if (cursor >= items.length) return Promise.resolve();
    var item = items[cursor++];
    return attempt(item, 2).then(worker);
  }
  var workers = [];
  for (var i = 0; i < Math.min(concurrency, items.length); i++)
    workers.push(worker());
  return Promise.all(workers);
}

// This function is embedded verbatim in the generated worker. Keep it self-contained.
// Resolves to a 206 or 416 Response for a single bytes= Range over cached media,
// or to null when the original cached response should be served unchanged.
function mediaRangeResponse(response, rangeHeader, requestUrl) {
  var contentType = response.headers.get('Content-Type') || '';
  var pathname = String(requestUrl).split(/[?#]/)[0];
  var isMedia =
    /^(audio|video)\//i.test(contentType) ||
    /\.(mp3|wav|m4a|ogg|mp4|webm)$/i.test(pathname);
  if (!rangeHeader || !isMedia || response.status !== 200)
    return Promise.resolve(null);
  var header = String(rangeHeader).trim();
  // Only a single bytes= range is sliced; other units and multi-range requests get the full 200.
  if (!/^bytes=/i.test(header) || header.indexOf(',') !== -1)
    return Promise.resolve(null);
  var spec = /^(\d*)-(\d*)$/.exec(header.slice('bytes='.length).trim());
  var malformed = !spec || (spec[1] === '' && spec[2] === '');
  function unsatisfiable(size) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': 'bytes */' + size }
    });
  }
  return response.blob().then(function (blob) {
    var size = blob.size;
    var first, last;
    if (malformed) return unsatisfiable(size);
    if (spec[1] === '') {
      // Suffix range: the final n bytes.
      var suffix = parseInt(spec[2], 10);
      if (suffix === 0 || size === 0) return unsatisfiable(size);
      first = Math.max(0, size - suffix);
      last = size - 1;
    } else {
      first = parseInt(spec[1], 10);
      var requested = spec[2] === '' ? size - 1 : parseInt(spec[2], 10);
      if (first >= size || requested < first) return unsatisfiable(size);
      last = Math.min(requested, size - 1);
    }
    var headers = {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(last - first + 1),
      'Content-Range': 'bytes ' + first + '-' + last + '/' + size
    };
    if (contentType) headers['Content-Type'] = contentType;
    return new Response(blob.slice(first, last + 1), {
      status: 206,
      headers: headers
    });
  });
}

const rangeMarker = '// Open AAC: byte-range media responses';

function rewriteServiceWorker(source) {
  const marker = '// Open AAC: bounded offline preparation';
  if (source.includes(marker)) return source;
  const startText =
    'return Promise.all(\n          Array.from(urlsToCacheKeys.values()).map(function(cacheKey) {';
  const endText = '          })\n        );';
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  const install = "self.addEventListener('install', function(event) {";
  if (
    start < 0 ||
    end < start ||
    source.indexOf(startText, start + 1) !== -1 ||
    !source.includes(install)
  ) {
    throw new Error(
      'Unexpected sw-precache output. Refusing to publish an unbounded downloader.'
    );
  }
  const body = source.slice(start + startText.length, end);
  const replacement =
    'return cacheWithLimit(Array.from(urlsToCacheKeys.values()), function(cacheKey) {' +
    body +
    '          }, 16);';
  let worker =
    source.slice(0, start) + replacement + source.slice(end + endText.length);

  // Only sw-precache's own fetch listener is spliced. Sources without it (for
  // example, a bare install handler) are not precache workers and are left alone;
  // the CLI refuses to publish a worker where this splice did not happen.
  const fetchListener = "self.addEventListener('fetch', function(event) {";
  if (worker.includes(fetchListener)) {
    const fetchText = [
      'return cache.match(urlsToCacheKeys.get(url)).then(function(response) {',
      '            if (response) {',
      '              return response;',
      '            }'
    ].join('\n');
    const fetchReplacement = [
      'return cache.match(urlsToCacheKeys.get(url)).then(function(response) {',
      '            if (response) {',
      '              ' + rangeMarker,
      "              return mediaRangeResponse(response, event.request.headers.get('Range'), event.request.url).then(function(ranged) {",
      '                return ranged || response;',
      '              });',
      '            }'
    ].join('\n');
    const fetchAt = worker.indexOf(fetchText);
    if (fetchAt < 0 || worker.indexOf(fetchText, fetchAt + 1) !== -1) {
      throw new Error(
        'Unexpected sw-precache output. Refusing to publish a worker that cannot answer Range requests.'
      );
    }
    worker =
      worker.slice(0, fetchAt) +
      fetchReplacement +
      worker.slice(fetchAt + fetchText.length);
  }

  const helpers = [cacheWithLimit, mediaRangeResponse]
    .map(function (fn) {
      return fn.toString();
    })
    .join('\n\n');
  const at = worker.indexOf(install);
  return (
    worker.slice(0, at) + marker + '\n' + helpers + '\n\n' + worker.slice(at)
  );
}

if (require.main === module) {
  const file = path.resolve(__dirname, '../build/service-worker.js');
  const worker = rewriteServiceWorker(fs.readFileSync(file, 'utf8'));
  if (!worker.includes(rangeMarker)) {
    throw new Error(
      'Unexpected sw-precache output. Refusing to publish a worker that cannot answer Range requests.'
    );
  }
  fs.writeFileSync(file, worker);
  console.log(
    'Offline preparation: at most 16 concurrent downloads, with transient-failure retries, and Range-aware media responses.'
  );
}
module.exports = { cacheWithLimit, mediaRangeResponse, rewriteServiceWorker };
