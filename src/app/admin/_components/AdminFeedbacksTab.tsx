"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  deleteFeedbackByAdminAction,
  reviewFeedbackByAdminAction,
} from "@/app/actions/feedback";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import type { PaginatedResult } from "@/lib/pagination";
import type { FeedbackItem, FeedbackStatus } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

const MathContent = dynamic(
  () => import("@/components/MathContent").then((m) => m.MathContent),
  {
    loading: () => <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />,
  }
);

export function AdminFeedbacksTab({
  initialFeedbacks,
  onNotice,
}: {
  initialFeedbacks: PaginatedResult<FeedbackItem>;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>(
    "all"
  );
  const [page, setPage] = useState(1);
  const [replies, setReplies] = useState<Record<string, string>>({});

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data, isFetching } = useAdminPaginatedList({
    resource: "feedbacks",
    page,
    pageSize: initialFeedbacks.pageSize,
    query: debouncedSearch,
    status: statusFilter,
    initialData: initialFeedbacks,
  });

  async function handleReview(
    feedbackId: string,
    status: FeedbackStatus,
    fallbackReply: string
  ) {
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
  }

  async function handleDelete(feedbackId: string) {
    if (!window.confirm("Xóa vĩnh viễn mục góp ý / báo lỗi này?")) return;
    const res = await deleteFeedbackByAdminAction(feedbackId);
    if (!res.ok) {
      onNotice({ type: "error", text: res.error || "Không thể xóa." });
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "feedbacks"],
    });
    router.refresh();
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

      {data.items.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
          {initialFeedbacks.totalCount === 0
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
                    {new Date(fb.createdAt).toLocaleString("vi-VN")}
                    {fb.pageUrl && ` · Đường dẫn: ${fb.pageUrl}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="subtle">{fb.status}</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void handleDelete(fb.id)}
                    className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                    title="Xóa góp ý"
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
                    onClick={() =>
                      void handleReview(fb.id, "in_progress", fb.adminReply)
                    }
                  >
                    Đang xử lý
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="success"
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
          />
        </div>
      )}
    </div>
  );
}
