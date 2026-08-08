# Phase 4.2 Mobile Test Checklist

1. Open Profile and confirm the active Title Plate sits cleanly between the player name and Telegram username; it must not collide with or hide under the ID.
2. Check the Profile identity card at 320–460 px widths and confirm the plate crop, username and avatar stay readable without overlap.
3. Open an Achievement, Medal, Frame or Customize modal and confirm single action buttons are centered, noticeably narrower than the full modal width, and labels are easy to read.
4. Open Share Profile and confirm the two-button action group is width-constrained, keeps clean rounded corners and retains the recurring primary-button sheen.
5. Open Profile after scrolling any app page, then open a medal or achievement.
6. Confirm the modal appears inside the current viewport instead of at the document top.
7. Confirm the dark backdrop covers the complete screen and bottom navigation.
8. Confirm the page behind the modal cannot scroll or receive taps.
9. Scroll the modal body and confirm its header and action button remain visible.
10. Close the modal and confirm the page returns to the exact prior scroll position.
11. Open locked, unlocked, equipped and featured items; every detail modal must show either its main action or `Got it`.
12. Check top, side and bottom safe-area spacing on Telegram Android and iOS.
13. Confirm both Wallet and Dalexio Account cards show `Coming soon` and do not expose temporary `Connect`, `Done`, connected or error controls.
14. Compare Profile, Earn, Base and modal text on the real phone: static text should look crisp, with no persistent whole-page blur/soft rasterization after transitions settle.
15. Confirm route transitions still feel smooth after removing page-wide scale/compositing hints.
16. Confirm the repository already contains all files referenced by `/assets/profile/*.webp`, because checkpoint ZIPs no longer bundle them.
