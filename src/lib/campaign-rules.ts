import { slugifyHeading } from "./slug";
import type {
  BadgeColorKey,
  BadgeIconKey,
  CampaignPhase,
} from "./types";

export const BADGE_ICON_OPTIONS: { key: BadgeIconKey; label: string }[] = [
  { key: "trophy", label: "Cúp vô địch" },
  { key: "medal", label: "Huy chương" },
  { key: "crown", label: "Vương miện" },
  { key: "star", label: "Ngôi sao" },
  { key: "flame", label: "Ngọn lửa" },
  { key: "award", label: "Ruy băng" },
  { key: "sparkles", label: "Tỏa sáng" },
  { key: "shield", label: "Khiên danh dự" },
];

export const BADGE_COLOR_OPTIONS: { key: BadgeColorKey; label: string }[] = [
  { key: "amber", label: "Vàng hổ phách" },
  { key: "blue", label: "Xanh học thuật" },
  { key: "emerald", label: "Ngọc lục bảo" },
  { key: "rose", label: "Đỏ ruby" },
  { key: "indigo", label: "Chàm tím" },
  { key: "slate", label: "Bạc bạch kim" },
];

export const CAMPAIGN_COVER_OPTIONS = [
  { key: "blue", label: "Xanh CMC" },
  { key: "amber", label: "Vàng giải đấu" },
  { key: "emerald", label: "Xanh lục bảo" },
  { key: "indigo", label: "Chàm học thuật" },
  { key: "rose", label: "Đỏ nổi bật" },
] as const;

const VALID_BADGE_ICONS = new Set<string>(BADGE_ICON_OPTIONS.map((i) => i.key));
const VALID_BADGE_COLORS = new Set<string>(BADGE_COLOR_OPTIONS.map((c) => c.key));
const VALID_COVER_COLORS = new Set<string>(
  CAMPAIGN_COVER_OPTIONS.map((c) => c.key)
);

export function normalizeBadgeIcon(raw: unknown): BadgeIconKey {
  const s = String(raw ?? "");
  return VALID_BADGE_ICONS.has(s) ? (s as BadgeIconKey) : "trophy";
}

export function normalizeBadgeColor(raw: unknown): BadgeColorKey {
  const s = String(raw ?? "");
  return VALID_BADGE_COLORS.has(s) ? (s as BadgeColorKey) : "amber";
}

export function normalizeCampaignCoverColor(raw: unknown): string {
  const s = String(raw ?? "");
  return VALID_COVER_COLORS.has(s) ? s : "blue";
}

export function slugifyCampaignTitle(title: string): string {
  const base = slugifyHeading(title).slice(0, 64);
  return base || "giai-dau";
}

export function getCampaignPhase(
  startsAtIso: string,
  endsAtIso: string,
  nowMs: number = Date.now()
): CampaignPhase {
  const startMs = new Date(startsAtIso).getTime();
  const endMs = new Date(endsAtIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return "ended";
  }
  if (nowMs < startMs) return "upcoming";
  if (nowMs <= endMs) return "active";
  return "ended";
}

export function getCampaignPhaseLabel(phase: CampaignPhase): string {
  if (phase === "active") return "Đang diễn ra";
  if (phase === "upcoming") return "Sắp diễn ra";
  return "Đã kết thúc";
}

export function validateCampaignInput(input: {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  coverColor?: string;
}):
  | {
      ok: true;
      title: string;
      description: string;
      startsAtIso: string;
      endsAtIso: string;
      coverColor: string;
    }
  | { ok: false; error: string } {
  const title = input.title.trim();
  const description = (input.description ?? "").trim().slice(0, 1200);

  if (title.length < 4 || title.length > 140) {
    return { ok: false, error: "Tên giải đấu cần dài từ 4 đến 140 ký tự." };
  }

  const startMs = new Date(input.startsAt).getTime();
  const endMs = new Date(input.endsAt).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return {
      ok: false,
      error: "Ngày bắt đầu và ngày kết thúc không hợp lệ.",
    };
  }
  if (endMs <= startMs) {
    return {
      ok: false,
      error: "Thời điểm kết thúc giải đấu phải sau thời điểm bắt đầu.",
    };
  }

  return {
    ok: true,
    title,
    description,
    startsAtIso: new Date(startMs).toISOString(),
    endsAtIso: new Date(endMs).toISOString(),
    coverColor: normalizeCampaignCoverColor(input.coverColor),
  };
}

export function validateCampaignAwardInput(input: {
  title: string;
  description?: string;
  requiredCompletedCount: number;
  bonusPoints: number;
  badgeName: string;
  badgeIcon?: string;
  badgeColor?: string;
  sortOrder?: number;
}):
  | {
      ok: true;
      title: string;
      description: string;
      requiredCompletedCount: number;
      bonusPoints: number;
      badgeName: string;
      badgeIcon: BadgeIconKey;
      badgeColor: BadgeColorKey;
      sortOrder: number;
    }
  | { ok: false; error: string } {
  const title = input.title.trim();
  const badgeName = input.badgeName.trim();
  const description = (input.description ?? "").trim().slice(0, 500);
  const req = Math.trunc(Number(input.requiredCompletedCount));
  const pts = Math.trunc(Number(input.bonusPoints));
  const sortOrder = Math.trunc(Number(input.sortOrder ?? 0));

  if (title.length < 3 || title.length > 120) {
    return { ok: false, error: "Tên Award cần dài từ 3 đến 120 ký tự." };
  }
  if (badgeName.length < 2 || badgeName.length > 60) {
    return { ok: false, error: "Tên Huy hiệu (Badge) cần từ 2 đến 60 ký tự." };
  }
  if (!Number.isFinite(req) || req < 1 || req > 100) {
    return {
      ok: false,
      error: "Số thử thách cần hoàn thành phải nằm trong khoảng 1–100.",
    };
  }
  if (!Number.isFinite(pts) || pts < 0 || pts > 5000) {
    return {
      ok: false,
      error: "Điểm thưởng Award phải nằm trong khoảng 0–5000.",
    };
  }

  return {
    ok: true,
    title,
    description,
    requiredCompletedCount: req,
    bonusPoints: pts,
    badgeName,
    badgeIcon: normalizeBadgeIcon(input.badgeIcon),
    badgeColor: normalizeBadgeColor(input.badgeColor),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export interface AwardEligibilityCandidate {
  id: string;
  requiredCompletedCount: number;
}

/**
 * Lọc các Award mới mở khóa dựa trên tổng số thử thách đã được duyệt trong Campaign
 * và tập Award ID học sinh đã nhận trước đó (tránh cấp trùng).
 */
export function findNewlyEligibleAwards<T extends AwardEligibilityCandidate>(
  awards: readonly T[],
  completedCount: number,
  alreadyGrantedAwardIds: ReadonlySet<string>
): T[] {
  if (completedCount <= 0) return [];
  return awards.filter(
    (a) =>
      a.requiredCompletedCount <= completedCount &&
      !alreadyGrantedAwardIds.has(a.id)
  );
}
