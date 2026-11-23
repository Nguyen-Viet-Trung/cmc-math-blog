"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { deleteStorageImagesByUrls } from "@/lib/storage-cleanup";
import type { FeedbackCategory, FeedbackStatus } from "@/lib/types";

const ALLOWED_CATEGORIES: FeedbackCategory[] = [
  "bug",
  "feature",
  "ui_ux",
  "other",
];
const ALLOWED_STATUSES: FeedbackStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

export async function submitFeedbackAction(input: {
  category: FeedbackCategory;
  title: string;
  description: string;
  pageUrl: string;
  imageUrls: string[];
  contactName?: string;
  contactEmail?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Chưa kết nối cơ sở dữ liệu Supabase.",
    };
  }

  if (!ALLOWED_CATEGORIES.includes(input.category)) {
    return { ok: false, error: "Phân loại góp ý không hợp lệ." };
  }

  const title = input.title.trim();
  const description = input.description.trim();
  const pageUrl = input.pageUrl.trim().slice(0, 250);

  if (title.length < 5 || title.length > 160) {
    return { ok: false, error: "Tiêu đề cần từ 5 đến 160 ký tự." };
  }
  if (description.length < 10 || description.length > 3000) {
    return {
      ok: false,
      error: "Nội dung mô tả chi tiết cần từ 10 đến 3000 ký tự.",
    };
  }
  if (input.imageUrls.length > 4) {
    return { ok: false, error: "Đính kèm tối đa 4 ảnh chụp màn hình." };
  }

  try {
    const user = await getCurrentUserProfile();
    if (user?.isBanned) {
      return { ok: false, error: "Tài khoản của bạn đang bị khóa." };
    }

    const reqHeaders = await headers();
    const clientIp =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip")?.trim() ||
      "anonymous";
    const rate = checkRateLimit(`feedback:${user?.id ?? clientIp}`, {
      maxRequests: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return {
        ok: false,
        error: `Bạn gửi góp ý quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
      };
    }

    const contactName = user
      ? user.displayName
      : (input.contactName?.trim().slice(0, 60) || "Học sinh");
    const contactEmail = user
      ? user.email
      : (input.contactEmail?.trim().slice(0, 120) || "");

    const sql = getSql();
    await sql`
      INSERT INTO public.feedbacks (
        user_id,
        category,
        title,
        description,
        page_url,
        image_urls,
        contact_name,
        contact_email
      )
      VALUES (
        ${user?.id ?? null},
        ${input.category},
        ${title},
        ${description},
        ${pageUrl},
        ${sql.array(user ? input.imageUrls : [])},
        ${contactName},
        ${contactEmail}
      )
    `;

    revalidateTag(CACHE_TAGS.feedbacks);
    revalidatePath("/feedback");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể gửi góp ý.",
    };
  }
}

export async function reviewFeedbackByAdminAction(input: {
  feedbackId: string;
  status: FeedbackStatus;
  adminReply: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUserProfile();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Chỉ Admin mới có quyền phản hồi góp ý." };
  }

  if (!ALLOWED_STATUSES.includes(input.status)) {
    return { ok: false, error: "Trạng thái không hợp lệ." };
  }

  try {
    const sql = getSql();
    await sql`
      UPDATE public.feedbacks
      SET
        status = ${input.status},
        admin_reply = ${input.adminReply.trim().slice(0, 2000)},
        updated_at = NOW()
      WHERE id = ${input.feedbackId}
    `;

    revalidateTag(CACHE_TAGS.feedbacks);
    revalidatePath("/feedback");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lỗi cập nhật góp ý.",
    };
  }
}

export async function deleteFeedbackByAdminAction(
  feedbackId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUserProfile();
  if (!user || user.role !== "admin") {
    return { ok: false, error: "Chỉ Admin mới có quyền xóa góp ý." };
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT image_urls FROM public.feedbacks WHERE id = ${feedbackId} LIMIT 1
    `;
    const orphanUrls =
      rows.length > 0 && Array.isArray(rows[0].image_urls)
        ? (rows[0].image_urls as string[])
        : [];
    await sql`DELETE FROM public.feedbacks WHERE id = ${feedbackId}`;
    after(async () => {
      await deleteStorageImagesByUrls(orphanUrls);
    });
    revalidateTag(CACHE_TAGS.feedbacks);
    revalidatePath("/feedback");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể xóa mục này.",
    };
  }
}
