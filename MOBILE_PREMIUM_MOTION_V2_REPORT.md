# Dalexio Mobile Premium Motion V2

This pass targets **interaction latency and frame drops**, not only animation duration.

## Root causes addressed

1. **Telegram haptic bridge was called before the visual state change** on many taps.
   - Haptic feedback is now queued just after the next paint so the UI responds first.

2. **Heavy art was being fetched/decoded in bursts during interaction-critical frames.**
   - Clan startup preload is now delayed and idle-batched.
   - Background asset preloads are serialized one at a time.
   - Base, Earn, Profile, Arena, Foundation, Typing and Arena debug warm non-critical art after the transition window.
   - The currently active Profile frame remains an immediate preload.

3. **GameShell + bottom navigation were remounted on every route.**
   - GameShell now lives persistently in RootLayout for all game routes.
   - The scroll viewport and bottom navigation remain mounted between Base / Earn / Clan / Arena / Profile.
   - Only the route surface changes.
   - Typing still hides navigation without replacing the shell.

4. **Large tab trees were rendered simultaneously during AnimatePresence exit/enter.**
   - Primary Earn, Profile, Clan, Arena and War stage content no longer keeps old + new large trees alive together.
   - One lightweight parent settle animation remains so the UI still feels animated.

5. **Modal opening triggered expensive whole-app accessibility/style mutation.**
   - Profile and Clan modals no longer toggle `inert` / `aria-hidden` on the entire React root or rewrite the large scroll tree inline.
   - Scroll locking is handled centrally through the existing motion state class.

6. **The previous global animation pause selector touched every descendant.**
   - The universal `*` pause rule was removed.
   - Only known ambient effects (Dexo float/glow, button sheen, promo sweep) are paused during interaction windows.

7. **Notifications and Earn overlays mounted their animated shell only after the tap.**
   - Their shells now stay mounted and open through compositor-friendly CSS opacity/translate transitions.
   - This removes first-frame Motion mount/setup cost for these common overlays.

8. **Per-item stagger animation multiplied work on large lists.**
   - Mission and achievement lists rely on their parent tab transition instead of animating every card independently.

## Motion tuning

- Route content starts at 95% opacity rather than fully invisible.
- Tab content starts at 96% opacity with only ~5px movement.
- Page: 180ms
- Tab: 160ms
- Overlay: 190ms
- Micro: 110ms

The visual motion remains, but the user should no longer wait for the animation to become visible.

## Functional correction retained

Base `All missions` opens `/earn` and explicitly restores the default Earn tab.

## Validation

Passed locally:
- `npm run validate:structure`
- `npm run validate:imports`
- `npm run validate:motion`

A full TypeScript/Vite build could not be run in this sandbox because the local `node_modules` installation is incomplete and registry installation times out. No new dependency was added.
