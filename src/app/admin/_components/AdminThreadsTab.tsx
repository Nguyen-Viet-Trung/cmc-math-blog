"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Gift } from "lucide-react";
import {
  awardThreadAuthorAction,
  moderateThreadAction,
} from "@/app/actions/admin";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateTimeVN, getThreadTypeLabel } from "@/lib/format";
import type { AdminThreadManageItem, ThreadType } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

export function AdminThreadsTab({
  totalThreadsCount,
  onNotice,
}: {
  totalThreadsCount: number;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [threadSearch, setThreadSearch] = useState("");
  const [threadTypeFilter, setThreadTypeFilter] = useState<ThreadType | "all">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [rewardInputs, setRewardInputs] = useState<Record<string, string>>({});
  const [rewardReasons, setRewardReasons] = useState<Record<string, string>>(
    {}
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(threadSearch, 250);
  const { data, isLoading, isFetching } =
    useAdminPaginatedList<AdminThreadManageItem>({
      resource: "threads",
      page,
      pageSize,
      query: debouncedSearch,
      type: threadTypeFilter,
      onPageClamp: setPage,
    });

  async function refreshThreads() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "threads"],
    });
    router.refresh();
  }

  async function handleAward(t: AdminThreadManageItem) {
    const pts = Number(rewardInputs[t.id] ?? "20");
    setBusyId(t.id);
    const res = await awardThreadAuthorAction({
      threadId: t.id,
      points: pts,
      reason: rewardReasons[t.id],
    });
    setBusyId(null);
    if (!res.ok) {
      onNotice({
        type: "error",
        text: res.error || "Không thể cộng điểm thưởng tác giả.",
      });
      return;
    }
    setRewardReasons({ ...rewardReasons, [t.id]: "" });
    onNotice({
      type: "success",
      text: res.message || "Đã thưởng điểm cho tác giả bài viết!",
    });
    await refreshThreads();
  }

  async function handleChangeType(threadId: string, threadType: ThreadType) {
    setBusyId(threadId);
    const res = await moderateThreadAction({
      threadId,
      action: "set_type",
      threadType,
    });
    setBusyId(null);
    if (!res.ok) {
      onNotice({
        type: "error",
        text: res.error || "Không thể đổi loại bài viết.",
      });
      return;
    }
    onNotice({ type: "success", text: "Đã cập nhật loại bài viết!" });
    await refreshThreads();
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="text"
          value={threadSearch}
          onChange={(e) => {
            setThreadSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tiêu đề bài, tên hoặc email tác giả..."
          className="sm:max-w-md"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "question", label: "Hỏi bài" },
              { key: "challenge", label: "Thử thách" },
              { key: "news", label: "News" },
              { key: "research", label: "Research" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.key}
              type="button"
              size="sm"
              variant={threadTypeFilter === opt.key ? "default" : "outline"}
              onClick={() => {
                setThreadTypeFilter(opt.key);
                setPage(1);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
          {totalThreadsCount === 0
            ? "Chưa có bài viết nào trên diễn đàn."
            : "Không có bài viết nào khớp với bộ lọc hiện tại."}
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((t) => {
            const isBusy = busyId === t.id;
            const ptsVal = rewardInputs[t.id] ?? "20";
            return (
              <Card key={t.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          t.threadType === "question" ? "outline" : "subtle"
                        }
                      >
                        {getThreadTypeLabel(t.threadType)}
                      </Badge>
                      <Link
                        href={`/threads/${t.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        {t.title}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tác giả:{" "}
                      <strong className="text-foreground">
                        {t.authorName}
                      </strong>{" "}
                      ({t.authorEmail}) · {t.categoryName} · {t.gradeTag} ·{" "}
                      {formatDateTimeVN(t.createdAt)} ·{" "}
                      {t.replyCount} bình luận · {t.viewCount} lượt xem
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {t.authorRewardPoints > 0 && (
                      <Badge variant="bounty">
                        Đã thưởng tác giả +{t.authorRewardPoints}đ
                      </Badge>
                    )}
                    <select
                      aria-label="Đổi loại bài viết"
                      value={t.threadType}
                      disabled={isBusy}
                      onChange={(e) =>
                        void handleChangeType(
                          t.id,
                          e.target.value as ThreadType
                        )
                      }
                      className="h-8 rounded-md border border-input bg-card px-2 text-xs text-foreground"
                    >
                      <option value="question">Hỏi bài</option>
                      <option value="challenge">Thử thách</option>
                      <option value="news">News</option>
                      <option value="research">Research</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={ptsVal}
                    onChange={(e) =>
                      setRewardInputs({
                        ...rewardInputs,
                        [t.id]: e.target.value,
                      })
                    }
                    className="h-8 w-24 font-semibold tabular-nums text-bounty"
                    aria-label="Số điểm thưởng"
                  />
                  <Input
                    type="text"
                    value={rewardReasons[t.id] ?? ""}
                    onChange={(e) =>
                      setRewardReasons({
                        ...rewardReasons,
                        [t.id]: e.target.value,
                      })
                    }
                    placeholder="Lý do thưởng điểm tác giả (lưu vào sổ cái điểm)..."
                    className="h-8 flex-1 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="bounty"
                    disabled={isBusy || t.authorBanned}
                    onClick={() => void handleAward(t)}
                  >
                    <Gift className="h-3.5 w-3.5" />
                    Cộng +{ptsVal || 0}đ tác giả
                  </Button>
                </div>
              </Card>
            );
          })}

          <PaginationBar
            page={data.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            itemLabel="bài viết"
            isLoading={isFetching}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[10, 12, 25, 50]}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
