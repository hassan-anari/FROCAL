# Phase 4.1 Mobile Test Checklist

1. Open Profile after scrolling any app page, then open a medal or achievement.
2. Confirm the modal appears inside the current viewport instead of at the document top.
3. Confirm the dark backdrop covers the complete screen and bottom navigation.
4. Confirm the page behind the modal cannot scroll or receive taps.
5. Scroll the modal body and confirm its header and action button remain visible.
6. Close the modal and confirm the page returns to the exact prior scroll position.
7. Open locked, unlocked, equipped and featured items; every detail modal must show either its main action or `Got it`.
8. Check top, side and bottom safe-area spacing on Telegram Android and iOS.
9. Check Profile `Share profile`, `Save profile` and detail action buttons for clean corners and recurring sheen.
10. Confirm the title plate reads as part of the identity block rather than a detached image.
11. Open Share Profile and confirm the simplified preview fits without clipping at 320–460 px widths.
12. Confirm the repository already contains all files referenced by `/assets/profile/*.webp`, because checkpoint ZIPs no longer bundle them.

## Phase 4.1.1 targeted checks

- Main Profile identity header shows the active title cleanly without the decorative Title Plate overlapping/cropping the Telegram username.
- Profile modal footer buttons are visibly shorter than v4.1 while their labels are larger/easier to read.
- `Feature achievement`, `Save profile`, `Got it`, `Copy link`, and `Share in Telegram` retain their approved treatments without oversized trailing-arrow blocks.
- Wallet row shows `Coming soon` and has no Connect/Done button.
- Dalexio account row shows `Coming soon` and has no Connect/Done button.
- Verify no unrelated global blur/rasterization changes from discarded v4.2 are present.
