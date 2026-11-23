"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCollectionInput } from "@/lib/rules";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_COLORS = new Set(["blue", "indigo", "emerald", "amber", "rose"]);

export async function toggleBookmarkAction(
  threadId: string
): Promise<{ ok: boolean; bookmarked?: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Chưa kết nối cơ sở dữ liệu." };
  }
  if (!UUID_REGEX.test(threadId)) {
    return { ok: false, error: "Mã bài viết không hợp lệ." };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập để lưu vào Sổ tay." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const rate = checkRateLimit(`bookmark:${user.id}`, {
    maxRequests: 40,
    windowMs: 5 * 60 * 1000,
  });
  if (!rate.allowed) {
    return {
      ok: false,
      error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
    };
  }

  try {
    const sql = getSql();
    const bookmarked = await sql.begin(async (rawTx) => {
      const tx = rawTx as unknown as ReturnType<typeof getSql>;
      const existing = await tx`
        SELECT 1 FROM public.thread_bookmarks
        WHERE user_id = ${user.id} AND thread_id = ${threadId}
      `;
      if (existing.length > 0) {
        await tx`
          DELETE FROM public.thread_bookmarks
          WHERE user_id = ${user.id} AND thread_id = ${threadId}
        `;
        return false;
      }
      const existsThread = await tx`
        SELECT 1 FROM public.threads WHERE id = ${threadId} LIMIT 1
      `;
      if (existsThread.length === 0) {
        throw new Error("Không tìm thấy bài viết cần lưu.");
      }
      await tx`
        INSERT INTO public.thread_bookmarks (user_id, thread_id)
        VALUES (${user.id}, ${threadId})
        ON CONFLICT (user_id, thread_id) DO NOTHING
      `;
      return true;
    });

    revalidatePath("/bookmarks");
    revalidatePath(`/threads/${threadId}`);
    return { ok: true, bookmarked };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể cập nhật sổ tay.",
    };
  }
}

async function requireAdmin() {
  if (!isDatabaseConfigured()) {
    throw new Error("Chưa kết nối cơ sở dữ liệu Supabase.");
  }
  const user = await getCurrentUserProfile();
  if (!user || user.role !== "admin") {
    throw new Error("Chỉ Quản trị viên mới có quyền quản lý Bộ sưu tập Chuyên đề.");
  }
  return user;
}

export async function upsertCollectionAction(input: {
  id?: string;
  title: string;
  slug?: string;
  description: string;
  coverColor: string;
  isPublished: boolean;
}): Promise<{ ok: boolean; id?: string; slug?: string; error?: string }> {
  try {
    const admin = await requireAdmin();
    const check = validateCollectionInput({
      title: input.title,
      slug: input.slug,
      description: input.description,
    });
    if (!check.ok) {
      return { ok: false, error: check.error };
    }
    const coverColor = ALLOWED_COLORS.has(input.coverColor)
      ? input.coverColor
      : "blue";

    const sql = getSql();
    let savedId: string;

    if (input.id) {
      if (!UUID_REGEX.test(input.id)) {
        return { ok: false, error: "Mã bộ sưu tập không hợp lệ." };
      }
      const rows = await sql`
        UPDATE public.collections
        SET
          title = ${check.title},
          slug = ${check.slug},
          description = ${check.description},
          cover_color = ${coverColor},
          is_published = ${input.isPublished},
          updated_at = NOW()
        WHERE id = ${input.id}
        RETURNING id
      `;
      if (rows.length === 0) {
        return { ok: false, error: "Không tìm thấy bộ sưu tập cần cập nhật." };
      }
      savedId = String(rows[0].id);
    } else {
      const rows = await sql`
        INSERT INTO public.collections (slug, title, description, cover_color, is_published, created_by)
        VALUES (${check.slug}, ${check.title}, ${check.description}, ${coverColor}, ${input.isPublished}, ${admin.id})
        RETURNING id
      `;
      savedId = String(rows[0].id);
    }

    revalidateTag(CACHE_TAGS.collections);
    revalidatePath("/collections");
    revalidatePath(`/collections/${check.slug}`);
    revalidatePath("/admin");
    return { ok: true, id: savedId, slug: check.slug };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("duplicate") || msg.includes("unique")) {
      return {
        ok: false,
        error: "Đường dẫn (slug) này đã tồn tại. Vui lòng đổi tên hoặc slug khác.",
      };
    }
    return { ok: false, error: msg || "Không thể lưu bộ sưu tập chuyên đề." };
  }
}

export async function deleteCollectionAction(
  collectionId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!UUID_REGEX.test(collectionId)) {
      return { ok: false, error: "Mã bộ sưu tập không hợp lệ." };
    }
    const sql = getSql();
    await sql`DELETE FROM public.collections WHERE id = ${collectionId}`;
    revalidateTag(CACHE_TAGS.collections);
    revalidatePath("/collections");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể xóa bộ sưu tập.",
    };
  }
}

export async function addThreadToCollectionAction(input: {
  collectionId: string;
  threadId: string;
  sortOrder?: number;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!UUID_REGEX.test(input.collectionId) || !UUID_REGEX.test(input.threadId)) {
      return { ok: false, error: "Mã bộ sưu tập hoặc bài viết không hợp lệ." };
    }
    const sortOrder = Number.isFinite(Number(input.sortOrder))
      ? Math.max(0, Math.min(999, Math.trunc(Number(input.sortOrder))))
      : 0;
    const note = (input.note ?? "").trim().slice(0, 200);

    const sql = getSql();
    await sql`
      INSERT INTO public.collection_threads (collection_id, thread_id, sort_order, note)
      VALUES (${input.collectionId}, ${input.threadId}, ${sortOrder}, ${note})
      ON CONFLICT (collection_id, thread_id) DO UPDATE SET
        sort_order = EXCLUDED.sort_order,
        note = EXCLUDED.note
    `;
    await sql`
      UPDATE public.collections SET updated_at = NOW() WHERE id = ${input.collectionId}
    `;

    revalidateTag(CACHE_TAGS.collections);
    revalidatePath("/collections");
    revalidatePath(`/threads/${input.threadId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể thêm bài vào chuyên đề.",
    };
  }
}

export async function removeThreadFromCollectionAction(input: {
  collectionId: string;
  threadId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!UUID_REGEX.test(input.collectionId) || !UUID_REGEX.test(input.threadId)) {
      return { ok: false, error: "Mã bộ sưu tập hoặc bài viết không hợp lệ." };
    }
    const sql = getSql();
    await sql`
      DELETE FROM public.collection_threads
      WHERE collection_id = ${input.collectionId} AND thread_id = ${input.threadId}
    `;
    await sql`
      UPDATE public.collections SET updated_at = NOW() WHERE id = ${input.collectionId}
    `;

    revalidateTag(CACHE_TAGS.collections);
    revalidatePath("/collections");
    revalidatePath(`/threads/${input.threadId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể gỡ bài khỏi chuyên đề.",
    };
  }
}
