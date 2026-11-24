import { describe, expect, it } from "vitest";
import { filterVisibleChallengeReplies } from "../rules";
import {
  evaluateRateLimitBoundary,
  filterBlockedAuthors,
  isReportReason,
  isReportStatus,
  isReportTargetType,
  isUserBlockMode,
  MAX_BLOCKED_USERS_PER_USER,
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  REPORT_RESOLUTION_NOTE_MAX_LENGTH,
  REPORT_STATUS_LABELS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPE_LABELS,
  REPORT_TARGET_TYPES,
  USER_BLOCK_MODE_LABELS,
  USER_BLOCK_MODES,
  USER_RATE_LIMITS,
  validateContentReportInput,
  validateReportResolutionInput,
} from "../safety-rules";
import {
  MAX_FOLLOW_FANOUT_THRESHOLD,
  MAX_FOLLOWING_PER_USER,
  validateFollowAttempt,
} from "../social-service";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const THREAD_ID = "33333333-3333-4333-8333-333333333333";
const REPORT_ID = "44444444-4444-4444-8444-444444444444";

describe("Sprint 1B — Follow System Validation Rules", () => {
  it("giữ đúng hằng số giới hạn an toàn (max 200 following, ngưỡng fan-out 30)", () => {
    expect(MAX_FOLLOWING_PER_USER).toBe(200);
    expect(MAX_FOLLOW_FANOUT_THRESHOLD).toBe(30);
  });

  it("chặn tự theo dõi chính mình và UUID không hợp lệ", () => {
    expect(
      validateFollowAttempt({
        followerId: USER_A,
        targetUserId: USER_A,
        targetExists: true,
        targetIsBanned: false,
        isBlockedBetween: false,
        currentFollowingCount: 0,
        alreadyFollowing: false,
      }).ok
    ).toBe(false);

    expect(
      validateFollowAttempt({
        followerId: "not-a-uuid",
        targetUserId: USER_B,
        targetExists: true,
        targetIsBanned: false,
        isBlockedBetween: false,
        currentFollowingCount: 0,
        alreadyFollowing: false,
      }).ok
    ).toBe(false);
  });

  it("chặn theo dõi tài khoản không tồn tại, bị khóa (banned), hoặc đang có ẩn/chặn", () => {
    const missing = validateFollowAttempt({
      followerId: USER_A,
      targetUserId: USER_B,
      targetExists: false,
      targetIsBanned: false,
      isBlockedBetween: false,
      currentFollowingCount: 5,
      alreadyFollowing: false,
    });
    expect(missing.ok).toBe(false);

    const banned = validateFollowAttempt({
      followerId: USER_A,
      targetUserId: USER_B,
      targetExists: true,
      targetIsBanned: true,
      isBlockedBetween: false,
      currentFollowingCount: 5,
      alreadyFollowing: false,
    });
    expect(banned.ok).toBe(false);

    const blocked = validateFollowAttempt({
      followerId: USER_A,
      targetUserId: USER_B,
      targetExists: true,
      targetIsBanned: false,
      isBlockedBetween: true,
      currentFollowingCount: 5,
      alreadyFollowing: false,
    });
    expect(blocked.ok).toBe(false);
  });

  it("áp dụng trần cứng 200 following nhưng luôn cho phép hủy theo dõi (unfollow)", () => {
    const atCap = validateFollowAttempt({
      followerId: USER_A,
      targetUserId: USER_B,
      targetExists: true,
      targetIsBanned: false,
      isBlockedBetween: false,
      currentFollowingCount: MAX_FOLLOWING_PER_USER,
      alreadyFollowing: false,
    });
    expect(atCap.ok).toBe(false);

    const belowCap = validateFollowAttempt({
      followerId: USER_A,
      targetUserId: USER_B,
      targetExists: true,
      targetIsBanned: false,
      isBlockedBetween: false,
      currentFollowingCount: MAX_FOLLOWING_PER_USER - 1,
      alreadyFollowing: false,
    });
    expect(belowCap).toEqual({ ok: true, action: "follow" });

    const unfollowAtCap = validateFollowAttempt({
      followerId: USER_A,
      targetUserId: USER_B,
      targetExists: true,
      targetIsBanned: true,
      isBlockedBetween: true,
      currentFollowingCount: MAX_FOLLOWING_PER_USER,
      alreadyFollowing: true,
    });
    expect(unfollowAtCap).toEqual({ ok: true, action: "unfollow" });
  });
});

describe("Sprint 1B — Content Report Validation & Labels", () => {
  it("cung cấp đầy đủ nhãn tiếng Việt cho toàn bộ reason, target_type, status và block mode", () => {
    for (const reason of REPORT_REASONS) {
      expect(isReportReason(reason)).toBe(true);
      expect(REPORT_REASON_LABELS[reason].trim().length).toBeGreaterThan(0);
    }
    for (const targetType of REPORT_TARGET_TYPES) {
      expect(isReportTargetType(targetType)).toBe(true);
      expect(
        REPORT_TARGET_TYPE_LABELS[targetType].trim().length
      ).toBeGreaterThan(0);
    }
    for (const status of REPORT_STATUSES) {
      expect(isReportStatus(status)).toBe(true);
      expect(REPORT_STATUS_LABELS[status].trim().length).toBeGreaterThan(0);
    }
    for (const mode of USER_BLOCK_MODES) {
      expect(isUserBlockMode(mode)).toBe(true);
      expect(USER_BLOCK_MODE_LABELS[mode].trim().length).toBeGreaterThan(0);
    }

    expect(isReportReason("invalid")).toBe(false);
    expect(isReportTargetType("campaign")).toBe(false);
    expect(isReportStatus("pending")).toBe(false);
    expect(isUserBlockMode("ban")).toBe(false);
  });

  it("kiểm tra chặt đầu vào báo cáo nội dung (target, UUID, self-report, detail max/other)", () => {
    expect(
      validateContentReportInput({
        targetType: "invalid",
        targetId: THREAD_ID,
        reason: "spam",
      }).ok
    ).toBe(false);

    expect(
      validateContentReportInput({
        targetType: "thread",
        targetId: "bad-id",
        reason: "spam",
      }).ok
    ).toBe(false);

    expect(
      validateContentReportInput({
        targetType: "user",
        targetId: USER_A,
        reason: "harassment",
        reporterId: USER_A,
      }).ok
    ).toBe(false);

    expect(
      validateContentReportInput({
        targetType: "thread",
        targetId: THREAD_ID,
        reason: "other",
        detail: "ngắn",
      }).ok
    ).toBe(false);

    expect(
      validateContentReportInput({
        targetType: "reply",
        targetId: THREAD_ID,
        reason: "plagiarism",
        detail: "a".repeat(REPORT_DETAIL_MAX_LENGTH + 1),
      }).ok
    ).toBe(false);

    const okResult = validateContentReportInput({
      targetType: "thread",
      targetId: `  ${THREAD_ID}  `,
      reason: "other",
      detail: "  Nội dung chứa link quảng cáo ngoài lề  ",
      reporterId: USER_A,
    });
    expect(okResult).toEqual({
      ok: true,
      targetType: "thread",
      targetId: THREAD_ID,
      reason: "other",
      detail: "Nội dung chứa link quảng cáo ngoài lề",
    });
  });

  it("kiểm tra chặt đầu vào xử lý báo cáo của Admin (resolved/dismissed và giới hạn ghi chú)", () => {
    expect(
      validateReportResolutionInput({
        reportId: "invalid",
        status: "resolved",
      }).ok
    ).toBe(false);

    expect(
      validateReportResolutionInput({
        reportId: REPORT_ID,
        status: "open",
      }).ok
    ).toBe(false);

    expect(
      validateReportResolutionInput({
        reportId: REPORT_ID,
        status: "resolved",
        resolutionNote: "x".repeat(REPORT_RESOLUTION_NOTE_MAX_LENGTH + 1),
      }).ok
    ).toBe(false);

    expect(
      validateReportResolutionInput({
        reportId: REPORT_ID,
        status: "dismissed",
        resolutionNote: "  Không phát hiện vi phạm nội quy  ",
      })
    ).toEqual({
      ok: true,
      reportId: REPORT_ID,
      status: "dismissed",
      resolutionNote: "Không phát hiện vi phạm nội quy",
    });
  });
});

describe("Sprint 1B — DB Rate Limit Boundary Helpers & Block Filtering", () => {
  it("cấu hình chính xác ngưỡng an toàn cho thread (5/h), reply (20/h) và report (5/ngày)", () => {
    expect(USER_RATE_LIMITS.thread).toMatchObject({
      max: 5,
      windowMinutes: 60,
    });
    expect(USER_RATE_LIMITS.reply).toMatchObject({
      max: 20,
      windowMinutes: 60,
    });
    expect(USER_RATE_LIMITS.report).toMatchObject({
      max: 5,
      windowMinutes: 1440,
    });
  });

  it("đánh giá chính xác biên rate-limit (dưới ngưỡng, chạm ngưỡng, vượt ngưỡng, giá trị âm)", () => {
    expect(evaluateRateLimitBoundary(0, 5)).toEqual({
      allowed: true,
      count: 0,
      limit: 5,
      remaining: 5,
    });
    expect(evaluateRateLimitBoundary(4, 5)).toEqual({
      allowed: true,
      count: 4,
      limit: 5,
      remaining: 1,
    });
    expect(evaluateRateLimitBoundary(5, 5)).toEqual({
      allowed: false,
      count: 5,
      limit: 5,
      remaining: 0,
    });
    expect(evaluateRateLimitBoundary(9, 5)).toEqual({
      allowed: false,
      count: 9,
      limit: 5,
      remaining: 0,
    });
    expect(evaluateRateLimitBoundary(-3, 5)).toEqual({
      allowed: true,
      count: 0,
      limit: 5,
      remaining: 5,
    });
  });

  it("lọc bỏ chính xác tác giả nằm trong danh sách ẩn/chặn và giữ trần 200 user_blocks", () => {
    expect(MAX_BLOCKED_USERS_PER_USER).toBe(200);
    const items = [
      { id: "1", author: { id: USER_A } },
      { id: "2", author: { id: USER_B } },
      { id: "3", author: { id: USER_A } },
    ];
    expect(filterBlockedAuthors(items, new Set())).toHaveLength(3);
    expect(filterBlockedAuthors(items, new Set([USER_B]))).toEqual([
      { id: "1", author: { id: USER_A } },
      { id: "3", author: { id: USER_A } },
    ]);
  });

  it("fail-closed khi bình luận con (vd. Admin góp ý riêng) mất bình luận cha trong Blind Submission", () => {
    const adminId = "99999999-9999-4999-8999-999999999999";
    const studentA = USER_A;
    const studentX = USER_B;

    // Trường hợp 1: Cha tồn tại (bài nộp ẩn của Student A) -> góp ý riêng của Admin cũng ẩn với Student X
    const withParent = filterVisibleChallengeReplies(
      [
        {
          id: "reply-a",
          parentReplyId: null,
          author: { id: studentA, role: "student" as const },
        },
        {
          id: "reply-admin-feedback",
          parentReplyId: "reply-a",
          author: { id: adminId, role: "admin" as const },
        },
        {
          id: "reply-admin-public",
          parentReplyId: null,
          author: { id: adminId, role: "admin" as const },
        },
      ],
      {
        isBlindActive: true,
        viewerId: studentX,
        viewerRole: "student",
        threadAuthorId: adminId,
      }
    );
    expect(withParent.map((r) => r.id)).toEqual(["reply-admin-public"]);

    // Trường hợp 2: Cha bị thiếu khỏi mảng đầu vào -> vẫn fail-closed, KHÔNG lộ góp ý riêng của Admin
    const orphanChildOnly = filterVisibleChallengeReplies(
      [
        {
          id: "reply-admin-feedback",
          parentReplyId: "missing-parent-id",
          author: { id: adminId, role: "admin" as const },
        },
        {
          id: "reply-admin-public",
          parentReplyId: null,
          author: { id: adminId, role: "admin" as const },
        },
      ],
      {
        isBlindActive: true,
        viewerId: studentX,
        viewerRole: "student",
        threadAuthorId: adminId,
      }
    );
    expect(orphanChildOnly.map((r) => r.id)).toEqual(["reply-admin-public"]);
  });
});
