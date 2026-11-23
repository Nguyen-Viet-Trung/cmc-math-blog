import { STORAGE_BUCKET, isSupabaseStorageConfigured } from "./env";
import { createSupabaseAdminClient } from "./supabase/admin";

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
 * Xóa các ảnh mồ côi khỏi Supabase Storage theo kiểu best-effort (không làm lỗi thao tác xóa DB chính).
 */
export async function deleteStorageImagesByUrls(
  urls: readonly string[]
): Promise<number> {
  if (!isSupabaseStorageConfigured() || urls.length === 0) return 0;
  const paths = extractStoragePathsFromUrls(urls, STORAGE_BUCKET);
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
