# Dalexio Mini App — Phase 0 Foundation v0.2

This checkpoint establishes the technical foundation for **Dexo Land** as a portrait-first Telegram Mini App. Phase 0 deliberately stops before onboarding and gameplay. Its purpose is to verify the runtime shell, Telegram bridge, safe areas, asset registry, mock contracts, routing and deployment behavior before Phase 1 begins.

## Product viewport

The product is mobile-only and portrait-first:

- target width: 390px;
- supported width: 320–460px;
- Telegram: fills the available Mini App WebView;
- desktop browser/Vercel preview: renders inside a centered mobile canvas instead of expanding into a website layout.

## Vercel-first workflow

The project is ready to connect directly from GitHub to Vercel.

Recommended Vercel settings:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Install command: npm install
```

No environment variables are required for Phase 0. Without `.env`, the app automatically uses the local Zod-validated fixture.

`vercel.json` contains the SPA rewrite required for refreshing routes such as `/diagnostics`.

## Telegram test flow

1. Deploy the GitHub branch to Vercel.
2. Put the Vercel HTTPS URL into the test bot Mini App configuration.
3. Open the Mini App through Telegram.
4. Verify the user, client platform, stable height and safe-area values at:

```text
https://YOUR-VERCEL-DOMAIN/diagnostics
```

The user-facing root route does not expose diagnostics or development controls.

## Optional local workflow

Local execution remains available but is not required for the project review flow:

```bash
npm install
npm run check
npm run dev
```

## Telegram integration

The adapter:

- detects a real Telegram launch from `initData`, user data or `start_param` rather than the mere presence of the bridge script;
- calls `ready()` and `expand()`;
- tracks stable viewport height;
- tracks `safeAreaInset` and `contentSafeAreaInset` changes;
- synchronizes Telegram theme variables;
- supports haptics and the native Back Button;
- keeps direct Telegram API access out of feature components;
- falls back safely when the Vercel URL is opened in a normal browser.

## Routes

- `/` — compact Phase 0 verification screen inside the product canvas
- `/diagnostics` — technical foundation diagnostics for testing

## Phase 0 boundary

Included:

- React/Vite/TypeScript application shell;
- portrait-first Mini App viewport;
- Telegram adapter and launch-context detection;
- stable viewport and Telegram safe-area support;
- Inter-based Dexo Land design tokens;
- centralized asset registry;
- Zod domain contracts;
- local and MSW mock sources;
- loading and error boundaries;
- reduced-motion support;
- Vercel SPA routing configuration;
- unit and end-to-end test scaffolding.

Not included until Phase 1 approval:

- onboarding;
- Dexo acquisition;
- Base navigation;
- missions and typing gameplay;
- progression rewards;
- clan or battle gameplay.
