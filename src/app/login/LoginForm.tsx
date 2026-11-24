"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { registerStudentAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRefreshAppSession } from "@/hooks/useAppSession";

const GRADE_OPTIONS = [
  "Lớp 6",
  "Lớp 7",
  "Lớp 8",
  "Lớp 9",
  "Lớp 10",
  "Lớp 11",
  "Lớp 12",
  "Chuyên Toán / HSG",
  "Đại học / Giáo viên",
];

function localizeAuthError(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials")
  ) {
    return "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.";
  }
  if (lower.includes("email not confirmed")) {
    return "Tài khoản này chưa được kích hoạt email. Vui lòng liên hệ Ban Quản Trị.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Bạn thao tác quá nhiều lần liên tiếp. Vui lòng thử lại sau ít phút.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "Email này đã được đăng ký trước đó. Hãy chuyển sang tab Đăng nhập nhé.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Không thể kết nối máy chủ xác thực. Vui lòng kiểm tra mạng và thử lại.";
  }
  return rawMessage || "Không thể xác thực tài khoản.";
}

export function LoginForm({
  isConfigured,
  nextPath = "/",
}: {
  isConfigured: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const refreshSession = useRefreshAppSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Lớp 10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfigured) {
      setError(
        "Hệ thống đang bảo trì kết nối máy chủ. Vui lòng thử lại sau."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const { createSupabaseBrowserClient } = await import(
        "@/lib/supabase/client"
      );
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
        await refreshSession();
        router.push(nextPath);
        router.refresh();
      } else {
        if (displayName.trim().length < 2) {
          throw new Error(
            "Vui lòng nhập họ tên hiển thị của bạn (tối thiểu 2 ký tự)."
          );
        }
        if (password !== confirmPassword) {
          throw new Error("Mật khẩu nhập lại chưa khớp. Vui lòng kiểm tra lại.");
        }

        const regRes = await registerStudentAction({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          gradeLevel,
        });

        if (!regRes.ok) {
          throw new Error(regRes.error || "Không thể đăng ký tài khoản.");
        }

        const { error: autoLoginErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (autoLoginErr) {
          setInfo(
            "Tài khoản đã được tạo thành công! Bạn hãy bấm Đăng nhập nhé."
          );
          setMode("login");
          setConfirmPassword("");
        } else {
          await refreshSession();
          router.push(nextPath);
          router.refresh();
        }
      }
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : "Không thể xác thực tài khoản.";
      setError(localizeAuthError(raw));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div className="space-y-1 text-center">
        <h1 className="heading-2">
          {mode === "login"
            ? "Đăng nhập Diễn đàn Toán"
            : "Tạo tài khoản Học sinh"}
        </h1>
        <p className="text-xs text-muted-foreground">
          Tham gia hỏi bài, giải Toán giúp bạn bè và tích điểm đổi quà
        </p>
      </div>

      <Tabs
        value={mode}
        onValueChange={(next) => {
          setMode(next as "login" | "register");
          setError(null);
          setInfo(null);
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Đăng nhập</TabsTrigger>
          <TabsTrigger value="register">Đăng ký mới</TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit}>
        <FieldGroup className="gap-4">
          {mode === "register" && (
            <>
              <Field>
                <FieldLabel htmlFor="login-name">Họ và tên hiển thị</FieldLabel>
                <Input
                  id="login-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Minh Khôi"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="login-grade">Khối lớp hiện tại</FieldLabel>
                <NativeSelect
                  id="login-grade"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          )}

          <Field>
            <FieldLabel htmlFor="login-email">Địa chỉ Email</FieldLabel>
            <Input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hocsinh@gmail.com"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="login-password">
              Mật khẩu (tối thiểu 6 ký tự)
            </FieldLabel>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {mode === "login" && (
              <FieldDescription>
                Quên mật khẩu? Hãy liên hệ Ban Quản Trị CLB để được cấp lại mật
                khẩu mới.
              </FieldDescription>
            )}
          </Field>

          {mode === "register" && (
            <Field>
              <FieldLabel htmlFor="login-confirm-password">
                Nhập lại mật khẩu
              </FieldLabel>
              <Input
                id="login-confirm-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu để xác nhận"
              />
            </Field>
          )}

          <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
            {error && (
              <Alert variant="destructive" className="text-xs font-medium">
                {error}
              </Alert>
            )}
            {info && (
              <Alert variant="success" className="text-xs font-medium">
                {info}
              </Alert>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? (
              <Spinner />
            ) : mode === "login" ? (
              <LogIn className="size-4" aria-hidden="true" />
            ) : (
              <UserPlus className="size-4" aria-hidden="true" />
            )}
            {mode === "login" ? "Đăng nhập ngay" : "Hoàn tất đăng ký"}
          </Button>
        </FieldGroup>
      </form>
    </Card>
  );
}
