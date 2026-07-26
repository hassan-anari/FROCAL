# Phase 1 — Final Polish v1.2

## Scope completed
- Intro always remains the first screen.
- New players enter onboarding after pressing `Enter Dexo Land`.
- Returning players press the same button and go directly to Base.
- Onboarding characters are larger and each scene uses a distinct Dexo asset.
- Onboarding and Base character assets preload and decode before interaction.
- Base defaults to the player level character; Level 1 uses `dexo.level01`.
- Tapping Dexo cycles through Curious, Happy, Focused, Surprised and Victory reactions.
- Every reaction has rotating dialogue lines without immediate repetition.
- Dialogue appears as a speech bubble near Dexo and disappears with the reaction.
- After 10 seconds without another interaction, Dexo returns to the current level character.
- Character changes use a smooth blur/fade crossfade.
- Dexo is larger in onboarding and Base; platform scale and spacing were corrected.

## Asset policy
- No Dexo artwork, logo or main background files are included in this delivery.
- Existing paths remain in `src/assets/manifest.json`.
- `missing-asset.svg` remains bundled for development/error handling.

## Next phase
Phase 2: Main App Shell and Core Navigation — Base, Earn, Clan, Arena and Profile navigation foundation, Objective/Next Action UI, status area and first mission-loop surfaces.
