#!/usr/bin/env node
// The public repository must install from the public npm registry. A machine
// configured with a private mirror records that mirror in package-lock.json,
// which CI cannot reach and which should not be published.
const fs = require('node:fs');
const path = require('node:path');

const lock = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package-lock.json'), 'utf8')
);
const bad = Object.entries(lock.packages || {})
  .filter(
    ([, entry]) =>
      entry.resolved &&
      /^https?:/.test(entry.resolved) &&
      !entry.resolved.startsWith('https://registry.npmjs.org/')
  )
  .map(([name, entry]) => `${name || '(root)'}: ${entry.resolved}`);
if (bad.length) {
  console.error(
    'package-lock.json resolves packages outside https://registry.npmjs.org/:\n' +
      bad.join('\n') +
      '\nRewrite these URLs to the public registry before committing.'
  );
  process.exit(1);
}
console.log('package-lock.json uses only the public npm registry.');
