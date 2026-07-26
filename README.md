# Dalexio Mini App — Phase 1.1 Polish

Telegram-first React/Vite vertical slice covering:

- Approved Dexo Land intro from Phase 0
- Soft Intro-to-onboarding transition
- First-name greeting
- Dexo reveal and acquisition
- Play / Grow / Unite / Compete guide
- Persistent onboarding state
- Returning-player routing
- Dark-navy Personal Base with stable Dexo interaction
- Phase 1 diagnostics and onboarding reset

## Run

```bash
npm install
npm run check
npm run dev
```

## Routes

- `/` — approved Dexo Land intro
- `/onboarding` — first-time journey
- `/base` — personal Base
- `/diagnostics` — runtime and reset controls

## Asset delivery rule

This checkpoint intentionally excludes all repository-maintained artwork:

- Dalexio logos
- Approved Dexo Land background
- Dexo character and platform WebP files

Their paths remain in `src/assets/manifest.json`. Keep the existing files in the main repository when applying this checkpoint.
