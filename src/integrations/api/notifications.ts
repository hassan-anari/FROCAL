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

/** Legacy display only. Never derive copy or navigation from payload credentials. */
export function notificationDisplay(item: Pick<LiveNotification, "type" | "title" | "body">) {
  const fallback = item.type === "CLAN_INVITE_READY"
    ? { title: "Clan invitation ready", body: "Your invitation is ready. Open Clan Status to check your invitation and join the Telegram group." }
    : item.type === "CLAN_ACCESS_LOST"
      ? { title: "Clan access needs attention", body: "Open Clan Status to check your membership and restore group access." }
      : item.type.startsWith("CLAN_")
        ? { title: "Clan update", body: "Open Clan Status to review the latest update." }
        : { title: "Game update", body: "Open the game to review your latest activity." };
  const safeCopy = (value: string, replacement: string) => {
    const text = value.trim();
    // A credential-bearing legacy template must never put an invite in the card.
    return !text || /(?:t\.me|telegram\.me)\/(?:\+|joinchat\/)|tg:\/\/join\?/i.test(text) ? replacement : text;
  };
  return { title: safeCopy(item.title, fallback.title), body: safeCopy(item.body, fallback.body) };
}
