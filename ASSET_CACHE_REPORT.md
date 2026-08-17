# Dalexio Asset Persistent Cache + Decode Retention

## Goal
Stop previously viewed image assets from behaving like fresh resources every time a route remounts, while avoiding the old strategy of decoding the full asset catalog in memory.

## Changes

### 1. Browser/CDN cache policy
`vercel.json` now sends the following for `/assets/*`:

`Cache-Control: public, max-age=31536000, immutable`

This prevents route changes and later sessions from revalidating unchanged static assets on every use.

### 2. Versioned asset URLs
`getAssetPath()` appends the asset manifest version to asset URLs, for example:

`/assets/dexo/dexo-base-companion.webp?v=6.0.0`

When an asset file is replaced, bump `src/assets/manifest.json -> version` so clients receive the new asset URL instead of the old immutable cache entry.

### 3. Small decoded-image retention cache
`runtimeImageCache.ts` retains only the 12 most recently rendered raster `<img>` nodes.

This is intentionally bounded. It helps Telegram mobile WebViews reuse recently decoded image resources when a page is revisited, without pinning dozens of 1004x1004 images in memory.

### 4. AssetImage integration
`AssetImage` now:
- always uses the versioned registry path;
- retains successfully rendered raster images in the bounded runtime cache;
- continues using async decode;
- preserves consumer `onLoad` / `onError` handlers.

## Expected behavior
The first deployment with this patch will fetch images once because the URL gains `?v=6.0.0`. After that, navigating away and returning should not cause network revalidation of the same asset URL, and recently viewed images should have substantially less decode/raster pop-in.

## Validation
- `validate:structure` passed
- `validate:imports` passed
- `validate:motion` passed
- registry + runtime cache TypeScript check passed

Full project build could not be completed in this sandbox because the local node_modules is intentionally incomplete and is missing test type packages; no dependency was added by this patch.
