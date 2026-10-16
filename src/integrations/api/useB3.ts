import { showFeedback } from "@/design-system/components/TransientFeedback";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { b3Request, B3Error } from "./b3";
import * as c from "./b3Contracts";
import { commitCanonical } from "./canonical";
import type { EarnMission, MissionId, RewardEvent, LevelUpEvent } from "@/game/earn/types";

export function missionView(
  m: c.Mission,
): EarnMission & { unavailable: boolean } {
  return {
    id: m.key as MissionId,
    title: m.title || m.key.replaceAll("-", " "),
    description: m.description,
    rewardXp: m.reward_amount,
    status: (
      {
        AVAILABLE: "available",
        IN_PROGRESS: "in-progress",
        REWARD_READY: "completed",
        CLAIMED: "claimed",
        UNAVAILABLE: "available",
      } as const
    )[m.state],
    progress: ["REWARD_READY", "CLAIMED"].includes(m.state) ? 1 : 0,
    target: 1,
    category:
      m.verification_family === "TELEGRAM"
        ? "social"
        : m.verification_family === "INTERNAL"
          ? "skill"
          : "ecosystem",
    action:
      m.key === "typing-session"
        ? "typing"
        : m.key === "complete-profile"
          ? "profile"
          : "external",
    href: m.destination_url ?? undefined,
    unavailable: !m.available || m.state === "UNAVAILABLE",
  };
}
/** All reads share the B2 authenticated scope. No production scenario fallback. */
export function useB3() {
  const { scope, bootstrap } = useBootstrap();
  const client = useQueryClient();
  const remote = isRemoteDataSource();
  const enabled =
    remote && scope.player !== "unverified" && Boolean(bootstrap.data);
  const key = (name: string) => [...queryKeys.player(scope), "b3", name];
  const query = <T>(name: string, path: string, schema: z.ZodType<T>) =>
    useQuery({
      queryKey: key(name),
      queryFn: ({ signal }) => b3Request(path, schema, { signal }),
      enabled,
      staleTime: 10_000,
      refetchInterval: name === "groups" || name === "network" || name === "referrals" || name === "invitees" ? false : 30_000,
      refetchOnMount: "always" as const,
      refetchOnWindowFocus: true,
      retry: false,
    });
  const clock = query("canonical", "/rewards/state", c.canonicalSchema);
  useEffect(() => {
    if (clock.data) commitCanonical(client, scope, clock.data);
  }, [
    clock.data,
    client,
    scope.session,
    scope.player,
    scope.season,
    scope.config,
  ]);
  const serverNow = () =>
    clock.data
      ? Date.parse(clock.data.server_time) +
        Math.max(0, Date.now() - clock.dataUpdatedAt)
      : Date.now();
  const daily = query("daily", "/daily", c.dailySchema);
  const missions = query("missions", "/missions", z.array(c.missionSchema));
  const typing = query("typing", "/typing", c.typingSchema);
  const referrals = query("referrals", "/referrals", c.referralSchema);
  const invitees = query(
    "invitees",
    "/referrals/invitees?offset=0&limit=30",
    c.inviteesSchema,
  );
  const network = query("network", "/network", c.networkSchema);
  const groups = query(
    "groups",
    "/network/groups?offset=0&limit=30",
    c.groupsSchema,
  );
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const isPending = (action: string) => pendingActions.has(action);
  const pendingAction = pendingActions.values().next().value ?? null;
  const busy = pendingActions.size > 0;
  type Presentation = { reward: RewardEvent; level: LevelUpEvent | null; rewardDismissed: boolean };
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const rewardEvent = presentations[0]?.rewardDismissed ? null : presentations[0]?.reward ?? null;
  const levelUpEvent = presentations[0]?.level ?? null;
  const revealed = useRef(new Set<string>());
  const reveal = (created: boolean, id: string, xp: number, title: string, source: RewardEvent["source"], before: c.CanonicalState | undefined, after: c.CanonicalState) => {
    // Only newly settled server evidence creates presentation. Reads and duplicate
    // responses never reveal; no client balance/threshold calculation takes place.
    if (!created || xp <= 0 || revealed.current.has(id) || after.player_id !== scope.player || after.season_id !== scope.season) return;
    revealed.current.add(id);
    const previousLevel = before?.progression.level ?? bootstrap.data?.player.level;
    const evolution = before !== undefined && before.progression.dexo_stage !== after.progression.dexo_stage;
    const level: LevelUpEvent | null = previousLevel !== undefined && after.progression.level > previousLevel
      ? { id, previousLevel, newLevel: after.progression.level, evolution, evolutionTitle: evolution ? after.progression.dexo_stage : null, createdAt: after.server_time } : null;
    setPresentations(queue => [...queue, { reward: { id, source, title, xp, createdAt: after.server_time }, level, rewardDismissed: false }]);
  };
  const previousCanonical = () => client.getQueryData<c.CanonicalState>([...queryKeys.player(scope), "canonical"]);
  const [message, setMessage] = useState<string | null>(null);
  const locks = useRef(new Set<string>());
  const blockedUntil = useRef<Record<string, number>>({});
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({
        queryKey: [...queryKeys.player(scope), "b3"],
      }),
      client.invalidateQueries({ queryKey: queryKeys.profileOverview(scope) }),
      client.invalidateQueries({ queryKey: ["bootstrap", scope.session] }),
    ]);
  };
  const run = async <T>(
    action: string, operation: () => Promise<T>,
  ): Promise<T | undefined> => {
    if (locks.current.has(action) || !enabled) return;
    if (Date.now() < (blockedUntil.current[action] ?? 0)) {
      setMessage("Please wait a moment before trying again.");
      showFeedback("Please wait a moment before trying again.", "info");
      return;
    }
    locks.current.add(action);
    setPendingActions(current => new Set([...current, action]));
    setMessage(null);
    try {
      return await operation();
    } catch (error) {
      if (error instanceof B3Error && error.retryAfter)
        blockedUntil.current[action] = Date.now() + error.retryAfter * 1000;
      const text = error instanceof B3Error ? error.message : "We couldn't connect right now. Please try again.";
      setMessage(text);
      showFeedback(text);
    } finally {
      locks.current.delete(action);
      setPendingActions(current => { const next = new Set(current); next.delete(action); return next; });
    }
  };
  const settle = async (canonical: c.CanonicalState) => {
    commitCanonical(client, scope, canonical);
    await refresh();
  };
  const claimDaily = () =>
    run("daily", async () => {
      const before = previousCanonical();
      const result = await b3Request("/daily/claim", c.dailyClaimSchema, {
        body: {},
      });
      await client.cancelQueries(
        { queryKey: key("daily"), exact: true },
        { revert: false },
      );
      client.setQueryData(key("daily"), result.daily);
      await settle(result.canonical);
      reveal(result.created, `daily:${result.claim_period}`, result.reward_amount, "Daily Core", "daily", before, result.canonical);
      return result;
    });
  const missionAction = (id: string) =>
    run(`mission:${id}`, async () => {
      const before = previousCanonical();
      const m = missions.data?.find((v) => v.key === id);
      if (
        !m ||
        !m.available ||
        m.state === "UNAVAILABLE" ||
        m.state === "CLAIMED"
      )
        return;
      const path = `/missions/${encodeURIComponent(id)}`;
      if (m.state === "REWARD_READY") {
        const result = await b3Request(`${path}/claim`, c.missionClaimSchema, {
          body: {},
        });
        await settle(result.canonical);
        reveal(result.created, `mission:${id}:${result.version}:${result.claimed_at}`, result.reward_amount, m.title, m.key as MissionId, before, result.canonical);
        return;
      }
      const opened = await b3Request(`${path}/start`, c.missionStartSchema, {
        body: {},
      });
      if (m.state === "AVAILABLE") {
        await missions.refetch();
        return {
          destination: opened.destination_url,
          action: missionView(m).action,
        };
      }
      const result = await b3Request(`${path}/verify`, c.missionVerifySchema, {
        body: { open_token: opened.open_token },
      });
      await missions.refetch();
      if (result.state !== "REWARD_READY") showFeedback("This mission is still in progress. Complete the activity and check again.", "info");
    });
  const registerGroup = () =>
    run("group-register", () =>
      b3Request("/network/groups/intents", c.intentSchema, { body: {} }),
    );
  const requestKey = (kind: string) => {
    const storageKey = `dexo-b3-request:${scope.player}:${scope.season}:${kind}`;
    let value: string | null = null;
    try {
      value = localStorage.getItem(storageKey);
    } catch {
      /* same mounted action remains idempotent */
    }
    value ??= pendingKeys.current[kind] ?? crypto.randomUUID();
    pendingKeys.current[kind] = value;
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* optional persistence */
    }
    return {
      value,
      clear: () => {
        delete pendingKeys.current[kind];
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* optional persistence */
        }
      },
    };
  };
  const pendingKeys = useRef<Record<string, string>>({});
  const startTyping = () =>
    run("typing-start", async () => {
      const k = requestKey("typing-start");
      const r = await b3Request("/typing/attempts/start", c.attemptSchema, {
        body: {},
        key: k.value,
      });
      k.clear();
      await typing.refetch();
      return r;
    });
  const submitTyping = (id: string, typed_text: string) =>
    run("typing-submit", async () => {
      const r = await b3Request(
        `/typing/attempts/${encodeURIComponent(id)}/submit`,
        c.submitSchema,
        { body: { typed_text } },
      );
      await client.cancelQueries(
        { queryKey: key("typing"), exact: true },
        { revert: false },
      );
      client.setQueryData(key("typing"), r.typing);
      await missions.refetch();
      return r;
    });
  const claimTyping = () =>
    run("typing-claim", async () => {
      const before = previousCanonical();
      const k = requestKey("typing-claim");
      const r = await b3Request("/typing/claim", c.typingClaimSchema, {
        body: {},
        key: k.value,
      });
      k.clear();
      await client.cancelQueries(
        { queryKey: key("typing"), exact: true },
        { revert: false },
      );
      client.setQueryData(key("typing"), r.typing);
      await settle(r.canonical);
      reveal(r.created, `typing:${r.claimed_at}`, r.amount, "Typing Arena", "typing", before, r.canonical);
      return r;
    });
  return {
    remote,
    serverNow,
    daily,
    missions,
    typing,
    referrals,
    invitees,
    network,
    groups,
    busy,
    pendingAction, isPending,
    rewardEvent, levelUpEvent,
    dismissReward: () => setPresentations(queue => queue[0]?.level ? [{ ...queue[0], rewardDismissed: true }, ...queue.slice(1)] : queue.slice(1)),
    dismissLevelUp: () => setPresentations(queue => queue.slice(1)),
    message,
    refresh,
    claimDaily,
    missionAction,
    registerGroup,
    startTyping,
    submitTyping,
    claimTyping,
  };
}
