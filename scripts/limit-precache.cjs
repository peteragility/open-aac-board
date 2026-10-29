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
  return (
    source.slice(0, start) +
    replacement +
    source.slice(end + endText.length)
  ).replace(
    install,
    marker + '\n' + cacheWithLimit.toString() + '\n\n' + install
  );
}

if (require.main === module) {
  const file = path.resolve(__dirname, '../build/service-worker.js');
  fs.writeFileSync(file, rewriteServiceWorker(fs.readFileSync(file, 'utf8')));
  console.log(
    'Offline preparation: at most 16 concurrent downloads, with transient-failure retries.'
  );
}
module.exports = { cacheWithLimit, rewriteServiceWorker };
