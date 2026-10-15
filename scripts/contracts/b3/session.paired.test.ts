import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { createTapPort } from "../../../src/integrations/api/tapV2";
import { TapController } from "../../../src/game/base/tapV2/controller";
import { MemoryStorage } from "../../../src/game/base/tapV2/testing.fixture";
import type { TapPort } from "../../../src/game/base/tapV2/model";
const origin = "http://127.0.0.1:8792";
const nativeFetch = globalThis.fetch;
const controllers: TapController[] = [];
const measurements: Array<{ action: string; milliseconds: number }> = [];
async function control(data: object) {
  const response = await nativeFetch(`${origin}/__b2_test__`, { method: "POST", body: JSON.stringify(data) });
  if (!response.ok) throw new Error("Isolated control failed");
  return response.json();
}
beforeEach(async () => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.stubGlobal("window", { setTimeout, clearTimeout, location: { origin } });
  await control({ action: "flags" });
  vi.stubGlobal("fetch", (path: string, options?: RequestInit) => {
    if (!path.startsWith("/api/v1/")) throw new Error("Paired traffic must remain local");
    return nativeFetch(origin + path, options);
  });
});
afterEach(() => {
  controllers.splice(0).forEach(controller => controller.close());
  vi.unstubAllGlobals();
  mkdirSync("test-results-paired", { recursive: true });
  writeFileSync("test-results-paired/session-measurements.json", JSON.stringify(measurements, null, 2));
});
function device(identity: { player: string; initData: string }, storage = new MemoryStorage(), port?: TapPort) {
  const controller = new TapController({ player: identity.player, port: port ?? createTapPort(identity.player, identity.initData),
    storage: () => storage, ownership: { acquire: async () => true, release: () => {} } });
  controllers.push(controller);
  return { controller, storage };
}
async function identity() { return control({ action: "player", points: 150 }); }

it("conflicts Mobile/Desktop identities, switches deliberately, fences the old device even after expiry, then reopens without resetting XP", async () => {
  const player = await identity();
  const phone = device(player); await phone.controller.start();
  const desktop = device(player); await desktop.controller.start();
  expect(phone.controller.getSnapshot().status).toBe("ready");
  expect(desktop.controller.getSnapshot()).toMatchObject({ status: "paused", error: "ACTIVE_SESSION", canSwitchDevice: true });
  const started = performance.now();
  await desktop.controller.switchToThisDevice();
  const milliseconds = performance.now() - started;
  measurements.push({ action: "explicit-device-switch", milliseconds });
  expect(milliseconds).toBeLessThan(15_000);
  expect(desktop.controller.getSnapshot()).toMatchObject({ status: "ready", lifetime: 150 });
  await phone.controller.resume();
  expect(phone.controller.getSnapshot()).toMatchObject({ status: "paused", error: "LEASE_REVOKED" });
  await control({ action: "advance", seconds: 121 });
  await phone.controller.resume();
  expect(phone.controller.getSnapshot()).toMatchObject({ status: "paused", error: "LEASE_REVOKED" });
  expect(phone.controller.touch()).toBe(false);
  // The new device can renew normally; the fenced one cannot acquire automatically.
  await desktop.controller.resume();
  expect(desktop.controller.getSnapshot().status).toBe("ready");
  await desktop.controller.releaseSession();
  phone.controller.close(); desktop.controller.close();
  const reopened = device(player, desktop.storage);
  const reopening = performance.now(); await reopened.controller.start();
  measurements.push({ action: "close-both-and-reopen-after-acknowledged-release", milliseconds: performance.now() - reopening });
  expect(reopened.controller.getSnapshot()).toMatchObject({ status: "ready", lifetime: 150 });
  expect((await control({ action: "inspect", player: player.player })).lifetime).toBe(150);
});

it("preserves an unconfirmed committed Tap journal through switching and retires only its immutable receipt", async () => {
  const player = await identity();
  const port = createTapPort(player.player, player.initData);
  const phone = device(player, undefined, { ...port, submit: async (batch, signal) => {
    await port.submit(batch, signal);
    throw new Error("isolated lost committed response");
  } });
  await phone.controller.start(); phone.controller.touch(); await phone.controller.flush();
  const original = JSON.parse(phone.storage.getItem(`dalexio-tap-v2:${player.player}`)!);
  expect(original.events).toHaveLength(1);
  const desktop = device(player); await desktop.controller.start(); await desktop.controller.switchToThisDevice();
  await phone.controller.resume();
  expect(phone.controller.getSnapshot()).toMatchObject({ lifetime: 151, error: "LEASE_REVOKED" });
  const recovered = JSON.parse(phone.storage.getItem(`dalexio-tap-v2:${player.player}`)!);
  expect(recovered.events).toEqual([]); expect(recovered.batches).toEqual([]);
  expect((await control({ action: "inspect", player: player.player })).lifetime).toBe(151);
});

it("recovers an explicit switch whose response was lost without a second takeover", async () => {
  const player = await identity();
  const phone = device(player); await phone.controller.start();
  const port = createTapPort(player.player, player.initData);
  const switchSession = vi.fn(async (...args: Parameters<NonNullable<TapPort["switchSession"]>>) => {
    await port.switchSession!(...args);
    throw new Error("isolated lost switch response");
  });
  const desktop = device(player, undefined, { ...port, switchSession });
  await desktop.controller.start(); await desktop.controller.switchToThisDevice();
  expect(desktop.controller.getSnapshot().status).toBe("paused");
  await desktop.controller.resume();
  expect(desktop.controller.getSnapshot()).toMatchObject({ status: "ready", lifetime: 150 });
  expect(switchSession).toHaveBeenCalledTimes(1);
});
