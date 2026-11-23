"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import {
  deleteFeedbackByAdminAction,
  reviewFeedbackByAdminAction,
} from "@/app/actions/feedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateTimeVN } from "@/lib/format";
import type { FeedbackItem, FeedbackStatus } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

const MathContent = dynamic(
  () => import("@/components/MathContent").then((m) => m.MathContent),
  {
    loading: () => <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />,
  }
);

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
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data, isLoading, isFetching } = useAdminPaginatedList<FeedbackItem>({
    resource: "feedbacks",
    page,
    pageSize,
    query: debouncedSearch,
    status: statusFilter,
    onPageClamp: setPage,
  });

  async function handleReview(
    feedbackId: string,
    status: FeedbackStatus,
    fallbackReply: string
  ) {
    if (busyId === feedbackId) return;
    setBusyId(feedbackId);
    try {
      const res = await reviewFeedbackByAdminAction({
        feedbackId,
        status,
        adminReply: replies[feedbackId] ?? fallbackReply,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Lỗi cập nhật phản hồi góp ý.",
        });
        return;
      }
      onNotice({
        type: "success",
        text: "Đã lưu phản hồi & trạng thái xử lý góp ý!",
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-list", "feedbacks"],
      });
      router.refresh();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi lưu phản hồi.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || busyId === deleteTarget.id) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await deleteFeedbackByAdminAction(deleteTarget.id);
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Không thể xóa." });
        return;
      }
      setDeleteTarget(null);
      await queryClient.invalidateQueries({
        queryKey: ["admin-list", "feedbacks"],
      });
      router.refresh();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi xóa góp ý.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm góp ý theo tiêu đề, mô tả hoặc người gửi..."
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all", label: "Tất cả" },
              { id: "open", label: "Mới mở" },
              { id: "in_progress", label: "Đang xử lý" },
              { id: "resolved", label: "Hoàn thành" },
              { id: "closed", label: "Đã đóng" },
            ] as const
          ).map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={statusFilter === f.id ? "default" : "outline"}
              onClick={() => {
                setStatusFilter(f.id);
                setPage(1);
              }}
              className="h-8 text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
          {totalFeedbacksCount === 0
            ? "Chưa có báo cáo lỗi hay đề xuất tính năng nào từ người dùng."
            : "Không có mục góp ý nào khớp với bộ lọc hiện tại."}
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((fb) => (
            <Card key={fb.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="uppercase">
                      {fb.category}
                    </Badge>
                    <strong className="text-sm text-foreground">
                      {fb.title}
                    </strong>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Người gửi:{" "}
                    <strong className="text-foreground">{fb.authorName}</strong>{" "}
                    {fb.contactEmail && `(${fb.contactEmail})`} ·{" "}
                    {formatDateTimeVN(fb.createdAt)}
                    {fb.pageUrl && ` · Đường dẫn: ${fb.pageUrl}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="subtle">{fb.status}</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busyId === fb.id}
                    onClick={() => setDeleteTarget(fb)}
                    className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                    title="Xóa góp ý"
                    aria-label={`Xóa góp ý ${fb.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/40 p-3.5 text-sm">
                <MathContent
                  content={fb.description}
                  imageUrls={fb.imageUrls}
                />
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Input
                  type="text"
                  value={replies[fb.id] ?? fb.adminReply}
                  onChange={(e) =>
                    setReplies({ ...replies, [fb.id]: e.target.value })
                  }
                  placeholder="Nhập phản hồi của Admin cho học sinh (hiển thị công khai dưới mục góp ý)..."
                  className="flex-1 text-xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === fb.id}
                    onClick={() =>
                      void handleReview(fb.id, "in_progress", fb.adminReply)
                    }
                  >
                    {busyId === fb.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Đang xử lý
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="success"
                    disabled={busyId === fb.id}
                    onClick={() =>
                      void handleReview(fb.id, "resolved", fb.adminReply)
                    }
                  >
                    Đã hoàn thành
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === fb.id}
                    onClick={() =>
                      void handleReview(fb.id, "closed", fb.adminReply)
                    }
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </Card>
          ))}

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
        isLoading={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
