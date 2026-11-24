"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import {
  awardChallengeReplyTransaction,
  getCurrentUserProfile,
} from "@/lib/forum-service";
import { createNotification } from "@/lib/notifications";
import { broadcastThreadEventFromServer } from "@/lib/realtime-broadcast";
import { deleteStorageImagesByUrls } from "@/lib/storage-cleanup";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  POINT_ADJUSTMENT_SCOPE_LABELS,
  computeAdminPointAdjustment,
  isValidThreadType,
  parseClubJoinedDate,
  validateChallengeDeadline,
  validateRedemptionTransition,
  validateThreadAuthorReward,
  type PointAdjustmentScope,
  type RedemptionStatus,
} from "@/lib/rules";
import type { ThreadType } from "@/lib/types";

async function requireAdmin() {
  if (!isDatabaseConfigured()) {
    throw new Error("Chưa cấu hình kết nối cơ sở dữ liệu Supabase.");
  }
  const user = await getCurrentUserProfile();
  if (!user || user.role !== "admin") {
    throw new Error("Bạn không có quyền truy cập chức năng Quản trị viên.");
  }
  return user;
}

export async function saveSiteSettingsAction(input: {
  siteName: string;
  defaultSolvedPoints: number;
  announcement: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const points = Math.floor(Number(input.defaultSolvedPoints));
    if (!Number.isFinite(points) || points <= 0 || points > 1000) {
      return { ok: false, error: "Điểm thưởng mặc định phải từ 1 đến 1000." };
    }

    const sql = getSql();
    await sql`
      INSERT INTO public.site_settings (id, site_name, default_solved_points, announcement, updated_at)
      VALUES (1, ${input.siteName.trim() || "CMC"}, ${points}, ${input.announcement.trim()}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        site_name = EXCLUDED.site_name,
        default_solved_points = EXCLUDED.default_solved_points,
        announcement = EXCLUDED.announcement,
        updated_at = NOW()
    `;

    revalidateTag(CACHE_TAGS.siteSettings);
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi lưu cấu hình." };
  }
}

export async function upsertRewardAction(input: {
  id?: string;
  name: string;
  description: string;
  imageUrl: string | null;
  pointsCost: number;
  stock: number;
  isActive: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();

    const name = input.name.trim();
    const cost = Math.floor(Number(input.pointsCost));
    const stock = Math.floor(Number(input.stock));

    if (name.length < 2) {
      return { ok: false, error: "Tên quà tặng phải có ít nhất 2 ký tự." };
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      return { ok: false, error: "Mốc điểm đổi quà phải lớn hơn 0." };
    }
    if (!Number.isFinite(stock) || stock < 0) {
      return { ok: false, error: "Số lượng tồn kho không được âm." };
    }

    const sql = getSql();
    if (input.id) {
      await sql`
        UPDATE public.rewards
        SET
          name = ${name},
          description = ${input.description.trim()},
          image_url = ${input.imageUrl},
          points_cost = ${cost},
          stock = ${stock},
          is_active = ${input.isActive},
          updated_at = NOW()
        WHERE id = ${input.id}
      `;
    } else {
      await sql`
        INSERT INTO public.rewards (name, description, image_url, points_cost, stock, is_active)
        VALUES (${name}, ${input.description.trim()}, ${input.imageUrl}, ${cost}, ${stock}, ${input.isActive})
      `;
    }

    revalidateTag(CACHE_TAGS.rewards);
    revalidatePath("/rewards");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi lưu quà tặng." };
  }
}

export async function deleteRewardAction(
  rewardId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const sql = getSql();

    // Nếu quà đã có lịch sử đổi thì chuyển sang ẩn để giữ nguyên lịch sử đối soát
    const used = await sql`
      SELECT 1 FROM public.redemptions WHERE reward_id = ${rewardId} LIMIT 1
    `;
    if (used.length > 0) {
      await sql`
        UPDATE public.rewards SET is_active = FALSE, updated_at = NOW() WHERE id = ${rewardId}
      `;
    } else {
      await sql`DELETE FROM public.rewards WHERE id = ${rewardId}`;
    }

    revalidateTag(CACHE_TAGS.rewards);
    revalidatePath("/rewards");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Không thể xóa quà tặng." };
  }
}

export async function reviewRedemptionAction(input: {
  redemptionId: string;
  newStatus: "approved" | "fulfilled" | "rejected";
  adminNote: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    const sql = getSql();

    const reviewResult = await sql.begin(async (tx) => {
      const rows = await tx`
        SELECT rd.*, rw.name AS reward_name
        FROM public.redemptions rd
        JOIN public.rewards rw ON rw.id = rd.reward_id
        WHERE rd.id = ${input.redemptionId}
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw new Error("Không tìm thấy đơn đổi quà.");
      }

      const current = rows[0];
      const transition = validateRedemptionTransition(
        String(current.status) as RedemptionStatus,
        input.newStatus
      );
      if (!transition.ok) {
        throw new Error(transition.error);
      }

      const trimmedNote = input.adminNote.trim();
      const nextAdminNote =
        trimmedNote || String(current.admin_note ?? "").trim();

      // Nếu chuyển sang Từ chối -> tự động hoàn lại điểm cho học sinh & cộng trả lại kho!
      if (input.newStatus === "rejected") {
        const refundPoints = Number(current.points_spent);
        await tx`
          UPDATE public.profiles
          SET points_balance = points_balance + ${refundPoints}, updated_at = NOW()
          WHERE id = ${current.user_id}
        `;
        await tx`
          UPDATE public.rewards
          SET stock = stock + 1, updated_at = NOW()
          WHERE id = ${current.reward_id}
        `;
        await tx`
          INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id, created_by)
          VALUES (
            ${current.user_id},
            ${refundPoints},
            'reward_refund',
            ${`Hoàn điểm đơn đổi quà "${String(current.reward_name)}": ${nextAdminNote || "Đơn bị hủy"}`},
            ${current.id},
            ${admin.id}
          )
        `;
      }

      await tx`
        UPDATE public.redemptions
        SET status = ${input.newStatus}, admin_note = ${nextAdminNote}, updated_at = NOW()
        WHERE id = ${input.redemptionId}
      `;

      return {
        userId: String(current.user_id),
        rewardName: String(current.reward_name),
        pointsSpent: Number(current.points_spent),
        nextAdminNote,
      };
    });

    const notifTitle =
      input.newStatus === "fulfilled"
        ? `Đã hoàn thành trao quà "${reviewResult.rewardName}"`
        : input.newStatus === "approved"
          ? `Đơn đổi quà "${reviewResult.rewardName}" đã được duyệt`
          : `Đơn đổi quà "${reviewResult.rewardName}" bị từ chối (đã hoàn +${reviewResult.pointsSpent}đ)`;

    after(async () => {
      await createNotification({
        userId: reviewResult.userId,
        type: "redemption_update",
        title: notifTitle,
        body:
          reviewResult.nextAdminNote ||
          "Kiểm tra chi tiết tại trang Cửa hàng Đổi quà.",
        href: "/rewards",
      });
    });

    revalidateTag(CACHE_TAGS.rewards);
    revalidatePath("/admin");
    revalidatePath("/rewards");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xử lý đơn đổi quà." };
  }
}

export async function adjustStudentPointsAction(input: {
  studentId: string;
  deltaPoints: number;
  reason: string;
  scope?: PointAdjustmentScope;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    const delta = Math.trunc(Number(input.deltaPoints));
    const reason = input.reason.trim();

    if (!Number.isFinite(delta) || delta === 0) {
      return { ok: false, error: "Số điểm điều chỉnh phải khác 0." };
    }
    if (reason.length < 3) {
      return { ok: false, error: "Vui lòng ghi rõ lý do cộng/trừ điểm." };
    }

    const sql = getSql();
    await sql.begin(async (tx) => {
      const rows = await tx`
        SELECT points_balance, total_earned_points
        FROM public.profiles
        WHERE id = ${input.studentId}
        FOR UPDATE
      `;
      if (rows.length === 0) throw new Error("Không tìm thấy học sinh.");

      const calc = computeAdminPointAdjustment({
        currentBalance: Number(rows[0].points_balance ?? 0),
        currentEarned: Number(rows[0].total_earned_points ?? 0),
        deltaPoints: delta,
        scope: input.scope,
      });
      if (!calc.ok) {
        throw new Error(calc.error);
      }

      await tx`
        UPDATE public.profiles
        SET
          points_balance = ${calc.nextBalance},
          total_earned_points = ${calc.nextEarned},
          updated_at = NOW()
        WHERE id = ${input.studentId}
      `;

      const scopeSuffix =
        calc.scope === "both"
          ? ""
          : ` [${POINT_ADJUSTMENT_SCOPE_LABELS[calc.scope]}]`;

      await tx`
        INSERT INTO public.point_transactions (user_id, amount, type, reason, created_by)
        VALUES (
          ${input.studentId},
          ${calc.ledgerAmount},
          ${calc.ledgerAmount > 0 ? "admin_grant" : "admin_deduct"},
          ${`Admin điều chỉnh${scopeSuffix}: ${reason}`},
          ${admin.id}
        )
      `;
    });

    revalidateTag(CACHE_TAGS.leaderboard);
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    revalidatePath("/rewards");
    revalidatePath("/profile");
    revalidatePath(`/members/${input.studentId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi điều chỉnh điểm." };
  }
}

export async function toggleStudentBanAction(input: {
  studentId: string;
  isBanned: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (admin.id === input.studentId) {
      return { ok: false, error: "Bạn không thể tự khóa tài khoản của chính mình." };
    }

    const sql = getSql();
    await sql`
      UPDATE public.profiles
      SET is_banned = ${input.isBanned}, updated_at = NOW()
      WHERE id = ${input.studentId}
    `;

    revalidateTag(CACHE_TAGS.leaderboard);
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi cập nhật trạng thái học sinh." };
  }
}

export async function updateStudentJoinedAtAction(input: {
  studentId: string;
  joinedDate: string;
}): Promise<{ ok: boolean; joinedAt?: string; error?: string }> {
  try {
    await requireAdmin();
    const parsed = parseClubJoinedDate(input.joinedDate);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    const sql = getSql();
    const updated = await sql`
      UPDATE public.profiles
      SET joined_at = ${parsed.isoDate}::timestamptz, updated_at = NOW()
      WHERE id = ${input.studentId}
      RETURNING joined_at
    `;

    if (updated.length === 0) {
      return { ok: false, error: "Không tìm thấy hồ sơ học sinh cần cập nhật." };
    }

    revalidateTag(CACHE_TAGS.leaderboard);
    revalidatePath("/admin");
    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    return {
      ok: true,
      joinedAt: new Date(String(updated[0].joined_at)).toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể cập nhật ngày gia nhập câu lạc bộ.",
    };
  }
}

export async function resetStudentPasswordAction(input: {
  studentId: string;
  newPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (admin.id === input.studentId) {
      return {
        ok: false,
        error: "Để đổi mật khẩu của chính bạn, hãy dùng mục Đổi mật khẩu ở trang Hồ sơ.",
      };
    }

    const pwd = input.newPassword.trim();
    if (pwd.length < 6 || pwd.length > 72) {
      return {
        ok: false,
        error: "Mật khẩu mới cần có từ 6 đến 72 ký tự.",
      };
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, role FROM public.profiles WHERE id = ${input.studentId} LIMIT 1
    `;
    if (rows.length === 0) {
      return { ok: false, error: "Không tìm thấy tài khoản học sinh." };
    }
    if (rows[0].role === "admin") {
      return {
        ok: false,
        error: "Không thể đặt lại mật khẩu cho tài khoản Quản trị viên khác.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      input.studentId,
      { password: pwd }
    );
    if (error) {
      return {
        ok: false,
        error: error.message || "Không thể đặt lại mật khẩu.",
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Lỗi hệ thống khi đặt lại mật khẩu học sinh.",
    };
  }
}

export async function moderateThreadAction(input: {
  threadId: string;
  action:
    | "toggle_pin"
    | "toggle_close"
    | "delete"
    | "set_bounty"
    | "set_type"
    | "set_challenge_deadline";
  bountyPoints?: number;
  threadType?: ThreadType;
  challengeEndsAt?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const sql = getSql();

    if (input.action === "delete") {
      const [tRows, rRows] = await Promise.all([
        sql`SELECT image_urls FROM public.threads WHERE id = ${input.threadId}`,
        sql`SELECT image_urls FROM public.replies WHERE thread_id = ${input.threadId}`,
      ]);
      const orphanUrls: string[] = [];
      for (const row of [...tRows, ...rRows]) {
        if (Array.isArray(row.image_urls)) {
          orphanUrls.push(...(row.image_urls as string[]));
        }
      }
      await sql`DELETE FROM public.threads WHERE id = ${input.threadId}`;
      after(async () => {
        await deleteStorageImagesByUrls(orphanUrls);
      });
    } else if (input.action === "toggle_pin") {
      await sql`
        UPDATE public.threads SET is_pinned = NOT is_pinned, updated_at = NOW()
        WHERE id = ${input.threadId}
      `;
    } else if (input.action === "toggle_close") {
      await sql`
        UPDATE public.threads
        SET
          status = CASE
            WHEN status = 'closed' THEN (CASE WHEN accepted_reply_id IS NULL THEN 'open' ELSE 'solved' END)
            ELSE 'closed'
          END,
          updated_at = NOW()
        WHERE id = ${input.threadId}
      `;
    } else if (input.action === "set_bounty") {
      const pts = Math.floor(Number(input.bountyPoints ?? 10));
      if (!Number.isFinite(pts) || pts < 0 || pts > 1000) {
        return { ok: false, error: "Điểm thưởng lời giải cần nằm trong khoảng 0–1000." };
      }
      await sql`
        UPDATE public.threads SET bounty_points = ${pts}, updated_at = NOW()
        WHERE id = ${input.threadId} AND status = 'open'
      `;
    } else if (input.action === "set_type") {
      if (!isValidThreadType(input.threadType)) {
        return { ok: false, error: "Loại bài viết không hợp lệ." };
      }
      const nextDeadline =
        input.threadType === "challenge"
          ? input.challengeEndsAt ||
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null;
      await sql`
        UPDATE public.threads
        SET
          thread_type = ${input.threadType},
          challenge_ends_at = CASE
            WHEN ${input.threadType} = 'challenge' THEN COALESCE(challenge_ends_at, ${nextDeadline}::timestamptz)
            ELSE NULL
          END,
          updated_at = NOW()
        WHERE id = ${input.threadId}
      `;
    } else if (input.action === "set_challenge_deadline") {
      let nextIso: string | null = null;
      if (input.challengeEndsAt === "end_now") {
        nextIso = new Date().toISOString();
      } else if (input.challengeEndsAt) {
        const parsed = validateChallengeDeadline(input.challengeEndsAt);
        if (!parsed.ok) {
          return { ok: false, error: parsed.error };
        }
        nextIso = parsed.iso;
      }
      await sql`
        UPDATE public.threads
        SET challenge_ends_at = ${nextIso}::timestamptz, updated_at = NOW()
        WHERE id = ${input.threadId} AND thread_type = 'challenge'
      `;
    }

    revalidateTag(CACHE_TAGS.threads);
    revalidatePath(`/threads/${input.threadId}`);
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi quản trị bài đăng." };
  }
}

const THREAD_TYPE_LABELS: Record<ThreadType, string> = {
  question: "Hỏi bài",
  news: "News",
  research: "Research",
  challenge: "Thử thách",
};

/**
 * Admin chấm & trao thưởng lời giải đúng cho bài Thử thách Tuần (hỗ trợ nhiều người thắng cuộc).
 */
export async function awardChallengeReplyAction(
  threadId: string,
  replyId: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const admin = await requireAdmin();
    const res = await awardChallengeReplyTransaction({
      caller: admin,
      threadId,
      replyId,
    });

    after(async () => {
      await Promise.all([
        broadcastThreadEventFromServer({
          threadId,
          kind: "answer_accepted",
          senderId: admin.id,
          senderName: admin.displayName,
        }),
        createNotification({
          userId: res.solverId,
          type: "challenge_award",
          title: `Chúc mừng! Bài nộp Thử thách Tuần đạt đúng (+${res.awardedPoints}đ)`,
          body: res.threadTitle.slice(0, 120),
          href: `/threads/${threadId}`,
        }),
      ]);
    });

    revalidateTag(CACHE_TAGS.threads);
    revalidateTag(CACHE_TAGS.leaderboard);
    revalidatePath(`/threads/${threadId}`);
    revalidatePath("/");
    revalidatePath("/leaderboard");
    revalidatePath("/admin");

    return {
      ok: true,
      message: `Đã chấm đúng & trao +${res.awardedPoints} điểm Thử thách Tuần cho ${res.solverName}!`,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể chấm thưởng bài nộp thử thách.",
    };
  }
}

/**
 * Admin cộng điểm thưởng tùy chỉnh cho người tạo bài viết (đặc biệt hữu ích cho bài News, Research hoặc bài hỏi chất lượng).
 * Chạy nguyên tử trong 1 PostgreSQL Transaction và ghi đầy đủ vào sổ cái `point_transactions`.
 */
export async function awardThreadAuthorAction(input: {
  threadId: string;
  points: number;
  reason?: string;
}): Promise<{
  ok: boolean;
  message?: string;
  newAuthorRewardPoints?: number;
  error?: string;
}> {
  try {
    const admin = await requireAdmin();
    const pts = Math.trunc(Number(input.points));
    const note = input.reason?.trim().slice(0, 200) || "";
    const sql = getSql();

    const result = await sql.begin(async (tx) => {
      const rows = await tx`
        SELECT t.id, t.title, t.thread_type, t.author_id, t.author_reward_points,
               p.display_name AS author_name, p.is_banned AS author_banned
        FROM public.threads t
        JOIN public.profiles p ON p.id = t.author_id
        WHERE t.id = ${input.threadId}
        FOR UPDATE OF t, p
      `;

      if (rows.length === 0) {
        throw new Error("Không tìm thấy bài viết này.");
      }

      const row = rows[0];
      const check = validateThreadAuthorReward({
        callerRole: admin.role,
        points: pts,
        authorBanned: Boolean(row.author_banned),
      });
      if (!check.ok) {
        throw new Error(check.error);
      }

      const updatedThreads = await tx`
        UPDATE public.threads
        SET author_reward_points = author_reward_points + ${pts}, updated_at = NOW()
        WHERE id = ${row.id}
        RETURNING author_reward_points
      `;

      await tx`
        UPDATE public.profiles
        SET
          points_balance = points_balance + ${pts},
          total_earned_points = total_earned_points + ${pts},
          updated_at = NOW()
        WHERE id = ${row.author_id}
      `;

      const typeLabel =
        THREAD_TYPE_LABELS[
          (isValidThreadType(row.thread_type) ? row.thread_type : "question")
        ];
      const ledgerReason = note
        ? `Thưởng tác giả bài [${typeLabel}] "${String(row.title).slice(0, 60)}": ${note}`
        : `Admin thưởng tác giả bài [${typeLabel}] "${String(row.title).slice(0, 70)}"`;

      await tx`
        INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id, created_by)
        VALUES (
          ${row.author_id},
          ${pts},
          'admin_grant',
          ${ledgerReason},
          ${row.id},
          ${admin.id}
        )
      `;

      return {
        authorId: String(row.author_id),
        authorName: String(row.author_name),
        threadTitle: String(row.title),
        newTotal: Number(updatedThreads[0].author_reward_points),
      };
    });

    after(async () => {
      await createNotification({
        userId: result.authorId,
        type: "author_reward",
        title: `Admin thưởng +${pts} điểm cho bài viết của bạn`,
        body: note || `Bài "${result.threadTitle.slice(0, 80)}"`,
        href: `/threads/${input.threadId}`,
      });
    });

    revalidateTag(CACHE_TAGS.threads);
    revalidateTag(CACHE_TAGS.leaderboard);
    revalidatePath(`/threads/${input.threadId}`);
    revalidatePath("/admin");
    revalidatePath("/leaderboard");

    return {
      ok: true,
      newAuthorRewardPoints: result.newTotal,
      message: `Đã thưởng +${pts} điểm cho tác giả ${result.authorName} (tổng thưởng bài này: +${result.newTotal}đ)!`,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể cộng điểm thưởng cho tác giả.",
    };
  }
}

/**
 * Admin hủy trạng thái "Lời giải đúng" & thu hồi lại số điểm đã cộng nếu phát hiện buff điểm / lời giải không hợp lệ.
 * Toàn bộ thao tác chạy trong 1 Database Transaction nguyên tử và ghi sổ cái `point_transactions`.
 */
export async function revokeAcceptedReplyAction(input: {
  replyId: string;
  reason?: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const admin = await requireAdmin();
    const reasonText =
      input.reason?.trim().slice(0, 200) ||
      "Admin kiểm duyệt thu hồi lời giải đúng / nghi vấn buff điểm";
    const sql = getSql();

    const result = await sql.begin(async (tx) => {

      const replyRows = await tx`
        SELECT r.id, r.thread_id, r.author_id, r.is_accepted, t.title, t.bounty_points, t.status
        FROM public.replies r
        JOIN public.threads t ON t.id = r.thread_id
        WHERE r.id = ${input.replyId}
        FOR UPDATE OF r, t
      `;

      if (replyRows.length === 0) {
        throw new Error("Không tìm thấy bình luận này.");
      }

      const row = replyRows[0];
      if (!row.is_accepted) {
        throw new Error("Bình luận này hiện không phải là lời giải đã được cộng điểm.");
      }

      const txRows = await tx`
        SELECT amount
        FROM public.point_transactions
        WHERE reference_id = ${row.thread_id}
          AND user_id = ${row.author_id}
          AND type IN ('accepted_answer', 'challenge_reward')
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const pointsToRevoke = Math.max(
        0,
        Number(txRows[0]?.amount ?? row.bounty_points ?? 0)
      );

      await tx`
        UPDATE public.replies
        SET is_accepted = FALSE, updated_at = NOW()
        WHERE id = ${row.id}
      `;

      await tx`
        UPDATE public.threads
        SET
          accepted_reply_id = CASE WHEN accepted_reply_id = ${row.id} THEN NULL ELSE accepted_reply_id END,
          status = CASE
            WHEN accepted_reply_id = ${row.id} AND status <> 'closed' THEN 'open'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = ${row.thread_id}
      `;

      const profileRows = await tx`
        SELECT display_name, points_balance, total_earned_points
        FROM public.profiles
        WHERE id = ${row.author_id}
        FOR UPDATE
      `;

      const solverName = String(profileRows[0]?.display_name ?? "Học sinh");
      const currentBalance = Number(profileRows[0]?.points_balance ?? 0);
      const actualDeduct = Math.min(currentBalance, pointsToRevoke);

      await tx`
        UPDATE public.profiles
        SET
          points_balance = GREATEST(0, points_balance - ${pointsToRevoke}),
          total_earned_points = GREATEST(0, total_earned_points - ${pointsToRevoke}),
          solved_count = GREATEST(0, solved_count - 1),
          updated_at = NOW()
        WHERE id = ${row.author_id}
      `;

      if (pointsToRevoke > 0) {
        await tx`
          INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id, created_by)
          VALUES (
            ${row.author_id},
            ${-actualDeduct},
            'admin_deduct',
            ${`Thu hồi điểm lời giải bài "${String(row.title).slice(0, 60)}": ${reasonText}`},
            ${row.thread_id},
            ${admin.id}
          )
        `;
      }

      return {
        threadId: String(row.thread_id),
        solverName,
        pointsToRevoke,
      };
    });

    revalidateTag(CACHE_TAGS.threads);
    revalidateTag(CACHE_TAGS.leaderboard);
    revalidatePath(`/threads/${result.threadId}`);
    revalidatePath("/admin");
    revalidatePath("/leaderboard");

    return {
      ok: true,
      message: `Đã hủy lời giải đúng và thu hồi ${result.pointsToRevoke} điểm từ ${result.solverName}.`,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể thu hồi điểm của lời giải này.",
    };
  }
}

/**
 * Admin xóa bình luận vi phạm / spam / buff điểm (nếu bình luận đó đã từng được cộng điểm thì tự động thu hồi điểm luôn).
 */
export async function deleteReplyByAdminAction(input: {
  replyId: string;
  reason?: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const admin = await requireAdmin();
    const reasonText =
      input.reason?.trim().slice(0, 200) ||
      "Admin xóa bình luận vi phạm / nghi vấn buff điểm";
    const sql = getSql();

    const result = await sql.begin(async (tx) => {

      const replyRows = await tx`
        SELECT r.id, r.thread_id, r.author_id, r.is_accepted, r.image_urls, t.title, t.bounty_points
        FROM public.replies r
        JOIN public.threads t ON t.id = r.thread_id
        WHERE r.id = ${input.replyId}
        FOR UPDATE OF r, t
      `;

      if (replyRows.length === 0) {
        throw new Error("Không tìm thấy bình luận cần xóa.");
      }

      const row = replyRows[0];
      const childRows = await tx`
        SELECT id, author_id, is_accepted, image_urls
        FROM public.replies
        WHERE parent_reply_id = ${row.id}
        FOR UPDATE
      `;

      const affectedReplies = [
        {
          id: String(row.id),
          author_id: String(row.author_id),
          is_accepted: Boolean(row.is_accepted),
          image_urls: row.image_urls,
        },
        ...childRows.map((c) => ({
          id: String(c.id),
          author_id: String(c.author_id),
          is_accepted: Boolean(c.is_accepted),
          image_urls: c.image_urls,
        })),
      ];
      const deletedIds = affectedReplies.map((r) => r.id);
      const orphanUrls: string[] = [];
      let revokedPoints = 0;

      for (const target of affectedReplies) {
        if (Array.isArray(target.image_urls)) {
          orphanUrls.push(...(target.image_urls as string[]));
        }
        if (!target.is_accepted) continue;

        const txRows = await tx`
          SELECT amount
          FROM public.point_transactions
          WHERE reference_id = ${row.thread_id}
            AND user_id = ${target.author_id}
            AND type IN ('accepted_answer', 'challenge_reward')
          ORDER BY created_at DESC
          LIMIT 1
        `;
        const pts = Math.max(
          0,
          Number(txRows[0]?.amount ?? row.bounty_points ?? 0)
        );
        revokedPoints += pts;

        const profileRows = await tx`
          SELECT points_balance FROM public.profiles WHERE id = ${target.author_id} FOR UPDATE
        `;
        const actualDeduct = Math.min(
          Number(profileRows[0]?.points_balance ?? 0),
          pts
        );

        await tx`
          UPDATE public.profiles
          SET
            points_balance = GREATEST(0, points_balance - ${pts}),
            total_earned_points = GREATEST(0, total_earned_points - ${pts}),
            solved_count = GREATEST(0, solved_count - 1),
            updated_at = NOW()
          WHERE id = ${target.author_id}
        `;

        if (pts > 0) {
          await tx`
            INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id, created_by)
            VALUES (
              ${target.author_id},
              ${-actualDeduct},
              'admin_deduct',
              ${`Xóa bình luận & thu hồi điểm bài "${String(row.title).slice(0, 60)}": ${reasonText}`},
              ${row.thread_id},
              ${admin.id}
            )
          `;
        }
      }

      await tx`DELETE FROM public.replies WHERE id = ${row.id}`;

      await tx`
        UPDATE public.threads
        SET
          reply_count = (SELECT COUNT(*)::int FROM public.replies WHERE thread_id = ${row.thread_id}),
          accepted_reply_id = CASE WHEN accepted_reply_id = ANY(${sql.array(deletedIds)}::uuid[]) THEN NULL ELSE accepted_reply_id END,
          status = CASE
            WHEN accepted_reply_id = ANY(${sql.array(deletedIds)}::uuid[]) AND status <> 'closed' THEN 'open'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = ${row.thread_id}
      `;

      return {
        threadId: String(row.thread_id),
        revokedPoints,
        imageUrls: orphanUrls,
      };
    });

    after(async () => {
      await deleteStorageImagesByUrls(result.imageUrls);
    });

    revalidateTag(CACHE_TAGS.threads);
    revalidateTag(CACHE_TAGS.leaderboard);
    revalidatePath(`/threads/${result.threadId}`);
    revalidatePath("/admin");
    revalidatePath("/leaderboard");

    return {
      ok: true,
      message:
        result.revokedPoints > 0
          ? `Đã xóa bình luận và tự động thu hồi ${result.revokedPoints} điểm đã cộng!`
          : "Đã xóa bình luận khỏi chủ đề.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể xóa bình luận.",
    };
  }
}
