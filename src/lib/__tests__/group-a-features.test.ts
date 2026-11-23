import { describe, expect, it } from "vitest";
import { parseMathContentSegments } from "../math-blocks";
import {
  compileMathExpression,
  parseGraphBlock,
  parseSafeMathEmbedUrl,
} from "../math-diagram";
import {
  canViewReplyInChallenge,
  extractMentionedNames,
  isChallengeBlindActive,
  isValidThreadType,
  slugifyCollectionTitle,
  validateChallengeAward,
  validateChallengeDeadline,
  validateCollectionInput,
} from "../rules";

describe("A1: parseMathContentSegments — khối :::hint, :::solution, :::spoiler & đồ thị", () => {
  it("tách đúng văn bản Markdown, khối Hint, khối Solution và khối graph", () => {
    const md = [
      "Cho $a, b > 0$. Chứng minh $a + b \\ge 2\\sqrt{ab}$.",
      "",
      ":::hint Gợi ý AM-GM",
      "Xét hiệu $(\\sqrt{a} - \\sqrt{b})^2 \\ge 0$.",
      ":::",
      "",
      ":::solution Lời giải chuẩn",
      "Ta có $a + b - 2\\sqrt{ab} = (\\sqrt{a} - \\sqrt{b})^2 \\ge 0$.",
      ":::",
      "",
      "```graph",
      "x: -4..4",
      "y: -2..6",
      "f(x) = x^2",
      "```",
    ].join("\n");

    const segs = parseMathContentSegments(md);
    expect(segs).toHaveLength(4);
    expect(segs[0].type).toBe("markdown");
    expect(segs[1]).toEqual({
      type: "callout",
      kind: "hint",
      title: "Gợi ý AM-GM",
      content: "Xét hiệu $(\\sqrt{a} - \\sqrt{b})^2 \\ge 0$.",
    });
    expect(segs[2]).toEqual({
      type: "callout",
      kind: "solution",
      title: "Lời giải chuẩn",
      content: "Ta có $a + b - 2\\sqrt{ab} = (\\sqrt{a} - \\sqrt{b})^2 \\ge 0$.",
    });
    expect(segs[3]).toEqual({
      type: "diagram",
      kind: "graph",
      source: "x: -4..4\ny: -2..6\nf(x) = x^2",
    });
  });

  it("giữ nguyên :::hint nếu không có dấu đóng ::: và không parse khối bên trong code fence thường", () => {
    const md = "```txt\n:::hint Không parse\nhello\n:::\n```";
    const segs = parseMathContentSegments(md);
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("markdown");
  });
});

describe("A2: math-diagram — bộ tính toán biểu thức an toàn (no eval) & nhúng GeoGebra/Desmos", () => {
  it("tính đúng hàm đa thức, nhân ngầm, lượng giác, lũy thừa và căn bậc hai", () => {
    const f = compileMathExpression("2x^2 - 3(x + 1) + sqrt(16)");
    expect(f(3)).toBeCloseTo(2 * 9 - 3 * 4 + 4, 8);

    const g = compileMathExpression("sin(pi / 2) + ln(e^2)");
    expect(g(0)).toBeCloseTo(3, 8);

    const h = compileMathExpression("-x^2 + 1");
    expect(h(2)).toBeCloseTo(-3, 8);
  });

  it("từ chối biểu thức chứa định danh lạ hoặc ký tự tiêm mã", () => {
    expect(() => compileMathExpression("window.alert(1)")).toThrow();
    expect(() => compileMathExpression("x + ;")).toThrow();
  });

  it("parse khối graph đầy đủ miền x/y, nhiều hàm và điểm đặc biệt", () => {
    const spec = parseGraphBlock(`
      x: -5..5
      y: -3..7
      f(x) = x^2 - 2x
      g(x) = x + 2
      point: (1, -1) I
    `);
    expect(spec.error).toBeUndefined();
    expect(spec.xMin).toBe(-5);
    expect(spec.xMax).toBe(5);
    expect(spec.curves).toHaveLength(2);
    expect(spec.points).toEqual([{ x: 1, y: -1, label: "I" }]);
  });

  it("chỉ cho phép nhúng đường dẫn HTTPS chính thức từ GeoGebra & Desmos", () => {
    const ggb = parseSafeMathEmbedUrl(
      "geogebra",
      "https://www.geogebra.org/m/abc123XY | Đường tròn Euler"
    );
    expect(ggb).not.toBeNull();
    expect(ggb?.embedUrl).toContain("https://www.geogebra.org/material/iframe/id/abc123XY");
    expect(ggb?.title).toBe("Đường tròn Euler");

    const desmos = parseSafeMathEmbedUrl(
      "desmos",
      "https://www.desmos.com/calculator/xyz987"
    );
    expect(desmos?.embedUrl).toBe("https://www.desmos.com/calculator/xyz987?embed");

    // Chặn các nguồn độc hại / không thuộc allowlist
    expect(
      parseSafeMathEmbedUrl("geogebra", "https://evil.com/m/abc123")
    ).toBeNull();
    expect(
      parseSafeMathEmbedUrl("desmos", "http://www.desmos.com/calculator/abc123")
    ).toBeNull();
    expect(
      parseSafeMathEmbedUrl("geogebra", "javascript:alert(1)")
    ).toBeNull();
  });
});

describe("A3: Thử thách Tuần (Challenge) — Blind Submission & Chấm nhiều lời giải đúng", () => {
  const now = Date.UTC(2026, 10, 23, 12, 0, 0);
  const futureIso = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
  const pastIso = new Date(now - 60_000).toISOString();

  it("nhận diện loại bài challenge và bật/tắt chế độ Blind Submission đúng hạn", () => {
    expect(isValidThreadType("challenge")).toBe(true);
    expect(isChallengeBlindActive("challenge", "open", futureIso, now)).toBe(true);
    expect(isChallengeBlindActive("challenge", "open", pastIso, now)).toBe(false);
    expect(isChallengeBlindActive("challenge", "closed", futureIso, now)).toBe(false);
    expect(isChallengeBlindActive("question", "open", futureIso, now)).toBe(false);
  });

  it("ẩn bài nộp của học sinh khác khi Blind Submission bật, nhưng luôn cho Admin & chính chủ xem", () => {
    expect(
      canViewReplyInChallenge({
        isBlindActive: true,
        viewerId: "student-a",
        viewerRole: "student",
        threadAuthorId: "admin-1",
        replyAuthorId: "student-b",
        replyAuthorRole: "student",
      })
    ).toBe(false);

    expect(
      canViewReplyInChallenge({
        isBlindActive: true,
        viewerId: "student-a",
        viewerRole: "student",
        threadAuthorId: "admin-1",
        replyAuthorId: "student-a",
        replyAuthorRole: "student",
      })
    ).toBe(true);

    expect(
      canViewReplyInChallenge({
        isBlindActive: true,
        viewerId: "admin-2",
        viewerRole: "admin",
        threadAuthorId: "admin-1",
        replyAuthorId: "student-b",
        replyAuthorRole: "student",
      })
    ).toBe(true);
  });

  it("kiểm tra hạn thử thách và điều kiện chấm điểm nhiều người thắng cuộc", () => {
    expect(validateChallengeDeadline(futureIso, now).ok).toBe(true);
    expect(validateChallengeDeadline(pastIso, now).ok).toBe(false);

    expect(
      validateChallengeAward({
        callerRole: "admin",
        threadType: "challenge",
        replyAuthorId: "student-1",
        threadAuthorId: "admin-1",
        replyAuthorBanned: false,
        alreadyAccepted: false,
        alreadyRewardedUser: false,
        bountyPoints: 30,
      })
    ).toEqual({ ok: true });

    // Chặn học sinh thường tự chấm hoặc chấm trùng 1 học sinh 2 lần
    expect(
      validateChallengeAward({
        callerRole: "student",
        threadType: "challenge",
        replyAuthorId: "student-1",
        threadAuthorId: "admin-1",
        replyAuthorBanned: false,
        alreadyAccepted: false,
        alreadyRewardedUser: false,
        bountyPoints: 30,
      }).ok
    ).toBe(false);

    expect(
      validateChallengeAward({
        callerRole: "admin",
        threadType: "challenge",
        replyAuthorId: "student-1",
        threadAuthorId: "admin-1",
        replyAuthorBanned: false,
        alreadyAccepted: false,
        alreadyRewardedUser: true,
        bountyPoints: 30,
      }).ok
    ).toBe(false);
  });
});

describe("A4 & A5: Bộ sưu tập Chuyên đề (Collections) & Trích xuất @mention", () => {
  it("tạo slug chuẩn không dấu tiếng Việt và kiểm tra đầu vào chuyên đề", () => {
    expect(slugifyCollectionTitle("Bất đẳng thức Cauchy–Schwarz lớp 10")).toBe(
      "bat-dang-thuc-cauchy-schwarz-lop-10"
    );
    const ok = validateCollectionInput({
      title: "Tuyển tập Đề thi Chuyên Toán",
      description: "Tổng hợp 15 đề thi chọn lọc",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.slug).toBe("tuyen-tap-de-thi-chuyen-toan");
    }
    expect(validateCollectionInput({ title: "AB" }).ok).toBe(false);
  });

  it("trích xuất đúng @[Tên Đầy Đủ] và @nickname nhưng không nhầm địa chỉ email", () => {
    const names = extractMentionedNames(
      "Cảm ơn @[Nguyễn Minh Khôi] và @gauss_nhi đã hướng dẫn! Liên hệ test@gmail.com"
    );
    expect(names).toEqual(["Nguyễn Minh Khôi", "gauss_nhi"]);
  });
});
