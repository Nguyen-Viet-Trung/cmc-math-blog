"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { upsertCampaignAwardAction } from "@/app/actions/campaigns";
import { CampaignBadgePill } from "@/components/CampaignBadgePill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  BADGE_COLOR_OPTIONS,
  BADGE_ICON_OPTIONS,
} from "@/lib/campaign-rules";
import type {
  BadgeColorKey,
  BadgeIconKey,
  CampaignAwardItem,
} from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

export function CampaignAwardDrawer({
  open,
  campaignId,
  campaignTitle,
  editing,
  shopRewards,
  onOpenChange,
  onSaved,
  onNotice,
}: {
  open: boolean;
  campaignId: string;
  campaignTitle: string;
  editing: CampaignAwardItem | null;
  shopRewards: { id: string; name: string; pointsCost: number; stock: number }[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: AdminNotice) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredCount, setRequiredCount] = useState("1");
  const [bonusPoints, setBonusPoints] = useState("20");
  const [rewardId, setRewardId] = useState("");
  const [badgeName, setBadgeName] = useState("");
  const [badgeIcon, setBadgeIcon] = useState<BadgeIconKey>("trophy");
  const [badgeColor, setBadgeColor] = useState<BadgeColorKey>("amber");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description);
      setRequiredCount(String(editing.requiredCompletedCount));
      setBonusPoints(String(editing.bonusPoints));
      setRewardId(editing.rewardId ?? "");
      setBadgeName(editing.badgeName);
      setBadgeIcon(editing.badgeIcon);
      setBadgeColor(editing.badgeColor);
    } else {
      setTitle("");
      setDescription("");
      setRequiredCount("1");
      setBonusPoints("20");
      setRewardId("");
      setBadgeName("");
      setBadgeIcon("trophy");
      setBadgeColor("amber");
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await upsertCampaignAwardAction({
        id: editing?.id,
        campaignId,
        title,
        description,
        requiredCompletedCount: Number(requiredCount),
        bonusPoints: Number(bonusPoints),
        rewardId: rewardId || null,
        badgeName,
        badgeIcon,
        badgeColor,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể lưu Award & Badge.",
        });
        return;
      }
      onOpenChange(false);
      onNotice({
        type: "success",
        text: editing
          ? "Đã cập nhật mốc Award & Huy hiệu!"
          : "Đã thêm mốc Award & Huy hiệu mới!",
      });
      await onSaved();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi lưu Award.",
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
            {editing ? "Chỉnh sửa Award & Huy hiệu" : "Thiết kế Award & Huy hiệu"}
          </SheetTitle>
          <p className="truncate text-xs text-muted-foreground">
            Giải đấu: {campaignTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 p-3.5">
            <span className="text-xs text-muted-foreground">
              Xem trước Huy hiệu:
            </span>
            <CampaignBadgePill
              name={badgeName.trim() || "Tên Huy hiệu"}
              icon={badgeIcon}
              color={badgeColor}
              size="md"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="award-title">Tên giải thưởng (Award)</Label>
            <Input
              id="award-title"
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Giải Nhất — Chinh phục 3 thử thách"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="award-badge-name">Tên Huy hiệu (Badge)</Label>
            <Input
              id="award-badge-name"
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={badgeName}
              onChange={(e) => setBadgeName(e.target.value)}
              placeholder="Ví dụ: Nhà Vô Địch Mùa Thu"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="award-icon">Biểu tượng Badge</Label>
              <NativeSelect
                id="award-icon"
                value={badgeIcon}
                onChange={(e) => setBadgeIcon(e.target.value as BadgeIconKey)}
              >
                {BADGE_ICON_OPTIONS.map((i) => (
                  <option key={i.key} value={i.key}>
                    {i.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="award-color">Màu sắc Badge</Label>
              <NativeSelect
                id="award-color"
                value={badgeColor}
                onChange={(e) => setBadgeColor(e.target.value as BadgeColorKey)}
              >
                {BADGE_COLOR_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="award-req">Số thử thách cần đạt</Label>
              <Input
                id="award-req"
                type="number"
                required
                min={1}
                max={100}
                value={requiredCount}
                onChange={(e) => setRequiredCount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="award-pts">Điểm thưởng cộng thêm</Label>
              <Input
                id="award-pts"
                type="number"
                required
                min={0}
                max={5000}
                value={bonusPoints}
                onChange={(e) => setBonusPoints(e.target.value)}
                className="font-semibold text-bounty"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="award-reward">
              Phần quà trong Shop đi kèm (tùy chọn)
            </Label>
            <NativeSelect
              id="award-reward"
              value={rewardId}
              onChange={(e) => setRewardId(e.target.value)}
            >
              <option value="">Không kèm quà Shop (chỉ điểm + Huy hiệu)</option>
              {shopRewards.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.pointsCost}đ · tồn {r.stock})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="award-desc">Mô tả thêm (tùy chọn)</Label>
            <Textarea
              id="award-desc"
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú về tiêu chí hoặc cách nhận quà..."
            />
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
              {editing ? "Lưu Award" : "Thêm Award"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
