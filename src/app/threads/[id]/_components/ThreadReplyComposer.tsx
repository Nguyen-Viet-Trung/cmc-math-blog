"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { MathEditor } from "@/components/MathEditor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ThreadStatus, UserProfile } from "@/lib/types";

interface ThreadReplyComposerProps {
  threadId: string;
  status: ThreadStatus;
  viewer: UserProfile | null;
  isArticleThread: boolean;
  bountyPoints: number;
  isSubmitting: boolean;
  onSubmit: (input: { content: string; imageUrls: string[] }) => Promise<void>;
}

export function ThreadReplyComposer({
  threadId,
  status,
  viewer,
  isArticleThread,
  bountyPoints,
  isSubmitting,
  onSubmit,
}: ThreadReplyComposerProps) {
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isUploading) return;
    setError(null);
    try {
      await onSubmit({ content, imageUrls });
      setContent("");
      setImageUrls([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể gửi lời giải."
      );
    }
  }

  return (
    <Card className="p-5 sm:p-7">
      <div className="space-y-4">
        <h3 className="heading-3">
          {isArticleThread
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
            <MathEditor
              value={content}
              onChange={setContent}
              imageUrls={imageUrls}
              onChangeImages={setImageUrls}
              onUploadingChange={setIsUploading}
              rows={5}
              placeholder={
                isArticleThread
                  ? "Nhập bình luận hoặc trao đổi thêm về bài viết (hỗ trợ LaTeX & dán ảnh Ctrl+V)..."
                  : "Nhập lời giải hoặc trao đổi... Tin nhắn mới sẽ tự động hiển thị trực tuyến lên màn hình các bạn đang xem bài này!"
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
                    : isArticleThread
                      ? "Gửi bình luận"
                      : "Gửi lời giải"}
                </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
