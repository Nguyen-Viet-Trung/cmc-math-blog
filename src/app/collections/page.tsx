import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { listPublishedCollections } from "@/lib/collection-service";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CollectionsAdminAction } from "./_components/CollectionsAdminAction";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Bộ sưu tập Chuyên đề",
  description:
    "Các chuỗi chuyên đề Toán học, tuyển tập bất đẳng thức, hình học và đề thi ôn luyện được Ban Quản Trị tuyển chọn.",
};

const ACCENT_BAR: Record<string, string> = {
  blue: "bg-primary",
  indigo: "bg-primary/70",
  emerald: "bg-success",
  amber: "bg-bounty",
  rose: "bg-destructive",
};

export default async function CollectionsPage() {
  const collections = await listPublishedCollections();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="heading-1">Bộ sưu tập Chuyên đề</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chuỗi bài toán, chuyên đề Research và tuyển tập đề ôn thi được hệ
            thống hóa theo lộ trình học tập.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {collections.length} chuyên đề
          </span>
          <CollectionsAdminAction label="Quản lý Chuyên đề" />
        </div>
      </header>

      {collections.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              Chưa có Bộ sưu tập Chuyên đề nào được xuất bản
            </EmptyTitle>
            <EmptyDescription>
              Ban Quản Trị sẽ sớm tổng hợp các bài toán hay, đề thi chọn lọc và
              bài Research thành từng lộ trình ôn tập tại đây.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm">
              <Link href="/" prefetch={false}>
                Quay lại Diễn đàn
              </Link>
            </Button>
            <CollectionsAdminAction label="Tạo chuyên đề đầu tiên" openCreate />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {collections.map((col) => {
            const accent = ACCENT_BAR[col.coverColor] ?? ACCENT_BAR.blue;
            return (
              <Link
                key={col.id}
                href={`/collections/${col.slug}`}
                prefetch={false}
                className="group block"
              >
                <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-primary/45 hover:bg-muted/20">
                  <div className={cn("h-1 w-full", accent)} />
                  <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="heading-3 line-clamp-2 group-hover:text-primary">
                          {col.title}
                        </h2>
                        <Badge variant="subtle" className="shrink-0 tabular-nums">
                          {col.threadCount} bài
                        </Badge>
                      </div>
                      {col.description && (
                        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                          {col.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {col.threadCount} bài viết
                        </span>
                        {col.solvedCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {col.solvedCount} đã giải
                          </span>
                        )}
                        <span className="hidden sm:inline">
                          · Cập nhật {formatRelativeDate(col.updatedAt)}
                        </span>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
                        Mở
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
