# Phase 6 — Arena / Competition Hub (Initial Frontend)

## Product direction
Season 1 intentionally keeps Arena simple:

- Player leaderboard
- Clan leaderboard
- Current player standing
- Current clan standing when the user belongs to a clan
- Founding Season overview
- Season 2 Warfront teaser

War, Defence and Rivalry are not exposed as active Season 1 systems.

## Implemented UI

### Season hero
- Founding Season identity
- Season progress
- Days remaining
- Seasonal reward capsule artwork

### Rankings
- `Players | Clans` switch
- Top-three podium
- Ranked list
- Persistent “You” row for player standing
- Persistent own-clan row when the user has a clan
- Empty clan-standing state when the user has not joined/founded a clan

### Season 2 Warfront
- Uses `war-scene-matchmaking.webp`
- Explains War / Defence / Rivalry without making them interactive
- Explicitly locked until Season 2

## Arena asset integration
All supplied Arena artwork is registered in the asset manifest for future phases:

- 10 War scenes
- 5 War result artworks
- 4 War status artworks
- 6 Alliance artworks
- 4 World Event artworks
- 2 Seasonal item artworks

Only the assets required for the visible Season 1 screen are eagerly preloaded.

## War frontend foundation
`src/game/arena/arenaCatalog.ts` includes the agreed War state sequence so Phase 6 can continue without redefining the flow:

1. Matchmaking
2. Opponent found
3. Opponent preview
4. Match confirmation
5. Preparation
6. Item selection
7. Countdown
8. Active battle
9. Final moments
10. Defence setup

The user-facing War flow remains locked in this checkpoint.

## Validation
Passed without installing dependencies:

- `npm run validate:structure`
- `npm run validate:assets`
- `npm run validate:imports`
- `npm run validate:motion`
- TypeScript syntax transpilation for the new Arena files

A full `npm install` could not be completed in the sandbox because the registry request timed out, so a complete `npm run build` was not re-run locally.
