import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Flame,
  FlaskConical,
  MessageSquare,
  Newspaper,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCollectionDetailBySlug } from "@/lib/collection-service";
import { formatRelativeDate, getThreadTypeLabel } from "@/lib/format";
import { getCurrentUserProfile } from "@/lib/forum-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const col = await getCollectionDetailBySlug(slug);
  if (!col) {
    return { title: "Không tìm thấy chuyên đề" };
  }
  return {
    title: col.title,
    description:
      col.description ||
      `Bộ sưu tập chuyên đề "${col.title}" gồm ${col.threadCount} bài viết Toán học trên CMC.`,
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, user] = await Promise.all([
    params,
    getCurrentUserProfile(),
  ]);
  const col = await getCollectionDetailBySlug(slug, user?.role === "admin");

  if (!col) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/collections">
            <ArrowLeft className="h-4 w-4" />
            Tất cả Chuyên đề
          </Link>
        </Button>
      </div>

      <header className="space-y-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="subtle">Bộ sưu tập Chuyên đề</Badge>
          {!col.isPublished && (
            <Badge variant="outline">Bản nháp (chỉ Admin thấy)</Badge>
          )}
        </div>
        <h1 className="heading-1">{col.title}</h1>
        {col.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {col.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>
            <strong className="text-foreground">{col.threadCount}</strong> bài
            viết trong lộ trình
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-success">
            <strong>{col.solvedCount}</strong> bài đã có lời giải đúng
          </span>
          {col.createdByName && (
            <>
              <span aria-hidden="true">·</span>
              <span>Biên tập: {col.createdByName}</span>
            </>
          )}
        </div>
      </header>

      {col.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Chuyên đề này chưa có bài viết nào</EmptyTitle>
            <EmptyDescription>
              Ban Quản Trị có thể gắn thêm bài viết vào lộ trình này trong Admin
              Portal.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {col.items.map((item, idx) => {
            const t = item.thread;
            return (
              <Link
                key={t.id}
                href={`/threads/${t.id}`}
                prefetch={false}
                className="group flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-muted/35 sm:px-5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.threadType === "challenge" ? (
                      <Flame className="h-3.5 w-3.5 shrink-0 text-bounty" />
                    ) : t.threadType === "news" ? (
                      <Newspaper className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : t.threadType === "research" ? (
                      <FlaskConical className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : t.status === "solved" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <CircleDot className="h-3.5 w-3.5 shrink-0 text-bounty" />
                    )}
                    {t.threadType !== "question" && (
                      <Badge variant="subtle" className="text-[10px]">
                        {getThreadTypeLabel(t.threadType)}
                      </Badge>
                    )}
                    <h2 className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary">
                      {t.title}
                    </h2>
                  </div>

                  {item.note && (
                    <p className="rounded border-l-2 border-primary/50 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Ghi chú lộ trình:{" "}
                      </span>
                      {item.note}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {t.category.name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t.gradeTag}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t.author.displayName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeDate(t.createdAt)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 text-xs tabular-nums text-muted-foreground">
                  {t.status === "solved" ? (
                    <span className="font-medium text-success">Đã giải</span>
                  ) : t.bountyPoints > 0 ? (
                    <span className="font-semibold text-bounty">
                      +{t.bountyPoints}đ
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t.replyCount}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
