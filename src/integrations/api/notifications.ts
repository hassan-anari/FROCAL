import { z } from "zod";
import { apiRequest } from "./client";

const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  read_at: z.string().nullable(),
  unread: z.boolean(),
});

const notificationPageSchema = z.object({
  items: z.array(notificationSchema),
  next_cursor: z.number().int().nullable(),
});

export type NotificationItem = z.infer<typeof notificationSchema>;
export type NotificationPage = z.infer<typeof notificationPageSchema>;

export async function loadNotifications(
  initData: string | null,
  limit = 20,
): Promise<NotificationPage> {
  const response = await apiRequest(`/notifications?limit=${limit}`, { initData });
  return notificationPageSchema.parse(await response.json());
}

export async function markNotificationRead(
  notificationId: string,
  initData: string | null,
): Promise<NotificationItem> {
  const response = await apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    initData,
  });
  return notificationSchema.parse(await response.json());
}
