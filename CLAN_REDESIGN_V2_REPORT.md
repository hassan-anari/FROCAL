# Clan Redesign V2 — Applied Changes

This iteration applies the requested Clan refinements without adding new game systems or new artwork.

## Applied

- Clan artwork preloading starts at app bootstrap so Role/HQ/Inventory artwork begins downloading before the player navigates to Clan screens.
- Role cards polished:
  - Dexo moved away from the edge.
  - subtle idle float/rotation motion added.
- Clan Discovery:
  - Clan identities use the crest/shield frame only.
  - Player/member circle frames remain reserved for people.
  - Clan image support added; when no image exists, deterministic Telegram-style color + initials are shown inside the shield.
  - Featured HQ moved inward and reduced to improve composition.
  - disabled/pending join-request CTA now spans the full sheet width.
- Clan Overview:
  - Mission percentage block redesigned as a compact live progress ring.
  - HQ tab bar is no longer sticky/floating over scrolled content.
- Inventory / Shop:
  - items now show quantity (`xN`) rather than binary Owned state.
  - repeat purchases are allowed and stack in inventory.
  - all current Clan artwork items are listed: 3 Boosters, 4 Defence items, 4 Utility items.
  - Shop is grouped by Booster / Defence / Utility.
- Captain Join Requests:
  - Telegram-style avatar fallback with member frame.
  - username, level, season score, global rank, active days, contribution preview and key medals added.
- Captain Clan Registration:
  - Captain no longer enters a Telegram Chat ID manually.
  - mock eligible groups represent backend-known Telegram groups where Dalexio Bot is admin and the user has admin authority.
  - flow: verified group selection -> Clan identity setup -> register HQ.
  - includes an `Add Dalexio Bot to a group` Telegram deep link for groups not yet eligible.
  - Created Clan stores the Telegram group identity for later backend integration.
- Existing unrelated Clan flows were intentionally left unchanged.

## Backend contract implied by the frontend mock

For production, the eligible-groups API should return backend-known groups for the authenticated Telegram user and only permit Clan registration after server-side validation of:

- Telegram chat/group ID
- group title / username / photo
- Dalexio Bot is currently an administrator
- user is owner or authorized administrator
- group is not already registered as another active Clan for the season

The frontend should receive/select these records; it should not trust a manually entered Chat ID.

## Validation performed

Passed:

- `validate:structure`
- `validate:assets`
- `validate:imports`
- `validate:motion`
- TypeScript/TSX syntax transpilation for every modified TS/TSX file

A full dependency install/build could not be rerun in this environment because `npm install` timed out. No full-build success claim is made.

## Packaging

The V2 ZIP intentionally excludes `public/assets` and preview artwork. Keep the existing asset directory from the main project when applying this code-only build.
