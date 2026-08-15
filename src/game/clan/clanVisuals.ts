import type { AssetKey } from "@/assets/registry";
import type { ClanRole } from "./types";

export const clanRoleArt: Record<ClanRole, AssetKey> = {
  captain: "dexo.roleCaptain",
  soldier: "dexo.roleOfficer",
};

export function getClanHqAssetKey(level: number): AssetKey {
  if (level <= 2) return "clan.hq.level1";
  if (level <= 4) return "clan.hq.level2";
  if (level <= 6) return "clan.hq.level3";
  if (level <= 8) return "clan.hq.level4";
  return "clan.hq.level5";
}

export function getClanEmblemAssetKey(shape: "circle" | "crest" = "crest"): AssetKey {
  return shape === "circle" ? "clan.emblemCircle" : "clan.emblemCrest";
}
