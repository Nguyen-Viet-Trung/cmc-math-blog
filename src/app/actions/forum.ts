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
import { broadcastThreadEventFromServer } from "@/lib/realtime-broadcast";
import { normalizeThreadType } from "@/lib/rules";
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
      error: "Đang ở chế độ xem trước. Hãy điền key vào key.txt và chạy `npm run setup` để đăng bài thật nhé!",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để đăng câu hỏi." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
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
      error: "Đang ở chế độ xem trước. Hãy điền key vào key.txt và chạy `npm run setup`.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để gửi lời giải." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
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
    await sql.begin(async (rawTx) => {
      const tx = rawTx as unknown as ReturnType<typeof getSql>;
      const threads = await tx`
        SELECT status FROM public.threads WHERE id = ${input.threadId} FOR UPDATE
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
    });

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
