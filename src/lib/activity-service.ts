import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { getSql } from "./db";
import { isDatabaseConfigured } from "./env";
import { isFeatureEnabled } from "./feature-flags";
import { sanitizeRedirectPath } from "./rules";
import type {
  ActivityCursor,
  ActivityEventType,
  ActivityFeedPage,
  ActivityFeedTab,
  ActivityItem,
  ActivityTargetType,
} from "./types";

export const ACTIVITY_EVENT_TYPES: readonly ActivityEventType[] = [
  "new_question",
  "new_solution",
  "accepted_solution",
  "badge_earned",
  "campaign_launched",
] as const;

export const ACTIVITY_TARGET_TYPES: readonly ActivityTargetType[] = [
  "thread",
  "reply",
  "campaign",
  "award",
] as const;

export const ACTIVITY_FEED_TABS: readonly ActivityFeedTab[] = [
  "discover",
  "following",
] as const;

export const DEFAULT_ACTIVITY_PAGE_SIZE = 20;
export const MAX_ACTIVITY_PAGE_SIZE = 50;

export const BLIND_SUBMISSION_ACTIVITY_SUMMARY =
  "Đã nộp bài cho Thử thách Tuần (nội dung đang ẩn trong chế độ Blind Submission).";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STRICT_ISO_UTC_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

const MIN_CURSOR_YEAR = 2000;
const MAX_CURSOR_YEAR = 2100;

export function parseActivityLimitParam(
  rawLimitParam: string | null | undefined
): number {
  if (rawLimitParam === null || rawLimitParam === undefined) {
    return DEFAULT_ACTIVITY_PAGE_SIZE;
  }
  const trimmed = rawLimitParam.trim();
  if (!trimmed) {
    return DEFAULT_ACTIVITY_PAGE_SIZE;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ACTIVITY_PAGE_SIZE;
  }
  return Math.max(5, Math.min(MAX_ACTIVITY_PAGE_SIZE, Math.floor(parsed)));
}

export function isActivityEventType(val: unknown): val is ActivityEventType {
  return (
    typeof val === "string" &&
    (ACTIVITY_EVENT_TYPES as readonly string[]).includes(val)
  );
}

export function isActivityTargetType(val: unknown): val is ActivityTargetType {
  return (
    typeof val === "string" &&
    (ACTIVITY_TARGET_TYPES as readonly string[]).includes(val)
  );
}

export function isActivityFeedTab(val: unknown): val is ActivityFeedTab {
  return (
    typeof val === "string" &&
    (ACTIVITY_FEED_TABS as readonly string[]).includes(val)
  );
}

function isValidCursorDate(date: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getUTCFullYear();
  return year >= MIN_CURSOR_YEAR && year <= MAX_CURSOR_YEAR;
}

export function encodeActivityCursor(cursor: ActivityCursor): string {
  const parsedDate = new Date(cursor.createdAt);
  if (!isValidCursorDate(parsedDate) || !UUID_REGEX.test(cursor.id.trim())) {
    throw new Error("Invalid activity cursor");
  }
  const payload = `${parsedDate.toISOString()}|${cursor.id.trim().toLowerCase()}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeActivityCursor(
  raw: string | null | undefined
): ActivityCursor | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 200) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;

  try {
    const decoded = Buffer.from(trimmed, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 2) return null;

    const [isoPart, idPart] = parts;
    if (
      !isoPart ||
      !idPart ||
      !STRICT_ISO_UTC_REGEX.test(isoPart) ||
      !UUID_REGEX.test(idPart)
    ) {
      return null;
    }

    const parsedDate = new Date(isoPart);
    if (!isValidCursorDate(parsedDate)) return null;

    return {
      createdAt: parsedDate.toISOString(),
      id: idPart.toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Tạo đoạn tóm tắt an toàn cho Activity Feed:
 * - BẮT BUỘC ẩn hoàn toàn nội dung lời giải khi bài Thử thách đang ở chế độ Blind Submission.
 * - Ẩn các khối `:::solution`, `:::spoiler`, `:::hint` và dọn cú pháp Markdown/ảnh thô.
 */
export function buildSafeActivitySummary(
  rawContent: string,
  options?: {
    isBlindSubmission?: boolean;
    maxLength?: number;
  }
): string {
  if (options?.isBlindSubmission) {
    return BLIND_SUBMISSION_ACTIVITY_SUMMARY;
  }

  const maxLength = Math.max(40, Math.min(240, options?.maxLength ?? 160));
  const stripped = rawContent
    // Không làm lộ nội dung nằm trong khối ẩn (spoiler / solution / hint)
    .replace(
      /:::(solution|spoiler|hint)[^\n]*[\s\S]*?:::/gi,
      " [Nội dung thu gọn] "
    )
    // Loại bỏ khối code fence (graph / geogebra / code)
    .replace(/```[\s\S]*?```/g, " [Hình vẽ / Mã] ")
    // Loại bỏ ảnh Markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // Giữ lại văn bản của liên kết Markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Dọn ký tự định dạng cơ bản
    .replace(/[#>*_`~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!stripped) return "";
  if (stripped.length <= maxLength) return stripped;
  return `${stripped.slice(0, maxLength - 1).trimEnd()}…`;
}

export interface RecordActivityInput {
  actorId: string;
  eventType: ActivityEventType;
  targetType: ActivityTargetType;
  targetId: string;
  title: string;
  summary?: string;
  href?: string;
  categorySlug?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Ghi nhận sự kiện công khai vào bảng `public.activities` (best-effort, không chặn luồng chính).
 * Tuyệt đối không đưa nội dung bài nộp Blind Submission vào `summary` hoặc `metadata`.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  if (!isDatabaseConfigured() || !isFeatureEnabled("activityFeed")) return;
  if (
    !UUID_REGEX.test(input.actorId.trim()) ||
    !UUID_REGEX.test(input.targetId.trim())
  ) {
    return;
  }
  if (
    !isActivityEventType(input.eventType) ||
    !isActivityTargetType(input.targetType)
  ) {
    return;
  }

  const safeTitle = input.title.trim().slice(0, 200);
  if (!safeTitle) return;

  const isBlind = input.metadata?.isBlindSubmission === true;
  const safeSummary = isBlind
    ? BLIND_SUBMISSION_ACTIVITY_SUMMARY
    : (input.summary ?? "").trim().slice(0, 220);
  const safeHref = sanitizeRedirectPath(input.href ?? "/").slice(0, 240);
  const safeCategorySlug =
    typeof input.categorySlug === "string" && input.categorySlug.trim()
      ? input.categorySlug.trim().toLowerCase().slice(0, 80)
      : null;

  const safeMetadata =
    input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? input.metadata
      : {};

  try {
    const sql = getSql();
    await sql`
      INSERT INTO public.activities (
        actor_id,
        event_type,
        target_type,
        target_id,
        title,
        summary,
        href,
        category_slug,
        metadata
      )
      VALUES (
        ${input.actorId.trim()}::uuid,
        ${input.eventType},
        ${input.targetType},
        ${input.targetId.trim()}::uuid,
        ${safeTitle},
        ${safeSummary},
        ${safeHref},
        ${safeCategorySlug},
        ${JSON.stringify(safeMetadata)}::jsonb
      )
    `;
  } catch (err) {
    console.warn("[activity] Không thể ghi sự kiện hoạt động:", err);
  }
}

/**
 * Dọn dẹp các dòng hoạt động mồ côi khi bài viết bị xóa (gồm cả bài viết và các bình luận thuộc bài viết đó).
 */
export async function deleteActivitiesForThread(
  threadId: string,
  replyIds?: string[]
): Promise<void> {
  if (!isDatabaseConfigured() || !UUID_REGEX.test(threadId.trim())) return;
  const safeThreadId = threadId.trim();
  const safeReplyIds = (replyIds ?? []).filter((id) => UUID_REGEX.test(id.trim()));

  try {
    const sql = getSql();
    if (safeReplyIds.length > 0) {
      await sql`
        DELETE FROM public.activities
        WHERE (target_type = 'thread' AND target_id = ${safeThreadId}::uuid)
           OR (target_type = 'reply' AND target_id = ANY(${sql.array(safeReplyIds)}::uuid[]))
           OR (target_type = 'reply' AND metadata->>'threadId' = ${safeThreadId})
      `;
    } else {
      await sql`
        DELETE FROM public.activities
        WHERE (target_type = 'thread' AND target_id = ${safeThreadId}::uuid)
           OR (target_type = 'reply' AND metadata->>'threadId' = ${safeThreadId})
      `;
    }
  } catch (err) {
    console.warn("[activity] Không thể dọn sự kiện của bài viết đã xóa:", err);
  }
}

/**
 * Dọn dẹp các dòng hoạt động của bình luận khi bị xóa hoặc thu hồi lời giải đúng.
 */
export async function deleteActivitiesForReplies(
  replyIds: string[],
  options?: { eventType?: ActivityEventType }
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const safeIds = replyIds.filter((id) => UUID_REGEX.test(id.trim()));
  if (safeIds.length === 0) return;

  try {
    const sql = getSql();
    if (options?.eventType && isActivityEventType(options.eventType)) {
      await sql`
        DELETE FROM public.activities
        WHERE target_type = 'reply'
          AND target_id = ANY(${sql.array(safeIds)}::uuid[])
          AND event_type = ${options.eventType}
      `;
    } else {
      await sql`
        DELETE FROM public.activities
        WHERE target_type = 'reply'
          AND target_id = ANY(${sql.array(safeIds)}::uuid[])
      `;
    }
  } catch (err) {
    console.warn("[activity] Không thể dọn sự kiện của bình luận:", err);
  }
}

/**
 * Dọn dẹp các dòng hoạt động khi giải đấu bị xóa hoặc chuyển sang trạng thái ẩn (unpublished).
 */
export async function deleteActivitiesForCampaign(
  campaignId: string
): Promise<void> {
  if (!isDatabaseConfigured() || !UUID_REGEX.test(campaignId.trim())) return;
  const safeCampaignId = campaignId.trim();

  try {
    const sql = getSql();
    await sql`
      DELETE FROM public.activities
      WHERE (target_type = 'campaign' AND target_id = ${safeCampaignId}::uuid)
         OR (target_type = 'award' AND metadata->>'campaignId' = ${safeCampaignId})
    `;
  } catch (err) {
    console.warn("[activity] Không thể dọn sự kiện của giải đấu:", err);
  }
}

/**
 * Dọn dẹp các dòng hoạt động khi một mốc Award bị xóa.
 */
export async function deleteActivitiesForAward(awardId: string): Promise<void> {
  if (!isDatabaseConfigured() || !UUID_REGEX.test(awardId.trim())) return;
  try {
    const sql = getSql();
    await sql`
      DELETE FROM public.activities
      WHERE target_type = 'award'
        AND target_id = ${awardId.trim()}::uuid
    `;
  } catch (err) {
    console.warn("[activity] Không thể dọn sự kiện của mốc Award:", err);
  }
}

function mapActivityRow(row: Record<string, unknown>): ActivityItem {
  const rawMetadata =
    row.metadata &&
    typeof row.metadata === "object" &&
    !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: String(row.id),
    actorId: String(row.actor_id),
    eventType: isActivityEventType(row.event_type)
      ? row.event_type
      : "new_question",
    targetType: isActivityTargetType(row.target_type)
      ? row.target_type
      : "thread",
    targetId: String(row.target_id),
    title: String(row.title),
    summary: String(row.summary ?? ""),
    href: sanitizeRedirectPath(String(row.href ?? "/")),
    categorySlug: row.category_slug ? String(row.category_slug) : null,
    metadata: rawMetadata,
    createdAt: new Date(String(row.created_at)).toISOString(),
    actor: {
      id: String(row.actor_id),
      displayName: String(row.actor_display_name ?? "Thành viên"),
      nickname: String(row.actor_nickname ?? ""),
      avatarUrl: row.actor_avatar_url ? String(row.actor_avatar_url) : null,
      gradeLevel: String(row.actor_grade_level ?? "THPT"),
      role: row.actor_role === "admin" ? "admin" : "student",
    },
  };
}

function buildPageFromRows(
  rows: Record<string, unknown>[],
  limit: number
): ActivityFeedPage {
  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const items = sliced.map(mapActivityRow);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeActivityCursor({ createdAt: last.createdAt, id: last.id })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

function normalizeLimit(rawLimit?: number): number {
  if (!Number.isFinite(rawLimit)) return DEFAULT_ACTIVITY_PAGE_SIZE;
  return Math.max(
    1,
    Math.min(MAX_ACTIVITY_PAGE_SIZE, Math.floor(rawLimit ?? DEFAULT_ACTIVITY_PAGE_SIZE))
  );
}

async function queryDiscoverActivitiesFromDb(
  cursor: ActivityCursor | null,
  limit: number,
  excludeActorIds: string[]
): Promise<ActivityFeedPage> {
  const sql = getSql();
  const fetchLimit = limit + 1;

  // Tách nhánh SQL rõ ràng để PostgreSQL sử dụng tối ưu idx_activities_created_id
  let rows: Record<string, unknown>[];
  if (cursor && excludeActorIds.length > 0) {
    rows = await sql`
      SELECT
        a.id,
        a.actor_id,
        a.event_type,
        a.target_type,
        a.target_id,
        a.title,
        a.summary,
        a.href,
        a.category_slug,
        a.metadata,
        a.created_at,
        p.display_name AS actor_display_name,
        p.nickname AS actor_nickname,
        p.avatar_url AS actor_avatar_url,
        p.grade_level AS actor_grade_level,
        p.role AS actor_role
      FROM public.activities a
      JOIN public.profiles p ON p.id = a.actor_id
      WHERE p.is_banned = FALSE
        AND (a.created_at, a.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)
        AND NOT (a.actor_id = ANY(${sql.array(excludeActorIds)}::uuid[]))
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ${fetchLimit}
    `;
  } else if (cursor) {
    rows = await sql`
      SELECT
        a.id,
        a.actor_id,
        a.event_type,
        a.target_type,
        a.target_id,
        a.title,
        a.summary,
        a.href,
        a.category_slug,
        a.metadata,
        a.created_at,
        p.display_name AS actor_display_name,
        p.nickname AS actor_nickname,
        p.avatar_url AS actor_avatar_url,
        p.grade_level AS actor_grade_level,
        p.role AS actor_role
      FROM public.activities a
      JOIN public.profiles p ON p.id = a.actor_id
      WHERE p.is_banned = FALSE
        AND (a.created_at, a.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ${fetchLimit}
    `;
  } else if (excludeActorIds.length > 0) {
    rows = await sql`
      SELECT
        a.id,
        a.actor_id,
        a.event_type,
        a.target_type,
        a.target_id,
        a.title,
        a.summary,
        a.href,
        a.category_slug,
        a.metadata,
        a.created_at,
        p.display_name AS actor_display_name,
        p.nickname AS actor_nickname,
        p.avatar_url AS actor_avatar_url,
        p.grade_level AS actor_grade_level,
        p.role AS actor_role
      FROM public.activities a
      JOIN public.profiles p ON p.id = a.actor_id
      WHERE p.is_banned = FALSE
        AND NOT (a.actor_id = ANY(${sql.array(excludeActorIds)}::uuid[]))
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ${fetchLimit}
    `;
  } else {
    rows = await sql`
      SELECT
        a.id,
        a.actor_id,
        a.event_type,
        a.target_type,
        a.target_id,
        a.title,
        a.summary,
        a.href,
        a.category_slug,
        a.metadata,
        a.created_at,
        p.display_name AS actor_display_name,
        p.nickname AS actor_nickname,
        p.avatar_url AS actor_avatar_url,
        p.grade_level AS actor_grade_level,
        p.role AS actor_role
      FROM public.activities a
      JOIN public.profiles p ON p.id = a.actor_id
      WHERE p.is_banned = FALSE
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ${fetchLimit}
    `;
  }

  return buildPageFromRows(rows, limit);
}

const getCachedFirstDiscoverActivitiesPage = unstable_cache(
  async () => queryDiscoverActivitiesFromDb(null, DEFAULT_ACTIVITY_PAGE_SIZE, []),
  ["activity-feed-discover-first-page"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.activities],
  }
);

export async function listDiscoverActivities(input?: {
  cursor?: string | null;
  limit?: number;
  excludeActorIds?: string[];
}): Promise<ActivityFeedPage> {
  if (!isDatabaseConfigured() || !isFeatureEnabled("activityFeed")) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const limit = normalizeLimit(input?.limit);
  const decodedCursor = decodeActivityCursor(input?.cursor);
  const excludeActorIds = (input?.excludeActorIds ?? []).filter((id) =>
    UUID_REGEX.test(id)
  );

  // Chỉ cache trang đầu mặc định (không cursor, limit=20, không lọc ẩn/chặn) để tránh bùng nổ key cache
  if (
    excludeActorIds.length === 0 &&
    !decodedCursor &&
    limit === DEFAULT_ACTIVITY_PAGE_SIZE
  ) {
    return getCachedFirstDiscoverActivitiesPage();
  }

  return queryDiscoverActivitiesFromDb(decodedCursor, limit, excludeActorIds);
}

export async function listFollowingActivities(input: {
  viewerId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<ActivityFeedPage> {
  if (
    !isDatabaseConfigured() ||
    !isFeatureEnabled("activityFeed") ||
    !UUID_REGEX.test(input.viewerId)
  ) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const limit = normalizeLimit(input.limit);
  const decodedCursor = decodeActivityCursor(input.cursor);
  const fetchLimit = limit + 1;

  const sql = getSql();
  const rows = decodedCursor
    ? await sql`
        SELECT
          a.id,
          a.actor_id,
          a.event_type,
          a.target_type,
          a.target_id,
          a.title,
          a.summary,
          a.href,
          a.category_slug,
          a.metadata,
          a.created_at,
          p.display_name AS actor_display_name,
          p.nickname AS actor_nickname,
          p.avatar_url AS actor_avatar_url,
          p.grade_level AS actor_grade_level,
          p.role AS actor_role
        FROM public.activities a
        JOIN public.user_follows uf
          ON uf.following_id = a.actor_id
         AND uf.follower_id = ${input.viewerId}::uuid
        JOIN public.profiles p
          ON p.id = a.actor_id
         AND p.is_banned = FALSE
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.user_blocks ub
            WHERE (ub.blocker_id = ${input.viewerId}::uuid AND ub.blocked_id = a.actor_id)
               OR (ub.blocker_id = a.actor_id AND ub.blocked_id = ${input.viewerId}::uuid AND ub.mode = 'block')
          )
          AND (a.created_at, a.id) < (${decodedCursor.createdAt}::timestamptz, ${decodedCursor.id}::uuid)
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT ${fetchLimit}
      `
    : await sql`
        SELECT
          a.id,
          a.actor_id,
          a.event_type,
          a.target_type,
          a.target_id,
          a.title,
          a.summary,
          a.href,
          a.category_slug,
          a.metadata,
          a.created_at,
          p.display_name AS actor_display_name,
          p.nickname AS actor_nickname,
          p.avatar_url AS actor_avatar_url,
          p.grade_level AS actor_grade_level,
          p.role AS actor_role
        FROM public.activities a
        JOIN public.user_follows uf
          ON uf.following_id = a.actor_id
         AND uf.follower_id = ${input.viewerId}::uuid
        JOIN public.profiles p
          ON p.id = a.actor_id
         AND p.is_banned = FALSE
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.user_blocks ub
            WHERE (ub.blocker_id = ${input.viewerId}::uuid AND ub.blocked_id = a.actor_id)
               OR (ub.blocker_id = a.actor_id AND ub.blocked_id = ${input.viewerId}::uuid AND ub.mode = 'block')
          )
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT ${fetchLimit}
      `;

  return buildPageFromRows(rows as Record<string, unknown>[], limit);
}

export async function listActivityFeed(input: {
  tab: ActivityFeedTab;
  viewerId?: string | null;
  cursor?: string | null;
  limit?: number;
  excludeActorIds?: string[];
}): Promise<ActivityFeedPage> {
  if (input.tab === "following") {
    if (!input.viewerId) {
      return { items: [], nextCursor: null, hasMore: false };
    }
    return listFollowingActivities({
      viewerId: input.viewerId,
      cursor: input.cursor,
      limit: input.limit,
    });
  }

  return listDiscoverActivities({
    cursor: input.cursor,
    limit: input.limit,
    excludeActorIds: input.excludeActorIds,
  });
}
