"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Loader2,
  PackageCheck,
  XCircle,
} from "lucide-react";
import { reviewRedemptionAction } from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateTimeVN } from "@/lib/format";
import type { RedemptionItem } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

type StatusFilter = "all" | RedemptionItem["status"];

const STATUS_META: Record<
  RedemptionItem["status"],
  { label: string; variant: BadgeProps["variant"] }
> = {
  pending: { label: "Chờ duyệt", variant: "bounty" },
  approved: { label: "Đã duyệt — Chờ trao", variant: "subtle" },
  fulfilled: { label: "Đã trao quà (Hoàn thành)", variant: "successSolid" },
  rejected: { label: "Đã từ chối (Hoàn điểm)", variant: "destructive" },
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
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RedemptionItem | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data, isLoading, isFetching } = useAdminPaginatedList<RedemptionItem>({
    resource: "redemptions",
    page,
    pageSize,
    query: debouncedSearch,
    status: statusFilter,
    onPageClamp: setPage,
  });

  async function handleReview(
    rd: RedemptionItem,
    newStatus: "approved" | "fulfilled" | "rejected"
  ) {
    setBusyId(rd.id);
    try {
      const res = await reviewRedemptionAction({
        redemptionId: rd.id,
        newStatus,
        adminNote: adminNotes[rd.id] ?? rd.adminNote,
      });

      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Lỗi cập nhật đơn đổi quà.",
        });
        return;
      }
      if (newStatus === "rejected") {
        setRejectTarget(null);
      }
      onNotice({
        type: "success",
        text:
          newStatus === "rejected"
            ? "Đã từ chối đơn và tự động hoàn lại điểm + tồn kho!"
            : newStatus === "fulfilled"
              ? `Đã đánh dấu hoàn thành trao "${rd.rewardName}" cho ${rd.userDisplayName}!`
              : "Đã duyệt đơn đổi quà!",
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-list", "redemptions"],
      });
      router.refresh();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi xử lý đơn đổi quà.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên/email học sinh, tên quà hoặc ghi chú..."
          className="sm:max-w-sm"
        />

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all", label: "Tất cả" },
              { id: "pending", label: "Chờ duyệt" },
              { id: "approved", label: "Đã duyệt" },
              { id: "fulfilled", label: "Đã trao" },
              { id: "rejected", label: "Từ chối" },
            ] as const
          ).map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={statusFilter === f.id ? "default" : "outline"}
              onClick={() => {
                setStatusFilter(f.id);
                setPage(1);
              }}
              className="h-8 text-xs"
            >
              {f.label}
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
        <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
          {totalRedemptionsCount === 0
            ? "Chưa có đơn yêu cầu đổi quà nào từ học sinh."
            : "Không có đơn đổi quà nào khớp với bộ lọc hiện tại."}
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((rd) => {
            const meta = STATUS_META[rd.status];
            const isBusy = busyId === rd.id;
            const isFinal =
              rd.status === "rejected" || rd.status === "fulfilled";

            return (
              <Card key={rd.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {rd.userDisplayName}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({rd.userEmail})
                      </span>{" "}
                      đổi{" "}
                      <strong className="text-primary">{rd.rewardName}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Đã trừ:{" "}
                      <strong className="tabular-nums text-foreground">
                        {rd.pointsSpent} điểm
                      </strong>{" "}
                      · {formatDateTimeVN(rd.createdAt)}
                    </p>
                  </div>
                  <Badge variant={meta.variant}>
                    {rd.status === "fulfilled" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : rd.status === "rejected" ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {meta.label}
                  </Badge>
                </div>

                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
                  <strong>Ghi chú nhận quà của học sinh:</strong>{" "}
                  {rd.studentNote}
                </div>

                {isFinal && rd.adminNote && (
                  <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
                    <strong className="text-foreground">
                      Ghi chú của Admin:
                    </strong>{" "}
                    {rd.adminNote}
                  </div>
                )}

                {!isFinal && (
                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    <Input
                      type="text"
                      value={adminNotes[rd.id] ?? rd.adminNote}
                      onChange={(e) =>
                        setAdminNotes({
                          ...adminNotes,
                          [rd.id]: e.target.value,
                        })
                      }
                      placeholder="Ghi chú phản hồi cho học sinh (ví dụ: Nhận quà tại phòng Giáo vụ sáng thứ 5)..."
                      className="flex-1 text-xs"
                    />
                    <div className="flex flex-wrap gap-2">
                      {rd.status === "pending" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => void handleReview(rd, "approved")}
                        >
                          Duyệt đơn
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="success"
                        disabled={isBusy}
                        onClick={() => void handleReview(rd, "fulfilled")}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PackageCheck className="h-3.5 w-3.5" />
                        )}
                        Đã trao quà
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isBusy}
                        onClick={() => setRejectTarget(rd)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Từ chối &amp; Hoàn điểm
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

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
        </div>
      )}
      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        title="Từ chối đơn đổi quà & hoàn điểm?"
        description={
          rejectTarget
            ? `Hệ thống sẽ từ chối đơn "${rejectTarget.rewardName}" của ${rejectTarget.userDisplayName}, tự động hoàn lại ${rejectTarget.pointsSpent} điểm cho học sinh và cộng lại +1 tồn kho.`
            : ""
        }
        confirmLabel="Từ chối & Hoàn điểm"
        confirmVariant="destructive"
        isLoading={Boolean(rejectTarget && busyId === rejectTarget.id)}
        onConfirm={async () => {
          if (!rejectTarget) return;
          await handleReview(rejectTarget, "rejected");
        }}
      />
    </div>
  );
}
