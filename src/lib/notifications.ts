import { getSql } from "./db";
import { isDatabaseConfigured } from "./env";
import { isFeatureEnabled } from "./feature-flags";
import { getNotificationPrefKeyForType } from "./notification-prefs";
import type { NotificationItem, NotificationType } from "./types";

export const NOTIFICATION_COALESCE_WINDOW_MINUTES = 15;

/**
 * Chỉ gộp các thông báo tương tác/thảo luận tần suất cao; tuyệt đối không gộp
 * thông báo giao dịch/giải thưởng/hệ thống (redemption_update, campaign_award,
 * challenge_award, answer_accepted, author_reward, system) để tránh ghi đè mất sự kiện.
 */
export const COALESCABLE_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  "new_reply",
  "reply_mention",
  "new_follower",
]);

export function isCoalescableNotificationType(
  type: NotificationType | string
): boolean {
  return COALESCABLE_NOTIFICATION_TYPES.has(type);
}

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
    const safeTitle = input.title.trim().slice(0, 140);
    const safeBody = (input.body ?? "").trim().slice(0, 260);
    const safeHref = input.href?.trim() || "/";

    const prefKey = isFeatureEnabled("notificationPrefs")
      ? getNotificationPrefKeyForType(input.type)
      : null;
    const canCoalesce = isCoalescableNotificationType(input.type);
    const windowMinutes = NOTIFICATION_COALESCE_WINDOW_MINUTES;

    // 1 CTE nguyên tử (1 round-trip): kiểm tra preference + gộp nếu thuộc nhóm cho phép + chèn mới
    await sql`
      WITH recipient AS (
        SELECT id
        FROM public.profiles
        WHERE id = ${input.userId}
          AND (
            ${prefKey}::text IS NULL
            OR COALESCE(notification_prefs -> ${prefKey}::text, 'true'::jsonb) IS DISTINCT FROM 'false'::jsonb
          )
        LIMIT 1
      ),
      coalesced AS (
        UPDATE public.notifications n
        SET
          title = ${safeTitle},
          body = ${safeBody},
          created_at = NOW()
        FROM recipient r
        WHERE ${canCoalesce}::boolean = TRUE
          AND n.id = (
            SELECT n2.id
            FROM public.notifications n2
            WHERE n2.user_id = r.id
              AND n2.type = ${input.type}
              AND n2.href = ${safeHref}
              AND n2.is_read = FALSE
              AND n2.created_at >= NOW() - make_interval(mins => ${windowMinutes}::int)
            ORDER BY n2.created_at DESC
            LIMIT 1
            FOR UPDATE
          )
        RETURNING n.id
      )
      INSERT INTO public.notifications (user_id, type, title, body, href)
      SELECT r.id, ${input.type}, ${safeTitle}, ${safeBody}, ${safeHref}
      FROM recipient r
      WHERE NOT EXISTS (SELECT 1 FROM coalesced)
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
