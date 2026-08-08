# Dalexio Mini App — Phase 4.1.1

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

Current status: Phases 0–3 are closed; Phase 4 Profile is implemented through v4.1.1 and remains under user QA. **Immediate next action is v4.1.1 mobile QA/fixes — do not start Inventory/Clan/Arena yet.**

Exact v4.1 code baseline: `dalexio-miniapp-phase4-v4.1-profile-modal-polish.zip` — SHA-256 `d1a0ac219939b226153a365dce706cc7bb636937e3066d6fe7e788f503436ad7`.

Real QA loop: `ZIP → GitHub → Vercel build → Telegram test bot on a real phone → focused fixes`.

Important asset rule: the 31 Profile images, logos, main background, Dexo images and Dexo platform are repository-maintained and are not bundled in future checkpoints; exact paths remain in `src/assets/manifest.json`.

Current targeted checkpoint: `Phase 4.1.1` removes the decorative Title Plate from the main Profile header, compacts Profile modal CTAs, and marks Wallet/Dalexio Account as static `Coming soon`. The discarded v4.2 experiment is not part of this baseline.
