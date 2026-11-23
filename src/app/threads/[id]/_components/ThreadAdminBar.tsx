"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Gift, Loader2, Lock, Pin, Trash2 } from "lucide-react";
import {
  awardThreadAuthorAction,
  moderateThreadAction,
} from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import type { ThreadStatus, ThreadType } from "@/lib/types";

interface ThreadAdminBarProps {
  threadId: string;
  authorDisplayName: string;
  status: ThreadStatus;
  threadType: ThreadType;
  challengeEndsAt: string | null;
  isPinned: boolean;
  bountyPoints: number;
  isArticleThread: boolean;
  onModerated: (refreshSessionAlso?: boolean) => Promise<void>;
  onFeedback: (
    feedback: { type: "success" | "error"; text: string } | null
  ) => void;
}

export function ThreadAdminBar({
  threadId,
  authorDisplayName,
  status,
  threadType,
  challengeEndsAt,
  isPinned,
  bountyPoints,
  isArticleThread,
  onModerated,
  onFeedback,
}: ThreadAdminBarProps) {
  const router = useRouter();
  const [customBounty, setCustomBounty] = useState(String(bountyPoints));
  const [selectedType, setSelectedType] = useState<ThreadType>(threadType);
  const [deadlineInput, setDeadlineInput] = useState(() => {
    const base = challengeEndsAt
      ? new Date(challengeEndsAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
  });
  const [authorAwardPoints, setAuthorAwardPoints] = useState("20");
  const [authorAwardReason, setAuthorAwardReason] = useState("");
  const [awardingAuthor, setAwardingAuthor] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setCustomBounty(String(bountyPoints));
  }, [bountyPoints]);

  useEffect(() => {
    setSelectedType(threadType);
  }, [threadType]);

  async function handleAdminAction(
    action:
      | "toggle_pin"
      | "toggle_close"
      | "delete"
      | "set_bounty"
      | "set_type"
      | "set_challenge_deadline",
    nextType?: ThreadType,
    overrideDeadline?: string
  ) {
    setBusyAction(true);
    try {
      const res = await moderateThreadAction({
        threadId,
        action,
        bountyPoints: Number(customBounty),
        threadType: nextType ?? selectedType,
        challengeEndsAt:
          action === "set_challenge_deadline"
            ? overrideDeadline === "end_now"
              ? "end_now"
              : deadlineInput
                ? new Date(deadlineInput).toISOString()
                : null
            : undefined,
      });
      if (!res.ok) {
        onFeedback({ type: "error", text: res.error || "Thao tác thất bại." });
        return;
      }
      if (action === "delete") {
        setConfirmDeleteOpen(false);
        router.push("/");
        router.refresh();
      } else {
        await onModerated(false);
      }
    } catch {
      onFeedback({
        type: "error",
        text: "Không thể kết nối máy chủ. Vui lòng thử lại.",
      });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleAwardAuthor(e: React.FormEvent) {
    e.preventDefault();
    onFeedback(null);
    setAwardingAuthor(true);
    try {
      const res = await awardThreadAuthorAction({
        threadId,
        points: Number(authorAwardPoints),
        reason: authorAwardReason,
      });
      if (!res.ok) {
        onFeedback({
          type: "error",
          text: res.error || "Không thể thưởng điểm cho tác giả.",
        });
        return;
      }
      setAuthorAwardReason("");
      onFeedback({
        type: "success",
        text: res.message || "Đã cộng điểm thưởng cho tác giả bài viết!",
      });
      await onModerated(true);
    } catch {
      onFeedback({
        type: "error",
        text: "Không thể kết nối máy chủ khi thưởng điểm.",
      });
    } finally {
      setAwardingAuthor(false);
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-3 border-primary/25 bg-accent/50 p-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-primary">
              Điều hành Admin:
            </span>
            <div className="w-44">
              <NativeSelect
                aria-label="Phân loại bài viết"
                value={selectedType}
                disabled={busyAction}
                onChange={(e) => {
                  const next = e.target.value as ThreadType;
                  setSelectedType(next);
                  void handleAdminAction("set_type", next);
                }}
                className="h-8 text-xs font-medium"
              >
                <option value="question">Loại: Hỏi bài</option>
                <option value="challenge">Loại: Thử thách Tuần</option>
                <option value="news">Loại: News</option>
                <option value="research">Loại: Research</option>
              </NativeSelect>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busyAction}
              onClick={() => void handleAdminAction("toggle_pin")}
            >
              <Pin className="h-3.5 w-3.5" />
              {isPinned ? "Bỏ ghim" : "Ghim bài"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busyAction}
              onClick={() => void handleAdminAction("toggle_close")}
            >
              <Lock className="h-3.5 w-3.5" />
              {status === "closed" ? "Mở lại" : "Đóng thảo luận"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busyAction}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa bài
            </Button>
          </div>

          {!isArticleThread && status === "open" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">
                Thưởng lời giải:
              </span>
              <Input
                type="number"
                min={0}
                max={1000}
                aria-label="Điểm thưởng lời giải"
                value={customBounty}
                onChange={(e) => setCustomBounty(e.target.value)}
                className="h-8 w-20 bg-card tabular-nums"
              />
              <Button
                size="sm"
                disabled={busyAction}
                onClick={() => void handleAdminAction("set_bounty")}
              >
                Lưu
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {selectedType === "challenge" && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-bounty" />
                Hạn ẩn bài thử thách:
              </span>
              <Input
                type="datetime-local"
                aria-label="Hạn kết thúc thử thách"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                className="h-8 w-52 bg-card text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyAction}
                onClick={() => void handleAdminAction("set_challenge_deadline")}
              >
                Cập nhật hạn
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyAction}
                onClick={() =>
                  void handleAdminAction(
                    "set_challenge_deadline",
                    undefined,
                    "end_now"
                  )
                }
              >
                Mở công khai ngay
              </Button>
            </div>
            <Separator />
          </>
        )}

        {/* Admin thưởng điểm tùy chỉnh trực tiếp cho người tạo bài viết */}
        <form
          onSubmit={handleAwardAuthor}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <span className="shrink-0 text-xs font-semibold text-foreground">
            Thưởng tác giả ({authorDisplayName}):
          </span>
          <Input
            type="number"
            required
            min={1}
            max={1000}
            value={authorAwardPoints}
            onChange={(e) => setAuthorAwardPoints(e.target.value)}
            className="h-8 w-24 bg-card font-semibold tabular-nums text-bounty"
            aria-label="Số điểm thưởng cho tác giả"
          />
          <Input
            type="text"
            value={authorAwardReason}
            onChange={(e) => setAuthorAwardReason(e.target.value)}
            placeholder="Ghi chú lý do thưởng (ví dụ: Bài Research trình bày rất công phu)..."
            className="h-8 flex-1 bg-card text-xs"
          />
          <Button
            type="submit"
            size="sm"
            variant="bounty"
            disabled={awardingAuthor}
          >
            {awardingAuthor ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Gift className="h-3.5 w-3.5" />
            )}
            Cộng +{authorAwardPoints || 0}đ tác giả
          </Button>
        </form>
      </Card>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xóa vĩnh viễn chủ đề này?"
        description="Toàn bộ nội dung chủ đề, các bình luận và hình ảnh đính kèm sẽ bị xóa vĩnh viễn khỏi diễn đàn."
        confirmLabel="Xóa chủ đề"
        confirmVariant="destructive"
        isLoading={busyAction}
        onConfirm={() => handleAdminAction("delete")}
      />
    </>
  );
}
