import { beforeEach, expect, it } from "vitest";
import {
  broadcastConsentSchema,
  groupsSchema,
  intentSchema,
} from "../../../src/integrations/api/b3Contracts";
const api = "http://127.0.0.1:8792";
async function control(body: object) {
  const response = await fetch(`${api}/__b2_test__`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw Error("Isolated control failed");
  return response.json();
}
let identity: { player: string; initData: string };
let groupId: string;
async function call(path: string, body?: object, initData = identity.initData) {
  const response = await fetch(`${api}/api/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `tma ${initData}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, result: await response.json() };
}
const consent = (enabled: unknown, initData?: string) =>
  call(`/network/groups/${groupId}/broadcast-consent`, { enabled }, initData);
const groups = async () =>
  groupsSchema.parse((await call("/network/groups")).result);
beforeEach(async () => {
  identity = await control({ action: "player", points: 150 });
  await control({
    action: "b3-broadcast-verification",
    player: identity.player,
    mode: "allow",
  });
  const intent = intentSchema.parse(
    (await call("/network/groups/intents", {})).result,
  );
  groupId = (
    await control({
      action: "b3-group",
      player: identity.player,
      token: new URL(intent.startgroup_url).searchParams.get("startgroup"),
    })
  ).id;
});
it("reads actual opt-in, enables explicitly, and lets the consenting creator revoke during a Telegram outage without changing rewards", async () => {
  expect((await groups()).items[0].broadcast_opted_in).toBe(false);
  const enabled = await consent(true);
  expect(enabled.status).toBe(200);
  expect(broadcastConsentSchema.parse(enabled.result)).toEqual({
    enabled: true,
    revision: 1,
  });
  expect((await groups()).items[0].broadcast_opted_in).toBe(true);
  await control({
    action: "b3-broadcast-verification",
    player: identity.player,
    mode: "unavailable",
  });
  const revoked = await consent(false);
  expect(revoked.status).toBe(200);
  expect(broadcastConsentSchema.parse(revoked.result)).toEqual({
    enabled: false,
    revision: 2,
  });
  expect((await groups()).items[0].broadcast_opted_in).toBe(false);
  expect(
    (await control({ action: "inspect", player: identity.player })).lifetime,
  ).toBe(150);
});
it.each(["denied", "unavailable"])(
  "rejects %s verification without claiming consent",
  async (mode) => {
    await control({
      action: "b3-broadcast-verification",
      player: identity.player,
      mode,
    });
    const response = await consent(true);
    expect(response.status).toBe(409);
    expect(response.result.code).toBe("GROUP_AUTHORIZATION_UNAVAILABLE");
    expect((await groups()).items[0].broadcast_opted_in).toBe(false);
  },
);
it("rejects another account's group and non-boolean consent", async () => {
  const other = await control({ action: "player", points: 0 });
  expect(await consent(true, other.initData)).toMatchObject({
    status: 404,
    result: { code: "GROUP_NOT_FOUND" },
  });
  expect((await consent("true")).status).toBe(422);
  expect((await groups()).items[0].broadcast_opted_in).toBe(false);
});
