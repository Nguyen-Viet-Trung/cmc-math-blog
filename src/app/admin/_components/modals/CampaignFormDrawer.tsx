"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { upsertCampaignAction } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CAMPAIGN_COVER_OPTIONS } from "@/lib/campaign-rules";
import type { AdminCampaignItem } from "@/lib/campaign-service";
import type { AdminNotice } from "../AdminRewardsTab";

function toDateTimeLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDefaultDateRange(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    start: toDateTimeLocalInput(now.toISOString()),
    end: toDateTimeLocalInput(end.toISOString()),
  };
}

export function CampaignFormDrawer({
  open,
  editing,
  onOpenChange,
  onSaved,
  onNotice,
}: {
  open: boolean;
  editing: AdminCampaignItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: AdminNotice) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverColor, setCoverColor] = useState("blue");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description);
      setCoverColor(editing.coverColor);
      setStartsAt(toDateTimeLocalInput(editing.startsAt));
      setEndsAt(toDateTimeLocalInput(editing.endsAt));
      setIsPublished(editing.isPublished);
    } else {
      const range = getDefaultDateRange();
      setTitle("");
      setDescription("");
      setCoverColor("blue");
      setStartsAt(range.start);
      setEndsAt(range.end);
      setIsPublished(true);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const startMs = Date.parse(startsAt);
    const endMs = Date.parse(endsAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      onNotice({
        type: "error",
        text: "Vui lòng chọn đầy đủ ngày giờ bắt đầu và kết thúc hợp lệ.",
      });
      return;
    }
    if (endMs <= startMs) {
      onNotice({
        type: "error",
        text: "Thời điểm kết thúc giải đấu phải sau thời điểm bắt đầu.",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await upsertCampaignAction({
        id: editing?.id,
        title,
        description,
        coverColor,
        startsAt: new Date(startMs).toISOString(),
        endsAt: new Date(endMs).toISOString(),
        isPublished,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể lưu giải đấu.",
        });
        return;
      }
      onOpenChange(false);
      onNotice({
        type: "success",
        text: editing
          ? "Đã cập nhật thông tin giải đấu!"
          : "Đã tạo giải đấu Toán học mới!",
      });
      await onSaved();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi lưu giải đấu.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md overflow-y-auto p-6"
      >
        <div className="space-y-1 pr-6">
          <SheetTitle>
            {editing ? "Chỉnh sửa Giải đấu" : "Tạo Giải đấu (Campaign) mới"}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Thiết lập khung thời gian diễn ra giải đấu. Sau khi tạo, bạn có thể
            gắn bài thử thách và thiết kế các mốc Award + Huy hiệu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="camp-title">Tên giải đấu</Label>
            <Input
              id="camp-title"
              type="text"
              required
              minLength={4}
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Giải Toán Mùa Thu CMC 2026"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="camp-desc">Mô tả thể lệ</Label>
            <Textarea
              id="camp-desc"
              rows={3}
              maxLength={1200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu mục tiêu, cách tính thử thách hoàn thành và giải thưởng..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="camp-start">Ngày giờ bắt đầu</Label>
              <Input
                id="camp-start"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="camp-end">Ngày giờ kết thúc</Label>
              <Input
                id="camp-end"
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="camp-color">Màu nhấn trang bìa</Label>
              <NativeSelect
                id="camp-color"
                value={coverColor}
                onChange={(e) => setCoverColor(e.target.value)}
              >
                {CAMPAIGN_COVER_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Công khai cho học sinh
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {editing ? "Lưu thay đổi" : "Tạo giải đấu"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
