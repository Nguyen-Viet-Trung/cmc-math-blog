"use client";

import { useMemo, useState } from "react";
import { EyeOff, MessageSquare, Radio, RefreshCw, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { RealtimeConnectionState } from "@/hooks/useThreadDiscussion";
import { formatDateTimeVN } from "@/lib/format";
import type { ReplyItem, ThreadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ThreadReplyCard } from "./ThreadReplyCard";

interface ThreadReplyListProps {
  threadId: string;
  replies: ReplyItem[];
  hiddenRepliesCount: number;
  challengeEndsAt: string | null;
  isBlindChallenge: boolean;
  threadAuthorId: string;
  viewerId: string | null;
  isAdmin: boolean;
  bountyPoints: number;
  status: ThreadStatus;
  isArticleThread: boolean;
  isChallengeThread: boolean;
  isThreadOwner: boolean;
  canChooseAccepted: boolean;
  canAwardChallenge: boolean;
  realtimeState: RealtimeConnectionState;
  onlineCount: number;
  isFetching: boolean;
  isUpvoting: boolean;
  isAccepting: boolean;
  isAwardingChallenge: boolean;
  onRefresh: () => void;
  onUpvote: (replyId: string) => void;
  onAccept: (replyId: string) => Promise<void> | void;
  onAwardChallenge: (replyId: string) => Promise<void> | void;
  onReplyTo: (reply: ReplyItem) => void;
  onQuote: (reply: ReplyItem) => void;
  onFeedback: (
    feedback: { type: "success" | "error"; text: string } | null
  ) => void;
}

export function ThreadReplyList({
  threadId,
  replies,
  hiddenRepliesCount,
  challengeEndsAt,
  isBlindChallenge,
  threadAuthorId,
  viewerId,
  isAdmin,
  bountyPoints,
  status,
  isArticleThread,
  isChallengeThread,
  isThreadOwner,
  canChooseAccepted,
  canAwardChallenge,
  realtimeState,
  onlineCount,
  isFetching,
  isUpvoting,
  isAccepting,
  isAwardingChallenge,
  onRefresh,
  onUpvote,
  onAccept,
  onAwardChallenge,
  onReplyTo,
  onQuote,
  onFeedback,
}: ThreadReplyListProps) {
  const [acceptTarget, setAcceptTarget] = useState<ReplyItem | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<ReplyItem | null>(null);

  // Gom nhóm replies theo 1 cấp lồng (root replies + danh sách children)
  const grouped = useMemo(() => {
    const idSet = new Set(replies.map((r) => r.id));
    const roots: ReplyItem[] = [];
    const childrenMap = new Map<string, ReplyItem[]>();

    for (const r of replies) {
      if (r.parentReplyId && idSet.has(r.parentReplyId)) {
        const list = childrenMap.get(r.parentReplyId) ?? [];
        list.push(r);
        childrenMap.set(r.parentReplyId, list);
      } else {
        roots.push(r);
      }
    }
    return { roots, childrenMap };
  }, [replies]);

  const totalCountDisplay = replies.length + hiddenRepliesCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="heading-2">
            {totalCountDisplay}{" "}
            {isChallengeThread
              ? "Bài nộp & Thảo luận"
              : isArticleThread
                ? "Bình luận & Thảo luận"
                : "Lời giải & Thảo luận"}
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

        {!isArticleThread && !isChallengeThread && isThreadOwner && status === "open" && (
          <p className="text-xs font-bold text-primary">
            Bạn là tác giả đề bài — hãy chọn lời giải đúng nhất để trao +
            {bountyPoints} điểm!
          </p>
        )}
      </div>

      {isBlindChallenge && (
        <Alert variant="info" className="text-xs">
          <div className="flex items-start gap-2">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold">
                Chế độ Thi Ẩn Bài (Blind Submission) đang bật
                {hiddenRepliesCount > 0
                  ? ` — Hiện có ${hiddenRepliesCount} bài nộp của các bạn khác đang chờ công bố.`
                  : "."}
              </p>
              <p className="opacity-90">
                {isAdmin || isThreadOwner
                  ? "Bạn đang xem toàn bộ bài nộp với quyền Ban Tổ Chức / Admin."
                  : "Để đảm bảo công bằng, bạn chỉ nhìn thấy bài nộp của chính mình cho tới khi hết hạn."}
                {challengeEndsAt
                  ? ` Toàn bộ bài nộp sẽ tự động công khai vào lúc ${formatDateTimeVN(challengeEndsAt)}.`
                  : ""}
              </p>
            </div>
          </div>
        </Alert>
      )}

      {grouped.roots.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              {isChallengeThread
                ? hiddenRepliesCount > 0
                  ? `Đang có ${hiddenRepliesCount} bài nộp ẩn`
                  : "Chưa có bài nộp nào"
                : isArticleThread
                  ? "Chưa có bình luận nào"
                  : "Chưa có lời giải nào"}
            </EmptyTitle>
            <EmptyDescription>
              {isChallengeThread ? (
                hiddenRepliesCount > 0 ? (
                  <>
                    Hãy gửi lời giải của bạn để giành{" "}
                    <strong className="text-bounty">+{bountyPoints} điểm</strong>!
                  </>
                ) : (
                  <>
                    Hãy gửi lời giải đầu tiên cho Thử thách Tuần để nhận{" "}
                    <strong className="text-bounty">+{bountyPoints} điểm</strong>!
                  </>
                )
              ) : isArticleThread ? (
                "Hãy chia sẻ góc nhìn hoặc câu hỏi của bạn về bài viết này!"
              ) : (
                <>
                  Hãy gửi lời giải đầu tiên để nhận{" "}
                  <strong className="text-bounty">+{bountyPoints} điểm</strong>!
                </>
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {grouped.roots.map((root) => {
            const children = grouped.childrenMap.get(root.id) ?? [];
            return (
              <div key={root.id} className="space-y-2.5">
                <ThreadReplyCard
                  threadId={threadId}
                  reply={root}
                  threadAuthorId={threadAuthorId}
                  viewerId={viewerId}
                  isAdmin={isAdmin}
                  bountyPoints={bountyPoints}
                  status={status}
                  isArticleThread={isArticleThread}
                  isChallengeThread={isChallengeThread}
                  canChooseAccepted={canChooseAccepted}
                  canAwardChallenge={canAwardChallenge}
                  isUpvoting={isUpvoting}
                  isAccepting={isAccepting}
                  isAwardingChallenge={isAwardingChallenge}
                  onRefresh={onRefresh}
                  onUpvote={onUpvote}
                  onRequestAccept={setAcceptTarget}
                  onRequestAwardChallenge={setChallengeTarget}
                  onReplyTo={onReplyTo}
                  onQuote={onQuote}
                  onFeedback={onFeedback}
                />

                {children.length > 0 && (
                  <div className="ml-3 space-y-2.5 border-l-2 border-border pl-3.5 sm:ml-7 sm:pl-4">
                    {children.map((child) => (
                      <ThreadReplyCard
                        key={child.id}
                        threadId={threadId}
                        reply={child}
                        isNested
                        threadAuthorId={threadAuthorId}
                        viewerId={viewerId}
                        isAdmin={isAdmin}
                        bountyPoints={bountyPoints}
                        status={status}
                        isArticleThread={isArticleThread}
                        isChallengeThread={isChallengeThread}
                        canChooseAccepted={false}
                        canAwardChallenge={false}
                        isUpvoting={isUpvoting}
                        isAccepting={isAccepting}
                        isAwardingChallenge={isAwardingChallenge}
                        onRefresh={onRefresh}
                        onUpvote={onUpvote}
                        onRequestAccept={setAcceptTarget}
                        onRequestAwardChallenge={setChallengeTarget}
                        onReplyTo={onReplyTo}
                        onQuote={onQuote}
                        onFeedback={onFeedback}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(acceptTarget)}
        onOpenChange={(open) => {
          if (!open) setAcceptTarget(null);
        }}
        title="Xác nhận chọn lời giải đúng?"
        description={
          acceptTarget
            ? `Hệ thống sẽ tự động cộng +${bountyPoints} điểm cho ${acceptTarget.author.displayName} và đánh dấu bài toán là "Đã giải quyết". Thao tác này không thể tự hoàn tác.`
            : ""
        }
        confirmLabel={`Xác nhận & trao +${bountyPoints} điểm`}
        confirmVariant="success"
        isLoading={isAccepting}
        onConfirm={async () => {
          if (!acceptTarget) return;
          const targetId = acceptTarget.id;
          setAcceptTarget(null);
          await onAccept(targetId);
        }}
      />

      <ConfirmDialog
        open={Boolean(challengeTarget)}
        onOpenChange={(open) => {
          if (!open) setChallengeTarget(null);
        }}
        title="Chấm đúng bài nộp Thử thách Tuần?"
        description={
          challengeTarget
            ? `Hệ thống sẽ cộng +${bountyPoints} điểm cho ${challengeTarget.author.displayName}. Bạn vẫn có thể chấm đúng cho các học sinh khác có lời giải đạt yêu cầu.`
            : ""
        }
        confirmLabel={`Chấm đúng & trao +${bountyPoints}đ`}
        confirmVariant="success"
        isLoading={isAwardingChallenge}
        onConfirm={async () => {
          if (!challengeTarget) return;
          const targetId = challengeTarget.id;
          setChallengeTarget(null);
          await onAwardChallenge(targetId);
        }}
      />
    </div>
  );
}
