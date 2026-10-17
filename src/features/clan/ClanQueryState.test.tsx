import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ClanQueryState } from "./ClanQueryState";
import { JoinRequestsSheet } from "./ClanOverlays";
import { clanStatusLabel, invitationLabel } from "./clanStatusLabels";
it("uses the shared animated loader with an accessible Clan announcement", () => {
  render(<ClanQueryState loading title="Connecting to your Clan…" />);
  expect(screen.getByRole("status", { name: "Connecting to your Clan…" })).toBeVisible();
  expect(screen.queryByRole("button")).toBeNull();
});
it("keeps persistent errors visible and supplies a disabled-during-refresh retry", () => {
  const retry = vi.fn(); const view = render(<ClanQueryState title="Clans couldn't load." description="Try again." retry={retry} />);
  expect(screen.getByRole("status")).toHaveTextContent("Clans couldn't load.");
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(retry).toHaveBeenCalledOnce();
  view.rerender(<ClanQueryState title="Clans couldn't load." retry={retry} busy />);
  expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
});
it("distinguishes initial applicant loading, recoverable failure and a truly empty inbox", async () => {
  const props = { applicants: [], onClose: vi.fn(), onAccept: vi.fn(), onReject: vi.fn() };
  const view = render(<JoinRequestsSheet {...props} loading />);
  await waitFor(() => expect(screen.getByRole("status", { name: "Checking join requests…" })).toBeVisible());
  expect(screen.queryByText("No join requests yet")).toBeNull();
  const retry = vi.fn(); view.rerender(<JoinRequestsSheet {...props} error retry={retry} />);
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(retry).toHaveBeenCalledOnce();
  view.rerender(<JoinRequestsSheet {...props} />); expect(screen.getByRole("status")).toHaveTextContent("No join requests yet");
});
it("keeps acceptance distinct from membership and describes invitation readiness without technical state codes", () => {
  expect(clanStatusLabel("PENDING")).toBe("Awaiting Captain review");
  expect(clanStatusLabel("ACCEPTED")).toContain("verify Telegram membership");
  expect(invitationLabel("ACTIVE")).toBe("Ready to open");
  expect(invitationLabel("UNCERTAIN")).toBe("Invitation needs review");
  expect(clanStatusLabel("NEW_PRIVATE_CODE")).toBe("Needs review");
});
