import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

const PRUNE_BATCH_LIMIT = 2000;

async function safeBoundedPrune(
  label: string,
  run: () => Promise<number>
): Promise<number> {
  try {
    return await run();
  } catch (err) {
    // Không làm gián đoạn keep-alive nếu bảng chưa tồn tại hoặc quá tải tạm thời
    console.warn(`[cron/keep-alive] Bỏ qua dọn dẹp ${label}:`, err);
    return 0;
  }
}

/**
 * Endpoint Cron duy nhất chạy tự động 1 lần/ngày trên Vercel Hobby (`0 3 * * *` trong `vercel.json`):
 * 1. Giữ Database Supabase Free luôn hoạt động (không bị tạm dừng sau 7 ngày).
 * 2. Dọn rác định kỳ có giới hạn (Bounded TTL Pruning) để bảo vệ dung lượng Disk 500MB:
 *    - Xóa `activities` cũ hơn 90 ngày.
 *    - Xóa `notifications` đã đọc cũ hơn 60 ngày và chưa đọc cũ hơn 180 ngày.
 *    - Xóa `content_reports` đã xử lý (`resolved` / `dismissed`) cũ hơn 180 ngày.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (
    (process.env.NODE_ENV === "production" && !cronSecret) ||
    (cronSecret && authHeader !== `Bearer ${cronSecret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, status: "demo_mode" });
  }

  try {
    const sql = getSql();
    await sql`SELECT 1 AS alive`;

    const activitiesPruned = await safeBoundedPrune("activities", async () => {
      const rows = await sql`
        WITH doomed AS (
          SELECT id
          FROM public.activities
          WHERE created_at < NOW() - INTERVAL '90 days'
          ORDER BY created_at ASC
          LIMIT ${PRUNE_BATCH_LIMIT}
        )
        DELETE FROM public.activities
        WHERE id IN (SELECT id FROM doomed)
        RETURNING id
      `;
      return rows.length;
    });

    const readNotificationsPruned = await safeBoundedPrune(
      "read_notifications",
      async () => {
        const rows = await sql`
          WITH doomed AS (
            SELECT id
            FROM public.notifications
            WHERE is_read = TRUE
              AND created_at < NOW() - INTERVAL '60 days'
            ORDER BY created_at ASC
            LIMIT ${PRUNE_BATCH_LIMIT}
          )
          DELETE FROM public.notifications
          WHERE id IN (SELECT id FROM doomed)
          RETURNING id
        `;
        return rows.length;
      }
    );

    const unreadNotificationsPruned = await safeBoundedPrune(
      "unread_notifications",
      async () => {
        const rows = await sql`
          WITH doomed AS (
            SELECT id
            FROM public.notifications
            WHERE is_read = FALSE
              AND created_at < NOW() - INTERVAL '180 days'
            ORDER BY created_at ASC
            LIMIT ${PRUNE_BATCH_LIMIT}
          )
          DELETE FROM public.notifications
          WHERE id IN (SELECT id FROM doomed)
          RETURNING id
        `;
        return rows.length;
      }
    );

    const resolvedReportsPruned = await safeBoundedPrune(
      "resolved_reports",
      async () => {
        const rows = await sql`
          WITH doomed AS (
            SELECT id
            FROM public.content_reports
            WHERE status IN ('resolved', 'dismissed')
              AND COALESCE(resolved_at, created_at) < NOW() - INTERVAL '180 days'
            ORDER BY COALESCE(resolved_at, created_at) ASC
            LIMIT ${PRUNE_BATCH_LIMIT}
          )
          DELETE FROM public.content_reports
          WHERE id IN (SELECT id FROM doomed)
          RETURNING id
        `;
        return rows.length;
      }
    );

    return NextResponse.json({
      ok: true,
      pingedAt: new Date().toISOString(),
      pruned: {
        activities: activitiesPruned,
        readNotifications: readNotificationsPruned,
        unreadNotifications: unreadNotificationsPruned,
        resolvedReports: resolvedReportsPruned,
      },
    });
  } catch (err) {
    console.error("[cron/keep-alive] Database maintenance failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Database maintenance failed",
      },
      { status: 500 }
    );
  }
}
