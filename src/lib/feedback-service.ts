import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { getSql } from "./db";
import { isDatabaseConfigured } from "./env";
import {
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
} from "./pagination";
import type { FeedbackCategory, FeedbackItem, FeedbackStatus } from "./types";

const ALLOWED_CATEGORIES: FeedbackCategory[] = [
  "bug",
  "feature",
  "ui_ux",
  "other",
];
const ALLOWED_STATUSES: FeedbackStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

async function queryPublicFeedbacksPaginatedFromDb(
  page: number,
  pageSize: number,
  catFilter: FeedbackCategory | null
): Promise<PaginatedResult<FeedbackItem>> {
  const offset = (page - 1) * pageSize;
  const sql = getSql();

  const fetchRows = (off: number) => sql`
    SELECT
      f.id,
      f.user_id,
      COALESCE(p.display_name, NULLIF(f.contact_name, ''), 'Học sinh ẩn danh') AS author_name,
      f.category,
      f.title,
      f.description,
      f.page_url,
      f.image_urls,
      f.status,
      f.admin_reply,
      f.created_at,
      COUNT(*) OVER()::int AS total_count
    FROM public.feedbacks f
    LEFT JOIN public.profiles p ON p.id = f.user_id
    WHERE (${catFilter}::text IS NULL OR f.category = ${catFilter})
    ORDER BY f.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${off}
  `;

  let effectivePage = page;
  let rows = await fetchRows(offset);
  let totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

  if (rows.length === 0 && page > 1) {
    const countRows = await sql`
      SELECT COUNT(*)::int AS total_count
      FROM public.feedbacks f
      WHERE (${catFilter}::text IS NULL OR f.category = ${catFilter})
    `;
    totalCount = Number(countRows[0]?.total_count ?? 0);
    if (totalCount > 0) {
      effectivePage = Math.max(1, Math.ceil(totalCount / pageSize));
      rows = await fetchRows((effectivePage - 1) * pageSize);
    } else {
      effectivePage = 1;
    }
  }

  const items: FeedbackItem[] = rows
    .filter((r) => Boolean(r.id && r.title))
    .map((r) => ({
      id: String(r.id),
      userId: r.user_id ? String(r.user_id) : null,
      authorName: String(r.author_name ?? "Học sinh"),
      category: ALLOWED_CATEGORIES.includes(r.category as FeedbackCategory)
        ? (r.category as FeedbackCategory)
        : "bug",
      title: String(r.title),
      description: String(r.description ?? ""),
      pageUrl: String(r.page_url ?? ""),
      imageUrls: Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [],
      status: ALLOWED_STATUSES.includes(r.status as FeedbackStatus)
        ? (r.status as FeedbackStatus)
        : "open",
      adminReply: String(r.admin_reply ?? ""),
      createdAt: new Date(String(r.created_at)).toISOString(),
    }));

  return buildPaginatedResult(items, totalCount, effectivePage, pageSize);
}

const getCachedPublicFeedbacksPaginated = unstable_cache(
  async (
    page: number,
    pageSize: number,
    catFilter: FeedbackCategory | null
  ) => queryPublicFeedbacksPaginatedFromDb(page, pageSize, catFilter),
  ["public-feedbacks-paginated"],
  { revalidate: 60, tags: [CACHE_TAGS.feedbacks] }
);

export async function listPublicFeedbacksPaginatedCached(params: {
  page?: number;
  pageSize?: number;
  category?: FeedbackCategory | "all";
} = {}): Promise<PaginatedResult<FeedbackItem>> {
  const { page, pageSize } = normalizePagination(
    params.page,
    params.pageSize,
    8
  );
  if (!isDatabaseConfigured()) {
    return buildPaginatedResult([], 0, page, pageSize);
  }
  const catFilter =
    params.category && params.category !== "all" ? params.category : null;
  return getCachedPublicFeedbacksPaginated(page, pageSize, catFilter);
}
