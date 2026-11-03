const fs = require('node:fs');
const path = require('node:path');
const boards = require('./src/api/boards.json');
const catalog = require('./src/local/aac/catalog.json');

function mapImagesToGlobs(boards, globPrefix) {
  let globs = [];
  Object.keys(boards).forEach((boardId) => {
    const tiles = boards[boardId].tiles;
    Object.keys(tiles).forEach((tileId) => {
      if (tiles[tileId].image) {
        const glob = globPrefix + tiles[tileId].image;
        if (globs.indexOf(glob) >= 0) {
          return;
        }
        globs.push(glob);
      }
    });
  });
  return globs;
}

// Every symbol named anywhere in the starter catalog. The vocabulary can grow
// without editing this file: new symbol paths are picked up at build time.
function catalogSymbolPaths(value, found = new Set()) {
  if (typeof value === 'string') {
    const match = value.match(
      /^\/?(symbols\/[^'"?#]+\.(?:svg|png|jpe?g|gif|webp))$/i
    );
    if (match) found.add(match[1]);
  } else if (Array.isArray(value)) {
    value.forEach((item) => catalogSymbolPaths(item, found));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => catalogSymbolPaths(item, found));
  }
  return found;
}

const catalogSymbols = [...catalogSymbolPaths(catalog)].sort().map((file) => {
  if (!fs.existsSync(path.join(__dirname, 'build', file))) {
    throw new Error(`Starter catalog references a missing symbol: ${file}`);
  }
  return 'build/' + file;
});

// Only the entry chunks needed by the workspace route are precached. Upstream
// editor and settings chunks, and any other symbols, are cached on first use.
const assetManifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'build', 'asset-manifest.json'), 'utf8')
);
const entryFiles = assetManifest.entrypoints
  .filter((file) => /\.(js|css)$/.test(file))
  .map((file) => 'build/' + file);
if (!entryFiles.some((file) => /static\/js\/main\./.test(file))) {
  throw new Error('Build manifest does not list the main script.');
}

const boardImages = mapImagesToGlobs(boards.advanced, 'build/');

module.exports = {
  stripPrefix: 'build/',
  staticFileGlobs: [
    'build/*.html',
    'build/manifest.json',
    'build/LICENSE.txt',
    'build/THIRD_PARTY_NOTICES.txt',
    'build/licenses/**/*',
    'build/app-icon.svg',
    'build/app-icon-*.png',
    'build/audio/**/*.mp3',
    'build/static/media/**/*',
    'build/symbols/open-aac/**/*',
    ...entryFiles,
    ...catalogSymbols,
    ...boardImages
  ],
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MB
  runtimeCaching: [
    {
      urlPattern: /\/symbols\/mulberry/,
      handler: 'cacheFirst',
      options: {
        cache: {
          name: 'symbols-mulberry'
        }
      }
    },
    {
      urlPattern: /\/symbols\/arasaac/,
      handler: 'cacheFirst',
      options: {
        cache: {
          name: 'symbols-arasaac'
        }
      }
    },
    {
      urlPattern: /\/symbols\/cboard/,
      handler: 'cacheFirst',
      options: {
        cache: {
          name: 'symbols-cboard'
        }
      }
    },
    {
      // Hashed script, style and font chunks: lazy routes and translations.
      urlPattern: /\/static\/(js|css|media)\//,
      handler: 'cacheFirst',
      options: {
        cache: {
          name: 'static-runtime',
          // Old hashed chunks from earlier releases are evicted.
          maxEntries: 150
        }
      }
    }
  ],
  navigateFallback: '/index.html',
  dontCacheBustUrlsMatching: /\.\w{8}\./,
  dynamicUrlToDependencies: {
    '/': ['build/index.html']
  },
  swFilePath: 'build/service-worker.js'
};
