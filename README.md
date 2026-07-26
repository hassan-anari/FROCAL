# Dalexio Mini App — Phase 1

Telegram-first React/Vite vertical slice covering:

- Approved Dexo Land intro from Phase 0
- Portal transition
- First-name greeting
- Dexo reveal and acquisition
- Play / Grow / Unite / Compete guide
- Persistent onboarding state
- Returning-player routing
- Personal Base with Dexo interaction
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

The ZIP intentionally does **not** contain the existing Dalexio logo files or the approved Dexo Land background. Those paths remain in `src/assets/manifest.json` and are expected to stay in the main repository.

The supplied 25-file Dexo character pack is included under `public/assets/dexo/`.
