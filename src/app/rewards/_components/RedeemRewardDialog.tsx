"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { redeemRewardAction } from "@/app/actions/rewards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RewardItem } from "@/lib/types";

interface RedeemRewardDialogProps {
  reward: RewardItem | null;
  onClose: () => void;
  onFeedback: (feedback: { type: "success" | "error"; text: string }) => void;
}

export function RedeemRewardDialog({
  reward,
  onClose,
  onFeedback,
}: RedeemRewardDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [studentNote, setStudentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirmRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!reward) return;

    setSubmitting(true);
    const res = await redeemRewardAction({
      rewardId: reward.id,
      studentNote,
    });
    setSubmitting(false);

    if (!res.ok) {
      onFeedback({
        type: "error",
        text: res.error || "Không thể đổi quà.",
      });
      return;
    }

    setStudentNote("");
    onClose();
    onFeedback({
      type: "success",
      text: res.message || "Đổi quà thành công!",
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-redemptions"] }),
      queryClient.invalidateQueries({ queryKey: ["my-points-history"] }),
    ]);
    router.refresh();
  }

  return (
    <Dialog
      open={Boolean(reward)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        {reward && (
          <form onSubmit={handleConfirmRedeem} className="space-y-4">
            <div className="space-y-1.5 pr-6">
              <DialogTitle>Xác nhận đổi quà: {reward.name}</DialogTitle>
              <DialogDescription>
                Hệ thống sẽ trừ{" "}
                <strong className="text-bounty">
                  {reward.pointsCost} điểm
                </strong>{" "}
                từ số dư hiện tại của bạn. Nếu đơn bị hủy, điểm sẽ được tự động
                hoàn trả 100%.
              </DialogDescription>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="redeem-note">
                Thông tin nhận quà (Lớp / SĐT / Địa chỉ nhận quà)
              </Label>
              <Textarea
                id="redeem-note"
                required
                rows={3}
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="Ví dụ: Em Nguyễn Minh Khôi - Lớp 10A1, SĐT 09xx..., nhận quà tại lớp sáng thứ 2 ạ."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="success"
                size="sm"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Xác nhận đổi quà
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
