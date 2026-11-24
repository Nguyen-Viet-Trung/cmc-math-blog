"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { resolveContentReportAction } from "@/app/actions/safety";
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
  REPORT_REASON_LABELS,
  REPORT_RESOLUTION_NOTE_MAX_LENGTH,
  REPORT_TARGET_TYPE_LABELS,
} from "@/lib/safety-rules";
import type { ContentReportItem } from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

export function AdminReportDialog({
  report,
  onClose,
  onSuccess,
  onNotice,
}: {
  report: ContentReportItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onNotice: (n: AdminNotice) => void;
}) {
  const [status, setStatus] = useState<"resolved" | "dismissed">("resolved");
  const [resolutionNote, setResolutionNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!report) return;
    setStatus(report.status === "dismissed" ? "dismissed" : "resolved");
    setResolutionNote(report.resolutionNote || "");
    setBusy(false);
  }, [report]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!report || busy) return;
    setBusy(true);
    try {
      const res = await resolveContentReportAction({
        reportId: report.id,
        status,
        resolutionNote,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể cập nhật trạng thái báo cáo.",
        });
        return;
      }
      onClose();
      onNotice({
        type: "success",
        text:
          status === "resolved"
            ? "Đã đánh dấu báo cáo là 'Đã xử lý'."
            : "Đã bỏ qua báo cáo vi phạm.",
      });
      await onSuccess();
    } catch {
      onNotice({
        type: "error",
        text: "Lỗi kết nối máy chủ khi xử lý báo cáo.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(report)}
      onOpenChange={(open) => !open && !busy && onClose()}
    >
      <DialogContent className="max-w-lg">
        {report && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 pr-6">
              <DialogTitle>Xử lý báo cáo vi phạm</DialogTitle>
              <DialogDescription className="line-clamp-2">
                {REPORT_TARGET_TYPE_LABELS[report.targetType]} ·{" "}
                {REPORT_REASON_LABELS[report.reason]} — Báo cáo bởi{" "}
                {report.reporterName}
              </DialogDescription>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="report-resolve-status">Kết luận xử lý</Label>
                <NativeSelect
                  id="report-resolve-status"
                  value={status}
                  disabled={busy}
                  onChange={(e) =>
                    setStatus(e.target.value as "resolved" | "dismissed")
                  }
                  className="text-xs font-medium"
                >
                  <option value="resolved">Đã xử lý (có biện pháp)</option>
                  <option value="dismissed">Bỏ qua (không vi phạm)</option>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="report-resolve-note">
                    Ghi chú xử lý nội bộ
                  </Label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {resolutionNote.length}/{REPORT_RESOLUTION_NOTE_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="report-resolve-note"
                  rows={4}
                  maxLength={REPORT_RESOLUTION_NOTE_MAX_LENGTH}
                  disabled={busy}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Ghi rõ hướng xử lý (VD: Đã xóa bình luận spam / Đã nhắc nhở học sinh / Không phát hiện vi phạm)..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
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
                Lưu kết luận
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
