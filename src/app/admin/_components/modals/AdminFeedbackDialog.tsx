"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { reviewFeedbackByAdminAction } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackItem, FeedbackStatus } from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

export function AdminFeedbackDialog({
  feedback,
  onClose,
  onSuccess,
  onNotice,
}: {
  feedback: FeedbackItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onNotice: (n: AdminNotice) => void;
}) {
  const [status, setStatus] = useState<FeedbackStatus>("in_progress");
  const [adminReply, setAdminReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    setStatus(feedback.status === "open" ? "in_progress" : feedback.status);
    setAdminReply(feedback.adminReply || "");
    setBusy(false);
  }, [feedback]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback || busy) return;
    setBusy(true);
    try {
      const res = await reviewFeedbackByAdminAction({
        feedbackId: feedback.id,
        status,
        adminReply,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Lỗi cập nhật phản hồi góp ý.",
        });
        return;
      }
      onClose();
      onNotice({
        type: "success",
        text: "Đã lưu phản hồi & trạng thái xử lý góp ý!",
      });
      await onSuccess();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi lưu phản hồi.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(feedback)}
      onOpenChange={(o) => !o && !busy && onClose()}
    >
      <DialogContent className="max-w-lg">
        {feedback && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 pr-6">
              <DialogTitle>Phản hồi &amp; Cập nhật góp ý</DialogTitle>
              <DialogDescription className="line-clamp-2">
                {feedback.title} — Người gửi: {feedback.authorName}
              </DialogDescription>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="feedback-modal-status">Trạng thái xử lý</Label>
                <NativeSelect
                  id="feedback-modal-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
                  className="text-xs font-medium"
                >
                  <option value="open">Mới mở</option>
                  <option value="in_progress">Đang xử lý</option>
                  <option value="resolved">Đã hoàn thành</option>
                  <option value="closed">Đã đóng</option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feedback-modal-reply">
                  Phản hồi công khai của Admin
                </Label>
                <Textarea
                  id="feedback-modal-reply"
                  rows={4}
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  placeholder="Nhập phản hồi cho học sinh (hiển thị công khai dưới mục góp ý)..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={onClose}
              >
                Hủy
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Lưu phản hồi
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
