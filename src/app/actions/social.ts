"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getMemberFollowsCacheTag } from "@/lib/cache-tags";
import { isDatabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUuid, toggleUserFollow } from "@/lib/social-service";

export async function toggleFollowAction(targetUserId: string): Promise<{
  ok: boolean;
  following?: boolean;
  followersCount?: number;
  error?: string;
}> {
  if (!isFeatureEnabled("followSystem")) {
    return { ok: false, error: "Tính năng theo dõi hiện đang tạm tắt." };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu. Vui lòng thử lại sau.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để theo dõi thành viên." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const trimmedTargetId = targetUserId.trim();
  if (!isValidUuid(trimmedTargetId)) {
    return { ok: false, error: "Mã thành viên không hợp lệ." };
  }

  const burst = checkRateLimit(`follow:${user.id}`, {
    maxRequests: 30,
    windowMs: 5 * 60 * 1000,
  });
  if (!burst.allowed) {
    return {
      ok: false,
      error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${burst.retryAfterSeconds} giây.`,
    };
  }

  try {
    const result = await toggleUserFollow(user.id, trimmedTargetId);
    if (!result.ok) {
      return result;
    }

    revalidateTag(getMemberFollowsCacheTag(trimmedTargetId));
    revalidateTag(getMemberFollowsCacheTag(user.id));
    revalidatePath(`/members/${trimmedTargetId}`);
    revalidatePath(`/members/${user.id}`);
    return result;
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái theo dõi.",
    };
  }
}
