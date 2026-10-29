# 粵語說話 · Open AAC Board

Free communication boards, saved on your device. An independent GPLv3 derivative of [Cboard](https://github.com/cboard-org/cboard), starting from frontend commit `074972386a790b5dcb83a77799f676f457042abe`.

The main workspace defaults to Cantonese, with explicit English and Mandarin choices. It provides a fixed-order core word board, multilingual vocabulary search, quick phrases and favourites, saved personal phrases, type-to-speak, a large rotatable partner display, editable visual routines and a break timer. Words can have custom photos, labels in all three languages, and personal recordings per language. Picture scanning uses Space/Enter, with adjustable timing.

The workspace adapts to phones and tablets in portrait and landscape, includes safe-area handling and install icons, and offers picture-size, larger-text, high-contrast and optional haptic preferences. The retained Cboard editor and its existing boards remain available under Preferences → Advanced boards & editor. Account screens, subscriptions, analytics, payments and backend connections remain disabled.

Implementation status: early web preview. Tests cover Cantonese voice matching and real MP3 playback without a Cantonese device voice, offline audio, three-language selection, custom pictures/recordings and backups, sentence building, routines, and phone/iPad viewport layouts. Native speech dispatch is tested using fixtures, and recording uses a simulated microphone. Actual iPadOS/Android audio, accessibility hardware and microphone behavior still need physical-device verification. Native app packages are future work.

See the [product comparison and implementation decisions](docs/product-comparison.md) for the analysis of Grid, TD Snap and SuperAAC, delivered features and deferred capabilities.

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

The web tests use an already installed Chrome. Set `AAC_CHROME_PATH` if necessary. No cloud account or API key is needed to run the app. Dependencies were not added for this workspace.

## AWS Hong Kong

`infrastructure/hosting.json` provisions a private, encrypted S3 bucket in `ap-east-1`, a CloudFront distribution using Origin Access Control, HTTPS, and response security headers. CloudFront is global; the origin is in Hong Kong. User boards and recordings are stored on the user’s device, not in S3.

After authenticating the intended AWS profile, installing dependencies, and committing the release:

```sh
AWS_PROFILE=default npm run deploy:aws
```

The script publishes the corresponding source archive alongside every release, even while the development GitHub repository is private. No AWS keys belong in the app or repository. Deployment creates billable S3/CloudFront resources; no always-on server or database is provisioned. The bucket is retained if the stack is deleted, to avoid accidental loss of releases.

The script runs the production build and tests before provisioning or uploading. Initial offline preparation currently caches approximately 85 MB of app files, symbols and bundled audio; allow this download to finish on a suitable connection.

## Inherited dependency maintenance

The upstream lockfile is retained. On 2026-10-29, `npm audit --omit=dev` reported 19 findings (1 critical, 9 high, 6 moderate, 3 low); the full dependency tree reported 93. Swiper, the critical finding, is no longer imported by the app: tour examples use ordinary buttons. It remains in the inherited dependency manifest. Other findings still need dependency updates and a reachability review before a wider release. Automated smoke tests are not a security audit.

## Speech APIs

| Capability            | First release                                                | Later option                                                               |
| --------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Text-to-speech (TTS)  | Strictly matched device voices plus 189 bundled starter MP3s | Optional authenticated speech API for devices without suitable OS voices   |
| Voice recordings      | Browser microphone; audio saved with tiles                   | Native recording adapter                                                   |
| Speech-to-text (STT)  | Not required for picture-to-speech communication             | Amazon Transcribe for optional caregiver dictation / conversation captions |
| Accounts and sync     | Export/import files                                          | Our own backend after authorization and data-isolation tests               |
| AI sentence rewriting | Not offered                                                  | Optional, explicit user-controlled feature only                            |

The bundled audio was generated once from the generic catalog using Polly Hiujin, Amy and Zhiyu in Singapore (`ap-southeast-1`); a live API check found no Cantonese neural voice at the Hong Kong endpoint. No user content is sent to Polly. Running `python3 scripts/generate-starter-audio.py` regenerates changed catalog clips using the AWS CLI and can incur synthesis charges. The app itself has no runtime speech API calls or secrets.

Without a matching device voice, included phrases play whole MP3s and word-built sentences can play individual clips. Arbitrary typed text and custom labels require a matching installed voice or a personal recording. The app does not substitute Mandarin for Cantonese. An OS voice may use an online service; try it in airplane mode before relying on it.

## Mobile path

Keep the board data and interaction model shared. In a later mobile phase, package the built web UI and implement/test adapters for native speech, microphone, durable file storage, safe-area handling and backup sharing. Cboard’s existing Cordova integrations are preserved as reference; mobile builds are not configured or verified by this web release. Choose Capacitor or the retained Cordova approach after an iOS speech/recording proof of concept.

## Data and recovery

Personal boards, uploaded media and recordings live in browser storage. Preferences → Export workspace backup includes workspace word edits, recordings, photos, saved phrases, favourites, routines and accessibility settings. Restore validates the file and asks before replacing the current workspace. Advanced Cboard boards retain their separate import/export flow under Advanced board backups. Export both when using both workspaces.

The app offers storage protection and a write-failure recovery download; neither replaces backups. Workspace media is bounded so an exported workspace fits the import limit. Uninstalling the app, clearing site data, private browsing and storage eviction can remove the local copy. Imported external media links still depend on their origin.

## Attribution and licenses

Code: GPL-3.0-only; see [LICENSE.txt](LICENSE.txt). Copyright © 2017–2024 Assistive Technology LLC and Cboard contributors; modifications © 2026 Open AAC Board contributors. See [README.upstream.md](README.upstream.md) for the upstream project and credits. This project is independent and is not endorsed by Cboard or its sponsors.

Mulberry Symbols by Steve Lee: CC BY-SA 4.0. Bundled ARASAAC symbols by Sergio Palao / Government of Aragon: CC BY-NC-SA 4.0. Asset licenses remain separate from the code license. Retain their attribution and noncommercial/share-alike restrictions when distributing symbols and boards. No advertising or subscriptions are included here.

Original pictograms in `public/symbols/open-aac/` and the three-language starter catalog are part of this GPLv3 project. The generic bundled speech clips were synthesized for this app; no voices or content were copied from the reference products.
