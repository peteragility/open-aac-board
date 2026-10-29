// Open AAC Board addition, 2026-10-29. GPL-3.0-only; see LICENSE.txt.
// Reads the locked install without adding dependencies or making network requests.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const lockBytes = fs.readFileSync(path.join(root, 'package-lock.json'));
const lock = JSON.parse(lockBytes);
const documents = new Map();
const packages = [];
const supplementalPath = path.join(
  root,
  'public/licenses/supplemental/sources.json'
);
const supplemental = fs.existsSync(supplementalPath)
  ? JSON.parse(fs.readFileSync(supplementalPath))
  : [];
for (const source of JSON.parse(
  fs.readFileSync(path.join(root, 'public/licenses/upstream/sources.json'))
)) {
  if (!/^[A-Za-z0-9.-]+\.txt$/.test(source.file))
    throw new Error('Invalid upstream notice path');
  if (
    hash(
      fs.readFileSync(path.join(root, 'public/licenses/upstream', source.file))
    ) !== source.sha256
  )
    throw new Error(`Upstream notice checksum mismatch: ${source.file}`);
}
const model = JSON.parse(
  fs.readFileSync(
    path.join(root, 'public/licenses/upstream/model-provenance.json')
  )
);
if (
  model.asset !== '/mediapipe/face_landmarker.task' ||
  hash(fs.readFileSync(path.join(root, 'public', model.asset))) !== model.sha256
)
  throw new Error(
    'MediaPipe model differs from the verified provenance record'
  );

function write(relative, data) {
  const destination = path.join(root, relative);
  if (check) {
    if (
      !fs.existsSync(destination) ||
      !fs.readFileSync(destination).equals(Buffer.from(data))
    )
      throw new Error(
        `Stale license inventory: ${relative}. Run npm run licenses:generate.`
      );
  } else {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, data);
  }
}
function licenseName(value) {
  if (typeof value === 'string') return value;
  if (value?.type) return value.type;
  if (Array.isArray(value)) return value.map(licenseName).join(' OR ');
  return null;
}
function noticeFiles(directory, depth = 0, prefix = '') {
  const files = [];
  for (const entry of fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.isSymbolicLink()) continue;
    const relative = prefix + entry.name;
    if (
      entry.isFile() &&
      /^(licen[cs]e|copying|copyright|notice|ofl)(?:[._-]|$|notice)/i.test(
        entry.name
      )
    )
      files.push(relative);
    if (
      entry.isDirectory() &&
      depth < 2 &&
      /^(licenses?|licences?|dist|vendor|third[_-]party)$/i.test(entry.name)
    )
      files.push(
        ...noticeFiles(
          path.join(directory, entry.name),
          depth + 1,
          relative + '/'
        )
      );
  }
  return files;
}

for (const [location, entry] of Object.entries(lock.packages)
  .filter(([location]) => location)
  .sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  const directory = path.join(root, location);
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json')));
  if (pkg.version !== entry.version)
    throw new Error(`Installed version differs from lockfile: ${location}`);
  let files = noticeFiles(directory);
  const extra = supplemental.find(
    (source) =>
      source.name === pkg.name &&
      source.version === pkg.version &&
      source.status === 'captured'
  );
  const review = [];
  if (!files.length) {
    // Preserve package-provided evidence, including license sections in READMEs.
    files = fs
      .readdirSync(directory)
      .filter(
        (name) =>
          /^readme(?:\.|$)/i.test(name) &&
          fs.statSync(path.join(directory, name)).isFile()
      )
      .sort();
    if (!extra)
      review.push(
        'No standalone license/notice file in installed package; inspect README and upstream terms.'
      );
  }
  const declaredLicense =
    licenseName(pkg.license) ||
    licenseName(pkg.licenses) ||
    licenseName(entry.license);
  if (!declaredLicense)
    review.push(
      'No license declaration in package metadata; inspect retained evidence.'
    );
  const notices = files.map((file) => {
    const bytes = fs.readFileSync(path.join(directory, file));
    const sha256 = hash(bytes);
    if (!documents.has(sha256))
      documents.set(sha256, { text: bytes.toString('utf8'), owners: [] });
    documents
      .get(sha256)
      .owners.push(`${pkg.name}@${pkg.version}: ${location}/${file}`);
    return { file, sha256 };
  });
  if (extra) {
    if (!/^[a-f0-9]{64}\.txt$/.test(extra.file))
      throw new Error('Invalid supplemental notice path');
    const bytes = fs.readFileSync(
      path.join(root, 'public/licenses/supplemental', extra.file)
    );
    const sha256 = hash(bytes);
    if (extra.file !== sha256 + '.txt')
      throw new Error('Supplemental notice checksum mismatch');
    if (!documents.has(sha256))
      documents.set(sha256, { text: bytes.toString('utf8'), owners: [] });
    documents
      .get(sha256)
      .owners.push(
        `${pkg.name}@${pkg.version}: supplemental upstream notice — ${extra.source}`
      );
    notices.push({
      file: 'supplemental/' + extra.file,
      sha256,
      source: extra.source,
      publishedGitHead: extra.publishedGitHead
    });
  }
  const repository =
    typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  packages.push({
    name: pkg.name,
    version: pkg.version,
    location,
    developmentOnly: Boolean(entry.dev),
    license: declaredLicense,
    repository: repository || null,
    integrity: entry.integrity || null,
    notices,
    ...(review.length ? { review } : {})
  });
}

const manifest = {
  schemaVersion: 1,
  scope:
    'All installed packages in package-lock.json, including development/build tools. This is broader than the browser bundle and is not a legal clearance or an assertion that every package is redistributed.',
  lockfileSha256: hash(lockBytes),
  packageCount: packages.length,
  reviewCount: packages.filter((pkg) => pkg.review).length,
  packages
};
write(
  'public/licenses/dependencies.json',
  JSON.stringify(manifest, null, 2) + '\n'
);
const text =
  [
    'OPEN AAC BOARD — THIRD-PARTY PACKAGE NOTICES',
    manifest.scope,
    `Lockfile SHA-256: ${manifest.lockfileSha256}`,
    'Original notices follow verbatim, deduplicated by SHA-256. License declarations do not override the attached terms.',
    'Index: /licenses/dependencies.json. Build-produced notices are also retained in /static/js/*.LICENSE.txt.',
    ...[...documents.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([sha256, document]) =>
          `\n${'='.repeat(72)}\nSHA-256: ${sha256}\n${document.owners.join('\n')}\n${'-'.repeat(72)}\n${document.text}`
      )
  ].join('\n\n') + '\n';
write('public/licenses/dependency-notices.txt', text);

function walk(directory, prefix = '') {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .flatMap((entry) => {
      if (entry.isSymbolicLink()) return [];
      const relative = prefix + entry.name;
      return entry.isDirectory()
        ? walk(path.join(directory, entry.name), relative + '/')
        : [relative];
    });
}
const groups = [
  [
    'symbols/mulberry/',
    'CC-BY-SA-4.0',
    'Steve Lee; https://mulberrysymbols.org/'
  ],
  [
    'symbols/arasaac/',
    'CC-BY-NC-SA-4.0',
    'Sergio Palao / Government of Aragon; https://arasaac.org/terms-of-use'
  ],
  [
    'symbols/cboard/',
    'Inherited Cboard artwork; see project notices',
    'Cboard upstream commit 074972386a790b5dcb83a77799f676f457042abe'
  ],
  ['symbols/open-aac/', 'GPL-3.0-only', 'Open AAC Board contributors, 2026'],
  [
    'audio/',
    'Amazon Polly output; separate AWS terms',
    'Generic catalog synthesis; scripts/generate-starter-audio.py'
  ],
  [
    'ogv/',
    'MIT and codec licenses; see dependency notices',
    'ogv.js / Xiph.Org contributors'
  ],
  [
    'mediapipe/',
    'Apache-2.0',
    'Google MediaPipe; model verified against official version-1 bundle; licenses/upstream/model-provenance.json'
  ],
  [
    'images/',
    'Inherited Cboard project media; no trademark endorsement',
    'Cboard upstream; retained for compatibility'
  ],
  [
    'videos/',
    'Inherited upstream demo; no new publicity permission asserted',
    'Cboard upstream; README.upstream.md'
  ]
];
const assets = walk(path.join(root, 'public'))
  .filter(
    (file) =>
      !file.startsWith('licenses/') &&
      file !== 'THIRD_PARTY_NOTICES.txt' &&
      file !== 'LICENSE.txt'
  )
  .map((file) => {
    const group = groups.find(([prefix]) => file.startsWith(prefix));
    const bytes = fs.readFileSync(path.join(root, 'public', file));
    return {
      path: '/' + file,
      bytes: bytes.length,
      sha256: hash(bytes),
      license:
        group?.[1] ||
        (/^app-icon/.test(file)
          ? 'GPL-3.0-only'
          : 'Project file or inherited asset; see project notices'),
      provenance: group?.[2] || 'Open AAC Board / retained Cboard distribution'
    };
  });
write(
  'public/licenses/assets.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      scope:
        'Files under public/ excluding generated notices and the GPL text. Bundled npm assets, including fonts, are documented separately in dependencies.json and THIRD_PARTY_NOTICES.md.',
      assetCount: assets.length,
      assets
    },
    null,
    2
  ) + '\n'
);
write(
  'public/THIRD_PARTY_NOTICES.txt',
  fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'))
);
write('public/LICENSE.txt', fs.readFileSync(path.join(root, 'LICENSE.txt')));
console.log(
  `${check ? 'Verified' : 'Generated'} ${packages.length} package entries, ${documents.size} notice texts, ${assets.length} public assets; ${manifest.reviewCount} metadata/evidence exceptions retained for review.`
);
