import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  Clock,
  Flame,
  FlaskConical,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Newspaper,
  Pin,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UrlPaginationBar } from "@/components/UrlPaginationBar";
import {
  formatRelativeDate,
  formatRemainingTime,
  getThreadTypeLabel,
} from "@/lib/format";
import { isChallengeBlindActive } from "@/lib/rules";
import type { ThreadSummary, ThreadType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HomeThreadListProps {
  threads: ThreadSummary[];
  hasActiveFilter: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    activeType: ThreadType | "all";
    activeCat: string;
    activeStatus: "all" | "open" | "solved";
    searchQuery: string;
  };
}

export function HomeThreadList({
  threads,
  hasActiveFilter,
  pagination,
}: HomeThreadListProps) {
  if (threads.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquare aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            {hasActiveFilter
              ? "Không tìm thấy bài viết nào khớp với bộ lọc hiện tại"
              : "Diễn đàn chưa có bài viết nào"}
          </EmptyTitle>
          <EmptyDescription>
            {hasActiveFilter
              ? "Thử đổi từ khóa tìm kiếm, chọn loại bài/chuyên mục khác hoặc xóa bộ lọc để xem toàn bộ thảo luận."
              : "Hãy đăng câu hỏi Toán học, bài News hoặc bài Research đầu tiên của câu lạc bộ (hỗ trợ LaTeX và dán ảnh trực tiếp)."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {hasActiveFilter ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Xóa bộ lọc</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/threads/new">
                  <Plus className="size-3.5" aria-hidden="true" />
                  Đăng bài mới
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/threads/new">
                <Plus className="size-3.5" aria-hidden="true" />
                Đăng bài đầu tiên
              </Link>
            </Button>
          )}
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {threads.map((t) => {
          const typeLabel = getThreadTypeLabel(t.threadType);
          const blindActive = isChallengeBlindActive(
            t.threadType,
            t.status,
            t.challengeEndsAt
          );
          const iconTitle =
            t.threadType === "challenge"
              ? blindActive
                ? "Thử thách Tuần đang mở nộp bài ẩn"
                : "Thử thách Tuần"
              : t.threadType !== "question"
                ? typeLabel
                : t.status === "solved"
                  ? "Đã có lời giải đúng"
                  : t.status === "closed"
                    ? "Chủ đề đã đóng"
                    : "Đang chờ lời giải";

          return (
            <Link
              key={t.id}
              href={`/threads/${t.id}`}
              prefetch={false}
              className="group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/35 sm:px-5 sm:py-4"
            >
              {/* Trái: Icon phân loại/trạng thái + Tiêu đề + Trích đoạn + Metadata */}
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 shrink-0" title={iconTitle}>
                  {t.threadType === "challenge" ? (
                    <Flame className="h-4 w-4 text-bounty" />
                  ) : t.threadType === "news" ? (
                    <Newspaper className="h-4 w-4 text-primary" />
                  ) : t.threadType === "research" ? (
                    <FlaskConical className="h-4 w-4 text-primary" />
                  ) : t.status === "solved" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : t.status === "closed" ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CircleDot className="h-4 w-4 text-bounty" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {t.isPinned && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-destructive">
                        <Pin className="h-3 w-3" />
                        Ghim
                      </span>
                    )}
                    {t.threadType === "challenge" ? (
                      <span className="inline-flex items-center gap-1 rounded border border-bounty-border bg-bounty-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bounty-foreground">
                        Thử thách
                        {t.challengeEndsAt && (
                          <span className="inline-flex items-center gap-0.5 font-normal normal-case">
                            · <Clock className="h-2.5 w-2.5" />
                            {formatRemainingTime(t.challengeEndsAt)}
                          </span>
                        )}
                      </span>
                    ) : t.threadType !== "question" ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {typeLabel}
                      </span>
                    ) : null}
                    <h3 className="text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {t.title}
                    </h3>
                  </div>

                  {t.contentPreview && (
                    <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">
                      {t.contentPreview}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {t.category.name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t.gradeTag}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t.author.displayName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeDate(t.createdAt)}</span>
                    {t.imageCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {t.imageCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Phải: Điểm thưởng / Thưởng tác giả & Số bình luận */}
              <div className="flex shrink-0 flex-col items-end gap-1.5 text-right tabular-nums">
                {t.threadType === "challenge" ? (
                  <span className="text-xs font-semibold text-bounty">
                    +{t.bountyPoints}đ/bài đúng
                  </span>
                ) : t.threadType !== "question" ? (
                  t.authorRewardPoints > 0 ? (
                    <span className="text-xs font-semibold text-bounty">
                      +{t.authorRewardPoints}đ tác giả
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {typeLabel}
                    </span>
                  )
                ) : t.status === "open" ? (
                  <span className="text-xs font-semibold text-bounty">
                    +{t.bountyPoints}đ
                  </span>
                ) : t.status === "solved" ? (
                  <span className="text-xs font-medium text-success">Đã giải</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Đã đóng</span>
                )}

                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      t.replyCount > 0 && "font-medium text-foreground/85"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t.replyCount}
                  </span>
                  <span className="hidden sm:inline">{t.viewCount} xem</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {pagination && pagination.totalCount > 0 && (
        <UrlPaginationBar
          ariaLabel="Phân trang bài viết"
          basePath="/"
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          pageSize={pagination.pageSize}
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 30, 50]}
          itemLabel="bài viết"
          queryParams={{
            type:
              pagination.activeType !== "all"
                ? pagination.activeType
                : undefined,
            cat: pagination.activeCat || undefined,
            status:
              pagination.activeStatus !== "all"
                ? pagination.activeStatus
                : undefined,
            q: pagination.searchQuery || undefined,
          }}
        />
      )}
    </div>
  );
}
