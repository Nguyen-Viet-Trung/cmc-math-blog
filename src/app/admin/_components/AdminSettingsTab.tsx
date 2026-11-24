"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { saveSiteSettingsAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRefreshAppSession } from "@/hooks/useAppSession";
import type { SiteSettings } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

export function AdminSettingsTab({
  settings,
  onNotice,
}: {
  settings: SiteSettings;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const refreshSession = useRefreshAppSession();
  const [siteName, setSiteName] = useState(settings.siteName);
  const [defaultPoints, setDefaultPoints] = useState(
    String(settings.defaultSolvedPoints)
  );
  const [announcement, setAnnouncement] = useState(settings.announcement);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await saveSiteSettingsAction({
        siteName,
        defaultSolvedPoints: Number(defaultPoints),
        announcement,
      });
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Lỗi lưu cài đặt." });
        return;
      }
      onNotice({ type: "success", text: "Đã lưu cài đặt toàn diễn đàn!" });
      await refreshSession();
      router.refresh();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi lưu cài đặt.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl p-6">
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="heading-3">
          Cấu hình Chung &amp; Điểm thưởng Mặc định
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="admin-site-name">Tên hiển thị của Diễn đàn</Label>
          <Input
            id="admin-site-name"
            type="text"
            required
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-default-pts">
            Số điểm tự động cộng khi chủ câu hỏi tick &ldquo;Lời giải đúng&rdquo;
          </Label>
          <Input
            id="admin-default-pts"
            type="number"
            required
            min={1}
            max={1000}
            value={defaultPoints}
            onChange={(e) => setDefaultPoints(e.target.value)}
            className="w-40 font-semibold text-bounty"
          />
          <p className="text-[11px] text-muted-foreground">
            (Với bài đặc biệt khó hoặc bài News / Research, Admin vẫn có thể tùy
            chỉnh điểm ngay trong từng bài hoặc tab Bài viết &amp; Thưởng tác
            giả.)
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-announcement">
            Thông báo ghim đầu trang chủ
          </Label>
          <Textarea
            id="admin-announcement"
            rows={3}
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu cấu hình
        </Button>
      </form>
    </Card>
  );
}
