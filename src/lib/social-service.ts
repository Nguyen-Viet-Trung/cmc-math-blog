import { unstable_cache } from "next/cache";
import { CACHE_TAGS, getMemberFollowsCacheTag } from "./cache-tags";
import { getSql } from "./db";
import { isDatabaseConfigured } from "./env";
import { isFeatureEnabled } from "./feature-flags";
import type { MemberFollowSummary } from "./types";

export const MAX_FOLLOWING_PER_USER = 200;

/**
 * Ngưỡng tối đa cho phép fan-out thông báo theo dõi.
 * Sprint 1B không fan-out thông báo khi đăng bài; toàn bộ luồng theo dõi
 * sẽ đọc kiểu pull-based ở Activity Feed (Sprint 1C) để tránh write storm.
 */
export const MAX_FOLLOW_FANOUT_THRESHOLD = 30;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FollowValidationInput {
  followerId: string;
  targetUserId: string;
  targetExists: boolean;
  targetIsBanned: boolean;
  isBlockedBetween: boolean;
  currentFollowingCount: number;
  alreadyFollowing: boolean;
}

export type FollowValidationResult =
  | { ok: true; action: "follow" | "unfollow" }
  | { ok: false; error: string };

export function isValidUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

export function validateFollowAttempt(
  input: FollowValidationInput
): FollowValidationResult {
  if (!isValidUuid(input.followerId) || !isValidUuid(input.targetUserId)) {
    return { ok: false, error: "Mã thành viên không hợp lệ." };
  }

  if (input.followerId === input.targetUserId) {
    return { ok: false, error: "Bạn không thể tự theo dõi chính mình." };
  }

  // Luôn cho phép hủy theo dõi (ngay cả khi đang chạm giới hạn hoặc đối phương bị khóa)
  if (input.alreadyFollowing) {
    return { ok: true, action: "unfollow" };
  }

  if (!input.targetExists) {
    return { ok: false, error: "Không tìm thấy thành viên này." };
  }

  if (input.targetIsBanned) {
    return {
      ok: false,
      error: "Tài khoản này đang bị tạm khóa nên không thể theo dõi.",
    };
  }

  if (input.isBlockedBetween) {
    return {
      ok: false,
      error:
        "Không thể theo dõi do đang có thiết lập ẩn/chặn giữa hai tài khoản.",
    };
  }

  if (input.currentFollowingCount >= MAX_FOLLOWING_PER_USER) {
    return {
      ok: false,
      error: `Bạn đã đạt giới hạn theo dõi tối đa ${MAX_FOLLOWING_PER_USER} thành viên.`,
    };
  }

  return { ok: true, action: "follow" };
}

async function queryPublicMemberFollowCountsFromDb(
  memberId: string
): Promise<{ followersCount: number; followingCount: number }> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM public.user_follows WHERE following_id = ${memberId}::uuid) AS followers_count,
      (SELECT COUNT(*)::int FROM public.user_follows WHERE follower_id = ${memberId}::uuid) AS following_count
  `;
  const row = rows[0] ?? {};
  return {
    followersCount: Number(row.followers_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
  };
}

export async function getMemberFollowSummary(
  memberId: string,
  viewerId?: string | null
): Promise<MemberFollowSummary> {
  if (
    !isFeatureEnabled("followSystem") ||
    !isDatabaseConfigured() ||
    !isValidUuid(memberId)
  ) {
    return {
      followersCount: 0,
      followingCount: 0,
      viewerIsFollowing: false,
    };
  }

  const safeViewerId = viewerId && isValidUuid(viewerId) ? viewerId : null;
  if (!safeViewerId) {
    const getCachedCounts = unstable_cache(
      async () => queryPublicMemberFollowCountsFromDb(memberId),
      ["public-member-follow-counts", memberId],
      {
        revalidate: 30,
        tags: [CACHE_TAGS.follows, getMemberFollowsCacheTag(memberId)],
      }
    );
    const counts = await getCachedCounts();
    return {
      followersCount: counts.followersCount,
      followingCount: counts.followingCount,
      viewerIsFollowing: false,
    };
  }

  const sql = getSql();
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM public.user_follows WHERE following_id = ${memberId}::uuid) AS followers_count,
      (SELECT COUNT(*)::int FROM public.user_follows WHERE follower_id = ${memberId}::uuid) AS following_count,
      EXISTS (
        SELECT 1
        FROM public.user_follows
        WHERE follower_id = ${safeViewerId}::uuid
          AND following_id = ${memberId}::uuid
      ) AS viewer_is_following
  `;

  const row = rows[0] ?? {};
  return {
    followersCount: Number(row.followers_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
    viewerIsFollowing: Boolean(row.viewer_is_following),
  };
}

export async function toggleUserFollow(
  followerId: string,
  targetUserId: string
): Promise<
  | { ok: true; following: boolean; followersCount: number }
  | { ok: false; error: string }
> {
  if (!isValidUuid(followerId) || !isValidUuid(targetUserId)) {
    return { ok: false, error: "Mã thành viên không hợp lệ." };
  }

  if (followerId === targetUserId) {
    return { ok: false, error: "Bạn không thể tự theo dõi chính mình." };
  }

  const sql = getSql();

  return sql.begin(async (tx) => {
    // Khóa hàng follower để tránh race-condition vượt ngưỡng 200 following
    await tx`
      SELECT id FROM public.profiles
      WHERE id = ${followerId}::uuid
      FOR UPDATE
    `;

    // Gom 4 kiểm tra đọc thành 1 truy vấn duy nhất để giảm RTT dưới khóa FOR UPDATE.
    // Chỉ chặn chiều ngược lại khi đối phương thực sự "block" (không tiết lộ "mute" riêng tư).
    const [state] = await tx`
      SELECT
        EXISTS (
          SELECT 1
          FROM public.user_follows
          WHERE follower_id = ${followerId}::uuid
            AND following_id = ${targetUserId}::uuid
        ) AS already_following,
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = ${targetUserId}::uuid
        ) AS target_exists,
        COALESCE(
          (
            SELECT is_banned
            FROM public.profiles
            WHERE id = ${targetUserId}::uuid
            LIMIT 1
          ),
          FALSE
        ) AS target_is_banned,
        EXISTS (
          SELECT 1
          FROM public.user_blocks
          WHERE (blocker_id = ${followerId}::uuid AND blocked_id = ${targetUserId}::uuid)
             OR (blocker_id = ${targetUserId}::uuid AND blocked_id = ${followerId}::uuid AND mode = 'block')
        ) AS is_blocked_between,
        (
          SELECT COUNT(*)::int
          FROM public.user_follows
          WHERE follower_id = ${followerId}::uuid
        ) AS current_following_count
    `;

    const validation = validateFollowAttempt({
      followerId,
      targetUserId,
      targetExists: Boolean(state?.target_exists),
      targetIsBanned: Boolean(state?.target_is_banned),
      isBlockedBetween: Boolean(state?.is_blocked_between),
      currentFollowingCount: Number(state?.current_following_count ?? 0),
      alreadyFollowing: Boolean(state?.already_following),
    });

    if (!validation.ok) {
      return validation;
    }

    if (validation.action === "unfollow") {
      await tx`
        DELETE FROM public.user_follows
        WHERE follower_id = ${followerId}::uuid
          AND following_id = ${targetUserId}::uuid
      `;
    } else {
      await tx`
        INSERT INTO public.user_follows (follower_id, following_id)
        VALUES (${followerId}::uuid, ${targetUserId}::uuid)
        ON CONFLICT (follower_id, following_id) DO NOTHING
      `;
    }

    const updatedCountRows = await tx`
      SELECT COUNT(*)::int AS cnt
      FROM public.user_follows
      WHERE following_id = ${targetUserId}::uuid
    `;

    return {
      ok: true as const,
      following: validation.action === "follow",
      followersCount: Number(updatedCountRows[0]?.cnt ?? 0),
    };
  });
}
