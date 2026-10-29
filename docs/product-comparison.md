# Product research and implementation decisions

Reviewed 29 October 2026. These are observations from the products' own public pages, not a hands-on assessment or a claim of clinical equivalence. The implementation uses our own code and vocabulary, existing licensed artwork, and original pictograms. No PCS, PODD, Gateway or other proprietary page sets were copied.

## Reference products

| Product and source                                                                                                              | Useful ideas                                                                                                                                                  | Implemented in Open AAC Board                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Smartbox Grid](https://smartboxaac.com/us/about-grid/)                                                                         | Separate symbol and text communication; vocabulary finding; personal voices; support for touch, switches and pointing devices.                                | Symbol board plus type-to-speak mode, multilingual vocabulary search, stable core positions, voice choice, recordings, and keyboard-operated picture scanning.                                               |
| [TD Snap, Hong Kong App Store listing](https://apps.apple.com/hk/app/td-snap/id1072799231?l=en-GB)                              | Core vocabulary and motor planning, QuickFires, visual schedules/timers, and easy personalization.                                                            | One-tap whole phrases, favourites, saved personal phrases, an editable now/next routine, a visual break timer, photos and recordings. Core words retain their order during language and screen-size changes. |
| [Monolith Research SUPER suite](https://monolithresearch.com/zh/) and [SuperAAC](https://monolithresearch.com/zh/superaac.html) | Offline communication, editable per-cell speech, multiple device layouts, switch access, optional haptics, and showing a message to the conversation partner. | Bundled offline audio, personal recordings per language, optional haptics where the browser supports them, phone/tablet layouts, picture scanning and a large rotatable partner display.                     |

Monolith's site was read directly over HTTPS because the search browser could not retrieve it. Its site describes some AI features as beta. We do not equate a product's public claims with verified performance.

## Cantonese comes first

- New and existing installations without workspace preferences start in Cantonese, using colloquial Cantonese words and Traditional Chinese labels. English and Mandarin are explicit choices, with their own written vocabulary and voices.
- Cantonese device voices match `yue-*`, `zh-HK` or `zh-yue-*`. Mandarin matching excludes these. A Mandarin voice must never become an implicit Cantonese fallback.
- Matching downloaded device voices are preferred; the chosen voice is remembered per language. If the browser has no suitable voice, 51 starter words and 12 phrases have bundled audio in each of the three languages (189 MP3 files total).
- Sentences assembled from starter words can use a sequence of audio clips. This is less fluent than synthesizing a full sentence. Personal recordings override synthesized word speech.
- Unrestricted typed text and edited labels need a matching device voice or a personal recording. The app explains this instead of speaking the wrong language. Some OS voices use online services; test the actual installed voice offline.

The starter MP3s were generated once using [Amazon Polly](https://aws.amazon.com/polly/features/): Hiujin (Cantonese), Amy (English), and Zhiyu (Mandarin). API checks found the Cantonese neural voice at `ap-southeast-1`, but not `ap-east-1`. The generation script sends only the public generic catalog to Singapore. Generated assets are distributed from the Hong Kong app origin and cached locally. The app does not call Polly at runtime and sends no user messages or recordings there. Synthesis during regeneration can incur AWS usage charges. AWS explicitly describes [storing and redistributing generated speech](https://aws.amazon.com/polly/) and [replaying cached output without additional synthesis fees](https://docs.aws.amazon.com/polly/latest/dg/what-is.html).

## Device support and boundaries

The delivered app remains a responsive installable web app. Core targets are iPhone/Android phone widths and iPad/Android tablet widths, including portrait, landscape, safe-area insets and reduced-height screens. PNG install icons and Apple home-screen metadata are included.

Picture scanning selects core-board words with Space/Enter and stops with Escape. Standard controls also remain keyboard accessible. Haptics depend on browser support; iPadOS may not expose vibration. Desktop viewport simulation does not certify physical switches, eye trackers, iPadOS audio behavior, microphone permissions or Android vendor voices.

The speech controller accepts injected platform adapters so later native packaging can replace browser speech/audio without changing the vocabulary model. Native iOS and Android projects, app-store distribution, durable native storage and hardware integration remain future work, as requested.

## Data and backup

Workspace preferences, word edits, photos, per-language recordings, saved phrases and routines use the existing guarded Redux/IndexedDB persistence. A workspace backup exports and restores these together, with explicit confirmation before replacement. Imports enforce a schema, size limits and media-type checks. The workspace is limited to approximately 24 MB so its backups fit under the 32 MB import limit. Advanced Cboard boards retain their original separate import/export flow; installing this release does not replace existing boards.

## Deferred features

Remote caregiver editing, Bluetooth coaching, hardware-specific eye-tracker calibration, cloud accounts/sync, AI-generated boards, automatic conversation listening/captions and smart-home/computer control are not part of this release. These require separate consent, security, hardware or service work. Local phrase suggestions search our included catalog; they are not labelled as AI prediction. A qualified speech-language professional and intended users should help refine the starter vocabulary before everyday reliance.
