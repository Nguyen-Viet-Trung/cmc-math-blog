"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { awardThreadAuthorAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminThreadManageItem } from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

export function AdminThreadAwardDialog({
  thread,
  onClose,
  onSuccess,
  onNotice,
}: {
  thread: AdminThreadManageItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onNotice: (n: AdminNotice) => void;
}) {
  const [points, setPoints] = useState("20");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!thread) return;
    setPoints("20");
    setReason("");
    setBusy(false);
  }, [thread]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || busy) return;
    setBusy(true);
    try {
      const res = await awardThreadAuthorAction({
        threadId: thread.id,
        points: Number(points),
        reason,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể cộng điểm thưởng tác giả.",
        });
        return;
      }
      onClose();
      onNotice({
        type: "success",
        text: res.message || "Đã thưởng điểm cho tác giả bài viết!",
      });
      await onSuccess();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi cộng điểm thưởng.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(thread)} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        {thread && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 pr-6">
              <DialogTitle>Thưởng điểm tác giả bài viết</DialogTitle>
              <DialogDescription className="line-clamp-2">
                {thread.title} — Tác giả:{" "}
                <strong className="text-foreground">{thread.authorName}</strong>
                {thread.authorRewardPoints > 0
                  ? ` (Đã thưởng +${thread.authorRewardPoints}đ)`
                  : ""}
              </DialogDescription>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="award-thread-pts">Số điểm thưởng (1–1000)</Label>
                <Input
                  id="award-thread-pts"
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="font-semibold tabular-nums text-bounty"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="award-thread-reason">
                  Lý do thưởng (lưu vào sổ cái điểm)
                </Label>
                <Input
                  id="award-thread-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Bài viết Research chất lượng cao, trình bày rõ ràng"
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
              <Button
                type="submit"
                size="sm"
                variant="bounty"
                disabled={busy || thread.authorBanned}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Gift className="h-3.5 w-3.5" />
                )}
                Cộng +{points || 0}đ tác giả
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
