# Mobile Motion Performance Pass

## Functional correction
- Base `All missions` now opens `/earn`.
- The Earn tab state is explicitly reset to the default `Earn` tab before navigation.

## Mobile motion changes
- Removed whole-page scale from route transitions; navigation now uses a short opacity + 6px directional translation.
- Removed permanent `will-change` / forced GPU promotion from the large scroll surface.
- Removed animated `filter: drop-shadow()` from the active bottom-nav icon; its lightweight pseudo-element glow remains.
- Replaced `AnimatePresence` `popLayout` / `wait` modes in primary content swaps with `sync` to avoid layout measurement/wait stalls.
- Shortened micro/tab/page/overlay timings while keeping the existing easing curve.
- Added a shared transient motion lock: background CSS animations pause briefly during route/tab transitions and remain paused while overlays are open.
- Background CSS animation pause is scoped to `[data-game-scroll]`, so portal overlays continue animating normally.
- Profile modal and Earn center overlays no longer animate scale; they retain smooth opacity + translate motion.
- Removed permanent `translateZ(0)` / `will-change` from large overlay surfaces where Motion already drives transforms.

## Validation
Passed:
- `npm run validate:structure`
- `npm run validate:imports`
- `npm run validate:motion`

Local TypeScript/full build could not complete because this sandbox's `node_modules` is incomplete and is missing the configured type packages (`@types/node`, `vitest/globals`, `@testing-library/jest-dom`). This is an environment dependency issue rather than a reported source-code diagnostic. Vercel should run its normal clean dependency install before build.
