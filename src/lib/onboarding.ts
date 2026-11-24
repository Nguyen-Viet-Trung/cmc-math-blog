export interface OnboardingState {
  favoriteCategories: string[];
  dismissed: boolean;
  dismissedAt: string | null;
}

export interface OnboardingSignals {
  bio: string;
  nickname: string;
  followingCount: number;
  bookmarksCount: number;
  threadsCount: number;
  repliesCount: number;
}

export type OnboardingStepId =
  | "profile"
  | "categories"
  | "follow"
  | "bookmark"
  | "contribute";

export interface OnboardingStepStatus {
  id: OnboardingStepId;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  actionLabel: string;
}

export interface OnboardingProgress {
  steps: OnboardingStepStatus[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  shouldShow: boolean;
  state: OnboardingState;
}

export const MAX_FAVORITE_CATEGORIES = 6;
export const LAST_ACTIVE_TOUCH_INTERVAL_HOURS = 20;
export const LAST_ACTIVE_TOUCH_INTERVAL_MS =
  LAST_ACTIVE_TOUCH_INTERVAL_HOURS * 60 * 60 * 1000;

export const DEFAULT_ONBOARDING_STATE: Readonly<OnboardingState> = {
  favoriteCategories: [],
  dismissed: false,
  dismissedAt: null,
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sanitizeCategorySlugs(
  raw: unknown,
  allowedSlugs?: ReadonlySet<string>
): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const slug = item.trim().toLowerCase();
    if (!slug || slug.length > 64 || !SLUG_REGEX.test(slug)) continue;
    if (allowedSlugs && !allowedSlugs.has(slug)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    result.push(slug);
    if (result.length >= MAX_FAVORITE_CATEGORIES) break;
  }
  return result;
}

export function normalizeOnboardingState(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      favoriteCategories: [],
      dismissed: false,
      dismissedAt: null,
    };
  }

  const obj = raw as Record<string, unknown>;
  const favoriteCategories = sanitizeCategorySlugs(obj.favoriteCategories);
  const dismissed = obj.dismissed === true;
  let dismissedAt: string | null = null;
  if (typeof obj.dismissedAt === "string" && obj.dismissedAt.trim()) {
    const parsed = new Date(obj.dismissedAt);
    if (!Number.isNaN(parsed.getTime())) {
      dismissedAt = parsed.toISOString();
    }
  }

  return {
    favoriteCategories,
    dismissed,
    dismissedAt,
  };
}

export function validateOnboardingStateInput(
  input: {
    favoriteCategories?: unknown;
    dismissed?: unknown;
  },
  current: OnboardingState,
  allowedSlugs?: ReadonlySet<string>,
  nowIso: string = new Date().toISOString()
): { ok: true; state: OnboardingState } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Dữ liệu thiết lập không hợp lệ." };
  }

  let nextCategories = current.favoriteCategories;
  if (input.favoriteCategories !== undefined) {
    if (!Array.isArray(input.favoriteCategories)) {
      return {
        ok: false,
        error: "Danh sách chuyên mục yêu thích phải là một mảng hợp lệ.",
      };
    }
    if (input.favoriteCategories.length > MAX_FAVORITE_CATEGORIES) {
      return {
        ok: false,
        error: `Bạn chỉ có thể chọn tối đa ${MAX_FAVORITE_CATEGORIES} chuyên mục yêu thích.`,
      };
    }
    nextCategories = sanitizeCategorySlugs(
      input.favoriteCategories,
      allowedSlugs
    );
  }

  let nextDismissed = current.dismissed;
  let nextDismissedAt = current.dismissedAt;
  if (input.dismissed !== undefined) {
    if (typeof input.dismissed !== "boolean") {
      return {
        ok: false,
        error: "Trạng thái ẩn danh sách hướng dẫn không hợp lệ.",
      };
    }
    nextDismissed = input.dismissed;
    nextDismissedAt = input.dismissed ? nowIso : null;
  }

  return {
    ok: true,
    state: {
      favoriteCategories: nextCategories,
      dismissed: nextDismissed,
      dismissedAt: nextDismissedAt,
    },
  };
}

export function computeOnboardingProgress(
  stateInput: OnboardingState | unknown,
  signals: OnboardingSignals
): OnboardingProgress {
  const state = normalizeOnboardingState(stateInput);

  const hasProfileInfo =
    signals.bio.trim().length > 0 || signals.nickname.trim().length > 0;
  const hasFavoriteCategories = state.favoriteCategories.length > 0;
  const hasFollowing = Math.max(0, Math.floor(signals.followingCount)) >= 1;
  const hasBookmark = Math.max(0, Math.floor(signals.bookmarksCount)) >= 1;
  const hasContribution =
    Math.max(0, Math.floor(signals.threadsCount)) +
      Math.max(0, Math.floor(signals.repliesCount)) >=
    1;

  const steps: OnboardingStepStatus[] = [
    {
      id: "profile",
      title: "Hoàn thiện hồ sơ cá nhân",
      description: "Thêm biệt danh hoặc vài dòng giới thiệu Toán học của bạn.",
      completed: hasProfileInfo,
      href: "/profile",
      actionLabel: "Cập nhật hồ sơ",
    },
    {
      id: "categories",
      title: "Chọn chuyên mục Toán yêu thích",
      description: "Chọn ít nhất 1 lĩnh vực bạn muốn tập trung luyện tập.",
      completed: hasFavoriteCategories,
      href: "/#onboarding-categories",
      actionLabel: "Chọn ngay",
    },
    {
      id: "follow",
      title: "Theo dõi ít nhất 1 thành viên",
      description: "Theo dõi bạn học hoặc cao thủ trên Bảng vàng để cập nhật bài hay.",
      completed: hasFollowing,
      href: "/leaderboard",
      actionLabel: "Xem Bảng vàng",
    },
    {
      id: "bookmark",
      title: "Lưu 1 bài toán vào Sổ tay",
      description: "Bấm lưu một bài toán hay để dễ dàng ôn luyện lại sau này.",
      completed: hasBookmark,
      href: "/?status=open",
      actionLabel: "Khám phá bài toán",
    },
    {
      id: "contribute",
      title: "Đặt câu hỏi hoặc gửi lời giải đầu tiên",
      description: "Đăng 1 bài toán mới hoặc tham gia bình luận giải bài cùng CLB.",
      completed: hasContribution,
      href: "/threads/new",
      actionLabel: "Đăng câu hỏi",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const allCompleted = completedCount === totalCount;

  return {
    steps,
    completedCount,
    totalCount,
    allCompleted,
    shouldShow: !state.dismissed && !allCompleted,
    state,
  };
}

/**
 * Chỉ cập nhật `profiles.last_active_at` tối đa 1 lần mỗi ngày (khi null hoặc cũ hơn 20 giờ)
 * để phục vụ thống kê DAU tương lai mà vẫn giữ lượng DB writes tối thiểu.
 */
export function shouldTouchLastActiveAt(
  lastActiveAt: string | Date | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!lastActiveAt) return true;
  const lastMs =
    lastActiveAt instanceof Date
      ? lastActiveAt.getTime()
      : new Date(lastActiveAt).getTime();
  if (!Number.isFinite(lastMs)) return true;
  return nowMs - lastMs >= LAST_ACTIVE_TOUCH_INTERVAL_MS;
}
