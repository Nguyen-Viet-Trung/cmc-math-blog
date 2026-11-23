"use client";

import {
  Award,
  CheckCircle2,
  Loader2,
  Radio,
  RefreshCw,
  ThumbsUp,
  Users,
} from "lucide-react";
import { MathContent } from "@/components/MathContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { RealtimeConnectionState } from "@/hooks/useThreadDiscussion";
import type { ReplyItem, ThreadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThreadReplyListProps {
  replies: ReplyItem[];
  threadAuthorId: string;
  bountyPoints: number;
  status: ThreadStatus;
  isArticleThread: boolean;
  isThreadOwner: boolean;
  canChooseAccepted: boolean;
  realtimeState: RealtimeConnectionState;
  onlineCount: number;
  isFetching: boolean;
  isUpvoting: boolean;
  isAccepting: boolean;
  onRefresh: () => void;
  onUpvote: (replyId: string) => void;
  onAccept: (replyId: string) => void;
}

export function ThreadReplyList({
  replies,
  threadAuthorId,
  bountyPoints,
  status,
  isArticleThread,
  isThreadOwner,
  canChooseAccepted,
  realtimeState,
  onlineCount,
  isFetching,
  isUpvoting,
  isAccepting,
  onRefresh,
  onUpvote,
  onAccept,
}: ThreadReplyListProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="heading-2">
            {replies.length}{" "}
            {isArticleThread ? "Bình luận & Thảo luận" : "Lời giải & Thảo luận"}
          </h2>

          <Badge variant={realtimeState === "live" ? "success" : "outline"}>
            <Radio className="h-3 w-3" />
            {realtimeState === "live"
              ? "Trực tuyến tự động"
              : realtimeState === "connecting"
                ? "Đang kết nối..."
                : "Đồng bộ tự động"}
          </Badge>

          {realtimeState === "live" && (
            <Badge variant="outline">
              <Users className="h-3 w-3" />
              {onlineCount} đang xem
            </Badge>
          )}

          <Button size="sm" variant="ghost" onClick={onRefresh}>
            <RefreshCw
              className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
            />
            Làm mới
          </Button>
        </div>

        {!isArticleThread && isThreadOwner && status === "open" && (
          <p className="text-xs font-bold text-primary">
            Bạn là tác giả đề bài — hãy chọn lời giải đúng nhất để trao +
            {bountyPoints} điểm!
          </p>
        )}
      </div>

      {replies.length === 0 ? (
        <Card className="border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isArticleThread ? (
              "Chưa có bình luận nào. Hãy chia sẻ góc nhìn hoặc câu hỏi của bạn về bài viết này!"
            ) : (
              <>
                Chưa có lời giải nào. Hãy gửi lời giải đầu tiên để nhận{" "}
                <strong className="text-bounty">+{bountyPoints} điểm</strong>!
              </>
            )}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {replies.map((r) => {
            const isSelfReply = r.author.id === threadAuthorId;
            const isOptimistic = r.id.startsWith("optimistic-");

            return (
              <Card
                key={r.id}
                className={cn(
                  "p-5 sm:p-6",
                  r.isAccepted &&
                    "border-2 border-success bg-success-surface/50",
                  isOptimistic && "opacity-80"
                )}
              >
                <div className="space-y-4">
                  {r.isAccepted && (
                    <div>
                      <Badge variant="successSolid">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Lời giải đúng được chọn (+{bountyPoints} điểm)
                      </Badge>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={r.author.avatarUrl ?? undefined}
                          alt={r.author.displayName}
                        />
                        <AvatarFallback className="text-[11px]">
                          {r.author.displayName.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-foreground">
                        {r.author.displayName}
                        {r.author.nickname ? (
                          <span className="ml-1 font-normal text-muted-foreground">
                            ({r.author.nickname})
                          </span>
                        ) : null}
                      </span>
                      <Badge variant="outline">{r.author.gradeLevel}</Badge>
                      <span className="text-xs font-bold tabular-nums text-success">
                        • {r.author.solvedCount} bài đã giải
                      </span>
                      {isSelfReply && (
                        <Badge variant="subtle">
                          {isArticleThread
                            ? "Tác giả bài viết"
                            : "Tác giả đề bài"}
                        </Badge>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {isOptimistic
                        ? "Đang gửi..."
                        : new Date(r.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <Separator />

                  <MathContent content={r.content} imageUrls={r.imageUrls} />

                  {!isOptimistic && (
                    <>
                      <Separator />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button
                          size="sm"
                          variant={r.viewerHasUpvoted ? "default" : "outline"}
                          disabled={isUpvoting}
                          onClick={() => onUpvote(r.id)}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {isArticleThread ? "Hữu ích" : "Lời giải hay"} (
                          {r.upvotesCount})
                        </Button>

                        {canChooseAccepted && !isSelfReply && (
                          <Button
                            size="sm"
                            variant="success"
                            disabled={isAccepting}
                            onClick={() => onAccept(r.id)}
                          >
                            {isAccepting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Award className="h-4 w-4" />
                            )}
                            ✓ Chọn làm lời giải đúng (+{bountyPoints} điểm)
                          </Button>
                        )}

                        {canChooseAccepted && isSelfReply && (
                          <span className="text-xs italic text-muted-foreground">
                            (Không thể tự chọn lời giải của chính người đăng đề
                            để cộng điểm)
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
