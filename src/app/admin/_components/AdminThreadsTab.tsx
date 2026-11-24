"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Gift, Search, Tag } from "lucide-react";
import { moderateThreadAction } from "@/app/actions/admin";
import { PaginationBar } from "@/components/PaginationBar";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateTimeVN, getThreadTypeLabel } from "@/lib/format";
import type { AdminThreadManageItem, ThreadType } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";
import { AdminThreadAwardDialog } from "./modals/AdminThreadAwardDialog";

const THREAD_TYPES: { key: ThreadType; label: string }[] = [
  { key: "question", label: "Hỏi bài" },
  { key: "challenge", label: "Thử thách" },
  { key: "news", label: "News" },
  { key: "research", label: "Research" },
];

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
  const [awardTarget, setAwardTarget] = useState<AdminThreadManageItem | null>(
    null
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

  async function handleChangeType(threadId: string, threadType: ThreadType) {
    setBusyId(threadId);
    try {
      const res = await moderateThreadAction({
        threadId,
        action: "set_type",
        threadType,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể đổi loại bài viết.",
        });
        return;
      }
      onNotice({ type: "success", text: "Đã cập nhật loại bài viết!" });
      await refreshThreads();
    } finally {
      setBusyId(null);
    }
  }

  function buildThreadMenu(t: AdminThreadManageItem): ActionMenuItem[] {
    return [
      {
        id: "open",
        label: "Mở bài viết ở tab mới",
        icon: <ExternalLink className="h-3.5 w-3.5" />,
        onSelect: () => {
          window.open(`/threads/${t.id}`, "_blank");
        },
      },
      ...THREAD_TYPES.map((opt, idx) => ({
        id: `type-${opt.key}`,
        label: `Đổi loại: ${opt.label}`,
        icon: <Tag className="h-3.5 w-3.5" />,
        active: t.threadType === opt.key,
        disabled: busyId === t.id || t.threadType === opt.key,
        separatorBefore: idx === 0,
        onSelect: () => void handleChangeType(t.id, opt.key),
      })),
    ];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={threadSearch}
            onChange={(e) => {
              setThreadSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tiêu đề bài, tên hoặc email tác giả..."
            className="pl-8 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <NativeSelect
            aria-label="Lọc loại bài viết"
            value={threadTypeFilter}
            onChange={(e) => {
              setThreadTypeFilter(e.target.value as ThreadType | "all");
              setPage(1);
            }}
            className="h-9 w-40 text-xs font-medium"
          >
            <option value="all">Tất cả loại bài</option>
            {THREAD_TYPES.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {isLoading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
          {totalThreadsCount === 0
            ? "Chưa có bài viết nào trên diễn đàn."
            : "Không có bài viết nào khớp với bộ lọc hiện tại."}
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Bài viết &amp; Tác giả</th>
                    <th className="whitespace-nowrap px-3 py-3">Phân loại</th>
                    <th className="whitespace-nowrap px-3 py-3 text-center">
                      Tương tác
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-right">
                      Thưởng TG
                    </th>
                    <th className="w-[136px] whitespace-nowrap px-4 py-3 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((t) => (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="max-w-[360px] px-4 py-3">
                        <Link
                          href={`/threads/${t.id}`}
                          prefetch={false}
                          target="_blank"
                          className="line-clamp-2 font-semibold leading-snug text-foreground hover:text-primary"
                        >
                          {t.title}
                        </Link>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/80">
                            {t.authorName}
                          </span>{" "}
                          · {t.categoryName} · {t.gradeTag} ·{" "}
                          {formatDateTimeVN(t.createdAt)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <Badge
                          variant={
                            t.threadType === "question" ? "outline" : "subtle"
                          }
                          className="text-[10px]"
                        >
                          {getThreadTypeLabel(t.threadType)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center text-xs tabular-nums text-muted-foreground">
                        {t.replyCount} BL · {t.viewCount} xem
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold tabular-nums">
                        {t.authorRewardPoints > 0 ? (
                          <span className="text-bounty">
                            +{t.authorRewardPoints}đ
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === t.id || t.authorBanned}
                            onClick={() => setAwardTarget(t)}
                            className="h-7 px-2.5 text-xs"
                          >
                            <Gift className="h-3 w-3 text-bounty" />
                            Thưởng
                          </Button>
                          <ActionMenu
                            items={buildThreadMenu(t)}
                            disabled={busyId === t.id}
                            triggerLabel={`Thao tác bài ${t.title}`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

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
        </>
      )}

      <AdminThreadAwardDialog
        thread={awardTarget}
        onClose={() => setAwardTarget(null)}
        onSuccess={refreshThreads}
        onNotice={onNotice}
      />
    </div>
  );
}
