"use client";

import { memo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Radio,
  RefreshCw,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { deleteOwnReplyAction, updateReplyAction } from "@/app/actions/forum";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MathContent } from "@/components/MathContent";
import { MathEditor } from "@/components/MathEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { RealtimeConnectionState } from "@/hooks/useThreadDiscussion";
import { formatDateTimeVN } from "@/lib/format";
import type { ReplyItem, ThreadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThreadReplyListProps {
  threadId: string;
  replies: ReplyItem[];
  threadAuthorId: string;
  viewerId: string | null;
  isAdmin: boolean;
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
  onAccept: (replyId: string) => Promise<void> | void;
  onFeedback: (
    feedback: { type: "success" | "error"; text: string } | null
  ) => void;
}

function isEdited(createdAt: string, updatedAt?: string): boolean {
  if (!updatedAt) return false;
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 5000;
}

interface ThreadReplyCardProps {
  threadId: string;
  reply: ReplyItem;
  threadAuthorId: string;
  viewerId: string | null;
  isAdmin: boolean;
  bountyPoints: number;
  status: ThreadStatus;
  isArticleThread: boolean;
  canChooseAccepted: boolean;
  isUpvoting: boolean;
  isAccepting: boolean;
  onRefresh: () => void;
  onUpvote: (replyId: string) => void;
  onRequestAccept: (reply: ReplyItem) => void;
  onFeedback: (
    feedback: { type: "success" | "error"; text: string } | null
  ) => void;
}

const ThreadReplyCard = memo(function ThreadReplyCard({
  threadId,
  reply: r,
  threadAuthorId,
  viewerId,
  isAdmin,
  bountyPoints,
  status,
  isArticleThread,
  canChooseAccepted,
  isUpvoting,
  isAccepting,
  onRefresh,
  onUpvote,
  onRequestAccept,
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
          "p-5 sm:p-6",
          r.isAccepted && "border-2 border-success bg-success-surface/50",
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
                  {isArticleThread ? "Tác giả bài viết" : "Tác giả đề bài"}
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={r.viewerHasUpvoted ? "default" : "outline"}
                    disabled={isUpvoting}
                    onClick={() => {
                      if (!viewerId) {
                        setGuestHint(true);
                        return;
                      }
                      onUpvote(r.id);
                    }}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {isArticleThread ? "Hữu ích" : "Lời giải hay"} (
                    {r.upvotesCount})
                  </Button>

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

                {canChooseAccepted && !isSelfReply && (
                  <Button
                    size="sm"
                    variant="success"
                    disabled={isAccepting}
                    onClick={() => onRequestAccept(r)}
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
        description="Bình luận cùng ảnh đính kèm (nếu có) sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa bình luận"
        confirmVariant="destructive"
        isLoading={isBusy}
        onConfirm={handleDeleteReply}
      />
    </>
  );
});

export function ThreadReplyList({
  threadId,
  replies,
  threadAuthorId,
  viewerId,
  isAdmin,
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
  onFeedback,
}: ThreadReplyListProps) {
  const [acceptTarget, setAcceptTarget] = useState<ReplyItem | null>(null);

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
          {replies.map((r) => (
            <ThreadReplyCard
              key={r.id}
              threadId={threadId}
              reply={r}
              threadAuthorId={threadAuthorId}
              viewerId={viewerId}
              isAdmin={isAdmin}
              bountyPoints={bountyPoints}
              status={status}
              isArticleThread={isArticleThread}
              canChooseAccepted={canChooseAccepted}
              isUpvoting={isUpvoting}
              isAccepting={isAccepting}
              onRefresh={onRefresh}
              onUpvote={onUpvote}
              onRequestAccept={setAcceptTarget}
              onFeedback={onFeedback}
            />
          ))}
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
    </div>
  );
}
