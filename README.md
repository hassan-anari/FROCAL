# Dalexio Mini App — Phase 4.1.3

Mobile-first Telegram Mini App checkpoint for targeted Profile title, modal-button and Connections polish.

## Run

```bash
npm install
npm run dev
```

## Validation

```bash
npm run check
```

All Profile, brand, world and Dexo artwork remains repository-maintained. This checkpoint keeps manifest paths only and bundles the system fallback asset.

## New-chat handoff

For a fresh ChatGPT conversation, read these files in order before changing code:

1. `PROJECT_PRODUCT_AND_BUSINESS_LOGIC.md` — what Dalexio/Dexo Land is and the agreed business rules.
2. `PROJECT_STATUS_AND_ROADMAP.md` — exact completed/current/remaining development state.
3. `PROJECT_WORKING_INSTRUCTIONS.md` — permanent design, mobile, asset, QA and collaboration rules.

Current status: **Phases 0–4 are officially closed.** The accepted Phase 4 checkpoint is v4.1.3. **Immediate next action is to define Inventory business rules with the user, then implement Inventory.**

Exact v4.1 code baseline: `dalexio-miniapp-phase4-v4.1-profile-modal-polish.zip` — SHA-256 `d1a0ac219939b226153a365dce706cc7bb636937e3066d6fe7e788f503436ad7`.

Real QA loop: `ZIP → GitHub → Vercel build → Telegram test bot on a real phone → focused fixes`.

Important asset rule: the 31 Profile images, logos, main background, Dexo images and Dexo platform are repository-maintained and are not bundled in future checkpoints; exact paths remain in `src/assets/manifest.json`.

Current targeted checkpoint: `Phase 4.1.1` removes the decorative Title Plate from the main Profile header, compacts Profile modal CTAs, and marks Wallet/Dalexio Account as static `Coming soon`. The discarded v4.2 experiment is not part of this baseline.

Current targeted checkpoint: `Phase 4.1.2` fixes the height of the `Customize` and `Share profile` buttons directly under the Profile level bar. The Title Plate remains only in Customize live preview, not in the main Profile header.

Current targeted checkpoint: `Phase 4.1.3` compacts the two Profile header actions, removes Title Plate artwork from Customize live preview, and fixes immediate Avatar Frame updates via the shared AssetImage component.

Phase 4 closure: Profile & Identity is approved. Next major module: Inventory.

Next module clarification: **Clan** is next. Inventory is embedded inside Clan Headquarters. Level 5 unlocks a permanent Captain/Soldier choice; Soldier uses Leaderboard/Search/Suggestions + one join request, Captain creates/manages the clan, and accepted members move into Headquarters. Group Tasks and Individual Tasks are separate UI categories. Backend/economy logic remains mocked for frontend development.

Build correction: Phase 5.0.1 fixes the Clan applicant readonly/mutable TypeScript assignment reported by Vercel. No UI changes.

## B1 integration validation

B1 implementation and compatibility/device gates are documented in
[docs/B1_FRONTEND_REPORT.md](docs/B1_FRONTEND_REPORT.md).

- `npm test`: unit tests only.
- `npm run test:e2e`: independent Playwright suites, including local demo and fully
  intercepted authenticated API fixtures; no production API/reward calls.
- `npm run validate:telegram-sdk`: verify official SDK snapshot and SRI pin.
- `npm run check`: validators, full TypeScript, unit tests and production build.

For sandbox environments with a preinstalled Chromium, use
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e` with permission
for the local browser/server processes. CI uses Playwright's pinned installed browser.
Production builds require remote API data and reject mock or debug environment
flags. Select `VITE_DATA_SOURCE=local` or `msw` with `npm run dev` for explicit
development fixtures. Playwright uses a development fixture server alongside a
separate remote production bundle; fixture traffic never uses the live API.
Diagnostics and scenario controls are available only in development, including
the fixture server. Production blocks direct Diagnostics navigation and excludes
its module and the scenario panel from the bundle. API failures never use demo data.

## B2 Tap integration

Actual Tap v2 endpoint mapping, pinned backend source, durable recovery, legacy
cutover, storage release lifecycle and operational rollout requirements are in
[docs/B2_FRONTEND_REPORT.md](docs/B2_FRONTEND_REPORT.md). `npm run validate:contracts`
checks the reviewed B2 source blobs. `npm run test:paired` runs real pinned Django /
PostgreSQL integration plus the production browser game against isolated local
services; provision a fresh test database as documented. It never uses the public API.
