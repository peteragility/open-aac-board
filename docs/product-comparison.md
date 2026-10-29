# Product research and implementation decisions

Reviewed 29 October 2026. These are observations from the products' own public pages, not a hands-on assessment or a claim of clinical equivalence. The implementation uses our own code and vocabulary, existing licensed artwork, and original pictograms. No PCS, PODD, Gateway or other proprietary page sets were copied.

## Reference products

| Product and source                                                                                                              | Useful ideas                                                                                                                                                  | Implemented in Open AAC Board                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Smartbox Grid](https://smartboxaac.com/us/about-grid/)                                                                         | Separate symbol and text communication; vocabulary finding; personal voices; support for touch, switches and pointing devices.                                | Symbol board plus type-to-speak mode, multilingual vocabulary search, stable core positions, voice choice, recordings, and keyboard-operated picture scanning.                                               |
| [TD Snap, Hong Kong App Store listing](https://apps.apple.com/hk/app/td-snap/id1072799231?l=en-GB)                              | Core vocabulary and motor planning, QuickFires, visual schedules/timers, and easy personalization.                                                            | One-tap whole phrases, favourites, saved personal phrases, an editable now/next routine, a visual break timer, photos and recordings. Core words retain their order during language and screen-size changes. |
| [Monolith Research SUPER suite](https://monolithresearch.com/zh/) and [SuperAAC](https://monolithresearch.com/zh/superaac.html) | Offline communication, editable per-cell speech, multiple device layouts, switch access, optional haptics, and showing a message to the conversation partner. | Bundled offline audio, personal recordings per language, optional haptics where the browser supports them, phone/tablet layouts, picture scanning and a large rotatable partner display.                     |

Monolith's site was read directly over HTTPS because the search browser could not retrieve it. Its site describes some AI features as beta. We do not equate a product's public claims with verified performance.

## Personalization release following the wider app review

Additional references included [Heep Hong's 語你同行2](https://apps.apple.com/tw/app/語你同行2/id1638100316), [Hong Chi's 溝通易3.0](https://aac.hongchi.org.hk/?page_id=77), [Proloquo2Go](https://www.assistiveware.com/products/proloquo2go), [Avaz](https://www.avazapp.com/features/), [Pictalk](https://www.pictalk.org/en/pictalk/), [CoughDrop](https://www.coughdrop.com/) and [Speech Assistant](https://www.asoft.nl/). These are published-feature references, not hands-on certification or permission to copy their code, vocabulary sets, artwork or recordings.

Delivered in this release:

- Personal word creation in three steps with an optional picture/recording and optional translations beyond the selected language. Starter vocabulary stays unchanged; personal words have a separate category.
- A quick-response panel reachable from every tab, with one to four user-selected included phrases. It speaks without changing picture or typing drafts. Existing bundled MP3s provide offline fallback; no speech API was added or invoked to generate more audio.
- Save picture-built messages as well as typed phrases. Picture messages retain their own snapshots of labels, images and recordings, so deleting/changing a personal word does not change a saved message.
- Strict translation handling: a missing label is visible, does not acquire a different-language recording, and cannot silently be spoken as if it were the selected language. Returning to a different language clears a language-specific saved phrase from the composer while keeping the stored phrase.
- Version 2 workspace exports, version 1 import migration, bounded media validation, and visible editor actions on phone/tablet/laptop layouts. Backups include the new word and quick-response fields.

Still on the roadmap: reviewed Hong Kong vocabulary packs, optional simpler fixed-position layouts, unified main/advanced backups, direct printing of the main workspace, Jyutping support, helper coaching, remote editing and visual photo scenes. Those features have not been labelled delivered by this pass. No proprietary vocabulary systems or competitor assets were imported.

## Follow-up usability release

The live review found icon-only phone actions, personal vocabulary beyond the initial category strip, drafts lost on reload and immediate saved-phrase deletion. It also reproduced a Cantonese-only routine label being dispatched to a Mandarin voice after a language switch. This release addresses those flows with visible short labels, a labelled Tools dialog, My words beside the core category, category scroll arrows, bounded device-local draft recovery, Undo deletion and consistent translation checks in routines. Missing routine labels open the affected word directly for translation.

An optional three-step guide is reachable from the welcome screen, Tools and Preferences. It requires completed playback before voice confirmation, lets the user practice without replacing their message and offers personal-word creation. It can be skipped or reopened. It does not reduce available vocabulary or automatically change core word positions. These choices follow [W3C's visible-label guidance](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p06-clear-labels/) and the distinction between access needs and vocabulary availability in [AssistiveWare's grid-size guidance](https://www.assistiveware.com/learn-aac/choosing-a-grid-size).

Drafts are a separate validated record in the existing guarded device persistence. They retain only the latest picture/phrase and typing drafts, without conversation history or media duplication, and never trigger speech when resumed. Workspace restore clears them; workspace exports continue to include saved phrases and media, without unfinished drafts. Phrase deletion Undo retains the most recent removed phrase in memory until another deletion or reload; restoring validates schema, media and storage limits. No new runtime API, dependency or audio generation is required.

## Picture-led browsing release — 30 October 2026

The approved design adds six picture groups rather than requiring typed search or reading category names alone. Each folder previews three actual card images, including personal photos when present. Folders use a collage and navigation arrow; speaking cards use one large picture and a brief selection check. Opening a folder never speaks or adds a word. Yes/no/help/stop remain available within each group, with explicit Back and core-word controls.

Food, feelings, people and places retain their existing vocabulary order and append related core words. Activities uses a fixed list, and My words shows personal cards. Every route references the same word object: an edited label, photo or language-specific recording is shared rather than copied. The original 24 core words retain their order. The original word-board view remains available, and text search sits behind its magnifying-glass control.

Six manually assigned pinned slots retain empty holes on removal and survive backup/restore; deleting a personal word clears only its own slot. They do not learn or reorder themselves. The view choice is an optional preference in version 2 backups, and older version 1/2 files receive defaults. Current picture-group navigation persists with the bounded draft and resets on workspace restore. Screen-size changes can change grid columns without changing item order.

The new “don't want” pictogram is original project artwork, distinct from the existing “no” symbol. Picture choices still need feedback from intended users and Cantonese-speaking communication partners; a symbol's meaning should not be assumed universal. Personal photos and recordings remain supported. Photo-scene hotspots are deferred. The implementation adds no dependency, runtime API, speech synthesis charge or remote storage.

## Cantonese voice and vocabulary behavior

- New and existing installations without workspace preferences start in Cantonese, using colloquial Cantonese words and Traditional Chinese labels. English and Mandarin are explicit choices, with their own written vocabulary and voices.
- Cantonese device voices match `yue-*`, `zh-HK` or `zh-yue-*`. Mandarin matching excludes these. A Mandarin voice must never become an implicit Cantonese fallback.
- Matching downloaded device voices are preferred; the chosen voice is remembered per language. If the browser has no suitable voice, 51 starter words and 12 phrases have bundled audio in each of the three languages (189 MP3 files total).
- Sentences assembled from starter words can use a sequence of audio clips. This is less fluent than synthesizing a full sentence. Personal recordings override synthesized word speech.
- Unrestricted typed text and edited labels need a matching device voice or a personal recording. The app explains this instead of speaking the wrong language. Some OS voices use online services; test the actual installed voice offline.

The starter MP3s were generated once using [Amazon Polly](https://aws.amazon.com/polly/features/): Hiujin (Cantonese), Amy (English), and Zhiyu (Mandarin). API checks found the Cantonese neural voice at `ap-southeast-1`, but not `ap-east-1`. The generation script sends only the public generic catalog to Singapore. Generated assets are distributed from the Hong Kong app origin and cached locally. The app does not call Polly at runtime and sends no user messages or recordings there. Synthesis during regeneration can incur AWS usage charges. AWS explicitly describes [storing and redistributing generated speech](https://aws.amazon.com/polly/) and [replaying cached output without additional synthesis fees](https://docs.aws.amazon.com/polly/latest/dg/what-is.html).

## Device support and boundaries

The delivered web app is a mockup and MVP for validating the experience. The production targets are installed iOS/iPadOS apps for iPhone and iPad, and Android apps for phones and tablets. The web MVP exercises those screen sizes, including portrait, landscape, safe-area insets and reduced-height screens. PNG install icons and Apple home-screen metadata support web MVP testing.

The usability pass keeps a compact sentence bar outside the scrolling grid, restores each tab's own scroll position, enlarges language/message controls and offers Undo after clearing. Voice testing and offline status are visible on phones as well as tablets. Voice checks require both completed playback and the user's confirmation; they do not automatically certify device audio. Offline status only reports ready after an activated service worker is present, and explains that custom-text device voices can still depend on a connection.

Picture scanning selects core-board words with Space/Enter and stops with Escape. Standard controls also remain keyboard accessible. Haptics depend on browser support; iPadOS may not expose vibration. Desktop viewport simulation does not certify physical switches, eye trackers, iPadOS audio behavior, microphone permissions or Android vendor voices.

The speech controller accepts injected platform adapters so the mobile apps can replace browser speech/audio while sharing the vocabulary model. The [production mobile path](../README.md#production-mobile-path) calls for physical-device speech/recording and offline proofs before choosing the framework, followed by durable native storage, backup sharing, accessibility verification and store packaging. Native iOS/iPadOS and Android projects remain future work, as requested.

## Data and backup

Workspace preferences, personal words, word edits, photos, per-language recordings, saved picture/text messages, quick responses and routines use the existing guarded Redux/IndexedDB persistence. A version 2 workspace backup exports and restores these together, with explicit confirmation before replacement; version 1 imports migrate to defaults. Imports enforce a schema, size limits and media-type checks, including picture-message snapshots. The workspace is limited to approximately 24 MB so its backups fit under the 32 MB import limit. Snapshot media counts toward this total. Advanced Cboard boards retain their original separate import/export flow; installing this release does not replace existing boards.

## Deferred features

Remote caregiver editing, Bluetooth coaching, hardware-specific eye-tracker calibration, cloud accounts/sync, AI-generated boards, automatic conversation listening/captions and smart-home/computer control are not part of this release. These require separate consent, security, hardware or service work. Local phrase suggestions search our included catalog; they are not labelled as AI prediction. A qualified speech-language professional and intended users should help refine the starter vocabulary before everyday reliance.
