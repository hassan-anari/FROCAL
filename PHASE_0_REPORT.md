# Phase 0 v0.2 — Correction Report

## Reason for the revision

The first checkpoint was technically useful but visually behaved like a responsive landing page. It expanded to a desktop composition, exposed diagnostics in the user-facing screen and mixed development information with the game shell.

Version 0.2 corrects Phase 0 before any Phase 1 work begins.

## Corrected product behavior

- The Mini App is portrait-first and mobile-only.
- The product canvas supports 320–460px widths.
- A desktop browser or Vercel preview shows a centered mobile canvas.
- A real Telegram launch fills the available Mini App WebView.
- The root route no longer contains a diagnostics button or desktop status rail.
- Diagnostics remain available only at `/diagnostics`.
- Foundation progress is no longer incorrectly derived from player XP.

## Telegram corrections

- Telegram is detected from real launch context (`initData`, user or start parameter), not simply from loading `telegram-web-app.js`.
- Client platform is exposed separately from runtime mode.
- `safeAreaInset` and `contentSafeAreaInset` are read and synchronized to CSS.
- Safe-area update events are subscribed to.
- Stable viewport height remains synchronized.
- Native Back Button is used on the diagnostics route.

## Vercel corrections

- Added `vercel.json` SPA rewrite.
- Phase 0 requires no environment variables.
- Direct refresh of `/diagnostics` is supported after deployment.
- The recommended validation flow is GitHub → Vercel → test Telegram bot.

## Validation completed in the build environment

Passed:

- core structure validation;
- required Phase 0 asset validation;
- internal import validation;
- TypeScript/TSX transpilation syntax validation;
- CSS structural validation.

The package registry returned HTTP 503 in the build environment, so dependency installation, full TypeScript semantic checking, Vitest, Playwright and the Vite production build must be run by Vercel or the reviewer environment. The relevant test cases and build scripts are included.

## Phase 0 status

Phase 0 should only be considered approved after the corrected version is deployed to Vercel and verified inside the test Telegram bot at mobile WebView dimensions.
