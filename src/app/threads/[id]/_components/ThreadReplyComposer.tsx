"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CornerDownRight, Loader2, Send, X } from "lucide-react";
import { MathEditor } from "@/components/MathEditor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ReplyItem, ThreadStatus, UserProfile } from "@/lib/types";

interface ThreadReplyComposerProps {
  threadId: string;
  status: ThreadStatus;
  viewer: UserProfile | null;
  isArticleThread: boolean;
  isChallengeThread: boolean;
  isBlindChallenge: boolean;
  bountyPoints: number;
  replyTarget: ReplyItem | null;
  quoteSnippet: { text: string; seq: number } | null;
  isSubmitting: boolean;
  onClearReplyTarget: () => void;
  onSubmit: (input: {
    content: string;
    imageUrls: string[];
    parentReplyId?: string | null;
  }) => Promise<void>;
}

export function ThreadReplyComposer({
  threadId,
  status,
  viewer,
  isArticleThread,
  isChallengeThread,
  isBlindChallenge,
  bountyPoints,
  replyTarget,
  quoteSnippet,
  isSubmitting,
  onClearReplyTarget,
  onSubmit,
}: ThreadReplyComposerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!replyTarget) return;
    const mentionTag = `@[${replyTarget.author.displayName}] `;
    setContent((prev) =>
      prev.includes(mentionTag) ? prev : `${mentionTag}${prev}`
    );
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [replyTarget]);

  useEffect(() => {
    if (!quoteSnippet) return;
    setContent((prev) =>
      prev.trim()
        ? `${prev.trimEnd()}\n\n${quoteSnippet.text}\n\n`
        : `${quoteSnippet.text}\n\n`
    );
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [quoteSnippet]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isUploading) return;
    setError(null);
    try {
      await onSubmit({
        content,
        imageUrls,
        parentReplyId: replyTarget?.parentReplyId ?? replyTarget?.id ?? null,
      });
      setContent("");
      setImageUrls([]);
      onClearReplyTarget();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể gửi lời giải."
      );
    }
  }

  return (
    <div ref={containerRef}>
      <Card className="p-5 sm:p-7">
        <div className="space-y-4">
          <h3 className="heading-3">
            {isChallengeThread
              ? isBlindChallenge
                ? "Nộp bài giải Thử thách Tuần (chế độ ẩn)"
                : "Thảo luận & chia sẻ lời giải Thử thách"
              : isArticleThread
                ? "Bình luận & trao đổi về bài viết"
                : "Gửi lời giải hoặc trao đổi thêm"}
          </h3>

          {status === "closed" ? (
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
                    <strong className="text-bounty">+{bountyPoints} điểm</strong>{" "}
                    nếu được chọn!
                  </>
                )}
              </p>
              <Button asChild size="sm">
                <Link
                  href={`/login?next=${encodeURIComponent(`/threads/${threadId}`)}`}
                >
                  Đăng nhập
                </Link>
              </Button>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {replyTarget && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground">
                    <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">
                      Đang trả lời bình luận của{" "}
                      <strong>{replyTarget.author.displayName}</strong>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={onClearReplyTarget}
                    className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    Hủy
                  </button>
                </div>
              )}

              <MathEditor
                value={content}
                onChange={setContent}
                imageUrls={imageUrls}
                onChangeImages={setImageUrls}
                onUploadingChange={setIsUploading}
                rows={5}
                placeholder={
                  isChallengeThread && isBlindChallenge
                    ? "Nhập lời giải Thử thách Tuần (hỗ trợ LaTeX, khối :::hint / :::solution, đồ thị SVG & dán ảnh Ctrl+V). Bài nộp sẽ được giữ kín tới khi hết giờ..."
                    : isArticleThread
                      ? "Nhập bình luận hoặc trao đổi thêm về bài viết (hỗ trợ LaTeX & dán ảnh Ctrl+V)..."
                      : "Nhập lời giải hoặc trao đổi... Hỗ trợ :::hint, :::solution, ```graph và nhắc tên @[Tên]!"
                }
              />
              {error && <Alert variant="destructive">{error}</Alert>}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || isUploading}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isUploading
                    ? "Đang tải ảnh lên..."
                    : replyTarget
                      ? "Gửi phản hồi"
                      : isChallengeThread && isBlindChallenge
                        ? "Nộp bài giải ẩn"
                        : isArticleThread
                          ? "Gửi bình luận"
                          : "Gửi lời giải"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
