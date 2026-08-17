# Phase 6 — Arena V2

## Scope
Arena was reorganized around two clear top-level sections so Season 1 remains simple while Season 2 Warfront can be introduced without mixing two different experiences on one long page.

### Warfront — default tab
- Arena now opens on `Warfront`.
- Season 2 is presented as a cinematic, locked preview instead of a small card below the leaderboard.
- The preview explains the future loop in three readable phases:
  1. Match with a rival clan
  2. Prepare a shared clan plan
  3. Fight through verified activity
- Defence is introduced separately as the post/defensive side of Warfront.
- Warfront remains disabled for Season 1.

### Rankings — second tab
- Founding Season / Season 01 card moved into Rankings.
- Removed the redundant `YOUR SEASON / Keep climbing` card.
- Player and Clan leaderboards remain in the same canonical Arena section.
- The current-player row now uses the Telegram profile photo used by the global header, with the same initial-style fallback when no photo is available.

## Asset loading
Preload is now section-aware:
- Warfront loads only the Warfront art it uses.
- Rankings loads the seasonal reward capsule when Rankings is opened.

## Output policy
The delivered archive is full project source **without `public/assets` graphic files**. Keep the existing `public/assets` directory from the project/repository when merging this source.

## Validation
- structure validator: passed
- asset manifest validator: passed on the working copy containing the existing asset library
- local import validator: passed
- mobile motion validator: passed
- TypeScript syntax transpile check: passed for ArenaPage.tsx and arenaCatalog.ts
- Full npm build was not run locally because dependency installation timed out in this sandbox.
