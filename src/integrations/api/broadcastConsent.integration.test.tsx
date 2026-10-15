import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import fixture from "./fixtures/b3/earn-network.json";
import groupFixture from "./fixtures/b3/creator-network-active.json";
import { configCacheScope, remoteBootstrapSchema } from "./bootstrapContract";
import { mapRemoteBootstrap } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { useB3 } from "./useB3";
const remote = remoteBootstrapSchema.parse(fixture.bootstrap);
const scope = {
  session: 1,
  player: "9001",
  season: remote.season!.code,
  config: configCacheScope(remote.config),
};
vi.mock("./BootstrapProvider", () => ({
  useBootstrap: () => ({
    scope,
    bootstrap: { data: mapRemoteBootstrap(remote, "telegram", null, null) },
  }),
}));
vi.mock("./bootstrap", async (original) => ({
  ...(await original<typeof import("./bootstrap")>()),
  isRemoteDataSource: () => true,
}));
const groupId = groupFixture.items[0].public_id;
const path = `/api/v1/network/groups/${groupId}/broadcast-consent`;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function setup(
  post: (enabled: boolean) => Promise<Response>,
  refreshed?: () => Promise<Response>,
) {
  let enabled = false;
  const writes: boolean[] = [];
  let reads = 0;
  history.replaceState({}, "", `/#tgWebAppData=isolated-consent-test`);
  const responses: Record<string, unknown> = {
    "/daily": fixture.daily_available,
    "/missions": fixture.mission_list,
    "/typing": fixture.typing_state,
    "/referrals": fixture.referral,
    "/referrals/invitees": fixture.invitees_empty,
    "/network": fixture.network_summary,
    "/rewards/state": fixture.canonical_state,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options: RequestInit) => {
      expect(new Headers(options.headers).get("Authorization")).toBe(
        "tma isolated-consent-test",
      );
      if (url === path) {
        const body = JSON.parse(String(options.body));
        expect(Object.keys(body)).toEqual(["enabled"]);
        expect(typeof body.enabled).toBe("boolean");
        writes.push(body.enabled);
        return post(body.enabled);
      }
      const pathname = new URL(url, "http://localhost").pathname.replace(
        "/api/v1",
        "",
      );
      if (pathname === "/network/groups") {
        reads++;
        if (reads > 1 && refreshed) return refreshed();
        return json({
          ...groupFixture,
          items: [{ ...groupFixture.items[0], broadcast_opted_in: enabled }],
        });
      }
      return json(responses[pathname]);
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  client.setQueryData(
    queryKeys.bootstrap(1, "remote", "new-user", "telegram"),
    mapRemoteBootstrap(remote, "telegram", null, null),
  );
  const hook = renderHook(() => useB3(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return {
    ...hook,
    client,
    writes,
    setEnabled: (value: boolean) => {
      enabled = value;
    },
    getReads: () => reads,
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  history.replaceState({}, "", "/");
});
it("posts authenticated true/false, coalesces repeated clicks and waits for actual group reads before showing success", async () => {
  let ack!: (value: Response) => void;
  let read!: (value: Response) => void;
  const pendingPost = new Promise<Response>((resolve) => {
    ack = resolve;
  });
  const pendingRead = new Promise<Response>((resolve) => {
    read = resolve;
  });
  let enabledOnServer = false;
  const h = setup(
    async (enabled) => {
      enabledOnServer = enabled;
      return h.writes.length === 1
        ? pendingPost
        : json({ enabled, revision: 2 });
    },
    async () => (enabledOnServer ? pendingRead : json(groupFixture)),
  );
  await waitFor(() =>
    expect(h.result.current.groups.data?.items[0].broadcast_opted_in).toBe(
      false,
    ),
  );
  let action!: Promise<unknown>;
  act(() => {
    action = h.result.current.setGroupBroadcastConsent(groupId, true);
    void h.result.current.setGroupBroadcastConsent(groupId, true);
  });
  expect(h.writes).toEqual([true]);
  expect(h.result.current.groups.data?.items[0].broadcast_opted_in).toBe(false);
  await act(async () => {
    ack(json({ enabled: true, revision: 1 }));
  });
  await waitFor(() => expect(h.getReads()).toBe(2));
  expect(h.result.current.busy).toBe(true);
  expect(h.result.current.message).toBeNull();
  expect(h.result.current.groups.data?.items[0].broadcast_opted_in).toBe(false);
  await act(async () => {
    read(
      json({
        ...groupFixture,
        items: [{ ...groupFixture.items[0], broadcast_opted_in: true }],
      }),
    );
    await action;
  });
  expect(h.result.current.message).toBe(
    "Broadcasts are enabled for this group.",
  );
  await act(async () => {
    await h.result.current.setGroupBroadcastConsent(groupId, false);
  });
  expect(h.writes).toEqual([true, false]);
  expect(h.result.current.groups.data?.items[0].broadcast_opted_in).toBe(false);
  expect(h.result.current.message).toContain("revoked");
  h.unmount();
  h.client.clear();
});
it.each([
  [409, "GROUP_AUTHORIZATION_UNAVAILABLE", "permission"],
  [404, "GROUP_NOT_FOUND", "no longer available"],
])(
  "refreshes after %s and gives a safe recoverable permission/ownership message",
  async (status, code, copy) => {
    const h = setup(async () =>
      json({ code, detail: "private verification internals" }, Number(status)),
    );
    await waitFor(() => expect(h.result.current.groups.data).toBeTruthy());
    await act(async () => {
      await h.result.current.setGroupBroadcastConsent(groupId, true);
    });
    expect(h.getReads()).toBe(2);
    expect(h.result.current.groups.data?.items[0].broadcast_opted_in).toBe(
      false,
    );
    expect(h.result.current.message).toContain(String(copy));
    expect(h.result.current.message).not.toContain(String(code));
    expect(h.result.current.message).not.toContain("private");
    expect(h.result.current.busy).toBe(false);
    h.unmount();
    h.client.clear();
  },
);
it("does not claim consent succeeded when the required refresh fails", async () => {
  const h = setup(
    async () => json({ enabled: true, revision: 1 }),
    async () => json({ code: "UNAVAILABLE" }, 503),
  );
  await waitFor(() => expect(h.result.current.groups.data).toBeTruthy());
  await act(async () => {
    await h.result.current.setGroupBroadcastConsent(groupId, true);
  });
  expect(h.result.current.groups.isError).toBe(true);
  expect(h.result.current.message).not.toContain("enabled");
  expect(h.result.current.message).toContain("couldn't");
  expect(h.result.current.busy).toBe(false);
  h.unmount();
  h.client.clear();
});
it("uses the refreshed state when another client has changed consent", async () => {
  const h = setup(async () => json({ enabled: true, revision: 1 }));
  await waitFor(() => expect(h.result.current.groups.data).toBeTruthy());
  await act(async () => {
    await h.result.current.setGroupBroadcastConsent(groupId, true);
  });
  expect(h.result.current.groups.data?.items[0].broadcast_opted_in).toBe(false);
  expect(h.result.current.message).toContain("settings changed");
  h.unmount();
  h.client.clear();
});
it("will not submit a group missing from the authenticated owned-group read", async () => {
  const h = setup(async () => json({ enabled: true, revision: 1 }));
  await waitFor(() => expect(h.result.current.groups.data).toBeTruthy());
  await act(async () => {
    await h.result.current.setGroupBroadcastConsent(
      "00000000-0000-4000-8000-000000000099",
      true,
    );
  });
  expect(h.writes).toHaveLength(0);
  expect(h.result.current.message).toContain("no longer available");
  h.unmount();
  h.client.clear();
});
