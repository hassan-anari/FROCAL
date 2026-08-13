# Phase 5.0.1 — Clan TypeScript Build Fix

## Vercel error
`TS4104: The type 'readonly ClanJoinApplicant[]' is 'readonly' and cannot be assigned to the mutable type 'ClanJoinApplicant[]'.`

## Root cause
`clanJoinApplicants` is an `as const` catalog value, so it is readonly. `structuredClone(clanJoinApplicants)` preserves that readonly TypeScript type even though it creates a runtime copy. The Zustand state field is intentionally mutable (`ClanJoinApplicant[]`), so full `tsc -b` rejected the reset assignment.

## Fix
A typed mutable clone helper now converts catalog applicants into mutable state objects:

```ts
const cloneJoinApplicants = (): ClanJoinApplicant[] =>
  clanJoinApplicants.map((applicant): ClanJoinApplicant => ({ ...applicant }));
```

Both initial state and `resetClan()` use the same helper.

## Scope
No Clan UI, copy, navigation, motion, mock logic, assets, or approved previous phases were changed.

## Validation lesson
Syntax parsing/transpilation is not a substitute for semantic TypeScript checking. The previous delivery ran syntax/static validators but not a real `tsc -b`, which is why TS4104 escaped local validation.
