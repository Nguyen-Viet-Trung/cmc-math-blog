"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/forum-service";
import {
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
} from "@/lib/pagination";
import type {
  FeedbackCategory,
  FeedbackItem,
  FeedbackStatus,
} from "@/lib/types";

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

export async function listPublicFeedbacks(): Promise<FeedbackItem[]> {
  const res = await listPublicFeedbacksPaginated({ page: 1, pageSize: 50 });
  return res.items;
}

export async function listPublicFeedbacksPaginated(params: {
  page?: number;
  pageSize?: number;
  category?: FeedbackCategory | "all";
} = {}): Promise<PaginatedResult<FeedbackItem>> {
  const { page, pageSize, offset } = normalizePagination(
    params.page,
    params.pageSize,
    8
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const catFilter =
    params.category && params.category !== "all" ? params.category : null;
  const sql = getSql();
  const rows = await sql`
    SELECT
      f.id,
      f.user_id,
      COALESCE(p.display_name, NULLIF(f.contact_name, ''), 'Học sinh ẩn danh') AS author_name,
      f.category,
      f.title,
      f.description,
      f.page_url,
      f.image_urls,
      f.status,
      f.admin_reply,
      f.created_at,
      COUNT(*) OVER()::int AS total_count
    FROM public.feedbacks f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    WHERE (${catFilter}::text IS NULL OR f.category = ${catFilter})
    ORDER BY f.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const items: FeedbackItem[] = rows
    .filter((r) => Boolean(r.id && r.title))
    .map((r) => ({
      id: String(r.id),
      userId: r.user_id ? String(r.user_id) : null,
      authorName: String(r.author_name ?? "Học sinh"),
      category: ALLOWED_CATEGORIES.includes(r.category as FeedbackCategory)
        ? (r.category as FeedbackCategory)
        : "bug",
      title: String(r.title),
      description: String(r.description ?? ""),
      pageUrl: String(r.page_url ?? ""),
      imageUrls: Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [],
      status: ALLOWED_STATUSES.includes(r.status as FeedbackStatus)
        ? (r.status as FeedbackStatus)
        : "open",
      adminReply: String(r.admin_reply ?? ""),
      createdAt: new Date(String(r.created_at)).toISOString(),
    }));

  return buildPaginatedResult(items, totalCount, page, pageSize);
}

export async function listAllFeedbacksForAdmin(): Promise<FeedbackItem[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        f.*,
        COALESCE(p.display_name, NULLIF(f.contact_name, ''), 'Khách') AS author_name,
        COALESCE(p.email, f.contact_email, '') AS resolved_email
      FROM public.feedbacks f
      LEFT JOIN public.profiles p ON p.id = f.user_id
      ORDER BY
        CASE
          WHEN f.status = 'open' THEN 0
          WHEN f.status = 'in_progress' THEN 1
          ELSE 2
        END,
        f.created_at DESC
      LIMIT 100
    `;

    return rows.map((r) => ({
      id: String(r.id),
      userId: r.user_id ? String(r.user_id) : null,
      authorName: String(r.author_name),
      contactEmail: String(r.resolved_email ?? ""),
      category: (r.category as FeedbackCategory) ?? "bug",
      title: String(r.title),
      description: String(r.description),
      pageUrl: String(r.page_url ?? ""),
      imageUrls: Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [],
      status: (r.status as FeedbackStatus) ?? "open",
      adminReply: String(r.admin_reply ?? ""),
      createdAt: new Date(String(r.created_at)).toISOString(),
    }));
  } catch {
    return [];
  }
}

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
    await sql`DELETE FROM public.feedbacks WHERE id = ${feedbackId}`;
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
