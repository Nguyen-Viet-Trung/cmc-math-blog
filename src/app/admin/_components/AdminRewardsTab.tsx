"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteRewardAction } from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginationBar } from "@/components/PaginationBar";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useAdminPaginatedList } from "@/hooks/useAdminPaginatedList";
import type { PaginatedResult } from "@/lib/pagination";
import type { RewardItem } from "@/lib/types";
import { AdminRewardDrawer } from "./modals/AdminRewardDrawer";

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
  const [pageSize, setPageSize] = useState(initialRewards.pageSize);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RewardItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: rewardsData, isFetching } = useAdminPaginatedList({
    resource: "rewards",
    page,
    pageSize,
    initialData: initialRewards,
    onPageClamp: setPage,
  });

  async function refreshRewards() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "rewards"],
    });
    router.refresh();
  }

  function openCreateDrawer() {
    setEditingReward(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(r: RewardItem) {
    setEditingReward(r);
    setDrawerOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await deleteRewardAction(deleteTarget.id);
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Không thể xóa." });
        return;
      }
      setDeleteTarget(null);
      onNotice({ type: "success", text: "Đã cập nhật danh mục quà tặng." });
      await refreshRewards();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi xóa quà tặng.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {rewardsData.totalCount} phần quà trong danh mục
        </span>
        <Button type="button" size="sm" onClick={openCreateDrawer}>
          <Plus className="h-3.5 w-3.5" />
          Thêm quà tặng
        </Button>
      </div>

      {rewardsData.items.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gift aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Chưa có phần quà nào trong danh mục</EmptyTitle>
            <EmptyDescription>
              Tạo phần quà đầu tiên kèm mốc điểm đổi và số lượng tồn kho cho cửa
              hàng câu lạc bộ.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" size="sm" onClick={openCreateDrawer}>
              <Plus className="h-3.5 w-3.5" />
              Thêm quà tặng đầu tiên
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Phần quà</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">
                      Mốc đổi
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center">
                      Tồn kho
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">Trạng thái</th>
                    <th className="w-[120px] whitespace-nowrap px-4 py-3 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rewardsData.items.map((r) => (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {r.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.imageUrl}
                              alt={r.name}
                              loading="lazy"
                              className="h-11 w-11 shrink-0 rounded-md border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-bounty-surface text-bounty">
                              <Gift className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">
                              {r.name}
                            </p>
                            {r.description && (
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {r.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-bounty">
                        {r.pointsCost}đ
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center font-medium tabular-nums">
                        {r.stock}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge
                          variant={r.isActive ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {r.isActive ? "Đang mở" : "Đang ẩn"}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDrawer(r)}
                            className="h-7 px-2.5 text-xs"
                          >
                            <Pencil className="h-3 w-3" />
                            Sửa
                          </Button>
                          <ActionMenu
                            triggerLabel={`Thao tác cho ${r.name}`}
                            items={[
                              {
                                id: "edit",
                                label: "Sửa mốc điểm / kho",
                                icon: <Pencil className="h-3.5 w-3.5" />,
                                onSelect: () => openEditDrawer(r),
                              },
                              {
                                id: "delete",
                                label: "Xóa / Ẩn phần quà",
                                icon: <Trash2 className="h-3.5 w-3.5" />,
                                variant: "destructive",
                                separatorBefore: true,
                                disabled: deleting,
                                onSelect: () => setDeleteTarget(r),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <PaginationBar
            page={rewardsData.page}
            totalPages={rewardsData.totalPages}
            totalCount={rewardsData.totalCount}
            itemLabel="phần quà"
            isLoading={isFetching}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[8, 15, 30, 50]}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </>
      )}

      <AdminRewardDrawer
        open={drawerOpen}
        editingReward={editingReward}
        onOpenChange={setDrawerOpen}
        onSaved={refreshRewards}
        onNotice={onNotice}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa hoặc ẩn phần quà?"
        description={
          deleteTarget
            ? `Phần quà "${deleteTarget.name}" sẽ bị xóa vĩnh viễn nếu chưa có đơn đổi, hoặc chuyển sang trạng thái ẩn để giữ lịch sử đối soát.`
            : ""
        }
        confirmLabel="Xóa / Ẩn phần quà"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
