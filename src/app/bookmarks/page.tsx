import type { Metadata } from "next";
import Link from "next/link";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UrlPageSizeSelect } from "@/components/UrlPageSizeSelect";
import { listUserBookmarksPaginated } from "@/lib/collection-service";
import { formatRelativeDate, getThreadTypeLabel } from "@/lib/format";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { normalizePagination } from "@/lib/pagination";
import { BookmarkRemoveButton } from "./_components/BookmarkRemoveButton";

export const metadata: Metadata = {
  title: "Sổ tay bài toán",
  description:
    "Danh sách các bài toán, lời giải hay và chuyên đề bạn đã lưu lại để ôn tập.",
};

function buildBookmarksUrl(page: number, pageSize: number): string {
  const sp = new URLSearchParams();
  if (page > 1) sp.set("page", String(page));
  if (pageSize !== 15) sp.set("pageSize", String(pageSize));
  const qs = sp.toString();
  return qs ? `/bookmarks?${qs}` : "/bookmarks";
}

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const [user, sp] = await Promise.all([getCurrentUserProfile(), searchParams]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <Empty className="border-solid py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bookmark className="text-primary" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Sổ tay bài toán cá nhân</EmptyTitle>
            <EmptyDescription>
              Đăng nhập để lưu lại những bài toán hay, đề thi và chuyên đề yêu
              thích vào sổ tay ôn tập riêng của bạn.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm">
              <Link href="/login?next=/bookmarks">Đăng nhập ngay</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const { page, pageSize } = normalizePagination(sp.page, sp.pageSize, 15, 50);
  const paginated = await listUserBookmarksPaginated(user.id, page, pageSize);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="heading-1">Sổ tay bài toán</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lưu trữ các bài tập hay, lời giải chuẩn và chuyên đề để xem lại bất
            cứ lúc nào.
          </p>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {paginated.totalCount} bài đã lưu
        </span>
      </header>

      {paginated.items.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bookmark aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Sổ tay của bạn hiện đang trống</EmptyTitle>
            <EmptyDescription>
              Khi đọc một bài toán hay trên diễn đàn, bấm nút{" "}
              <strong className="text-foreground">Lưu sổ tay</strong> ở đầu bài
              viết để thêm vào đây.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm">
              <Link href="/">Khám phá Diễn đàn</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/collections">Xem Chuyên đề</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {paginated.items.map((t) => (
              <div
                key={t.id}
                className="flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/35 sm:px-5"
              >
                <Link
                  href={`/threads/${t.id}`}
                  prefetch={false}
                  className="group min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.threadType !== "question" && (
                      <Badge variant="subtle" className="text-[10px]">
                        {getThreadTypeLabel(t.threadType)}
                      </Badge>
                    )}
                    <h2 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                      {t.title}
                    </h2>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {t.category.name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t.gradeTag}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t.author.displayName}</span>
                    <span aria-hidden="true">·</span>
                    <span>Lưu {formatRelativeDate(t.bookmarkedAt)}</span>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
                  {t.status === "solved" && (
                    <span className="hidden items-center gap-1 font-medium text-success sm:inline-flex">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Đã giải
                    </span>
                  )}
                  <span className="hidden items-center gap-1 sm:inline-flex">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t.replyCount}
                  </span>
                  <BookmarkRemoveButton threadId={t.id} />
                </div>
              </div>
            ))}
          </div>

          {paginated.totalCount > 0 && (
            <nav
              aria-label="Phân trang sổ tay"
              className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="tabular-nums text-muted-foreground">
                  Trang {paginated.page} / {paginated.totalPages} (
                  {paginated.totalCount} bài)
                </span>
                <UrlPageSizeSelect
                  basePath="/bookmarks"
                  pageSize={paginated.pageSize}
                  defaultPageSize={15}
                  options={[10, 15, 30, 50]}
                  itemLabel="bài"
                />
              </div>
              {paginated.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  {paginated.page > 1 ? (
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                      <Link
                        href={buildBookmarksUrl(
                          paginated.page - 1,
                          paginated.pageSize
                        )}
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
                  {paginated.page < paginated.totalPages ? (
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                      <Link
                        href={buildBookmarksUrl(
                          paginated.page + 1,
                          paginated.pageSize
                        )}
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
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
