# Mobile Performance Root-Cause Pass v3

This patch targets mobile Telegram interaction latency without removing the visual motion language.

## Runtime changes
- Removed global Clan art warming from app startup.
- Replaced parallel `Image.decode()` preloading with low-priority, two-at-a-time encoded asset prefetching.
- Removed JS retention of decoded image elements to reduce bitmap memory pressure.
- `AssetImage` now defaults to asynchronous decoding.
- Navigation no longer transforms/scales the full scroll container. A lightweight viewport veil carries the route transition instead.
- Bottom navigation highlights the destination from pointer-down for immediate touch feedback.
- Telegram haptic calls are moved to the next animation frame so native bridge work does not block the interaction handler.
- Removed redundant body overflow mutations from Notifications and Earn overlays.
- Removed root `inert` / `aria-hidden` mutations from Profile and Clan modal opening.
- Background-motion pause is applied after the first overlay frame rather than synchronously in `useLayoutEffect`.
- Modal scale animation was removed; overlays retain opacity + short vertical motion.
- Earn/Profile tab `popLayout` and Arena `wait` were changed to simultaneous transitions so the next view is not delayed by exit/layout work.
- Motion timings are slightly tighter for a touch-first WebView.
- `touch-action: manipulation` is applied to buttons and links.

## Mobile performance recorder
System Diagnostics now contains **Mobile interaction performance**.

1. Open System Diagnostics on the phone.
2. Tap **Start recorder**.
3. Return to the app and test Bottom Nav, Earn/Profile tabs, Notifications, Customize and Clan overlays.
4. Return to Diagnostics.

Metrics:
- **Avg tap → frame**: time from interaction to next animation frame.
- **Worst frame gap**: largest observed frame interval while recording.
- **Long tasks** / **Worst long task**: available on clients that expose the Long Tasks API.
- Latest interactions show `tap→frame / frame-gap` in milliseconds.

The recorder is dormant when OFF and adds no continuous frame loop in normal production use.

## Validation
- validate:structure: passed
- validate:imports: passed
- validate:motion: passed
- TypeScript syntax transpile: passed for changed TS/TSX files
- Standalone TypeScript DOM checks: passed for the new performance monitor, preload module and Telegram adapter
