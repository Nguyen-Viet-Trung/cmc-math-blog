"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Clock, Search, XCircle } from "lucide-react";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateTimeVN } from "@/lib/format";
import type { RedemptionItem } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";
import { AdminRedemptionDialog } from "./modals/AdminRedemptionDialog";

type StatusFilter = "all" | RedemptionItem["status"];

const STATUS_META: Record<
  RedemptionItem["status"],
  { label: string; variant: BadgeProps["variant"] }
> = {
  pending: { label: "Chờ duyệt", variant: "bounty" },
  approved: { label: "Đã duyệt", variant: "subtle" },
  fulfilled: { label: "Đã trao quà", variant: "successSolid" },
  rejected: { label: "Đã từ chối", variant: "destructive" },
};

export function AdminRedemptionsTab({
  totalRedemptionsCount,
  onNotice,
}: {
  totalRedemptionsCount: number;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reviewTarget, setReviewTarget] = useState<RedemptionItem | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data, isLoading, isFetching } = useAdminPaginatedList<RedemptionItem>({
    resource: "redemptions",
    page,
    pageSize,
    query: debouncedSearch,
    status: statusFilter,
    onPageClamp: setPage,
  });

  async function refreshRedemptions() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "redemptions"],
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm học sinh, tên quà hoặc ghi chú..."
            className="pl-8 text-xs sm:text-sm"
          />
        </div>

        <NativeSelect
          aria-label="Lọc trạng thái đơn đổi quà"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="h-9 w-44 text-xs font-medium"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="fulfilled">Đã trao quà</option>
          <option value="rejected">Từ chối</option>
        </NativeSelect>
      </div>

      {isLoading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
          {totalRedemptionsCount === 0
            ? "Chưa có đơn yêu cầu đổi quà nào từ học sinh."
            : "Không có đơn đổi quà nào khớp với bộ lọc hiện tại."}
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {data.items.map((rd) => {
                const meta = STATUS_META[rd.status];
                const isFinal =
                  rd.status === "rejected" || rd.status === "fulfilled";

                return (
                  <div
                    key={rd.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/25 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.variant} className="text-[10px]">
                          {rd.status === "fulfilled" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : rd.status === "rejected" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {meta.label}
                        </Badge>
                        <p className="text-sm font-semibold text-foreground">
                          {rd.rewardName}
                        </p>
                        <span className="text-xs font-semibold tabular-nums text-bounty">
                          -{rd.pointsSpent}đ
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">
                          {rd.userDisplayName}
                        </strong>{" "}
                        ({rd.userEmail}) · {formatDateTimeVN(rd.createdAt)}
                      </p>

                      {rd.studentNote && (
                        <p className="rounded bg-muted/45 px-2.5 py-1.5 text-xs text-foreground">
                          <span className="font-medium text-muted-foreground">
                            Học sinh nhắn:{" "}
                          </span>
                          {rd.studentNote}
                        </p>
                      )}

                      {rd.adminNote && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Phản hồi Admin:{" "}
                          </span>
                          {rd.adminNote}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {!isFinal ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewTarget(rd)}
                          className="h-8 text-xs"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                          Xử lý đơn
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Đã đóng
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <PaginationBar
            page={data.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            itemLabel="đơn đổi quà"
            isLoading={isFetching}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50]}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </>
      )}

      <AdminRedemptionDialog
        redemption={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSuccess={refreshRedemptions}
        onNotice={onNotice}
      />
    </div>
  );
}
