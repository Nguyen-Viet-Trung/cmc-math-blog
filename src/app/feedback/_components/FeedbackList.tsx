"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock } from "lucide-react";
import {
  CATEGORY_META,
  STATUS_META,
} from "@/app/feedback/_components/feedback-meta";
import { PaginationBar } from "@/components/PaginationBar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PaginatedResult } from "@/lib/pagination";
import type { FeedbackCategory, FeedbackItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const MathContent = dynamic(
  () => import("@/components/MathContent").then((m) => m.MathContent),
  {
    loading: () => (
      <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
    ),
  }
);

export function FeedbackList({
  initialFeedbacks,
}: {
  initialFeedbacks: PaginatedResult<FeedbackItem>;
}) {
  const [filterCat, setFilterCat] = useState<FeedbackCategory | "all">("all");
  const [page, setPage] = useState(1);

  const query = useQuery<PaginatedResult<FeedbackItem>>({
    queryKey: ["public-feedbacks", filterCat, page],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        pageSize: String(initialFeedbacks.pageSize),
        category: filterCat,
      });
      const res = await fetch(`/api/feedbacks?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Không thể tải danh sách góp ý.");
      return (await res.json()) as PaginatedResult<FeedbackItem>;
    },
    initialData:
      filterCat === "all" && page === 1 ? initialFeedbacks : undefined,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const data = query.data ?? initialFeedbacks;

  return (
    <div className="space-y-4 lg:col-span-7">
      <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
        <h2 className="text-sm font-bold text-foreground">
          Nhật ký Tiếp nhận &amp; Cập nhật ({data.totalCount})
        </h2>

        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {(["all", "bug", "feature", "ui_ux"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setFilterCat(k);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-2.5 py-1 transition",
                filterCat === k
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {k === "all" ? "Tất cả" : CATEGORY_META[k].label}
            </button>
          ))}
        </div>
      </Card>

      {data.items.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có mục góp ý nào trong danh sách này. Hãy đóng góp ý kiến đầu
          tiên giúp diễn đàn hoàn thiện hơn nhé!
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => {
            const catMeta = CATEGORY_META[item.category];
            const stMeta = STATUS_META[item.status];

            return (
              <Card key={item.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={catMeta.variant}>{catMeta.label}</Badge>

                  <Badge variant={stMeta.variant} className="rounded-full">
                    {item.status === "resolved" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {stMeta.label}
                  </Badge>
                </div>

                <div>
                  <h3 className="heading-3">{item.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Gửi bởi{" "}
                    <strong className="text-foreground">
                      {item.authorName}
                    </strong>{" "}
                    • {new Date(item.createdAt).toLocaleString("vi-VN")}
                    {item.pageUrl && ` • Trang: ${item.pageUrl}`}
                  </p>
                </div>

                <MathContent
                  content={item.description}
                  imageUrls={item.imageUrls}
                />

                {item.adminReply && (
                  <Alert variant="info" className="space-y-1 text-xs">
                    <p className="font-extrabold text-primary">
                      Phản hồi từ Ban Quản Trị (Admin):
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                      {item.adminReply}
                    </p>
                  </Alert>
                )}
              </Card>
            );
          })}

          <PaginationBar
            page={data.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            itemLabel="mục"
            isLoading={query.isFetching}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
