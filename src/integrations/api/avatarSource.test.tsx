import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { chooseAvatarDelivery, safeAvatarUrl, type VerifiedAvatar } from "./avatarSource";

it("prefers verified cache delivery, rejects unsafe protocols and never falls back to a blocked external host", () => {
  const cached: VerifiedAvatar = { owner: "player-a", version: "1", delivery: { kind: "url", url: "https://cache.test/avatar.png" } };
  expect(chooseAvatarDelivery("player-a", cached, "https://t.me/photo.jpg")).toEqual(cached.delivery);
  expect(chooseAvatarDelivery("player-b", cached, "https://t.me/photo.jpg")).toBeNull();
  expect(chooseAvatarDelivery("player-a", { ...cached, delivery: null }, "https://t.me/photo.jpg")).toBeNull();
  for (const url of ["javascript:alert(1)", "data:image/png;base64,aaa", "file:///tmp/a", "//unverified.test/a", "https://user:pass@cache.test/a"]) expect(safeAvatarUrl(url)).toBeNull();
});

it("keeps existing initials on failure, avoids repeated failed loads and accepts image updates/account changes", () => {
  const cached: VerifiedAvatar = { owner: "avatar-test-a", version: "v1", delivery: { kind: "url", url: "https://cache.test/a.png" } };
  const props = { firstName: "Alice", owner: cached.owner, cachedAvatar: cached, frameId: "standard" as const };
  const { container, rerender } = render(<ProfileAvatar {...props} />);
  const image = container.querySelector('img[src="https://cache.test/a.png"]')!;
  fireEvent.error(image);
  expect(screen.getByText("A")).toBeInTheDocument();
  rerender(<ProfileAvatar {...props} />);
  expect(container.querySelector('img[src="https://cache.test/a.png"]')).toBeNull();
  rerender(<ProfileAvatar {...props} cachedAvatar={{ ...cached, version: "v2", delivery: { kind: "url", url: "https://cache.test/updated.png" } }} />);
  expect(container.querySelector('img[src="https://cache.test/updated.png"]')).not.toBeNull();
  rerender(<ProfileAvatar {...props} owner="different-player" firstName="Bob" />);
  expect(screen.getByText("B")).toBeInTheDocument();
  expect(container.querySelector('img[src="https://cache.test/updated.png"]')).toBeNull();
});

it("authenticated delivery stays in memory and releases image URLs on account changes", async () => {
  const create = vi.fn(() => "blob:fixture-image"); const revoke = vi.fn();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
  const load = vi.fn(async () => new Blob(["image-bytes"], { type: "image/png" }));
  const cached: VerifiedAvatar = { owner: "authenticated-a", version: "auth-v1", delivery: { kind: "authenticated", load } };
  const { container, rerender, unmount } = render(<ProfileAvatar firstName="Alice" owner={cached.owner} cachedAvatar={cached} frameId="standard" />);
  await waitFor(() => expect(container.querySelector('img[src="blob:fixture-image"]')).not.toBeNull());
  rerender(<ProfileAvatar firstName="Bob" owner="authenticated-b" cachedAvatar={cached} frameId="standard" />);
  expect(container.querySelector('img[src="blob:fixture-image"]')).toBeNull();
  expect(revoke).toHaveBeenCalledWith("blob:fixture-image");
  expect(load).toHaveBeenCalledTimes(1);
  unmount(); vi.unstubAllGlobals();
});
