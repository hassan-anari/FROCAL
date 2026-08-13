# Phase 4.1.3 — Profile Live Preview & Frame Reactivity Fix

Built directly on Phase 4.1.2.

## Requested fixes

### Compact Profile actions
- `Customize` and `Share profile` are now fixed-height 36px mobile CTAs.
- Vertical padding was reduced further.
- The Share arrow container is now 24×24 so it cannot force a taller button.
- Labels remain readable at `.77rem`.
- Existing gradient and sheen treatment is unchanged.

### Customize live preview
- Removed the decorative Title Plate from the Customize live preview.
- The active draft title now uses the same clean text treatment as the main Profile header.
- Title Plate artwork remains in the asset registry but is not rendered in either main Profile identity or Customize live preview.

### Immediate Avatar Frame updates
Root cause:
`AssetImage` stored the initial asset path in local state and did not update that state when its `assetKey` prop changed. Therefore changing an Avatar Frame updated the logical frame ID but kept rendering the old image until the component was remounted by navigating away.

Fix:
- `AssetImage` now derives the active image source directly from the current `assetKey`.
- Error fallback state is tracked per failed asset key rather than freezing the initial path.
- Frame changes now update immediately in Customize live preview.
- Saving a frame now updates the main Profile avatar immediately without changing page/tab.
- Added a regression test covering dynamic asset-key changes.

## Unchanged
- Connections remain static `Coming soon`.
- Phase 4 modal architecture is unchanged.
- Phase 0–3 remain untouched.
- Repository-maintained Profile/Dexo/brand artwork is not bundled.
