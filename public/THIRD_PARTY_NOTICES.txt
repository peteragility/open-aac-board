# Third-party notices — 粵語說話 · Open AAC Board

Updated 29 October 2026. This distribution is an independent modification of Cboard. It is offered free of charge for noncommercial NGO and community use, without advertisements or subscriptions. That project direction does not add a noncommercial restriction to GPL-covered code: recipients retain the rights granted by the GPL. Separately licensed artwork keeps its own terms.

## Code and modifications

Cboard source: https://github.com/cboard-org/cboard, imported from commit `074972386a790b5dcb83a77799f676f457042abe`. Copyright © 2017–2024 Assistive Technology LLC and Cboard contributors. Open AAC Board modifications © 2026 its contributors. The derivative code is distributed under GNU GPL version 3 only, without warranty. Retain the copyright, license and modification notices when redistributing it.

Our modifications began on 29 October 2026: a device-storage-only distribution, disabled accounts/payments/analytics, Cantonese-default multilingual workspace, original vocabulary/pictograms, generic bundled speech, personal word creation with optional translations, quick responses, saved picture messages with media snapshots, recording and backups, resumable communication drafts, phrase deletion recovery, an optional guide, accessibility/navigation changes, responsive layouts, offline preparation and Hong Kong hosting. Git history records the individual changes. Dependencies and separate media below are not automatically relicensed under the GPL.

- Public source and history: https://github.com/peteragility/open-aac-board
- Corresponding source for the deployed release: `/source/open-aac-board-source.tar.gz`
- Release commit and source archive checksum: `/source/release.json`
- Full GPL text: `/LICENSE.txt` (also `LICENSE.txt` in the repository).
- Rebuild instructions: `README.md`, `package-lock.json` and `infrastructure/deploy.sh` in the source archive.

Production builds link to immutable `/source/<commit>/` archive and manifest paths, so an older cached app can still retrieve its matching source after an update. The unversioned paths are aliases for the latest release. The archive contains the source, build scripts and bundled assets for the release. It excludes credentials, private user data, installed `node_modules` and generated build output. Run `npm ci` to obtain the exact locked packages. Original package notices are also shipped below.

## Symbol artwork

| Files                                          | Credit and terms                                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/symbols/mulberry/`                     | Mulberry Symbols by Steve Lee, originating with Garry Paxton. Creative Commons Attribution-ShareAlike 4.0. https://mulberrysymbols.org/ and https://creativecommons.org/licenses/by-sa/4.0/                                                                                        |
| `public/symbols/arasaac/`                      | Pictograms by Sergio Palao for ARASAAC, property of the Government of Aragón. Creative Commons Attribution-NonCommercial-ShareAlike 4.0. https://arasaac.org/terms-of-use and https://creativecommons.org/licenses/by-nc-sa/4.0/                                                   |
| `public/symbols/cboard/`                       | Inherited Cboard project artwork, retained with its upstream provenance. The project GPL notice is retained; this does not grant rights in third-party names, logos or publicity. `picseepal.png` includes a third-party brand; no separate permission or endorsement is asserted. |
| `public/symbols/open-aac/`, `public/app-icon*` | Original Open AAC Board pictograms and app icon, © 2026 its contributors, GPL-3.0-only.                                                                                                                                                                                            |

The Mulberry and ARASAAC drawings were inherited from the Cboard distribution. They have not been redrawn in this project; labels, selection and placement have changed. Preserve attribution and license links on redistributed boards/media, identify any artwork modifications, and apply the relevant share-alike terms to adapted artwork. ARASAAC is retained for the intended noncommercial use. Free pricing or NGO status alone does not determine whether a particular use is noncommercial; consult the actual terms before changing the use.

Full CC legal texts are shipped at `/licenses/upstream/CC-BY-SA-4.0.txt` and `/licenses/upstream/CC-BY-NC-SA-4.0.txt`. These asset terms do not replace the code license. The file-by-file inventory with SHA-256 digests is `/licenses/assets.json`.

## Fonts, icons, codecs and models

- **Roboto:** bundled through `fontsource-roboto@4.0.0` and the inherited PDF font data in `src/vfs_fonts.js`. The installed WOFF font identifies “Copyright 2011 Google Inc. All Rights Reserved.”, version 2.137 (2017), and Apache License 2.0. The Fontsource packaging code has a separate MIT license. The Apache text is included at `/licenses/upstream/Roboto-Apache-2.0.txt`; package notices are in the dependency collection. System fonts named in CSS are supplied by the user's device and are not bundled here.
- **Material Design icons:** Google Material Design icons (Apache-2.0) used through the Material UI and `react-icons/md` wrappers. Wrapper licenses and the icon collection notices are retained in `/licenses/dependency-notices.txt`; Apache-2.0 text is included separately. The workspace's line icons in `src/local/aac/UI.js` are project code.
- **OGV and audio codecs:** inherited `public/ogv/` files from ogv.js. The wrapper is MIT, with the original codec notices for Ogg, Opus and the other packaged codec components retained from the installed package's `dist/` directory. These are collected verbatim in `/licenses/dependency-notices.txt`, including the Opus patent notice. Retaining these notices is not a patent clearance.
- **MediaPipe:** inherited runtime/WASM under `public/mediapipe/` and `@mediapipe/tasks-vision@0.10.14` software carry Apache-2.0 terms. The inherited `face_landmarker.task` was verified byte-for-byte against Google's official float16/version-1 bundle. The FaceDetector, FaceMesh-V2 and Blendshape model cards linked by Google's guide each identify Apache-2.0. The exact source URL, SHA-256 and model-card links are recorded in `/licenses/upstream/model-provenance.json`. The web workspace does not enable eye tracking. Apache-2.0 text is included at `/licenses/upstream/Apache-2.0.txt`.
- **Other inherited media:** `public/images/`, `public/videos/`, the old favicon and upstream documentation retain their provenance. They are not evidence of sponsorship or permission to use a person's image or another organization's mark in new publicity. References to original projects are credits, not endorsements.

## Speech audio and personal media

The 189 starter MP3s under `public/audio/` were generated from the generic three-language catalog using Amazon Polly (Hiujin, Amy and Zhiyu). AWS permits storing and reusing generated speech output, subject to its applicable service terms: https://aws.amazon.com/polly/faqs/ and https://aws.amazon.com/service-terms/. No competitor voice recordings were copied. These clips are supplied as part of this app; this notice does not claim ownership of AWS voices or grant voice-cloning rights. Synthesis is a build-time task; the app does not call Polly for user messages.

Device speech is provided by the user's OS/browser under its terms. User photos, imported boards and personal recordings are not project assets and are not relicensed by this notice. Anyone sharing those files must have the necessary rights and consent.

## Dependency notices and maintenance

`/licenses/dependencies.json` inventories every installed package in the lockfile, including development/build tools, exact versions, declared license metadata, original notice hashes and evidence exceptions. It is intentionally broader than the browser bundle. `/licenses/dependency-notices.txt` reproduces the original license, copyright, notice and fallback README files collected from that install. CRA's `static/js/*.LICENSE.txt` notices are also retained unchanged.

`npm run licenses:generate` rebuilds the inventory without network access or new dependencies. `npm run licenses:check` verifies the locked install and generated notices; deployment runs it before building. A missing declaration is recorded, not guessed. The collection is an inventory, not a claim that every dependency is permissively licensed or cleared for every distribution channel.

In particular, the inherited BrowserStack SDK is a development tool with its own restrictive license. Its presence in the inventory does not authorize redistributing its executable code; the project does not invoke it in the local test/deployment commands. Packages with missing license declarations or standalone license files are explicitly marked for review. Address native-bundle reachability and any unresolved rights before store distribution.

## Names and distribution channels

“粵語說話 · Open AAC Board” is a working project name, not a registered or cleared trade mark. This app is independent of Cboard, OpenAAC, Smartbox, Tobii Dynavox, Monolith Research, ARASAAC, Google and AWS; no endorsement is claimed. Product names are used only to identify upstream work, resources or references. Attribution does not grant trademark rights.

The dated name-search evidence and iOS/Android licensing assessment are in `docs/licensing-review.md`. Public source availability and noncommercial intent do not by themselves clear App Store terms or establish that the name is available. The current release is a web MVP; no native/store-distribution exception has been obtained from upstream copyright holders.
