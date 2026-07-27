# Phase 3.2.1 — Vercel TypeScript Fix

## Root cause
`referralRows` was declared with `as const`. TypeScript inferred a union of five distinct object shapes. Only the first shape contained `useTelegramPhoto`, so `person.useTelegramPhoto` was not valid for every member of the union during `tsc -b`.

## Fix
- Added an explicit `ReferralRow` type.
- Defined `useTelegramPhoto`, `earnedXp`, and `activation` as optional properties.
- Typed `referralRows` as `readonly ReferralRow[]`.
- Added a regression test for rows with and without Telegram profile photos.
- No UI, copy, motion, route, state, or asset changes were made.

## Expected Vercel result
`npm run build` should pass the previous TS2339 errors in `EarnPage.tsx`.
