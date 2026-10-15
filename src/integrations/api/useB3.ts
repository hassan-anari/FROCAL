import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { b3Request, B3Error } from "./b3";
import * as c from "./b3Contracts";
import { commitCanonical } from "./canonical";
import type { EarnMission, MissionId } from "@/game/earn/types";

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
      refetchInterval: 30_000,
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lock = useRef(false);
  const blockedUntil = useRef(0);
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
    operation: () => Promise<T>,
  ): Promise<T | undefined> => {
    if (lock.current || !enabled) return;
    if (Date.now() < blockedUntil.current) {
      setMessage("Please wait a moment before trying again.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      return await operation();
    } catch (error) {
      if (error instanceof B3Error && error.retryAfter)
        blockedUntil.current = Date.now() + error.retryAfter * 1000;
      setMessage(
        error instanceof B3Error
          ? error.message
          : "We couldn't connect right now. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const settle = async (canonical: c.CanonicalState) => {
    commitCanonical(client, scope, canonical);
    await refresh();
  };
  const claimDaily = () =>
    run(async () => {
      const result = await b3Request("/daily/claim", c.dailyClaimSchema, {
        body: {},
      });
      await client.cancelQueries(
        { queryKey: key("daily"), exact: true },
        { revert: false },
      );
      client.setQueryData(key("daily"), result.daily);
      await settle(result.canonical);
      setMessage(
        result.created
          ? `Daily reward claimed: ${result.reward_amount} XP.`
          : "Today's reward has already been claimed.",
      );
      return result;
    });
  const missionAction = (id: string) =>
    run(async () => {
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
        setMessage(
          result.created
            ? `Mission reward claimed: ${result.reward_amount} XP.`
            : "Mission reward already claimed.",
        );
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
      setMessage(
        result.state === "REWARD_READY"
          ? "Your mission reward is ready to claim."
          : "This mission is still in progress. Complete the activity and check again.",
      );
    });
  const registerGroup = () =>
    run(() =>
      b3Request("/network/groups/intents", c.intentSchema, { body: {} }),
    );
  const reverifyGroup = (id: string) =>
    run(async () => {
      await b3Request(
        `/network/groups/${encodeURIComponent(id)}/reverify`,
        z.object({ accepted: z.boolean() }),
        { body: {} },
      );
      await groups.refetch();
      setMessage("Your group check is queued. Please check back shortly.");
    });
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
    run(async () => {
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
    run(async () => {
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
    run(async () => {
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
      setMessage(
        r.created
          ? `Typing reward claimed: ${r.amount} XP.`
          : "Typing reward already claimed.",
      );
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
    message,
    refresh,
    claimDaily,
    missionAction,
    registerGroup,
    reverifyGroup,
    startTyping,
    submitTyping,
    claimTyping,
  };
}
