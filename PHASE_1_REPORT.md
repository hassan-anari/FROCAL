# Phase 1 — v1.3 Final

## Final fixes
- Moved Dexo dialogue above the character so it no longer covers the artwork.
- Added a typewriter speaking effect with a subtle animated cursor.
- Kept the 10-second return to the player level character.
- Retained non-repeating dialogue rotation per reaction.
- Improved asset preloading: decoded image objects are retained in memory for instant reaction swaps.
- Phase 1 onboarding and Base assets begin preloading as soon as the Intro is mounted.
- Removed the asset-readiness full-screen preloader from Onboarding and Base.
- Base now renders immediately with safe fallback player data if the bootstrap query is still resolving.

## Asset policy
No logos, main background, Dexo artwork, or Dexo platform files are bundled. Their existing manifest paths remain unchanged.

## Phase status
Phase 1 is ready for final Vercel and Telegram review.
