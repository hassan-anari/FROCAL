import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { act } from "react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const gate = vi.hoisted(() => ({ remote: true, telegram: true, success: true, placeholder: false }));
vi.mock("@tanstack/react-router", () => ({ useRouterState: () => "/clan" }));
vi.mock("@/integrations/api/bootstrap", () => ({ isRemoteDataSource: () => gate.remote }));
vi.mock("@/integrations/api/BootstrapProvider", () => ({ useBootstrap: () => ({ bootstrap: { isSuccess: gate.success, isPlaceholderData: gate.placeholder, data: { player: { id: "9001" }, remote: {} } } }) }));
vi.mock("@/integrations/telegram/TelegramProvider", () => ({ useTelegram: () => ({ adapter: { isTelegram: gate.telegram }, launchState: "ready" }) }));
vi.mock("./analytics", async original => {
  const m = await original<typeof import("./analytics")>();
  return { ...m, analytics: m.createAnalytics({ enabled: true, key: "test", host: "https://ingest.test", replay: true, requireConsent: true }, { hash: async () => "hashed", load: async () => { throw new Error("should not load from UI"); } }) };
});
import { AnalyticsConsent } from "./AnalyticsConsent";
import { analytics, CONSENT_KEY } from "./analytics";
beforeEach(() => { gate.remote = gate.telegram = gate.success = true; gate.placeholder = false; localStorage.clear(); analytics.setConsent("unknown", false); });
afterEach(cleanup);
it("offers informed opt-in, remembers a choice and provides withdrawal", () => {
  const view = render(<AnalyticsConsent />);
  expect(screen.getByText(/pseudonymous player ID/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Allow analytics + replay" }));
  expect(localStorage.getItem(CONSENT_KEY)).toBe("replay");
  view.unmount(); render(<AnalyticsConsent />);
  expect(screen.queryByRole("button", { name: "Allow analytics + replay" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Demo privacy" }));
  fireEvent.click(screen.getByRole("button", { name: "Withdraw and stop tracking" }));
  expect(analytics.getConsent()).toBe("declined"); expect(localStorage.getItem(CONSENT_KEY)).toBe("declined");
});
it("keeps tracking off when declining and synchronizes withdrawal from another tab", () => {
  render(<AnalyticsConsent />); fireEvent.click(screen.getByRole("button", { name: "No thanks" }));
  expect(analytics.getConsent()).toBe("declined");
  act(() => { analytics.setConsent("analytics"); });
  localStorage.setItem(CONSENT_KEY, "declined");
  act(() => { window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_KEY })); });
  expect(analytics.getConsent()).toBe("declined");
});
it("does not offer consent for fixtures, placeholders, failed bootstrap or browser launches", () => {
  for (const patch of [{ remote: false }, { telegram: false }, { success: false }, { placeholder: true }]) {
    Object.assign(gate, { remote: true, telegram: true, success: true, placeholder: false }, patch);
    const view = render(<AnalyticsConsent />); expect(screen.queryByLabelText("Demo privacy")).toBeNull(); view.unmount();
  }
});
