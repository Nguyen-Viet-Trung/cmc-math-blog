"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Bookmark,
  CheckCircle2,
  Clock,
  Flag,
  Flame,
  FlaskConical,
  Gift,
  Layers,
  Newspaper,
  Pencil,
  Pin,
  Trash2,
  Zap,
} from "lucide-react";
import { toggleBookmarkAction } from "@/app/actions/collections";
import { deleteOwnThreadAction } from "@/app/actions/forum";
import { ThreadReplyComposer } from "@/app/threads/[id]/_components/ThreadReplyComposer";
import { ThreadReplyList } from "@/app/threads/[id]/_components/ThreadReplyList";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MathContent } from "@/components/MathContent";
import type { ReportTarget } from "@/components/ReportContentModal";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useRefreshAppSession } from "@/hooks/useAppSession";
import { useThreadDiscussion } from "@/hooks/useThreadDiscussion";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { formatDateTimeVN, formatRemainingTime } from "@/lib/format";
import { isChallengeBlindActive } from "@/lib/rules";
import type { ReplyItem, ThreadDetail, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const ThreadAdminBar = dynamic(
  () =>
    import("@/app/threads/[id]/_components/ThreadAdminBar").then(
      (m) => m.ThreadAdminBar
    ),
  { ssr: false }
);

const ThreadEditForm = dynamic(
  () =>
    import("@/app/threads/[id]/_components/ThreadEditForm").then(
      (m) => m.ThreadEditForm
    ),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-lg" />,
  }
);

const ReportContentModal = dynamic(
  () =>
    import("@/components/ReportContentModal").then(
      (m) => m.ReportContentModal
    ),
  { ssr: false }
);

export function ThreadInteractive({
  thread,
  viewer,
}: {
  thread: ThreadDetail;
  viewer: UserProfile | null;
}) {
  const router = useRouter();
  const refreshSession = useRefreshAppSession();
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingThread, setDeletingThread] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [bookmarked, setBookmarked] = useState(thread.viewerBookmarked);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyItem | null>(null);
  const [quoteSnippet, setQuoteSnippet] = useState<{
    text: string;
    seq: number;
  } | null>(null);
  const [clientNowMs, setClientNowMs] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setClientNowMs(Date.now());
  }, []);

  const viewTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (viewTrackedRef.current === thread.id) return;
    viewTrackedRef.current = thread.id;
    void fetch(`/api/threads/${thread.id}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, [thread.id]);

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
    awardChallengeMutation,
  } = useThreadDiscussion({
    threadId: thread.id,
    initialSnapshot: {
      status: thread.status,
      threadType: thread.threadType,
      challengeEndsAt: thread.challengeEndsAt,
      acceptedReplyId: thread.acceptedReplyId,
      bountyPoints: thread.bountyPoints,
      authorRewardPoints: thread.authorRewardPoints,
      isPinned: thread.isPinned,
      replyCount: thread.replyCount,
      hiddenRepliesCount: thread.hiddenRepliesCount,
      replies: thread.replies,
    },
    viewer,
  });

  const isThreadOwner = viewer?.id === thread.author.id;
  const isAdmin = viewer?.role === "admin";
  const isArticleThread =
    discussion.threadType === "news" || discussion.threadType === "research";
  const isChallengeThread = discussion.threadType === "challenge";
  const isBlindChallenge = isChallengeBlindActive(
    discussion.threadType,
    discussion.status,
    discussion.challengeEndsAt
  );
  const canEditThread =
    (isThreadOwner && discussion.status !== "closed") || isAdmin;
  const canDeleteOwnThread =
    isThreadOwner &&
    !isAdmin &&
    discussion.status === "open" &&
    discussion.acceptedReplyId === null;
  const canChooseAccepted =
    !isArticleThread &&
    !isChallengeThread &&
    discussion.status === "open" &&
    discussion.acceptedReplyId === null &&
    (isThreadOwner || isAdmin);
  const canAwardChallenge = isChallengeThread && isAdmin;
  const isThreadEdited = Boolean(
    thread.updatedAt &&
      new Date(thread.updatedAt).getTime() -
        new Date(thread.createdAt).getTime() >
        5000
  );

  const handleToggleBookmark = useCallback(async () => {
    if (!viewer) {
      setFeedback({
        type: "error",
        text: "Vui lòng đăng nhập để lưu bài toán vào Sổ tay cá nhân.",
      });
      return;
    }
    if (bookmarkBusy) return;
    const prev = bookmarked;
    setBookmarked(!prev);
    setBookmarkBusy(true);
    try {
      const res = await toggleBookmarkAction(thread.id);
      if (!res.ok) {
        setBookmarked(prev);
        setFeedback({
          type: "error",
          text: res.error || "Không thể cập nhật sổ tay.",
        });
        return;
      }
      setBookmarked(Boolean(res.bookmarked));
    } catch {
      setBookmarked(prev);
      setFeedback({
        type: "error",
        text: "Lỗi mạng khi cập nhật sổ tay.",
      });
    } finally {
      setBookmarkBusy(false);
    }
  }, [viewer, bookmarkBusy, bookmarked, thread.id]);

  const acceptMutateAsync = acceptReplyMutation.mutateAsync;
  const awardChallengeMutateAsync = awardChallengeMutation.mutateAsync;
  const toggleUpvoteMutateAsync = toggleUpvoteMutation.mutateAsync;
  const postReplyMutateAsync = postReplyMutation.mutateAsync;

  const handleAccept = useCallback(
    async (replyId: string) => {
      setFeedback(null);
      try {
        const res = await acceptMutateAsync(replyId);
        setFeedback({
          type: "success",
          text: res.message || "Đã cộng điểm cho lời giải đúng!",
        });
        await refreshSession();
      } catch (err) {
        setFeedback({
          type: "error",
          text:
            err instanceof Error
              ? err.message
              : "Không thể xác nhận lời giải đúng.",
        });
      }
    },
    [acceptMutateAsync, refreshSession]
  );

  const handleAwardChallenge = useCallback(
    async (replyId: string) => {
      setFeedback(null);
      try {
        const res = await awardChallengeMutateAsync(replyId);
        setFeedback({
          type: "success",
          text: res.message || "Đã chấm đúng và trao điểm Thử thách Tuần!",
        });
        await refreshSession();
      } catch (err) {
        setFeedback({
          type: "error",
          text:
            err instanceof Error
              ? err.message
              : "Không thể chấm thưởng bài nộp thử thách.",
        });
      }
    },
    [awardChallengeMutateAsync, refreshSession]
  );

  const handleUpvote = useCallback(
    async (replyId: string) => {
      if (!viewer) {
        setFeedback({
          type: "error",
          text: "Vui lòng đăng nhập để bấm cảm ơn lời giải.",
        });
        return;
      }
      try {
        await toggleUpvoteMutateAsync(replyId);
      } catch (err) {
        setFeedback({
          type: "error",
          text:
            err instanceof Error
              ? err.message
              : "Không thể cập nhật lượt cảm ơn.",
        });
      }
    },
    [viewer, toggleUpvoteMutateAsync]
  );

  const handlePostReply = useCallback(
    async (input: {
      content: string;
      imageUrls: string[];
      parentReplyId?: string | null;
    }) => {
      setFeedback(null);
      await postReplyMutateAsync(input);
    },
    [postReplyMutateAsync]
  );

  const handleReplyTo = useCallback((reply: ReplyItem) => {
    setReplyTarget(reply);
  }, []);

  const handleQuote = useCallback((reply: ReplyItem) => {
    const excerpt = reply.content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .slice(0, 3)
      .map((line) => `> ${line}`)
      .join("\n");
    const quoted = `> **${reply.author.displayName}** viết:\n${excerpt}`;
    setQuoteSnippet((prev) => ({ text: quoted, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  async function handleDeleteOwnThread() {
    setDeletingThread(true);
    try {
      const res = await deleteOwnThreadAction(thread.id);
      if (!res.ok) {
        setConfirmDeleteOpen(false);
        setFeedback({
          type: "error",
          text: res.error || "Không thể xóa bài viết.",
        });
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setConfirmDeleteOpen(false);
      setFeedback({
        type: "error",
        text: "Không thể kết nối máy chủ khi xóa bài viết.",
      });
    } finally {
      setDeletingThread(false);
    }
  }

  async function handleModerated(refreshSessionAlso = false) {
    await broadcastUpdate("moderated");
    await invalidateDiscussion();
    if (refreshSessionAlso) {
      await refreshSession();
    }
    router.refresh();
  }

  const handleRequestReportReply = useCallback((reply: ReplyItem) => {
    setReportTarget({
      targetType: "reply",
      targetId: reply.id,
      targetTitle: `Bình luận của ${reply.author.displayName}`,
    });
  }, []);

  const handleRefresh = useCallback(() => {
    void invalidateDiscussion();
  }, [invalidateDiscussion]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5 sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {discussion.isPinned && (
                <Badge variant="destructive">
                  <Pin className="h-3 w-3" />
                  Đã ghim
                </Badge>
              )}
              {isChallengeThread && (
                <Badge variant="bounty">
                  <Flame className="h-3 w-3 text-bounty" />
                  Thử thách Tuần
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
              {isChallengeThread && discussion.challengeEndsAt && (
                <Badge variant={isBlindChallenge ? "bounty" : "outline"}>
                  <Clock className="h-3 w-3" />
                  {isBlindChallenge
                    ? clientNowMs !== null
                      ? formatRemainingTime(
                          discussion.challengeEndsAt,
                          clientNowMs
                        )
                      : `Hạn nộp: ${formatDateTimeVN(discussion.challengeEndsAt)}`
                    : `Đã công bố (${formatDateTimeVN(discussion.challengeEndsAt)})`}
                </Badge>
              )}
              {discussion.status === "closed" ? (
                <Badge variant="secondary">Chủ đề đã đóng</Badge>
              ) : isChallengeThread ? (
                <Badge variant="bounty">
                  <Award className="h-3.5 w-3.5 text-bounty" />
                  +{discussion.bountyPoints}đ / mỗi lời giải đúng
                </Badge>
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

          {thread.collections.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Layers className="h-3.5 w-3.5" />
                Thuộc chuyên đề:
              </span>
              {thread.collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  prefetch={false}
                  className="rounded border border-primary/25 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  {col.title}
                </Link>
              ))}
            </div>
          )}

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
                    prefetch={false}
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
                    {formatDateTimeVN(thread.createdAt)}
                    {isThreadEdited && (
                      <span className="ml-1 italic">(đã chỉnh sửa)</span>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {thread.viewCount} lượt xem
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={bookmarked ? "secondary" : "ghost"}
                    disabled={bookmarkBusy}
                    aria-pressed={bookmarked}
                    onClick={() => void handleToggleBookmark()}
                    className={cn(
                      "h-7 px-2 text-xs",
                      bookmarked
                        ? "font-semibold text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={bookmarked ? "Bỏ khỏi Sổ tay" : "Lưu vào Sổ tay"}
                  >
                    <Bookmark
                      aria-hidden="true"
                      className={cn("size-3.5", bookmarked && "fill-current")}
                    />
                    {bookmarked ? "Đã lưu" : "Lưu sổ tay"}
                  </Button>
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
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa bài
                    </Button>
                  )}
                  {FEATURE_FLAGS.communitySafety && viewer && !isThreadOwner && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setReportTarget({
                          targetType: "thread",
                          targetId: thread.id,
                          targetTitle: thread.title,
                        })
                      }
                      aria-label={`Báo cáo bài viết ${thread.title}`}
                      title="Báo cáo bài viết vi phạm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Báo cáo</span>
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
          challengeEndsAt={discussion.challengeEndsAt}
          isPinned={discussion.isPinned}
          bountyPoints={discussion.bountyPoints}
          isArticleThread={isArticleThread}
          onModerated={handleModerated}
          onFeedback={setFeedback}
        />
      )}

      <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
        {liveToast && (
          <Alert variant="info" className="flex items-center gap-2">
            <Zap className="size-4 shrink-0" aria-hidden="true" />
            <span>{liveToast}</span>
          </Alert>
        )}
        {feedback && (
          <Alert variant={feedback.type === "success" ? "success" : "destructive"}>
            {feedback.text}
          </Alert>
        )}
      </div>

      <ThreadReplyList
        threadId={thread.id}
        replies={discussion.replies}
        hiddenRepliesCount={discussion.hiddenRepliesCount}
        challengeEndsAt={discussion.challengeEndsAt}
        isBlindChallenge={isBlindChallenge}
        threadAuthorId={thread.author.id}
        viewerId={viewer?.id ?? null}
        isAdmin={isAdmin}
        bountyPoints={discussion.bountyPoints}
        status={discussion.status}
        isArticleThread={isArticleThread}
        isChallengeThread={isChallengeThread}
        isThreadOwner={isThreadOwner}
        canChooseAccepted={canChooseAccepted}
        canAwardChallenge={canAwardChallenge}
        realtimeState={realtimeState}
        onlineCount={onlineCount}
        isFetching={isFetching}
        isUpvoting={toggleUpvoteMutation.isPending}
        isAccepting={acceptReplyMutation.isPending}
        isAwardingChallenge={awardChallengeMutation.isPending}
        onRefresh={handleRefresh}
        onUpvote={handleUpvote}
        onAccept={handleAccept}
        onAwardChallenge={handleAwardChallenge}
        onReplyTo={handleReplyTo}
        onQuote={handleQuote}
        onRequestReport={handleRequestReportReply}
        onFeedback={setFeedback}
      />

      <ThreadReplyComposer
        threadId={thread.id}
        status={discussion.status}
        viewer={viewer}
        isArticleThread={isArticleThread}
        isChallengeThread={isChallengeThread}
        isBlindChallenge={isBlindChallenge}
        bountyPoints={discussion.bountyPoints}
        replyTarget={replyTarget}
        quoteSnippet={quoteSnippet}
        isSubmitting={postReplyMutation.isPending}
        onClearReplyTarget={() => setReplyTarget(null)}
        onSubmit={handlePostReply}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xóa bài viết vĩnh viễn?"
        description="Bài viết cùng toàn bộ hình ảnh đính kèm sẽ bị xóa và không thể khôi phục."
        confirmLabel="Xóa bài viết"
        confirmVariant="destructive"
        isLoading={deletingThread}
        onConfirm={handleDeleteOwnThread}
      />

      {reportTarget && (
        <ReportContentModal
          open={Boolean(reportTarget)}
          target={reportTarget}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setReportTarget(null);
          }}
        />
      )}
    </div>
  );
}
