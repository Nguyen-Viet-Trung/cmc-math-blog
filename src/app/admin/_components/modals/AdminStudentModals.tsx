"use client";

import { useEffect, useState } from "react";
import { Calendar, Coins, KeyRound, Loader2 } from "lucide-react";
import {
  adjustStudentPointsAction,
  resetStudentPasswordAction,
  updateStudentJoinedAtAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { toDateInputValue } from "@/lib/format";
import {
  POINT_ADJUSTMENT_SCOPE_LABELS,
  type PointAdjustmentScope,
} from "@/lib/rules";
import type { UserProfile } from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

export type StudentModalState =
  | { kind: "points"; student: UserProfile }
  | { kind: "joinedDate"; student: UserProfile }
  | { kind: "resetPassword"; student: UserProfile }
  | null;

export function AdminStudentModals({
  modal,
  onClose,
  onSuccess,
  onNotice,
}: {
  modal: StudentModalState;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onNotice: (n: AdminNotice) => void;
}) {
  const [pointDelta, setPointDelta] = useState("10");
  const [pointScope, setPointScope] = useState<PointAdjustmentScope>("both");
  const [pointReason, setPointReason] = useState("");
  const [joinDateValue, setJoinDateValue] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!modal) return;
    setBusy(false);
    if (modal.kind === "points") {
      setPointDelta("10");
      setPointScope("both");
      setPointReason("");
    } else if (modal.kind === "joinedDate") {
      setJoinDateValue(toDateInputValue(modal.student.joinedAt));
    } else if (modal.kind === "resetPassword") {
      setTempPassword("");
    }
  }, [modal]);

  async function handleSubmitPoints(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || modal.kind !== "points" || busy) return;
    setBusy(true);
    try {
      const res = await adjustStudentPointsAction({
        studentId: modal.student.id,
        deltaPoints: Number(pointDelta),
        reason: pointReason,
        scope: pointScope,
      });
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Lỗi điều chỉnh điểm." });
        return;
      }
      onClose();
      onNotice({
        type: "success",
        text: `Đã cập nhật điểm cho ${modal.student.displayName} và ghi sổ cái đối soát!`,
      });
      await onSuccess();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi điều chỉnh điểm.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitJoinDate(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || modal.kind !== "joinedDate" || busy) return;
    setBusy(true);
    try {
      const res = await updateStudentJoinedAtAction({
        studentId: modal.student.id,
        joinedDate: joinDateValue,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể cập nhật ngày gia nhập CLB.",
        });
        return;
      }
      onClose();
      onNotice({
        type: "success",
        text: `Đã cập nhật ngày gia nhập CLB cho ${modal.student.displayName}!`,
      });
      await onSuccess();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi cập nhật ngày gia nhập.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!modal || modal.kind !== "resetPassword" || busy) return;
    setBusy(true);
    try {
      const res = await resetStudentPasswordAction({
        studentId: modal.student.id,
        newPassword: tempPassword,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể đặt lại mật khẩu.",
        });
        return;
      }
      const target = modal.student;
      onClose();
      onNotice({
        type: "success",
        text: `Đã đặt lại mật khẩu mới cho ${target.displayName} (${target.email}). Hãy gửi mật khẩu tạm này cho học sinh và nhắc đổi lại ở trang Hồ sơ.`,
      });
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi cấp lại mật khẩu.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(modal)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        {modal?.kind === "points" && (
          <form onSubmit={handleSubmitPoints} className="space-y-4">
            <div className="space-y-1 pr-6">
              <DialogTitle>Điều chỉnh điểm thành viên</DialogTitle>
              <DialogDescription>
                {modal.student.displayName} ({modal.student.email})
              </DialogDescription>
            </div>

            <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-border bg-muted/35 p-3 text-xs tabular-nums">
              <div>
                <span className="block text-[11px] text-muted-foreground">
                  Điểm khả dụng (đổi quà)
                </span>
                <strong className="text-sm font-bold text-bounty">
                  {modal.student.pointsBalance}đ
                </strong>
              </div>
              <div className="border-l border-border pl-3">
                <span className="block text-[11px] text-muted-foreground">
                  Tổng điểm đạt được
                </span>
                <strong className="text-sm font-bold text-foreground">
                  {modal.student.totalEarnedPoints}đ
                </strong>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="modal-point-scope">Phạm vi điều chỉnh</Label>
                <NativeSelect
                  id="modal-point-scope"
                  value={pointScope}
                  onChange={(e) =>
                    setPointScope(e.target.value as PointAdjustmentScope)
                  }
                  className="text-xs font-medium"
                >
                  {(
                    ["both", "balance_only", "earned_only"] as PointAdjustmentScope[]
                  ).map((key) => (
                    <option key={key} value={key}>
                      {POINT_ADJUSTMENT_SCOPE_LABELS[key]}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-point-delta">
                  Số điểm cộng (+) hoặc trừ (-)
                </Label>
                <Input
                  id="modal-point-delta"
                  type="number"
                  required
                  value={pointDelta}
                  onChange={(e) => setPointDelta(e.target.value)}
                  className="font-semibold tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-point-reason">
                  Lý do điều chỉnh (lưu sổ cái điểm)
                </Label>
                <Input
                  id="modal-point-reason"
                  type="text"
                  required
                  value={pointReason}
                  onChange={(e) => setPointReason(e.target.value)}
                  placeholder="Ví dụ: Thưởng lời giải sáng tạo bài Hình học tuần 3"
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
                  <Coins className="h-3.5 w-3.5" />
                )}
                Xác nhận cập nhật
              </Button>
            </div>
          </form>
        )}

        {modal?.kind === "joinedDate" && (
          <form onSubmit={handleSubmitJoinDate} className="space-y-4">
            <div className="space-y-1 pr-6">
              <DialogTitle>Cập nhật ngày gia nhập CLB</DialogTitle>
              <DialogDescription>
                {modal.student.displayName} ({modal.student.email})
              </DialogDescription>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-joined-date">Ngày gia nhập</Label>
              <Input
                id="modal-joined-date"
                type="date"
                required
                value={joinDateValue}
                onChange={(e) => setJoinDateValue(e.target.value)}
                className="tabular-nums"
              />
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
                  <Calendar className="h-3.5 w-3.5" />
                )}
                Lưu ngày gia nhập
              </Button>
            </div>
          </form>
        )}

        {modal?.kind === "resetPassword" && (
          <form onSubmit={handleSubmitResetPassword} className="space-y-4">
            <div className="space-y-1 pr-6">
              <DialogTitle>Đặt lại mật khẩu học sinh</DialogTitle>
              <DialogDescription>
                Cấp mật khẩu tạm cho{" "}
                <strong className="text-foreground">
                  {modal.student.displayName}
                </strong>{" "}
                ({modal.student.email}).
              </DialogDescription>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-reset-pwd">Mật khẩu tạm (6–72 ký tự)</Label>
              <Input
                id="modal-reset-pwd"
                type="text"
                required
                minLength={6}
                maxLength={72}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Ví dụ: cmc2026"
                className="font-mono text-xs"
              />
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
                  <KeyRound className="h-3.5 w-3.5" />
                )}
                Cấp lại mật khẩu
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
