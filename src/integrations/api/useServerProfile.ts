import { showFeedback, useQueryFeedback } from "@/design-system/components/TransientFeedback";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { achievementDefinitions, frameById, titleById, medalById, achievementById } from "@/game/profile/profileCatalog";
import type { AchievementId, AchievementProgress, FrameId, TitleId, MedalId } from "@/game/profile/types";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { loadAchievements, loadCollection, saveCustomization, type Customization, type ProfileOverview } from "./profile";
import { useProfileOverview } from "./useProfileOverview";

type Draft = { frameId: FrameId; titleId: TitleId; medalId: MedalId | null; achievementId: AchievementId | null };

/** Catalogs own artwork/copy only. Entitlements, progress and equipped choices are server-owned. */
export function useServerProfile() {
  const { scope, bootstrap } = useBootstrap();
  const client = useQueryClient();
  const overview = useProfileOverview();
  const enabled = isRemoteDataSource() && scope.player !== "unverified" && Boolean(bootstrap.data?.featureFlags.profile);
  const baseKey = [...queryKeys.player(scope), "profile"];
  const achievements = useQuery({ queryKey: [...baseKey, "achievements"], queryFn: ({ signal }) => loadAchievements(signal), enabled, staleTime: 10_000, refetchOnMount: "always", refetchOnWindowFocus: true });
  const collection = useQuery({ queryKey: [...baseKey, "collection"], queryFn: ({ signal }) => loadCollection(signal), enabled, staleTime: 10_000, refetchOnMount: "always", refetchOnWindowFocus: true });
  useQueryFeedback(enabled ? overview.error ?? achievements.error ?? collection.error : null, "Your profile couldn't load. Please try again.");
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const refresh = () => {
      if (document.hidden || Date.now() - last < 1000) return;
      last = Date.now();
      void client.invalidateQueries({ queryKey: [...queryKeys.player(scope), "profile"] });
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [enabled, client, scope.session, scope.player, scope.season, scope.config]);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const customization = overview.data?.customization;
  const update = async (patch: Partial<Customization>): Promise<boolean> => {
    if (lock.current || !enabled || !customization || !collection.data || !achievements.data) return false;
    lock.current = true; setSaving(true); setError(null);
    try {
      const confirmed = await saveCustomization({ ...customization, ...patch });
      await client.cancelQueries({ queryKey: queryKeys.profileOverview(scope), exact: true }, { revert: false });
      client.setQueryData<ProfileOverview>(queryKeys.profileOverview(scope), old => old ? { ...old, customization: confirmed } : old);
      await client.invalidateQueries({ queryKey: baseKey });
      return true;
    } catch {
      setError("Your profile couldn't be saved. Please try again.");
      showFeedback("Your profile couldn't be saved. Please try again.");
      // An uncertain response can have committed. Reconcile; never credit/equip optimistically.
      void client.invalidateQueries({ queryKey: baseKey });
      return false;
    } finally { lock.current = false; setSaving(false); }
  };
  const rows = achievements.data?.achievements ?? [];
  const progress = Object.fromEntries(achievementDefinitions.map(def => {
    const row = rows.find(item => item.key === def.id);
    return [def.id, { current: row?.current_progress ?? 0, target: row?.target ?? 1 }];
  })) as Record<AchievementId, AchievementProgress>;
  const known = <T extends string>(key: string | null | undefined, catalog: Record<T, unknown>): T | null => key && Object.hasOwn(catalog, key) ? key as T : null;
  return {
    achievements, collection, saving, error,
    ready: Boolean(customization && achievements.data && collection.data),
    activeFrameId: known(customization?.active_frame, frameById) ?? "standard" as FrameId,
    activeTitleId: known(customization?.active_title, titleById) ?? "explorer" as TitleId,
    featuredMedalId: known(customization?.featured_medal, medalById),
    featuredAchievementId: known(customization?.featured_achievement, achievementById),
    unlockedFrameIds: (collection.data?.frames ?? []).filter(x => x.available && x.entitled && known(x.key, frameById)).map(x => x.key as FrameId),
    unlockedTitleIds: (collection.data?.titles ?? []).filter(x => x.available && x.entitled && known(x.key, titleById)).map(x => x.key as TitleId),
    unlockedMedalIds: (collection.data?.medals ?? []).filter(x => x.owned && known(x.key, medalById)).map(x => x.key as MedalId),
    unlockedAchievementIds: rows.filter(x => x.unlocked && known(x.key, achievementById)).map(x => x.key as AchievementId),
    achievementProgress: progress,
    achievementUnlockDates: Object.fromEntries(rows.filter(x => x.unlocked_at).map(x => [x.key, x.unlocked_at!])) as Partial<Record<AchievementId, string>>,
    setActiveFrame: (active_frame: FrameId) => update({ active_frame }),
    setActiveTitle: (active_title: TitleId) => update({ active_title }),
    setFeaturedMedal: (featured_medal: MedalId | null) => update({ featured_medal }),
    setFeaturedAchievement: (featured_achievement: AchievementId | null) => update({ featured_achievement }),
    applyCustomization: (draft: Draft) => update({ active_frame: draft.frameId, active_title: draft.titleId, featured_medal: draft.medalId, featured_achievement: draft.achievementId }),
    incrementShareCount: () => undefined,
  };
}
