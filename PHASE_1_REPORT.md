# Phase 1.1 — Onboarding & Base Polish

This checkpoint is a focused correction pass over Phase 1 v1.0. It does not add the main app navigation or new gameplay systems.

## Completed changes

### Intro transition
- Removed the bright portal-flash transition.
- The Intro content now fades and softens out.
- The existing Dexo Land background darkens before the onboarding route appears.
- Onboarding content fades in gently instead of entering with a hard horizontal slide.

### Onboarding character presentation
- Removed the circular orbit/halo behind Dexo.
- Removed the repeating acquired burst animation.
- Kept the upward micro-particles on the **Companion Acquired** scene only.
- Corrected character/platform alignment and lowered the platform so it sits beneath the character.
- Added per-pose character scale values for more consistent visual size.
- Changed scene transitions to soft fade/vertical movement.
- Added preloading for all Phase 1 onboarding character assets.

### Base redesign
- Removed the Dexo Land image from Base.
- Replaced it with a static dark-navy design-system background.
- Removed the scanning line, moving light column, and particles.
- Corrected character and platform positioning.
- Interaction is now restricted to the character itself, not the full stage.
- Character pose changes crossfade without a blank/disappearing frame.
- The action button no longer causes the character to disappear.

### Asset policy
The checkpoint ZIP does not include:
- Dalexio logos
- Dexo Land background
- Any Dexo character artwork

All existing paths remain in `src/assets/manifest.json`. The main repository remains the source of truth for artwork.

## Phase 1 scope after this checkpoint
- Intro to onboarding transition
- First-name greeting
- Dexo introduction and acquisition
- Play / Grow / Unite / Compete guide
- Persistent onboarding state
- Personal Base entry
- Dexo micro-interaction
- Diagnostics reset flow

## Next phase
**Phase 2 — Main App Shell & Core Navigation**

Planned scope:
- Bottom navigation
- Base shell aligned with the approved app reference
- Earn, Clan, Arena, and Profile route foundations
- Notification/status areas
- First objective and mission surfaces
- Locked/coming-soon handling for incomplete modules

Phase 2 will begin only after this Phase 1.1 checkpoint is approved.
