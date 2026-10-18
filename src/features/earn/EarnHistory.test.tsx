import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HistorySheet } from "./EarnOverlays";
afterEach(() => vi.unstubAllGlobals());
it("retains the History sheet through loading, failure, retry, empty pagination and final empty states", async () => {
  const props = { open: true, onClose: vi.fn(), history: [], remote: true };
  const view = render(<HistorySheet {...props} loading />);
  await waitFor(() => expect(screen.getByRole("dialog", { name: "Earn history" })).toBeVisible());
  expect(screen.getByRole("status", { name: "Loading earnings…" })).toBeVisible();
  const retry = vi.fn(); view.rerender(<HistorySheet {...props} error retry={retry} />);
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(retry).toHaveBeenCalledOnce();
  const more = vi.fn(); view.rerender(<HistorySheet {...props} hasNext loadMore={more} />);
  expect(screen.getByRole("status")).toHaveTextContent("No rewards yet");
  fireEvent.click(screen.getByRole("button", { name: "Load more" })); expect(more).toHaveBeenCalledOnce();
  view.rerender(<HistorySheet {...props} />); expect(screen.getByRole("status")).toHaveTextContent("No rewards yet");
});
it("preserves confirmed rows during continuation failure and provides a retry", async () => {
  const retry = vi.fn();
  render(<HistorySheet open onClose={() => {}} remote error retry={retry} history={[{ id: "1", type: "group", title: "CREATOR", description: "NETWORK GROUP", xp: -3, createdAt: "2026-10-16T10:10:00Z" }]} />);
  await waitFor(() => expect(screen.getByText("CREATOR")).toBeVisible()); expect(screen.getByText("-3 XP")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(retry).toHaveBeenCalledOnce();
});
it("keeps the same rendered row during background refresh and puts pagination progress on the control", async () => {
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  const props = { open: true, onClose: vi.fn(), remote: true, hasNext: true, loadMore: vi.fn(), history: [{ id: "1", type: "group" as const, title: "CREATOR", description: "NETWORK GROUP", xp: 3, createdAt: "2026-10-16T10:10:00Z" }] };
  const view = render(<HistorySheet {...props} />);
  const row = await screen.findByText("CREATOR");
  view.rerender(<HistorySheet {...props} fetching />);
  expect(screen.getByText("CREATOR")).toBe(row);
  expect(screen.queryByRole("status", { name: "Loading earnings…" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Load more" })).toBeDisabled();
  view.rerender(<HistorySheet {...props} fetching fetchingMore />);
  expect(screen.getByText("CREATOR")).toBe(row);
  expect(screen.getByRole("button", { name: "Loading more…" })).toBeDisabled();
});
