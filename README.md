# Dalexio Mini App — Phase 0 v0.4

Mobile-first Telegram Mini App foundation for Dexo Land.

## Run

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run check
```

No environment variable is required for the Phase 0 local/mock data mode.

## Routes

- `/` — polished Dexo Land intro
- `/diagnostics` — Telegram/runtime diagnostics

A small Hugeicons diagnostics control is available globally on every route.

## Replace the intro artwork

Replace this file without changing any component:

```text
public/assets/world/dexo-land-foundation.webp
```

Recommended export: portrait WebP, 900×1350 or larger, without baked typography.
