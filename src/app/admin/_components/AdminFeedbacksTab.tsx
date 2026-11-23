"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  deleteFeedbackByAdminAction,
  reviewFeedbackByAdminAction,
} from "@/app/actions/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FeedbackItem, FeedbackStatus } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

const MathContent = dynamic(
  () => import("@/components/MathContent").then((m) => m.MathContent),
  {
    loading: () => <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />,
  }
);

export function AdminFeedbacksTab({
  feedbacks,
  onNotice,
}: {
  feedbacks: FeedbackItem[];
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const [replies, setReplies] = useState<Record<string, string>>({});

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
    router.refresh();
  }

  async function handleDelete(feedbackId: string) {
    if (!window.confirm("Xóa vĩnh viễn mục góp ý / báo lỗi này?")) return;
    const res = await deleteFeedbackByAdminAction(feedbackId);
    if (!res.ok) {
      onNotice({ type: "error", text: res.error || "Không thể xóa." });
      return;
    }
    router.refresh();
  }

  if (feedbacks.length === 0) {
    return (
      <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
        Chưa có báo cáo lỗi hay đề xuất tính năng nào từ người dùng.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {feedbacks.map((fb) => (
        <Card key={fb.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="uppercase">
                  {fb.category}
                </Badge>
                <strong className="text-sm text-foreground">{fb.title}</strong>
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
                onClick={() => handleDelete(fb.id)}
                className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                title="Xóa góp ý"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3.5 text-sm">
            <MathContent content={fb.description} imageUrls={fb.imageUrls} />
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
                  handleReview(fb.id, "in_progress", fb.adminReply)
                }
              >
                Đang xử lý
              </Button>
              <Button
                type="button"
                size="sm"
                variant="success"
                onClick={() => handleReview(fb.id, "resolved", fb.adminReply)}
              >
                Đã hoàn thành
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleReview(fb.id, "closed", fb.adminReply)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
