"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTimeVN, formatDurationShort } from "@/lib/format";
import type { AdminReplyAuditItem, ReplySuspicionCode } from "@/lib/types";

const MathContent = dynamic(
  () => import("@/components/MathContent").then((m) => m.MathContent),
  {
    loading: () => (
      <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
    ),
  }
);

const SUSPICION_META: Record<
  ReplySuspicionCode,
  { label: string; variant: "destructive" | "bounty" }
> = {
  mutual_pair: { label: "Nghi vấn buff chéo 2 chiều", variant: "destructive" },
  repeated_pair: { label: "Lặp cặp nhận điểm nhiều lần", variant: "bounty" },
  short_accepted: {
    label: "Lời giải quá sơ sài (<30 ký tự)",
    variant: "destructive",
  },
  ultra_fast_reply: { label: "Trả lời quá nhanh (≤60s)", variant: "bounty" },
};

interface AdminReplyAuditCardProps {
  reply: AdminReplyAuditItem;
  flags: ReplySuspicionCode[];
  isBusy: boolean;
  onRevoke: (reason: string) => void;
  onDelete: (reason: string) => void;
}

export const AdminReplyAuditCard = memo(function AdminReplyAuditCard({
  reply: r,
  flags,
  isBusy,
  onRevoke,
  onDelete,
}: AdminReplyAuditCardProps) {
  const [reason, setReason] = useState("");
  const isSuspicious = flags.length > 0;

  return (
    <Card
      className={`space-y-3 p-5 ${
        isSuspicious
          ? "border-destructive/45 bg-destructive/[0.03]"
          : r.isAccepted
            ? "border-success-border/80"
            : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/threads/${r.threadId}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {r.threadTitle}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </Link>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              Người hỏi:{" "}
              <strong className="text-foreground">{r.threadAuthorName}</strong>{" "}
              ({r.threadAuthorEmail})
            </span>
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span>
              Người trả lời:{" "}
              <strong className="text-foreground">{r.replyAuthorName}</strong> (
              {r.replyAuthorEmail} · {r.replyAuthorPoints}đ ·{" "}
              {r.replyAuthorSolvedCount} bài đúng)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTimeVN(r.createdAt)} (sau khi đăng đề{" "}
              <strong
                className={
                  r.secondsAfterThread <= 60 && r.isAccepted
                    ? "text-destructive"
                    : "text-foreground"
                }
              >
                {formatDurationShort(r.secondsAfterThread)}
              </strong>
              )
            </span>
            <span className="inline-flex items-center gap-1">
              · <ThumbsUp className="h-3 w-3" /> {r.upvotesCount} cảm ơn
            </span>
            {r.isAccepted && r.acceptedByName && (
              <span>
                · Người duyệt:{" "}
                <strong className="text-foreground">{r.acceptedByName}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {r.isAccepted ? (
            <Badge variant="successSolid">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đã cộng +{r.awardedPoints}đ
            </Badge>
          ) : (
            <Badge variant="outline">Bình luận thường</Badge>
          )}
          {flags.map((code) => (
            <Badge key={code} variant={SUSPICION_META[code].variant}>
              <AlertTriangle className="h-3 w-3" />
              {SUSPICION_META[code].label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3.5 text-sm">
        <MathContent content={r.content} imageUrls={r.imageUrls} />
      </div>

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
        <Input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do thu hồi điểm / xóa bình luận (lưu vào sổ cái điểm)..."
          className="flex-1 text-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {r.isAccepted && (
            <Button
              type="button"
              size="sm"
              variant="bounty"
              disabled={isBusy}
              onClick={() => onRevoke(reason)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Hủy duyệt &amp; Thu hồi -{r.awardedPoints}đ
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isBusy}
            onClick={() => onDelete(reason)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {r.isAccepted ? "Xóa & Thu hồi điểm" : "Xóa bình luận"}
          </Button>
        </div>
      </div>
    </Card>
  );
});
