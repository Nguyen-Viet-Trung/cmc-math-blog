import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { evaluateAndGrantCampaignAwardsTx } from "./campaign-service";
import { getSql } from "./db";
import {
  getFallbackDefaultPoints,
  getFallbackSiteName,
  isAdminEmail,
  isDatabaseConfigured,
  isSupabaseAuthConfigured,
} from "./env";
import { normalizeNotificationPrefs } from "./notification-prefs";
import {
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
} from "./pagination";
import {
  filterVisibleChallengeReplies,
  isChallengeBlindActive,
  normalizeThreadType,
  validateAcceptAnswer,
  validateChallengeAward,
  validateRewardRedemption,
} from "./rules";
import {
  createSupabaseServerClient,
  hasSupabaseAuthCookie,
} from "./supabase/server";
import type {
  AdminReplyAuditItem,
  Category,
  HomeThreadStatusFilter,
  PaginatedThreadsResult,
  PointTransactionItem,
  PublicLeaderboardEntry,
  PublicMemberProfile,
  RedemptionItem,
  ReplyItem,
  RewardItem,
  SiteSettings,
  ThreadDetail,
  ThreadDiscussionSnapshot,
  ThreadSummary,
  ThreadType,
  UnlockedCampaignAwardSummary,
  UserProfile,
} from "./types";

function mapProfileRow(row: Record<string, unknown>): UserProfile {
  const createdAt = new Date(String(row.created_at)).toISOString();
  const joinedAt = row.joined_at
    ? new Date(String(row.joined_at)).toISOString()
    : createdAt;
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    nickname: String(row.nickname ?? ""),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    bio: String(row.bio ?? ""),
    gradeLevel: String(row.grade_level ?? "THPT"),
    role: row.role === "admin" ? "admin" : "student",
    pointsBalance: Number(row.points_balance ?? 0),
    totalEarnedPoints: Number(row.total_earned_points ?? 0),
    solvedCount: Number(row.solved_count ?? 0),
    isBanned: Boolean(row.is_banned),
    notificationPrefs: normalizeNotificationPrefs(row.notification_prefs),
    joinedAt,
    createdAt,
  };
}

interface VerifiedAuthClaims {
  userId: string;
  email: string | null;
  userMeta: Record<string, unknown>;
}

/**
 * Xác thực JWT duy nhất 1 lần mỗi request (bọc trong React `cache()`),
 * chia sẻ chung cho cả `getCurrentUserId()` và `getCurrentUserProfile()` để tránh verify JWT 2 lần.
 */
const getVerifiedAuthClaims = cache(
  async (): Promise<VerifiedAuthClaims | null> => {
    if (!isSupabaseAuthConfigured()) {
      return null;
    }
    if (!(await hasSupabaseAuthCookie())) {
      return null;
    }
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    if (typeof supabase.auth.getClaims === "function") {
      const { data: claimsData, error: claimsErr } =
        await supabase.auth.getClaims();
      if (!claimsErr && claimsData?.claims?.sub) {
        const claims = claimsData.claims as Record<string, unknown>;
        return {
          userId: String(claims.sub),
          email: typeof claims.email === "string" ? claims.email : null,
          userMeta:
            typeof claims.user_metadata === "object" &&
            claims.user_metadata !== null
              ? (claims.user_metadata as Record<string, unknown>)
              : {},
        };
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email ?? null,
      userMeta: (user.user_metadata as Record<string, unknown>) ?? {},
    };
  }
);

/**
 * Trích xuất nhanh `userId` từ JWT cookie cục bộ (< 1ms, KHÔNG truy vấn PostgreSQL).
 * Dùng cho các API read-only và để phá waterfall khi gọi song song với `getCurrentUserProfile()`.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const claims = await getVerifiedAuthClaims();
  return claims?.userId ?? null;
});

/**
 * Lấy thông tin user đang đăng nhập và tự động đồng bộ vào bảng `profiles`
 * (bọc trong React `cache()` để chỉ thực thi tối đa 1 lần cho cả Layout & Page trong cùng 1 request)
 */
export const getCurrentUserProfile = cache(
  async (): Promise<UserProfile | null> => {
    if (!isSupabaseAuthConfigured() || !isDatabaseConfigured()) {
      return null;
    }

    const claims = await getVerifiedAuthClaims();
    if (!claims) return null;

    let userId = claims.userId;
    let userEmail = claims.email;
    let userMeta = claims.userMeta;

    if (!userEmail) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) return null;
      userId = user.id;
      userEmail = user.email;
      userMeta = (user.user_metadata as Record<string, unknown>) ?? {};
    }

    const sql = getSql();
    const shouldBeAdmin = isAdminEmail(userEmail);

    const existing = await sql`
      SELECT * FROM public.profiles WHERE id = ${userId} LIMIT 1
    `;

    if (existing.length > 0) {
      const profile = mapProfileRow(existing[0]);
      if (shouldBeAdmin && profile.role !== "admin") {
        const promoted = await sql`
          UPDATE public.profiles
          SET role = 'admin', updated_at = NOW()
          WHERE id = ${userId}
          RETURNING *
        `;
        return mapProfileRow(promoted[0]);
      }
      return profile;
    }

    const metaName =
      (typeof userMeta.display_name === "string" &&
        userMeta.display_name.trim()) ||
      (typeof userMeta.full_name === "string" && userMeta.full_name.trim()) ||
      userEmail.split("@")[0];

    const metaGrade =
      (typeof userMeta.grade_level === "string" &&
        userMeta.grade_level.trim()) ||
      "THPT";

    const inserted = await sql`
      INSERT INTO public.profiles (id, email, display_name, grade_level, role)
      VALUES (
        ${userId},
        ${userEmail.toLowerCase()},
        ${metaName},
        ${metaGrade},
        ${shouldBeAdmin ? "admin" : "student"}
      )
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;

    return mapProfileRow(inserted[0]);
  }
);

function getDefaultSiteSettings(): SiteSettings {
  return {
    siteName: getFallbackSiteName(),
    defaultSolvedPoints: getFallbackDefaultPoints(),
    announcement: "",
  };
}

const getCachedSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const sql = getSql();
    const rows =
      await sql`SELECT * FROM public.site_settings WHERE id = 1 LIMIT 1`;
    if (rows.length === 0) {
      return getDefaultSiteSettings();
    }
    return {
      siteName: String(rows[0].site_name),
      defaultSolvedPoints: Number(rows[0].default_solved_points),
      announcement: String(rows[0].announcement ?? ""),
    };
  },
  ["forum-site-settings"],
  { revalidate: 120, tags: [CACHE_TAGS.siteSettings] }
);

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!isDatabaseConfigured()) {
    return getDefaultSiteSettings();
  }
  return getCachedSiteSettings();
});

const getCachedCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM public.categories ORDER BY sort_order ASC, id ASC
    `;
    return rows.map((r) => ({
      id: Number(r.id),
      slug: String(r.slug),
      name: String(r.name),
      description: String(r.description ?? ""),
      color: String(r.color ?? "blue"),
      sortOrder: Number(r.sort_order ?? 0),
    }));
  },
  ["forum-categories"],
  { revalidate: 300, tags: [CACHE_TAGS.categories] }
);

export async function getCategories(): Promise<Category[]> {
  if (!isDatabaseConfigured()) return [];
  return getCachedCategories();
}

export interface ListThreadsFilter {
  categorySlug?: string;
  status?: HomeThreadStatusFilter;
  threadType?: ThreadType | "all";
  query?: string;
}

const DEFAULT_PAGE_SIZE = 20;

async function queryThreadsPaginatedFromDb(
  catSlug: string | null,
  statusFilter: string | null,
  typeFilter: string | null,
  searchPattern: string | null,
  page: number,
  pageSize: number
): Promise<PaginatedThreadsResult> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  const offset = (safePage - 1) * safeSize;
  const sql = getSql();
  const isUnansweredOnly = statusFilter === "unanswered";

  const fetchRows = (off: number) =>
    isUnansweredOnly
      ? sql`
          SELECT
            t.id,
            t.title,
            LEFT(t.content, 200) AS content_preview,
            COALESCE(array_length(t.image_urls, 1), 0) AS image_count,
            t.grade_tag,
            t.thread_type,
            t.challenge_ends_at,
            t.bounty_points,
            t.author_reward_points,
            t.status,
            t.accepted_reply_id,
            t.is_pinned,
            t.view_count,
            t.reply_count,
            t.created_at,
            p.id AS author_id,
            p.display_name AS author_name,
            p.nickname AS author_nickname,
            p.avatar_url AS author_avatar,
            p.grade_level AS author_grade,
            p.role AS author_role,
            c.id AS category_id,
            c.slug AS category_slug,
            c.name AS category_name,
            c.color AS category_color,
            COUNT(*) OVER()::int AS total_count
          FROM public.threads t
          JOIN public.profiles p ON p.id = t.author_id
          JOIN public.categories c ON c.id = t.category_id
          WHERE t.thread_type = 'question'
            AND t.status = 'open'
            AND t.reply_count = 0
            AND (${catSlug}::text IS NULL OR c.slug = ${catSlug})
            AND (${typeFilter}::text IS NULL OR t.thread_type = ${typeFilter})
            AND (
              ${searchPattern}::text IS NULL
              OR t.title ILIKE ${searchPattern}
              OR t.content ILIKE ${searchPattern}
            )
          ORDER BY t.is_pinned DESC, t.created_at DESC
          LIMIT ${safeSize}
          OFFSET ${off}
        `
      : sql`
          SELECT
            t.id,
            t.title,
            LEFT(t.content, 200) AS content_preview,
            COALESCE(array_length(t.image_urls, 1), 0) AS image_count,
            t.grade_tag,
            t.thread_type,
            t.challenge_ends_at,
            t.bounty_points,
            t.author_reward_points,
            t.status,
            t.accepted_reply_id,
            t.is_pinned,
            t.view_count,
            t.reply_count,
            t.created_at,
            p.id AS author_id,
            p.display_name AS author_name,
            p.nickname AS author_nickname,
            p.avatar_url AS author_avatar,
            p.grade_level AS author_grade,
            p.role AS author_role,
            c.id AS category_id,
            c.slug AS category_slug,
            c.name AS category_name,
            c.color AS category_color,
            COUNT(*) OVER()::int AS total_count
          FROM public.threads t
          JOIN public.profiles p ON p.id = t.author_id
          JOIN public.categories c ON c.id = t.category_id
          WHERE (${catSlug}::text IS NULL OR c.slug = ${catSlug})
            AND (${statusFilter}::text IS NULL OR t.status = ${statusFilter})
            AND (${typeFilter}::text IS NULL OR t.thread_type = ${typeFilter})
            AND (
              ${searchPattern}::text IS NULL
              OR t.title ILIKE ${searchPattern}
              OR t.content ILIKE ${searchPattern}
            )
          ORDER BY t.is_pinned DESC, t.created_at DESC
          LIMIT ${safeSize}
          OFFSET ${off}
        `;

  let effectivePage = safePage;
  let rows = await fetchRows(offset);
  let totalCount =
    rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;

  if (rows.length === 0 && safePage > 1) {
    const countRows = isUnansweredOnly
      ? await sql`
          SELECT COUNT(*)::int AS total_count
          FROM public.threads t
          JOIN public.categories c ON c.id = t.category_id
          WHERE t.thread_type = 'question'
            AND t.status = 'open'
            AND t.reply_count = 0
            AND (${catSlug}::text IS NULL OR c.slug = ${catSlug})
            AND (${typeFilter}::text IS NULL OR t.thread_type = ${typeFilter})
            AND (
              ${searchPattern}::text IS NULL
              OR t.title ILIKE ${searchPattern}
              OR t.content ILIKE ${searchPattern}
            )
        `
      : await sql`
          SELECT COUNT(*)::int AS total_count
          FROM public.threads t
          JOIN public.categories c ON c.id = t.category_id
          WHERE (${catSlug}::text IS NULL OR c.slug = ${catSlug})
            AND (${statusFilter}::text IS NULL OR t.status = ${statusFilter})
            AND (${typeFilter}::text IS NULL OR t.thread_type = ${typeFilter})
            AND (
              ${searchPattern}::text IS NULL
              OR t.title ILIKE ${searchPattern}
              OR t.content ILIKE ${searchPattern}
            )
        `;
    totalCount = Number(countRows[0]?.total_count ?? 0);
    if (totalCount > 0) {
      effectivePage = Math.max(1, Math.ceil(totalCount / safeSize));
      rows = await fetchRows((effectivePage - 1) * safeSize);
    } else {
      effectivePage = 1;
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / safeSize));

  const items: ThreadSummary[] = rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    contentPreview: String(r.content_preview ?? ""),
    imageCount: Number(r.image_count ?? 0),
    gradeTag: String(r.grade_tag ?? "Chung"),
    threadType: normalizeThreadType(r.thread_type),
    challengeEndsAt: r.challenge_ends_at
      ? new Date(String(r.challenge_ends_at)).toISOString()
      : null,
    bountyPoints: Number(r.bounty_points ?? 10),
    authorRewardPoints: Number(r.author_reward_points ?? 0),
    status: (r.status as "open" | "solved" | "closed") ?? "open",
    acceptedReplyId: r.accepted_reply_id ? String(r.accepted_reply_id) : null,
    isPinned: Boolean(r.is_pinned),
    viewCount: Number(r.view_count ?? 0),
    replyCount: Number(r.reply_count ?? 0),
    createdAt: new Date(String(r.created_at)).toISOString(),
    author: {
      id: String(r.author_id),
      displayName: String(r.author_name),
      nickname: String(r.author_nickname ?? ""),
      avatarUrl: r.author_avatar ? String(r.author_avatar) : null,
      gradeLevel: String(r.author_grade ?? "THPT"),
      role: r.author_role === "admin" ? "admin" : "student",
    },
    category: {
      id: Number(r.category_id),
      slug: String(r.category_slug),
      name: String(r.category_name),
      color: String(r.category_color ?? "blue"),
    },
  }));

  return {
    items,
    totalCount,
    page: effectivePage,
    pageSize: safeSize,
    totalPages,
  };
}

const getCachedThreadsPaginated = unstable_cache(
  async (
    catSlug: string | null,
    statusFilter: string | null,
    typeFilter: string | null,
    page: number,
    pageSize: number
  ) =>
    queryThreadsPaginatedFromDb(
      catSlug,
      statusFilter,
      typeFilter,
      null,
      page,
      pageSize
    ),
  ["forum-threads-paginated"],
  { revalidate: 30, tags: [CACHE_TAGS.threads] }
);

export async function listThreadsPaginated(
  filter: ListThreadsFilter & { page?: number; pageSize?: number } = {}
): Promise<PaginatedThreadsResult> {
  const page = Math.max(1, Math.floor(filter.page ?? 1));
  const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!isDatabaseConfigured()) {
    return { items: [], totalCount: 0, page, pageSize, totalPages: 1 };
  }

  const searchPattern = filter.query?.trim()
    ? `%${filter.query.trim()}%`
    : null;
  const catSlug = filter.categorySlug?.trim() || null;
  const statusFilter =
    filter.status && filter.status !== "all" ? filter.status : null;
  const typeFilter =
    filter.threadType && filter.threadType !== "all" ? filter.threadType : null;

  if (!searchPattern) {
    return getCachedThreadsPaginated(
      catSlug,
      statusFilter,
      typeFilter,
      page,
      pageSize
    );
  }

  return queryThreadsPaginatedFromDb(
    catSlug,
    statusFilter,
    typeFilter,
    searchPattern,
    page,
    pageSize
  );
}

const getCachedMemberSeoMeta = unstable_cache(
  async (
    memberId: string
  ): Promise<{
    displayName: string;
    nickname: string;
    solvedCount: number;
    totalEarnedPoints: number;
  } | null> => {
    const sql = getSql();
    const rows = await sql`
      SELECT display_name, nickname, solved_count, total_earned_points
      FROM public.profiles
      WHERE id = ${memberId} AND is_banned = FALSE
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const p = rows[0];
    return {
      displayName: String(p.display_name),
      nickname: String(p.nickname ?? ""),
      solvedCount: Number(p.solved_count ?? 0),
      totalEarnedPoints: Number(p.total_earned_points ?? 0),
    };
  },
  ["forum-member-seo-meta"],
  { revalidate: 60, tags: [CACHE_TAGS.leaderboard] }
);

export const getMemberSeoMeta = cache(
  async (
    memberId: string
  ): Promise<{
    displayName: string;
    nickname: string;
    solvedCount: number;
    totalEarnedPoints: number;
  } | null> => {
    if (!isDatabaseConfigured() || !UUID_REGEX.test(memberId)) {
      return null;
    }
    return getCachedMemberSeoMeta(memberId);
  }
);

const getCachedPublicMemberProfile = unstable_cache(
  async (
    memberId: string,
    page: number,
    pageSize: number
  ): Promise<
    (PublicMemberProfile & { threadsPage: number; threadsTotalPages: number }) | null
  > => {
    const offset = (page - 1) * pageSize;
    const sql = getSql();
    const [profileRows, countRows, threadRows] = await Promise.all([
      sql`
      SELECT id, display_name, nickname, avatar_url, bio, grade_level, role,
             total_earned_points, solved_count, joined_at, created_at
      FROM public.profiles
      WHERE id = ${memberId} AND is_banned = FALSE
      LIMIT 1
    `,
      sql`
      SELECT
        (SELECT COUNT(*)::int FROM public.threads WHERE author_id = ${memberId}) AS threads_count,
        (SELECT COUNT(*)::int FROM public.replies WHERE author_id = ${memberId}) AS replies_count
    `,
      sql`
      SELECT
        t.id, t.title, LEFT(t.content, 200) AS content_preview,
        COALESCE(array_length(t.image_urls, 1), 0) AS image_count,
        t.grade_tag, t.thread_type, t.challenge_ends_at, t.bounty_points, t.author_reward_points,
        t.status, t.accepted_reply_id, t.is_pinned, t.view_count, t.reply_count, t.created_at,
        c.id AS category_id, c.slug AS category_slug, c.name AS category_name, c.color AS category_color
      FROM public.threads t
      JOIN public.categories c ON c.id = t.category_id
      WHERE t.author_id = ${memberId}
      ORDER BY t.created_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `,
    ]);

    if (profileRows.length === 0) return null;
    const p = profileRows[0];
    const createdAt = new Date(String(p.created_at)).toISOString();
    const joinedAt = p.joined_at
      ? new Date(String(p.joined_at)).toISOString()
      : createdAt;
    const threadsCount = Number(countRows[0]?.threads_count ?? 0);
    const threadsTotalPages = Math.max(1, Math.ceil(threadsCount / pageSize));
    const clampedPage = Math.min(page, threadsTotalPages);
    let resolvedThreadRows = threadRows;
    if (resolvedThreadRows.length === 0 && page > threadsTotalPages && threadsCount > 0) {
      resolvedThreadRows = await sql`
      SELECT
        t.id, t.title, LEFT(t.content, 200) AS content_preview,
        COALESCE(array_length(t.image_urls, 1), 0) AS image_count,
        t.grade_tag, t.thread_type, t.challenge_ends_at, t.bounty_points, t.author_reward_points,
        t.status, t.accepted_reply_id, t.is_pinned, t.view_count, t.reply_count, t.created_at,
        c.id AS category_id, c.slug AS category_slug, c.name AS category_name, c.color AS category_color
      FROM public.threads t
      JOIN public.categories c ON c.id = t.category_id
      WHERE t.author_id = ${memberId}
      ORDER BY t.created_at DESC
      LIMIT ${pageSize}
      OFFSET ${(clampedPage - 1) * pageSize}
    `;
    }

    const authorSummary = {
      id: String(p.id),
      displayName: String(p.display_name),
      nickname: String(p.nickname ?? ""),
      avatarUrl: p.avatar_url ? String(p.avatar_url) : null,
      gradeLevel: String(p.grade_level ?? "THPT"),
      role: (p.role === "admin" ? "admin" : "student") as "admin" | "student",
    };

    return {
      id: authorSummary.id,
      displayName: authorSummary.displayName,
      nickname: authorSummary.nickname,
      avatarUrl: authorSummary.avatarUrl,
      bio: String(p.bio ?? ""),
      gradeLevel: authorSummary.gradeLevel,
      role: authorSummary.role,
      totalEarnedPoints: Number(p.total_earned_points ?? 0),
      solvedCount: Number(p.solved_count ?? 0),
      joinedAt,
      threadsCount,
      repliesCount: Number(countRows[0]?.replies_count ?? 0),
      threadsPage: clampedPage,
      threadsTotalPages,
      recentThreads: resolvedThreadRows.map((r) => ({
        id: String(r.id),
        title: String(r.title),
        contentPreview: String(r.content_preview ?? ""),
        imageCount: Number(r.image_count ?? 0),
        gradeTag: String(r.grade_tag ?? "Chung"),
        threadType: normalizeThreadType(r.thread_type),
        challengeEndsAt: r.challenge_ends_at
          ? new Date(String(r.challenge_ends_at)).toISOString()
          : null,
        bountyPoints: Number(r.bounty_points ?? 10),
        authorRewardPoints: Number(r.author_reward_points ?? 0),
        status: (r.status as "open" | "solved" | "closed") ?? "open",
        acceptedReplyId: r.accepted_reply_id ? String(r.accepted_reply_id) : null,
        isPinned: Boolean(r.is_pinned),
        viewCount: Number(r.view_count ?? 0),
        replyCount: Number(r.reply_count ?? 0),
        createdAt: new Date(String(r.created_at)).toISOString(),
        author: authorSummary,
        category: {
          id: Number(r.category_id),
          slug: String(r.category_slug),
          name: String(r.category_name),
          color: String(r.category_color ?? "blue"),
        },
      })),
    };
  },
  ["forum-public-member-profile"],
  { revalidate: 60, tags: [CACHE_TAGS.leaderboard, CACHE_TAGS.threads] }
);

/**
 * Hồ sơ công khai của một thành viên (KHÔNG trả về email hay số dư điểm khả dụng để bảo vệ quyền riêng tư)
 */
export const getPublicMemberProfile = cache(
  async (
    memberId: string,
    pageRaw = 1,
    pageSizeRaw = 10
  ): Promise<
    (PublicMemberProfile & { threadsPage: number; threadsTotalPages: number }) | null
  > => {
    if (!isDatabaseConfigured() || !UUID_REGEX.test(memberId)) {
      return null;
    }

    const { page, pageSize } = normalizePagination(pageRaw, pageSizeRaw, 10);
    return getCachedPublicMemberProfile(memberId, page, pageSize);
  }
);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Truy vấn siêu nhẹ cho `generateMetadata` (SEO & thẻ xem trước Zalo/Facebook)
 * mà KHÔNG làm tăng `view_count`.
 */
const getCachedThreadSeoMeta = unstable_cache(
  async (
    threadId: string
  ): Promise<{
    title: string;
    excerpt: string;
    categoryName: string;
    authorName: string;
    threadType: ThreadType;
  } | null> => {
    const sql = getSql();
    const rows = await sql`
      SELECT
        t.title,
        LEFT(t.content, 180) AS excerpt,
        t.thread_type,
        c.name AS category_name,
        p.display_name AS author_name
      FROM public.threads t
      JOIN public.categories c ON c.id = t.category_id
      JOIN public.profiles p ON p.id = t.author_id
      WHERE t.id = ${threadId}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      title: String(r.title),
      excerpt: String(r.excerpt ?? "").replace(/\s+/g, " ").trim(),
      categoryName: String(r.category_name),
      authorName: String(r.author_name),
      threadType: normalizeThreadType(r.thread_type),
    };
  },
  ["forum-thread-seo-meta"],
  { revalidate: 60, tags: [CACHE_TAGS.threads] }
);

export const getThreadSeoMeta = cache(
  async (
    threadId: string
  ): Promise<{
    title: string;
    excerpt: string;
    categoryName: string;
    authorName: string;
    threadType: ThreadType;
  } | null> => {
    if (!isDatabaseConfigured() || !UUID_REGEX.test(threadId)) {
      return null;
    }
    return getCachedThreadSeoMeta(threadId);
  }
);

export async function incrementThreadViewCount(
  threadId: string
): Promise<boolean> {
  if (!isDatabaseConfigured() || !UUID_REGEX.test(threadId)) {
    return false;
  }
  const sql = getSql();
  const rows = await sql`
    UPDATE public.threads
    SET view_count = view_count + 1
    WHERE id = ${threadId}
    RETURNING id
  `;
  return rows.length > 0;
}

async function queryThreadDetailFromDb(
  threadId: string,
  viewerId: string | null
): Promise<ThreadDetail | null> {
  const sql = getSql();
  const [threadRows, replyRows, collectionRows] = await Promise.all([
    sql`
      SELECT
        t.*,
        p.id AS author_id_ref,
        p.display_name AS author_name,
        p.nickname AS author_nickname,
        p.avatar_url AS author_avatar,
        p.grade_level AS author_grade,
        p.role AS author_role,
        c.id AS cat_id_ref,
        c.slug AS cat_slug,
        c.name AS cat_name,
        c.color AS cat_color,
        (tb.thread_id IS NOT NULL) AS viewer_bookmarked,
        vp.role AS viewer_role
      FROM public.threads t
      JOIN public.profiles p ON p.id = t.author_id
      JOIN public.categories c ON c.id = t.category_id
      LEFT JOIN public.thread_bookmarks tb
        ON tb.thread_id = t.id
       AND tb.user_id = ${viewerId}::uuid
      LEFT JOIN public.profiles vp
        ON vp.id = ${viewerId}::uuid
      WHERE t.id = ${threadId}
      LIMIT 1
    `,
    sql`
      SELECT
        r.*,
        p.display_name AS author_name,
        p.nickname AS author_nickname,
        p.avatar_url AS author_avatar,
        p.grade_level AS author_grade,
        p.role AS author_role,
        p.solved_count AS author_solved_count,
        (u.reply_id IS NOT NULL) AS viewer_has_upvoted
      FROM public.replies r
      JOIN public.profiles p ON p.id = r.author_id
      LEFT JOIN public.reply_upvotes u
        ON u.reply_id = r.id
       AND u.user_id = ${viewerId}::uuid
      WHERE r.thread_id = ${threadId}
      ORDER BY r.is_accepted DESC, r.created_at ASC
    `,
    sql`
      SELECT col.id, col.slug, col.title
      FROM public.collection_threads ct
      JOIN public.collections col ON col.id = ct.collection_id
      WHERE ct.thread_id = ${threadId} AND col.is_published = TRUE
      ORDER BY col.title ASC
    `,
  ]);

  if (threadRows.length === 0) return null;
  const t = threadRows[0];
  const threadType = normalizeThreadType(t.thread_type);
  const status = (t.status as "open" | "solved" | "closed") ?? "open";
  const challengeEndsAt = t.challenge_ends_at
    ? new Date(String(t.challenge_ends_at)).toISOString()
    : null;
  const viewerRole: "student" | "admin" | null =
    t.viewer_role === "admin"
      ? "admin"
      : t.viewer_role === "student"
        ? "student"
        : null;
  const blindActive = isChallengeBlindActive(
    threadType,
    status,
    challengeEndsAt
  );

  const allReplies: ReplyItem[] = replyRows.map((r) => ({
    id: String(r.id),
    threadId: String(r.thread_id),
    parentReplyId: r.parent_reply_id ? String(r.parent_reply_id) : null,
    content: String(r.content),
    imageUrls: Array.isArray(r.image_urls)
      ? (r.image_urls as string[])
      : [],
    isAccepted: Boolean(r.is_accepted),
    upvotesCount: Number(r.upvotes_count ?? 0),
    viewerHasUpvoted: Boolean(r.viewer_has_upvoted),
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: r.updated_at
      ? new Date(String(r.updated_at)).toISOString()
      : undefined,
    author: {
      id: String(r.author_id),
      displayName: String(r.author_name),
      nickname: String(r.author_nickname ?? ""),
      avatarUrl: r.author_avatar ? String(r.author_avatar) : null,
      gradeLevel: String(r.author_grade ?? "THPT"),
      role: r.author_role === "admin" ? "admin" : "student",
      solvedCount: Number(r.author_solved_count ?? 0),
    },
  }));

  const threadAuthorId = String(t.author_id_ref);
  const replies = filterVisibleChallengeReplies(allReplies, {
    isBlindActive: blindActive,
    viewerId: viewerId ?? null,
    viewerRole,
    threadAuthorId,
  });

  return {
    id: String(t.id),
    title: String(t.title),
    content: String(t.content),
    imageUrls: Array.isArray(t.image_urls) ? (t.image_urls as string[]) : [],
    gradeTag: String(t.grade_tag ?? "Chung"),
    threadType,
    challengeEndsAt,
    bountyPoints: Number(t.bounty_points ?? 10),
    authorRewardPoints: Number(t.author_reward_points ?? 0),
    status,
    acceptedReplyId: t.accepted_reply_id ? String(t.accepted_reply_id) : null,
    isPinned: Boolean(t.is_pinned),
    viewCount: Number(t.view_count ?? 0),
    replyCount: Number(t.reply_count ?? 0),
    hiddenRepliesCount: Math.max(0, allReplies.length - replies.length),
    viewerBookmarked: Boolean(t.viewer_bookmarked),
    collections: collectionRows.map((c) => ({
      id: String(c.id),
      slug: String(c.slug),
      title: String(c.title),
    })),
    createdAt: new Date(String(t.created_at)).toISOString(),
    updatedAt: t.updated_at
      ? new Date(String(t.updated_at)).toISOString()
      : undefined,
    author: {
      id: threadAuthorId,
      displayName: String(t.author_name),
      nickname: String(t.author_nickname ?? ""),
      avatarUrl: t.author_avatar ? String(t.author_avatar) : null,
      gradeLevel: String(t.author_grade ?? "THPT"),
      role: t.author_role === "admin" ? "admin" : "student",
    },
    category: {
      id: Number(t.cat_id_ref),
      slug: String(t.cat_slug),
      name: String(t.cat_name),
      color: String(t.cat_color ?? "blue"),
    },
    replies,
  };
}

const getCachedPublicThreadDetail = unstable_cache(
  async (threadId: string): Promise<ThreadDetail | null> =>
    queryThreadDetailFromDb(threadId, null),
  ["forum-public-thread-detail"],
  { revalidate: 20, tags: [CACHE_TAGS.threads] }
);

export async function getThreadDetail(
  threadId: string,
  viewerId?: string | null
): Promise<ThreadDetail | null> {
  if (!isDatabaseConfigured() || !UUID_REGEX.test(threadId)) {
    return null;
  }
  if (!viewerId) {
    return getCachedPublicThreadDetail(threadId);
  }
  return queryThreadDetailFromDb(threadId, viewerId);
}

/**
 * Truy vấn gọn nhẹ chỉ lấy trạng thái thảo luận & danh sách lời giải của thread
 * (Dùng cho TanStack Query & Realtime Broadcast — KHÔNG cộng dồn lượt xem `view_count`)
 */
export async function getThreadDiscussionSnapshot(
  threadId: string,
  viewerId?: string | null
): Promise<ThreadDiscussionSnapshot | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!UUID_REGEX.test(threadId)) {
    return null;
  }

  const sql = getSql();
  const [threadRows, replyRows] = await Promise.all([
    sql`
      SELECT
        t.author_id,
        t.status,
        t.thread_type,
        t.challenge_ends_at,
        t.accepted_reply_id,
        t.bounty_points,
        t.author_reward_points,
        t.is_pinned,
        t.reply_count,
        vp.role AS viewer_role
      FROM public.threads t
      LEFT JOIN public.profiles vp
        ON vp.id = ${viewerId ?? null}::uuid
      WHERE t.id = ${threadId}
      LIMIT 1
    `,
    sql`
      SELECT
        r.*,
        p.display_name AS author_name,
        p.nickname AS author_nickname,
        p.avatar_url AS author_avatar,
        p.grade_level AS author_grade,
        p.role AS author_role,
        p.solved_count AS author_solved_count,
        (u.reply_id IS NOT NULL) AS viewer_has_upvoted
      FROM public.replies r
      JOIN public.profiles p ON p.id = r.author_id
      LEFT JOIN public.reply_upvotes u
        ON u.reply_id = r.id
       AND u.user_id = ${viewerId ?? null}::uuid
      WHERE r.thread_id = ${threadId}
      ORDER BY r.is_accepted DESC, r.created_at ASC
    `,
  ]);

  if (threadRows.length === 0) return null;
  const t = threadRows[0];
  const threadType = normalizeThreadType(t.thread_type);
  const status = (t.status as "open" | "solved" | "closed") ?? "open";
  const challengeEndsAt = t.challenge_ends_at
    ? new Date(String(t.challenge_ends_at)).toISOString()
    : null;
  const viewerRole: "student" | "admin" | null =
    t.viewer_role === "admin"
      ? "admin"
      : t.viewer_role === "student"
        ? "student"
        : null;
  const blindActive = isChallengeBlindActive(
    threadType,
    status,
    challengeEndsAt
  );

  const allReplies: ReplyItem[] = replyRows.map((r) => ({
    id: String(r.id),
    threadId: String(r.thread_id),
    parentReplyId: r.parent_reply_id ? String(r.parent_reply_id) : null,
    content: String(r.content),
    imageUrls: Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [],
    isAccepted: Boolean(r.is_accepted),
    upvotesCount: Number(r.upvotes_count ?? 0),
    viewerHasUpvoted: Boolean(r.viewer_has_upvoted),
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: r.updated_at
      ? new Date(String(r.updated_at)).toISOString()
      : undefined,
    author: {
      id: String(r.author_id),
      displayName: String(r.author_name),
      nickname: String(r.author_nickname ?? ""),
      avatarUrl: r.author_avatar ? String(r.author_avatar) : null,
      gradeLevel: String(r.author_grade ?? "THPT"),
      role: r.author_role === "admin" ? "admin" : "student",
      solvedCount: Number(r.author_solved_count ?? 0),
    },
  }));

  const threadAuthorId = String(t.author_id);
  const replies = filterVisibleChallengeReplies(allReplies, {
    isBlindActive: blindActive,
    viewerId: viewerId ?? null,
    viewerRole,
    threadAuthorId,
  });

  return {
    status,
    threadType,
    challengeEndsAt,
    acceptedReplyId: t.accepted_reply_id ? String(t.accepted_reply_id) : null,
    bountyPoints: Number(t.bounty_points ?? 10),
    authorRewardPoints: Number(t.author_reward_points ?? 0),
    isPinned: Boolean(t.is_pinned),
    replyCount: Number(t.reply_count ?? allReplies.length),
    hiddenRepliesCount: Math.max(0, allReplies.length - replies.length),
    replies,
  };
}

function mapPublicLeaderboardRow(
  row: Record<string, unknown>
): PublicLeaderboardEntry {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    nickname: String(row.nickname ?? ""),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    bio: String(row.bio ?? ""),
    gradeLevel: String(row.grade_level ?? "THPT"),
    role: row.role === "admin" ? "admin" : "student",
    totalEarnedPoints: Number(row.total_earned_points ?? 0),
    solvedCount: Number(row.solved_count ?? 0),
  };
}

const getCachedLeaderboard = unstable_cache(
  async (limit: number): Promise<PublicLeaderboardEntry[]> => {
    const sql = getSql();
    const rows = await sql`
      SELECT
        id,
        display_name,
        nickname,
        avatar_url,
        bio,
        grade_level,
        role,
        total_earned_points,
        solved_count
      FROM public.profiles
      WHERE is_banned = FALSE
        AND (total_earned_points > 0 OR solved_count > 0)
      ORDER BY total_earned_points DESC, solved_count DESC, created_at ASC
      LIMIT ${limit}
    `;
    return rows.map(mapPublicLeaderboardRow);
  },
  ["forum-leaderboard-public"],
  { revalidate: 60, tags: [CACHE_TAGS.leaderboard] }
);

export async function getLeaderboard(
  limit = 10
): Promise<PublicLeaderboardEntry[]> {
  if (!isDatabaseConfigured()) return [];
  return getCachedLeaderboard(limit);
}

const getCachedLeaderboardPaginated = unstable_cache(
  async (
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<PublicLeaderboardEntry>> => {
    const offset = (page - 1) * pageSize;
    const sql = getSql();
    const fetchRows = (off: number) => sql`
      SELECT
        id,
        display_name,
        nickname,
        avatar_url,
        bio,
        grade_level,
        role,
        total_earned_points,
        solved_count,
        COUNT(*) OVER()::int AS total_count
      FROM public.profiles
      WHERE is_banned = FALSE
        AND (total_earned_points > 0 OR solved_count > 0)
      ORDER BY total_earned_points DESC, solved_count DESC, created_at ASC
      LIMIT ${pageSize}
      OFFSET ${off}
    `;

    let effectivePage = page;
    let rows = await fetchRows(offset);
    let totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

    if (rows.length === 0 && page > 1) {
      const countRows = await sql`
        SELECT COUNT(*)::int AS total_count
        FROM public.profiles
        WHERE is_banned = FALSE
          AND (total_earned_points > 0 OR solved_count > 0)
      `;
      totalCount = Number(countRows[0]?.total_count ?? 0);
      if (totalCount > 0) {
        effectivePage = Math.max(1, Math.ceil(totalCount / pageSize));
        rows = await fetchRows((effectivePage - 1) * pageSize);
      } else {
        effectivePage = 1;
      }
    }

    return buildPaginatedResult(
      rows.map(mapPublicLeaderboardRow),
      totalCount,
      effectivePage,
      pageSize
    );
  },
  ["forum-leaderboard-paginated-public"],
  { revalidate: 60, tags: [CACHE_TAGS.leaderboard] }
);

export async function getLeaderboardPaginated(
  pageRaw = 1,
  pageSizeRaw = 20
): Promise<PaginatedResult<PublicLeaderboardEntry>> {
  const { page, pageSize } = normalizePagination(pageRaw, pageSizeRaw, 20);
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }
  return getCachedLeaderboardPaginated(page, pageSize);
}

const getCachedActiveRewards = unstable_cache(
  async (): Promise<RewardItem[]> => {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM public.rewards
      WHERE is_active = TRUE
      ORDER BY points_cost ASC, created_at ASC
    `;
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      description: String(r.description ?? ""),
      imageUrl: r.image_url ? String(r.image_url) : null,
      pointsCost: Number(r.points_cost),
      stock: Number(r.stock),
      isActive: Boolean(r.is_active),
      createdAt: new Date(String(r.created_at)).toISOString(),
    }));
  },
  ["forum-active-rewards"],
  { revalidate: 60, tags: [CACHE_TAGS.rewards] }
);

export async function listActiveRewards(): Promise<RewardItem[]> {
  if (!isDatabaseConfigured()) return [];
  return getCachedActiveRewards();
}

export async function listUserPointHistoryPaginated(
  userId: string,
  pageRaw = 1,
  pageSizeRaw = 10
): Promise<PaginatedResult<PointTransactionItem>> {
  const { page, pageSize, offset } = normalizePagination(
    pageRaw,
    pageSizeRaw,
    10
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const sql = getSql();
  const fetchRows = (off: number) => sql`
    SELECT *, COUNT(*) OVER()::int AS total_count
    FROM public.point_transactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${pageSize}
    OFFSET ${off}
  `;

  let effectivePage = page;
  let rows = await fetchRows(offset);
  let totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

  if (rows.length === 0 && page > 1) {
    const countRows = await sql`
      SELECT COUNT(*)::int AS total_count
      FROM public.point_transactions
      WHERE user_id = ${userId}
    `;
    totalCount = Number(countRows[0]?.total_count ?? 0);
    if (totalCount > 0) {
      effectivePage = Math.max(1, Math.ceil(totalCount / pageSize));
      rows = await fetchRows((effectivePage - 1) * pageSize);
    } else {
      effectivePage = 1;
    }
  }

  const items: PointTransactionItem[] = rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    amount: Number(r.amount),
    type: r.type as PointTransactionItem["type"],
    reason: String(r.reason),
    referenceId: r.reference_id ? String(r.reference_id) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
  return buildPaginatedResult(items, totalCount, effectivePage, pageSize);
}

export async function listUserRedemptionsPaginated(
  userId: string,
  pageRaw = 1,
  pageSizeRaw = 8
): Promise<PaginatedResult<RedemptionItem>> {
  const { page, pageSize, offset } = normalizePagination(
    pageRaw,
    pageSizeRaw,
    8
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const sql = getSql();
  const fetchRows = (off: number) => sql`
    SELECT
      rd.*,
      rw.name AS reward_name,
      rw.image_url AS reward_image_url,
      p.display_name AS user_display_name,
      p.email AS user_email,
      COUNT(*) OVER()::int AS total_count
    FROM public.redemptions rd
    JOIN public.rewards rw ON rw.id = rd.reward_id
    JOIN public.profiles p ON p.id = rd.user_id
    WHERE rd.user_id = ${userId}
    ORDER BY rd.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${off}
  `;

  let effectivePage = page;
  let rows = await fetchRows(offset);
  let totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

  if (rows.length === 0 && page > 1) {
    const countRows = await sql`
      SELECT COUNT(*)::int AS total_count
      FROM public.redemptions rd
      WHERE rd.user_id = ${userId}
    `;
    totalCount = Number(countRows[0]?.total_count ?? 0);
    if (totalCount > 0) {
      effectivePage = Math.max(1, Math.ceil(totalCount / pageSize));
      rows = await fetchRows((effectivePage - 1) * pageSize);
    } else {
      effectivePage = 1;
    }
  }

  const items: RedemptionItem[] = rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    userDisplayName: String(r.user_display_name),
    userEmail: String(r.user_email),
    rewardId: String(r.reward_id),
    rewardName: String(r.reward_name),
    rewardImageUrl: r.reward_image_url ? String(r.reward_image_url) : null,
    pointsSpent: Number(r.points_spent),
    studentNote: String(r.student_note ?? ""),
    adminNote: String(r.admin_note ?? ""),
    status: r.status as RedemptionItem["status"],
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));

  return buildPaginatedResult(items, totalCount, effectivePage, pageSize);
}

/**
 * Toàn bộ lịch sử bình luận / lời giải trên mọi chủ đề dành cho Admin Portal
 * (gắn kèm thông tin chủ đề, người hỏi, người trả lời và giao dịch cộng điểm để kiểm tra dấu hiệu buff điểm)
 */
export async function listAllRepliesForAdmin(
  limit = 200
): Promise<AdminReplyAuditItem[]> {
  if (!isDatabaseConfigured()) return [];

  const sql = getSql();
  const rows = await sql`
    WITH latest_replies AS (
      SELECT
        r.id,
        r.thread_id,
        r.author_id,
        r.content,
        r.image_urls,
        r.is_accepted,
        r.upvotes_count,
        r.created_at
      FROM public.replies r
      ORDER BY r.created_at DESC
      LIMIT ${limit}
    ),
    accepted_tx AS (
      SELECT DISTINCT ON (tx.reference_id, tx.user_id)
        tx.reference_id,
        tx.user_id,
        tx.amount,
        tx.created_by
      FROM public.point_transactions tx
      WHERE tx.type = 'accepted_answer'
        AND tx.reference_id IN (
          SELECT DISTINCT thread_id
          FROM latest_replies
          WHERE is_accepted = TRUE
        )
      ORDER BY tx.reference_id, tx.user_id, tx.created_at DESC
    )
    SELECT
      r.id,
      r.thread_id,
      r.content,
      r.image_urls,
      r.is_accepted,
      r.upvotes_count,
      r.created_at,
      t.title AS thread_title,
      t.status AS thread_status,
      t.bounty_points AS thread_bounty_points,
      t.created_at AS thread_created_at,
      t.author_id AS thread_author_id,
      ta.display_name AS thread_author_name,
      ta.email AS thread_author_email,
      r.author_id AS reply_author_id,
      ra.display_name AS reply_author_name,
      ra.email AS reply_author_email,
      ra.grade_level AS reply_author_grade,
      ra.points_balance AS reply_author_points,
      ra.solved_count AS reply_author_solved_count,
      ra.is_banned AS reply_author_banned,
      COALESCE(pt.amount, CASE WHEN r.is_accepted THEN t.bounty_points ELSE 0 END) AS awarded_points,
      acc.display_name AS accepted_by_name,
      GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (r.created_at - t.created_at))))::int AS seconds_after_thread
    FROM latest_replies r
    JOIN public.threads t ON t.id = r.thread_id
    JOIN public.profiles ta ON ta.id = t.author_id
    JOIN public.profiles ra ON ra.id = r.author_id
    LEFT JOIN accepted_tx pt
      ON r.is_accepted = TRUE
     AND pt.reference_id = t.id
     AND pt.user_id = r.author_id
    LEFT JOIN public.profiles acc ON acc.id = pt.created_by
    ORDER BY r.created_at DESC
  `;

  return rows.map((r) => ({
    id: String(r.id),
    threadId: String(r.thread_id),
    threadTitle: String(r.thread_title),
    threadStatus: (r.thread_status as "open" | "solved" | "closed") ?? "open",
    threadBountyPoints: Number(r.thread_bounty_points ?? 10),
    threadCreatedAt: new Date(String(r.thread_created_at)).toISOString(),
    threadAuthorId: String(r.thread_author_id),
    threadAuthorName: String(r.thread_author_name),
    threadAuthorEmail: String(r.thread_author_email),
    replyAuthorId: String(r.reply_author_id),
    replyAuthorName: String(r.reply_author_name),
    replyAuthorEmail: String(r.reply_author_email),
    replyAuthorGrade: String(r.reply_author_grade ?? "THPT"),
    replyAuthorPoints: Number(r.reply_author_points ?? 0),
    replyAuthorSolvedCount: Number(r.reply_author_solved_count ?? 0),
    replyAuthorBanned: Boolean(r.reply_author_banned),
    content: String(r.content),
    imageUrls: Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [],
    isAccepted: Boolean(r.is_accepted),
    upvotesCount: Number(r.upvotes_count ?? 0),
    awardedPoints: Number(r.awarded_points ?? 0),
    acceptedByName: r.accepted_by_name ? String(r.accepted_by_name) : null,
    secondsAfterThread: Number(r.seconds_after_thread ?? 0),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
}

/**
 * Luồng cốt lõi: Học sinh đăng bài tự tick chọn lời giải đúng -> cộng điểm tự động trong 1 Database Transaction!
 */
export async function acceptReplyTransaction(params: {
  caller: UserProfile;
  threadId: string;
  replyId: string;
}): Promise<{
  awardedPoints: number;
  solverId: string;
  solverName: string;
  threadTitle: string;
  unlockedAwards: UnlockedCampaignAwardSummary[];
}> {
  const sql = getSql();

  return await sql.begin(async (tx) => {
    const threadRows = await tx`
      SELECT * FROM public.threads
      WHERE id = ${params.threadId}
      FOR UPDATE
    `;
    if (threadRows.length === 0) {
      throw new Error("Không tìm thấy chủ đề bài toán.");
    }
    const thread = threadRows[0];

    const replyRows = await tx`
      SELECT r.*, p.display_name AS solver_name, p.is_banned AS solver_banned
      FROM public.replies r
      JOIN public.profiles p ON p.id = r.author_id
      WHERE r.id = ${params.replyId} AND r.thread_id = ${params.threadId}
      FOR UPDATE
    `;
    if (replyRows.length === 0) {
      throw new Error("Không tìm thấy lời giải này trong chủ đề.");
    }
    const reply = replyRows[0];

    const check = validateAcceptAnswer({
      callerId: params.caller.id,
      callerRole: params.caller.role,
      threadAuthorId: String(thread.author_id),
      threadType: normalizeThreadType(thread.thread_type),
      threadStatus: thread.status as "open" | "solved" | "closed",
      acceptedReplyId: thread.accepted_reply_id
        ? String(thread.accepted_reply_id)
        : null,
      replyAuthorId: String(reply.author_id),
      replyAuthorBanned: Boolean(reply.solver_banned),
    });

    if (!check.ok) {
      throw new Error(check.error);
    }

    const bounty = Number(thread.bounty_points ?? 10);

    await tx`
      UPDATE public.replies
      SET is_accepted = TRUE, updated_at = NOW()
      WHERE id = ${params.replyId}
    `;

    await tx`
      UPDATE public.threads
      SET status = 'solved', accepted_reply_id = ${params.replyId}, updated_at = NOW()
      WHERE id = ${params.threadId}
    `;

    await tx`
      UPDATE public.profiles
      SET
        points_balance = points_balance + ${bounty},
        total_earned_points = total_earned_points + ${bounty},
        solved_count = solved_count + 1,
        updated_at = NOW()
      WHERE id = ${reply.author_id}
    `;

    const reason = `Lời giải đúng được chấp nhận tại bài: "${String(thread.title).slice(0, 80)}"`;
    await tx`
      INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id, created_by)
      VALUES (${reply.author_id}, ${bounty}, 'accepted_answer', ${reason}, ${params.threadId}, ${params.caller.id})
    `;

    // Tự động xét & trao Award + Badge nếu bài toán thuộc Giải đấu (Campaign) đang diễn ra
    const unlockedAwards =
      params.caller.role === "admin"
        ? await evaluateAndGrantCampaignAwardsTx(tx, {
            threadId: params.threadId,
            solverId: String(reply.author_id),
            actorId: params.caller.id,
          })
        : [];

    return {
      awardedPoints: bounty,
      solverId: String(reply.author_id),
      solverName: String(reply.solver_name),
      threadTitle: String(thread.title),
      unlockedAwards,
    };
  });
}

/**
 * Luồng Admin chấm & trao điểm cho bài nộp đúng trong Thử thách Tuần
 * (cho phép chọn nhiều học sinh giải đúng; mỗi học sinh nhận thưởng tối đa 1 lần / thử thách).
 */
export async function awardChallengeReplyTransaction(params: {
  caller: UserProfile;
  threadId: string;
  replyId: string;
}): Promise<{
  awardedPoints: number;
  solverId: string;
  solverName: string;
  threadTitle: string;
  unlockedAwards: UnlockedCampaignAwardSummary[];
}> {
  const sql = getSql();

  return await sql.begin(async (tx) => {
    const threadRows = await tx`
      SELECT * FROM public.threads
      WHERE id = ${params.threadId}
      FOR UPDATE
    `;
    if (threadRows.length === 0) {
      throw new Error("Không tìm thấy bài Thử thách.");
    }
    const thread = threadRows[0];

    const replyRows = await tx`
      SELECT r.*, p.display_name AS solver_name, p.is_banned AS solver_banned
      FROM public.replies r
      JOIN public.profiles p ON p.id = r.author_id
      WHERE r.id = ${params.replyId} AND r.thread_id = ${params.threadId}
      FOR UPDATE OF r, p
    `;
    if (replyRows.length === 0) {
      throw new Error("Không tìm thấy bài nộp này trong thử thách.");
    }
    const reply = replyRows[0];

    const existingAccepted = await tx`
      SELECT 1 FROM public.replies
      WHERE thread_id = ${params.threadId}
        AND author_id = ${reply.author_id}
        AND is_accepted = TRUE
      LIMIT 1
    `;

    const bounty = Number(thread.bounty_points ?? 20);
    const check = validateChallengeAward({
      callerRole: params.caller.role,
      threadType: normalizeThreadType(thread.thread_type),
      replyAuthorId: String(reply.author_id),
      threadAuthorId: String(thread.author_id),
      replyAuthorBanned: Boolean(reply.solver_banned),
      alreadyAccepted: Boolean(reply.is_accepted),
      alreadyRewardedUser: existingAccepted.length > 0,
      bountyPoints: bounty,
    });
    if (!check.ok) {
      throw new Error(check.error);
    }

    await tx`
      UPDATE public.replies
      SET is_accepted = TRUE, updated_at = NOW()
      WHERE id = ${params.replyId}
    `;

    await tx`
      UPDATE public.profiles
      SET
        points_balance = points_balance + ${bounty},
        total_earned_points = total_earned_points + ${bounty},
        solved_count = solved_count + 1,
        updated_at = NOW()
      WHERE id = ${reply.author_id}
    `;

    const reason = `Giải đúng Thử thách Tuần: "${String(thread.title).slice(0, 80)}"`;
    await tx`
      INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id, created_by)
      VALUES (${reply.author_id}, ${bounty}, 'challenge_reward', ${reason}, ${params.threadId}, ${params.caller.id})
    `;

    const unlockedAwards = await evaluateAndGrantCampaignAwardsTx(tx, {
      threadId: params.threadId,
      solverId: String(reply.author_id),
      actorId: params.caller.id,
    });

    return {
      awardedPoints: bounty,
      solverId: String(reply.author_id),
      solverName: String(reply.solver_name),
      threadTitle: String(thread.title),
      unlockedAwards,
    };
  });
}

/**
 * Luồng đổi quà an toàn bằng Database Transaction (khóa FOR UPDATE chống âm điểm & hết hàng)
 */
export async function redeemRewardTransaction(params: {
  caller: UserProfile;
  rewardId: string;
  studentNote: string;
}): Promise<{ rewardName: string; pointsSpent: number }> {
  const sql = getSql();

  return await sql.begin(async (tx) => {
    const userRows = await tx`
      SELECT * FROM public.profiles WHERE id = ${params.caller.id} FOR UPDATE
    `;
    const rewardRows = await tx`
      SELECT * FROM public.rewards WHERE id = ${params.rewardId} FOR UPDATE
    `;

    if (userRows.length === 0) throw new Error("Không tìm thấy hồ sơ học sinh.");
    if (rewardRows.length === 0) throw new Error("Không tìm thấy phần quà này.");

    const user = userRows[0];
    const reward = rewardRows[0];

    const check = validateRewardRedemption({
      userBanned: Boolean(user.is_banned),
      userPoints: Number(user.points_balance),
      rewardActive: Boolean(reward.is_active),
      rewardCost: Number(reward.points_cost),
      rewardStock: Number(reward.stock),
    });

    if (!check.ok) {
      throw new Error(check.error);
    }

    const cost = Number(reward.points_cost);
    const rewardName = String(reward.name);

    await tx`
      UPDATE public.profiles
      SET points_balance = points_balance - ${cost}, updated_at = NOW()
      WHERE id = ${params.caller.id}
    `;

    await tx`
      UPDATE public.rewards
      SET stock = stock - 1, updated_at = NOW()
      WHERE id = ${params.rewardId}
    `;

    const redemptionRows = await tx`
      INSERT INTO public.redemptions (user_id, reward_id, points_spent, student_note, status)
      VALUES (${params.caller.id}, ${params.rewardId}, ${cost}, ${params.studentNote.trim()}, 'pending')
      RETURNING id
    `;

    await tx`
      INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id, created_by)
      VALUES (
        ${params.caller.id},
        ${-cost},
        'reward_redeem',
        ${`Đổi quà: ${rewardName}`},
        ${redemptionRows[0].id},
        ${params.caller.id}
      )
    `;

    return { rewardName, pointsSpent: cost };
  });
}
