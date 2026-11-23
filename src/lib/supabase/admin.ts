import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSupabaseStorageConfigured,
} from "../env";

export function createSupabaseAdminClient() {
  if (!isSupabaseStorageConfigured()) {
    throw new Error(
      "Chưa cấu hình SUPABASE_SECRET_KEY trong key.txt. Vui lòng bổ sung và chạy `npm run setup`."
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
