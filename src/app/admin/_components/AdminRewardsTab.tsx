"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, Plus, Trash2 } from "lucide-react";
import { deleteRewardAction, upsertRewardAction } from "@/app/actions/admin";
import { ImageUploader } from "@/components/ImageUploader";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPaginatedList } from "@/hooks/useAdminPaginatedList";
import type { PaginatedResult } from "@/lib/pagination";
import type { RewardItem } from "@/lib/types";

export interface AdminNotice {
  type: "success" | "error";
  text: string;
}

export function AdminRewardsTab({
  initialRewards,
  onNotice,
}: {
  initialRewards: PaginatedResult<RewardItem>;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editingRewardId, setEditingRewardId] = useState<string | undefined>(
    undefined
  );
  const [rewardName, setRewardName] = useState("");
  const [rewardDesc, setRewardDesc] = useState("");
  const [rewardCost, setRewardCost] = useState("50");
  const [rewardStock, setRewardStock] = useState("10");
  const [rewardImage, setRewardImage] = useState<string | null>(null);
  const [rewardActive, setRewardActive] = useState(true);

  const { data: rewardsData, isFetching } = useAdminPaginatedList({
    resource: "rewards",
    page,
    pageSize: initialRewards.pageSize,
    initialData: initialRewards,
  });

  function resetForm() {
    setEditingRewardId(undefined);
    setRewardName("");
    setRewardDesc("");
    setRewardCost("50");
    setRewardStock("10");
    setRewardImage(null);
    setRewardActive(true);
  }

  function startEdit(r: RewardItem) {
    setEditingRewardId(r.id);
    setRewardName(r.name);
    setRewardDesc(r.description);
    setRewardCost(String(r.pointsCost));
    setRewardStock(String(r.stock));
    setRewardImage(r.imageUrl);
    setRewardActive(r.isActive);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await upsertRewardAction({
      id: editingRewardId,
      name: rewardName,
      description: rewardDesc,
      imageUrl: rewardImage,
      pointsCost: Number(rewardCost),
      stock: Number(rewardStock),
      isActive: rewardActive,
    });
    if (!res.ok) {
      onNotice({ type: "error", text: res.error || "Lỗi lưu quà tặng." });
      return;
    }
    resetForm();
    onNotice({
      type: "success",
      text: "Đã lưu cấu hình phần quà & mốc điểm thành công!",
    });
    await queryClient.invalidateQueries({ queryKey: ["admin-list", "rewards"] });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Xóa (hoặc ẩn nếu đã có đơn đổi) phần quà này?"))
      return;
    const res = await deleteRewardAction(id);
    if (!res.ok) {
      onNotice({ type: "error", text: res.error || "Không thể xóa." });
      return;
    }
    onNotice({ type: "success", text: "Đã cập nhật danh mục quà tặng." });
    await queryClient.invalidateQueries({ queryKey: ["admin-list", "rewards"] });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="h-fit p-5 lg:col-span-5">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-3">
              {editingRewardId
                ? "Chỉnh sửa Quà tặng"
                : "Thêm Quà & Mốc điểm mới"}
            </h2>
            {editingRewardId && (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={resetForm}
                className="h-auto p-0 text-xs"
              >
                + Tạo mới
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-reward-name">Tên phần quà</Label>
            <Input
              id="admin-reward-name"
              type="text"
              required
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
              placeholder="Ví dụ: Máy tính Casio FX-580VN X"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-reward-cost">Mốc điểm yêu cầu</Label>
              <Input
                id="admin-reward-cost"
                type="number"
                required
                min={1}
                value={rewardCost}
                onChange={(e) => setRewardCost(e.target.value)}
                className="font-semibold text-bounty"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-reward-stock">Số lượng tồn kho</Label>
              <Input
                id="admin-reward-stock"
                type="number"
                required
                min={0}
                value={rewardStock}
                onChange={(e) => setRewardStock(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-reward-desc">Mô tả chi tiết</Label>
            <Textarea
              id="admin-reward-desc"
              rows={3}
              value={rewardDesc}
              onChange={(e) => setRewardDesc(e.target.value)}
              placeholder="Mô tả món quà, điều kiện hoặc lưu ý nhận quà..."
            />
          </div>

          <div className="space-y-2">
            <Label>Hình ảnh quà tặng (tự nén WebP)</Label>
            <ImageUploader
              folder="rewards"
              preset="reward"
              buttonLabel="Tải ảnh minh họa quà tặng"
              onUploaded={(url) => setRewardImage(url)}
            />
            {rewardImage && (
              <div className="relative h-28 w-40 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rewardImage}
                  alt="Xem trước quà"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={rewardActive}
              onChange={(e) => setRewardActive(e.target.checked)}
              className="rounded border-input accent-primary"
            />
            Hiển thị công khai trên Cửa hàng Đổi quà
          </label>

          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4" />
            {editingRewardId ? "Lưu thay đổi phần quà" : "Tạo phần quà mới"}
          </Button>
        </form>
      </Card>

      <div className="space-y-3 lg:col-span-7">
        {rewardsData.items.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
            Chưa có phần quà nào trong danh mục. Hãy tạo phần quà đầu tiên ở
            biểu mẫu bên cạnh.
          </Card>
        ) : (
          <>
            {rewardsData.items.map((r) => (
              <Card
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageUrl}
                      alt={r.name}
                      className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-bounty-surface text-bounty">
                      <Gift className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {r.name}
                      </h3>
                      {!r.isActive && (
                        <Badge variant="secondary" className="text-[10px]">
                          Đang ẩn
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {r.description}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-bounty">
                      Mốc đổi: {r.pointsCost} điểm · Kho còn: {r.stock}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(r)}
                  >
                    Sửa mốc điểm / kho
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void handleDelete(r.id)}
                    className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                    title="Xóa / Ẩn"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            <PaginationBar
              page={rewardsData.page}
              totalPages={rewardsData.totalPages}
              totalCount={rewardsData.totalCount}
              itemLabel="phần quà"
              isLoading={isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
