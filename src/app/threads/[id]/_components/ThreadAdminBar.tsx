"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, Lock, Pin, Trash2 } from "lucide-react";
import {
  awardThreadAuthorAction,
  moderateThreadAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { ThreadStatus, ThreadType } from "@/lib/types";

interface ThreadAdminBarProps {
  threadId: string;
  authorDisplayName: string;
  status: ThreadStatus;
  threadType: ThreadType;
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
  isPinned,
  bountyPoints,
  isArticleThread,
  onModerated,
  onFeedback,
}: ThreadAdminBarProps) {
  const router = useRouter();
  const [customBounty, setCustomBounty] = useState(String(bountyPoints));
  const [selectedType, setSelectedType] = useState<ThreadType>(threadType);
  const [authorAwardPoints, setAuthorAwardPoints] = useState("20");
  const [authorAwardReason, setAuthorAwardReason] = useState("");
  const [awardingAuthor, setAwardingAuthor] = useState(false);

  useEffect(() => {
    setCustomBounty(String(bountyPoints));
  }, [bountyPoints]);

  useEffect(() => {
    setSelectedType(threadType);
  }, [threadType]);

  async function handleAdminAction(
    action: "toggle_pin" | "toggle_close" | "delete" | "set_bounty" | "set_type",
    nextType?: ThreadType
  ) {
    if (
      action === "delete" &&
      !window.confirm("Bạn chắc chắn muốn xóa vĩnh viễn chủ đề này?")
    ) {
      return;
    }
    const res = await moderateThreadAction({
      threadId,
      action,
      bountyPoints: Number(customBounty),
      threadType: nextType ?? selectedType,
    });
    if (!res.ok) {
      onFeedback({ type: "error", text: res.error || "Thao tác thất bại." });
      return;
    }
    if (action === "delete") {
      router.push("/");
    } else {
      await onModerated(false);
    }
  }

  async function handleAwardAuthor(e: React.FormEvent) {
    e.preventDefault();
    onFeedback(null);
    setAwardingAuthor(true);
    const res = await awardThreadAuthorAction({
      threadId,
      points: Number(authorAwardPoints),
      reason: authorAwardReason,
    });
    setAwardingAuthor(false);
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
  }

  return (
    <Card className="space-y-3 border-primary/25 bg-accent/50 p-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-primary">
            Điều hành Admin:
          </span>
          <select
            aria-label="Phân loại bài viết"
            value={selectedType}
            onChange={(e) => {
              const next = e.target.value as ThreadType;
              setSelectedType(next);
              void handleAdminAction("set_type", next);
            }}
            className="h-8 rounded-md border border-input bg-card px-2.5 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="question">Loại: Hỏi bài</option>
            <option value="news">Loại: News</option>
            <option value="research">Loại: Research</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleAdminAction("toggle_pin")}
          >
            <Pin className="h-3.5 w-3.5" />
            {isPinned ? "Bỏ ghim" : "Ghim bài"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleAdminAction("toggle_close")}
          >
            <Lock className="h-3.5 w-3.5" />
            {status === "closed" ? "Mở lại" : "Đóng thảo luận"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void handleAdminAction("delete")}
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
              value={customBounty}
              onChange={(e) => setCustomBounty(e.target.value)}
              className="h-8 w-20 bg-card tabular-nums"
            />
            <Button
              size="sm"
              onClick={() => void handleAdminAction("set_bounty")}
            >
              Lưu
            </Button>
          </div>
        )}
      </div>

      <Separator />

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
  );
}
