import type { AssetKey } from "@/assets/registry";
import type { ClanRole } from "./types";

export const clanRoleArt: Record<ClanRole, AssetKey> = {
  captain: "dexo.roleCaptain",
  soldier: "dexo.roleOfficer",
};

export const clanPreloadAssets = [
  "dexo.roleCaptain",
  "dexo.roleOfficer",
  "profile.frame.clan",
  "profile.frame.captain",
  "clan.emblemCrest",
  "clan.hq",
  "clan.operations",
  "clan.roster",
  "clan.inventory",
  "clan.shop",
  "clan.treasury",
  "clan.trophyHall",
  "clan.upgradeCenter",
  "clan.hq.level1",
  "clan.hq.level2",
  "clan.hq.level3",
  "clan.hq.level4",
  "clan.hq.level5",
  "clan.hq.stateLocked",
  "clan.hq.stateMax",
  "clan.hq.stateRecovery",
  "clan.hq.stateUpgrade",
  "clan.boosterXp",
  "clan.boosterContribution",
  "clan.boosterMission",
  "clan.boosterCoordination",
  "clan.defenceEarlyWarning",
  "clan.defenceEmergencyRepair",
  "clan.defenceFirewall",
  "clan.defenceProtectionDome",
  "clan.utilityAlliancePermit",
  "clan.utilityCapacity",
  "clan.utilityRosterSlot",
  "clan.utilityEventPass",
  "clan.utilityHqUpgrade",
] as const satisfies readonly AssetKey[];

export function getClanHqAssetKey(level: number): AssetKey {
  if (level <= 2) return "clan.hq.level1";
  if (level <= 4) return "clan.hq.level2";
  if (level <= 6) return "clan.hq.level3";
  if (level <= 8) return "clan.hq.level4";
  return "clan.hq.level5";
}

export function getClanEmblemAssetKey(): AssetKey {
  return "clan.emblemCrest";
}

export function getClanRoomAssetKey(tab: "home" | "tasks" | "members" | "inventory", shop = false): AssetKey {
  if (tab === "home") return "clan.hq";
  if (tab === "tasks") return "clan.operations";
  if (tab === "members") return "clan.roster";
  return shop ? "clan.shop" : "clan.inventory";
}

export function getClanHqStateAssetKey(state: "normal" | "upgrade" | "recovery" | "max", level: number): AssetKey {
  if (state === "upgrade") return "clan.hq.stateUpgrade";
  if (state === "recovery") return "clan.hq.stateRecovery";
  if (state === "max") return "clan.hq.stateMax";
  return getClanHqAssetKey(level);
}

export function getIdentityInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return (words[0]?.slice(0, 2) || "DX").toUpperCase();
}

export function getIdentityHue(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 360;
}
