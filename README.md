# 粵語說話 · Open AAC Board

Free communication boards, saved on your device. An independent GPLv3 derivative of [Cboard](https://github.com/cboard-org/cboard), starting from frontend commit `074972386a790b5dcb83a77799f676f457042abe`.

Offered free of charge for noncommercial NGO and community use. This is the project's distribution direction, not an added restriction on GPL-covered code; artwork retains its separate license terms. The English/Chinese app names are working names pending name clearance.

The web app is the current mockup and MVP for validating communication workflows and layouts. The production targets are installed iOS/iPadOS apps for iPhone and iPad, and Android apps for phones and tablets.

The main workspace defaults to Cantonese, with explicit English and Mandarin choices. It provides a fixed-order core word board, multilingual vocabulary search, quick phrases and favourites, saved picture/text messages, type-to-speak, a large rotatable partner display, editable visual routines and a break timer. Add a personal word in three steps: picture, label, optional recording. Only the current language needs a label; other translations can be added later. Personal words live in My words and do not move the starter vocabulary. Picture scanning uses Space/Enter, with adjustable timing.

Quick responses are reachable from every tab and keep unfinished messages intact. Choose one to four of the 12 included phrases; each already has bundled audio. Saved picture messages retain a snapshot of their pictures and language-specific recordings, even after the original personal word is edited or deleted. Missing translations are marked and never silently spoken using a different language. The word editor keeps Next/Save visible on short screens and collapses optional translations during creation.

The workspace adapts to laptops, phones and tablets in portrait and landscape, includes safe-area handling and install icons, and offers picture-size, larger-text, high-contrast and optional haptic preferences. Short landscape screens share a header row and use a single-row board toolbar to leave room for complete word cards. Small phones keep the selected category visible without repeating its heading. The retained Cboard editor and its existing boards remain available under Preferences → Advanced boards & editor. Account screens, subscriptions, analytics, payments and backend connections remain disabled.

The compact communication bar stays above the scrolling word grid. Each tab remembers its own scroll position; tapping the active tab returns to the top. Clear offers Undo for word-built messages, whole phrases and typed text. Language and message controls have larger touch targets. A visible voice check lets users hear a sample and confirm each language, while the offline indicator distinguishes downloading, ready, connection needed and not ready. Existing workspace backups remain supported.

The latest usability release labels Add word, Tools, Save and Show on phones. Tools groups personalization and picture scanning, with an option to keep scanning on the toolbar. My words is beside the core category, and arrow controls reveal further categories. Routines apply the same missing-translation protection as the word board and offer direct editing of the affected word. The optional Quick guide is available from the welcome page, Tools and Preferences: listen and confirm the voice, practice a picture message without changing a draft, then optionally add a personal word.

The latest picture and typing drafts resume after reopening, without automatic speech. These bounded drafts use the existing protected device storage as a separate record; there is no conversation history or server upload. Saved-phrase drafts reference existing media rather than duplicating recordings/photos. Deleting a saved phrase offers Undo for the most recent deletion, including its media and original list position. Undo has no countdown and remains available until another deletion or the app is reloaded.

Choose **睇圖搵 / Pictures** to browse six large picture groups: food and drink, feelings and body, people, places and travel, activities, and My words. Opening a group is silent; selecting a word adds its picture to the message and follows the existing tap-to-speak preference. Yes, no, help and stop appear in every group, with a core-board shortcut and a clear Back control. Larger pictures, a brief selection check and distinct artwork for “no” and “don't want” help identify choices. Related words can appear in several groups while sharing the same labels, photo and recordings. Text search remains under the magnifying-glass button on the word board.

Picture browsing also has six numbered pinned slots. Choose their contents explicitly; removing a picture leaves its slot empty and never moves the others. Water and toilet occupy the first two slots initially. The chosen view and pins are saved on the device and included in workspace backups; the current picture group resumes with the separate communication draft. Layouts adapt to screen width, so grid columns can change between devices while item order stays fixed. Real photos can replace symbols using Tools → Personalize words. Photo-scene hotspots remain future work.

Implementation status: web mockup and MVP. Tests cover Cantonese voice matching and real MP3 playback without a Cantonese device voice, offline audio, three-language selection, custom pictures/recordings and backups, sentence building, routines, and phone/iPad viewport layouts. Native speech dispatch is tested using fixtures, and recording uses a simulated microphone. Actual iOS/iPadOS/Android audio, accessibility hardware and microphone behavior still need physical-device verification. Native app packages are future work.

See the [product comparison and implementation decisions](docs/product-comparison.md) for the analysis of local and international AAC apps, delivered features and deferred capabilities.

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

Responsive checks cover 12 viewport sizes from 320×568 phones through 1440×900 laptops, including 667×375 and 844×390 phone landscape, and iPad portrait/landscape. They check complete visible word cards in all three languages, stable vocabulary order, 44px primary touch targets, larger text, typing, routines and scrollable editing/settings dialogs. These are browser viewport checks; Safari, real keyboards, device safe areas and VoiceOver/TalkBack still require physical-device testing.

## Web MVP hosting — AWS Hong Kong

AWS hosts the web mockup and MVP while the mobile experience is validated. Production mobile apps will be distributed through the iOS/iPadOS and Android app stores; any future backend services are a separate decision.

`infrastructure/hosting.json` provisions a private, encrypted S3 bucket in `ap-east-1`, a CloudFront distribution using Origin Access Control, HTTPS, and response security headers. CloudFront is global; the origin is in Hong Kong. User boards and recordings are stored on the user’s device, not in S3.

After authenticating the intended AWS profile, installing dependencies, and committing the release:

```sh
AWS_PROFILE=default npm run deploy:aws
```

The [GitHub repository](https://github.com/peteragility/open-aac-board) is public. The script also publishes the corresponding source archive alongside every release and `/source/release.json` with its commit and archive SHA-256. Production About links use retained `/source/<commit>/` paths so cached older app versions keep a matching source download. No AWS keys belong in the app or repository. Deployment creates billable S3/CloudFront resources; no always-on server or database is provisioned. The bucket is retained if the stack is deleted, to avoid accidental loss of releases.

The script runs the production build and tests before provisioning or uploading. Initial offline preparation currently caches approximately 90 MB of app files, symbols and bundled audio; allow this download to finish on a suitable connection. Downloads are limited to 16 at once, with bounded retries, to avoid launching thousands of simultaneous requests on phones. The build fails if the inherited service-worker generator changes its expected install code.

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

| Phase                                | Deliverable                                                                                                                                                                                              | Completion check                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current MVP usability pass           | Compact board, independent tab navigation, larger controls, Undo, voice check and visible offline status.                                                                                                | Browser tests verify usable space, touch targets, recovery, saved choices and real bundled audio offline.                                                |
| Delivered: easier personalization    | Three-step personal word creation, optional translations, configurable quick responses and saved picture messages with their own media.                                                                  | Automated checks cover Cantonese recordings without a matching device voice, translation gaps, independent drafts, deletion and backup/offline recovery. |
| Delivered: clearer everyday controls | Labelled phone controls, Tools, visible personal vocabulary, resumable drafts, Undo phrase deletion and an optional short guide. Routine translation gaps open the exact word for editing.               | Browser checks cover translation guards, silent draft restoration, undo media/order, optional guide playback and constrained screen layouts.             |
| Delivered: find pictures visually    | Six picture groups, larger card art, shared words in related groups, clear Back/core controls, selection feedback and six manually chosen pinned slots.                                                  | Checks cover silent navigation, real Cantonese MP3s offline, shared photos/recordings, missing translations, fixed pin positions and responsive layouts. |
| Next: Cantonese everyday use         | Reviewed Hong Kong vocabulary packs, simpler communication layouts, direct printing of the current workspace, Jyutping search and brief helper guidance.                                                 | Intended users and NGO staff can find familiar words and finish everyday tasks with fewer steps.                                                         |
| Next: consistent boards and recovery | Clear navigation between the main and advanced boards; a single backup covering both. Explore an optional simpler layout with stable word positions.                                                     | Existing boards and recordings survive export/import and upgrades; chosen layouts remain predictable.                                                    |
| Mobile proof of concept              | Test speech, recording and offline operation on physical iPhone, iPad and Android devices before choosing the framework. Share vocabulary, board data and interaction logic where practical.             | Cantonese is the default; all three language choices, downloaded voices, recording permissions and background/resume behavior work on actual devices.    |
| Mobile beta                          | Implement durable native database/file storage, bundled offline assets, backup sharing and accessible phone/tablet layouts. Address inherited dependency findings and confirm distribution requirements. | Device tests cover offline relaunch, data recovery, portrait/landscape, system text sizes, VoiceOver/TalkBack and supported input methods.               |
| Store release                        | Prepare iOS/iPadOS and Android packages, store materials and a release/support process after user testing.                                                                                               | Beta feedback and release checks are complete; the mobile apps can be installed and updated reliably.                                                    |

Validate each phase with intended users and their communication partners; refine vocabulary with Cantonese speakers and an AAC professional. These phases describe the planned order, not delivery dates. Core picture-to-speech communication needs no new paid API. Accounts/sync, caregiver dictation and other online services remain optional later work based on user needs.

Cboard’s existing Cordova integrations are preserved as reference. Mobile projects and store releases are future work; this web MVP does not configure or verify them.

The [licensing and name review](docs/licensing-review.md) records the preliminary name check and unresolved iOS GPL/App Store distribution questions. Complete the actual package's licensing review before choosing an App Store delivery route. Free pricing, NGO use and a public repository do not by themselves clear native distribution.

## Data and recovery

Personal boards, uploaded media and recordings live in browser storage. Preferences → Export workspace backup includes personal words, word edits, recordings, photos, saved picture/text messages, quick response choices, favourites, pinned picture slots, routines and accessibility settings. New exports use workspace format version 2; version 1 backups are still accepted and gain defaults for the new fields. Earlier version 2 files also gain default pins and the original word-board view. Older app releases cannot import version 2 files. Restore validates the file and asks before replacing the current workspace. Advanced Cboard boards retain their separate import/export flow under Advanced board backups. Export both when using both workspaces.

Unfinished communication drafts are device-local and excluded from exported workspace backups. Restoring a workspace clears those drafts so a private unfinished message is not carried into an imported workspace. This does not remove saved phrases contained in that backup. Clearing site data also clears drafts; keep important messages in My phrases and export a backup.

The main workspace allows up to 100 personal words and 100 saved phrases. Pictures remain limited to 2 MB per upload and recordings to 15 seconds/1 MB. Saved picture messages copy their media, so repeated recordings/photos can use additional storage; the combined workspace remains bounded to approximately 24 MB. A failed save reports the limit without overwriting the existing workspace. Personal text without a recording still requires a matching installed device voice.

The app offers storage protection and a write-failure recovery download; neither replaces backups. Workspace media is bounded so an exported workspace fits the import limit. Uninstalling the app, clearing site data, private browsing and storage eviction can remove the local copy. Imported external media links still depend on their origin.

## Attribution and licenses

Code: GPL-3.0-only; see [LICENSE.txt](LICENSE.txt). Copyright © 2017–2024 Assistive Technology LLC and Cboard contributors; modifications © 2026 Open AAC Board contributors. See [README.upstream.md](README.upstream.md) for the upstream project and credits. This project is independent and is not endorsed by Cboard or its sponsors.

Mulberry Symbols by Steve Lee: CC BY-SA 4.0. Bundled ARASAAC symbols by Sergio Palao / Government of Aragon: CC BY-NC-SA 4.0. Asset licenses remain separate from the code license. Retain their attribution and noncommercial/share-alike restrictions when distributing symbols and boards. No advertising or subscriptions are included here.

Original pictograms in `public/symbols/open-aac/` and the three-language starter catalog are part of this GPLv3 project. The generic bundled speech clips were synthesized for this app; no voices or content were copied from the reference products.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the dated modification notice, separate font/icon/codec/media credits and license texts. About links to these notices and the generated package/asset inventories, which are also available offline. The inventory records missing evidence explicitly; it is not a blanket legal clearance.

After `npm ci`, run `npm run licenses:generate` when the lockfile, installed dependency notices, public assets or maintained notices change. Commit the generated `public/licenses/` files and `public/THIRD_PARTY_NOTICES.txt`. Deployment runs `npm run licenses:check` and fails if those files no longer match the locked install. Supplemental upstream license texts retain their source URLs and published-version commit evidence. No dependency additions or version changes are required for this workflow.
