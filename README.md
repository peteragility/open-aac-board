# 粵語說話 · Open AAC Board

Free communication boards, saved on your device. An independent GPLv3 derivative of [Cboard](https://github.com/cboard-org/cboard), starting from frontend commit `074972386a790b5dcb83a77799f676f457042abe`.

The web app is the current mockup and MVP for validating communication workflows and layouts. The production targets are installed iOS/iPadOS apps for iPhone and iPad, and Android apps for phones and tablets.

The main workspace defaults to Cantonese, with explicit English and Mandarin choices. It provides a fixed-order core word board, multilingual vocabulary search, quick phrases and favourites, saved personal phrases, type-to-speak, a large rotatable partner display, editable visual routines and a break timer. Words can have custom photos, labels in all three languages, and personal recordings per language. Picture scanning uses Space/Enter, with adjustable timing.

The workspace adapts to phones and tablets in portrait and landscape, includes safe-area handling and install icons, and offers picture-size, larger-text, high-contrast and optional haptic preferences. The retained Cboard editor and its existing boards remain available under Preferences → Advanced boards & editor. Account screens, subscriptions, analytics, payments and backend connections remain disabled.

The compact communication bar stays above the scrolling word grid. Each tab remembers its own scroll position; tapping the active tab returns to the top. Clear offers Undo for word-built messages, whole phrases and typed text. Language and message controls have larger touch targets. A visible voice check lets users hear a sample and confirm each language, while the offline indicator distinguishes downloading, ready, connection needed and not ready. Existing workspace backups remain supported.

Implementation status: web mockup and MVP. Tests cover Cantonese voice matching and real MP3 playback without a Cantonese device voice, offline audio, three-language selection, custom pictures/recordings and backups, sentence building, routines, and phone/iPad viewport layouts. Native speech dispatch is tested using fixtures, and recording uses a simulated microphone. Actual iOS/iPadOS/Android audio, accessibility hardware and microphone behavior still need physical-device verification. Native app packages are future work.

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

## Web MVP hosting — AWS Hong Kong

AWS hosts the web mockup and MVP while the mobile experience is validated. Production mobile apps will be distributed through the iOS/iPadOS and Android app stores; any future backend services are a separate decision.

`infrastructure/hosting.json` provisions a private, encrypted S3 bucket in `ap-east-1`, a CloudFront distribution using Origin Access Control, HTTPS, and response security headers. CloudFront is global; the origin is in Hong Kong. User boards and recordings are stored on the user’s device, not in S3.

After authenticating the intended AWS profile, installing dependencies, and committing the release:

```sh
AWS_PROFILE=default npm run deploy:aws
```

The script publishes the corresponding source archive alongside every release, even while the development GitHub repository is private. No AWS keys belong in the app or repository. Deployment creates billable S3/CloudFront resources; no always-on server or database is provisioned. The bucket is retained if the stack is deleted, to avoid accidental loss of releases.

The script runs the production build and tests before provisioning or uploading. Initial offline preparation currently caches approximately 85 MB of app files, symbols and bundled audio; allow this download to finish on a suitable connection. Downloads are limited to 16 at once, with bounded retries, to avoid launching thousands of simultaneous requests on phones. The build fails if the inherited service-worker generator changes its expected install code.

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

## Production mobile path

| Phase                                | Deliverable                                                                                                                                                                                              | Completion check                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current MVP usability pass           | Compact board, independent tab navigation, larger controls, Undo, voice check and visible offline status.                                                                                                | Browser tests verify usable space, touch targets, recovery, saved choices and real bundled audio offline.                                             |
| Next: easier personalization         | Add a personal picture with a Cantonese label and optional recording; keep additional translations optional. Make saved phrases easier to reach and allow saving a message built from pictures.          | A user or helper can add a familiar word and say a personal phrase without replacing starter vocabulary.                                              |
| Next: consistent boards and recovery | Clear navigation between the main and advanced boards; a single backup covering both. Explore an optional simpler layout with stable word positions.                                                     | Existing boards and recordings survive export/import and upgrades; chosen layouts remain predictable.                                                 |
| Mobile proof of concept              | Test speech, recording and offline operation on physical iPhone, iPad and Android devices before choosing the framework. Share vocabulary, board data and interaction logic where practical.             | Cantonese is the default; all three language choices, downloaded voices, recording permissions and background/resume behavior work on actual devices. |
| Mobile beta                          | Implement durable native database/file storage, bundled offline assets, backup sharing and accessible phone/tablet layouts. Address inherited dependency findings and confirm distribution requirements. | Device tests cover offline relaunch, data recovery, portrait/landscape, system text sizes, VoiceOver/TalkBack and supported input methods.            |
| Store release                        | Prepare iOS/iPadOS and Android packages, store materials and a release/support process after user testing.                                                                                               | Beta feedback and release checks are complete; the mobile apps can be installed and updated reliably.                                                 |

Validate each phase with intended users and their communication partners; refine vocabulary with Cantonese speakers and an AAC professional. These phases describe the planned order, not delivery dates. Core picture-to-speech communication needs no new paid API. Accounts/sync, caregiver dictation and other online services remain optional later work based on user needs.

Cboard’s existing Cordova integrations are preserved as reference. Mobile projects and store releases are future work; this web MVP does not configure or verify them.

## Data and recovery

Personal boards, uploaded media and recordings live in browser storage. Preferences → Export workspace backup includes workspace word edits, recordings, photos, saved phrases, favourites, routines and accessibility settings. Restore validates the file and asks before replacing the current workspace. Advanced Cboard boards retain their separate import/export flow under Advanced board backups. Export both when using both workspaces.

The app offers storage protection and a write-failure recovery download; neither replaces backups. Workspace media is bounded so an exported workspace fits the import limit. Uninstalling the app, clearing site data, private browsing and storage eviction can remove the local copy. Imported external media links still depend on their origin.

## Attribution and licenses

Code: GPL-3.0-only; see [LICENSE.txt](LICENSE.txt). Copyright © 2017–2024 Assistive Technology LLC and Cboard contributors; modifications © 2026 Open AAC Board contributors. See [README.upstream.md](README.upstream.md) for the upstream project and credits. This project is independent and is not endorsed by Cboard or its sponsors.

Mulberry Symbols by Steve Lee: CC BY-SA 4.0. Bundled ARASAAC symbols by Sergio Palao / Government of Aragon: CC BY-NC-SA 4.0. Asset licenses remain separate from the code license. Retain their attribution and noncommercial/share-alike restrictions when distributing symbols and boards. No advertising or subscriptions are included here.

Original pictograms in `public/symbols/open-aac/` and the three-language starter catalog are part of this GPLv3 project. The generic bundled speech clips were synthesized for this app; no voices or content were copied from the reference products.
