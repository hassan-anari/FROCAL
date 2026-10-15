import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
it("production render recovery never renders internal exception details or a diagnostics interface", () => {
  vi.stubEnv("DEV", false);
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  function Broken(): never { throw new Error("isolated-private-session-detail"); }
  const { container } = render(<AppErrorBoundary><Broken /></AppErrorBoundary>);
  expect(screen.getByRole("button", { name: "Try Again" })).toBeVisible();
  expect(container.textContent).not.toMatch(/isolated-private-session-detail|Launch diagnostics|Recovery code|Credentials/);
  expect(container.querySelector("details, summary")).toBeNull();
  expect(log).toHaveBeenCalledWith("Dexo Land render failure");
});
