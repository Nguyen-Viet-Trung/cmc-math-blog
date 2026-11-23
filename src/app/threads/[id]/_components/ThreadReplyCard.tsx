"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Award,
  Check,
  CheckCircle2,
  CornerDownRight,
  Flame,
  Loader2,
  Pencil,
  Quote,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { deleteOwnReplyAction, updateReplyAction } from "@/app/actions/forum";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MathContent } from "@/components/MathContent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeVN } from "@/lib/format";
import type { ReplyItem, ThreadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const MathEditor = dynamic(
  () => import("@/components/MathEditor").then((m) => m.MathEditor),
  {
    loading: () => <Skeleton className="h-32 w-full rounded-lg" />,
  }
);

function isEdited(createdAt: string, updatedAt?: string): boolean {
  if (!updatedAt) return false;
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 5000;
}

export interface ThreadReplyCardProps {
  threadId: string;
  reply: ReplyItem;
  isNested?: boolean;
  threadAuthorId: string;
  viewerId: string | null;
  isAdmin: boolean;
  bountyPoints: number;
  status: ThreadStatus;
  isArticleThread: boolean;
  isChallengeThread: boolean;
  canChooseAccepted: boolean;
  canAwardChallenge: boolean;
  isUpvoting: boolean;
  isAccepting: boolean;
  isAwardingChallenge: boolean;
  onRefresh: () => void;
  onUpvote: (replyId: string) => void;
  onRequestAccept: (reply: ReplyItem) => void;
  onRequestAwardChallenge: (reply: ReplyItem) => void;
  onReplyTo: (reply: ReplyItem) => void;
  onQuote: (reply: ReplyItem) => void;
  onFeedback: (
    feedback: { type: "success" | "error"; text: string } | null
  ) => void;
}

export const ThreadReplyCard = memo(function ThreadReplyCard({
  threadId,
  reply: r,
  isNested = false,
  threadAuthorId,
  viewerId,
  isAdmin,
  bountyPoints,
  status,
  isArticleThread,
  isChallengeThread,
  canChooseAccepted,
  canAwardChallenge,
  isUpvoting,
  isAccepting,
  isAwardingChallenge,
  onRefresh,
  onUpvote,
  onRequestAccept,
  onRequestAwardChallenge,
  onReplyTo,
  onQuote,
  onFeedback,
}: ThreadReplyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [guestHint, setGuestHint] = useState(false);

  const isSelfReply = r.author.id === threadAuthorId;
  const isOptimistic = r.id.startsWith("optimistic-");
  const isOwner = viewerId === r.author.id;
  const canMutateReply =
    !isOptimistic &&
    !r.isAccepted &&
    ((isOwner && status !== "closed") || isAdmin);
  const canReplyOrQuote = !isOptimistic && Boolean(viewerId) && status !== "closed";

  function startEdit() {
    setEditContent(r.content);
    setEditImages(r.imageUrls);
    setIsEditing(true);
    onFeedback(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (isUploadingEdit) return;
    setIsBusy(true);
    try {
      const res = await updateReplyAction({
        replyId: r.id,
        content: editContent,
        imageUrls: editImages,
      });
      if (!res.ok) {
        onFeedback({
          type: "error",
          text: res.error || "Không thể lưu chỉnh sửa bình luận.",
        });
        return;
      }
      setIsEditing(false);
      onFeedback({ type: "success", text: "Đã cập nhật bình luận!" });
      onRefresh();
    } catch {
      onFeedback({
        type: "error",
        text: "Không thể kết nối máy chủ khi lưu chỉnh sửa.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteReply() {
    setIsBusy(true);
    try {
      const res = await deleteOwnReplyAction(r.id);
      if (!res.ok) {
        onFeedback({
          type: "error",
          text: res.error || "Không thể xóa bình luận.",
        });
        return;
      }
      setConfirmDeleteOpen(false);
      onFeedback({ type: "success", text: "Đã xóa bình luận." });
      onRefresh();
    } catch {
      onFeedback({
        type: "error",
        text: "Không thể kết nối máy chủ khi xóa bình luận.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <Card
        className={cn(
          isNested ? "bg-muted/25 p-4 sm:p-5" : "p-5 sm:p-6",
          r.isAccepted && "border-2 border-success bg-success-surface/50",
          isOptimistic && "opacity-80"
        )}
      >
        <div className="space-y-3.5">
          {r.isAccepted && (
            <div>
              <Badge variant="successSolid">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isChallengeThread
                  ? `Bài nộp Thử thách đạt đúng (+${bountyPoints} điểm)`
                  : `Lời giải đúng được chọn (+${bountyPoints} điểm)`}
              </Badge>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Avatar className={isNested ? "h-5 w-5" : "h-6 w-6"}>
                <AvatarImage
                  src={r.author.avatarUrl ?? undefined}
                  alt={r.author.displayName}
                />
                <AvatarFallback className="text-[11px]">
                  {r.author.displayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Link
                href={`/members/${r.author.id}`}
                prefetch={false}
                className="text-xs font-semibold text-foreground hover:text-primary"
              >
                {r.author.displayName}
                {r.author.nickname ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({r.author.nickname})
                  </span>
                ) : null}
              </Link>
              <Badge variant="outline">{r.author.gradeLevel}</Badge>
              <span className="text-xs font-bold tabular-nums text-success">
                • {r.author.solvedCount} bài đã giải
              </span>
              {isSelfReply && (
                <Badge variant="subtle">
                  {isArticleThread
                    ? "Tác giả bài viết"
                    : isChallengeThread
                      ? "Ban Tổ Chức"
                      : "Tác giả đề bài"}
                </Badge>
              )}
            </div>

            <span className="text-xs text-muted-foreground">
              {isOptimistic ? "Đang gửi..." : formatDateTimeVN(r.createdAt)}
              {!isOptimistic && isEdited(r.createdAt, r.updatedAt) && (
                <span className="ml-1 italic">(đã chỉnh sửa)</span>
              )}
            </span>
          </div>

          <Separator />

          {isEditing ? (
            <form
              onSubmit={(e) => void handleSaveEdit(e)}
              className="space-y-3"
            >
              <MathEditor
                value={editContent}
                onChange={setEditContent}
                imageUrls={editImages}
                onChangeImages={setEditImages}
                onUploadingChange={setIsUploadingEdit}
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isBusy || isUploadingEdit}
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Lưu
                </Button>
              </div>
            </form>
          ) : (
            <MathContent content={r.content} imageUrls={r.imageUrls} />
          )}

          {!isOptimistic && !isEditing && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Button
                    size="sm"
                    variant={r.viewerHasUpvoted ? "default" : "outline"}
                    disabled={isUpvoting}
                    aria-pressed={r.viewerHasUpvoted}
                    onClick={() => {
                      if (!viewerId) {
                        setGuestHint(true);
                        return;
                      }
                      onUpvote(r.id);
                    }}
                  >
                    <ThumbsUp className="size-3.5" aria-hidden="true" />
                    {isArticleThread ? "Hữu ích" : "Lời giải hay"} (
                    {r.upvotesCount})
                  </Button>

                  {canReplyOrQuote && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onReplyTo(r)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <CornerDownRight className="h-3.5 w-3.5" />
                        Trả lời
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onQuote(r)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Quote className="h-3.5 w-3.5" />
                        Trích dẫn
                      </Button>
                    </>
                  )}

                  {canMutateReply && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={startEdit}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </Button>
                    </>
                  )}
                </div>

                {canChooseAccepted && !isSelfReply && !isNested && (
                  <Button
                    size="sm"
                    variant="success"
                    disabled={isAccepting}
                    onClick={() => onRequestAccept(r)}
                  >
                    {isAccepting ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Award className="size-4" aria-hidden="true" />
                    )}
                    Chọn làm lời giải đúng (+{bountyPoints} điểm)
                  </Button>
                )}

                {canAwardChallenge && !r.isAccepted && !isSelfReply && !isNested && (
                  <Button
                    size="sm"
                    variant="bounty"
                    disabled={isAwardingChallenge}
                    onClick={() => onRequestAwardChallenge(r)}
                  >
                    {isAwardingChallenge ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Flame className="h-3.5 w-3.5" />
                    )}
                    Chấm đúng Thử thách (+{bountyPoints}đ)
                  </Button>
                )}

                {canChooseAccepted && isSelfReply && !isNested && (
                  <span className="text-xs italic text-muted-foreground">
                    (Không thể tự chọn lời giải của chính người đăng đề để cộng
                    điểm)
                  </span>
                )}
              </div>

              {guestHint && !viewerId && (
                <p className="text-xs text-muted-foreground">
                  Vui lòng{" "}
                  <Link
                    href={`/login?next=${encodeURIComponent(`/threads/${threadId}`)}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    đăng nhập
                  </Link>{" "}
                  để bấm cảm ơn lời giải này.
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xóa bình luận này?"
        description="Bình luận cùng các trả lời con và ảnh đính kèm (nếu có) sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa bình luận"
        confirmVariant="destructive"
        isLoading={isBusy}
        onConfirm={handleDeleteReply}
      />
    </>
  );
});
