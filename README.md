# Open AAC Board

Free communication boards, saved on your device. An independent GPLv3 derivative of [Cboard](https://github.com/cboard-org/cboard), starting from frontend commit `074972386a790b5dcb83a77799f676f457042abe`.

This first web release keeps Cboard’s board editor, sentence output, device speech, recording, local pictures, import/export, printing, scanning, and gaze controls. It removes subscription gates, account screens, upstream analytics, payment scripts, hosted speech configuration, and backend connections. Boards are stored in a separate local database. Speech and accessibility behavior still require testing on the target devices before everyday use.

Implementation status: early web preview. The production build and automated browser checks cover startup, synthetic speech, saved state, offline reopening, and backup import/export. Real-device speech, microphone, scanning and gaze checks remain necessary before everyday use.

## Development

Use Node.js 22 LTS or a compatible supported version. Install the existing locked dependencies:

```sh
npm ci
npm start
```

```sh
npm run test:local
npm run build
npm run test:web
```

The web tests use an already installed Chrome. Set `AAC_CHROME_PATH` if necessary. They use synthetic speech fixtures; actual audio quality and native accessibility need device testing. No cloud account or API key is needed to run the app.

## AWS Hong Kong

`infrastructure/hosting.json` provisions a private, encrypted S3 bucket in `ap-east-1`, a CloudFront distribution using Origin Access Control, HTTPS, and response security headers. CloudFront is global; the origin is in Hong Kong. User boards and recordings are stored on the user’s device, not in S3.

After authenticating the intended AWS profile, installing dependencies, and committing the release:

```sh
AWS_PROFILE=default npm run deploy:aws
```

The script publishes the corresponding source archive alongside every release, even while the development GitHub repository is private. No AWS keys belong in the app or repository. Deployment creates billable S3/CloudFront resources; no always-on server or database is provisioned. The bucket is retained if the stack is deleted, to avoid accidental loss of releases.

The script runs the production build and tests before provisioning or uploading. Initial offline preparation currently caches approximately 84 MB of app files and symbols; allow this download to finish on a suitable connection.

## Inherited dependency maintenance

The upstream lockfile is retained. On 2026-10-29, `npm audit --omit=dev` reported 19 findings (1 critical, 9 high, 6 moderate, 3 low); the full dependency tree reported 93. Swiper, the critical finding, is no longer imported by the app: tour examples use ordinary buttons. It remains in the inherited dependency manifest. Other findings still need dependency updates and a reachability review before a wider release. Automated smoke tests are not a security audit.

## Speech APIs

| Capability            | First release                                              | Later option                                                               |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| Text-to-speech (TTS)  | Device voices through Web Speech / existing native adapter | Amazon Polly behind our authenticated API, with limits and caching         |
| Voice recordings      | Browser microphone; audio saved with tiles                 | Native recording adapter                                                   |
| Speech-to-text (STT)  | Not required for picture-to-speech communication           | Amazon Transcribe for optional caregiver dictation / conversation captions |
| Accounts and sync     | Export/import files                                        | Our own backend after authorization and data-isolation tests               |
| AI sentence rewriting | Not offered                                                | Optional, explicit user-controlled feature only                            |

AWS documents Cantonese in [Polly](https://docs.aws.amazon.com/polly/latest/dg/supported-languages.html) and [Transcribe](https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html), and lists Hong Kong endpoints for both. Verify the selected voice engine, language and batch/streaming feature in the region before integration. Device voices vary by browser and OS; an available browser voice may use an online OS service. Test in airplane mode and provide recordings where necessary.

## Mobile path

Keep the board data and interaction model shared. In a later mobile phase, package the built web UI and implement/test adapters for native speech, microphone, durable file storage, safe-area handling and backup sharing. Cboard’s existing Cordova integrations are preserved as reference; mobile builds are not configured or verified by this web release. Choose Capacitor or the retained Cordova approach after an iOS speech/recording proof of concept.

## Data and recovery

Personal boards, uploaded media and recordings live in browser storage. The app offers storage protection and a write-failure notice; neither replaces backups. Use Settings → Export and test restoring a copy. Uninstalling the app, clearing site data, private browsing and storage eviction can remove the local copy. Imported external media links still depend on their origin; download or replace these before offline use.

## Attribution and licenses

Code: GPL-3.0-only; see [LICENSE.txt](LICENSE.txt). Copyright © 2017–2024 Assistive Technology LLC and Cboard contributors; modifications © 2026 Open AAC Board contributors. See [README.upstream.md](README.upstream.md) for the upstream project and credits. This project is independent and is not endorsed by Cboard or its sponsors.

Mulberry Symbols by Steve Lee: CC BY-SA 4.0. Bundled ARASAAC symbols by Sergio Palao / Government of Aragon: CC BY-NC-SA 4.0. Asset licenses remain separate from the code license. Retain their attribution and noncommercial/share-alike restrictions when distributing symbols and boards. No advertising or subscriptions are included here.
