"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  FlaskConical,
  Gift,
  Loader2,
  Newspaper,
  Pencil,
  Pin,
  Send,
  Trash2,
} from "lucide-react";
import { deleteOwnThreadAction } from "@/app/actions/forum";
import { ThreadAdminBar } from "@/app/threads/[id]/_components/ThreadAdminBar";
import { ThreadEditForm } from "@/app/threads/[id]/_components/ThreadEditForm";
import { ThreadReplyList } from "@/app/threads/[id]/_components/ThreadReplyList";
import { MathContent } from "@/components/MathContent";
import { MathEditor } from "@/components/MathEditor";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAppSession } from "@/hooks/useAppSession";
import { useThreadDiscussion } from "@/hooks/useThreadDiscussion";
import type { ThreadDetail, UserProfile } from "@/lib/types";

export function ThreadInteractive({
  thread,
  viewer,
}: {
  thread: ThreadDetail;
  viewer: UserProfile | null;
}) {
  const router = useRouter();
  const { refreshSession } = useAppSession();
  const [replyContent, setReplyContent] = useState("");
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [deletingThread, setDeletingThread] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    discussion,
    isFetching,
    realtimeState,
    onlineCount,
    liveToast,
    broadcastUpdate,
    invalidateDiscussion,
    postReplyMutation,
    toggleUpvoteMutation,
    acceptReplyMutation,
  } = useThreadDiscussion({
    threadId: thread.id,
    initialSnapshot: {
      status: thread.status,
      threadType: thread.threadType,
      acceptedReplyId: thread.acceptedReplyId,
      bountyPoints: thread.bountyPoints,
      authorRewardPoints: thread.authorRewardPoints,
      isPinned: thread.isPinned,
      replyCount: thread.replyCount,
      replies: thread.replies,
    },
    viewer,
  });

  const isThreadOwner = viewer?.id === thread.author.id;
  const isAdmin = viewer?.role === "admin";
  const isArticleThread =
    discussion.threadType === "news" || discussion.threadType === "research";
  const canEditThread =
    (isThreadOwner && discussion.status !== "closed") || isAdmin;
  const canDeleteOwnThread =
    isThreadOwner &&
    !isAdmin &&
    discussion.status === "open" &&
    discussion.acceptedReplyId === null;
  const canChooseAccepted =
    !isArticleThread &&
    discussion.status === "open" &&
    discussion.acceptedReplyId === null &&
    (isThreadOwner || isAdmin);
  const isThreadEdited = Boolean(
    thread.updatedAt &&
    new Date(thread.updatedAt).getTime() -
    new Date(thread.createdAt).getTime() >
    5000
  );

  async function handleAccept(replyId: string) {
    setFeedback(null);
    try {
      const res = await acceptReplyMutation.mutateAsync(replyId);
      setFeedback({
        type: "success",
        text: res.message || "Đã cộng điểm cho lời giải đúng!",
      });
      await refreshSession();
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Không thể xác nhận lời giải đúng.",
      });
    }
  }

  async function handleUpvote(replyId: string) {
    if (!viewer) {
      setFeedback({
        type: "error",
        text: "Vui lòng đăng nhập để bấm cảm ơn lời giải.",
      });
      return;
    }
    try {
      await toggleUpvoteMutation.mutateAsync(replyId);
    } catch (err) {
      setFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Không thể cập nhật lượt cảm ơn.",
      });
    }
  }

  async function handlePostReply(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await postReplyMutation.mutateAsync({
        content: replyContent,
        imageUrls: replyImages,
      });
      setReplyContent("");
      setReplyImages([]);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Không thể gửi lời giải.",
      });
    }
  }

  async function handleDeleteOwnThread() {
    if (!window.confirm("Bạn chắc chắn muốn xóa vĩnh viễn bài viết này?")) {
      return;
    }
    setDeletingThread(true);
    const res = await deleteOwnThreadAction(thread.id);
    setDeletingThread(false);
    if (!res.ok) {
      setFeedback({
        type: "error",
        text: res.error || "Không thể xóa bài viết.",
      });
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleModerated(refreshSessionAlso = false) {
    await broadcastUpdate("moderated");
    await invalidateDiscussion();
    if (refreshSessionAlso) {
      await refreshSession();
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {discussion.isPinned && (
                <Badge variant="destructive">
                  <Pin className="h-3 w-3" />
                  Đã ghim
                </Badge>
              )}
              {discussion.threadType === "news" && (
                <Badge variant="default">
                  <Newspaper className="h-3 w-3" />
                  News
                </Badge>
              )}
              {discussion.threadType === "research" && (
                <Badge variant="default">
                  <FlaskConical className="h-3 w-3" />
                  Research
                </Badge>
              )}
              <Badge variant="subtle">{thread.category.name}</Badge>
              <Badge variant="outline">{thread.gradeTag}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {discussion.authorRewardPoints > 0 && (
                <Badge variant="bounty">
                  <Gift className="h-3.5 w-3.5 text-bounty" />
                  Admin thưởng tác giả +{discussion.authorRewardPoints}đ
                </Badge>
              )}
              {discussion.status === "closed" ? (
                <Badge variant="secondary">Chủ đề đã đóng</Badge>
              ) : isArticleThread ? null : discussion.status === "solved" ? (
                <Badge variant="successSolid">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã giải quyết (+{discussion.bountyPoints} điểm đã trao)
                </Badge>
              ) : (
                <Badge variant="bounty">
                  <Award className="h-3.5 w-3.5 text-bounty" />
                  Treo thưởng +{discussion.bountyPoints} điểm
                </Badge>
              )}
            </div>
          </div>

          {isEditingThread ? (
            <ThreadEditForm
              threadId={thread.id}
              initialTitle={thread.title}
              initialGradeTag={thread.gradeTag}
              initialContent={thread.content}
              initialImageUrls={thread.imageUrls}
              onSaved={async () => {
                setIsEditingThread(false);
                setFeedback({
                  type: "success",
                  text: "Đã lưu chỉnh sửa bài viết!",
                });
                router.refresh();
              }}
              onCancel={() => setIsEditingThread(false)}
              onError={(msg) => setFeedback({ type: "error", text: msg })}
            />
          ) : (
            <>
              <h1 className="heading-1">{thread.title}</h1>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={thread.author.avatarUrl ?? undefined}
                      alt={thread.author.displayName}
                    />
                    <AvatarFallback className="text-[11px]">
                      {thread.author.displayName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/members/${thread.author.id}`}
                    prefetch={true}
                    className="text-xs font-semibold text-foreground hover:text-primary"
                  >
                    {thread.author.displayName}
                    {thread.author.nickname ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        ({thread.author.nickname})
                      </span>
                    ) : null}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    ({thread.author.gradeLevel}) •{" "}
                    {new Date(thread.createdAt).toLocaleString("vi-VN")}
                    {isThreadEdited && (
                      <span className="ml-1 italic">(đã chỉnh sửa)</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {thread.viewCount} lượt xem
                  </span>
                  {canEditThread && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFeedback(null);
                        setIsEditingThread(true);
                      }}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa bài
                    </Button>
                  )}
                  {canDeleteOwnThread && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={deletingThread}
                      onClick={() => void handleDeleteOwnThread()}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa bài
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <MathContent
                content={thread.content}
                imageUrls={thread.imageUrls}
              />
            </>
          )}
        </div>
      </Card>

      {isAdmin && (
        <ThreadAdminBar
          threadId={thread.id}
          authorDisplayName={thread.author.displayName}
          status={discussion.status}
          threadType={discussion.threadType}
          isPinned={discussion.isPinned}
          bountyPoints={discussion.bountyPoints}
          isArticleThread={isArticleThread}
          onModerated={handleModerated}
          onFeedback={setFeedback}
        />
      )}

      {liveToast && <Alert variant="info">⚡ {liveToast}</Alert>}
      {feedback && (
        <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
          {feedback.text}
        </Alert>
      )}

      <ThreadReplyList
        replies={discussion.replies}
        threadAuthorId={thread.author.id}
        viewerId={viewer?.id ?? null}
        isAdmin={isAdmin}
        bountyPoints={discussion.bountyPoints}
        status={discussion.status}
        isArticleThread={isArticleThread}
        isThreadOwner={isThreadOwner}
        canChooseAccepted={canChooseAccepted}
        realtimeState={realtimeState}
        onlineCount={onlineCount}
        isFetching={isFetching}
        isUpvoting={toggleUpvoteMutation.isPending}
        isAccepting={acceptReplyMutation.isPending}
        onRefresh={() => void invalidateDiscussion()}
        onUpvote={(id) => void handleUpvote(id)}
        onAccept={(id) => void handleAccept(id)}
        onFeedback={setFeedback}
      />

      <Card className="p-5 sm:p-7">
        <div className="space-y-4">
          <h3 className="heading-3">
            {isArticleThread
              ? "Bình luận & trao đổi về bài viết"
              : "Gửi lời giải hoặc trao đổi thêm"}
          </h3>

          {discussion.status === "closed" ? (
            <p className="text-sm text-muted-foreground">
              Chủ đề này đã đóng thảo luận.
            </p>
          ) : !viewer ? (
            <Alert
              variant="info"
              className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
            >
              <p className="text-sm">
                {isArticleThread ? (
                  "Hãy đăng nhập để tham gia thảo luận về bài viết này."
                ) : (
                  <>
                    Hãy đăng nhập để gửi lời giải và nhận{" "}
                    <strong className="text-bounty">
                      +{discussion.bountyPoints} điểm
                    </strong>{" "}
                    nếu được chọn!
                  </>
                )}
              </p>
              <Button asChild size="sm">
                <Link href="/login">Đăng nhập</Link>
              </Button>
            </Alert>
          ) : (
            <form onSubmit={handlePostReply} className="space-y-4">
              <MathEditor
                value={replyContent}
                onChange={setReplyContent}
                imageUrls={replyImages}
                onChangeImages={setReplyImages}
                rows={5}
                placeholder={
                  isArticleThread
                    ? "Nhập bình luận hoặc trao đổi thêm về bài viết (hỗ trợ LaTeX & dán ảnh Ctrl+V)..."
                    : "Nhập lời giải hoặc trao đổi... Tin nhắn mới sẽ tự động hiển thị trực tuyến lên màn hình các bạn đang xem bài này!"
                }
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={postReplyMutation.isPending}>
                  {postReplyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isArticleThread ? "Gửi bình luận" : "Gửi lời giải"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
