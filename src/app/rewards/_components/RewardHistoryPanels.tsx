"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Clock, History } from "lucide-react";
import { PaginationBar } from "@/components/PaginationBar";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateTimeVN, formatDateVN } from "@/lib/format";
import type { PaginatedResult } from "@/lib/pagination";
import type { PointTransactionItem, RedemptionItem } from "@/lib/types";

const STATUS_BADGE: Record<
  RedemptionItem["status"],
  { label: string; variant: BadgeProps["variant"] }
> = {
  pending: {
    label: "Đang chờ Admin duyệt",
    variant: "bounty",
  },
  approved: {
    label: "Đã duyệt — Chuẩn bị trao quà",
    variant: "subtle",
  },
  fulfilled: {
    label: "Đã trao quà thành công",
    variant: "success",
  },
  rejected: {
    label: "Từ chối (Đã hoàn lại điểm)",
    variant: "destructive",
  },
};

export function RewardHistoryPanels({
  initialRedemptions,
  initialPointHistory,
}: {
  initialRedemptions: PaginatedResult<RedemptionItem>;
  initialPointHistory: PaginatedResult<PointTransactionItem>;
}) {
  const [redemptionPage, setRedemptionPage] = useState(1);
  const [redemptionPageSize, setRedemptionPageSize] = useState(
    initialRedemptions.pageSize
  );
  const [pointsPage, setPointsPage] = useState(1);
  const [pointsPageSize, setPointsPageSize] = useState(
    initialPointHistory.pageSize
  );

  const redemptionsQuery = useQuery<PaginatedResult<RedemptionItem>>({
    queryKey: ["my-redemptions", redemptionPage, redemptionPageSize],
    queryFn: async () => {
      const res = await fetch(
        `/api/rewards/redemptions?page=${redemptionPage}&pageSize=${redemptionPageSize}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Không thể tải lịch sử đổi quà.");
      return (await res.json()) as PaginatedResult<RedemptionItem>;
    },
    initialData:
      redemptionPage === 1 && redemptionPageSize === initialRedemptions.pageSize
        ? initialRedemptions
        : undefined,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const pointsQuery = useQuery<PaginatedResult<PointTransactionItem>>({
    queryKey: ["my-points-history", pointsPage, pointsPageSize],
    queryFn: async () => {
      const res = await fetch(
        `/api/rewards/points?page=${pointsPage}&pageSize=${pointsPageSize}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Không thể tải lịch sử điểm.");
      return (await res.json()) as PaginatedResult<PointTransactionItem>;
    },
    initialData:
      pointsPage === 1 && pointsPageSize === initialPointHistory.pageSize
        ? initialPointHistory
        : undefined,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const redemptions = redemptionsQuery.data ?? initialRedemptions;
  const pointHistory = pointsQuery.data ?? initialPointHistory;

  useEffect(() => {
    if (
      !redemptionsQuery.isPlaceholderData &&
      redemptionsQuery.data &&
      redemptionsQuery.data.page < redemptionPage
    ) {
      setRedemptionPage(redemptionsQuery.data.page);
    }
  }, [redemptionsQuery.isPlaceholderData, redemptionsQuery.data, redemptionPage]);

  useEffect(() => {
    if (
      !pointsQuery.isPlaceholderData &&
      pointsQuery.data &&
      pointsQuery.data.page < pointsPage
    ) {
      setPointsPage(pointsQuery.data.page);
    }
  }, [pointsQuery.isPlaceholderData, pointsQuery.data, pointsPage]);

  return (
    <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
      <Card className="flex flex-col justify-between space-y-3 p-5">
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            Đơn đổi quà của bạn ({redemptions.totalCount})
          </h3>
          {redemptionsQuery.isError && (
            <Alert
              variant="destructive"
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span>Không thể tải lịch sử đổi quà.</span>
              <button
                type="button"
                onClick={() => void redemptionsQuery.refetch()}
                className="font-semibold underline"
              >
                Thử lại
              </button>
            </Alert>
          )}
          {redemptions.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Bạn chưa có đơn đổi quà nào.
            </p>
          ) : (
            <div className="space-y-2.5">
              {redemptions.items.map((rd) => {
                const badge = STATUS_BADGE[rd.status];
                return (
                  <div
                    key={rd.id}
                    className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-foreground">
                        {rd.rewardName}
                      </strong>
                      <Badge variant={badge.variant} className="rounded-full">
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="tabular-nums text-muted-foreground">
                      Điểm sử dụng:{" "}
                      <strong className="text-foreground">
                        -{rd.pointsSpent}đ
                      </strong>{" "}
                      • {formatDateVN(rd.createdAt)}
                    </p>
                    {rd.adminNote && (
                      <p className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground">
                        <strong>Phản hồi từ Admin:</strong> {rd.adminNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PaginationBar
          page={redemptions.page}
          totalPages={redemptions.totalPages}
          totalCount={redemptions.totalCount}
          itemLabel="đơn"
          isLoading={redemptionsQuery.isFetching}
          onPageChange={setRedemptionPage}
          pageSize={redemptionPageSize}
          pageSizeOptions={[5, 8, 15, 25]}
          onPageSizeChange={(next) => {
            setRedemptionPageSize(next);
            setRedemptionPage(1);
          }}
        />
      </Card>

      <Card className="flex flex-col justify-between space-y-3 p-5">
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <History className="h-4 w-4 text-success" />
            Lịch sử cộng / trừ điểm ({pointHistory.totalCount})
          </h3>
          {pointsQuery.isError && (
            <Alert
              variant="destructive"
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span>Không thể tải lịch sử điểm.</span>
              <button
                type="button"
                onClick={() => void pointsQuery.refetch()}
                className="font-semibold underline"
              >
                Thử lại
              </button>
            </Alert>
          )}
          {pointHistory.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Chưa có giao dịch điểm nào. Hãy giải bài toán đầu tiên nhé!
            </p>
          ) : (
            <div className="space-y-2">
              {pointHistory.items.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {tx.reason}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTimeVN(tx.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-extrabold tabular-nums ${tx.amount >= 0 ? "text-success" : "text-destructive"
                      }`}
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}đ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <PaginationBar
          page={pointHistory.page}
          totalPages={pointHistory.totalPages}
          totalCount={pointHistory.totalCount}
          itemLabel="giao dịch"
          isLoading={pointsQuery.isFetching}
          onPageChange={setPointsPage}
          pageSize={pointsPageSize}
          pageSizeOptions={[10, 20, 30, 50]}
          onPageSizeChange={(next) => {
            setPointsPageSize(next);
            setPointsPage(1);
          }}
        />
      </Card>
    </div>
  );
}
