import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  parseFeatureFlagEnv,
  resolveFeatureFlags,
} from "../feature-flags";
import { buildHomeFilterUrl } from "../format";
import {
  buildNewThreadDraftKey,
  buildReplyDraftKey,
  clearAllDraftsInStorage,
  DRAFT_MAX_AGE_MS,
  DRAFT_MAX_FUTURE_SKEW_MS,
  isDraftExpired,
  MAX_VALID_DATE_MS,
  NEW_THREAD_DRAFT_KEY,
  parseStoredDraft,
  pruneExpiredDraftsInStorage,
  serializeDraft,
} from "../math-draft";
import {
  COALESCABLE_NOTIFICATION_TYPES,
  isCoalescableNotificationType,
  NOTIFICATION_COALESCE_WINDOW_MINUTES,
} from "../notifications";
import {
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefKeyForType,
  NOTIFICATION_PREF_KEYS,
  normalizeNotificationPrefs,
  shouldDeliverNotification,
  validateNotificationPrefsInput,
} from "../notification-prefs";

describe("Sprint 1A — Feature Flags", () => {
  it("mặc định bật toàn bộ 7 cờ Phase 1 khi không truyền env", () => {
    const flags = resolveFeatureFlags({});
    expect(flags).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(Object.values(flags).every(Boolean)).toBe(true);
  });

  it("phân tích chính xác các giá trị bật/tắt env var (case-insensitive, khoảng trắng)", () => {
    expect(parseFeatureFlagEnv("false", true)).toBe(false);
    expect(parseFeatureFlagEnv("0", true)).toBe(false);
    expect(parseFeatureFlagEnv(" OFF ", true)).toBe(false);
    expect(parseFeatureFlagEnv("no", true)).toBe(false);
    expect(parseFeatureFlagEnv("disabled", true)).toBe(false);

    expect(parseFeatureFlagEnv("true", false)).toBe(true);
    expect(parseFeatureFlagEnv("1", false)).toBe(true);
    expect(parseFeatureFlagEnv(" ON ", false)).toBe(true);
    expect(parseFeatureFlagEnv("yes", false)).toBe(true);

    expect(parseFeatureFlagEnv("", true)).toBe(true);
    expect(parseFeatureFlagEnv(undefined, false)).toBe(false);
    expect(parseFeatureFlagEnv("unknown-value", true)).toBe(true);
  });

  it("cho phép tắt độc lập từng feature qua NEXT_PUBLIC_FF_*", () => {
    const flags = resolveFeatureFlags({
      NEXT_PUBLIC_FF_DRAFT_AUTO_SAVE: "false",
      NEXT_PUBLIC_FF_UNANSWERED_FILTER: "0",
      NEXT_PUBLIC_FF_NOTIFICATION_PREFS: "off",
      NEXT_PUBLIC_FF_ONBOARDING: "1",
    });
    expect(flags.draftAutoSave).toBe(false);
    expect(flags.unansweredFilter).toBe(false);
    expect(flags.notificationPrefs).toBe(false);
    expect(flags.onboarding).toBe(true);
    expect(flags.followSystem).toBe(true);
    expect(flags.communitySafety).toBe(true);
    expect(flags.activityFeed).toBe(true);
  });
});

describe("Sprint 1A — Notification Preferences", () => {
  it("chuẩn hóa an toàn dữ liệu thiếu, JSON string, hoặc khóa lạ", () => {
    expect(normalizeNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(normalizeNotificationPrefs(undefined)).toEqual(
      DEFAULT_NOTIFICATION_PREFS
    );
    expect(normalizeNotificationPrefs("invalid-json")).toEqual(
      DEFAULT_NOTIFICATION_PREFS
    );

    const fromPartial = normalizeNotificationPrefs({
      replies: false,
      mentions: false,
      digest: "not-a-bool",
      unknownKey: false,
    });
    expect(fromPartial).toEqual({
      replies: false,
      mentions: false,
      follows: true,
      campaigns: true,
      awards: true,
      digest: true,
    });
    expect(Object.keys(fromPartial).sort()).toEqual(
      [...NOTIFICATION_PREF_KEYS].sort()
    );

    const fromJsonString = normalizeNotificationPrefs(
      JSON.stringify({ campaigns: false, awards: false })
    );
    expect(fromJsonString.campaigns).toBe(false);
    expect(fromJsonString.awards).toBe(false);
    expect(fromJsonString.replies).toBe(true);
  });

  it("kiểm tra chặt whitelist 6 khóa và kiểu boolean ở tầng Server Action", () => {
    expect(validateNotificationPrefsInput(null).ok).toBe(false);
    expect(validateNotificationPrefsInput({}).ok).toBe(false);
    expect(validateNotificationPrefsInput({ invalidKey: true }).ok).toBe(false);
    expect(validateNotificationPrefsInput({ replies: "yes" }).ok).toBe(false);

    const valid = validateNotificationPrefsInput(
      { replies: false, digest: false },
      DEFAULT_NOTIFICATION_PREFS
    );
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.prefs).toEqual({
        replies: false,
        mentions: true,
        follows: true,
        campaigns: true,
        awards: true,
        digest: false,
      });
    }
  });

  it("ánh xạ chính xác từng NotificationType sang nhóm preference và luôn giữ thông báo hệ thống", () => {
    expect(getNotificationPrefKeyForType("new_reply")).toBe("replies");
    expect(getNotificationPrefKeyForType("reply_mention")).toBe("mentions");
    expect(getNotificationPrefKeyForType("new_follower")).toBe("follows");
    expect(getNotificationPrefKeyForType("campaign_award")).toBe("campaigns");
    expect(getNotificationPrefKeyForType("answer_accepted")).toBe("awards");
    expect(getNotificationPrefKeyForType("author_reward")).toBe("awards");
    expect(getNotificationPrefKeyForType("challenge_award")).toBe("awards");
    expect(getNotificationPrefKeyForType("weekly_digest")).toBe("digest");
    expect(getNotificationPrefKeyForType("system")).toBeNull();
    expect(getNotificationPrefKeyForType("redemption_update")).toBeNull();

    const mutedAll = {
      replies: false,
      mentions: false,
      follows: false,
      campaigns: false,
      awards: false,
      digest: false,
    };
    expect(shouldDeliverNotification("new_reply", mutedAll)).toBe(false);
    expect(shouldDeliverNotification("reply_mention", mutedAll)).toBe(false);
    expect(shouldDeliverNotification("campaign_award", mutedAll)).toBe(false);
    expect(shouldDeliverNotification("answer_accepted", mutedAll)).toBe(false);
    expect(shouldDeliverNotification("system", mutedAll)).toBe(true);
    expect(shouldDeliverNotification("redemption_update", mutedAll)).toBe(true);
  });
  it("chỉ cho phép gộp thông báo tương tác tần suất cao và không bao giờ ghi đè thông báo giải thưởng/đổi quà/hệ thống", () => {
    expect(NOTIFICATION_COALESCE_WINDOW_MINUTES).toBe(15);
    expect(COALESCABLE_NOTIFICATION_TYPES.has("new_reply")).toBe(true);
    expect(isCoalescableNotificationType("new_reply")).toBe(true);
    expect(isCoalescableNotificationType("reply_mention")).toBe(true);
    expect(isCoalescableNotificationType("new_follower")).toBe(true);

    expect(isCoalescableNotificationType("redemption_update")).toBe(false);
    expect(isCoalescableNotificationType("campaign_award")).toBe(false);
    expect(isCoalescableNotificationType("challenge_award")).toBe(false);
    expect(isCoalescableNotificationType("answer_accepted")).toBe(false);
    expect(isCoalescableNotificationType("author_reward")).toBe(false);
    expect(isCoalescableNotificationType("system")).toBe(false);
  });
});

describe("Sprint 1A — buildHomeFilterUrl với status=unanswered", () => {
  it("sinh URL chính xác cho bộ lọc Chưa có lời giải", () => {
    expect(buildHomeFilterUrl({ status: "unanswered" })).toBe(
      "/?status=unanswered"
    );
    expect(
      buildHomeFilterUrl({
        type: "question",
        cat: "hinh-hoc",
        status: "unanswered",
        q: "đường tròn",
        page: 2,
        pageSize: 30,
      })
    ).toBe(
      "/?type=question&cat=hinh-hoc&status=unanswered&q=%C4%91%C6%B0%E1%BB%9Dng+tr%C3%B2n&page=2&pageSize=30"
    );
  });
});

describe("Sprint 1A — Math Draft Auto-Save & 7-day Expiration", () => {
  it("tạo đúng storage keys phân tách theo userId cho bài mới và trả lời", () => {
    expect(NEW_THREAD_DRAFT_KEY).toBe("cmc-draft:thread-new");
    expect(buildNewThreadDraftKey()).toBe("cmc-draft:thread-new");
    expect(buildNewThreadDraftKey("user-a")).toBe(
      "cmc-draft:u:user-a:thread-new"
    );
    expect(buildReplyDraftKey("abc-123")).toBe("cmc-draft:reply:abc-123");
    expect(buildReplyDraftKey("abc-123", "user-a")).toBe(
      "cmc-draft:u:user-a:reply:abc-123"
    );
    expect(buildReplyDraftKey("abc-123", "user-b")).not.toBe(
      buildReplyDraftKey("abc-123", "user-a")
    );
  });

  it("phát hiện chính xác bản nháp hết hạn sau 7 ngày và loại bỏ timestamp vượt giới hạn Date", () => {
    const now = new Date("2026-11-24T12:00:00Z").getTime();
    expect(isDraftExpired(now - 60_000, now)).toBe(false);
    expect(isDraftExpired(now + DRAFT_MAX_FUTURE_SKEW_MS, now)).toBe(false);
    expect(isDraftExpired(now + DRAFT_MAX_FUTURE_SKEW_MS + 1, now)).toBe(true);
    expect(isDraftExpired(MAX_VALID_DATE_MS + 1, now)).toBe(true);
    expect(isDraftExpired(1e20, now)).toBe(true);
    expect(isDraftExpired(now - DRAFT_MAX_AGE_MS, now)).toBe(false);
    expect(isDraftExpired(now - DRAFT_MAX_AGE_MS - 1, now)).toBe(true);
    expect(isDraftExpired(0, now)).toBe(true);
    expect(isDraftExpired(Number.NaN, now)).toBe(true);
  });

  it("tuần tự hóa, đọc lại bản nháp hợp lệ và loại bỏ bản nháp quá hạn hoặc hỏng", () => {
    const now = new Date("2026-11-24T12:00:00Z").getTime();
    const freshRaw = serializeDraft(
      { title: "BĐT Cauchy", content: "$a+b \\ge 2\\sqrt{ab}$" },
      now - 3600_000
    );
    const parsed = parseStoredDraft<{ title: string; content: string }>(
      freshRaw,
      now
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.data.title).toBe("BĐT Cauchy");

    const expiredRaw = serializeDraft(
      { title: "Nháp cũ", content: "..." },
      now - DRAFT_MAX_AGE_MS - 5_000
    );
    expect(parseStoredDraft(expiredRaw, now)).toBeNull();
    expect(parseStoredDraft("{broken json", now)).toBeNull();
    expect(parseStoredDraft(JSON.stringify({ version: 2, updatedAt: now, data: "x" }), now)).toBeNull();
  });

  it("dọn sạch các bản nháp quá hạn nhưng giữ nguyên khóa không phải draft và nháp còn hạn", () => {
    const now = new Date("2026-11-24T12:00:00Z").getTime();
    const store = new Map<string, string>([
      [NEW_THREAD_DRAFT_KEY, serializeDraft({ title: "Mới" }, now - 10_000)],
      [
        buildReplyDraftKey("old-thread"),
        serializeDraft("Nội dung cũ", now - DRAFT_MAX_AGE_MS - 10_000),
      ],
      [buildReplyDraftKey("corrupt-thread"), "not-json"],
      ["unrelated-key", "keep-me"],
    ]);

    const mockStorage = {
      get length() {
        return store.size;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      getItem(k: string) {
        return store.get(k) ?? null;
      },
      removeItem(k: string) {
        store.delete(k);
      },
    };

    const removedCount = pruneExpiredDraftsInStorage(mockStorage, now);
    expect(removedCount).toBe(2);
    expect(store.has(NEW_THREAD_DRAFT_KEY)).toBe(true);
    expect(store.has("unrelated-key")).toBe(true);
    expect(store.has(buildReplyDraftKey("old-thread"))).toBe(false);
    expect(store.has(buildReplyDraftKey("corrupt-thread"))).toBe(false);

    const clearedCount = clearAllDraftsInStorage(mockStorage);
    expect(clearedCount).toBe(1);
    expect(store.has(NEW_THREAD_DRAFT_KEY)).toBe(false);
    expect(store.has("unrelated-key")).toBe(true);
  });
});
