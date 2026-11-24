import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import {
  findNewlyEligibleAwards,
  normalizeBadgeColor,
  normalizeBadgeIcon,
  normalizeCampaignCoverColor,
} from "./campaign-rules";
import { getSql, type SqlRunner } from "./db";
import { isDatabaseConfigured } from "./env";
import { normalizeThreadType } from "./rules";
import type {
  BadgeCollectorPreview,
  BadgeCollectorSummary,
  CampaignAwardItem,
  CampaignBadgePreview,
  CampaignDetail,
  CampaignGrantItem,
  CampaignRewardStatus,
  CampaignSummary,
  CampaignThreadItem,
  PublicBadgeCatalogItem,
  PublicBadgeCollectionData,
  ThreadSummary,
  UnlockedCampaignAwardSummary,
  UserEarnedBadge,
} from "./types";

function parseBadgesPreview(raw: unknown): CampaignBadgePreview[] {
  if (!Array.isArray(raw)) return [];
  const result: CampaignBadgePreview[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (!obj.awardId || !obj.badgeName) continue;
    result.push({
      awardId: String(obj.awardId),
      badgeName: String(obj.badgeName),
      badgeIcon: normalizeBadgeIcon(obj.badgeIcon),
      badgeColor: normalizeBadgeColor(obj.badgeColor),
      requiredCompletedCount: Number(obj.requiredCompletedCount ?? 1),
    });
  }
  return result;
}

function mapCampaignSummaryRow(r: Record<string, unknown>): CampaignSummary {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    description: String(r.description ?? ""),
    coverColor: normalizeCampaignCoverColor(r.cover_color),
    startsAt: new Date(String(r.starts_at)).toISOString(),
    endsAt: new Date(String(r.ends_at)).toISOString(),
    isPublished: Boolean(r.is_published),
    threadCount: Number(r.thread_count ?? 0),
    awardCount: Number(r.award_count ?? 0),
    awardeesCount: Number(r.awardees_count ?? 0),
    badgesPreview: parseBadgesPreview(r.badges_preview),
    createdByName: r.created_by_name ? String(r.created_by_name) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  };
}

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

function mapCampaignAwardRow(r: Record<string, unknown>): CampaignAwardItem {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    title: String(r.title),
    description: String(r.description ?? ""),
    requiredCompletedCount: Number(r.required_completed_count ?? 1),
    bonusPoints: Number(r.bonus_points ?? 0),
    rewardId: r.reward_id ? String(r.reward_id) : null,
    rewardName: r.reward_name ? String(r.reward_name) : null,
    rewardImageUrl: r.reward_image_url ? String(r.reward_image_url) : null,
    badgeName: String(r.badge_name),
    badgeIcon: normalizeBadgeIcon(r.badge_icon),
    badgeColor: normalizeBadgeColor(r.badge_color),
    sortOrder: Number(r.sort_order ?? 0),
    grantedCount: Number(r.granted_count ?? 0),
  };
}

function mapCampaignGrantRow(r: Record<string, unknown>): CampaignGrantItem {
  const rawStatus = String(r.reward_status ?? "none");
  const rewardStatus: CampaignRewardStatus =
    rawStatus === "pending" || rawStatus === "fulfilled" ? rawStatus : "none";
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    awardId: String(r.award_id),
    awardTitle: String(r.award_title),
    badgeName: String(r.badge_name),
    badgeIcon: normalizeBadgeIcon(r.badge_icon),
    badgeColor: normalizeBadgeColor(r.badge_color),
    userId: String(r.user_id),
    userDisplayName: String(r.user_display_name),
    userAvatarUrl: r.user_avatar_url ? String(r.user_avatar_url) : null,
    userGradeLevel: String(r.user_grade_level ?? "THPT"),
    completedCount: Number(r.completed_count ?? 1),
    pointsAwarded: Number(r.points_awarded ?? 0),
    rewardId: r.reward_id ? String(r.reward_id) : null,
    rewardName: r.reward_name ? String(r.reward_name) : null,
    rewardStatus,
    awardedAt: new Date(String(r.awarded_at)).toISOString(),
  };
}

const getCachedPublishedCampaigns = unstable_cache(
  async (): Promise<CampaignSummary[]> => {
    const sql = getSql();
    const rows = await sql`
      SELECT
        c.*,
        p.display_name AS created_by_name,
        COALESCE(ct_stats.thread_count, 0)::int AS thread_count,
        COALESCE(ca_stats.award_count, 0)::int AS award_count,
        COALESCE(ca_stats.badges_preview, '[]'::json) AS badges_preview,
        COALESCE(uca_stats.awardees_count, 0)::int AS awardees_count
      FROM public.campaigns c
      LEFT JOIN public.profiles p ON p.id = c.created_by
      LEFT JOIN (
        SELECT campaign_id, COUNT(*)::int AS thread_count
        FROM public.campaign_threads
        GROUP BY campaign_id
      ) ct_stats ON ct_stats.campaign_id = c.id
      LEFT JOIN (
        SELECT
          campaign_id,
          COUNT(*)::int AS award_count,
          json_agg(
            json_build_object(
              'awardId', id,
              'badgeName', badge_name,
              'badgeIcon', badge_icon,
              'badgeColor', badge_color,
              'requiredCompletedCount', required_completed_count
            )
            ORDER BY required_completed_count ASC, sort_order ASC
          ) AS badges_preview
        FROM public.campaign_awards
        GROUP BY campaign_id
      ) ca_stats ON ca_stats.campaign_id = c.id
      LEFT JOIN (
        SELECT campaign_id, COUNT(DISTINCT user_id)::int AS awardees_count
        FROM public.user_campaign_awards
        GROUP BY campaign_id
      ) uca_stats ON uca_stats.campaign_id = c.id
      WHERE c.is_published = TRUE
      ORDER BY
        CASE
          WHEN NOW() BETWEEN c.starts_at AND c.ends_at THEN 0
          WHEN NOW() < c.starts_at THEN 1
          ELSE 2
        END ASC,
        c.starts_at DESC
      LIMIT 60
    `;
    return rows.map(mapCampaignSummaryRow);
  },
  ["forum-published-campaigns"],
  {
    revalidate: 120,
    tags: [CACHE_TAGS.campaigns, CACHE_TAGS.threads, CACHE_TAGS.rewards],
  }
);

export async function listPublishedCampaigns(): Promise<CampaignSummary[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await getCachedPublishedCampaigns();
  } catch {
    return [];
  }
}

async function fetchCampaignDetailFromDb(
  slug: string,
  includeUnpublished: boolean
): Promise<CampaignDetail | null> {
  const sql = getSql();
  const campRows = await sql`
    SELECT
      c.*,
      p.display_name AS created_by_name,
      (
        SELECT COUNT(DISTINCT uca.user_id)::int
        FROM public.user_campaign_awards uca
        JOIN public.profiles up ON up.id = uca.user_id
        WHERE uca.campaign_id = c.id AND up.is_banned = FALSE
      ) AS exact_awardees_count
    FROM public.campaigns c
    LEFT JOIN public.profiles p ON p.id = c.created_by
    WHERE c.slug = ${slug}
      AND (${includeUnpublished}::boolean OR c.is_published = TRUE)
    LIMIT 1
  `;

  if (campRows.length === 0) return null;
  const camp = campRows[0];
  const campaignId = String(camp.id);

  const [threadRows, awardRows, grantRows] = await Promise.all([
    sql`
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
        cat.id AS category_id,
        cat.slug AS category_slug,
        cat.name AS category_name,
        cat.color AS category_color
      FROM public.campaign_threads ct
      JOIN public.threads t ON t.id = ct.thread_id
      JOIN public.profiles p ON p.id = t.author_id
      JOIN public.categories cat ON cat.id = t.category_id
      WHERE ct.campaign_id = ${campaignId}
      ORDER BY ct.sort_order ASC, ct.added_at ASC
    `,
    sql`
      SELECT
        ca.*,
        r.name AS reward_name,
        r.image_url AS reward_image_url,
        COUNT(uca.id)::int AS granted_count
      FROM public.campaign_awards ca
      LEFT JOIN public.rewards r ON r.id = ca.reward_id
      LEFT JOIN public.user_campaign_awards uca ON uca.award_id = ca.id
      WHERE ca.campaign_id = ${campaignId}
      GROUP BY ca.id, r.name, r.image_url
      ORDER BY ca.required_completed_count ASC, ca.sort_order ASC, ca.created_at ASC
    `,
    sql`
      SELECT
        uca.id,
        uca.campaign_id,
        uca.award_id,
        ca.title AS award_title,
        ca.badge_name,
        ca.badge_icon,
        ca.badge_color,
        uca.user_id,
        p.display_name AS user_display_name,
        p.avatar_url AS user_avatar_url,
        p.grade_level AS user_grade_level,
        uca.completed_count,
        uca.points_awarded,
        uca.reward_id,
        r.name AS reward_name,
        uca.reward_status,
        uca.awarded_at
      FROM public.user_campaign_awards uca
      JOIN public.campaign_awards ca ON ca.id = uca.award_id
      JOIN public.profiles p ON p.id = uca.user_id
      LEFT JOIN public.rewards r ON r.id = uca.reward_id
      WHERE uca.campaign_id = ${campaignId}
        AND p.is_banned = FALSE
      ORDER BY uca.awarded_at DESC
      LIMIT 40
    `,
  ]);

  const items: CampaignThreadItem[] = threadRows.map((r) => ({
    thread: mapThreadSummaryRow(r),
    sortOrder: Number(r.sort_order ?? 0),
    note: String(r.note ?? ""),
    addedAt: new Date(String(r.added_at)).toISOString(),
  }));

  const awards = awardRows.map(mapCampaignAwardRow);
  const recentGrants = grantRows.map(mapCampaignGrantRow);
  const exactAwardeesCount = Number(
    camp.exact_awardees_count ?? new Set(recentGrants.map((g) => g.userId)).size
  );

  return {
    id: campaignId,
    slug: String(camp.slug),
    title: String(camp.title),
    description: String(camp.description ?? ""),
    coverColor: normalizeCampaignCoverColor(camp.cover_color),
    startsAt: new Date(String(camp.starts_at)).toISOString(),
    endsAt: new Date(String(camp.ends_at)).toISOString(),
    isPublished: Boolean(camp.is_published),
    threadCount: items.length,
    awardCount: awards.length,
    awardeesCount: exactAwardeesCount,
    badgesPreview: awards.map((a) => ({
      awardId: a.id,
      badgeName: a.badgeName,
      badgeIcon: a.badgeIcon,
      badgeColor: a.badgeColor,
      requiredCompletedCount: a.requiredCompletedCount,
    })),
    createdByName: camp.created_by_name ? String(camp.created_by_name) : null,
    createdAt: new Date(String(camp.created_at)).toISOString(),
    updatedAt: new Date(String(camp.updated_at)).toISOString(),
    items,
    awards,
    recentGrants,
  };
}

const getCachedPublicCampaignDetail = unstable_cache(
  async (normalizedSlug: string): Promise<CampaignDetail | null> =>
    fetchCampaignDetailFromDb(normalizedSlug, false),
  ["forum-campaign-detail"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.campaigns, CACHE_TAGS.threads, CACHE_TAGS.rewards],
  }
);

export const getCampaignDetailBySlug = cache(
  async (
    slug: string,
    includeUnpublished = false
  ): Promise<CampaignDetail | null> => {
    if (!isDatabaseConfigured()) return null;
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    try {
      if (!includeUnpublished) {
        return await getCachedPublicCampaignDetail(normalized);
      }
      return await fetchCampaignDetailFromDb(normalized, true);
    } catch {
      return null;
    }
  }
);

export interface ViewerCampaignProgress {
  completedThreadIds: string[];
  grantedAwards: Record<
    string,
    { rewardStatus: CampaignRewardStatus; awardedAt: string }
  >;
}

export async function getViewerCampaignProgressBySlug(
  slug: string,
  viewerId: string | null
): Promise<ViewerCampaignProgress> {
  const normalized = slug.trim().toLowerCase();
  if (!isDatabaseConfigured() || !viewerId || !normalized) {
    return { completedThreadIds: [], grantedAwards: {} };
  }
  const sql = getSql();
  const [completedRows, grantedRows] = await Promise.all([
    sql`
      SELECT DISTINCT ct.thread_id
      FROM public.campaigns c
      JOIN public.campaign_threads ct ON ct.campaign_id = c.id
      JOIN public.replies r
        ON r.thread_id = ct.thread_id
       AND r.author_id = ${viewerId}
       AND r.is_accepted = TRUE
      WHERE c.slug = ${normalized}
    `,
    sql`
      SELECT uca.award_id, uca.reward_status, uca.awarded_at
      FROM public.campaigns c
      JOIN public.user_campaign_awards uca ON uca.campaign_id = c.id
      WHERE c.slug = ${normalized}
        AND uca.user_id = ${viewerId}
    `,
  ]);

  const grantedAwards: ViewerCampaignProgress["grantedAwards"] = {};
  for (const row of grantedRows) {
    const raw = String(row.reward_status ?? "none");
    grantedAwards[String(row.award_id)] = {
      rewardStatus:
        raw === "pending" || raw === "fulfilled" ? raw : "none",
      awardedAt: new Date(String(row.awarded_at)).toISOString(),
    };
  }

  return {
    completedThreadIds: completedRows.map((r) => String(r.thread_id)),
    grantedAwards,
  };
}

const getCachedUserEarnedBadges = unstable_cache(
  async (userId: string): Promise<UserEarnedBadge[]> => {
    const sql = getSql();
    const rows = await sql`
      SELECT
        uca.id,
        uca.campaign_id,
        c.slug AS campaign_slug,
        c.title AS campaign_title,
        uca.award_id,
        ca.title AS award_title,
        ca.badge_name,
        ca.badge_icon,
        ca.badge_color,
        uca.points_awarded,
        uca.reward_id,
        r.name AS reward_name,
        uca.reward_status,
        uca.awarded_at
      FROM public.user_campaign_awards uca
      JOIN public.campaigns c ON c.id = uca.campaign_id
      JOIN public.campaign_awards ca ON ca.id = uca.award_id
      LEFT JOIN public.rewards r ON r.id = uca.reward_id
      WHERE uca.user_id = ${userId}
        AND c.is_published = TRUE
      ORDER BY uca.awarded_at DESC
      LIMIT 100
    `;
    return rows.map((r) => {
      const raw = String(r.reward_status ?? "none");
      return {
        id: String(r.id),
        campaignId: String(r.campaign_id),
        campaignSlug: String(r.campaign_slug),
        campaignTitle: String(r.campaign_title),
        awardId: String(r.award_id),
        awardTitle: String(r.award_title),
        badgeName: String(r.badge_name),
        badgeIcon: normalizeBadgeIcon(r.badge_icon),
        badgeColor: normalizeBadgeColor(r.badge_color),
        pointsAwarded: Number(r.points_awarded ?? 0),
        rewardId: r.reward_id ? String(r.reward_id) : null,
        rewardName: r.reward_name ? String(r.reward_name) : null,
        rewardStatus:
          raw === "pending" || raw === "fulfilled" ? raw : "none",
        awardedAt: new Date(String(r.awarded_at)).toISOString(),
      };
    });
  },
  ["forum-user-earned-badges"],
  { revalidate: 60, tags: [CACHE_TAGS.campaigns, CACHE_TAGS.rewards] }
);

export const listUserEarnedBadges = cache(
  async (userId: string): Promise<UserEarnedBadge[]> => {
    if (!isDatabaseConfigured() || !userId) return [];
    try {
      return await getCachedUserEarnedBadges(userId);
    } catch {
      return [];
    }
  }
);

function parseCollectorBadgesPreview(raw: unknown): BadgeCollectorPreview[] {
  if (!Array.isArray(raw)) return [];
  const result: BadgeCollectorPreview[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (!obj.id || !obj.badgeName) continue;
    result.push({
      id: String(obj.id),
      badgeName: String(obj.badgeName),
      badgeIcon: normalizeBadgeIcon(obj.badgeIcon),
      badgeColor: normalizeBadgeColor(obj.badgeColor),
    });
  }
  return result;
}

const getCachedPublicBadgeCollection = unstable_cache(
  async (): Promise<PublicBadgeCollectionData> => {
    const sql = getSql();
    const [badgeRows, collectorRows, [totalsRow]] = await Promise.all([
      sql`
        SELECT
          ca.id AS award_id,
          ca.campaign_id,
          c.slug AS campaign_slug,
          c.title AS campaign_title,
          c.starts_at AS campaign_starts_at,
          c.ends_at AS campaign_ends_at,
          ca.title AS award_title,
          ca.description AS award_description,
          ca.required_completed_count,
          ca.bonus_points,
          r.name AS reward_name,
          ca.badge_name,
          ca.badge_icon,
          ca.badge_color,
          COUNT(DISTINCT uca.user_id) FILTER (WHERE p.is_banned = FALSE)::int AS granted_count
        FROM public.campaign_awards ca
        JOIN public.campaigns c ON c.id = ca.campaign_id
        LEFT JOIN public.rewards r ON r.id = ca.reward_id
        LEFT JOIN public.user_campaign_awards uca ON uca.award_id = ca.id
        LEFT JOIN public.profiles p ON p.id = uca.user_id
        WHERE c.is_published = TRUE
        GROUP BY ca.id, c.id, r.name
        ORDER BY
          CASE
            WHEN c.starts_at <= NOW() AND c.ends_at >= NOW() THEN 0
            WHEN c.starts_at > NOW() THEN 1
            ELSE 2
          END ASC,
          c.starts_at DESC,
          ca.required_completed_count ASC,
          ca.sort_order ASC
      `,
      sql`
        SELECT
          p.id AS user_id,
          p.display_name,
          p.nickname,
          p.avatar_url,
          p.grade_level,
          COUNT(uca.id)::int AS badge_count,
          COALESCE(SUM(uca.points_awarded), 0)::int AS total_bonus_points,
          COALESCE(
            (
              SELECT json_agg(sub)
              FROM (
                SELECT
                  u2.id,
                  a2.badge_name AS "badgeName",
                  a2.badge_icon AS "badgeIcon",
                  a2.badge_color AS "badgeColor"
                FROM public.user_campaign_awards u2
                JOIN public.campaigns c2 ON c2.id = u2.campaign_id
                JOIN public.campaign_awards a2 ON a2.id = u2.award_id
                WHERE u2.user_id = p.id
                  AND c2.is_published = TRUE
                ORDER BY u2.awarded_at DESC
                LIMIT 4
              ) sub
            ),
            '[]'::json
          ) AS recent_badges
        FROM public.user_campaign_awards uca
        JOIN public.campaigns c ON c.id = uca.campaign_id
        JOIN public.profiles p ON p.id = uca.user_id
        WHERE c.is_published = TRUE
          AND p.is_banned = FALSE
        GROUP BY p.id
        ORDER BY badge_count DESC, total_bonus_points DESC, MAX(uca.awarded_at) DESC
        LIMIT 12
      `,
      sql`
        SELECT
          COUNT(uca.id)::int AS total_grants_count,
          COUNT(DISTINCT uca.user_id)::int AS total_awardees_count
        FROM public.user_campaign_awards uca
        JOIN public.campaigns c ON c.id = uca.campaign_id
        JOIN public.profiles p ON p.id = uca.user_id
        WHERE c.is_published = TRUE
          AND p.is_banned = FALSE
      `,
    ]);

    const badges: PublicBadgeCatalogItem[] = badgeRows.map((r) => ({
      awardId: String(r.award_id),
      campaignId: String(r.campaign_id),
      campaignSlug: String(r.campaign_slug),
      campaignTitle: String(r.campaign_title),
      campaignStartsAt: new Date(String(r.campaign_starts_at)).toISOString(),
      campaignEndsAt: new Date(String(r.campaign_ends_at)).toISOString(),
      awardTitle: String(r.award_title),
      awardDescription: String(r.award_description ?? ""),
      requiredCompletedCount: Number(r.required_completed_count ?? 1),
      bonusPoints: Number(r.bonus_points ?? 0),
      rewardName: r.reward_name ? String(r.reward_name) : null,
      badgeName: String(r.badge_name),
      badgeIcon: normalizeBadgeIcon(r.badge_icon),
      badgeColor: normalizeBadgeColor(r.badge_color),
      grantedCount: Number(r.granted_count ?? 0),
    }));

    const collectors: BadgeCollectorSummary[] = collectorRows.map((r) => ({
      userId: String(r.user_id),
      displayName: String(r.display_name),
      nickname: String(r.nickname ?? ""),
      avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
      gradeLevel: String(r.grade_level ?? "THPT"),
      badgeCount: Number(r.badge_count ?? 0),
      totalBonusPoints: Number(r.total_bonus_points ?? 0),
      recentBadges: parseCollectorBadgesPreview(r.recent_badges),
    }));

    return {
      badges,
      collectors,
      totalGrantsCount: Number(totalsRow?.total_grants_count ?? 0),
      totalAwardeesCount: Number(totalsRow?.total_awardees_count ?? 0),
    };
  },
  ["forum-public-badge-collection"],
  { revalidate: 120, tags: [CACHE_TAGS.campaigns, CACHE_TAGS.rewards] }
);

export const listPublicBadgeCollection = cache(
  async (): Promise<PublicBadgeCollectionData> => {
    if (!isDatabaseConfigured()) {
      return {
        badges: [],
        collectors: [],
        totalGrantsCount: 0,
        totalAwardeesCount: 0,
      };
    }
    try {
      return await getCachedPublicBadgeCollection();
    } catch {
      return {
        badges: [],
        collectors: [],
        totalGrantsCount: 0,
        totalAwardeesCount: 0,
      };
    }
  }
);

export async function listViewerEarnedAwardIds(
  viewerId: string | null
): Promise<string[]> {
  if (!isDatabaseConfigured() || !viewerId) return [];
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT uca.award_id
      FROM public.user_campaign_awards uca
      JOIN public.campaigns c ON c.id = uca.campaign_id
      WHERE uca.user_id = ${viewerId}
        AND c.is_published = TRUE
    `;
    return rows.map((r) => String(r.award_id));
  } catch {
    return [];
  }
}

export interface AdminCampaignItem extends CampaignSummary {
  totalGrantsCount: number;
  pendingGiftsCount: number;
  threads: {
    threadId: string;
    title: string;
    threadType: string;
    status: string;
    bountyPoints: number;
    sortOrder: number;
    note: string;
  }[];
  awards: CampaignAwardItem[];
  grants: CampaignGrantItem[];
}

export interface AdminCampaignsPayload {
  campaigns: AdminCampaignItem[];
  shopRewards: { id: string; name: string; pointsCost: number; stock: number }[];
  selectableThreads: {
    id: string;
    title: string;
    threadType: string;
    status: string;
    bountyPoints: number;
  }[];
  selectableStudents: {
    id: string;
    displayName: string;
    email: string;
    gradeLevel: string;
  }[];
}

/**
 * Tải toàn bộ dữ liệu quản trị Campaign–Award–Badge theo kiểu batched (6 truy vấn phẳng song song, 0 N+1).
 */
export async function listCampaignsForAdmin(): Promise<AdminCampaignsPayload> {
  if (!isDatabaseConfigured()) {
    return {
      campaigns: [],
      shopRewards: [],
      selectableThreads: [],
      selectableStudents: [],
    };
  }
  const sql = getSql();

  const [campRows, rewardRows, threadRows, studentRows] = await Promise.all([
    sql`
      SELECT
        c.*,
        p.display_name AS created_by_name,
        COALESCE(gs.total_grants, 0)::int AS total_grants_count,
        COALESCE(gs.awardees_count, 0)::int AS exact_awardees_count,
        COALESCE(gs.pending_gifts, 0)::int AS pending_gifts_count
      FROM public.campaigns c
      LEFT JOIN public.profiles p ON p.id = c.created_by
      LEFT JOIN (
        SELECT
          campaign_id,
          COUNT(*)::int AS total_grants,
          COUNT(DISTINCT user_id)::int AS awardees_count,
          COUNT(*) FILTER (WHERE reward_status = 'pending')::int AS pending_gifts
        FROM public.user_campaign_awards
        GROUP BY campaign_id
      ) gs ON gs.campaign_id = c.id
      ORDER BY c.starts_at DESC, c.created_at DESC
      LIMIT 60
    `,
    sql`
      SELECT id, name, points_cost, stock
      FROM public.rewards
      WHERE is_active = TRUE
      ORDER BY points_cost ASC, name ASC
      LIMIT 100
    `,
    sql`
      SELECT t.id, t.title, t.thread_type, t.status, t.bounty_points
      FROM public.threads t
      JOIN public.profiles p ON p.id = t.author_id
      WHERE t.thread_type = 'challenge' OR p.role = 'admin'
      ORDER BY
        CASE WHEN t.thread_type = 'challenge' THEN 0 ELSE 1 END ASC,
        t.created_at DESC
      LIMIT 100
    `,
    sql`
      SELECT id, display_name, email, grade_level
      FROM public.profiles
      WHERE is_banned = FALSE
      ORDER BY display_name ASC
      LIMIT 200
    `,
  ]);

  const campIds = campRows.map((c) => String(c.id));
  const [linkRows, awardRows, grantRows] =
    campIds.length > 0
      ? await Promise.all([
          sql`
            SELECT
              ct.campaign_id,
              ct.thread_id,
              ct.sort_order,
              ct.note,
              t.title,
              t.thread_type,
              t.status,
              t.bounty_points
            FROM public.campaign_threads ct
            JOIN public.threads t ON t.id = ct.thread_id
            WHERE ct.campaign_id = ANY(${sql.array(campIds)}::uuid[])
            ORDER BY ct.sort_order ASC, ct.added_at ASC
          `,
          sql`
            SELECT
              ca.*,
              r.name AS reward_name,
              r.image_url AS reward_image_url,
              COUNT(uca.id)::int AS granted_count
            FROM public.campaign_awards ca
            LEFT JOIN public.rewards r ON r.id = ca.reward_id
            LEFT JOIN public.user_campaign_awards uca ON uca.award_id = ca.id
            WHERE ca.campaign_id = ANY(${sql.array(campIds)}::uuid[])
            GROUP BY ca.id, r.name, r.image_url
            ORDER BY ca.required_completed_count ASC, ca.sort_order ASC, ca.created_at ASC
          `,
          sql`
            SELECT
              uca.id,
              uca.campaign_id,
              uca.award_id,
              ca.title AS award_title,
              ca.badge_name,
              ca.badge_icon,
              ca.badge_color,
              uca.user_id,
              p.display_name AS user_display_name,
              p.avatar_url AS user_avatar_url,
              p.grade_level AS user_grade_level,
              uca.completed_count,
              uca.points_awarded,
              uca.reward_id,
              r.name AS reward_name,
              uca.reward_status,
              uca.awarded_at
            FROM public.user_campaign_awards uca
            JOIN public.campaign_awards ca ON ca.id = uca.award_id
            JOIN public.profiles p ON p.id = uca.user_id
            LEFT JOIN public.rewards r ON r.id = uca.reward_id
            WHERE uca.campaign_id = ANY(${sql.array(campIds)}::uuid[])
            ORDER BY uca.awarded_at DESC
            LIMIT 500
          `,
        ])
      : [[], [], []];

  const threadsByCampaign = new Map<string, AdminCampaignItem["threads"]>();
  for (const r of linkRows) {
    const cid = String(r.campaign_id);
    const list = threadsByCampaign.get(cid) ?? [];
    list.push({
      threadId: String(r.thread_id),
      title: String(r.title),
      threadType: String(r.thread_type),
      status: String(r.status),
      bountyPoints: Number(r.bounty_points ?? 0),
      sortOrder: Number(r.sort_order ?? 0),
      note: String(r.note ?? ""),
    });
    threadsByCampaign.set(cid, list);
  }

  const awardsByCampaign = new Map<string, CampaignAwardItem[]>();
  for (const r of awardRows) {
    const cid = String(r.campaign_id);
    const list = awardsByCampaign.get(cid) ?? [];
    list.push(mapCampaignAwardRow(r));
    awardsByCampaign.set(cid, list);
  }

  const grantsByCampaign = new Map<string, CampaignGrantItem[]>();
  for (const r of grantRows) {
    const cid = String(r.campaign_id);
    const list = grantsByCampaign.get(cid) ?? [];
    list.push(mapCampaignGrantRow(r));
    grantsByCampaign.set(cid, list);
  }

  const campaigns: AdminCampaignItem[] = campRows.map((c) => {
    const cid = String(c.id);
    const threads = threadsByCampaign.get(cid) ?? [];
    const awards = awardsByCampaign.get(cid) ?? [];
    const grants = grantsByCampaign.get(cid) ?? [];
    return {
      id: cid,
      slug: String(c.slug),
      title: String(c.title),
      description: String(c.description ?? ""),
      coverColor: normalizeCampaignCoverColor(c.cover_color),
      startsAt: new Date(String(c.starts_at)).toISOString(),
      endsAt: new Date(String(c.ends_at)).toISOString(),
      isPublished: Boolean(c.is_published),
      threadCount: threads.length,
      awardCount: awards.length,
      awardeesCount: Number(c.exact_awardees_count ?? 0),
      totalGrantsCount: Number(c.total_grants_count ?? grants.length),
      pendingGiftsCount: Number(c.pending_gifts_count ?? 0),
      badgesPreview: awards.map((a) => ({
        awardId: a.id,
        badgeName: a.badgeName,
        badgeIcon: a.badgeIcon,
        badgeColor: a.badgeColor,
        requiredCompletedCount: a.requiredCompletedCount,
      })),
      createdByName: c.created_by_name ? String(c.created_by_name) : null,
      createdAt: new Date(String(c.created_at)).toISOString(),
      updatedAt: new Date(String(c.updated_at)).toISOString(),
      threads,
      awards,
      grants,
    };
  });

  return {
    campaigns,
    shopRewards: rewardRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      pointsCost: Number(r.points_cost ?? 0),
      stock: Number(r.stock ?? 0),
    })),
    selectableThreads: threadRows.map((t) => ({
      id: String(t.id),
      title: String(t.title),
      threadType: String(t.thread_type),
      status: String(t.status),
      bountyPoints: Number(t.bounty_points ?? 0),
    })),
    selectableStudents: studentRows.map((s) => ({
      id: String(s.id),
      displayName: String(s.display_name),
      email: String(s.email),
      gradeLevel: String(s.grade_level ?? "THPT"),
    })),
  };
}

/**
 * Động cơ tự động xét & trao Award + Badge nguyên tử bên trong Transaction hiện hành
 * ngay khi Admin phê duyệt lời giải của học sinh trong bài thuộc Campaign đang diễn ra.
 * - Chi phí cực thấp cho bài không thuộc Campaign (1 truy vấn index duy nhất, thoát ngay).
 * - Chống trao trùng tuyệt đối nhờ `UNIQUE (award_id, user_id)` + `ON CONFLICT DO NOTHING`.
 */
export async function evaluateAndGrantCampaignAwardsTx(
  tx: SqlRunner,
  params: {
    threadId: string;
    solverId: string;
    actorId: string;
  }
): Promise<UnlockedCampaignAwardSummary[]> {
  const activeCampaigns = await tx`
    SELECT c.id, c.slug, c.title
    FROM public.campaign_threads ct
    JOIN public.campaigns c ON c.id = ct.campaign_id
    WHERE ct.thread_id = ${params.threadId}
      AND c.is_published = TRUE
      AND NOW() BETWEEN c.starts_at AND c.ends_at
  `;

  if (activeCampaigns.length === 0) {
    return [];
  }

  const campaignIds = activeCampaigns.map((c) => String(c.id));
  const campaignMeta = new Map(
    activeCampaigns.map((c) => [
      String(c.id),
      { slug: String(c.slug), title: String(c.title) },
    ])
  );

  // Chạy tuần tự trên cùng 1 PoolClient trong Transaction (tránh pipelining trên 1 socket pg@8)
  const campaignIdsParam = tx.array(campaignIds);
  const progressRows = await tx`
    SELECT ct.campaign_id, COUNT(DISTINCT ct.thread_id)::int AS completed_count
    FROM public.campaign_threads ct
    JOIN public.replies r
      ON r.thread_id = ct.thread_id
     AND r.author_id = ${params.solverId}
     AND r.is_accepted = TRUE
    WHERE ct.campaign_id = ANY(${campaignIdsParam}::uuid[])
    GROUP BY ct.campaign_id
  `;
  const awardRows = await tx`
    SELECT
      ca.id,
      ca.campaign_id,
      ca.title,
      ca.required_completed_count,
      ca.bonus_points,
      ca.reward_id,
      r.name AS reward_name,
      ca.badge_name
    FROM public.campaign_awards ca
    LEFT JOIN public.rewards r ON r.id = ca.reward_id
    WHERE ca.campaign_id = ANY(${campaignIdsParam}::uuid[])
    ORDER BY ca.required_completed_count ASC, ca.sort_order ASC
  `;
  const existingGrantRows = await tx`
    SELECT award_id
    FROM public.user_campaign_awards
    WHERE campaign_id = ANY(${campaignIdsParam}::uuid[])
      AND user_id = ${params.solverId}
  `;

  const completedByCampaign = new Map<string, number>();
  for (const row of progressRows) {
    completedByCampaign.set(
      String(row.campaign_id),
      Number(row.completed_count ?? 0)
    );
  }

  const alreadyGrantedIds = new Set(
    existingGrantRows.map((r) => String(r.award_id))
  );

  const awardsByCampaign = new Map<
    string,
    {
      id: string;
      campaignId: string;
      title: string;
      requiredCompletedCount: number;
      bonusPoints: number;
      rewardId: string | null;
      rewardName: string | null;
      badgeName: string;
    }[]
  >();

  for (const row of awardRows) {
    const cid = String(row.campaign_id);
    const list = awardsByCampaign.get(cid) ?? [];
    list.push({
      id: String(row.id),
      campaignId: cid,
      title: String(row.title),
      requiredCompletedCount: Number(row.required_completed_count ?? 1),
      bonusPoints: Number(row.bonus_points ?? 0),
      rewardId: row.reward_id ? String(row.reward_id) : null,
      rewardName: row.reward_name ? String(row.reward_name) : null,
      badgeName: String(row.badge_name),
    });
    awardsByCampaign.set(cid, list);
  }

  const unlocked: UnlockedCampaignAwardSummary[] = [];
  let totalBonusPoints = 0;

  for (const cid of campaignIds) {
    const completedCount = completedByCampaign.get(cid) ?? 0;
    const candidates = awardsByCampaign.get(cid) ?? [];
    const newlyEligible = findNewlyEligibleAwards(
      candidates,
      completedCount,
      alreadyGrantedIds
    );
    const meta = campaignMeta.get(cid);
    if (!meta) continue;

    for (const award of newlyEligible) {
      const rewardStatus: CampaignRewardStatus = award.rewardId
        ? "pending"
        : "none";

      const inserted = await tx`
        INSERT INTO public.user_campaign_awards (
          campaign_id,
          award_id,
          user_id,
          completed_count,
          points_awarded,
          reward_id,
          reward_status,
          awarded_by
        )
        VALUES (
          ${cid},
          ${award.id},
          ${params.solverId},
          ${completedCount},
          ${award.bonusPoints},
          ${award.rewardId},
          ${rewardStatus},
          ${params.actorId}
        )
        ON CONFLICT (award_id, user_id) DO NOTHING
        RETURNING id
      `;

      if (inserted.length === 0) continue;

      if (award.bonusPoints > 0) {
        totalBonusPoints += award.bonusPoints;
        await tx`
          INSERT INTO public.point_transactions (
            user_id,
            amount,
            type,
            reason,
            reference_id,
            created_by
          )
          VALUES (
            ${params.solverId},
            ${award.bonusPoints},
            'campaign_award',
            ${`Đạt giải "${award.title}" (Huy hiệu ${award.badgeName}) tại chiến dịch "${meta.title.slice(0, 60)}"`},
            ${award.id},
            ${params.actorId}
          )
        `;
      }

      unlocked.push({
        campaignId: cid,
        campaignSlug: meta.slug,
        campaignTitle: meta.title,
        awardId: award.id,
        awardTitle: award.title,
        badgeName: award.badgeName,
        bonusPoints: award.bonusPoints,
        rewardName: award.rewardName,
      });
    }
  }

  if (totalBonusPoints > 0) {
    await tx`
      UPDATE public.profiles
      SET
        points_balance = points_balance + ${totalBonusPoints},
        total_earned_points = total_earned_points + ${totalBonusPoints},
        updated_at = NOW()
      WHERE id = ${params.solverId}
    `;
  }

  return unlocked;
}
