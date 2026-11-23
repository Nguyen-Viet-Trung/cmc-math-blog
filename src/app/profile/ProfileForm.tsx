"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Loader2, Sparkles, User } from "lucide-react";
import { updateProfileAction } from "@/app/actions/auth";
import { ImageUploader } from "@/components/ImageUploader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAppSession } from "@/hooks/useAppSession";
import { formatDateVN } from "@/lib/format";
import type { UserProfile } from "@/lib/types";

export function ProfileForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const { refreshSession } = useAppSession();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [gradeLevel, setGradeLevel] = useState(user.gradeLevel);
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const res = await updateProfileAction({
      displayName,
      nickname,
      gradeLevel,
      bio,
      avatarUrl,
    });

    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Không thể lưu hồ sơ.");
      return;
    }

    setMessage("Đã lưu cập nhật hồ sơ thành công!");
    await refreshSession();
    router.refresh();
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSave} className="space-y-5">
        <div className="space-y-2">
          <h1 className="heading-2">Hồ sơ Thành viên</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              Email: <strong className="text-foreground">{user.email}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Vai trò:{" "}
              <strong className="uppercase text-foreground">{user.role}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Gia nhập CLB:{" "}
              <strong className="text-foreground">
                {formatDateVN(user.joinedAt)}
              </strong>
            </span>
          </div>
        </div>

        <Separator />

        {/* Ảnh đại diện (Avatar) tự động nén WebP */}
        <div className="flex flex-wrap items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-20 w-20 rounded-full border-2 border-primary/30 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="h-9 w-9" />
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-foreground">Ảnh đại diện</p>
            <ImageUploader
              folder="avatars"
              preset="avatar"
              buttonLabel="Tải lên Avatar (tự nén WebP nhẹ)"
              onUploaded={(url) => setAvatarUrl(url)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Họ và tên hiển thị</Label>
            <Input
              id="profile-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="profile-nickname"
              className="inline-flex items-center gap-1"
            >
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              Biệt danh (tự tùy chỉnh)
            </Label>
            <Input
              id="profile-nickname"
              type="text"
              maxLength={40}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ví dụ: Gauss nhí, Vua Bất Đẳng Thức..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-grade">Khối lớp / Trường</Label>
            <Input
              id="profile-grade"
              type="text"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="Ví dụ: Lớp 11A1 - THPT Chuyên..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-joined-at">Ngày gia nhập câu lạc bộ</Label>
            <Input
              id="profile-joined-at"
              type="text"
              readOnly
              disabled
              value={formatDateVN(user.joinedAt)}
              className="tabular-nums"
            />
            <p className="text-[11px] text-muted-foreground">
              Mặc định theo ngày tạo tài khoản. Liên hệ Admin nếu cần điều chỉnh
              ngày gia nhập thực tế.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-bio">
            Giới thiệu ngắn / Chuyên đề Toán yêu thích
          </Label>
          <Textarea
            id="profile-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ví dụ: Đam mê Hình học phẳng, Bất đẳng thức & Tổ hợp..."
          />
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
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Lưu thông tin
          </Button>
        </div>
      </form>
    </Card>
  );
}
