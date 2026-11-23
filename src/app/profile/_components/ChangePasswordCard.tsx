"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { changeOwnPasswordAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    setSaving(true);
    try {
      const res = await changeOwnPasswordAction({
        currentPassword,
        newPassword,
      });

      if (!res.ok) {
        setError(res.error || "Không thể đổi mật khẩu.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Đã đổi mật khẩu thành công!");
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="heading-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Đổi mật khẩu đăng nhập
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sử dụng mật khẩu tối thiểu 6 ký tự và không chia sẻ cho người
              khác.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPasswords((prev) => !prev)}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            {showPasswords ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showPasswords ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          </Button>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="pwd-current">Mật khẩu hiện tại</Label>
          <Input
            id="pwd-current"
            type={showPasswords ? "text" : "password"}
            required
            minLength={6}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pwd-new">Mật khẩu mới</Label>
            <Input
              id="pwd-new"
              type={showPasswords ? "text" : "password"}
              required
              minLength={6}
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pwd-confirm">Nhập lại mật khẩu mới</Label>
            <Input
              id="pwd-confirm"
              type={showPasswords ? "text" : "password"}
              required
              minLength={6}
              maxLength={72}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="text-xs font-semibold">
            {error}
          </Alert>
        )}
        {message && (
          <Alert variant="success" className="text-xs font-semibold">
            {message}
          </Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="outline" size="sm" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Cập nhật mật khẩu
          </Button>
        </div>
      </form>
    </Card>
  );
}
