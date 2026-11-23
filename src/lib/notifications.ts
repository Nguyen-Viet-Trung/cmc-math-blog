import { getSql } from "./db";
import { isDatabaseConfigured } from "./env";
import type { NotificationItem, NotificationType } from "./types";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
}): Promise<void> {
  if (!isDatabaseConfigured() || !input.userId) return;
  try {
    const sql = getSql();
    await sql`
      INSERT INTO public.notifications (user_id, type, title, body, href)
      VALUES (
        ${input.userId},
        ${input.type},
        ${input.title.trim().slice(0, 140)},
        ${(input.body ?? "").trim().slice(0, 260)},
        ${input.href?.trim() || "/"}
      )
    `;
  } catch (err) {
    // Thông báo là best-effort, không làm hỏng giao dịch chính
    console.warn("[notifications] Không thể ghi thông báo:", err);
  }
}

export async function listUserNotifications(
  userId: string,
  limit = 20
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  if (!isDatabaseConfigured()) {
    return { items: [], unreadCount: 0 };
  }

  const sql = getSql();
  const [rows, countRows] = await Promise.all([
    sql`
      SELECT id, user_id, type, title, body, href, is_read, created_at
      FROM public.notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT COUNT(*)::int AS unread_count
      FROM public.notifications
      WHERE user_id = ${userId} AND is_read = FALSE
    `,
  ]);

  const items: NotificationItem[] = rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    type: String(r.type) as NotificationType,
    title: String(r.title),
    body: String(r.body ?? ""),
    href: String(r.href ?? "/"),
    isRead: Boolean(r.is_read),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));

  return {
    items,
    unreadCount: Number(countRows[0]?.unread_count ?? 0),
  };
}

export async function markNotificationsRead(
  userId: string,
  notificationId?: string
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const sql = getSql();
  if (notificationId) {
    await sql`
      UPDATE public.notifications
      SET is_read = TRUE
      WHERE id = ${notificationId} AND user_id = ${userId}
    `;
  } else {
    await sql`
      UPDATE public.notifications
      SET is_read = TRUE
      WHERE user_id = ${userId} AND is_read = FALSE
    `;
  }
}
