import { describe, expect, it } from "vitest";
import {
  buildHomeFilterUrl,
  formatDateVN,
  formatDurationShort,
  formatRelativeDate,
  getThreadTypeLabel,
  toDateInputValue,
} from "../format";
import { getRoutePageTitle, isNavRouteActive } from "../navigation";

describe("format utilities — định dạng thời gian, nhãn bài viết & URL lọc", () => {
  it("định dạng thời gian tương đối chính xác theo từng mốc", () => {
    const base = new Date("2026-11-23T12:00:00Z").getTime();
    expect(formatRelativeDate("2026-11-23T11:59:40Z", base)).toBe("Vừa xong");
    expect(formatRelativeDate("2026-11-23T11:45:00Z", base)).toBe(
      "15 phút trước"
    );
    expect(formatRelativeDate("2026-11-23T09:00:00Z", base)).toBe(
      "3 giờ trước"
    );
    expect(formatRelativeDate("2026-11-18T12:00:00Z", base)).toBe(
      "5 ngày trước"
    );
  });

  it("định dạng khoảng thời gian ngắn an toàn với số âm và các đơn vị", () => {
    expect(formatDurationShort(-5)).toBe("0 giây");
    expect(formatDurationShort(42)).toBe("42 giây");
    expect(formatDurationShort(185)).toBe("3 phút");
    expect(formatDurationShort(7200)).toBe("2 giờ");
    expect(formatDurationShort(172800)).toBe("2 ngày");
  });

  it("định dạng ngày gia nhập dd/MM/yyyy và giá trị input date YYYY-MM-DD", () => {
    expect(formatDateVN("2024-09-05T00:00:00.000Z")).toBe("05/09/2024");
    expect(formatDateVN("invalid")).toBe("—");
    expect(toDateInputValue("2024-09-05T15:30:00.000Z")).toBe("2024-09-05");
    expect(toDateInputValue("invalid")).toBe("");
  });

  it("trả đúng nhãn cho từng loại bài viết", () => {
    expect(getThreadTypeLabel("question")).toBe("Hỏi bài");
    expect(getThreadTypeLabel("news")).toBe("News");
    expect(getThreadTypeLabel("research")).toBe("Research");
  });

  it("tạo URL lọc trang chủ sạch, bỏ qua tham số mặc định", () => {
    expect(buildHomeFilterUrl({ type: "all", status: "all", q: "  " })).toBe(
      "/"
    );
    expect(
      buildHomeFilterUrl({
        type: "research",
        cat: "dai-so",
        status: "open",
        q: "Cauchy",
        page: 3,
      })
    ).toBe("/?type=research&cat=dai-so&status=open&q=Cauchy&page=3");
    expect(buildHomeFilterUrl({ page: 1 })).toBe("/");
  });
});

describe("navigation helpers — nhận diện route active & tiêu đề header", () => {
  it("ánh xạ tiêu đề header cho các tuyến đường chính", () => {
    expect(getRoutePageTitle("/")).toBe("Diễn đàn");
    expect(getRoutePageTitle("/threads/new")).toBe("Đăng câu hỏi mới");
    expect(getRoutePageTitle("/threads/abc-123")).toBe("Thảo luận bài toán");
    expect(getRoutePageTitle("/admin")).toBe("Admin Portal");
  });

  it("đánh dấu active chính xác cho Diễn đàn (bao gồm /threads/*) và các trang con", () => {
    expect(isNavRouteActive("/threads/123", "/")).toBe(true);
    expect(isNavRouteActive("/rewards", "/")).toBe(false);
    expect(isNavRouteActive("/rewards", "/rewards")).toBe(true);
    expect(isNavRouteActive("/admin", "/admin")).toBe(true);
  });
});
