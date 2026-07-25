# Dalexio Mini App — Phase 0 Foundation

Phase 0 establishes the production foundation for **Dexo Land**, the Telegram-native game airdrop Mini App. This checkpoint intentionally stops before onboarding and gameplay. Its job is to prove that the application shell, design system, Telegram integration, mock contracts, asset registry, responsive viewport behavior, and test harness are ready for Phase 1.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Full local verification

```bash
npm run check
```

This runs structure validation, required asset validation, TypeScript checks, unit tests, and the production build.

For browser smoke tests:

```bash
npm run test:e2e
```

## Data modes

The app works immediately with an in-memory, Zod-validated fixture:

```env
VITE_DATA_SOURCE=local
```

To validate request-level integration with MSW:

```bash
npm run mock:init
```

Then set:

```env
VITE_DATA_SOURCE=msw
```

## Telegram testing

The app loads Telegram's official Web App bridge in `index.html`. Outside Telegram, the adapter runs in safe browser-fallback mode. Inside Telegram it automatically:

- calls `ready()` and `expand()`;
- synchronizes theme parameters;
- tracks stable viewport height;
- exposes safe haptic methods;
- supports the Telegram back button;
- keeps Telegram access out of feature components.

## Routes

- `/` — immersive Phase 0 world foundation
- `/diagnostics` — runtime, asset, contract, and motion diagnostics

## Asset workflow

All paths are controlled from `src/assets/manifest.json`. The application never scatters raw asset URLs across feature components.

Phase 0 only requires four local assets. Future keys are already reserved for Dexo progression, missions, inventory, clans, wars, alliances, world events, profiles, and seasons. Replace files at the declared paths without changing UI code.

## Mock scenario lab

During development, use the **Dev** control in the lower-right corner to switch between:

- New user
- Active player
- Level 20
- Clan member
- Clan captain
- Battle ready
- Season champion
- Empty state
- Error state
- Maintenance

The lab is excluded from production builds unless explicitly enabled.

## Phase 0 boundary

Included:

- app bootstrap and providers;
- code-based type-safe routing;
- Telegram adapter and theme synchronization;
- Inter-based visual tokens;
- asset registry and fallback strategy;
- Zod domain contracts;
- local and MSW mock sources;
- Zustand scenario controls;
- loading and error boundaries;
- reduced-motion support;
- safe-area and stable-height handling;
- unit and end-to-end test scaffolding.

Not included until approval:

- onboarding;
- Dexo acquisition;
- Base navigation;
- missions and typing game;
- progression rewards;
- clan or battle gameplay.

Those begin in Phase 1 only after this foundation is approved.
