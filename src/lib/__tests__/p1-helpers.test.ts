import { beforeEach, describe, expect, it } from "vitest";
import { buildParameterizedQuery } from "../db";
import { checkRateLimit, resetRateLimitStore } from "../rate-limit";
import {
  extractStoragePathsFromUrls,
  validateOwnedStorageImageUrls,
} from "../storage-cleanup";

describe("checkRateLimit — chống spam theo cửa sổ trượt", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("cho phép trong giới hạn và chặn khi vượt quá maxRequests", () => {
    const cfg = { maxRequests: 3, windowMs: 60_000 };
    const t0 = 1_000_000;

    expect(checkRateLimit("upload:u1", cfg, t0).allowed).toBe(true);
    expect(checkRateLimit("upload:u1", cfg, t0 + 1000).allowed).toBe(true);
    expect(checkRateLimit("upload:u1", cfg, t0 + 2000).allowed).toBe(true);

    const blocked = checkRateLimit("upload:u1", cfg, t0 + 3000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // Sau khi hết cửa sổ thời gian thì được phép trở lại
    expect(checkRateLimit("upload:u1", cfg, t0 + 61_000).allowed).toBe(true);
  });

  it("tách biệt quota giữa các user/action khác nhau", () => {
    const cfg = { maxRequests: 1, windowMs: 60_000 };
    expect(checkRateLimit("thread:u1", cfg, 10_000).allowed).toBe(true);
    expect(checkRateLimit("thread:u1", cfg, 11_000).allowed).toBe(false);
    expect(checkRateLimit("thread:u2", cfg, 11_000).allowed).toBe(true);
  });
});

describe("extractStoragePathsFromUrls — trích xuất đường dẫn ảnh cần dọn trên Supabase Storage", () => {
  it("tách đúng đường dẫn tương đối trong bucket và loại bỏ trùng lặp/URL ngoài", () => {
    const urls = [
      "https://abc.supabase.co/storage/v1/object/public/math-forum-media/threads/u1/123.webp",
      "https://abc.supabase.co/storage/v1/object/public/math-forum-media/threads/u1/123.webp?t=999",
      "https://abc.supabase.co/storage/v1/object/public/math-forum-media/avatars/u2/img%201.png",
      "https://images.unsplash.com/photo-12345",
      "https://abc.supabase.co/storage/v1/object/public/other-bucket/x.png",
      "https://abc.supabase.co/storage/v1/object/public/math-forum-media/../secret.txt",
    ];

    expect(extractStoragePathsFromUrls(urls, "math-forum-media")).toEqual([
      "threads/u1/123.webp",
      "avatars/u2/img 1.png",
    ]);
  });

  it("chặn học sinh gắn URL ảnh của người khác / bucket ngoài / path traversal, cho phép ảnh chính chủ và Admin", () => {
    const ownUrl =
      "https://abc.supabase.co/storage/v1/object/public/math-forum-media/threads/u1/123.webp";
    const otherUserUrl =
      "https://abc.supabase.co/storage/v1/object/public/math-forum-media/threads/u2/456.webp";
    const rewardUrl =
      "https://abc.supabase.co/storage/v1/object/public/math-forum-media/rewards/admin/prize.webp";

    expect(
      validateOwnedStorageImageUrls({
        urls: [ownUrl],
        ownerUserId: "u1",
        userRole: "student",
      })
    ).toEqual({ ok: true, urls: [ownUrl] });

    expect(
      validateOwnedStorageImageUrls({
        urls: [otherUserUrl],
        ownerUserId: "u1",
        userRole: "student",
      }).ok
    ).toBe(false);

    expect(
      validateOwnedStorageImageUrls({
        urls: [rewardUrl],
        ownerUserId: "u1",
        userRole: "student",
      }).ok
    ).toBe(false);

    expect(
      validateOwnedStorageImageUrls({
        urls: [otherUserUrl],
        ownerUserId: "admin-1",
        userRole: "admin",
      })
    ).toEqual({ ok: true, urls: [otherUserUrl] });
  });
});

describe("buildParameterizedQuery — dựng truy vấn tham số hóa an toàn cho pg", () => {
  it("chuyển tagged template sang $1..$n và chuẩn hóa undefined thành null", () => {
    const tag = (strings: TemplateStringsArray, ...values: unknown[]) =>
      buildParameterizedQuery(strings, values);
    const q = tag`SELECT * FROM public.threads WHERE id = ${"abc"} AND status = ${undefined} AND tags = ${["a", "b"]}`;
    expect(q.text).toBe(
      "SELECT * FROM public.threads WHERE id = $1 AND status = $2 AND tags = $3"
    );
    expect(q.params).toEqual(["abc", null, ["a", "b"]]);
  });
});
