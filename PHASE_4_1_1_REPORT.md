# Phase 4.1.1 — Targeted Profile Fixes

This checkpoint starts from the Phase 4.1 / Handoff v2 baseline. The later v4.2 experiment was explicitly discarded and is not carried forward.

## Applied fixes

1. **Profile title presentation**
   - Removed the decorative Title Plate artwork from the main Profile identity header.
   - Kept the active title as a clean text label below the Telegram username so it cannot overlap or crop the identity copy.
   - The title-plate asset remains available in customization-related Profile surfaces.

2. **Profile modal buttons**
   - Reduced modal footer CTA height.
   - Increased modal CTA label size for mobile readability.
   - Removed the large trailing arrow block from `Feature achievement` and `Save profile`, which was forcing those buttons to be too tall.
   - Existing primary gradient color and sheen behavior remain unchanged.

3. **Connections**
   - Wallet is now a static `Coming soon` item.
   - Dalexio Account is now a static `Coming soon` item.
   - Removed `Connect`, `Connecting`, `Done`, simulated wallet address, and simulated account handle from the Overview UI.
   - Existing store fields remain untouched for future real integrations.

## Not changed
- No global blur/performance/rasterization changes from discarded v4.2.
- No approved Phase 0–3 screens.
- No v4.1 modal positioning / safe-area / scroll-lock architecture.
- No repository-maintained Profile, Dexo, brand, or world artwork was bundled.
