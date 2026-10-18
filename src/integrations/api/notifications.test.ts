import { expect, it } from "vitest";
import { notificationDisplay } from "./notifications";
it("keeps meaningful server content and fills blank legacy fields independently", () => {
  expect(notificationDisplay({ type: "CLAN_INVITE_READY", title: " Captain approved ", body: "  " })).toEqual({ title: "Captain approved", body: expect.stringContaining("Open Clan Status") });
  expect(notificationDisplay({ type: "ANNOUNCEMENT", title: "News", body: "Season schedule" })).toEqual({ title: "News", body: "Season schedule" });
  expect(notificationDisplay({ type: "CLAN_ACCESS_LOST", title: "", body: "" })).toEqual({ title: expect.stringContaining("access"), body: expect.stringContaining("restore") });
  expect(notificationDisplay({ type: "FUTURE_EVENT", title: "", body: "" })).toEqual({ title: "Game update", body: expect.any(String) });
});
it.each(["https://t.me/+PRIVATE_INVITE", "https://telegram.me/joinchat/PRIVATE_INVITE", "tg://join?invite=PRIVATE_INVITE"])("never renders credential-bearing legacy copy: %s", credential => {
  const copy = notificationDisplay({ type: "CLAN_INVITE_READY", title: `Join ${credential}`, body: `Invitation ${credential}` });
  expect(JSON.stringify(copy)).not.toContain("PRIVATE_INVITE");
  expect(copy.title).toBe("Clan invitation ready"); expect(copy.body).toContain("Clan Status");
});
