import type { NotificationType } from "./types";

export const NOTIFICATION_PREF_KEYS = [
  "replies",
  "mentions",
  "follows",
  "campaigns",
  "awards",
  "digest",
] as const;

export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];

export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: Readonly<NotificationPrefs> = {
  replies: true,
  mentions: true,
  follows: true,
  campaigns: true,
  awards: true,
  digest: true,
};

export interface NotificationPrefMeta {
  key: NotificationPrefKey;
  label: string;
  description: string;
}

export const NOTIFICATION_PREF_META: readonly NotificationPrefMeta[] = [
  {
    key: "replies",
    label: "Bình luận & lời giải mới",
    description:
      "Thông báo khi có thành viên gửi lời giải hoặc bình luận trong bài viết của bạn.",
  },
  {
    key: "mentions",
    label: "Nhắc tên (@mention) & phản hồi trực tiếp",
    description:
      "Thông báo khi ai đó nhắc tên bạn hoặc trả lời trực tiếp bình luận của bạn.",
  },
  {
    key: "follows",
    label: "Người theo dõi mới",
    description:
      "Thông báo khi có thành viên mới theo dõi hồ sơ học tập của bạn.",
  },
  {
    key: "campaigns",
    label: "Giải đấu & Huy hiệu Campaign",
    description:
      "Thông báo khi giải đấu mới mở hoặc bạn mở khóa Huy hiệu/Award giải đấu.",
  },
  {
    key: "awards",
    label: "Điểm thưởng & Lời giải được chọn",
    description:
      "Thông báo khi lời giải của bạn được chọn đúng, nhận thưởng Thử thách hoặc thưởng tác giả.",
  },
  {
    key: "digest",
    label: "Tổng hợp học tập hằng tuần",
    description:
      "Thông báo tổng hợp bài toán nổi bật và hoạt động tiêu biểu mỗi tuần của CLB.",
  },
];

const PREF_KEY_SET = new Set<string>(NOTIFICATION_PREF_KEYS);

function parseRawObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

/**
 * Chuẩn hóa cấu hình thông báo từ DB / JSON bất kỳ về đúng 6 khóa hợp lệ.
 * Khóa thiếu hoặc sai kiểu sẽ rơi về mặc định `true`.
 */
export function normalizeNotificationPrefs(raw: unknown): NotificationPrefs {
  const source = parseRawObject(raw);
  const result: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (!source) return result;

  for (const key of NOTIFICATION_PREF_KEYS) {
    const val = source[key];
    if (typeof val === "boolean") {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Kiểm tra chặt chẽ dữ liệu đầu vào từ Server Action (chỉ chấp nhận whitelist 6 khóa boolean).
 */
export function validateNotificationPrefsInput(
  raw: unknown,
  base: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS
): { ok: true; prefs: NotificationPrefs } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Dữ liệu cài đặt thông báo không hợp lệ." };
  }

  const record = raw as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) {
    return { ok: false, error: "Cần ít nhất một tùy chọn thông báo để cập nhật." };
  }

  const next: NotificationPrefs = { ...normalizeNotificationPrefs(base) };
  for (const key of keys) {
    if (!PREF_KEY_SET.has(key)) {
      return {
        ok: false,
        error: `Tùy chọn thông báo không được hỗ trợ: "${key}".`,
      };
    }
    const value = record[key];
    if (typeof value !== "boolean") {
      return {
        ok: false,
        error: `Giá trị của tùy chọn "${key}" phải là true hoặc false.`,
      };
    }
    next[key as NotificationPrefKey] = value;
  }

  return { ok: true, prefs: next };
}

/**
 * Ánh xạ loại thông báo -> nhóm tùy chọn tương ứng.
 * Trả về `null` cho thông báo hệ thống/đổi quà bắt buộc (luôn gửi).
 */
export function getNotificationPrefKeyForType(
  type: NotificationType | string
): NotificationPrefKey | null {
  switch (type) {
    case "new_reply":
      return "replies";
    case "reply_mention":
      return "mentions";
    case "new_follower":
    case "follow":
      return "follows";
    case "campaign_award":
    case "campaign_launched":
      return "campaigns";
    case "answer_accepted":
    case "author_reward":
    case "challenge_award":
      return "awards";
    case "weekly_digest":
    case "digest":
      return "digest";
    case "system":
    case "redemption_update":
      return null;
    default:
      return null;
  }
}

export function shouldDeliverNotification(
  type: NotificationType | string,
  prefs: NotificationPrefs
): boolean {
  const prefKey = getNotificationPrefKeyForType(type);
  if (!prefKey) return true;
  return prefs[prefKey] !== false;
}
