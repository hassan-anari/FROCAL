# Phase 1 — Entry, Dexo Acquisition & Base

## Completed experience

1. Approved Phase 0 intro preserved.
2. `Enter Dexo Land` now starts a real portal transition.
3. Returning users are routed directly to Base.
4. New users receive a persisted five-scene onboarding flow.
5. Greeting uses Telegram `first_name`.
6. Dexo reveal, acquisition and world-guide moments use the supplied final character assets.
7. Base contains a live Dexo stage, level/XP HUD and a complete local interaction.
8. Diagnostics includes onboarding state and reset controls.

## Persistence

Local key: `dalexio-onboarding-v1`

States:

- `not-started`
- `in-progress`
- `dexo-acquired`
- `completed`

## Asset policy

Included:
- 25 supplied Dexo WebP assets.

Excluded from the delivery ZIP:
- `public/assets/brand/dalexio-logo.svg`
- `public/assets/brand/dalexio-logo-tagline.svg`
- `public/assets/world/dexo-land-foundation.webp`

Their manifest paths remain unchanged so the files already maintained in the main repository continue to be used.
