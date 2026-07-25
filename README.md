# Dalexio Mini App — Phase 0 v0.3

Mobile-first foundation for the Dexo Land Telegram Mini App.

## Run

```bash
npm install
npm run dev
```

## Full validation

```bash
npm run check
```

## Vercel

No environment variable is required for the Phase 0 local mock data source. The included `vercel.json` rewrites SPA routes to `index.html`.

## Routes

- `/` — completed Phase 0 Dexo Land intro.
- `/diagnostics` — technical deployment diagnostics.

A compact diagnostics button is available on every page, including inside Telegram where the URL cannot be manually edited.

## Entry handoff

The `Enter Dexo Land` button dispatches:

```text
dalexio:enter-dexo-land
```

Phase 1 will bind this handoff to the final onboarding route. No temporary unfinished gameplay page is included in Phase 0.
