import type {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UserBlockMode,
} from "./types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REPORT_TARGET_TYPES = ["thread", "reply", "user"] as const;
export const REPORT_REASONS = [
  "spam",
  "harassment",
  "off_topic",
  "plagiarism",
  "other",
] as const;
export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export const USER_BLOCK_MODES = ["mute", "block"] as const;

export const REPORT_DETAIL_MAX_LENGTH = 500;
export const REPORT_RESOLUTION_NOTE_MAX_LENGTH = 500;
export const MAX_BLOCKED_USERS_PER_USER = 200;

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam / Quảng cáo",
  harassment: "Quấy rối / Công kích cá nhân",
  off_topic: "Sai chuyên mục / Lạc đề",
  plagiarism: "Sao chép / Đạo lời giải",
  other: "Lý do khác",
};

export const REPORT_TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  thread: "Bài viết",
  reply: "Bình luận",
  user: "Thành viên",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Chờ xử lý",
  resolved: "Đã xử lý",
  dismissed: "Bỏ qua",
};

export const USER_BLOCK_MODE_LABELS: Record<UserBlockMode, string> = {
  mute: "Ẩn nội dung",
  block: "Chặn tương tác",
};

export type RateLimitActionKind = "thread" | "reply" | "report";

export interface UserRateLimitPolicy {
  max: number;
  windowMinutes: number;
  label: string;
}

export const USER_RATE_LIMITS: Record<
  RateLimitActionKind,
  UserRateLimitPolicy
> = {
  thread: {
    max: 5,
    windowMinutes: 60,
    label: "tối đa 5 bài viết mỗi giờ",
  },
  reply: {
    max: 20,
    windowMinutes: 60,
    label: "tối đa 20 bình luận mỗi giờ",
  },
  report: {
    max: 5,
    windowMinutes: 1440,
    label: "tối đa 5 báo cáo mỗi 24 giờ",
  },
};

export interface RateLimitBoundaryResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
}

export function isValidUuidFormat(value: string | null | undefined): boolean {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

export function evaluateRateLimitBoundary(
  currentCount: number,
  maxAllowed: number
): RateLimitBoundaryResult {
  const safeLimit = Math.max(0, Math.floor(maxAllowed));
  const safeCount = Math.max(0, Math.floor(currentCount));
  const allowed = safeCount < safeLimit;
  return {
    allowed,
    count: safeCount,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - safeCount),
  };
}

export function isReportTargetType(value: string): value is ReportTargetType {
  return (REPORT_TARGET_TYPES as readonly string[]).includes(value);
}

export function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value);
}

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}

export function isUserBlockMode(value: string): value is UserBlockMode {
  return (USER_BLOCK_MODES as readonly string[]).includes(value);
}

export function validateContentReportInput(input: {
  targetType: string;
  targetId: string;
  reason: string;
  detail?: string;
  reporterId?: string;
}):
  | {
      ok: true;
      targetType: ReportTargetType;
      targetId: string;
      reason: ReportReason;
      detail: string;
    }
  | { ok: false; error: string } {
  if (!isReportTargetType(input.targetType)) {
    return { ok: false, error: "Loại đối tượng báo cáo không hợp lệ." };
  }

  const trimmedTargetId = input.targetId.trim();
  if (!isValidUuidFormat(trimmedTargetId)) {
    return { ok: false, error: "Mã đối tượng báo cáo không hợp lệ." };
  }

  if (
    input.targetType === "user" &&
    input.reporterId &&
    input.reporterId === trimmedTargetId
  ) {
    return { ok: false, error: "Bạn không thể tự báo cáo chính mình." };
  }

  if (!isReportReason(input.reason)) {
    return { ok: false, error: "Vui lòng chọn lý do báo cáo hợp lệ." };
  }

  const detail = (input.detail ?? "").trim();
  if (detail.length > REPORT_DETAIL_MAX_LENGTH) {
    return {
      ok: false,
      error: `Mô tả chi tiết tối đa ${REPORT_DETAIL_MAX_LENGTH} ký tự.`,
    };
  }

  if (input.reason === "other" && detail.length < 5) {
    return {
      ok: false,
      error:
        "Khi chọn 'Lý do khác', vui lòng mô tả ngắn ít nhất 5 ký tự để Admin dễ kiểm tra.",
    };
  }

  return {
    ok: true,
    targetType: input.targetType,
    targetId: trimmedTargetId,
    reason: input.reason,
    detail,
  };
}

export function validateReportResolutionInput(input: {
  reportId: string;
  status: string;
  resolutionNote?: string;
}):
  | {
      ok: true;
      reportId: string;
      status: "resolved" | "dismissed";
      resolutionNote: string;
    }
  | { ok: false; error: string } {
  const reportId = input.reportId.trim();
  if (!isValidUuidFormat(reportId)) {
    return { ok: false, error: "Mã báo cáo không hợp lệ." };
  }

  if (input.status !== "resolved" && input.status !== "dismissed") {
    return {
      ok: false,
      error: "Trạng thái xử lý phải là 'Đã xử lý' hoặc 'Bỏ qua'.",
    };
  }

  const resolutionNote = (input.resolutionNote ?? "").trim();
  if (resolutionNote.length > REPORT_RESOLUTION_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Ghi chú xử lý tối đa ${REPORT_RESOLUTION_NOTE_MAX_LENGTH} ký tự.`,
    };
  }

  return {
    ok: true,
    reportId,
    status: input.status,
    resolutionNote,
  };
}

export function filterBlockedAuthors<T extends { author: { id: string } }>(
  items: readonly T[],
  blockedIds: ReadonlySet<string>
): T[] {
  if (blockedIds.size === 0) return [...items];
  return items.filter((item) => !blockedIds.has(item.author.id));
}
