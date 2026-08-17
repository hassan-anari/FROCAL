# Mobile Perf Cold/Open v5

This patch changes diagnostics only. Motion behavior is intentionally untouched.

## Recorder behavior
- No sample cap: every click is retained until Reset metrics.
- Pointer-down time is paired with the actual click, so scroll gestures do not become fake interactions while tap-to-frame timing is preserved.
- Clicks are logged beyond only buttons/tabs, including custom clickable controls.
- Each label receives an occurrence number.
- The first recorded occurrence after Reset is marked FIRST.

## Cold / first-open metrics
Diagnostics now summarizes FIRST samples separately:
- first-open sample count
- worst first-open frame gap
- first-open dropped frames
- first-open long-task count
- worst first-open long task

The full interaction log remains visible with no truncation. Repeat opens are still recorded for comparison, but FIRST is the primary metric for the next optimization pass.

## Validation
- validate:structure passed
- validate:imports passed
- validate:motion passed
- standalone TypeScript check for mobilePerf.ts passed
