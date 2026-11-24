import { describe, expect, it } from "vitest";
import {
  BLIND_SUBMISSION_ACTIVITY_SUMMARY,
  buildSafeActivitySummary,
  DEFAULT_ACTIVITY_PAGE_SIZE,
  decodeActivityCursor,
  encodeActivityCursor,
  isActivityEventType,
  isActivityFeedTab,
  isActivityTargetType,
  MAX_ACTIVITY_PAGE_SIZE,
  parseActivityLimitParam,
} from "../activity-service";
import { getRoutePageTitle, isNavRouteActive } from "../navigation";
import {
  computeOnboardingProgress,
  DEFAULT_ONBOARDING_STATE,
  LAST_ACTIVE_TOUCH_INTERVAL_MS,
  MAX_FAVORITE_CATEGORIES,
  normalizeOnboardingState,
  shouldTouchLastActiveAt,
  validateOnboardingStateInput,
} from "../onboarding";

const ACTIVITY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("Sprint 1C — Activity Feed Cursor Encode / Decode", () => {
  it("mã hóa và giải mã khứ hồi (round-trip) keyset cursor (created_at, id)", () => {
    const iso = "2026-11-24T12:34:56.789Z";
    const encoded = encodeActivityCursor({
      createdAt: iso,
      id: ACTIVITY_ID.toUpperCase(),
    });

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeActivityCursor(encoded)).toEqual({
      createdAt: iso,
      id: ACTIVITY_ID,
    });
  });

  it("từ chối cursor rỗng, sai định dạng, sai UUID hoặc ngày không hợp lệ", () => {
    expect(decodeActivityCursor(null)).toBeNull();
    expect(decodeActivityCursor(undefined)).toBeNull();
    expect(decodeActivityCursor("")).toBeNull();
    expect(decodeActivityCursor("not valid base64!!")).toBeNull();

    const badUuid = Buffer.from(
      "2026-11-24T12:00:00.000Z|not-a-uuid",
      "utf8"
    ).toString("base64url");
    expect(decodeActivityCursor(badUuid)).toBeNull();

    const badDate = Buffer.from(`invalid-date|${ACTIVITY_ID}`, "utf8").toString(
      "base64url"
    );
    expect(decodeActivityCursor(badDate)).toBeNull();

    const extraParts = Buffer.from(
      `2026-11-24T12:00:00.000Z|${ACTIVITY_ID}|extra`,
      "utf8"
    ).toString("base64url");
    expect(decodeActivityCursor(extraParts)).toBeNull();

    // Từ chối năm ngoài khoảng an toàn [2000, 2100] hoặc định dạng ISO không chuẩn UTC 4 chữ số
    const yearZero = Buffer.from(
      `0000-01-01T00:00:00.000Z|${ACTIVITY_ID}`,
      "utf8"
    ).toString("base64url");
    expect(decodeActivityCursor(yearZero)).toBeNull();

    const negativeYear = Buffer.from(
      `-000001-01-01T00:00:00.000Z|${ACTIVITY_ID}`,
      "utf8"
    ).toString("base64url");
    expect(decodeActivityCursor(negativeYear)).toBeNull();

    const outOfRangePast = Buffer.from(
      `1999-12-31T23:59:59.000Z|${ACTIVITY_ID}`,
      "utf8"
    ).toString("base64url");
    expect(decodeActivityCursor(outOfRangePast)).toBeNull();

    const outOfRangeFuture = Buffer.from(
      `2101-01-01T00:00:00.000Z|${ACTIVITY_ID}`,
      "utf8"
    ).toString("base64url");
    expect(decodeActivityCursor(outOfRangeFuture)).toBeNull();

    const nonUtcOffset = Buffer.from(
      `2026-11-24T12:00:00+07:00|${ACTIVITY_ID}`,
      "utf8"
    ).toString("base64url");
    expect(decodeActivityCursor(nonUtcOffset)).toBeNull();

    expect(() =>
      encodeActivityCursor({ createdAt: "bad-date", id: ACTIVITY_ID })
    ).toThrow();
    expect(() =>
      encodeActivityCursor({
        createdAt: "0000-01-01T00:00:00.000Z",
        id: ACTIVITY_ID,
      })
    ).toThrow();
    expect(() =>
      encodeActivityCursor({
        createdAt: "2026-11-24T12:00:00.000Z",
        id: "not-a-uuid",
      })
    ).toThrow();
  });

  it("chuẩn hóa tham số limit mặc định là 20 khi bỏ trống hoặc chuỗi rỗng và chặn trong [5, 50]", () => {
    expect(parseActivityLimitParam(null)).toBe(DEFAULT_ACTIVITY_PAGE_SIZE);
    expect(parseActivityLimitParam(undefined)).toBe(DEFAULT_ACTIVITY_PAGE_SIZE);
    expect(parseActivityLimitParam("")).toBe(DEFAULT_ACTIVITY_PAGE_SIZE);
    expect(parseActivityLimitParam("   ")).toBe(DEFAULT_ACTIVITY_PAGE_SIZE);
    expect(parseActivityLimitParam("abc")).toBe(DEFAULT_ACTIVITY_PAGE_SIZE);
    expect(parseActivityLimitParam("0")).toBe(5);
    expect(parseActivityLimitParam("3")).toBe(5);
    expect(parseActivityLimitParam("25.9")).toBe(25);
    expect(parseActivityLimitParam("999")).toBe(MAX_ACTIVITY_PAGE_SIZE);
  });

  it("xác thực đúng event_type, target_type và tab", () => {
    expect(isActivityEventType("new_question")).toBe(true);
    expect(isActivityEventType("new_solution")).toBe(true);
    expect(isActivityEventType("accepted_solution")).toBe(true);
    expect(isActivityEventType("badge_earned")).toBe(true);
    expect(isActivityEventType("campaign_launched")).toBe(true);
    expect(isActivityEventType("unknown_event")).toBe(false);

    expect(isActivityTargetType("thread")).toBe(true);
    expect(isActivityTargetType("reply")).toBe(true);
    expect(isActivityTargetType("campaign")).toBe(true);
    expect(isActivityTargetType("award")).toBe(true);
    expect(isActivityTargetType("profile")).toBe(false);

    expect(isActivityFeedTab("discover")).toBe(true);
    expect(isActivityFeedTab("following")).toBe(true);
    expect(isActivityFeedTab("popular")).toBe(false);
  });
});

describe("Sprint 1C — Blind Submission Summary Redaction", () => {
  it("tuyệt đối KHÔNG làm lộ bất kỳ nội dung bài nộp nào khi isBlindSubmission = true", () => {
    const secretSolution =
      "Áp dụng bất đẳng thức Cauchy-Schwarz với đáp số bí mật x = 2026 và y = 1337.";
    const summary = buildSafeActivitySummary(secretSolution, {
      isBlindSubmission: true,
    });

    expect(summary).toBe(BLIND_SUBMISSION_ACTIVITY_SUMMARY);
    expect(summary).not.toContain("Cauchy");
    expect(summary).not.toContain("2026");
    expect(summary).not.toContain("1337");
  });

  it("ẩn nội dung bên trong khối :::solution / :::spoiler / :::hint và rút gọn sạch", () => {
    const content = [
      "Cho $a, b > 0$ thỏa mãn $ab = 1$.",
      ":::solution Lời giải chi tiết",
      "Bí mật lời giải không nên hiện ở preview",
      ":::",
      "Xem thêm [tài liệu](https://example.com) ![hình](https://img.example.com/a.webp)",
    ].join("\n");

    const summary = buildSafeActivitySummary(content, {
      isBlindSubmission: false,
      maxLength: 140,
    });

    expect(summary).not.toContain("Bí mật lời giải");
    expect(summary).toContain("[Nội dung thu gọn]");
    expect(summary).toContain("tài liệu");
    expect(summary).not.toContain("https://img.example.com");
    expect(summary.length).toBeLessThanOrEqual(140);
  });

  it("cắt gọn chuỗi dài kèm dấu ba chấm khi vượt quá maxLength", () => {
    const longText = "Chứng minh bất đẳng thức ".repeat(20);
    const summary = buildSafeActivitySummary(longText, { maxLength: 80 });
    expect(summary.length).toBeLessThanOrEqual(80);
    expect(summary.endsWith("…")).toBe(true);
  });
});

describe("Sprint 1C — Onboarding Checklist Progress & last_active_at Touch", () => {
  it("tính đúng tiến độ 0/5, một phần, và tự ẩn khi đạt 5/5 hoặc khi đã bấm ẩn", () => {
    const emptyProgress = computeOnboardingProgress(DEFAULT_ONBOARDING_STATE, {
      bio: "   ",
      nickname: "",
      followingCount: 0,
      bookmarksCount: 0,
      threadsCount: 0,
      repliesCount: 0,
    });
    expect(emptyProgress.completedCount).toBe(0);
    expect(emptyProgress.totalCount).toBe(5);
    expect(emptyProgress.allCompleted).toBe(false);
    expect(emptyProgress.shouldShow).toBe(true);

    const partial = computeOnboardingProgress(
      { favoriteCategories: ["dai-so", "hinh-hoc"], dismissed: false },
      {
        bio: "Yêu thích Hình học phẳng",
        nickname: "",
        followingCount: 2,
        bookmarksCount: 0,
        threadsCount: 0,
        repliesCount: 0,
      }
    );
    expect(partial.completedCount).toBe(3);
    expect(partial.allCompleted).toBe(false);
    expect(partial.shouldShow).toBe(true);
    expect(partial.steps.find((s) => s.id === "profile")?.completed).toBe(true);
    expect(partial.steps.find((s) => s.id === "categories")?.completed).toBe(true);
    expect(partial.steps.find((s) => s.id === "follow")?.completed).toBe(true);
    expect(partial.steps.find((s) => s.id === "bookmark")?.completed).toBe(false);
    expect(partial.steps.find((s) => s.id === "contribute")?.completed).toBe(false);

    const allDone = computeOnboardingProgress(
      { favoriteCategories: ["giai-tich"], dismissed: false },
      {
        bio: "",
        nickname: "EulerFan",
        followingCount: 1,
        bookmarksCount: 1,
        threadsCount: 0,
        repliesCount: 1,
      }
    );
    expect(allDone.completedCount).toBe(5);
    expect(allDone.allCompleted).toBe(true);
    expect(allDone.shouldShow).toBe(false);

    const dismissed = computeOnboardingProgress(
      { favoriteCategories: [], dismissed: true },
      {
        bio: "",
        nickname: "",
        followingCount: 0,
        bookmarksCount: 0,
        threadsCount: 0,
        repliesCount: 0,
      }
    );
    expect(dismissed.completedCount).toBe(0);
    expect(dismissed.shouldShow).toBe(false);
  });

  it("chuẩn hóa & kiểm tra chặt đầu vào onboarding_state (lọc slug hợp lệ, khử trùng, trần 6 chuyên mục)", () => {
    expect(normalizeOnboardingState(null)).toEqual(DEFAULT_ONBOARDING_STATE);
    expect(
      normalizeOnboardingState({
        favoriteCategories: ["DAI-SO", "dai-so", "bad slug!", "hinh-hoc"],
        dismissed: true,
        dismissedAt: "2026-11-24T10:00:00.000Z",
      })
    ).toEqual({
      favoriteCategories: ["dai-so", "hinh-hoc"],
      dismissed: true,
      dismissedAt: "2026-11-24T10:00:00.000Z",
    });

    const allowed = new Set(["dai-so", "giai-tich", "hinh-hoc"]);
    const tooMany = validateOnboardingStateInput(
      {
        favoriteCategories: Array.from(
          { length: MAX_FAVORITE_CATEGORIES + 1 },
          (_, i) => `cat-${i}`
        ),
      },
      DEFAULT_ONBOARDING_STATE,
      allowed
    );
    expect(tooMany.ok).toBe(false);

    const validUpdate = validateOnboardingStateInput(
      { favoriteCategories: ["dai-so", "unknown-slug", "hinh-hoc"], dismissed: true },
      DEFAULT_ONBOARDING_STATE,
      allowed,
      "2026-11-24T15:00:00.000Z"
    );
    expect(validUpdate).toEqual({
      ok: true,
      state: {
        favoriteCategories: ["dai-so", "hinh-hoc"],
        dismissed: true,
        dismissedAt: "2026-11-24T15:00:00.000Z",
      },
    });
  });

  it("chỉ kích hoạt cập nhật last_active_at khi null hoặc cách hiện tại >= 20 giờ", () => {
    const nowMs = Date.parse("2026-11-24T12:00:00.000Z");
    expect(shouldTouchLastActiveAt(null, nowMs)).toBe(true);
    expect(shouldTouchLastActiveAt(undefined, nowMs)).toBe(true);
    expect(shouldTouchLastActiveAt("invalid", nowMs)).toBe(true);

    const recent = new Date(nowMs - LAST_ACTIVE_TOUCH_INTERVAL_MS + 60_000).toISOString();
    expect(shouldTouchLastActiveAt(recent, nowMs)).toBe(false);

    const exactBoundary = new Date(nowMs - LAST_ACTIVE_TOUCH_INTERVAL_MS).toISOString();
    expect(shouldTouchLastActiveAt(exactBoundary, nowMs)).toBe(true);

    const old = new Date(nowMs - 36 * 60 * 60 * 1000).toISOString();
    expect(shouldTouchLastActiveAt(old, nowMs)).toBe(true);
  });

  it("nhận diện đúng tiêu đề và trạng thái active cho route /activity", () => {
    expect(getRoutePageTitle("/activity")).toBe("Hoạt động cộng đồng");
    expect(isNavRouteActive("/activity", "/activity")).toBe(true);
    expect(isNavRouteActive("/activity", "/")).toBe(false);
  });
});
