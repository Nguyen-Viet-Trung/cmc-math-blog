"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { registerStudentAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

export function LoginForm({ isConfigured }: { isConfigured: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
        router.push("/");
        router.refresh();
      } else {
        if (displayName.trim().length < 2) {
          throw new Error(
            "Vui lòng nhập họ tên hiển thị của bạn (tối thiểu 2 ký tự)."
          );
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
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể xác thực tài khoản."
      );
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
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Đăng nhập</TabsTrigger>
          <TabsTrigger value="register">Đăng ký mới</TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="login-name">Họ và tên hiển thị</Label>
              <Input
                id="login-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Minh Khôi"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-grade">Khối lớp hiện tại</Label>
              <select
                id="login-grade"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="login-email">Địa chỉ Email</Label>
          <Input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hocsinh@gmail.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="login-password">Mật khẩu (tối thiểu 6 ký tự)</Label>
          <Input
            id="login-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {mode === "login" && (
            <p className="text-[11px] text-muted-foreground">
              Quên mật khẩu? Hãy liên hệ Ban Quản Trị CLB để được cấp lại mật
              khẩu mới.
            </p>
          )}
        </div>

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

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "login" ? (
            <LogIn className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {mode === "login" ? "Đăng nhập ngay" : "Hoàn tất đăng ký"}
        </Button>
      </form>
    </Card>
  );
}
