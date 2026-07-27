# Phase 3.3 — Mobile Motion Optimization

This pass is mobile-first and targets Telegram WebView performance. No product feature, copy, route, state, or asset path was changed.

## Motion preserved
- Page and tab transitions
- Notification drawer and modal sheets
- Dexo floating, pose transitions and reactions
- Intro atmosphere, particles and camera drift
- Onboarding reveals
- Reward, level-up and typing result reveals
- Button micro-interactions

## Performance changes
- Removed animated `filter: blur()` from page, tab and Dexo transitions.
- Rebuilt primary transitions around compositor-friendly `transform` and `opacity`.
- Reduced travel distances and durations for responsive mobile feedback.
- Removed large live `backdrop-filter` surfaces from navigation, notifications, sheets, chips and dialogue.
- Replaced animated width progress bars with `scaleX` transforms.
- Removed `height: auto` / collapsing-height motion from Base conditional cards.
- Converted Dexo's permanent float to a lightweight CSS transform animation.
- Pauses ambient Dexo and button animations while an overlay is open.
- Pauses CSS animations when the Telegram WebView is hidden.
- Reduced permanent GPU layer hints to `transform` and `opacity` only.
- Kept static gradients and controlled glow so the visual identity remains intact.

## Mobile motion profile
- Micro feedback: 160ms
- Tab change: 200ms
- Page change: 240ms
- Overlay/sheet: 260ms
- Reveal: 280ms
- Cinematic intro content: 520ms

## Target
- Widths: 320–460px
- Runtime: Telegram mobile WebView
- Target experience: stable 60 FPS with premium motion
