"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  CACHE_TAGS,
  getMemberFollowsCacheTag,
  getUserBlocksCacheTag,
} from "@/lib/cache-tags";
import { isDatabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createContentReport,
  isUserBlockMode,
  resolveContentReport,
  toggleUserBlock,
  validateContentReportInput,
  validateReportResolutionInput,
} from "@/lib/safety-service";
import { isValidUuid } from "@/lib/social-service";
import type {
  ReportReason,
  ReportTargetType,
  UserBlockMode,
} from "@/lib/types";

export async function submitContentReportAction(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  detail?: string;
}): Promise<{ ok: boolean; reportId?: string; error?: string }> {
  if (!isFeatureEnabled("communitySafety")) {
    return { ok: false, error: "Tính năng báo cáo nội dung hiện đang tạm tắt." };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu. Vui lòng thử lại sau.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để gửi báo cáo vi phạm." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const validated = validateContentReportInput({
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    detail: input.detail,
    reporterId: user.id,
  });
  if (!validated.ok) {
    return validated;
  }

  const burst = checkRateLimit(`report:${user.id}`, {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!burst.allowed) {
    return {
      ok: false,
      error: `Bạn gửi báo cáo quá nhanh. Vui lòng thử lại sau ${burst.retryAfterSeconds} giây.`,
    };
  }

  try {
    const result = await createContentReport({
      reporterId: user.id,
      reporterRole: user.role,
      targetType: validated.targetType,
      targetId: validated.targetId,
      reason: validated.reason,
      detail: validated.detail,
    });
    if (!result.ok) {
      return result;
    }

    revalidateTag(CACHE_TAGS.reports);
    revalidatePath("/admin");
    return result;
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể gửi báo cáo. Vui lòng thử lại.",
    };
  }
}

export async function toggleUserBlockAction(input: {
  targetUserId: string;
  mode?: UserBlockMode | null;
}): Promise<{ ok: boolean; mode?: UserBlockMode | null; error?: string }> {
  if (!isFeatureEnabled("communitySafety")) {
    return { ok: false, error: "Tính năng ẩn/chặn hiện đang tạm tắt." };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu. Vui lòng thử lại sau.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để thực hiện thao tác này." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const targetId = input.targetUserId.trim();
  if (!isValidUuid(targetId)) {
    return { ok: false, error: "Mã thành viên không hợp lệ." };
  }

  if (
    input.mode !== undefined &&
    input.mode !== null &&
    !isUserBlockMode(input.mode)
  ) {
    return { ok: false, error: "Chế độ ẩn/chặn không hợp lệ." };
  }

  const burst = checkRateLimit(`block:${user.id}`, {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!burst.allowed) {
    return {
      ok: false,
      error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${burst.retryAfterSeconds} giây.`,
    };
  }

  try {
    const result = await toggleUserBlock(user.id, targetId, input.mode);
    if (!result.ok) {
      return result;
    }

    revalidateTag(getUserBlocksCacheTag(user.id));
    if (result.mode === "block") {
      revalidateTag(getMemberFollowsCacheTag(targetId));
      revalidateTag(getMemberFollowsCacheTag(user.id));
    }
    revalidatePath("/");
    revalidatePath(`/members/${targetId}`);
    revalidatePath(`/members/${user.id}`);
    return result;
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể cập nhật thiết lập ẩn/chặn.",
    };
  }
}

export async function resolveContentReportAction(input: {
  reportId: string;
  status: "resolved" | "dismissed";
  resolutionNote?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu. Vui lòng thử lại sau.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user || user.role !== "admin") {
    return {
      ok: false,
      error: "Chỉ Quản trị viên mới có quyền xử lý báo cáo vi phạm.",
    };
  }

  const validated = validateReportResolutionInput(input);
  if (!validated.ok) {
    return validated;
  }

  try {
    const result = await resolveContentReport({
      reportId: validated.reportId,
      adminId: user.id,
      status: validated.status,
      resolutionNote: validated.resolutionNote,
    });
    if (!result.ok) {
      return result;
    }

    revalidateTag(CACHE_TAGS.reports);
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không thể cập nhật báo cáo.",
    };
  }
}
