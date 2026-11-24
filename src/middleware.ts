import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseAuthConfigured,
} from "./lib/env";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!isSupabaseAuthConfigured()) {
    return supabaseResponse;
  }

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookie) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    getSupabaseUrl()!,
    getSupabasePublishableKey()!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Đọc và tự động làm mới phiên từ cookie cục bộ:
  // `getSession()` đã tích hợp cơ chế tự xoay vòng refresh_token trong ngưỡng 90 giây trước khi hết hạn;
  // tránh gọi thêm `getUser()` trên mọi request trong cửa sổ 300s (vốn không làm mới token mà gây chậm +250ms/request).
  await supabase.auth.getSession();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|api/cron/|api/feedbacks|api/threads/[^/]+/view|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)",
  ],
};
