// Open AAC Board addition, 2026-10-29. GPL-3.0-only; see LICENSE.txt.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const archive = fs.readFileSync(
  path.join(root, 'build/source/open-aac-board-source.tar.gz')
);
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8'
}).trim();
const source = `/source/${commit}/open-aac-board-source.tar.gz`;
fs.mkdirSync(path.join(root, 'build/source', commit), { recursive: true });
fs.copyFileSync(
  path.join(root, 'build/source/open-aac-board-source.tar.gz'),
  path.join(root, 'build', source)
);
const manifest = {
  commit,
  repository: 'https://github.com/peteragility/open-aac-board',
  source,
  sha256: crypto.createHash('sha256').update(archive).digest('hex'),
  codeLicense: 'GPL-3.0-only',
  notices: '/THIRD_PARTY_NOTICES.txt',
  dependencies: '/licenses/dependencies.json',
  assets: '/licenses/assets.json'
};
fs.writeFileSync(
  path.join(root, 'build/source/release.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);
fs.writeFileSync(
  path.join(root, 'build/source', commit, 'release.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);
console.log(
  `Source manifest records release ${commit.slice(0, 12)} and its archive checksum.`
);
