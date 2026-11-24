"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquareReply, Search, Trash2 } from "lucide-react";
import { deleteFeedbackByAdminAction } from "@/app/actions/feedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginationBar } from "@/components/PaginationBar";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateTimeVN } from "@/lib/format";
import type { FeedbackCategory, FeedbackItem, FeedbackStatus } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";
import { AdminFeedbackDialog } from "./modals/AdminFeedbackDialog";

const MathContent = dynamic(
  () => import("@/components/MathContent").then((m) => m.MathContent),
  {
    loading: () => <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />,
  }
);

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Báo lỗi",
  feature: "Tính năng",
  ui_ux: "Giao diện",
  other: "Khác",
};

const STATUS_META: Record<
  FeedbackStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  open: { label: "Mới mở", variant: "bounty" },
  in_progress: { label: "Đang xử lý", variant: "subtle" },
  resolved: { label: "Hoàn thành", variant: "success" },
  closed: { label: "Đã đóng", variant: "secondary" },
};

export function AdminFeedbacksTab({
  totalFeedbacksCount,
  onNotice,
}: {
  totalFeedbacksCount: number;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>(
    "all"
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reviewTarget, setReviewTarget] = useState<FeedbackItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data, isLoading, isFetching } = useAdminPaginatedList<FeedbackItem>({
    resource: "feedbacks",
    page,
    pageSize,
    query: debouncedSearch,
    status: statusFilter,
    onPageClamp: setPage,
  });

  async function refreshFeedbacks() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "feedbacks"],
    });
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await deleteFeedbackByAdminAction(deleteTarget.id);
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Không thể xóa." });
        return;
      }
      setDeleteTarget(null);
      onNotice({ type: "success", text: "Đã xóa mục góp ý." });
      await refreshFeedbacks();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi xóa góp ý.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tiêu đề, mô tả hoặc người gửi..."
            className="pl-8 text-xs sm:text-sm"
          />
        </div>

        <NativeSelect
          aria-label="Lọc trạng thái góp ý"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | FeedbackStatus);
            setPage(1);
          }}
          className="h-9 w-44 text-xs font-medium"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="open">Mới mở</option>
          <option value="in_progress">Đang xử lý</option>
          <option value="resolved">Hoàn thành</option>
          <option value="closed">Đã đóng</option>
        </NativeSelect>
      </div>

      {isLoading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
          {totalFeedbacksCount === 0
            ? "Chưa có báo cáo lỗi hay đề xuất tính năng nào từ người dùng."
            : "Không có mục góp ý nào khớp với bộ lọc hiện tại."}
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((fb) => {
            const meta = STATUS_META[fb.status] ?? STATUS_META.open;
            return (
              <Card key={fb.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {CATEGORY_LABELS[fb.category] ?? fb.category}
                      </Badge>
                      <Badge variant={meta.variant} className="text-[10px]">
                        {meta.label}
                      </Badge>
                      <strong className="text-sm text-foreground">
                        {fb.title}
                      </strong>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">
                        {fb.authorName}
                      </strong>{" "}
                      {fb.contactEmail && `(${fb.contactEmail})`} ·{" "}
                      {formatDateTimeVN(fb.createdAt)}
                      {fb.pageUrl && ` · ${fb.pageUrl}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewTarget(fb)}
                      className="h-7 px-2.5 text-xs"
                    >
                      <MessageSquareReply className="h-3 w-3 text-primary" />
                      Phản hồi
                    </Button>
                    <ActionMenu
                      triggerLabel={`Thao tác cho góp ý ${fb.title}`}
                      items={[
                        {
                          id: "reply",
                          label: "Phản hồi & đổi trạng thái",
                          icon: <MessageSquareReply className="h-3.5 w-3.5" />,
                          onSelect: () => setReviewTarget(fb),
                        },
                        {
                          id: "delete",
                          label: "Xóa góp ý",
                          icon: <Trash2 className="h-3.5 w-3.5" />,
                          variant: "destructive",
                          separatorBefore: true,
                          disabled: deleting,
                          onSelect: () => setDeleteTarget(fb),
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/35 p-3 text-sm">
                  <MathContent
                    content={fb.description}
                    imageUrls={fb.imageUrls}
                  />
                </div>

                {fb.adminReply && (
                  <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                    <span className="font-semibold text-primary">
                      Phản hồi Admin:{" "}
                    </span>
                    {fb.adminReply}
                  </p>
                )}
              </Card>
            );
          })}

          <PaginationBar
            page={data.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            itemLabel="góp ý"
            isLoading={isFetching}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50]}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>
      )}

      <AdminFeedbackDialog
        feedback={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSuccess={refreshFeedbacks}
        onNotice={onNotice}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa vĩnh viễn mục góp ý này?"
        description={
          deleteTarget
            ? `Mục "${deleteTarget.title}" cùng ảnh chụp màn hình đính kèm (nếu có) sẽ bị xóa vĩnh viễn.`
            : ""
        }
        confirmLabel="Xóa góp ý"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
