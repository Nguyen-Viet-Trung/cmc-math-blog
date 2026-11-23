import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSupabaseStorageConfigured,
} from "../env";

export function createSupabaseAdminClient() {
  if (!isSupabaseStorageConfigured()) {
    throw new Error(
      "Dịch vụ xác thực và lưu trữ hiện chưa sẵn sàng. Vui lòng thử lại sau."
    );
  }

  return createClient(
    getSupabaseUrl()!,
    getSupabaseSecretKey()!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
