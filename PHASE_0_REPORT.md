# Dalexio Mini App — Phase 0 v0.3

## Status

Phase 0 has been revised as a mobile-first Telegram Mini App foundation. This checkpoint does not start Phase 1.

## User-facing intro

- Removed the animated rotating foundation core.
- Removed foundation verification and confirmation UI.
- Removed connection badges, user handle, phase status rail, and development copy from the intro.
- Rebuilt the intro as a clean Dexo Land hero with cinematic typography.
- Added the primary `Enter Dexo Land` action.
- The action emits the `dalexio:enter-dexo-land` browser event and triggers Telegram haptics. Phase 1 will bind this event to the onboarding route instead of adding a temporary fake screen.

## Diagnostics access

- Added a compact diagnostics control to the global product shell.
- It appears on every route in both Telegram and browser/Vercel previews.
- On normal pages it opens `/diagnostics`.
- On `/diagnostics` it returns to Dexo Land.
- Telegram's native Back Button remains active on the diagnostics route.

## Diagnostics cleanup

- Removed the large Back button from the diagnostics content.
- Removed the Phase 1 completion contract panel.
- Retained only runtime, safe-area, asset registry, mock contract, and experience guardrail checks.

## Preserved foundation

- Telegram launch context and user recognition.
- Stable viewport and safe-area events.
- Theme synchronization and haptic adapter.
- Portrait-first product canvas and Vercel desktop preview frame.
- Asset registry, Zod contracts, mock scenarios, Query, Router, Zustand, reduced motion, error and loading systems.
- Vercel SPA rewrite.

## Validation performed

Passed in this environment:

- Project structure validation.
- Phase 0 asset validation.
- Local import validation.
- TypeScript/TSX syntax transpilation for 31 source files.
- CSS parsing for 11 stylesheets.

Full dependency installation timed out in this environment, so `npm run check` and the production Vite build must also run in Vercel or on a machine with npm registry access.

## Phase boundary

Phase 1 must not begin until the deployed v0.3 intro and diagnostics navigation are approved inside the Telegram test bot.
