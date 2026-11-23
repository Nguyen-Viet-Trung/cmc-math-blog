import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseAuthConfigured,
} from "../env";

/**
 * Kiểm tra nhanh tại chỗ (< 0.1ms) xem request có mang cookie phiên Supabase (`sb-*`) hay không.
 * Tránh khởi tạo Supabase client và tránh rơi xuống `auth.getUser()` qua HTTPS cho khách chưa đăng nhập.
 */
export async function hasSupabaseAuthCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.getAll().some((c) => c.name.startsWith("sb-"));
}

export async function createSupabaseServerClient() {
  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(
    getSupabaseUrl()!,
    getSupabasePublishableKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Bỏ qua khi gọi từ Server Component chỉ đọc
          }
        },
      },
    }
  );
}
