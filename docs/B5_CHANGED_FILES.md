# B5 changed-file inventory

Compared with merged main `ef6f1fca4de541e6eb45c9b8bf3e114bbd163cfb`. Includes every changed tracked file and the B5 deliverables added in this branch. Historical B2/B3/B4 pin and source/fixture bytes remain unchanged.

## Runtime, view models, hooks and scoped styles

- `src/design-system/components/BasePromoBanner.tsx`
- `src/design-system/components/GameHeader.tsx`
- `src/features/clan/ClanOverlays.module.css`
- `src/features/clan/ClanOverlays.tsx`
- `src/features/clan/ClanStatusSheet.tsx`
- `src/features/earn/EarnOverlays.tsx`
- `src/game/clan/types.ts`
- `src/integrations/api/b5.ts`
- `src/integrations/api/b5Schemas.ts`
- `src/integrations/api/baseObjectives.ts`
- `src/integrations/api/canonical.ts`
- `src/integrations/api/clanAppearance.ts`
- `src/integrations/api/clanIntent.ts`
- `src/integrations/api/clanViews.ts`
- `src/integrations/api/queryKeys.ts`
- `src/integrations/api/rewardHistory.ts`
- `src/integrations/api/useClanRemote.ts`
- `src/integrations/api/useRewardHistory.ts`
- `src/pages/ArenaPage.tsx`
- `src/pages/BasePage.module.css`
- `src/pages/BasePage.tsx`
- `src/pages/ClanPage.tsx`
- `src/pages/EarnPage.module.css`
- `src/pages/EarnPage.tsx`

## Focused unit/integration tests

- `src/integrations/api/b3.contract.test.ts`
- `src/integrations/api/b5.contract.test.ts`
- `src/integrations/api/baseObjectives.test.ts`
- `src/integrations/api/canonical.test.ts`
- `src/integrations/api/clanViews.test.ts`
- `src/integrations/api/rewardHistory.test.ts`
- `src/integrations/api/safeNavigation.test.ts`
- `src/integrations/api/useRewardHistory.test.tsx`

## Pinned backend schema, fixtures and source

- `scripts/contracts/b5/source/apps/clans/activity.py`
- `scripts/contracts/b5/source/apps/clans/api.py`
- `scripts/contracts/b5/source/apps/clans/economy.py`
- `scripts/contracts/b5/source/apps/clans/governance.py`
- `scripts/contracts/b5/source/apps/clans/missions.py`
- `scripts/contracts/b5/source/apps/clans/models.py`
- `scripts/contracts/b5/source/apps/clans/recovery.py`
- `scripts/contracts/b5/source/apps/clans/services.py`
- `scripts/contracts/b5/source/apps/content/services.py`
- `scripts/contracts/b5/source/apps/rewards/api.py`
- `scripts/contracts/b5/source/apps/telegram/services.py`
- `scripts/contracts/b5/source/docs/B5_BACKEND_CONTRACT.md`
- `scripts/contracts/b5/source/docs/B5_BACKEND_HANDOFF.md`
- `scripts/contracts/b5/source/docs/fixtures/b5/README.md`
- `src/integrations/api/fixtures/b5/authority-http.json`
- `src/integrations/api/fixtures/b5/clan-http.json`
- `src/integrations/api/fixtures/b5/lifecycle-http.json`
- `src/integrations/api/fixtures/b5/openapi.json`

## Contract pairing, browser tests, checks and CI

- `.github/workflows/b1-frontend.yml`
- `e2e/b4-visual.spec.ts`
- `e2e/b5-data.spec.ts`
- `e2e/b5-ui.spec.ts`
- `e2e/fixtures/b5/README.md`
- `e2e/fixtures/b5/community-photo.png`
- `e2e/phase2.spec.ts`
- `package.json`
- `playwright.b5-paired.config.ts`
- `playwright.b5.config.ts`
- `playwright.config.ts`
- `playwright.paired.config.ts`
- `scripts/capture-b5-baseline.mjs`
- `scripts/capture-b5-clan-baseline.mjs`
- `scripts/contracts/b2_server.py`
- `scripts/contracts/b5-pin.json`
- `scripts/contracts/b5/http.paired.test.ts`
- `scripts/contracts/b5/read-contract.paired.test.ts`
- `scripts/contracts/b5_controls.py`
- `scripts/contracts/browser/clan-b5.spec.ts`
- `scripts/contracts/check-b2-contract.mjs`
- `scripts/contracts/generate-b5-schemas.mjs`
- `scripts/contracts/run-paired-b5-contract.mjs`
- `vitest.b5-paired.config.ts`
- `vitest.paired.config.ts`

## Implementation reports and preservation evidence

- `docs/B5_BACKEND_REQUIREMENTS.md`
- `docs/B5_CHANGED_FILES.md`
- `docs/B5_FRONTEND_REPORT.md`
- `docs/B5_UI_PRESERVATION.md`
- `docs/evidence/b5/320/after-arena-warfront.png`
- `docs/evidence/b5/320/after-base-confirmed-data.png`
- `docs/evidence/b5/320/after-base-objectives-rewards.png`
- `docs/evidence/b5/320/after-communities.png`
- `docs/evidence/b5/320/after-computed.json`
- `docs/evidence/b5/320/after-earn-history-error.png`
- `docs/evidence/b5/320/after-earn-history.png`
- `docs/evidence/b5/320/after-group-expansion.png`
- `docs/evidence/b5/320/after-notifications.png`
- `docs/evidence/b5/320/after-profile.png`
- `docs/evidence/b5/320/before-arena-warfront.png`
- `docs/evidence/b5/320/before-base-objectives-rewards.png`
- `docs/evidence/b5/320/before-communities.png`
- `docs/evidence/b5/320/before-computed.json`
- `docs/evidence/b5/320/before-group-expansion.png`
- `docs/evidence/b5/320/before-notifications.png`
- `docs/evidence/b5/320/before-profile.png`
- `docs/evidence/b5/390/after-arena-warfront.png`
- `docs/evidence/b5/390/after-base-confirmed-data.png`
- `docs/evidence/b5/390/after-base-objectives-rewards.png`
- `docs/evidence/b5/390/after-communities.png`
- `docs/evidence/b5/390/after-computed.json`
- `docs/evidence/b5/390/after-earn-history-error.png`
- `docs/evidence/b5/390/after-earn-history.png`
- `docs/evidence/b5/390/after-group-expansion.png`
- `docs/evidence/b5/390/after-notifications.png`
- `docs/evidence/b5/390/after-profile.png`
- `docs/evidence/b5/390/before-arena-warfront.png`
- `docs/evidence/b5/390/before-base-objectives-rewards.png`
- `docs/evidence/b5/390/before-communities.png`
- `docs/evidence/b5/390/before-computed.json`
- `docs/evidence/b5/390/before-group-expansion.png`
- `docs/evidence/b5/390/before-notifications.png`
- `docs/evidence/b5/390/before-profile.png`
- `docs/evidence/b5/460/after-arena-warfront.png`
- `docs/evidence/b5/460/after-base-confirmed-data.png`
- `docs/evidence/b5/460/after-base-objectives-rewards.png`
- `docs/evidence/b5/460/after-communities.png`
- `docs/evidence/b5/460/after-computed.json`
- `docs/evidence/b5/460/after-earn-history-error.png`
- `docs/evidence/b5/460/after-earn-history.png`
- `docs/evidence/b5/460/after-group-expansion.png`
- `docs/evidence/b5/460/after-notifications.png`
- `docs/evidence/b5/460/after-profile.png`
- `docs/evidence/b5/460/before-arena-warfront.png`
- `docs/evidence/b5/460/before-base-objectives-rewards.png`
- `docs/evidence/b5/460/before-communities.png`
- `docs/evidence/b5/460/before-computed.json`
- `docs/evidence/b5/460/before-group-expansion.png`
- `docs/evidence/b5/460/before-notifications.png`
- `docs/evidence/b5/460/before-profile.png`
- `docs/evidence/b5/baseline-provenance.json`
- `docs/evidence/b5/clan/320/after-accepted-invite.png`
- `docs/evidence/b5/clan/320/after-admin-recovery.png`
- `docs/evidence/b5/clan/320/after-captain-authority-loss.png`
- `docs/evidence/b5/clan/320/after-captain-authority-restored.png`
- `docs/evidence/b5/clan/320/after-captain-headquarters.png`
- `docs/evidence/b5/clan/320/after-dissolution-confirmation.png`
- `docs/evidence/b5/clan/320/after-governance-status.png`
- `docs/evidence/b5/clan/320/after-immutable-vote.png`
- `docs/evidence/b5/clan/320/after-leave-confirmation.png`
- `docs/evidence/b5/clan/320/after-removal-confirmation.png`
- `docs/evidence/b5/clan/320/after-request-pending.png`
- `docs/evidence/b5/clan/320/after-role-choice.png`
- `docs/evidence/b5/clan/320/after-server-price-purchase.png`
- `docs/evidence/b5/clan/320/after-settled-mission.png`
- `docs/evidence/b5/clan/320/after-soldier-headquarters.png`
- `docs/evidence/b5/clan/320/after-soldier-preview.png`
- `docs/evidence/b5/clan/320/after-verified-founding.png`
- `docs/evidence/b5/clan/320/before-approved-captain-headquarters.png`
- `docs/evidence/b5/clan/320/before-approved-item-sheet.png`
- `docs/evidence/b5/clan/320/before-approved-role-choice.png`
- `docs/evidence/b5/clan/320/before-approved-role-confirmation.png`
- `docs/evidence/b5/clan/390/after-accepted-invite.png`
- `docs/evidence/b5/clan/390/after-admin-recovery.png`
- `docs/evidence/b5/clan/390/after-captain-authority-loss.png`
- `docs/evidence/b5/clan/390/after-captain-authority-restored.png`
- `docs/evidence/b5/clan/390/after-captain-headquarters.png`
- `docs/evidence/b5/clan/390/after-dissolution-confirmation.png`
- `docs/evidence/b5/clan/390/after-governance-status.png`
- `docs/evidence/b5/clan/390/after-immutable-vote.png`
- `docs/evidence/b5/clan/390/after-leave-confirmation.png`
- `docs/evidence/b5/clan/390/after-removal-confirmation.png`
- `docs/evidence/b5/clan/390/after-request-pending.png`
- `docs/evidence/b5/clan/390/after-role-choice.png`
- `docs/evidence/b5/clan/390/after-server-price-purchase.png`
- `docs/evidence/b5/clan/390/after-settled-mission.png`
- `docs/evidence/b5/clan/390/after-soldier-headquarters.png`
- `docs/evidence/b5/clan/390/after-soldier-preview.png`
- `docs/evidence/b5/clan/390/after-verified-founding.png`
- `docs/evidence/b5/clan/390/before-approved-captain-headquarters.png`
- `docs/evidence/b5/clan/390/before-approved-item-sheet.png`
- `docs/evidence/b5/clan/390/before-approved-role-choice.png`
- `docs/evidence/b5/clan/390/before-approved-role-confirmation.png`
- `docs/evidence/b5/clan/460/after-accepted-invite.png`
- `docs/evidence/b5/clan/460/after-admin-recovery.png`
- `docs/evidence/b5/clan/460/after-captain-authority-loss.png`
- `docs/evidence/b5/clan/460/after-captain-authority-restored.png`
- `docs/evidence/b5/clan/460/after-captain-headquarters.png`
- `docs/evidence/b5/clan/460/after-dissolution-confirmation.png`
- `docs/evidence/b5/clan/460/after-governance-status.png`
- `docs/evidence/b5/clan/460/after-immutable-vote.png`
- `docs/evidence/b5/clan/460/after-leave-confirmation.png`
- `docs/evidence/b5/clan/460/after-removal-confirmation.png`
- `docs/evidence/b5/clan/460/after-request-pending.png`
- `docs/evidence/b5/clan/460/after-role-choice.png`
- `docs/evidence/b5/clan/460/after-server-price-purchase.png`
- `docs/evidence/b5/clan/460/after-settled-mission.png`
- `docs/evidence/b5/clan/460/after-soldier-headquarters.png`
- `docs/evidence/b5/clan/460/after-soldier-preview.png`
- `docs/evidence/b5/clan/460/after-verified-founding.png`
- `docs/evidence/b5/clan/460/before-approved-captain-headquarters.png`
- `docs/evidence/b5/clan/460/before-approved-item-sheet.png`
- `docs/evidence/b5/clan/460/before-approved-role-choice.png`
- `docs/evidence/b5/clan/460/before-approved-role-confirmation.png`
- `docs/evidence/b5/clan/baseline-provenance.json`
- `docs/evidence/b5/validation-manifest.json`

## Independent-review correction additions

Existing listed Clan views/hooks and paired harness/tests are updated in scope. Additional files:

- `src/integrations/api/clanApplications.ts`
- `src/integrations/api/clanApplications.test.ts`
- `src/integrations/api/useClanRemote.test.tsx`
- `docs/B5_ACTIVE_APPLICATION_REVIEW.md`

Targeted local pre-handoff evidence additions:

- `docs/evidence/b5/active-application-review/manifest.json`
- `docs/evidence/b5/active-application-review/320/review-accepted-behind-cancelled-history.png`
- `docs/evidence/b5/active-application-review/320/review-overlap-safe.png`
- `docs/evidence/b5/active-application-review/320/review-pending-blocks-other-clan.png`
- `docs/evidence/b5/active-application-review/320/review-revocation-pending.png`
- `docs/evidence/b5/active-application-review/320/review-verified-membership.png`
- `docs/evidence/b5/active-application-review/390/review-accepted-behind-cancelled-history.png`
- `docs/evidence/b5/active-application-review/390/review-overlap-safe.png`
- `docs/evidence/b5/active-application-review/390/review-pending-blocks-other-clan.png`
- `docs/evidence/b5/active-application-review/390/review-revocation-pending.png`
- `docs/evidence/b5/active-application-review/390/review-verified-membership.png`
- `docs/evidence/b5/active-application-review/460/review-accepted-behind-cancelled-history.png`
- `docs/evidence/b5/active-application-review/460/review-overlap-safe.png`
- `docs/evidence/b5/active-application-review/460/review-pending-blocks-other-clan.png`
- `docs/evidence/b5/active-application-review/460/review-revocation-pending.png`
- `docs/evidence/b5/active-application-review/460/review-verified-membership.png`
