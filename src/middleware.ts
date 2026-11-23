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

  // Đọc thời hạn phiên từ cookie tại chỗ (~0.1ms):
  // Chỉ gọi mạng sang Supabase Auth để xoay vòng refresh_token khi access_token còn dưới 5 phút là hết hạn.
  // Điều này giúp 99% lượt bấm chuyển trang không bị chặn bởi cuộc gọi HTTPS 300ms sang máy chủ nước ngoài!
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return supabaseResponse;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const secondsLeft = (session.expires_at ?? 0) - nowSec;

  if (secondsLeft <= 300) {
    await supabase.auth.getUser();
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
