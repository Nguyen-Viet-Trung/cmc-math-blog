import { getSql } from "./db";
import { isDatabaseConfigured } from "./env";
import {
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
} from "./pagination";
import { normalizeThreadType } from "./rules";
import type {
  AdminThreadManageItem,
  FeedbackCategory,
  FeedbackItem,
  FeedbackStatus,
  RedemptionItem,
  RewardItem,
  ThreadType,
  UserProfile,
} from "./types";

export interface AdminDashboardCounts {
  rewardsCount: number;
  redemptionsCount: number;
  pendingRedemptionsCount: number;
  studentsCount: number;
  threadsCount: number;
  feedbacksCount: number;
  openFeedbacksCount: number;
}

export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  if (!isDatabaseConfigured()) {
    return {
      rewardsCount: 0,
      redemptionsCount: 0,
      pendingRedemptionsCount: 0,
      studentsCount: 0,
      threadsCount: 0,
      feedbacksCount: 0,
      openFeedbacksCount: 0,
    };
  }

  const sql = getSql();
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM public.rewards) AS rewards_count,
      (SELECT COUNT(*)::int FROM public.redemptions) AS redemptions_count,
      (SELECT COUNT(*)::int FROM public.redemptions WHERE status = 'pending') AS pending_redemptions_count,
      (SELECT COUNT(*)::int FROM public.profiles) AS students_count,
      (SELECT COUNT(*)::int FROM public.threads) AS threads_count,
      (SELECT COUNT(*)::int FROM public.feedbacks) AS feedbacks_count,
      (SELECT COUNT(*)::int FROM public.feedbacks WHERE status IN ('open', 'in_progress')) AS open_feedbacks_count
  `;
  const r = rows[0] ?? {};
  return {
    rewardsCount: Number(r.rewards_count ?? 0),
    redemptionsCount: Number(r.redemptions_count ?? 0),
    pendingRedemptionsCount: Number(r.pending_redemptions_count ?? 0),
    studentsCount: Number(r.students_count ?? 0),
    threadsCount: Number(r.threads_count ?? 0),
    feedbacksCount: Number(r.feedbacks_count ?? 0),
    openFeedbacksCount: Number(r.open_feedbacks_count ?? 0),
  };
}

export async function listAdminRewardsPaginated(params: {
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedResult<RewardItem>> {
  const { page, pageSize, offset } = normalizePagination(
    params.page,
    params.pageSize,
    8
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const sql = getSql();
  const rows = await sql`
    SELECT *, COUNT(*) OVER()::int AS total_count
    FROM public.rewards
    ORDER BY points_cost ASC, created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const items: RewardItem[] = rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    description: String(r.description ?? ""),
    imageUrl: r.image_url ? String(r.image_url) : null,
    pointsCost: Number(r.points_cost),
    stock: Number(r.stock),
    isActive: Boolean(r.is_active),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));

  return buildPaginatedResult(items, totalCount, page, pageSize);
}

export async function listAdminRedemptionsPaginated(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  query?: string;
} = {}): Promise<PaginatedResult<RedemptionItem>> {
  const { page, pageSize, offset } = normalizePagination(
    params.page,
    params.pageSize,
    10
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const statusFilter =
    params.status && params.status !== "all" ? params.status : null;
  const searchPattern = params.query?.trim()
    ? `%${params.query.trim()}%`
    : null;

  const sql = getSql();
  const rows = await sql`
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
    WHERE (${statusFilter}::text IS NULL OR rd.status = ${statusFilter})
      AND (
        ${searchPattern}::text IS NULL
        OR p.display_name ILIKE ${searchPattern}
        OR p.email ILIKE ${searchPattern}
        OR rw.name ILIKE ${searchPattern}
        OR rd.student_note ILIKE ${searchPattern}
        OR rd.admin_note ILIKE ${searchPattern}
      )
    ORDER BY
      CASE WHEN rd.status = 'pending' THEN 0 WHEN rd.status = 'approved' THEN 1 ELSE 2 END,
      rd.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
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

  return buildPaginatedResult(items, totalCount, page, pageSize);
}

export async function listAdminStudentsPaginated(params: {
  page?: number;
  pageSize?: number;
  query?: string;
} = {}): Promise<PaginatedResult<UserProfile>> {
  const { page, pageSize, offset } = normalizePagination(
    params.page,
    params.pageSize,
    15
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const searchPattern = params.query?.trim()
    ? `%${params.query.trim()}%`
    : null;

  const sql = getSql();
  const rows = await sql`
    SELECT *, COUNT(*) OVER()::int AS total_count
    FROM public.profiles
    WHERE (
      ${searchPattern}::text IS NULL
      OR display_name ILIKE ${searchPattern}
      OR nickname ILIKE ${searchPattern}
      OR email ILIKE ${searchPattern}
    )
    ORDER BY role ASC, points_balance DESC, created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const items: UserProfile[] = rows.map((row) => {
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
      joinedAt,
      createdAt,
    };
  });

  return buildPaginatedResult(items, totalCount, page, pageSize);
}

export async function listAdminThreadsPaginated(params: {
  page?: number;
  pageSize?: number;
  threadType?: ThreadType | "all";
  query?: string;
} = {}): Promise<PaginatedResult<AdminThreadManageItem>> {
  const { page, pageSize, offset } = normalizePagination(
    params.page,
    params.pageSize,
    12
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const typeFilter =
    params.threadType && params.threadType !== "all" ? params.threadType : null;
  const searchPattern = params.query?.trim()
    ? `%${params.query.trim()}%`
    : null;

  const sql = getSql();
  const rows = await sql`
    SELECT
      t.id,
      t.title,
      t.thread_type,
      t.grade_tag,
      t.status,
      t.bounty_points,
      t.author_reward_points,
      t.is_pinned,
      t.reply_count,
      t.view_count,
      t.created_at,
      c.name AS category_name,
      p.id AS author_id,
      p.display_name AS author_name,
      p.email AS author_email,
      p.is_banned AS author_banned,
      COUNT(*) OVER()::int AS total_count
    FROM public.threads t
    JOIN public.profiles p ON p.id = t.author_id
    JOIN public.categories c ON c.id = t.category_id
    WHERE (${typeFilter}::text IS NULL OR t.thread_type = ${typeFilter})
      AND (
        ${searchPattern}::text IS NULL
        OR t.title ILIKE ${searchPattern}
        OR p.display_name ILIKE ${searchPattern}
        OR p.email ILIKE ${searchPattern}
        OR c.name ILIKE ${searchPattern}
      )
    ORDER BY t.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const items: AdminThreadManageItem[] = rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    threadType: normalizeThreadType(r.thread_type),
    gradeTag: String(r.grade_tag ?? "Chung"),
    categoryName: String(r.category_name),
    status: (r.status as "open" | "solved" | "closed") ?? "open",
    bountyPoints: Number(r.bounty_points ?? 0),
    authorRewardPoints: Number(r.author_reward_points ?? 0),
    isPinned: Boolean(r.is_pinned),
    replyCount: Number(r.reply_count ?? 0),
    viewCount: Number(r.view_count ?? 0),
    createdAt: new Date(String(r.created_at)).toISOString(),
    authorId: String(r.author_id),
    authorName: String(r.author_name),
    authorEmail: String(r.author_email),
    authorBanned: Boolean(r.author_banned),
  }));

  return buildPaginatedResult(items, totalCount, page, pageSize);
}

export async function listAdminFeedbacksPaginated(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  query?: string;
} = {}): Promise<PaginatedResult<FeedbackItem>> {
  const { page, pageSize, offset } = normalizePagination(
    params.page,
    params.pageSize,
    10
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const statusFilter =
    params.status && params.status !== "all" ? params.status : null;
  const searchPattern = params.query?.trim()
    ? `%${params.query.trim()}%`
    : null;

  const sql = getSql();
  const rows = await sql`
    SELECT
      f.*,
      COALESCE(p.display_name, NULLIF(f.contact_name, ''), 'Khách') AS author_name,
      COALESCE(p.email, f.contact_email, '') AS resolved_email,
      COUNT(*) OVER()::int AS total_count
    FROM public.feedbacks f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    WHERE (${statusFilter}::text IS NULL OR f.status = ${statusFilter})
      AND (
        ${searchPattern}::text IS NULL
        OR f.title ILIKE ${searchPattern}
        OR f.description ILIKE ${searchPattern}
        OR COALESCE(p.display_name, f.contact_name, '') ILIKE ${searchPattern}
      )
    ORDER BY
      CASE
        WHEN f.status = 'open' THEN 0
        WHEN f.status = 'in_progress' THEN 1
        ELSE 2
      END,
      f.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const items: FeedbackItem[] = rows.map((r) => ({
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

  return buildPaginatedResult(items, totalCount, page, pageSize);
}
