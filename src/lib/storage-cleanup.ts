import {
  STORAGE_BUCKET,
  getSupabaseUrl,
  isSupabaseStorageConfigured,
} from "./env";
import { createSupabaseAdminClient } from "./supabase/admin";

export type StorageUploadFolder = "threads" | "avatars" | "rewards";

export interface StorageOwnershipFilter {
  ownerUserId?: string;
  folder?: StorageUploadFolder;
}

/**
 * Tách đường dẫn object tương đối trong bucket từ danh sách URL public của Supabase Storage.
 * Bỏ qua an toàn các URL bên ngoài hoặc không thuộc bucket cấu hình.
 */
export function extractStoragePathsFromUrls(
  urls: readonly string[],
  bucketName: string = STORAGE_BUCKET
): string[] {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const unique = new Set<string>();

  for (const raw of urls) {
    if (!raw || typeof raw !== "string") continue;
    const idx = raw.indexOf(marker);
    if (idx === -1) continue;
    const pathPart = raw.slice(idx + marker.length).split("?")[0].trim();
    if (pathPart && !pathPart.includes("..")) {
      try {
        unique.add(decodeURIComponent(pathPart));
      } catch {
        unique.add(pathPart);
      }
    }
  }

  return Array.from(unique);
}

/**
 * Kiểm tra & chuẩn hóa danh sách URL ảnh mà người dùng gửi lên trước khi lưu vào DB.
 * - Học sinh thường chỉ được đính kèm URL ảnh thuộc đúng bucket và thư mục `${folder}/${userId}/`
 *   (hoặc các URL đã đính kèm sẵn trên bản ghi đang chỉnh sửa).
 * - Admin được phép gắn bất kỳ URL ảnh hợp lệ nào trong bucket cấu hình.
 */
export function validateOwnedStorageImageUrls(input: {
  urls: readonly string[];
  ownerUserId: string;
  userRole: "student" | "admin";
  folder?: StorageUploadFolder;
  existingAllowedUrls?: readonly string[];
  maxCount?: number;
}): { ok: true; urls: string[] } | { ok: false; error: string } {
  const maxCount = input.maxCount ?? 6;
  const folder = input.folder ?? "threads";
  if (!Array.isArray(input.urls)) {
    return { ok: true, urls: [] };
  }
  if (input.urls.length > maxCount) {
    return { ok: false, error: `Tối đa ${maxCount} hình ảnh đính kèm.` };
  }

  const supabaseUrl = getSupabaseUrl()?.replace(/\/+$/, "") ?? null;
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const ownedPrefix = `${folder}/${input.ownerUserId}/`;
  const existingSet = new Set(input.existingAllowedUrls ?? []);
  const cleaned: string[] = [];

  for (const raw of input.urls) {
    if (typeof raw !== "string") {
      return { ok: false, error: "Đường dẫn hình ảnh không hợp lệ." };
    }
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (existingSet.has(trimmed)) {
      cleaned.push(trimmed);
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { ok: false, error: "Đường dẫn hình ảnh không hợp lệ." };
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, error: "Chỉ chấp nhận đường dẫn hình ảnh HTTPS hợp lệ." };
    }

    if (supabaseUrl && !trimmed.startsWith(`${supabaseUrl}${marker}`)) {
      return {
        ok: false,
        error: "Chỉ chấp nhận hình ảnh được tải lên trực tiếp qua hệ thống.",
      };
    }

    const idx = trimmed.indexOf(marker);
    if (idx === -1) {
      return {
        ok: false,
        error: "Chỉ chấp nhận hình ảnh thuộc kho lưu trữ của diễn đàn.",
      };
    }

    const rawPath = trimmed.slice(idx + marker.length).split("?")[0].trim();
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      // keep rawPath
    }

    if (
      !decodedPath ||
      decodedPath.includes("..") ||
      decodedPath.startsWith("/") ||
      decodedPath.includes("\\")
    ) {
      return { ok: false, error: "Đường dẫn hình ảnh chứa ký tự không hợp lệ." };
    }

    if (input.userRole !== "admin" && !decodedPath.startsWith(ownedPrefix)) {
      return {
        ok: false,
        error: "Bạn không thể đính kèm hình ảnh thuộc tài khoản khác.",
      };
    }

    cleaned.push(trimmed);
  }

  return { ok: true, urls: cleaned };
}

/**
 * Xóa các ảnh mồ côi khỏi Supabase Storage theo kiểu best-effort (không làm lỗi thao tác xóa DB chính).
 * Khi truyền `filter.ownerUserId` (luồng non-admin), chỉ xóa các object nằm đúng prefix `${folder}/${ownerUserId}/`.
 */
export async function deleteStorageImagesByUrls(
  urls: readonly string[],
  filter?: StorageOwnershipFilter
): Promise<number> {
  if (!isSupabaseStorageConfigured() || urls.length === 0) return 0;
  let paths = extractStoragePathsFromUrls(urls, STORAGE_BUCKET);
  if (filter?.ownerUserId) {
    const allowedPrefix = `${filter.folder ?? "threads"}/${filter.ownerUserId}/`;
    paths = paths.filter((p) => p.startsWith(allowedPrefix));
  }
  if (paths.length === 0) return 0;

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(paths);
    if (error) {
      console.warn("[storage-cleanup] Không thể xóa ảnh trên Storage:", error.message);
      return 0;
    }
    return paths.length;
  } catch (err) {
    console.warn("[storage-cleanup] Lỗi ngoại lệ khi dọn ảnh:", err);
    return 0;
  }
}
