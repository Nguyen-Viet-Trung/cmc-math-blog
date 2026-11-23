"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSql } from "@/lib/db";
import {
  isAdminEmail,
  isDatabaseConfigured,
  isSupabaseStorageConfigured,
} from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeNickname, validateNickname } from "@/lib/rules";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Tạo tài khoản học sinh trực tiếp ở tầng Server (kích hoạt ngay không bị chặn bởi giới hạn 2 email/giờ của SMTP mặc định trên Supabase Free)
 */
export async function registerStudentAction(input: {
  email: string;
  password: string;
  displayName: string;
  gradeLevel: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured() || !isSupabaseStorageConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối máy chủ. Vui lòng thử lại sau.",
    };
  }

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const gradeLevel = input.gradeLevel.trim().slice(0, 30) || "THPT";
  const password = input.password;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Địa chỉ email không hợp lệ." };
  }
  if (displayName.length < 2 || displayName.length > 50) {
    return { ok: false, error: "Họ tên hiển thị cần từ 2 đến 50 ký tự." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Mật khẩu cần tối thiểu 6 ký tự." };
  }

  try {
    const reqHeaders = await headers();
    const clientIp =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip")?.trim() ||
      "unknown";
    const rate = checkRateLimit(`register:${clientIp}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rate.allowed) {
      return {
        ok: false,
        error: `Bạn thao tác đăng ký quá nhiều lần. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`,
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        grade_level: gradeLevel,
      },
    });

    if (error || !data.user) {
      const msg = error?.message || "";
      if (msg.toLowerCase().includes("already")) {
        return {
          ok: false,
          error: "Email này đã được đăng ký trước đó. Bạn hãy chuyển sang tab Đăng nhập nhé!",
        };
      }
      return { ok: false, error: msg || "Không thể tạo tài khoản." };
    }

    const sql = getSql();
    const role = isAdminEmail(email) ? "admin" : "student";

    await sql`
      INSERT INTO public.profiles (id, email, display_name, grade_level, role)
      VALUES (${data.user.id}, ${email}, ${displayName}, ${gradeLevel}, ${role})
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        grade_level = EXCLUDED.grade_level,
        role = EXCLUDED.role,
        updated_at = NOW()
    `;

    revalidateTag(CACHE_TAGS.leaderboard);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lỗi hệ thống khi tạo tài khoản.",
    };
  }
}

export async function updateProfileAction(input: {
  displayName: string;
  nickname?: string;
  gradeLevel: string;
  bio: string;
  avatarUrl: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Chưa kết nối cơ sở dữ liệu Supabase." };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để cập nhật hồ sơ." };
  }
  if (user.isBanned) {
    return { ok: false, error: "Tài khoản của bạn đang tạm khóa." };
  }

  const name = input.displayName.trim();
  if (name.length < 2 || name.length > 50) {
    return { ok: false, error: "Tên hiển thị cần từ 2 đến 50 ký tự." };
  }

  const rawNickname = input.nickname ?? "";
  const nickCheck = validateNickname(rawNickname);
  if (!nickCheck.ok) {
    return { ok: false, error: nickCheck.error };
  }
  const nickname = normalizeNickname(rawNickname);

  const grade = input.gradeLevel.trim().slice(0, 30) || "THPT";
  const bio = input.bio.trim().slice(0, 300);

  try {
    const sql = getSql();
    await sql`
      UPDATE public.profiles
      SET
        display_name = ${name},
        nickname = ${nickname},
        grade_level = ${grade},
        bio = ${bio},
        avatar_url = ${input.avatarUrl},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    revalidateTag(CACHE_TAGS.leaderboard);
    revalidateTag(CACHE_TAGS.threads);
    revalidatePath("/profile");
    revalidatePath("/leaderboard");
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.",
    };
  }
}

export async function changeOwnPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured() || !isSupabaseStorageConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối máy chủ. Vui lòng thử lại sau.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để đổi mật khẩu." };
  }

  const newPassword = input.newPassword;
  if (!input.currentPassword || input.currentPassword.length < 6) {
    return { ok: false, error: "Vui lòng nhập mật khẩu hiện tại." };
  }
  if (newPassword.length < 6 || newPassword.length > 72) {
    return { ok: false, error: "Mật khẩu mới cần từ 6 đến 72 ký tự." };
  }
  if (newPassword === input.currentPassword) {
    return { ok: false, error: "Mật khẩu mới phải khác mật khẩu hiện tại." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Không thể khởi tạo phiên xác thực." };
    }

    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: input.currentPassword,
    });
    if (verifyErr) {
      return { ok: false, error: "Mật khẩu hiện tại không chính xác." };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    if (updateErr) {
      return {
        ok: false,
        error: updateErr.message || "Không thể cập nhật mật khẩu mới.",
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Lỗi hệ thống khi đổi mật khẩu.",
    };
  }
}
