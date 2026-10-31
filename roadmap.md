# Open AAC Board Roadmap

This is the roadmap for the Cantonese-first AAC web app and its planned mobile
releases. It supersedes the upstream Cboard roadmap retained in history. The
authoritative phase table with completion checks lives in the
[README](README.md#production-mobile-path); this file tracks the direction and
the reasoning.

## Guiding constraints

- Cantonese is the default; English and Mandarin are explicit choices. The app
  never silently substitutes Mandarin for Cantonese.
- Device-only storage. No accounts, no sync, no analytics, no payments.
- Every phase is validated with intended users and communication partners in
  Hong Kong before the next phase is built.

## Now (web MVP)

- Review vocabulary packs with Hong Kong AAC professionals and NGO staff.
- Simpler everyday communication layouts and direct printing of the current
  workspace.
- Jyutping search so partners can find words by romanisation.
- Share a built message to messaging apps via the Web Share API.
- Reduce first-load offline download size (precache only referenced symbols).

## Next

- Consistent navigation between the main workspace and the advanced Cboard
  boards, with a single backup covering both.
- Optional simpler layout with stable word positions.
- Automated accessibility checks (axe) alongside the existing viewport checks.

## Mobile proof of concept

Test speech, recording and offline operation on physical iPhone, iPad and
Android devices before choosing the native framework. Share vocabulary, board
data and interaction logic between web and native where practical.

## Mobile beta

Durable native storage, bundled offline assets, backup sharing and accessible
phone/tablet layouts. Address inherited dependency findings and confirm store
distribution requirements (see [licensing review](docs/licensing-review.md)).

## Store release

iOS/iPadOS and Android packages, store materials and a release/support
process, after user testing and beta feedback.

## Explicitly not planned

- Conversation history or server upload of any user content.
- Accounts, subscriptions, advertising or analytics.
- AI sentence rewriting unless it becomes an explicit, user-controlled choice.
