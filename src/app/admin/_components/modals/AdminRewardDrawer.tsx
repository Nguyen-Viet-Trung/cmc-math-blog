"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { upsertRewardAction } from "@/app/actions/admin";
import { ImageUploader } from "@/components/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { RewardItem } from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

export function AdminRewardDrawer({
  open,
  editingReward,
  onOpenChange,
  onSaved,
  onNotice,
}: {
  open: boolean;
  editingReward: RewardItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  onNotice: (n: AdminNotice) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("50");
  const [stock, setStock] = useState("10");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    if (editingReward) {
      setName(editingReward.name);
      setDesc(editingReward.description);
      setCost(String(editingReward.pointsCost));
      setStock(String(editingReward.stock));
      setImageUrl(editingReward.imageUrl);
      setIsActive(editingReward.isActive);
    } else {
      setName("");
      setDesc("");
      setCost("50");
      setStock("10");
      setImageUrl(null);
      setIsActive(true);
    }
  }, [open, editingReward]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await upsertRewardAction({
        id: editingReward?.id,
        name,
        description: desc,
        imageUrl,
        pointsCost: Number(cost),
        stock: Number(stock),
        isActive,
      });
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Lỗi lưu quà tặng." });
        return;
      }
      onOpenChange(false);
      onNotice({
        type: "success",
        text: editingReward
          ? "Đã cập nhật thông tin phần quà!"
          : "Đã tạo phần quà & mốc điểm mới!",
      });
      await onSaved();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi lưu quà tặng.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <SheetContent side="right" className="overflow-y-auto p-6">
        <div className="mb-5 pr-8">
          <SheetTitle className="text-base font-bold">
            {editingReward ? "Chỉnh sửa Quà tặng" : "Thêm Quà & Mốc điểm mới"}
          </SheetTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Cấu hình tên quà, số điểm quy đổi, tồn kho và hình ảnh minh họa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="drawer-reward-name">Tên phần quà</Label>
            <Input
              id="drawer-reward-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Máy tính Casio FX-580VN X"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="drawer-reward-cost">Mốc điểm</Label>
              <Input
                id="drawer-reward-cost"
                type="number"
                required
                min={1}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="font-semibold tabular-nums text-bounty"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drawer-reward-stock">Tồn kho</Label>
              <Input
                id="drawer-reward-stock"
                type="number"
                required
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drawer-reward-desc">Mô tả chi tiết</Label>
            <Textarea
              id="drawer-reward-desc"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Mô tả món quà, điều kiện hoặc lưu ý nhận quà..."
            />
          </div>

          <div className="space-y-2">
            <Label>Hình ảnh quà tặng (tự nén WebP)</Label>
            <ImageUploader
              folder="rewards"
              preset="reward"
              buttonLabel="Tải ảnh minh họa"
              onUploaded={(url) => setImageUrl(url)}
            />
            {imageUrl && (
              <div className="relative h-28 w-40 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Xem trước quà"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            Hiển thị công khai trên Cửa hàng Đổi quà
          </label>

          <div className="mt-auto flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : editingReward ? (
                <Save className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {editingReward ? "Lưu thay đổi" : "Tạo phần quà"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
