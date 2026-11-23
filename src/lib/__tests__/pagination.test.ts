import { describe, expect, it } from "vitest";
import {
  buildPaginatedResult,
  getVisiblePageNumbers,
  normalizePagination,
  paginateSlice,
} from "../pagination";

describe("pagination helpers — chuẩn hóa tham số, cắt trang & dải số trang", () => {
  it("chuẩn hóa tham số page/pageSize an toàn và tính đúng offset", () => {
    expect(normalizePagination(undefined, undefined, 10)).toEqual({
      page: 1,
      pageSize: 10,
      offset: 0,
    });
    expect(normalizePagination("-3", "999", 10, 50)).toEqual({
      page: 1,
      pageSize: 50,
      offset: 0,
    });
    expect(normalizePagination("3", "15", 10, 50)).toEqual({
      page: 3,
      pageSize: 15,
      offset: 30,
    });
  });

  it("tính đúng totalPages và kẹp page khi vượt quá tổng số trang", () => {
    expect(buildPaginatedResult(["a", "b"], 25, 2, 10)).toEqual({
      items: ["a", "b"],
      totalCount: 25,
      page: 2,
      pageSize: 10,
      totalPages: 3,
    });
    expect(buildPaginatedResult([], 0, 5, 10)).toEqual({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  it("cắt mảng chính xác theo trang bằng paginateSlice", () => {
    const items = Array.from({ length: 23 }, (_, i) => i + 1);
    const p3 = paginateSlice(items, 3, 10);
    expect(p3.items).toEqual([21, 22, 23]);
    expect(p3.totalPages).toBe(3);
    expect(p3.page).toBe(3);
  });

  it("tạo dải nút số trang kèm dấu chấm lửng gọn gàng", () => {
    expect(getVisiblePageNumbers(1, 4)).toEqual([1, 2, 3, 4]);
    expect(getVisiblePageNumbers(1, 10)).toEqual([1, 2, "ellipsis", 10]);
    expect(getVisiblePageNumbers(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
    expect(getVisiblePageNumbers(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });
});
