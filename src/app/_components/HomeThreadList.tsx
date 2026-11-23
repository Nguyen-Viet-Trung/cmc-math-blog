import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
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
  buildHomeFilterUrl,
  formatRelativeDate,
  getThreadTypeLabel,
} from "@/lib/format";
import type { ThreadSummary, ThreadType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HomeThreadListProps {
  threads: ThreadSummary[];
  hasActiveFilter: boolean;
  pagination?: {
    page: number;
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
      <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
        {hasActiveFilter ? (
          <>
            <p className="text-sm font-semibold text-foreground">
              Không tìm thấy bài viết nào khớp với bộ lọc hiện tại
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Thử đổi từ khóa tìm kiếm, chọn loại bài/chuyên mục khác hoặc xóa
              bộ lọc để xem toàn bộ thảo luận.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/">Xóa bộ lọc</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/threads/new">
                  <Plus className="h-3.5 w-3.5" />
                  Đăng bài mới
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">
              Diễn đàn chưa có bài viết nào
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Hãy đăng câu hỏi Toán học, bài News hoặc bài Research đầu tiên của
              câu lạc bộ (hỗ trợ LaTeX và dán ảnh trực tiếp).
            </p>
            <div className="mt-4">
              <Button asChild size="sm">
                <Link href="/threads/new">
                  <Plus className="h-3.5 w-3.5" />
                  Đăng bài đầu tiên
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {threads.map((t) => {
        const typeLabel = getThreadTypeLabel(t.threadType);
        const iconTitle =
          t.threadType !== "question"
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
                {t.threadType === "news" ? (
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
                  {t.threadType !== "question" && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {typeLabel}
                    </span>
                  )}
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
              {t.threadType !== "question" ? (
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

    {pagination && pagination.totalPages > 1 && (
      <nav
        aria-label="Phân trang bài viết"
        className="flex items-center justify-between gap-3 pt-2 text-xs"
      >
        <span className="tabular-nums text-muted-foreground">
          Trang {pagination.page} / {pagination.totalPages} (
          {pagination.totalCount} bài)
        </span>
        <div className="flex items-center gap-2">
          {pagination.page > 1 ? (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link
                href={buildHomeFilterUrl({
                  type: pagination.activeType,
                  cat: pagination.activeCat,
                  status: pagination.activeStatus,
                  q: pagination.searchQuery,
                  page: pagination.page - 1,
                })}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Trang trước
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled className="h-8 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" />
              Trang trước
            </Button>
          )}

          {pagination.page < pagination.totalPages ? (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link
                href={buildHomeFilterUrl({
                  type: pagination.activeType,
                  cat: pagination.activeCat,
                  status: pagination.activeStatus,
                  q: pagination.searchQuery,
                  page: pagination.page + 1,
                })}
              >
                Trang sau
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled className="h-8 text-xs">
              Trang sau
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </nav>
    )}
    </div>
  );
}
