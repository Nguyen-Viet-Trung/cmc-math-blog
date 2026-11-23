import { describe, expect, it } from "vitest";
import {
  analyzeAdminReplyAudits,
  isValidThreadType,
  normalizeNickname,
  normalizeThreadType,
  parseClubJoinedDate,
  validateAcceptAnswer,
  validateNickname,
  validateRedemptionTransition,
  validateReplyAuthorMutation,
  validateRewardRedemption,
  validateThreadAuthorMutation,
  validateThreadAuthorReward,
  validateUploadPayload,
} from "../rules";
import type { AdminReplyAuditItem } from "../types";

describe("validateAcceptAnswer — luật học sinh tự tick lời giải đúng cộng điểm", () => {
  it("cho phép người đăng bài chọn lời giải của bạn khác khi bài đang mở", () => {
    const res = validateAcceptAnswer({
      callerId: "author-1",
      callerRole: "student",
      threadAuthorId: "author-1",
      threadStatus: "open",
      acceptedReplyId: null,
      replyAuthorId: "solver-2",
      replyAuthorBanned: false,
    });
    expect(res).toEqual({ ok: true });
  });

  it("chặn tuyệt đối người đăng bài tự tick câu trả lời của chính mình", () => {
    const res = validateAcceptAnswer({
      callerId: "author-1",
      callerRole: "student",
      threadAuthorId: "author-1",
      threadStatus: "open",
      acceptedReplyId: null,
      replyAuthorId: "author-1",
      replyAuthorBanned: false,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("chính mình");
    }
  });

  it("chặn học sinh thứ ba (không phải chủ bài) tick lời giải", () => {
    const res = validateAcceptAnswer({
      callerId: "stranger-3",
      callerRole: "student",
      threadAuthorId: "author-1",
      threadStatus: "open",
      acceptedReplyId: null,
      replyAuthorId: "solver-2",
      replyAuthorBanned: false,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.statusCode).toBe(403);
    }
  });

  it("chặn cộng điểm hai lần trên bài toán đã giải", () => {
    const res = validateAcceptAnswer({
      callerId: "author-1",
      callerRole: "student",
      threadAuthorId: "author-1",
      threadStatus: "solved",
      acceptedReplyId: "reply-existing",
      replyAuthorId: "solver-2",
      replyAuthorBanned: false,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.statusCode).toBe(409);
    }
  });
});

describe("validateRewardRedemption — luật đổi quà theo mốc điểm", () => {
  it("cho phép đổi khi đủ điểm và còn quà", () => {
    expect(
      validateRewardRedemption({
        userBanned: false,
        userPoints: 120,
        rewardActive: true,
        rewardCost: 100,
        rewardStock: 2,
      })
    ).toEqual({ ok: true });
  });

  it("từ chối khi chưa đủ mốc điểm", () => {
    const res = validateRewardRedemption({
      userBanned: false,
      userPoints: 45,
      rewardActive: true,
      rewardCost: 50,
      rewardStock: 5,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("5 điểm");
    }
  });

  it("từ chối khi hết hàng trong kho", () => {
    const res = validateRewardRedemption({
      userBanned: false,
      userPoints: 200,
      rewardActive: true,
      rewardCost: 50,
      rewardStock: 0,
    });
    expect(res.ok).toBe(false);
  });
});

describe("validateUploadPayload — kiểm tra giới hạn 1MB & magic bytes WebP", () => {
  const validWebPHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  it("chấp nhận ảnh WebP hợp lệ <= 1MB", () => {
    const res = validateUploadPayload({
      sizeBytes: 150 * 1024,
      mimeType: "image/webp",
      headerBytes: validWebPHeader,
      folder: "threads",
      userRole: "student",
    });
    expect(res).toEqual({ ok: true });
  });

  it("chặn ảnh vượt quá trần 1MB ở Backend", () => {
    const res = validateUploadPayload({
      sizeBytes: 1024 * 1024 + 1,
      mimeType: "image/webp",
      headerBytes: validWebPHeader,
      folder: "threads",
      userRole: "student",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.statusCode).toBe(413);
    }
  });

  it("chặn học sinh thường upload vào thư mục ảnh quà tặng Admin", () => {
    const res = validateUploadPayload({
      sizeBytes: 50 * 1024,
      mimeType: "image/webp",
      headerBytes: validWebPHeader,
      folder: "rewards",
      userRole: "student",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.statusCode).toBe(403);
    }
  });
});

describe("analyzeAdminReplyAudits — phát hiện dấu hiệu học sinh buff điểm", () => {
  function makeReply(
    overrides: Partial<AdminReplyAuditItem>
  ): AdminReplyAuditItem {
    return {
      id: "r1",
      threadId: "t1",
      threadTitle: "Giải phương trình bậc 2",
      threadStatus: "solved",
      threadBountyPoints: 10,
      threadCreatedAt: "2026-11-20T08:00:00Z",
      threadAuthorId: "u-a",
      threadAuthorName: "Học sinh A",
      threadAuthorEmail: "a@example.com",
      replyAuthorId: "u-b",
      replyAuthorName: "Học sinh B",
      replyAuthorEmail: "b@example.com",
      replyAuthorGrade: "Lớp 10",
      replyAuthorPoints: 50,
      replyAuthorSolvedCount: 5,
      replyAuthorBanned: false,
      content:
        "Ta có phương trình $x^2 - 3x + 2 = 0 \\Leftrightarrow (x-1)(x-2)=0$, suy ra nghiệm $x=1$ hoặc $x=2$.",
      imageUrls: [],
      isAccepted: true,
      upvotesCount: 1,
      awardedPoints: 10,
      acceptedByName: "Học sinh A",
      secondsAfterThread: 600,
      createdAt: "2026-11-20T08:10:00Z",
      ...overrides,
    };
  }

  it("không gắn cờ với lời giải dài hợp lệ, phản hồi bình thường và không buff chéo", () => {
    const res = analyzeAdminReplyAudits([makeReply({})]);
    expect(res.flagsByReplyId).toEqual({});
    expect(res.suspiciousPairs).toEqual([]);
  });

  it("phát hiện buff điểm chéo 2 chiều (A duyệt B và B duyệt A)", () => {
    const r1 = makeReply({
      id: "r1",
      threadId: "t1",
      threadAuthorId: "u-a",
      replyAuthorId: "u-b",
    });
    const r2 = makeReply({
      id: "r2",
      threadId: "t2",
      threadAuthorId: "u-b",
      threadAuthorName: "Học sinh B",
      threadAuthorEmail: "b@example.com",
      replyAuthorId: "u-a",
      replyAuthorName: "Học sinh A",
      replyAuthorEmail: "a@example.com",
    });

    const res = analyzeAdminReplyAudits([r1, r2]);
    expect(res.flagsByReplyId["r1"]).toContain("mutual_pair");
    expect(res.flagsByReplyId["r2"]).toContain("mutual_pair");
    expect(res.suspiciousPairs).toHaveLength(1);
    expect(res.suspiciousPairs[0].isMutual).toBe(true);
    expect(res.suspiciousPairs[0].totalPointsTransferred).toBe(20);
  });

  it("phát hiện lời giải được duyệt quá ngắn, trả lời quá nhanh và lặp cặp nhiều lần", () => {
    const r1 = makeReply({
      id: "r1",
      threadId: "t1",
      content: "đáp án là 5",
      secondsAfterThread: 25,
    });
    const r2 = makeReply({
      id: "r2",
      threadId: "t2",
      content: "Lời giải chi tiết kèm biến đổi đầy đủ các bước chứng minh.",
      secondsAfterThread: 400,
    });

    const res = analyzeAdminReplyAudits([r1, r2]);
    expect(res.flagsByReplyId["r1"]).toEqual(
      expect.arrayContaining([
        "repeated_pair",
        "short_accepted",
        "ultra_fast_reply",
      ])
    );
    expect(res.flagsByReplyId["r2"]).toContain("repeated_pair");
    expect(res.suspiciousPairs).toHaveLength(1);
    expect(res.suspiciousPairs[0].totalAcceptedCount).toBe(2);
  });
});

describe("ThreadType & validateThreadAuthorReward — phân loại News/Research và thưởng tác giả", () => {
  it("chấp nhận question, news, research và chuẩn hóa giá trị lạ về question", () => {
    expect(isValidThreadType("question")).toBe(true);
    expect(isValidThreadType("news")).toBe(true);
    expect(isValidThreadType("research")).toBe(true);
    expect(isValidThreadType("other")).toBe(false);
    expect(normalizeThreadType("research")).toBe("research");
    expect(normalizeThreadType("invalid")).toBe("question");
  });

  it("cho phép Admin cộng điểm tùy chỉnh hợp lệ (1–1000) cho tác giả", () => {
    expect(
      validateThreadAuthorReward({
        callerRole: "admin",
        points: 35,
        authorBanned: false,
      })
    ).toEqual({ ok: true });
  });

  it("chặn học sinh thường, số điểm ngoài biên hoặc tác giả đang bị khóa", () => {
    const nonAdmin = validateThreadAuthorReward({
      callerRole: "student",
      points: 20,
      authorBanned: false,
    });
    expect(nonAdmin.ok).toBe(false);

    const outOfRange = validateThreadAuthorReward({
      callerRole: "admin",
      points: 0,
      authorBanned: false,
    });
    expect(outOfRange.ok).toBe(false);

    const banned = validateThreadAuthorReward({
      callerRole: "admin",
      points: 20,
      authorBanned: true,
    });
    expect(banned.ok).toBe(false);
  });
});

describe("User Profile — biệt danh (nickname) & ngày gia nhập CLB (joinedAt)", () => {
  it("chuẩn hóa khoảng trắng và chặn biệt danh vượt quá 40 ký tự", () => {
    expect(normalizeNickname("  Gauss   nhí  ")).toBe("Gauss nhí");
    expect(validateNickname("")).toEqual({ ok: true });
    expect(validateNickname("  Vua Bất Đẳng Thức  ")).toEqual({ ok: true });
    const tooLong = validateNickname("a".repeat(41));
    expect(tooLong.ok).toBe(false);
  });

  it("chấp nhận ngày YYYY-MM-DD hợp lệ và từ chối ngày sai lịch hoặc ngoài biên", () => {
    const valid = parseClubJoinedDate("2024-09-05");
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.isoDate).toBe("2024-09-05T00:00:00.000Z");
    }

    expect(parseClubJoinedDate("").ok).toBe(false);
    expect(parseClubJoinedDate("2024-02-31").ok).toBe(false);
    expect(parseClubJoinedDate("1995-01-01").ok).toBe(false);
    expect(parseClubJoinedDate("2099-12-31").ok).toBe(false);
  });
});

describe("validateRedemptionTransition — kiểm soát trạng thái xử lý đơn đổi quà", () => {
  it("cho phép chuyển pending/approved sang trạng thái tiếp theo hợp lệ", () => {
    expect(validateRedemptionTransition("pending", "approved")).toEqual({
      ok: true,
    });
    expect(validateRedemptionTransition("pending", "fulfilled")).toEqual({
      ok: true,
    });
    expect(validateRedemptionTransition("approved", "fulfilled")).toEqual({
      ok: true,
    });
    expect(validateRedemptionTransition("approved", "rejected")).toEqual({
      ok: true,
    });
  });

  it("chặn thay đổi hoặc hoàn điểm lại cho đơn đã hoàn thành hoặc đã từ chối", () => {
    expect(validateRedemptionTransition("fulfilled", "rejected").ok).toBe(false);
    expect(validateRedemptionTransition("fulfilled", "approved").ok).toBe(false);
    expect(validateRedemptionTransition("rejected", "fulfilled").ok).toBe(false);
    expect(validateRedemptionTransition("approved", "approved").ok).toBe(false);
  });
});

describe("validateThreadAuthorMutation & validateReplyAuthorMutation — quyền tự sửa/xóa bài & bình luận", () => {
  it("cho phép tác giả sửa/xóa bài open của chính mình nhưng chặn tự xóa bài đã giải", () => {
    expect(
      validateThreadAuthorMutation({
        callerId: "u1",
        callerRole: "student",
        threadAuthorId: "u1",
        threadStatus: "open",
        acceptedReplyId: null,
        action: "edit",
      })
    ).toEqual({ ok: true });

    expect(
      validateThreadAuthorMutation({
        callerId: "u1",
        callerRole: "student",
        threadAuthorId: "u1",
        threadStatus: "solved",
        acceptedReplyId: "r1",
        action: "delete",
      }).ok
    ).toBe(false);

    expect(
      validateThreadAuthorMutation({
        callerId: "u2",
        callerRole: "student",
        threadAuthorId: "u1",
        threadStatus: "open",
        acceptedReplyId: null,
        action: "edit",
      }).ok
    ).toBe(false);
  });

  it("chặn học sinh sửa/xóa bình luận đã được chọn cộng điểm hoặc trong chủ đề đã đóng", () => {
    expect(
      validateReplyAuthorMutation({
        callerId: "u1",
        callerRole: "student",
        replyAuthorId: "u1",
        isAccepted: false,
        threadStatus: "open",
      })
    ).toEqual({ ok: true });

    expect(
      validateReplyAuthorMutation({
        callerId: "u1",
        callerRole: "student",
        replyAuthorId: "u1",
        isAccepted: true,
        threadStatus: "solved",
      }).ok
    ).toBe(false);

    expect(
      validateReplyAuthorMutation({
        callerId: "u1",
        callerRole: "student",
        replyAuthorId: "u1",
        isAccepted: false,
        threadStatus: "closed",
      }).ok
    ).toBe(false);
  });
});
