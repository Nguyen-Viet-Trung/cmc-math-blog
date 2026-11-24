import { unstable_cache } from "next/cache";
import { CACHE_TAGS, getUserBlocksCacheTag } from "./cache-tags";
import { getSql } from "./db";
import { isDatabaseConfigured } from "./env";
import { isFeatureEnabled } from "./feature-flags";
import {
  canViewReplyInChallenge,
  isChallengeBlindActive,
  normalizeThreadType,
} from "./rules";
import {
  evaluateRateLimitBoundary,
  isUserBlockMode,
  isValidUuidFormat,
  MAX_BLOCKED_USERS_PER_USER,
  USER_RATE_LIMITS,
  type RateLimitActionKind,
  type RateLimitBoundaryResult,
} from "./safety-rules";
import type {
  ReportReason,
  ReportTargetType,
  UserBlockMode,
} from "./types";

export {
  evaluateRateLimitBoundary,
  filterBlockedAuthors,
  isReportReason,
  isReportStatus,
  isReportTargetType,
  isUserBlockMode,
  MAX_BLOCKED_USERS_PER_USER,
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  REPORT_RESOLUTION_NOTE_MAX_LENGTH,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPE_LABELS,
  REPORT_TARGET_TYPES,
  USER_BLOCK_MODE_LABELS,
  USER_BLOCK_MODES,
  USER_RATE_LIMITS,
  validateContentReportInput,
  validateReportResolutionInput,
  type RateLimitActionKind,
  type RateLimitBoundaryResult,
  type UserRateLimitPolicy,
} from "./safety-rules";

/**
 * Giới hạn tần suất dựa trên PostgreSQL (Zero Redis) tận dụng trực tiếp
 * các chỉ mục `created_at` hiện có trên `threads`, `replies`, `content_reports`.
 */
export async function checkUserRateLimit(
  userId: string,
  kind: RateLimitActionKind
): Promise<RateLimitBoundaryResult & { error?: string }> {
  const policy = USER_RATE_LIMITS[kind];
  if (!isDatabaseConfigured() || !isValidUuidFormat(userId)) {
    return evaluateRateLimitBoundary(0, policy.max);
  }

  const sql = getSql();
  let rows;
  if (kind === "thread") {
    rows = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM public.threads
      WHERE author_id = ${userId}::uuid
        AND created_at > NOW() - make_interval(mins => ${policy.windowMinutes}::int)
    `;
  } else if (kind === "reply") {
    rows = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM public.replies
      WHERE author_id = ${userId}::uuid
        AND created_at > NOW() - make_interval(mins => ${policy.windowMinutes}::int)
    `;
  } else {
    rows = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM public.content_reports
      WHERE reporter_id = ${userId}::uuid
        AND created_at > NOW() - make_interval(mins => ${policy.windowMinutes}::int)
    `;
  }

  const count = Number(rows[0]?.cnt ?? 0);
  const boundary = evaluateRateLimitBoundary(count, policy.max);
  if (!boundary.allowed) {
    return {
      ...boundary,
      error: `Bạn đã đạt giới hạn an toàn (${policy.label}). Vui lòng thử lại sau.`,
    };
  }

  return boundary;
}

async function queryViewerBlockedUserIdsFromDb(
  viewerId: string
): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT blocked_id
    FROM public.user_blocks
    WHERE blocker_id = ${viewerId}::uuid
    ORDER BY created_at DESC
    LIMIT ${MAX_BLOCKED_USERS_PER_USER}
  `;
  return rows.map((r) => String(r.blocked_id));
}

export async function getViewerBlockedUserIds(
  viewerId: string | null | undefined
): Promise<Set<string>> {
  if (
    !isFeatureEnabled("communitySafety") ||
    !isDatabaseConfigured() ||
    !viewerId ||
    !isValidUuidFormat(viewerId)
  ) {
    return new Set();
  }

  const getCached = unstable_cache(
    async () => queryViewerBlockedUserIdsFromDb(viewerId),
    ["viewer-blocked-user-ids", viewerId],
    {
      revalidate: 60,
      tags: [CACHE_TAGS.userBlocks, getUserBlocksCacheTag(viewerId)],
    }
  );

  const ids = await getCached();
  return new Set(ids);
}

export async function getViewerBlockModeForTarget(
  viewerId: string | null | undefined,
  targetUserId: string
): Promise<UserBlockMode | null> {
  if (
    !isFeatureEnabled("communitySafety") ||
    !isDatabaseConfigured() ||
    !viewerId ||
    !isValidUuidFormat(viewerId) ||
    !isValidUuidFormat(targetUserId) ||
    viewerId === targetUserId
  ) {
    return null;
  }

  const sql = getSql();
  const rows = await sql`
    SELECT mode
    FROM public.user_blocks
    WHERE blocker_id = ${viewerId}::uuid
      AND blocked_id = ${targetUserId}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const rawMode = String(rows[0].mode ?? "");
  return isUserBlockMode(rawMode) ? rawMode : null;
}

export async function createContentReport(input: {
  reporterId: string;
  reporterRole: "student" | "admin";
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  detail: string;
}): Promise<{ ok: true; reportId: string } | { ok: false; error: string }> {
  const sql = getSql();
  const reportPolicy = USER_RATE_LIMITS.report;

  try {
    return await sql.begin(async (tx) => {
      // Khóa hàng profile người báo cáo để chống race-condition vượt ngưỡng 5 báo cáo / 24h
      await tx`
        SELECT id
        FROM public.profiles
        WHERE id = ${input.reporterId}::uuid
        FOR UPDATE
      `;

      const rateRows = await tx`
        SELECT COUNT(*)::int AS cnt
        FROM public.content_reports
        WHERE reporter_id = ${input.reporterId}::uuid
          AND created_at > NOW() - make_interval(mins => ${reportPolicy.windowMinutes}::int)
      `;
      const boundary = evaluateRateLimitBoundary(
        Number(rateRows[0]?.cnt ?? 0),
        reportPolicy.max
      );
      if (!boundary.allowed) {
        return {
          ok: false as const,
          error: `Bạn đã đạt giới hạn an toàn (${reportPolicy.label}). Vui lòng thử lại sau.`,
        };
      }

      if (input.targetType === "thread") {
        const rows = await tx`
          SELECT author_id FROM public.threads WHERE id = ${input.targetId}::uuid LIMIT 1
        `;
        if (rows.length === 0) {
          return {
            ok: false as const,
            error: "Không tìm thấy bài viết cần báo cáo.",
          };
        }
        if (String(rows[0].author_id) === input.reporterId) {
          return {
            ok: false as const,
            error: "Bạn không thể tự báo cáo bài viết của chính mình.",
          };
        }
      } else if (input.targetType === "reply") {
        const rows = await tx`
          SELECT
            r.author_id,
            r.parent_reply_id,
            p.role AS author_role,
            t.author_id AS thread_author_id,
            t.thread_type,
            t.status AS thread_status,
            t.challenge_ends_at,
            pr.author_id AS parent_author_id,
            pp.role AS parent_author_role
          FROM public.replies r
          JOIN public.profiles p ON p.id = r.author_id
          JOIN public.threads t ON t.id = r.thread_id
          LEFT JOIN public.replies pr ON pr.id = r.parent_reply_id
          LEFT JOIN public.profiles pp ON pp.id = pr.author_id
          WHERE r.id = ${input.targetId}::uuid
          LIMIT 1
        `;
        if (rows.length === 0) {
          return {
            ok: false as const,
            error: "Không tìm thấy bình luận cần báo cáo.",
          };
        }
        const row = rows[0];
        const threadType = normalizeThreadType(row.thread_type);
        const threadStatus =
          (row.thread_status as "open" | "solved" | "closed") ?? "open";
        const challengeEndsAt = row.challenge_ends_at
          ? new Date(String(row.challenge_ends_at)).toISOString()
          : null;
        const blindActive = isChallengeBlindActive(
          threadType,
          threadStatus,
          challengeEndsAt
        );
        const threadAuthorId = String(row.thread_author_id);
        const replyAuthorId = String(row.author_id);
        const replyAuthorRole: "student" | "admin" =
          row.author_role === "admin" ? "admin" : "student";

        const canSeeReply = canViewReplyInChallenge({
          isBlindActive: blindActive,
          viewerId: input.reporterId,
          viewerRole: input.reporterRole,
          threadAuthorId,
          replyAuthorId,
          replyAuthorRole,
        });
        const parentVisible =
          !blindActive ||
          !row.parent_reply_id ||
          (Boolean(row.parent_author_id) &&
            canViewReplyInChallenge({
              isBlindActive: true,
              viewerId: input.reporterId,
              viewerRole: input.reporterRole,
              threadAuthorId,
              replyAuthorId: String(row.parent_author_id),
              replyAuthorRole:
                row.parent_author_role === "admin" ? "admin" : "student",
            }));

        if (!canSeeReply || !parentVisible) {
          return {
            ok: false as const,
            error: "Không tìm thấy bình luận cần báo cáo.",
          };
        }
        if (replyAuthorId === input.reporterId) {
          return {
            ok: false as const,
            error: "Bạn không thể tự báo cáo bình luận của chính mình.",
          };
        }
      } else {
        if (input.targetId === input.reporterId) {
          return {
            ok: false as const,
            error: "Bạn không thể tự báo cáo chính mình.",
          };
        }
        const rows = await tx`
          SELECT id FROM public.profiles WHERE id = ${input.targetId}::uuid LIMIT 1
        `;
        if (rows.length === 0) {
          return {
            ok: false as const,
            error: "Không tìm thấy thành viên cần báo cáo.",
          };
        }
      }

      const inserted = await tx`
        INSERT INTO public.content_reports (
          reporter_id,
          target_type,
          target_id,
          reason,
          detail
        )
        VALUES (
          ${input.reporterId}::uuid,
          ${input.targetType},
          ${input.targetId}::uuid,
          ${input.reason},
          ${input.detail}
        )
        RETURNING id
      `;
      return { ok: true as const, reportId: String(inserted[0].id) };
    });
  } catch (err) {
    const pgCode =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    if (pgCode === "23505") {
      return {
        ok: false,
        error:
          "Bạn đã gửi báo cáo cho nội dung này và đang chờ Quản trị viên xử lý.",
      };
    }
    throw err;
  }
}

export async function toggleUserBlock(
  blockerId: string,
  blockedId: string,
  desiredMode?: UserBlockMode | null
): Promise<
  { ok: true; mode: UserBlockMode | null } | { ok: false; error: string }
> {
  if (!isValidUuidFormat(blockerId) || !isValidUuidFormat(blockedId)) {
    return { ok: false, error: "Mã thành viên không hợp lệ." };
  }
  if (blockerId === blockedId) {
    return { ok: false, error: "Bạn không thể tự ẩn hoặc chặn chính mình." };
  }

  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx`
      SELECT id
      FROM public.profiles
      WHERE id = ${blockerId}::uuid
      FOR UPDATE
    `;

    // Hủy ẩn/chặn tường minh (idempotent): không bao giờ tự bật lại mute nếu đã gỡ
    if (desiredMode === null) {
      await tx`
        DELETE FROM public.user_blocks
        WHERE blocker_id = ${blockerId}::uuid
          AND blocked_id = ${blockedId}::uuid
      `;
      return { ok: true as const, mode: null };
    }

    const [state] = await tx`
      SELECT
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = ${blockedId}::uuid
        ) AS target_exists,
        (
          SELECT mode
          FROM public.user_blocks
          WHERE blocker_id = ${blockerId}::uuid
            AND blocked_id = ${blockedId}::uuid
          LIMIT 1
        ) AS current_mode,
        (
          SELECT COUNT(*)::int
          FROM public.user_blocks
          WHERE blocker_id = ${blockerId}::uuid
        ) AS current_block_count
    `;

    if (!state?.target_exists) {
      return { ok: false as const, error: "Không tìm thấy thành viên này." };
    }

    const rawCurrentMode = state.current_mode ? String(state.current_mode) : "";
    const currentMode: UserBlockMode | null = isUserBlockMode(rawCurrentMode)
      ? rawCurrentMode
      : null;
    const currentBlockCount = Number(state.current_block_count ?? 0);

    if (desiredMode === undefined) {
      if (currentMode) {
        await tx`
          DELETE FROM public.user_blocks
          WHERE blocker_id = ${blockerId}::uuid
            AND blocked_id = ${blockedId}::uuid
        `;
        return { ok: true as const, mode: null };
      }
      if (currentBlockCount >= MAX_BLOCKED_USERS_PER_USER) {
        return {
          ok: false as const,
          error: `Bạn đã đạt giới hạn ẩn/chặn tối đa ${MAX_BLOCKED_USERS_PER_USER} thành viên.`,
        };
      }
      await tx`
        INSERT INTO public.user_blocks (blocker_id, blocked_id, mode)
        VALUES (${blockerId}::uuid, ${blockedId}::uuid, 'mute')
        ON CONFLICT (blocker_id, blocked_id)
        DO UPDATE SET mode = EXCLUDED.mode, created_at = NOW()
      `;
      return { ok: true as const, mode: "mute" as const };
    }

    if (currentMode === desiredMode) {
      await tx`
        DELETE FROM public.user_blocks
        WHERE blocker_id = ${blockerId}::uuid
          AND blocked_id = ${blockedId}::uuid
      `;
      return { ok: true as const, mode: null };
    }

    if (!currentMode && currentBlockCount >= MAX_BLOCKED_USERS_PER_USER) {
      return {
        ok: false as const,
        error: `Bạn đã đạt giới hạn ẩn/chặn tối đa ${MAX_BLOCKED_USERS_PER_USER} thành viên.`,
      };
    }

    await tx`
      INSERT INTO public.user_blocks (blocker_id, blocked_id, mode)
      VALUES (${blockerId}::uuid, ${blockedId}::uuid, ${desiredMode})
      ON CONFLICT (blocker_id, blocked_id)
      DO UPDATE SET mode = EXCLUDED.mode, created_at = NOW()
    `;

    if (desiredMode === "block") {
      await tx`
        DELETE FROM public.user_follows
        WHERE (follower_id = ${blockerId}::uuid AND following_id = ${blockedId}::uuid)
           OR (follower_id = ${blockedId}::uuid AND following_id = ${blockerId}::uuid)
      `;
    }

    return { ok: true as const, mode: desiredMode };
  });
}

export async function resolveContentReport(input: {
  reportId: string;
  adminId: string;
  status: "resolved" | "dismissed";
  resolutionNote: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sql = getSql();
  const rows = await sql`
    UPDATE public.content_reports
    SET
      status = ${input.status},
      resolved_by = ${input.adminId}::uuid,
      resolution_note = ${input.resolutionNote},
      resolved_at = NOW()
    WHERE id = ${input.reportId}::uuid
    RETURNING id
  `;
  if (rows.length === 0) {
    return { ok: false, error: "Không tìm thấy báo cáo cần xử lý." };
  }
  return { ok: true };
}
