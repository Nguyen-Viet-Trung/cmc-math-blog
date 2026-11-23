"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import {
  acceptReplyTransaction,
  getCurrentUserProfile,
  getSiteSettings,
} from "@/lib/forum-service";
import { createNotification } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { broadcastThreadEventFromServer } from "@/lib/realtime-broadcast";
import {
  normalizeThreadType,
  validateReplyAuthorMutation,
  validateThreadAuthorMutation,
} from "@/lib/rules";
import { deleteStorageImagesByUrls } from "@/lib/storage-cleanup";
import type { ThreadType } from "@/lib/types";

export async function createThreadAction(input: {
  title: string;
  categoryId: number;
  gradeTag: string;
  threadType?: ThreadType;
  content: string;
  imageUrls: string[];
}): Promise<{ ok: boolean; threadId?: string; error?: string }> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu. Vui lòng thử lại sau.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để đăng câu hỏi." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const rate = checkRateLimit(`thread:${user.id}`, {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rate.allowed) {
    return {
      ok: false,
      error: `Bạn đăng bài quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
    };
  }

  const title = input.title.trim();
  const content = input.content.trim();
  if (title.length < 8 || title.length > 200) {
    return { ok: false, error: "Tiêu đề bài toán cần từ 8 đến 200 ký tự." };
  }
  if (content.length < 10 && input.imageUrls.length === 0) {
    return {
      ok: false,
      error: "Vui lòng nhập nội dung đề bài hoặc đính kèm ít nhất 1 ảnh đề bài.",
    };
  }
  if (input.imageUrls.length > 6) {
    return { ok: false, error: "Mỗi bài đăng tối đa 6 hình ảnh." };
  }

  try {
    const settings = await getSiteSettings();
    const sql = getSql();
    const threadType = normalizeThreadType(input.threadType);
    const initialBounty =
      threadType === "question" ? settings.defaultSolvedPoints : 0;

    const rows = await sql`
      INSERT INTO public.threads (
        author_id,
        category_id,
        title,
        content,
        image_urls,
        grade_tag,
        thread_type,
        bounty_points
      )
      VALUES (
        ${user.id},
        ${input.categoryId},
        ${title},
        ${content || "(Xem nội dung trong hình ảnh đính kèm)"},
        ${sql.array(input.imageUrls)},
        ${input.gradeTag.trim() || "Chung"},
        ${threadType},
        ${initialBounty}
      )
      RETURNING id
    `;

    const threadId = String(rows[0].id);
    revalidateTag(CACHE_TAGS.threads);
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true, threadId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể tạo bài đăng.",
    };
  }
}

export async function createReplyAction(input: {
  threadId: string;
  content: string;
  imageUrls: string[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu. Vui lòng thử lại sau.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để gửi lời giải." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const rate = checkRateLimit(`reply:${user.id}`, {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!rate.allowed) {
    return {
      ok: false,
      error: `Bạn gửi bình luận quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
    };
  }

  const content = input.content.trim();
  if (content.length < 3 && input.imageUrls.length === 0) {
    return {
      ok: false,
      error: "Vui lòng nhập lời giải hoặc đính kèm ảnh chụp bài giải.",
    };
  }
  if (input.imageUrls.length > 6) {
    return { ok: false, error: "Mỗi lời giải đính kèm tối đa 6 hình ảnh." };
  }

  try {
    const sql = getSql();
    const threadMeta = await sql.begin(async (rawTx) => {
      const tx = rawTx as unknown as ReturnType<typeof getSql>;
      const threads = await tx`
        SELECT status, author_id, title FROM public.threads WHERE id = ${input.threadId} FOR UPDATE
      `;
      if (threads.length === 0) {
        throw new Error("Không tìm thấy bài toán.");
      }
      if (threads[0].status === "closed") {
        throw new Error("Chủ đề này đã đóng thảo luận.");
      }

      await tx`
        INSERT INTO public.replies (thread_id, author_id, content, image_urls)
        VALUES (
          ${input.threadId},
          ${user.id},
          ${content || "(Xem lời giải chi tiết trong hình ảnh đính kèm)"},
          ${sql.array(input.imageUrls)}
        )
      `;

      await tx`
        UPDATE public.threads
        SET reply_count = reply_count + 1, updated_at = NOW()
        WHERE id = ${input.threadId}
      `;

      return {
        authorId: String(threads[0].author_id),
        title: String(threads[0].title),
      };
    });

    if (threadMeta.authorId !== user.id) {
      void createNotification({
        userId: threadMeta.authorId,
        type: "new_reply",
        title: `${user.displayName} vừa bình luận bài viết của bạn`,
        body: threadMeta.title.slice(0, 120),
        href: `/threads/${input.threadId}`,
      });
    }

    void broadcastThreadEventFromServer({
      threadId: input.threadId,
      kind: "new_reply",
      senderName: user.displayName,
    });
    revalidateTag(CACHE_TAGS.threads);
    revalidatePath(`/threads/${input.threadId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể gửi lời giải.",
    };
  }
}

export async function acceptReplyAction(
  threadId: string,
  replyId: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Chưa kết nối cơ sở dữ liệu." };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập để chọn lời giải đúng." };
  }

  try {
    const res = await acceptReplyTransaction({
      caller: user,
      threadId,
      replyId,
    });

    void broadcastThreadEventFromServer({
      threadId,
      kind: "answer_accepted",
      senderName: user.displayName,
    });
    void createNotification({
      userId: res.solverId,
      type: "answer_accepted",
      title: `Lời giải của bạn được chọn đúng (+${res.awardedPoints} điểm)`,
      body: res.threadTitle.slice(0, 120),
      href: `/threads/${threadId}`,
    });
    revalidateTag(CACHE_TAGS.threads);
    revalidateTag(CACHE_TAGS.leaderboard);
    revalidatePath(`/threads/${threadId}`);
    revalidatePath("/");
    revalidatePath("/leaderboard");
    return {
      ok: true,
      message: `Đã chọn lời giải đúng! Hệ thống đã tự động cộng +${res.awardedPoints} điểm cho ${res.solverName}.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lỗi khi xác nhận lời giải đúng.",
    };
  }
}

export async function toggleUpvoteReplyAction(
  threadId: string,
  replyId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Chưa kết nối cơ sở dữ liệu." };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập để bấm cảm ơn lời giải." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  try {
    const sql = getSql();
    await sql.begin(async (rawTx) => {
      const tx = rawTx as unknown as ReturnType<typeof getSql>;
      const existing = await tx`
        SELECT 1 FROM public.reply_upvotes
        WHERE reply_id = ${replyId} AND user_id = ${user.id}
      `;

      if (existing.length > 0) {
        await tx`
          DELETE FROM public.reply_upvotes
          WHERE reply_id = ${replyId} AND user_id = ${user.id}
        `;
        await tx`
          UPDATE public.replies
          SET upvotes_count = GREATEST(0, upvotes_count - 1)
          WHERE id = ${replyId}
        `;
      } else {
        await tx`
          INSERT INTO public.reply_upvotes (reply_id, user_id)
          VALUES (${replyId}, ${user.id})
        `;
        await tx`
          UPDATE public.replies
          SET upvotes_count = upvotes_count + 1
          WHERE id = ${replyId}
        `;
      }
    });

    revalidatePath(`/threads/${threadId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể cập nhật lượt cảm ơn.",
    };
  }
}

export async function updateThreadAction(input: {
  threadId: string;
  title: string;
  gradeTag: string;
  content: string;
  imageUrls: string[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu." };
  }
  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập để chỉnh sửa bài viết." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const rate = checkRateLimit(`thread:${user.id}`, {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rate.allowed) {
    return {
      ok: false,
      error: `Bạn đăng bài quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
    };
  }

  const title = input.title.trim();
  const content = input.content.trim();
  if (title.length < 8 || title.length > 200) {
    return { ok: false, error: "Tiêu đề bài viết cần từ 8 đến 200 ký tự." };
  }
  if (content.length < 10 && input.imageUrls.length === 0) {
    return {
      ok: false,
      error: "Vui lòng nhập nội dung hoặc đính kèm ít nhất 1 hình ảnh.",
    };
  }
  if (input.imageUrls.length > 6) {
    return { ok: false, error: "Mỗi bài đăng tối đa 6 hình ảnh." };
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT author_id, status, accepted_reply_id
      FROM public.threads
      WHERE id = ${input.threadId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return { ok: false, error: "Không tìm thấy bài viết." };
    }
    const row = rows[0];
    const check = validateThreadAuthorMutation({
      callerId: user.id,
      callerRole: user.role,
      threadAuthorId: String(row.author_id),
      threadStatus: String(row.status) as "open" | "solved" | "closed",
      acceptedReplyId: row.accepted_reply_id
        ? String(row.accepted_reply_id)
        : null,
      action: "edit",
    });
    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    await sql`
      UPDATE public.threads
      SET
        title = ${title},
        grade_tag = ${input.gradeTag.trim().slice(0, 30) || "Chung"},
        content = ${content || "(Xem nội dung trong hình ảnh đính kèm)"},
        image_urls = ${sql.array(input.imageUrls)},
        updated_at = NOW()
      WHERE id = ${input.threadId}
    `;

    revalidateTag(CACHE_TAGS.threads);
    revalidatePath(`/threads/${input.threadId}`);
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể cập nhật bài viết.",
    };
  }
}

export async function deleteOwnThreadAction(
  threadId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu." };
  }
  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập để xóa bài viết." };
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT author_id, status, accepted_reply_id
      FROM public.threads
      WHERE id = ${threadId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return { ok: false, error: "Không tìm thấy bài viết." };
    }
    const row = rows[0];
    const check = validateThreadAuthorMutation({
      callerId: user.id,
      callerRole: user.role,
      threadAuthorId: String(row.author_id),
      threadStatus: String(row.status) as "open" | "solved" | "closed",
      acceptedReplyId: row.accepted_reply_id
        ? String(row.accepted_reply_id)
        : null,
      action: "delete",
    });
    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    const [tRows, rRows] = await Promise.all([
      sql`SELECT image_urls FROM public.threads WHERE id = ${threadId}`,
      sql`SELECT image_urls FROM public.replies WHERE thread_id = ${threadId}`,
    ]);
    const orphanUrls: string[] = [];
    for (const item of [...tRows, ...rRows]) {
      if (Array.isArray(item.image_urls)) {
        orphanUrls.push(...(item.image_urls as string[]));
      }
    }

    await sql`DELETE FROM public.threads WHERE id = ${threadId}`;
    void deleteStorageImagesByUrls(orphanUrls);

    revalidateTag(CACHE_TAGS.threads);
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể xóa bài viết.",
    };
  }
}

export async function updateReplyAction(input: {
  replyId: string;
  content: string;
  imageUrls: string[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu." };
  }
  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập để chỉnh sửa bình luận." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const rate = checkRateLimit(`reply:${user.id}`, {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!rate.allowed) {
    return {
      ok: false,
      error: `Bạn gửi bình luận quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
    };
  }

  const content = input.content.trim();
  if (content.length < 3 && input.imageUrls.length === 0) {
    return {
      ok: false,
      error: "Vui lòng nhập nội dung hoặc đính kèm ảnh chụp bài giải.",
    };
  }
  if (input.imageUrls.length > 6) {
    return { ok: false, error: "Mỗi bình luận đính kèm tối đa 6 hình ảnh." };
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT r.id, r.thread_id, r.author_id, r.is_accepted, t.status AS thread_status
      FROM public.replies r
      JOIN public.threads t ON t.id = r.thread_id
      WHERE r.id = ${input.replyId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return { ok: false, error: "Không tìm thấy bình luận." };
    }
    const row = rows[0];
    const check = validateReplyAuthorMutation({
      callerId: user.id,
      callerRole: user.role,
      replyAuthorId: String(row.author_id),
      isAccepted: Boolean(row.is_accepted),
      threadStatus: String(row.thread_status) as "open" | "solved" | "closed",
    });
    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    await sql`
      UPDATE public.replies
      SET
        content = ${content || "(Xem lời giải chi tiết trong hình ảnh đính kèm)"},
        image_urls = ${sql.array(input.imageUrls)},
        updated_at = NOW()
      WHERE id = ${input.replyId}
    `;

    const threadId = String(row.thread_id);
    void broadcastThreadEventFromServer({
      threadId,
      kind: "moderated",
      senderName: user.displayName,
    });
    revalidatePath(`/threads/${threadId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể cập nhật bình luận.",
    };
  }
}

export async function deleteOwnReplyAction(
  replyId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu." };
  }
  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập để xóa bình luận." };
  }

  try {
    const sql = getSql();
    const deleted = await sql.begin(async (rawTx) => {
      const tx = rawTx as unknown as ReturnType<typeof getSql>;
      const rows = await tx`
        SELECT r.id, r.thread_id, r.author_id, r.is_accepted, r.image_urls, t.status AS thread_status
        FROM public.replies r
        JOIN public.threads t ON t.id = r.thread_id
        WHERE r.id = ${replyId}
        FOR UPDATE OF r, t
      `;
      if (rows.length === 0) {
        throw new Error("Không tìm thấy bình luận.");
      }
      const row = rows[0];
      const check = validateReplyAuthorMutation({
        callerId: user.id,
        callerRole: user.role,
        replyAuthorId: String(row.author_id),
        isAccepted: Boolean(row.is_accepted),
        threadStatus: String(row.thread_status) as "open" | "solved" | "closed",
      });
      if (!check.ok) {
        throw new Error(check.error);
      }

      await tx`DELETE FROM public.replies WHERE id = ${replyId}`;
      await tx`
        UPDATE public.threads
        SET reply_count = GREATEST(0, reply_count - 1)
        WHERE id = ${row.thread_id}
      `;
      return {
        threadId: String(row.thread_id),
        imageUrls: Array.isArray(row.image_urls)
          ? (row.image_urls as string[])
          : [],
      };
    });

    void deleteStorageImagesByUrls(deleted.imageUrls);
    void broadcastThreadEventFromServer({
      threadId: deleted.threadId,
      kind: "moderated",
      senderName: user.displayName,
    });
    revalidateTag(CACHE_TAGS.threads);
    revalidatePath(`/threads/${deleted.threadId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể xóa bình luận.",
    };
  }
}
