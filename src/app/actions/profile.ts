"use server";

import { revalidatePath } from "next/cache";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getCurrentUserProfile } from "@/lib/forum-service";
import {
  normalizeNotificationPrefs,
  validateNotificationPrefsInput,
  type NotificationPrefs,
} from "@/lib/notification-prefs";
import { checkRateLimit } from "@/lib/rate-limit";

export async function updateNotificationPrefsAction(
  input: Partial<NotificationPrefs>
): Promise<{ ok: boolean; prefs?: NotificationPrefs; error?: string }> {
  if (!isFeatureEnabled("notificationPrefs")) {
    return {
      ok: false,
      error: "Tính năng tùy chọn thông báo hiện đang tạm tắt.",
    };
  }

  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Chưa kết nối cơ sở dữ liệu Supabase." };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để cập nhật cài đặt thông báo." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const rate = checkRateLimit(`notification-prefs:${user.id}`, {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!rate.allowed) {
    return {
      ok: false,
      error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
    };
  }

  const currentPrefs = normalizeNotificationPrefs(user.notificationPrefs);
  const checked = validateNotificationPrefsInput(input, currentPrefs);
  if (!checked.ok) {
    return { ok: false, error: checked.error };
  }

  try {
    const sql = getSql();
    await sql`
      UPDATE public.profiles
      SET
        notification_prefs = ${JSON.stringify(checked.prefs)}::jsonb,
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    revalidatePath("/profile");
    return { ok: true, prefs: checked.prefs };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể lưu cài đặt thông báo.",
    };
  }
}
