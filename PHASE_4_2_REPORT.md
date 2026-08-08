# Phase 4.2 — Profile Composition, Modal Actions & Crispness Polish

## Scope
Focused Phase 4 QA patch based on the latest real-phone screenshots. No new feature system was added.

## Changes

### Profile identity composition
- Moved the active Title Plate above the Telegram username so it no longer sits underneath the ID.
- Gave the plate its own controlled vertical spacing and slightly larger crop area so the artwork reads as part of the identity block.
- Global app header remains unchanged; Profile cosmetics remain Profile-only.

### Profile modal buttons
- Reduced the width of single modal primary/secondary actions and centered them in the footer.
- Increased action label size and slightly increased button height for stronger mobile readability.
- Share modal keeps two actions but constrains the action group width instead of stretching edge to edge.
- Existing primary gradient and recurring sheen effect remain intact.

### Connections
- Wallet and Dalexio Account are now presented as `Coming soon`.
- Removed temporary `Connect` / `Done` interactions from the current Overview UI.
- Real wallet SDK and Dalexio account-link integration remain future backend/integration work.

### Crispness / blur audit
- No product-wide CSS `blur()` or `backdrop-filter` was found in active product UI; the only remaining backdrop blur is inside the hidden developer scenario panel.
- Removed persistent `translateZ(0)`, `backface-visibility` and broad `will-change` forcing from large text-bearing surfaces where they could keep whole screens rasterized on mobile WebViews.
- Removed the tiny page-wide scale transform from route transitions and kept the approved fade + short slide motion.
- Removed scale from the Profile modal container transition; it still uses opacity + short vertical motion.
- Did not change global font smoothing because doing so could make text worse across iOS/Android WebViews.

## Asset policy
No Profile, logo, background, Dexo or platform artwork is bundled. Existing manifest paths remain the source of truth.

## Validation
- `validate:structure` passed.
- `validate:assets` passed; only `public/assets/system/missing-asset.svg` is bundled.
- `validate:imports` passed.
- `validate:motion` passed across 81 source files.
- TypeScript/TSX syntax transpile passed across 58 non-declaration source files.
- CSS brace balance passed.
- Full dependency install/build could not run in this environment because the configured npm registry returned 404 for `@fontsource-variable/inter`; Vercel remains the full `tsc -b && vite build` authority for this checkpoint.
