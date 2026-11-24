"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { submitContentReportAction } from "@/app/actions/safety";
import { Alert } from "@/components/ui/alert";
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
import {
  REPORT_DETAIL_MAX_LENGTH,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  REPORT_TARGET_TYPE_LABELS,
} from "@/lib/safety-rules";
import type { ReportReason, ReportTargetType } from "@/lib/types";

export interface ReportTarget {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
}

export function ReportContentModal({
  open,
  target,
  onOpenChange,
}: {
  open: boolean;
  target: ReportTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setReason("spam");
      setDetail("");
      setStatusMsg(null);
    }
  }, [open, target?.targetType, target?.targetId]);

  if (!target) {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (busy) return;
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !target) return;
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await submitContentReportAction({
        targetType: target.targetType,
        targetId: target.targetId,
        reason,
        detail,
      });
      if (!res.ok) {
        setStatusMsg({
          type: "error",
          text: res.error || "Không thể gửi báo cáo vi phạm.",
        });
        return;
      }
      setStatusMsg({
        type: "success",
        text: "Đã gửi báo cáo tới Ban Quản Trị. Cảm ơn bạn đã góp phần giữ gìn cộng đồng!",
      });
      setDetail("");
    } catch {
      setStatusMsg({
        type: "error",
        text: "Lỗi kết nối máy chủ khi gửi báo cáo.",
      });
    } finally {
      setBusy(false);
    }
  }

  const targetTypeLabel = REPORT_TARGET_TYPE_LABELS[target.targetType];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 pr-6">
            <DialogTitle>Báo cáo {targetTypeLabel.toLowerCase()}</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {target.targetTitle
                ? `Đối tượng: ${target.targetTitle}`
                : "Báo cáo sẽ được gửi riêng tư tới Ban Quản Trị để kiểm duyệt."}
            </DialogDescription>
          </div>

          {statusMsg && (
            <Alert
              variant={statusMsg.type === "success" ? "success" : "destructive"}
              className="text-xs"
            >
              {statusMsg.text}
            </Alert>
          )}

          {statusMsg?.type !== "success" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`report-reason-${target.targetId}`}>
                  Lý do báo cáo
                </Label>
                <NativeSelect
                  id={`report-reason-${target.targetId}`}
                  value={reason}
                  disabled={busy}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="text-xs font-medium"
                >
                  {REPORT_REASONS.map((key) => (
                    <option key={key} value={key}>
                      {REPORT_REASON_LABELS[key]}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`report-detail-${target.targetId}`}>
                    Mô tả thêm{" "}
                    {reason === "other" ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="font-normal text-muted-foreground">
                        (không bắt buộc)
                      </span>
                    )}
                  </Label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {detail.length}/{REPORT_DETAIL_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  id={`report-detail-${target.targetId}`}
                  rows={3}
                  maxLength={REPORT_DETAIL_MAX_LENGTH}
                  disabled={busy}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Cung cấp ngữ cảnh ngắn giúp Ban Quản Trị xử lý nhanh hơn..."
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => handleOpenChange(false)}
            >
              {statusMsg?.type === "success" ? "Đóng" : "Hủy"}
            </Button>
            {statusMsg?.type !== "success" && (
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Gửi báo cáo
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
