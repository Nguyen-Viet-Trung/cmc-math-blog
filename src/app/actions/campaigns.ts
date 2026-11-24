"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import {
  buildSafeActivitySummary,
  deleteActivitiesForAward,
  deleteActivitiesForCampaign,
  recordActivity,
} from "@/lib/activity-service";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  slugifyCampaignTitle,
  validateCampaignAwardInput,
  validateCampaignInput,
} from "@/lib/campaign-rules";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { createNotification } from "@/lib/notifications";
import type { CampaignRewardStatus } from "@/lib/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  if (!isDatabaseConfigured()) {
    throw new Error("Chưa kết nối cơ sở dữ liệu Supabase.");
  }
  const user = await getCurrentUserProfile();
  if (!user || user.role !== "admin") {
    throw new Error("Chỉ Quản trị viên mới có quyền quản lý Giải đấu & Huy hiệu.");
  }
  return user;
}

function revalidateCampaignPaths(slug?: string, userId?: string) {
  revalidateTag(CACHE_TAGS.campaigns);
  revalidateTag(CACHE_TAGS.leaderboard);
  revalidateTag(CACHE_TAGS.activities);
  revalidatePath("/campaigns");
  revalidatePath("/badges");
  revalidatePath("/activity");
  if (slug) {
    revalidatePath(`/campaigns/${slug}`);
  } else {
    revalidatePath("/campaigns/[slug]", "page");
  }
  revalidatePath("/admin");
  revalidatePath("/profile");
  revalidatePath("/leaderboard");
  if (userId) {
    revalidatePath(`/members/${userId}`);
  } else {
    revalidatePath("/members/[id]", "page");
  }
}

export async function upsertCampaignAction(input: {
  id?: string;
  title: string;
  description: string;
  coverColor: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
}): Promise<{ ok: boolean; slug?: string; error?: string }> {
  try {
    const admin = await requireAdmin();
    const check = validateCampaignInput(input);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    const sql = getSql();
    if (input.id) {
      if (!UUID_REGEX.test(input.id)) {
        return { ok: false, error: "Mã giải đấu không hợp lệ." };
      }
      const prevRows = await sql`
        SELECT is_published FROM public.campaigns WHERE id = ${input.id} LIMIT 1
      `;
      if (prevRows.length === 0) {
        return { ok: false, error: "Không tìm thấy giải đấu cần cập nhật." };
      }
      const wasPublished = Boolean(prevRows[0].is_published);

      const rows = await sql`
        UPDATE public.campaigns
        SET
          title = ${check.title},
          description = ${check.description},
          cover_color = ${check.coverColor},
          starts_at = ${check.startsAtIso}::timestamptz,
          ends_at = ${check.endsAtIso}::timestamptz,
          is_published = ${Boolean(input.isPublished)},
          updated_at = NOW()
        WHERE id = ${input.id}
        RETURNING id, slug
      `;
      if (rows.length === 0) {
        return { ok: false, error: "Không tìm thấy giải đấu cần cập nhật." };
      }
      const slug = String(rows[0].slug);
      const campaignId = String(rows[0].id);
      if (!wasPublished && Boolean(input.isPublished)) {
        await recordActivity({
          actorId: admin.id,
          eventType: "campaign_launched",
          targetType: "campaign",
          targetId: campaignId,
          title: check.title,
          summary: buildSafeActivitySummary(check.description),
          href: `/campaigns/${slug}`,
          metadata: {
            slug,
            startsAt: check.startsAtIso,
            endsAt: check.endsAtIso,
          },
        });
      } else if (wasPublished && !Boolean(input.isPublished)) {
        await deleteActivitiesForCampaign(campaignId);
      }
      revalidateCampaignPaths(slug);
      return { ok: true, slug };
    }

    const baseSlug = slugifyCampaignTitle(check.title);
    const existing = await sql`
      SELECT slug FROM public.campaigns
      WHERE slug = ${baseSlug} OR slug LIKE ${`${baseSlug}-%`}
    `;
    const taken = new Set(existing.map((r) => String(r.slug)));
    let slug = baseSlug;
    let suffix = 2;
    while (taken.has(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const inserted = await sql`
      INSERT INTO public.campaigns (
        slug,
        title,
        description,
        cover_color,
        starts_at,
        ends_at,
        is_published,
        created_by
      )
      VALUES (
        ${slug},
        ${check.title},
        ${check.description},
        ${check.coverColor},
        ${check.startsAtIso}::timestamptz,
        ${check.endsAtIso}::timestamptz,
        ${Boolean(input.isPublished)},
        ${admin.id}
      )
      RETURNING id
    `;

    const campaignId = String(inserted[0].id);
    if (Boolean(input.isPublished)) {
      await recordActivity({
        actorId: admin.id,
        eventType: "campaign_launched",
        targetType: "campaign",
        targetId: campaignId,
        title: check.title,
        summary: buildSafeActivitySummary(check.description),
        href: `/campaigns/${slug}`,
        metadata: {
          slug,
          startsAt: check.startsAtIso,
          endsAt: check.endsAtIso,
        },
      });
    }

    revalidateCampaignPaths(slug);
    return { ok: true, slug };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể lưu giải đấu.",
    };
  }
}

export async function deleteCampaignAction(
  campaignId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!UUID_REGEX.test(campaignId)) {
      return { ok: false, error: "Mã giải đấu không hợp lệ." };
    }
    const sql = getSql();
    const rows = await sql`
      DELETE FROM public.campaigns WHERE id = ${campaignId} RETURNING slug
    `;
    if (rows.length === 0) {
      return { ok: false, error: "Không tìm thấy giải đấu cần xóa." };
    }
    await deleteActivitiesForCampaign(campaignId);
    revalidateCampaignPaths(String(rows[0].slug));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể xóa giải đấu.",
    };
  }
}

export async function addThreadToCampaignAction(input: {
  campaignId: string;
  threadId: string;
  sortOrder?: number;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (
      !UUID_REGEX.test(input.campaignId) ||
      !UUID_REGEX.test(input.threadId)
    ) {
      return { ok: false, error: "Mã giải đấu hoặc mã bài viết không hợp lệ." };
    }
    const sortOrder = Math.trunc(Number(input.sortOrder ?? 0));
    const note = (input.note ?? "").trim().slice(0, 200);

    const sql = getSql();
    const threadRows = await sql`
      SELECT t.thread_type, p.role AS author_role
      FROM public.threads t
      JOIN public.profiles p ON p.id = t.author_id
      WHERE t.id = ${input.threadId}
      LIMIT 1
    `;
    if (threadRows.length === 0) {
      return { ok: false, error: "Không tìm thấy bài viết cần gắn vào giải đấu." };
    }
    const tType = String(threadRows[0].thread_type);
    const authorRole = String(threadRows[0].author_role);
    if (tType !== "challenge" && authorRole !== "admin") {
      return {
        ok: false,
        error:
          "Chỉ được gắn bài Thử thách Tuần hoặc bài do Ban Quản Trị đăng vào Giải đấu để đảm bảo chỉ Admin duyệt lời giải.",
      };
    }

    await sql`
      INSERT INTO public.campaign_threads (campaign_id, thread_id, sort_order, note)
      VALUES (${input.campaignId}, ${input.threadId}, ${Number.isFinite(sortOrder) ? sortOrder : 0}, ${note})
      ON CONFLICT (campaign_id, thread_id) DO UPDATE SET
        sort_order = EXCLUDED.sort_order,
        note = EXCLUDED.note
    `;
    await sql`
      UPDATE public.campaigns SET updated_at = NOW() WHERE id = ${input.campaignId}
    `;

    revalidateCampaignPaths();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Không thể gắn bài thử thách vào giải đấu.",
    };
  }
}

export async function removeThreadFromCampaignAction(input: {
  campaignId: string;
  threadId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (
      !UUID_REGEX.test(input.campaignId) ||
      !UUID_REGEX.test(input.threadId)
    ) {
      return { ok: false, error: "Tham số không hợp lệ." };
    }
    const sql = getSql();
    await sql`
      DELETE FROM public.campaign_threads
      WHERE campaign_id = ${input.campaignId} AND thread_id = ${input.threadId}
    `;
    await sql`
      UPDATE public.campaigns SET updated_at = NOW() WHERE id = ${input.campaignId}
    `;

    revalidateCampaignPaths();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không thể gỡ bài khỏi giải đấu.",
    };
  }
}

export async function upsertCampaignAwardAction(input: {
  id?: string;
  campaignId: string;
  title: string;
  description: string;
  requiredCompletedCount: number;
  bonusPoints: number;
  rewardId: string | null;
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  sortOrder?: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!UUID_REGEX.test(input.campaignId)) {
      return { ok: false, error: "Mã giải đấu không hợp lệ." };
    }
    const check = validateCampaignAwardInput(input);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }

    const rewardId =
      input.rewardId && UUID_REGEX.test(input.rewardId) ? input.rewardId : null;

    const sql = getSql();
    if (input.id) {
      if (!UUID_REGEX.test(input.id)) {
        return { ok: false, error: "Mã Award không hợp lệ." };
      }
      const updated = await sql`
        UPDATE public.campaign_awards
        SET
          title = ${check.title},
          description = ${check.description},
          required_completed_count = ${check.requiredCompletedCount},
          bonus_points = ${check.bonusPoints},
          reward_id = ${rewardId},
          badge_name = ${check.badgeName},
          badge_icon = ${check.badgeIcon},
          badge_color = ${check.badgeColor},
          sort_order = ${check.sortOrder},
          updated_at = NOW()
        WHERE id = ${input.id} AND campaign_id = ${input.campaignId}
        RETURNING id
      `;
      if (updated.length === 0) {
        return { ok: false, error: "Không tìm thấy Award cần cập nhật." };
      }
    } else {
      await sql`
        INSERT INTO public.campaign_awards (
          campaign_id,
          title,
          description,
          required_completed_count,
          bonus_points,
          reward_id,
          badge_name,
          badge_icon,
          badge_color,
          sort_order
        )
        VALUES (
          ${input.campaignId},
          ${check.title},
          ${check.description},
          ${check.requiredCompletedCount},
          ${check.bonusPoints},
          ${rewardId},
          ${check.badgeName},
          ${check.badgeIcon},
          ${check.badgeColor},
          ${check.sortOrder}
        )
      `;
    }

    await sql`
      UPDATE public.campaigns SET updated_at = NOW() WHERE id = ${input.campaignId}
    `;
    revalidateCampaignPaths();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể lưu Award & Badge.",
    };
  }
}

export async function deleteCampaignAwardAction(
  awardId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!UUID_REGEX.test(awardId)) {
      return { ok: false, error: "Mã Award không hợp lệ." };
    }
    const sql = getSql();
    const deleted = await sql`
      DELETE FROM public.campaign_awards
      WHERE id = ${awardId}
      RETURNING campaign_id
    `;
    if (deleted.length === 0) {
      return { ok: false, error: "Không tìm thấy mốc Award cần xóa." };
    }
    await sql`
      UPDATE public.campaigns
      SET updated_at = NOW()
      WHERE id = ${deleted[0].campaign_id}
    `;
    await deleteActivitiesForAward(awardId);
    revalidateCampaignPaths();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Không thể xóa Award lúc này.",
    };
  }
}

/**
 * Giáo viên chủ động trao một Award + Badge cụ thể cho học sinh (VD giải đặc biệt hoặc tổng kết).
 */
export async function grantCampaignAwardManuallyAction(input: {
  campaignId: string;
  awardId: string;
  userId: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (
      !UUID_REGEX.test(input.campaignId) ||
      !UUID_REGEX.test(input.awardId) ||
      !UUID_REGEX.test(input.userId)
    ) {
      return { ok: false, error: "Tham số trao thưởng không hợp lệ." };
    }

    const sql = getSql();
    const res = await sql.begin(async (tx) => {
      const awardRows = await tx`
        SELECT
          ca.*,
          c.slug AS campaign_slug,
          c.title AS campaign_title,
          r.name AS reward_name
        FROM public.campaign_awards ca
        JOIN public.campaigns c ON c.id = ca.campaign_id
        LEFT JOIN public.rewards r ON r.id = ca.reward_id
        WHERE ca.id = ${input.awardId} AND ca.campaign_id = ${input.campaignId}
        LIMIT 1
      `;
      if (awardRows.length === 0) {
        throw new Error("Không tìm thấy mốc Award trong giải đấu này.");
      }
      const award = awardRows[0];

      const userRows = await tx`
        SELECT id, display_name, is_banned
        FROM public.profiles
        WHERE id = ${input.userId}
        FOR UPDATE
      `;
      if (userRows.length === 0) {
        throw new Error("Không tìm thấy tài khoản học sinh.");
      }
      if (userRows[0].is_banned) {
        throw new Error("Không thể trao giải cho tài khoản đang bị khóa.");
      }

      const progressRows = await tx`
        SELECT COUNT(DISTINCT ct.thread_id)::int AS completed_count
        FROM public.campaign_threads ct
        JOIN public.replies r
          ON r.thread_id = ct.thread_id
         AND r.author_id = ${input.userId}
         AND r.is_accepted = TRUE
        WHERE ct.campaign_id = ${input.campaignId}
      `;
      const completedCount = Number(progressRows[0]?.completed_count ?? 0);
      const bonusPoints = Number(award.bonus_points ?? 0);
      const rewardId = award.reward_id ? String(award.reward_id) : null;
      const rewardStatus: CampaignRewardStatus = rewardId ? "pending" : "none";

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
          ${input.campaignId},
          ${input.awardId},
          ${input.userId},
          ${completedCount},
          ${bonusPoints},
          ${rewardId},
          ${rewardStatus},
          ${admin.id}
        )
        ON CONFLICT (award_id, user_id) DO NOTHING
        RETURNING id
      `;

      if (inserted.length === 0) {
        throw new Error("Học sinh này đã nhận Award & Huy hiệu này trước đó rồi.");
      }

      if (bonusPoints > 0) {
        await tx`
          UPDATE public.profiles
          SET
            points_balance = points_balance + ${bonusPoints},
            total_earned_points = total_earned_points + ${bonusPoints},
            updated_at = NOW()
          WHERE id = ${input.userId}
        `;
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
            ${input.userId},
            ${bonusPoints},
            'campaign_award',
            ${`Ban Quản Trị trao giải "${String(award.title)}" (Huy hiệu ${String(award.badge_name)}) tại "${String(award.campaign_title).slice(0, 60)}"`},
            ${input.awardId},
            ${admin.id}
          )
        `;
      }

      return {
        studentName: String(userRows[0].display_name),
        campaignSlug: String(award.campaign_slug),
        campaignTitle: String(award.campaign_title),
        awardTitle: String(award.title),
        badgeName: String(award.badge_name),
        bonusPoints,
        rewardName: award.reward_name ? String(award.reward_name) : null,
      };
    });

    const bonusNote =
      res.bonusPoints > 0 ? ` (+${res.bonusPoints} điểm)` : "";
    const giftNote = res.rewardName ? ` · Quà tặng: ${res.rewardName}` : "";

    await recordActivity({
      actorId: input.userId,
      eventType: "badge_earned",
      targetType: "award",
      targetId: input.awardId,
      title: res.badgeName,
      summary: `${res.awardTitle} — ${res.campaignTitle}${bonusNote}`,
      href: `/campaigns/${res.campaignSlug}`,
      metadata: {
        campaignId: input.campaignId,
        campaignSlug: res.campaignSlug,
        campaignTitle: res.campaignTitle,
        awardTitle: res.awardTitle,
        bonusPoints: res.bonusPoints,
      },
    });

    after(async () => {
      await createNotification({
        userId: input.userId,
        type: "campaign_award",
        title: `Chúc mừng! Bạn nhận Huy hiệu "${res.badgeName}"${bonusNote}`,
        body: `${res.awardTitle} — ${res.campaignTitle}${giftNote}`,
        href: `/campaigns/${res.campaignSlug}`,
      });
    });

    revalidateCampaignPaths(res.campaignSlug, input.userId);
    return {
      ok: true,
      message: `Đã trao "${res.awardTitle}" & Huy hiệu "${res.badgeName}" cho ${res.studentName}!`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể trao Award.",
    };
  }
}

export async function updateCampaignGrantRewardStatusAction(input: {
  grantId: string;
  status: "pending" | "fulfilled";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!UUID_REGEX.test(input.grantId)) {
      return { ok: false, error: "Mã trao giải không hợp lệ." };
    }
    if (input.status !== "pending" && input.status !== "fulfilled") {
      return { ok: false, error: "Trạng thái trao quà không hợp lệ." };
    }

    const sql = getSql();
    const rows = await sql`
      UPDATE public.user_campaign_awards
      SET reward_status = ${input.status}
      WHERE id = ${input.grantId} AND reward_id IS NOT NULL
      RETURNING user_id
    `;
    if (rows.length === 0) {
      return { ok: false, error: "Không tìm thấy phần quà cần cập nhật." };
    }

    revalidateCampaignPaths(undefined, String(rows[0].user_id));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái trao quà.",
    };
  }
}
