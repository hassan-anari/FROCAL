import { z } from "zod";
import { apiRequest } from "./client";

export const notificationSchema = z.object({
  deep_link: z.object({ path: z.string() }).nullable().optional(),
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  read_at: z.string().nullable(),
  unread: z.boolean(),
});

export const notificationPageSchema = z.object({
  items: z.array(notificationSchema),
  next_cursor: z.number().int().nullable(),
  unread_count: z.number().int().nonnegative().optional(),
});

export type LiveNotification = z.infer<typeof notificationSchema>;
export type NotificationPage = z.infer<typeof notificationPageSchema>;

export async function loadNotifications(
  initData: string | null,
  limit = 20,
  cursor: number | null = null,
  signal?: AbortSignal,
): Promise<NotificationPage> {
  const response = await apiRequest(`/notifications?limit=${encodeURIComponent(limit)}${cursor === null ? "" : `&cursor=${cursor}`}`, { initData, signal, cache: "no-store" });
  return notificationPageSchema.parse(await response.json());
}

export async function markAllNotificationsRead(initData: string | null) {
  const response = await apiRequest("/notifications/read-all", { method: "POST", initData });
  return z.object({ updated_count: z.number().int().nonnegative(), unread_count: z.number().int().nonnegative() }).parse(await response.json());
}

export async function markNotificationRead(
  initData: string | null,
  notificationId: string,
): Promise<LiveNotification> {
  const response = await apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    initData,
  });
  return notificationSchema.parse(await response.json());
}

// Credential-free legacy copy from the published post-B6 Clan event catalog.
const clanNotificationFallbacks: Record<string, readonly [string, string]> = {
  "CLAN_INVITE_READY": [
    "Clan invitation ready",
    "Open Clan Status in the app to securely access your personal invitation. Joining Telegram still requires membership verification."
  ],
  "CLAN_JOIN_ACCEPTED": [
    "Clan request accepted",
    "Your request was accepted. Open Clan Status to check your invitation and next steps."
  ],
  "CLAN_JOIN_DECLINED": [
    "Clan request declined",
    "Your join request was declined. Open Clan Status to review your options."
  ],
  "CLAN_MEMBERSHIP_ACTIVATED": [
    "Clan membership active",
    "Your Clan membership is now active. Open Clan Status to view your Clan."
  ],
  "CLAN_ACCESS_LOST": [
    "Clan Home access lost",
    "Your Clan membership is preserved. Open Clan Status to check secure rejoin options."
  ],
  "CLAN_ACCESS_RESTORED": [
    "Clan Home access restored",
    "Your Telegram Home access has been verified again. Open Clan Status for current details."
  ],
  "CLAN_GOVERNANCE_OPENED": [
    "Clan vote opened",
    "A Clan vote is open. Open Clan Status to review the case and voting eligibility."
  ],
  "CLAN_GOVERNANCE_FINALIZED": [
    "Clan vote concluded",
    "A Clan vote has concluded. Open Clan Status to review its decision and outcome."
  ],
  "CLAN_INACTIVITY_WARNING": [
    "Clan activity reminder",
    "Your Clan activity needs attention. Open Clan Status to review your membership status."
  ],
  "CLAN_BOT_ADMIN_LOST": [
    "Clan bot permissions need attention",
    "The bot lost required Home permissions. Open Clan Status to review recovery requirements."
  ],
  "CLAN_CAPTAIN_AUTHORITY_LOST": [
    "Clan recovery",
    "Restore your Telegram group administrator authority to recover Clan management."
  ],
  "CLAN_RECOVERY_ENTERED": [
    "Clan entered recovery",
    "Your Clan needs recovery. Open Clan Status to review restrictions and next steps."
  ],
  "CLAN_RECOVERY_CANCELLED": [
    "Clan recovery resolved",
    "Your Clan returned to active status. Open Clan Status for current details."
  ],
  "CLAN_BOT_ADMIN_RESTORED": [
    "Clan bot permissions restored",
    "Home bot permissions were restored. Open Clan Status to check any remaining recovery."
  ],
  "CLAN_CAPTAIN_AUTHORITY_RESTORED": [
    "Captain authority restored",
    "Captain authority was verified again. Open Clan Status to check any remaining recovery."
  ]
};
/** Legacy display only. Never derive copy or navigation from payload credentials. */
export function notificationDisplay(item: Pick<LiveNotification, "type" | "title" | "body">) {
  const pair = clanNotificationFallbacks[item.type];
  const fallback = pair ? { title: pair[0], body: pair[1] } : item.type.startsWith("CLAN_")
    ? { title: "Clan update", body: "Open Clan Status to review the latest update." }
    : { title: "Game update", body: "Open the game to review your latest activity." };
  const safeCopy = (value: string, replacement: string) => {
    const text = value.trim();
    return !text || /(?:t\.me|telegram\.me)\/(?:\+|joinchat\/)|tg:\/\/join\?/i.test(text) ? replacement : text;
  };
  return { title: safeCopy(item.title, fallback.title), body: safeCopy(item.body, fallback.body) };
}
