"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PackageCheck, XCircle } from "lucide-react";
import { reviewRedemptionAction } from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RedemptionItem } from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

export function AdminRedemptionDialog({
  redemption,
  onClose,
  onSuccess,
  onNotice,
}: {
  redemption: RedemptionItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onNotice: (n: AdminNotice) => void;
}) {
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);

  useEffect(() => {
    if (!redemption) return;
    setAdminNote(redemption.adminNote || "");
    setBusy(false);
    setConfirmRejectOpen(false);
  }, [redemption]);

  async function submitStatus(newStatus: "approved" | "fulfilled" | "rejected") {
    if (!redemption || busy) return;
    setBusy(true);
    try {
      const res = await reviewRedemptionAction({
        redemptionId: redemption.id,
        newStatus,
        adminNote,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Lỗi cập nhật đơn đổi quà.",
        });
        return;
      }
      setConfirmRejectOpen(false);
      onClose();
      onNotice({
        type: "success",
        text:
          newStatus === "rejected"
            ? "Đã từ chối đơn và tự động hoàn lại điểm + tồn kho!"
            : newStatus === "fulfilled"
              ? `Đã đánh dấu hoàn thành trao "${redemption.rewardName}" cho ${redemption.userDisplayName}!`
              : "Đã duyệt đơn đổi quà!",
      });
      await onSuccess();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi xử lý đơn đổi quà.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={Boolean(redemption)}
        onOpenChange={(o) => !o && !busy && onClose()}
      >
        <DialogContent className="max-w-lg">
          {redemption && (
            <div className="space-y-4">
              <div className="space-y-1 pr-6">
                <DialogTitle>Xử lý đơn đổi quà</DialogTitle>
                <DialogDescription>
                  {redemption.userDisplayName} ({redemption.userEmail}) đổi{" "}
                  <strong className="text-foreground">
                    {redemption.rewardName}
                  </strong>{" "}
                  ·{" "}
                  <strong className="tabular-nums text-bounty">
                    {redemption.pointsSpent} điểm
                  </strong>
                </DialogDescription>
              </div>

              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
                <span className="font-semibold">Ghi chú từ học sinh: </span>
                {redemption.studentNote || "(Không có ghi chú)"}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="redemption-admin-note">
                  Ghi chú phản hồi cho học sinh
                </Label>
                <Textarea
                  id="redemption-admin-note"
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ví dụ: Nhận quà tại phòng Giáo vụ sáng thứ 5..."
                  className="text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setConfirmRejectOpen(true)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Từ chối &amp; Hoàn điểm
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  {redemption.status === "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void submitStatus("approved")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Duyệt đơn
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="success"
                    disabled={busy}
                    onClick={() => void submitStatus("fulfilled")}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PackageCheck className="h-3.5 w-3.5" />
                    )}
                    Đã trao quà
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmRejectOpen}
        onOpenChange={setConfirmRejectOpen}
        title="Từ chối đơn đổi quà & hoàn điểm?"
        description={
          redemption
            ? `Hệ thống sẽ từ chối đơn "${redemption.rewardName}" của ${redemption.userDisplayName}, tự động hoàn lại ${redemption.pointsSpent} điểm cho học sinh và cộng lại +1 tồn kho.`
            : ""
        }
        confirmLabel="Từ chối & Hoàn điểm"
        confirmVariant="destructive"
        isLoading={busy}
        onConfirm={() => submitStatus("rejected")}
      />
    </>
  );
}
