# Clan Redesign V1 — Review Build

## Goal
Turn the existing Phase 5 Clan frontend from a dashboard-heavy prototype into a more premium, game-like headquarters experience without expanding the product scope or adding new gameplay systems.

## Product flows kept unchanged
- Clan locked below Level 5
- Permanent Captain / Soldier seasonal role choice
- Soldier Discover / Search / Ranking
- One active join request
- Captain clan founding
- Headquarters tabs: HQ / Missions / Roster / Inventory
- Captain join-request management
- Treasury-funded mock Shop
- Group and Individual clan missions
- Clan honors and activity history

## Visual redesign
- Locked state now uses the supplied locked HQ artwork.
- Role selection uses `dexo-role-captain` and `dexo-role-officer` as the Captain and Soldier characters.
- Clan identity uses the supplied crest/circle emblem frames.
- Discovery has a large featured-clan scene using HQ artwork instead of only list cards.
- Captain founding shows a real starter HQ preview.
- Headquarters is now a large visual scene with dynamic HQ artwork based on clan level.
- HQ keeps only the most important HUD metrics: members, Treasury, season score and level progression.
- Duplicate full leaderboard content was reduced in HQ; only current seasonal standing is surfaced there.
- Clan-specific honors remain compact in HQ and are not duplicated as player achievements.
- Roster reuses the existing Clan/Captain profile frames.
- Inventory and Shop use supplied item artwork instead of letter glyph placeholders.
- Clan preview and item detail modals now use supplied artwork.

## Asset strategy
All 22 supplied Clan assets were copied into `public/assets/clan/` and registered in the asset manifest for future use, but only a focused subset is shown in this first redesign to avoid visual clutter.

Currently surfaced heavily:
- HQ Level artwork
- HQ locked state
- Clan crest/circle emblem frames
- Dexo Captain / Officer role artwork
- Emergency Repair Kit
- Clan XP Booster
- Firewall Shield
- HQ Upgrade Kit

Other supplied assets stay registered and ready for later War / Recovery / Upgrade / Alliance states.

## Readability
Clan typography was raised compared with the previous prototype. Important text is no longer intentionally set in the 6–9px range inside the redesigned Clan surfaces.

## Validation performed
Passed:
- `validate:structure`
- `validate:assets`
- `validate:imports`
- `validate:motion`
- TypeScript syntax transpilation checks for modified TS/TSX files

Full dependency installation/build could not be re-run in the current review environment because `npm install` timed out before dependencies were available. No production backend/API integration was added.
