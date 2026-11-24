import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, MessageSquarePlus, ScrollText } from "lucide-react";
import { MathContentServer } from "@/components/MathContentServer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { extractDocumentHeadings } from "@/lib/default-forum-rules";
import { getForumRules } from "@/lib/document-service";
import { formatDateTimeVN } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RulesAdminAction } from "./_components/RulesAdminAction";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Nội quy Diễn đàn",
  description:
    "Quy định viết bài, trích dẫn nguồn, sử dụng tiếng Việt và công thức Toán LaTeX trên diễn đàn CMC — CMA MATHS CLUB.",
};

export default async function ForumRulesPage() {
  const doc = await getForumRules();
  const headings = extractDocumentHeadings(doc.content);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <ScrollText className="h-3.5 w-3.5" />
            <span>Quy định cộng đồng học thuật</span>
          </div>
          <h1 className="heading-1">{doc.title}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              Cập nhật lần cuối: {formatDateTimeVN(doc.updatedAt)}
            </span>
            {doc.updatedByName && (
              <span>· Biên tập bởi {doc.updatedByName}</span>
            )}
          </p>
        </div>

        <RulesAdminAction />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_248px]">
        <Card className="min-w-0 p-5 sm:p-8">
          <article aria-label={doc.title}>
            <MathContentServer content={doc.content} />
          </article>
        </Card>

        <aside className="hidden lg:block">
          <div className="sticky top-[68px] space-y-5 border-l border-border pl-5">
            {headings.length > 0 && (
              <nav aria-label="Mục lục Nội quy" className="space-y-2">
                <p className="section-label">Mục lục nhanh</p>
                <ul className="space-y-1">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={cn(
                          "block rounded py-1 text-xs leading-snug transition-colors hover:text-primary",
                          h.level === 2
                            ? "font-semibold text-foreground"
                            : "pl-2.5 text-muted-foreground"
                        )}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div className="space-y-2 border-t border-border pt-4">
              <p className="section-label">Thao tác nhanh</p>
              <div className="flex flex-col gap-1.5">
                <Button asChild size="sm" className="justify-start">
                  <Link href="/threads/new" prefetch={false}>
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Đăng bài viết mới
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="justify-start text-muted-foreground hover:text-foreground"
                >
                  <Link href="/" prefetch={false}>
                    <BookOpen className="h-3.5 w-3.5" />
                    Quay lại Diễn đàn
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
