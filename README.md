# Dalexio Mini App — Phase 5 Clan v5.0

Mobile-first Telegram Mini App checkpoint for the Phase 5 Clan frontend.

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

Current status: **Phases 0–4 are officially closed. Phase 5 Clan v5.0 is implemented and awaiting Telegram-mobile QA.**

Exact v4.1 code baseline: `dalexio-miniapp-phase4-v4.1-profile-modal-polish.zip` — SHA-256 `d1a0ac219939b226153a365dce706cc7bb636937e3066d6fe7e788f503436ad7`.

Real QA loop: `ZIP → GitHub → Vercel build → Telegram test bot on a real phone → focused fixes`.

Important asset rule: the 31 Profile images, logos, main background, Dexo images and Dexo platform are repository-maintained and are not bundled in future checkpoints; exact paths remain in `src/assets/manifest.json`.

Current targeted checkpoint: `Phase 4.1.1` removes the decorative Title Plate from the main Profile header, compacts Profile modal CTAs, and marks Wallet/Dalexio Account as static `Coming soon`. The discarded v4.2 experiment is not part of this baseline.

Current targeted checkpoint: `Phase 4.1.2` fixes the height of the `Customize` and `Share profile` buttons directly under the Profile level bar. The Title Plate remains only in Customize live preview, not in the main Profile header.

Current targeted checkpoint: `Phase 4.1.3` compacts the two Profile header actions, removes Title Plate artwork from Customize live preview, and fixes immediate Avatar Frame updates via the shared AssetImage component.

Phase 4 closure: Profile & Identity is approved. Phase 5 Clan is now the active QA phase.

Next module clarification: **Clan** is next. Inventory is embedded inside Clan Headquarters. Level 5 unlocks a permanent Captain/Soldier choice; Soldier uses Leaderboard/Search/Suggestions + one join request, Captain creates/manages the clan, and accepted members move into Headquarters. Group Tasks and Individual Tasks are separate UI categories. Backend/economy logic remains mocked for frontend development.

Phase 5 Clan frontend is implemented and awaiting Telegram-mobile QA. Use hidden Diagnostics Clan controls to preview all states without backend integration.
