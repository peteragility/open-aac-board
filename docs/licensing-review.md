# Licensing and name review

Reviewed 29 October 2026 for the free, noncommercial NGO/community web MVP. This is a technical inventory and preliminary public-source review, not a trademark opinion or a legal sign-off for native distribution.

## Implemented

- GPL-3.0-only code license, upstream copyright and dated modification notices retained.
- Public source: https://github.com/peteragility/open-aac-board (anonymous access verified).
- Each deployed release includes a `git archive` of its exact committed source, plus `/source/release.json` with the commit and archive SHA-256. Production About links pin both downloads to `/source/<commit>/`; older versioned archives are retained during deployment. The source contains the pinned lockfile, build/deploy scripts and bundled assets.
- Credits and direct links to the public repository, corresponding source, full license texts, dependency inventory and asset inventory are available in About.
- The GPL text and generated notices are included in the offline cache.
- `npm run licenses:check` verifies the notices against the installed locked dependencies before deployment. No dependencies or versions were added/changed for this work.
- The project remains free and noncommercial. ARASAAC is retained under its separate terms, with author/source/NonCommercial/ShareAlike attribution. This does not add a noncommercial restriction to the GPL code.

## Artwork and dependency review

`THIRD_PARTY_NOTICES.md` is the maintained explanation. Generated files under `public/licenses/` record versions, provenance, hashes, original license/notice text and evidence exceptions. They cover the entire locked install, including development tools; they are not a list of packages proven to be in the browser bundle.

Important distinctions verified during the review:

- Mulberry is CC BY-SA 4.0; ARASAAC is CC BY-NC-SA 4.0. Their image licenses are separate from the code license.
- The actual installed Roboto font's WOFF name table identifies Google copyright 2011, font version 2.137 (2017), and Apache-2.0. The npm wrapper's MIT field does not replace the font license. Apache text is now bundled.
- `react-icons/md` uses the Google Material Design collection; the generic MIT wrapper notice is not the complete artwork attribution.
- ogv.js includes separate codec copyright and patent notices. Those package-provided `dist/` notices are preserved.
- Some inherited packages omit standalone license files or metadata. Supplemental texts, where available, are captured from upstream at the `gitHead` recorded in npm metadata for that exact published version. Missing evidence is flagged rather than treated as permission.
- BrowserStack's inherited development SDK has restrictive terms. It is not called by the MVP's local test/deploy commands. Do not copy the tool's executable code into a distributed app merely because it appears in the inventory.
- The inherited `face_landmarker.task` was verified byte-for-byte against the official Google float16/version-1 bundle (SHA-256 `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`). The [Google guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker) links model cards for FaceDetector, FaceMesh-V2 and Blendshape; all three identify Apache-2.0. The provenance record and links are shipped in `public/licenses/upstream/model-provenance.json`, alongside the Apache text. The main workspace does not enable eye tracking.
- The inherited Cboard asset directory contains logos and `picseepal.png`. Upstream inclusion and attribution are not trademark/publicity clearances for new marketing.

These evidence exceptions remain a dependency/media release-review list. Producing the inventory does not resolve every inherited component's rights. Before a wider/native release, establish which components are actually shipped, resolve those exceptions, and remove unused restricted components or obtain the necessary permission. Do not silently label unresolved material MIT or GPL.

## Name check

Working names checked: `Open AAC Board`, `OpenAAC`, `粵語說話` and `粵語說話 溝通板`.

Public web searches on 29 October 2026 did not establish an independently verified exact-name app conflict for the full working name. This is a limited observation about indexed results, not a finding that the name is available.

A closely related name is already in use in the same field: the [OpenAAC Initiative](https://www.openaac.org/) and its [GitHub organization](https://github.com/open-aac). Its existence is a reason to avoid implying affiliation and to consider a more distinctive final brand. It is not, by itself, evidence that our name infringes a registered mark.

Official Hong Kong registry check: reached https://esearch.ipd.gov.hk/nis-pos-view/ and its trade-mark search notice. The notice's Accept button remained disabled behind interactive verification; no register query or results were obtained. No “zero matches” or trademark clearance is claimed. No application or fee has been submitted.

The [IPD search guidance](https://www.ipd.gov.hk/en/trade-marks/search-for-a-trade-mark/index.html) links to both text and image searches. Its [registry search manual](https://www.ipd.gov.hk/filemanager/ipd/common/trade-marks/registry-work-manual/current/eng/Search.pdf) also explains that unregistered earlier rights may not be revealed by the register.

Before adopting a final public brand:

1. Complete the human-verification step and search exact and similar English/Chinese names in the IPD register, including relevant software and service classes (initially 9 and 42; confirm the actual goods/services with the searcher).
2. Check the final logo with IPD's Image Mark Finder, relevant unregistered names, and app-store listings.
3. Extend the search to each intended distribution territory; a Hong Kong search is not worldwide clearance.
4. Have the results assessed if there are similar marks, then decide whether to retain the working name or choose a distinct brand. No trademark registration or legal opinion has been obtained here.

The current app's About screen identifies the name as a working project name and disclaims affiliation with OpenAAC and Cboard. That is transparency, not a substitute for name clearance. No name/logo was changed without a final brand decision.

## iOS/iPadOS distribution assessment

Finding: **not cleared for App Store distribution**. The current artifact is a web MVP, not a native package submitted to Apple. Free pricing and NGO use do not remove copyright-license or store-contract obligations.

Evidence:

- Cboard and this derivative carry GPLv3. No separate Apple App Store exception or permission was found in the imported project's license/notices during this review. That is not proof that the rights holders could not offer one.
- Apple's [Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/) requires compliance with included FOSS licenses and representations concerning compatibility with digital signing/content protection and the program's terms. Its terms for free apps still apply to free distribution.
- [GPLv3](https://www.gnu.org/licenses/gpl-3.0.html), particularly sections 6, 7 and 10, governs object-code/source distribution, permitted additional terms and further restrictions.
- [WIPO's mobile-app IP handbook](https://www.wipo.int/documents/d/mobile-apps/docs-handbook-ip-mobile-apps.pdf), pages 267–268, calls out the additional complexity of copyleft software and Apple's App Store terms.

This does not establish that all GPL apps are categorically banned. It means that wrapping our current derivative in a native shell, publishing a public repository, or adding an EULA is not enough evidence to declare this particular distribution compliant.

Practical path:

1. Continue the web MVP and test its Safari/Home Screen experience on physical iPhones/iPads. This avoids making an unreviewed App Store distribution now; it does not remove the web distribution's existing license obligations.
2. Before choosing a store wrapper/framework, prepare a proposed package and reachability list showing the GPL code, assets, libraries, source/install materials and Apple terms that would apply.
3. Obtain a licensing review for that concrete package. If additional permission is needed, obtain it from all necessary copyright holders through an authorized route; we cannot grant ourselves an exception to Cboard's code. Merely rewriting the UI or removing attribution would not remove the inherited GPL obligations.
4. Only after that review, choose a supported compliant route: use the GPL code under a reviewed distribution arrangement, obtain adequate additional rights, or separately plan an independently implemented mobile app with suitable licenses. An independent implementation would need its own work and provenance review; it has not been created by this task.

Prepared questions for an upstream/qualified reviewer (not sent):

- Is there an existing App Store exception or additional license covering the exact Cboard code and necessary contributions that we may rely on?
- Under the proposed Apple agreement, EULA and protection settings, can this derivative preserve all GPL recipient rights? If not, which permissions and rights holders are required?
- What corresponding source and installation information must accompany the proposed package, and how should users obtain them for every version?
- Do the separately licensed icons, fonts, models and symbol collections impose further restrictions on the proposed store package?

No messages were sent to upstream developers, Apple or legal advisers. No exception, legal opinion or store approval has been obtained.

## Android distribution assessment

The existing GPL code and noncommercial artwork also need to retain their notices and applicable source/media rights in an Android package. Include accessible license notices, a source archive matched to every released APK/AAB, dependency/media review, and any installation information required by the applicable GPL provisions. Review the actual store agreement and package before release. A source link alone is not a universal compliance guarantee. No APK/AAB or Play submission was made in this task.

## Remaining decisions

The engineering/documentation work is implemented. These external decisions remain open and must not be represented as completed legal clearance:

- Human-assisted register/image search and final brand decision.
- Rights/provenance resolution for any inherited dependency/media exceptions actually shipped in the intended release.
- A concrete iOS distribution review and any necessary rights-holder permission before App Store packaging.

Recheck current terms and regenerate the inventories whenever dependencies, artwork, branding, distribution channel or the noncommercial project direction changes.
