import { access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const required = [
  "src/app/router.tsx",
  "src/app/providers/AppProviders.tsx",
  "src/integrations/telegram/adapter.ts",
  "src/integrations/api/bootstrap.ts",
  "src/design-system/styles/tokens.css",
  "src/design-system/components/DexoStage.tsx",
  "src/design-system/components/GameShell.tsx",
  "src/design-system/components/GameHeader.tsx",
  "src/assets/manifest.json",
  "src/game/domain/schemas.ts",
  "src/game/onboarding/onboardingStore.ts",
  "src/game/ui/baseUiStore.ts",
  "src/game/earn/types.ts",
  "src/game/earn/earnStore.ts",
  "src/game/profile/types.ts",
  "src/game/profile/profileCatalog.ts",
  "src/game/profile/profileStore.ts",
  "src/game/clan/types.ts",
  "src/game/clan/clanCatalog.ts",
  "src/game/clan/clanStore.ts",
  "src/features/profile/ProfileAvatar.tsx",
  "src/features/profile/ProfileOverlays.tsx",
  "src/features/clan/ClanOverlays.tsx",
  "src/features/earn/EarnOverlays.tsx",
  "src/pages/FoundationPage.tsx",
  "src/pages/OnboardingPage.tsx",
  "src/pages/BasePage.tsx",
  "src/pages/EarnPage.tsx",
  "src/pages/TypingChallengePage.tsx",
  "src/pages/ClanPage.tsx",
  "src/pages/ClanPage.module.css",
  "src/pages/ArenaPage.tsx",
  "src/pages/ProfilePage.tsx",
  "src/pages/DiagnosticsPage.tsx",
  "src/mocks/handlers/bootstrap.handlers.ts",
  "PHASE_5_CLAN_REPORT.md",
  "PHASE_5_ROUTE_MAP.md",
  "PHASE_5_TEST_CHECKLIST.md",
  "CLAN_FRONTEND_SCOPE.md",
  "vercel.json",
];

const missing = [];
for (const file of required) {
  try {
    await access(path.join(process.cwd(), file), constants.R_OK);
  } catch {
    missing.push(file);
  }
}

if (missing.length) {
  console.error("Missing Phase 5 architecture files:\n" + missing.join("\n"));
  process.exit(1);
}
console.log(`Structure validation passed: ${required.length} Phase 5 files found.`);
