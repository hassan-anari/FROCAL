# Phase 4.1 — Profile Composition & Modal Polish

## Profile composition
- Reworked the title plate into a compact identity badge integrated with the name and Telegram handle.
- Reused the shared primary button primitive for Profile and modal actions.
- Fixed gradient corner artifacts on primary actions.
- Restored the recurring left-to-right sheen on Profile and modal primary buttons.

## Shared profile modal system
- Profile overlays now render through a portal directly under `document.body`.
- Modals are fixed to the current mobile viewport, independent of the page scroll position or transformed route container.
- Added complete Telegram and device safe-area spacing on all sides.
- The backdrop covers the entire viewport, including the area behind bottom navigation.
- Background page and navigation become inert while a modal is open.
- The game scroll container is locked and restored to its exact previous position after close.
- Only the modal body scrolls; header and action footer remain visible.
- Added focus management, keyboard escape handling and a contained Tab focus loop.
- Every detail modal now has a visible action. Locked, already equipped and already featured items use `Got it`.

## Share preview
- Replaced the decorative poster-like preview with a simpler mobile profile summary.
- The preview now focuses on avatar, identity, title, level, lifetime XP, season and featured honors.
- It remains a symbolic Telegram share preview and does not imply image export.

## Asset delivery policy
- The 31 Profile WebP files are no longer bundled in the source checkpoint.
- Their paths remain unchanged in `src/assets/manifest.json`.
- The main repository remains responsible for serving the approved Profile assets.

## Unchanged
- Profile store, achievement progress, medal rules, frame rules, wallet mock, Dalexio account mock and main app header behavior were not changed.
