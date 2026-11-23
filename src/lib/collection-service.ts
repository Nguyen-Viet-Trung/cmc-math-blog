import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { getSql } from "./db";
import { isDatabaseConfigured } from "./env";
import {
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
} from "./pagination";
import { normalizeThreadType } from "./rules";
import type {
  CollectionDetail,
  CollectionSummary,
  CollectionThreadItem,
  ThreadSummary,
} from "./types";

function mapThreadSummaryRow(r: Record<string, unknown>): ThreadSummary {
  return {
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
  };
}

function mapCollectionSummaryRow(r: Record<string, unknown>): CollectionSummary {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    description: String(r.description ?? ""),
    coverColor: String(r.cover_color ?? "blue"),
    isPublished: Boolean(r.is_published),
    threadCount: Number(r.thread_count ?? 0),
    solvedCount: Number(r.solved_count ?? 0),
    createdByName: r.created_by_name ? String(r.created_by_name) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  };
}

const getCachedPublishedCollections = unstable_cache(
  async (): Promise<CollectionSummary[]> => {
    const sql = getSql();
    const rows = await sql`
      SELECT
        col.*,
        p.display_name AS created_by_name,
        COUNT(ct.thread_id)::int AS thread_count,
        COUNT(t.id) FILTER (WHERE t.status = 'solved')::int AS solved_count
      FROM public.collections col
      LEFT JOIN public.profiles p ON p.id = col.created_by
      LEFT JOIN public.collection_threads ct ON ct.collection_id = col.id
      LEFT JOIN public.threads t ON t.id = ct.thread_id
      WHERE col.is_published = TRUE
      GROUP BY col.id, p.display_name
      ORDER BY col.updated_at DESC, col.created_at DESC
      LIMIT 60
    `;
    return rows.map(mapCollectionSummaryRow);
  },
  ["forum-published-collections"],
  { revalidate: 120, tags: [CACHE_TAGS.collections, CACHE_TAGS.threads] }
);

export async function listPublishedCollections(): Promise<CollectionSummary[]> {
  if (!isDatabaseConfigured()) return [];
  return getCachedPublishedCollections();
}

async function fetchCollectionDetailFromDb(
  normalizedSlug: string,
  includeUnpublished: boolean
): Promise<CollectionDetail | null> {
  const sql = getSql();

  const colRows = await sql`
    SELECT
      col.*,
      p.display_name AS created_by_name
    FROM public.collections col
    LEFT JOIN public.profiles p ON p.id = col.created_by
    WHERE col.slug = ${normalizedSlug}
      AND (${includeUnpublished}::boolean OR col.is_published = TRUE)
    LIMIT 1
  `;

  if (colRows.length === 0) return null;
  const colRow = colRows[0];
  const colId = String(colRow.id);

  const itemRows = await sql`
    SELECT
      ct.sort_order,
      ct.note,
      ct.added_at,
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
      c.color AS category_color
    FROM public.collection_threads ct
    JOIN public.threads t ON t.id = ct.thread_id
    JOIN public.profiles p ON p.id = t.author_id
    JOIN public.categories c ON c.id = t.category_id
    WHERE ct.collection_id = ${colId}
    ORDER BY ct.sort_order ASC, ct.added_at ASC
  `;

  const items: CollectionThreadItem[] = itemRows.map((r) => ({
    thread: mapThreadSummaryRow(r),
    sortOrder: Number(r.sort_order ?? 0),
    note: String(r.note ?? ""),
    addedAt: new Date(String(r.added_at)).toISOString(),
  }));

  const summary = mapCollectionSummaryRow({
    ...colRow,
    thread_count: items.length,
    solved_count: items.filter((i) => i.thread.status === "solved").length,
  });

  return {
    ...summary,
    items,
  };
}

const getCachedPublishedCollectionDetail = unstable_cache(
  async (normalizedSlug: string): Promise<CollectionDetail | null> =>
    fetchCollectionDetailFromDb(normalizedSlug, false),
  ["forum-published-collection-detail"],
  { revalidate: 120, tags: [CACHE_TAGS.collections, CACHE_TAGS.threads] }
);

export const getCollectionDetailBySlug = cache(
  async (
    slug: string,
    includeUnpublished = false
  ): Promise<CollectionDetail | null> => {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!isDatabaseConfigured() || !normalizedSlug) return null;
    if (!includeUnpublished) {
      return getCachedPublishedCollectionDetail(normalizedSlug);
    }
    return fetchCollectionDetailFromDb(normalizedSlug, true);
  }
);

export interface AdminCollectionWithThreads extends CollectionSummary {
  threads: {
    id: string;
    title: string;
    threadType: string;
    sortOrder: number;
    note: string;
  }[];
}

export async function listCollectionsForAdmin(): Promise<
  AdminCollectionWithThreads[]
> {
  if (!isDatabaseConfigured()) return [];
  const sql = getSql();

  const [colRows, linkRows] = await Promise.all([
    sql`
      SELECT
        col.*,
        p.display_name AS created_by_name,
        COUNT(ct.thread_id)::int AS thread_count,
        COUNT(t.id) FILTER (WHERE t.status = 'solved')::int AS solved_count
      FROM public.collections col
      LEFT JOIN public.profiles p ON p.id = col.created_by
      LEFT JOIN public.collection_threads ct ON ct.collection_id = col.id
      LEFT JOIN public.threads t ON t.id = ct.thread_id
      GROUP BY col.id, p.display_name
      ORDER BY col.updated_at DESC, col.created_at DESC
      LIMIT 100
    `,
    sql`
      WITH top_cols AS (
        SELECT id
        FROM public.collections
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 100
      )
      SELECT
        ct.collection_id,
        ct.sort_order,
        ct.note,
        t.id AS thread_id,
        t.title AS thread_title,
        t.thread_type
      FROM top_cols tc
      JOIN public.collection_threads ct ON ct.collection_id = tc.id
      JOIN public.threads t ON t.id = ct.thread_id
      ORDER BY ct.sort_order ASC, ct.added_at ASC
    `,
  ]);

  const byCollection = new Map<
    string,
    AdminCollectionWithThreads["threads"]
  >();
  for (const row of linkRows) {
    const cid = String(row.collection_id);
    const list = byCollection.get(cid) ?? [];
    list.push({
      id: String(row.thread_id),
      title: String(row.thread_title),
      threadType: String(row.thread_type ?? "question"),
      sortOrder: Number(row.sort_order ?? 0),
      note: String(row.note ?? ""),
    });
    byCollection.set(cid, list);
  }

  return colRows.map((r) => {
    const base = mapCollectionSummaryRow(r);
    return {
      ...base,
      threads: byCollection.get(base.id) ?? [],
    };
  });
}

export async function listUserBookmarksPaginated(
  userId: string,
  pageRaw = 1,
  pageSizeRaw = 15
): Promise<PaginatedResult<ThreadSummary & { bookmarkedAt: string }>> {
  const { page, pageSize, offset } = normalizePagination(
    pageRaw,
    pageSizeRaw,
    15
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }

  const sql = getSql();
  const fetchRows = (off: number) => sql`
    SELECT
      b.created_at AS bookmarked_at,
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
    FROM public.thread_bookmarks b
    JOIN public.threads t ON t.id = b.thread_id
    JOIN public.profiles p ON p.id = t.author_id
    JOIN public.categories c ON c.id = t.category_id
    WHERE b.user_id = ${userId}
    ORDER BY b.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${off}
  `;

  let effectivePage = page;
  let rows = await fetchRows(offset);
  let totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

  if (rows.length === 0 && page > 1) {
    const countRows = await sql`
      SELECT COUNT(*)::int AS total_count
      FROM public.thread_bookmarks
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

  const items = rows.map((r) => ({
    ...mapThreadSummaryRow(r),
    bookmarkedAt: new Date(String(r.bookmarked_at)).toISOString(),
  }));

  return buildPaginatedResult(items, totalCount, effectivePage, pageSize);
}

const getCachedActiveChallenges = unstable_cache(
  async (limit: number): Promise<ThreadSummary[]> => {
    const sql = getSql();
    const rows = await sql`
      SELECT
        t.id,
        t.title,
        LEFT(t.content, 160) AS content_preview,
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
        c.color AS category_color
      FROM public.threads t
      JOIN public.profiles p ON p.id = t.author_id
      JOIN public.categories c ON c.id = t.category_id
      WHERE t.thread_type = 'challenge'
      ORDER BY
        CASE WHEN t.status = 'open' AND (t.challenge_ends_at IS NULL OR t.challenge_ends_at > NOW()) THEN 0 ELSE 1 END,
        t.challenge_ends_at ASC NULLS LAST,
        t.created_at DESC
      LIMIT ${limit}
    `;
    return rows.map(mapThreadSummaryRow);
  },
  ["forum-active-challenges"],
  { revalidate: 60, tags: [CACHE_TAGS.threads] }
);

export async function listActiveChallenges(limit = 3): Promise<ThreadSummary[]> {
  if (!isDatabaseConfigured()) return [];
  return getCachedActiveChallenges(limit);
}
